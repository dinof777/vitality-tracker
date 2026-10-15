import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { SHIP_STEP_IDS, type ShipFailureCode, type ShipStepId, type ShipStepStatus } from "./lib/types";
import { runPublishStep, runVerifyStep, type DeploymentState } from "./lib/publish-verify";

// ---------------------------------------------------------------- arguments ---

export function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const a of argv) {
    const m = /^--([a-z0-9-]+)(?:=(.*))?$/.exec(a);
    if (m) out[m[1]] = m[2] ?? "true";
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const log = (msg: string) => console.log(`[ship-step] ${msg}`);
const die = (msg: string): never => {
  console.error(`[ship-step] ✗ ${msg}`);
  process.exit(1);
};

function resultLine(step: string, ok: boolean, extra: Record<string, string | null | undefined>) {
  const bits = Object.entries(extra)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}=${v === null || v === "" ? "none" : String(v).replace(/\s+/g, "_")}`);
  console.log(`SHIP-RESULT step=${step} ok=${ok}${bits.length ? " " + bits.join(" ") : ""}`);
}

// ---------------------------------------------------------- reporting to MC ---

/** Non-secret identifier the Run card's command may need (the Mission Control
 * base URL), sent with a report only when it matches the strict charset the
 * server pins it to (a value that does not match would get the WHOLE report
 * rejected with a 400). This project has no Neon restore point, so there are no
 * Neon ids to send. */
function envHints() {
  const env: Record<string, string> = {};
  try {
    const origin = new URL(process.env.MC_BASE_URL ?? "").origin;
    if (/^https:\/\/[A-Za-z0-9.-]{1,200}(:\d{1,5})?$/.test(origin)) env.baseUrl = origin;
  } catch {
    /* not set */
  }
  return Object.keys(env).length ? env : undefined;
}

function runUrl(): string | undefined {
  const { GITHUB_SERVER_URL, GITHUB_REPOSITORY, GITHUB_RUN_ID, GITHUB_RUN_ATTEMPT } = process.env;
  if (GITHUB_SERVER_URL !== "https://github.com" || !GITHUB_REPOSITORY || !GITHUB_RUN_ID) return undefined;
  return `https://github.com/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}${GITHUB_RUN_ATTEMPT && GITHUB_RUN_ATTEMPT !== "1" ? `/attempts/${GITHUB_RUN_ATTEMPT}` : ""}`;
}

const taskId = () => args.task ?? process.env.SHIP_TASK_ID ?? "";
const canReport = () => !!(process.env.SHIP_RUN_SECRET && process.env.MC_BASE_URL && taskId());

/** POST one report. Fails closed unless Mission Control accepts the report. */
async function post(report: Record<string, unknown>): Promise<boolean> {
  if (!canReport()) {
    log("not reporting progress (no Mission Control credentials or card id here)");
    die("SHIP_RUN_SECRET, MC_BASE_URL and ship_task_id are required for progress reporting");
  }
  try {
    const res = await fetch(new URL("/api/deployments/ship-run", process.env.MC_BASE_URL), {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${process.env.SHIP_RUN_SECRET}` },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({ taskId: taskId(), runUrl: runUrl(), env: envHints(), ...report }),
    });
    if (res.status !== 204) {
      log(`Mission Control answered HTTP ${res.status} to the progress report`);
      die("progress report rejected; release stopped");
    }
    return true;
  } catch {
    return die("Mission Control could not be reached to report progress");
  }
}

const stepRows = (rows: Array<[ShipStepId, ShipStepStatus]>) => rows.map(([id, status]) => ({ id, status }));

// -------------------------------------------------------------------- git ---

function git(gitArgs: string[], opts: { auth?: boolean; cwd?: string } = {}): string {
  const token = process.env.SHIP_GIT_TOKEN;
  const prefix = opts.auth && token ? ["-c", `http.https://github.com/.extraheader=AUTHORIZATION: basic ${Buffer.from(`x-access-token:${token}`).toString("base64")}`] : [];
  return execFileSync("git", [...prefix, ...gitArgs], { cwd: opts.cwd ?? process.cwd(), encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

const releaseRef = (ship8: string) => `release/ship-${ship8}`;

function gitOk(gitArgs: string[]): boolean {
  try {
    git(gitArgs);
    return true;
  } catch {
    return false;
  }
}

// ------------------------------------------------------------------- steps ---

/** A missing setting is a failed step that must be REPORTED (the run would
 * otherwise sit silent until it was judged stalled), so it is thrown, not
 * exited on. Only the variable's NAME is in the message, never a value. */
class MissingSetting extends Error {}

function need(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new MissingSetting(`${name} is not set`);
  return v;
}

// ----------------------------------------------------------------- database ---
//
// Vitality Tracker has NO database step in the pipeline. Its migrations
// (supabase/migrations/*.sql) are applied by hand with `npm run migrate`
// (scripts/run-migrations.mjs, see supabase/migrations/README.md) and Push
// neither applies, rehearses, nor takes a restore point for them. This step
// only tells Mission Control so, and the strip shows Database as skipped.
// A release that adds a migration file still needs `npm run migrate` run by
// hand against production; the pipeline does not know or check whether it was.

async function stepDatabase(): Promise<void> {
  log("no database step for this project: migrations are applied by hand with `npm run migrate`; no restore point is taken");
  await post({ state: "running", step: "database", steps: stepRows([["database", "skipped"]]), productionChanged: "no" });
  resultLine("database", true, { skipped: "no-database-step", productionChanged: "no" });
}

async function stepPublish(ship8: string) {
  await post({ state: "running", step: "publish", steps: stepRows([["publish", "running"]]) });
  const base = args.base ?? "main";
  const result = await runPublishStep({
    fetchReleaseSha: async () => {
      git(["fetch", "origin", `+refs/heads/${releaseRef(ship8)}:refs/remotes/origin/${releaseRef(ship8)}`], { auth: true });
      const sha = git(["rev-parse", `refs/remotes/origin/${releaseRef(ship8)}`]);
      if (sha !== need("SHIP_EXPECTED_SHA")) throw new Error("release ref moved");
      return sha;
    },
    fetchMain: async () => {
      git(["fetch", "origin", `+refs/heads/${base}:refs/remotes/origin/${base}`], { auth: true });
    },
    isAncestor: async (a, d) => gitOk(["merge-base", "--is-ancestor", a, d === "origin/main" ? `origin/${base}` : d]),
    push: async (sha) => {
      git(["push", "origin", `${sha}:refs/heads/${base}`], { auth: true });
      return true;
    },
    log,
  });
  log(result.note);
  await post(
    result.ok
      ? { state: "running", step: "publish", steps: stepRows([["publish", "done"]]), sha: result.sha, productionChanged: result.productionChanged }
      : { state: "failed", step: "publish", failureCode: result.failureCode, productionChanged: result.productionChanged, ...(result.sha ? { sha: result.sha } : {}) },
  );
  resultLine("publish", result.ok, { sha: result.sha?.slice(0, 7), code: result.failureCode });
  process.exit(result.ok ? 0 : 1);
}

async function deploymentState(repo: string, sha: string): Promise<DeploymentState> {
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  if (!token) throw new Error("no GitHub token");
  const headers = { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
  const list = await fetch(`https://api.github.com/repos/${repo}/deployments?sha=${encodeURIComponent(sha)}&per_page=20`, { headers });
  if (!list.ok) throw new Error(`deployments HTTP ${list.status}`);
  const deployments = ((await list.json()) as Array<{ id: number; sha: string; creator?: { login?: string }; environment?: string; created_at?: string }>).filter((d) => d.sha === sha && d.creator?.login === "vercel[bot]" && (d.environment ?? "").toLowerCase() === "production");
  if (!deployments.length) return "none";
  const newest = deployments.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0];
  const st = await fetch(`https://api.github.com/repos/${repo}/deployments/${newest.id}/statuses?per_page=10`, { headers });
  if (!st.ok) throw new Error(`statuses HTTP ${st.status}`);
  const states = ((await st.json()) as Array<{ state: string }>).map((s) => s.state);
  // "inactive" only follows a success (a newer deploy replaced this one).
  if (states[0] === "success") return "success";
  if (states[0] === "inactive") return "failure";
  if (states[0] === "failure" || states[0] === "error") return "failure";
  return "pending";
}

/** The commit the live site reports it was built from, or null if it can't say. */
async function liveCommit(baseUrl: string): Promise<string | null> {
  try {
    const res = await fetch(`${baseUrl}/api/version`, { redirect: "manual", cache: "no-store", signal: AbortSignal.timeout(15000) });
    if (res.status !== 200) return null;
    const body = (await res.json()) as { sha?: unknown };
    return typeof body.sha === "string" ? body.sha : null;
  } catch {
    return null;
  }
}

async function stepVerify(ship8: string) {
  const repo = args.repo ?? process.env.GITHUB_REPOSITORY ?? die("--repo=owner/name is required");
  const baseUrl = need("LIVE_URL").replace(/\/+$/, "");
  await post({ state: "running", step: "golive", steps: stepRows([["golive", "running"]]) });
  git(["fetch", "origin", `+refs/heads/${releaseRef(ship8)}:refs/remotes/origin/${releaseRef(ship8)}`], { auth: true });
  const sha = git(["rev-parse", `refs/remotes/origin/${releaseRef(ship8)}`]);
  if (sha !== need("SHIP_EXPECTED_SHA")) throw new Error("release ref moved");
  const outcome = await runVerifyStep(
    {
      // GitHub's deployment record first. Vercel stopped writing those for
      // this repo on 2026-10-12 while still deploying, which made every
      // release read "no deploy started"; so when GitHub has none, the live
      // site's own commit (GET /api/version) counts, but only an exact match.
      deployment: async (s) => {
        const recorded = await deploymentState(repo, s);
        if (recorded !== "none") return recorded;
        return (await liveCommit(baseUrl)) === s ? "success" : "none";
      },
      smoke: async () => {
        
        // Probe the configured production root; redirects and errors fail.
        const res = await fetch(baseUrl, { redirect: "manual", signal: AbortSignal.timeout(15000) });
        return res.status === 200;
      },
      sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
      now: () => Date.now(),
      log,
      noRecordWaitMs: 5 * 60_000,
      readyWaitMs: 20 * 60_000,
      pollMs: 15_000,
      // Three probes over ~40s (see the header comment in lib/publish-verify.ts):
      // one cold first request must not turn a good release into verify-failed.
      smokeAttempts: 3,
      smokeRetryMs: 20_000,
    },
    sha,
  );
  log(outcome.note);
  if (outcome.wentLive) await post({ state: "running", step: "golive", steps: stepRows([["golive", "done"], ["verify", "running"]]), productionChanged: "live" });
  await post(
    outcome.ok
      ? { state: "running", step: "verify", steps: stepRows([["golive", "done"], ["verify", "done"]]), productionChanged: "live" }
      : { state: "failed", step: outcome.wentLive ? "verify" : "golive", failureCode: outcome.failureCode, productionChanged: outcome.productionChanged },
  );
  resultLine("verify", outcome.ok, { sha: sha.slice(0, 7), code: outcome.failureCode });
  process.exit(outcome.ok ? 0 : 1);
}

// ------------------------------------------------- workflow-only subcommands ---

function writeOutput(pairs: Record<string, string>) {
  const lines = Object.entries(pairs).map(([k, v]) => `${k}=${v}`);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, lines.join("\n") + "\n");
  for (const l of lines) log(l);
}

async function stepPlan() {
  // The card id becomes a branch name in the workflow (release/ship-<id8>), so
  // it is pinned to the shape of a UUID before anything uses it.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(taskId())) die("ship_task_id is not a card id");
  need("SHIP_RUN_SECRET"); need("MC_BASE_URL");
  if (!/^[0-9a-f-]{36}$/.test(need("SHIP_PROJECT_ID"))) die("project_id is required");
  const dryRun = args["dry-run"] === "true";
  const resume = args.resume === "true";
  let from: ShipStepId = "build";
  const extra: Record<string, string> = {};
  if (resume) {
    if (!canReport()) die("resume needs SHIP_RUN_SECRET, MC_BASE_URL and the card id to read the run back");
    const res = await fetch(new URL(`/api/deployments/ship-run?taskId=${encodeURIComponent(taskId())}`, process.env.MC_BASE_URL), { headers: { authorization: `Bearer ${process.env.SHIP_RUN_SECRET}` } });
    if (!res.ok) die(`Mission Control answered HTTP ${res.status} reading the run, so there is nothing safe to resume`);
    const run = (await res.json()) as { state: string; stepsToRun: ShipStepId[]; sha: string | null };
    if (!["queued", "needs-you", "running"].includes(run.state)) die(`the run is ${run.state}, not resumable`);
    from = run.stepsToRun[0] ?? "database";
    if (run.sha) extra.sha = run.sha;
  }
  if (!SHIP_STEP_IDS.includes(from)) die("unrecognized resume step");
  if (resume && from !== "build" && !/^[0-9a-f]{40}$/.test(extra.sha ?? "")) die("resume requires the original release SHA");
  const start = SHIP_STEP_IDS.indexOf(from);
  const flag = (id: ShipStepId) => String(SHIP_STEP_IDS.indexOf(id) >= start);
  writeOutput({
    ship8: taskId().slice(0, 8),
    resume: String(resume),
    do_build: flag("build"),
    do_checks: "true",
    do_database: "true",
    do_publish: String(!dryRun && SHIP_STEP_IDS.indexOf("publish") >= start),
    do_verify: String(!dryRun && SHIP_STEP_IDS.indexOf("verify") >= start),
    ...extra,
  });
}

async function stepReport() {
  const set = (args.set ?? "")
    .split(",")
    .filter(Boolean)
    .map((p) => p.split(":") as [ShipStepId, ShipStepStatus]);
  const report: Record<string, unknown> = { state: args.state ?? "running" };
  if (args.current) report.step = args.current === "none" ? null : args.current;
  if (set.length) report.steps = stepRows(set);
  if (args.failure) report.failureCode = args.failure as ShipFailureCode;
  if (args["production-changed"]) report.productionChanged = args["production-changed"];
  if (args.sha) report.sha = args.sha;
  if (args["dry-run"]) report.dryRun = args["dry-run"] === "true";
  if (args["build-report"]) {
    const b = JSON.parse(readFileSync(args["build-report"], "utf8")) as { included?: string[]; heldBack?: unknown[] };
    report.included = b.included ?? [];
    report.heldBack = b.heldBack ?? [];
  }
  const ok = await post(report);
  // A failure report that did not land must not look like it did.
  if (!ok) process.exit(1);
}

async function stepPushRef(ship8: string, releaseDir: string) {
  // The workflow-file limit: the Action's token cannot push a commit that
  // changes .github/workflows/*. Detected here, before anything is touched, so
  // the run fails closed with a plain reason instead of a half-built release.
  const base = args.base ?? "main";
  const changed = git(["diff", "--name-only", `origin/${base}`, "HEAD", "--", ".github/workflows"], { cwd: releaseDir });
  if (changed) {
    log("this release changes workflow files, which the pipeline's token may not push");
    await post({ state: "failed", step: "build", failureCode: "publish-failed", productionChanged: "no" });
    resultLine("pushref", false, { code: "publish-failed", reason: "workflow-files-changed" });
    process.exit(1);
  }
  try {
    git(["push", "origin", `HEAD:refs/heads/${releaseRef(ship8)}`], { auth: true, cwd: releaseDir });
  } catch {
    await post({ state: "failed", step: "build", failureCode: "publish-failed", productionChanged: "no" });
    resultLine("pushref", false, { code: "publish-failed" });
    process.exit(1);
  }
  const sha = git(["rev-parse", "HEAD"], { cwd: releaseDir });
  writeOutput({ sha });
  resultLine("pushref", true, { sha: sha.slice(0, 7) });
}

async function stepPreflight() {
  for (const name of ["SHIP_RUN_SECRET", "MC_BASE_URL", "LIVE_URL"]) need(name);
  const res = await fetch(new URL("/api/deployments/ship-run", need("MC_BASE_URL")), { headers: { authorization: `Bearer ${need("SHIP_RUN_SECRET")}` }, signal: AbortSignal.timeout(15000) });
  // Auth runs before missing-input validation; no task lookup or invented id.
  const body = await res.json().catch(() => null) as { error?: string } | null;
  log(`MC read-only preflight HTTP ${res.status}`);
  if (res.status !== 400 || body?.error !== "taskId is required.") throw new Error("MC preflight failed");
  log("settings and MC authentication verified (this project has no database step, so no Neon settings are needed)");
}

async function main() {
  if (process.env.GITHUB_ACTIONS === "true" && process.env.GITHUB_REF !== "refs/heads/main") die("dispatch must use main");
  const step = args.step ?? die("--step=<database|publish|verify|plan|report|pushref|preflight> is required");
  const ship8 = args.ship ?? (taskId() ? taskId().slice(0, 8) : "");
  const releaseDir = path.resolve(args["release-dir"] ?? process.cwd());
  if (["database", "publish", "verify", "pushref"].includes(step) && !/^[0-9a-f]{8}$/.test(ship8)) die("--ship=<first 8 characters of the Ship card id> is required");
  switch (step) {
    case "database":
      return stepDatabase();
    case "publish":
      return stepPublish(ship8);
    case "verify":
      return stepVerify(ship8);
    case "plan":
      return stepPlan();
    case "report":
      return stepReport();
    case "pushref":
      return stepPushRef(ship8, releaseDir);
    case "preflight":
      return stepPreflight();
    default:
      return die(`unknown step "${step}"`);
  }
}

/** The code a crash in each environment step is reported as. */
const CRASH_CODE: Partial<Record<string, ShipFailureCode>> = { publish: "publish-failed", verify: "verify-failed" };

if (require.main === module) {
  main().catch(async (err) => {
    // Never print the error object: a driver error can echo a host or a URL.
    // A missing setting names itself (a variable NAME is safe to print).
    console.error(`[ship-step] ✗ ${err instanceof MissingSetting ? err.message : `unexpected failure (${err instanceof Error ? err.name : "unknown"})`}`);
    const code = CRASH_CODE[args.step ?? ""];
    if (code) await post({ state: "failed", step: args.step, failureCode: code });
    resultLine(args.step ?? "unknown", false, { code });
    process.exit(1);
  });
}
