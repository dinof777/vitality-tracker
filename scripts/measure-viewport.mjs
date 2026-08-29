#!/usr/bin/env node
// Does this page overflow horizontally at a phone width? Read-only — never writes,
// never starts a server. Measures a URL (live or preview) in headless Chrome.
//
//   npm run measure:viewport -- https://www.liveelevated.fit/g/ironforge
//   npm run measure:viewport -- <url> 320          # a narrower phone
//   npm run measure:viewport -- <url> 390 --strict # exit 1 when it overflows
//
// WHY THIS EXISTS, and why you must not measure with `--window-size` instead:
// Chrome on macOS refuses to open a window narrower than ~500 CSS px. Passing
// `--window-size=390,844` therefore lays the page out at 500px and silently
// reports a 500px-wide page — which reads as "110px of horizontal overflow" on
// every phone-width page ever measured that way. That false positive put a MAJOR
// finding on STATUS.md on 2026-08-29 that did not exist (see
// docs/FIX_MOBILE_OVERFLOW.md). Emulation.setDeviceMetricsOverride is not
// subject to the window minimum, so it is the only honest way to ask this
// question from a Mac.
//
// An overflow is always caused by one specific element, so this names the
// offenders (widest first) with their DOM path rather than only printing a width.

import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const args = process.argv.slice(2).filter((a) => a !== '--strict');
const strict = process.argv.includes('--strict');
const url = args[0];
const width = Number(args[1] || 390);
const height = Number(args[2] || 844);

if (!url) {
  console.error('usage: npm run measure:viewport -- <url> [width] [height] [--strict]');
  process.exit(2);
}

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const nap = (ms) => new Promise((r) => setTimeout(r, ms));
const profile = mkdtempSync(join(tmpdir(), 'measure-viewport-'));

// The window size here is deliberately NOT the viewport under test — the emulation
// override below sets that. Keeping the window comfortably wide avoids the clamp.
spawn(CHROME, [
  '--headless', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
  '--hide-scrollbars', '--window-size=1200,900', '--force-device-scale-factor=1',
  '--no-first-run', '--no-default-browser-check', 'about:blank',
], { stdio: 'ignore' });

let port, wsPath;
for (let i = 0; i < 150 && !port; i++) {
  await nap(100);
  const f = join(profile, 'DevToolsActivePort');
  if (!existsSync(f)) continue;
  const [p, w] = readFileSync(f, 'utf8').split('\n');
  if (p && w) { port = p.trim(); wsPath = w.trim(); }
}
if (!port) {
  console.error('Chrome never opened a DevTools port');
  process.exit(2);
}

const ws = new WebSocket(`ws://127.0.0.1:${port}${wsPath}`);
await new Promise((ok, no) => { ws.onopen = ok; ws.onerror = no; });

let seq = 0;
const pending = new Map();
const listeners = [];
ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  if (pending.has(msg.id)) { pending.get(msg.id)(msg.result || {}); pending.delete(msg.id); }
  for (let i = listeners.length - 1; i >= 0; i--) {
    if (listeners[i].method === msg.method) { listeners[i].ok(); listeners.splice(i, 1); }
  }
};
const cmd = (method, params, sessionId) => new Promise((ok) => {
  const id = ++seq;
  pending.set(id, ok);
  ws.send(JSON.stringify({ id, method, params: params || {}, ...(sessionId ? { sessionId } : {}) }));
});
const once = (method, ms) => Promise.race([new Promise((ok) => listeners.push({ method, ok })), nap(ms)]);

const target = await cmd('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await cmd('Target.attachToTarget', { targetId: target.targetId, flatten: true });
await cmd('Page.enable', {}, sessionId);
await cmd('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: true }, sessionId);
await cmd('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, sessionId);

const loaded = once('Page.loadEventFired', 30_000);
await cmd('Page.navigate', { url }, sessionId);
await loaded;
await nap(3500); // fonts, hydration, entrance animations

const probe = `(() => {
  const vw = document.documentElement.clientWidth;
  const describe = (el) => {
    const parts = [];
    for (let e = el, i = 0; e && i < 4; i++, e = e.parentElement) {
      const cls = (e.getAttribute('class') || '').trim();
      parts.push(e.tagName.toLowerCase() + (cls ? '.' + cls.split(/\\s+/).slice(0, 5).join('.') : ''));
    }
    return parts.join(' < ');
  };
  const offenders = [];
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const right = r.right + window.scrollX;
    if (right > vw + 1) {
      offenders.push({
        right: Math.round(right), width: Math.round(r.width),
        left: Math.round(r.left + window.scrollX),
        text: (el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 44),
        path: describe(el),
      });
    }
  }
  offenders.sort((a, b) => b.right - a.right);
  return JSON.stringify({
    viewport: vw,
    scrollWidth: document.documentElement.scrollWidth,
    offenderCount: offenders.length,
    offenders: offenders.slice(0, 15),
  });
})()`;

const evaluated = await cmd('Runtime.evaluate', { expression: probe, returnByValue: true }, sessionId);
await cmd('Browser.close'); // over the protocol — never by signal, never by pattern

const report = JSON.parse(evaluated.result?.value ?? '{}');

if (report.viewport !== width) {
  console.error(`REFUSING TO REPORT: asked for a ${width}px viewport, got ${report.viewport}px.`);
  console.error('An overflow number measured against the wrong viewport is worse than none.');
  console.error(report.viewport === 980
    ? 'A layout viewport of exactly 980px is Chrome\'s fallback for a page with no\n'
      + '<meta name="viewport" content="width=device-width">. That is a real defect on a\n'
      + 'phone-first page — fix the meta tag, then measure again.'
    : 'Device emulation did not take effect.');
  process.exit(2);
}

console.log(`${url}`);
console.log(`  viewport ${report.viewport}px · content ${report.scrollWidth}px · ${report.offenderCount} element(s) past the right edge`);

if (report.offenderCount === 0) {
  console.log('  OK — no horizontal overflow.');
  process.exit(0);
}

console.log('  Widest first — the first line is almost always the cause:');
for (const o of report.offenders) {
  console.log(`   · right ${o.right}px (width ${o.width}px, left ${o.left}px) ${o.text ? '"' + o.text + '"' : ''}`);
  console.log(`     ${o.path}`);
}
process.exit(strict ? 1 : 0);
