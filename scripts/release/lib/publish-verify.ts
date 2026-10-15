/**
 * The Publish and Verify steps of the push pipeline (card c8faa9a6, SHAPE
 * sections 3B and 5), side effects injected so the decisions are tested
 * without a remote or a network.
 *
 * PUBLISH pushes the release SHA to the default branch as a fast-forward and
 * never rewrites anything. Its "already done?" check is a read: if main
 * already contains the release SHA it does nothing (re-running after a
 * success, or after Dino ran the Run card's command, is a no-op). If main has
 * moved on from the commit the release was built on, it stops with
 * `main-moved` rather than merging or forcing: the release was checked on the
 * old main, so publishing it on a new one would ship something nobody checked.
 *
 * VERIFY is pure reads: wait for the deploy of that SHA to be READY (read from
 * GitHub Deployments, written by the Vercel integration, so no Vercel token is
 * needed), then smoke the live root. A deploy that never starts or that fails is
 * `deploy-failed` (the site is still on the previous version; a Run card can't
 * fix a Vercel build). A deploy still pending at the deadline, or a smoke check
 * that fails, is `verify-failed` (a Run card can re-run the read later).
 *
 * The smoke check is retried a bounded number of times, which is a Golf-specific
 * adaptation rather than a copy of Mission Control's shape. Golf's production
 * root (`src/app/page.tsx`) is `export const dynamic = "force-dynamic"` and reads
 * the current tournament from Neon on every request, so the very first request
 * after a fresh deploy can land on a cold serverless database connection and
 * answer 500. A single-shot probe would then report `verify-failed` with
 * `productionChanged: "live"` for a release that had in fact gone live correctly
 * — the worst reading to hand Dino, because the card says the release failed
 * while production is already serving the new code. Retrying can only ever turn
 * a failure into a success; it can never mask a bad response, because one 200 is
 * all the step ever accepted.
 */
import type { ProductionChanged, ShipFailureCode } from "./types";

export type PublishDeps = {
  /** The tip of `release/ship-<id8>` as fetched from the remote. Throws if absent. */
  fetchReleaseSha(): Promise<string>;
  fetchMain(): Promise<void>;
  /** Is `ancestor` contained in `descendant`? */
  isAncestor(ancestor: string, descendant: string): Promise<boolean>;
  /** Non-forced push of the SHA to the default branch. True = accepted. */
  push(sha: string): Promise<boolean>;
  log(msg: string): void;
};

export type StepOutcome = {
  ok: boolean;
  failureCode: ShipFailureCode | null;
  productionChanged: ProductionChanged;
  sha: string | null;
  note: string;
};

export async function runPublishStep(deps: PublishDeps): Promise<StepOutcome> {
  let sha: string;
  try {
    sha = await deps.fetchReleaseSha();
    await deps.fetchMain();
  } catch {
    return { ok: false, failureCode: "publish-failed", productionChanged: "no", sha: null, note: "could not fetch the release or main from GitHub" };
  }
  if (await deps.isAncestor(sha, "origin/main")) {
    return { ok: true, failureCode: null, productionChanged: "code-on-main", sha, note: "main already contains the release" };
  }
  if (!(await deps.isAncestor("origin/main", sha))) {
    return { ok: false, failureCode: "main-moved", productionChanged: "no", sha, note: "main has moved since the release was built" };
  }
  const pushed = await deps.push(sha).catch(() => false);
  if (!pushed) return { ok: false, failureCode: "publish-failed", productionChanged: "no", sha, note: "GitHub refused the push to main" };
  return { ok: true, failureCode: null, productionChanged: "code-on-main", sha, note: "pushed to main" };
}

export type DeploymentState = "none" | "pending" | "success" | "failure";

export type VerifyDeps = {
  deployment(sha: string): Promise<DeploymentState>;
  /** One request to the live site. True = it answered like a running app. */
  smoke(): Promise<boolean>;
  sleep(ms: number): Promise<void>;
  now(): number;
  log(msg: string): void;
  /** A deploy record should appear this fast after the push, or the deploy did not start. */
  noRecordWaitMs: number;
  /** The deploy should be ready this fast once it has started. */
  readyWaitMs: number;
  pollMs: number;
  /** How many times the live-root probe may be asked, in total. Values below 1
   * are treated as 1: the step always makes at least one request. */
  smokeAttempts: number;
  /** Wait between smoke attempts — long enough for a cold Neon connection to
   * have been established by the failed attempt before it. */
  smokeRetryMs: number;
};

export type VerifyOutcome = StepOutcome & { wentLive: boolean };

export async function runVerifyStep(deps: VerifyDeps, sha: string): Promise<VerifyOutcome> {
  const start = deps.now();
  let seenRecord = false;
  for (;;) {
    let state: DeploymentState;
    try {
      state = await deps.deployment(sha);
    } catch {
      return { ok: false, failureCode: "verify-failed", productionChanged: "code-on-main", sha, wentLive: false, note: "could not read the deploy status from GitHub" };
    }
    if (state === "success") break;
    if (state === "failure") return { ok: false, failureCode: "deploy-failed", productionChanged: "code-on-main", sha, wentLive: false, note: "the deploy failed" };
    if (state === "pending") seenRecord = true;
    const waited = deps.now() - start;
    if (!seenRecord && waited >= deps.noRecordWaitMs) {
      return { ok: false, failureCode: "deploy-failed", productionChanged: "code-on-main", sha, wentLive: false, note: "no deploy started for the release" };
    }
    if (seenRecord && waited >= deps.readyWaitMs) {
      return { ok: false, failureCode: "verify-failed", productionChanged: "code-on-main", sha, wentLive: false, note: "the deploy was still not ready at the deadline" };
    }
    await deps.sleep(deps.pollMs);
  }
  const attempts = Math.max(1, Math.floor(deps.smokeAttempts));
  let up = false;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    up = await deps.smoke().catch(() => false);
    if (up) break;
    if (attempt < attempts) {
      deps.log(`the live root did not answer (attempt ${attempt} of ${attempts}); retrying`);
      await deps.sleep(deps.smokeRetryMs);
    }
  }
  if (!up) return { ok: false, failureCode: "verify-failed", productionChanged: "live", sha, wentLive: true, note: `the deploy is ready but the smoke check failed ${attempts} time(s)` };
  return { ok: true, failureCode: null, productionChanged: "live", sha, wentLive: true, note: "deploy ready and the site answered" };
}
