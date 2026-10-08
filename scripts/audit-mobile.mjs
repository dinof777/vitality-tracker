#!/usr/bin/env node
// The gym-phone audit: does this page load fast enough, and can a sweaty thumb
// actually hit and read it? Read-only — never writes, never starts a server.
// Measures a URL (live or preview) in headless Chrome under Lighthouse's own
// mobile throttling profile.
//
//   npm run audit:mobile -- https://liveelevated.fit
//   npm run audit:mobile -- <url> --strict     # exit 1 on any budget failure
//   npm run audit:mobile -- <url> --no-throttle
//
// WHAT THIS IS AND IS NOT. This is not Lighthouse and does not print a 0-100
// score. It measures the four things this project actually committed to —
// FCP/LCP/CLS under simulated 4G, tap-target sizes, and text contrast — so they
// can be checked on every change without a 200MB dependency. The Lighthouse
// score itself still comes from DevTools or `npx lighthouse`; see
// docs/LIGHTHOUSE_BASELINE.md for the procedure and the recorded baseline.
//
// The CDP harness below (Chrome launch, DevToolsActivePort discovery, flat
// session attach, Browser.close over the protocol) is lifted deliberately from
// scripts/measure-viewport.mjs, which earned it: measuring a phone viewport by
// `--window-size` on macOS silently lays the page out at ~500px, because Chrome
// refuses a narrower window. Emulation.setDeviceMetricsOverride is the only
// honest way to ask a phone-shaped question from a Mac, and the same refuse-to-
// report guard is kept here for the same reason — a number measured against the
// wrong viewport is worse than no number. See docs/FIX_MOBILE_OVERFLOW.md.

import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const FLAGS = new Set(process.argv.slice(2).filter((a) => a.startsWith('--')));
const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const strict = FLAGS.has('--strict');
const throttle = !FLAGS.has('--no-throttle');
const url = args[0];
const width = Number(args[1] || 390);
const height = Number(args[2] || 844);

if (!url) {
  console.error('usage: npm run audit:mobile -- <url> [width] [height] [--strict] [--no-throttle]');
  process.exit(2);
}

// Budgets. FCP comes from this card's definition of done; the tap-target
// numbers are DESIGN.md §5 (48px default, hard 44px floor); contrast is
// WCAG 2.1 AA (4.5:1 small text, 3:1 large).
const BUDGET = { fcp: 2000, lcp: 2500, cls: 0.1, tapDefault: 48, tapFloor: 44 };

// Lighthouse's mobile defaults, so a number here is comparable to a number there.
const THROTTLE = { rttMs: 150, downKbps: 1638.4, upKbps: 750, cpuRate: 4 };

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const nap = (ms) => new Promise((r) => setTimeout(r, ms));
const profile = mkdtempSync(join(tmpdir(), 'audit-mobile-'));

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
await cmd('Network.enable', {}, sessionId);
await cmd('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 3, mobile: true }, sessionId);
await cmd('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, sessionId);

if (throttle) {
  await cmd('Network.emulateNetworkConditions', {
    offline: false,
    latency: THROTTLE.rttMs,
    downloadThroughput: (THROTTLE.downKbps * 1024) / 8,
    uploadThroughput: (THROTTLE.upKbps * 1024) / 8,
  }, sessionId);
  await cmd('Emulation.setCPUThrottlingRate', { rate: THROTTLE.cpuRate }, sessionId);
}

// Web-vitals observers must exist before the first byte, or the buffered entries
// for a paint that already happened are the only record and LCP/CLS are lost.
await cmd('Page.addScriptToEvaluateOnNewDocument', {
  source: `
    window.__vitals = { lcp: 0, cls: 0 };
    try {
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) window.__vitals.lcp = e.startTime;
      }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) if (!e.hadRecentInput) window.__vitals.cls += e.value;
      }).observe({ type: 'layout-shift', buffered: true });
    } catch {}
  `,
}, sessionId);

const loaded = once('Page.loadEventFired', 60_000);
await cmd('Page.navigate', { url }, sessionId);
await loaded;
await nap(4000); // fonts, hydration, entrance animations, late-shifting images

const probe = `(() => {
  const vw = document.documentElement.clientWidth;

  // ---- Web vitals -------------------------------------------------------
  const paint = performance.getEntriesByType('paint')
    .find((e) => e.name === 'first-contentful-paint');
  const nav = performance.getEntriesByType('navigation')[0] || {};
  const vitals = {
    ttfb: Math.round(nav.responseStart || 0),
    fcp: Math.round(paint ? paint.startTime : 0),
    lcp: Math.round((window.__vitals && window.__vitals.lcp) || 0),
    cls: Number(((window.__vitals && window.__vitals.cls) || 0).toFixed(4)),
    transferKb: Math.round(performance.getEntriesByType('resource')
      .reduce((n, r) => n + (r.transferSize || 0), (nav.transferSize || 0)) / 1024),
  };

  const describe = (el) => {
    const parts = [];
    for (let e = el, i = 0; e && i < 3; i++, e = e.parentElement) {
      const cls = (e.getAttribute('class') || '').trim();
      parts.push(e.tagName.toLowerCase() + (cls ? '.' + cls.split(/\\s+/).slice(0, 4).join('.') : ''));
    }
    return parts.join(' < ');
  };
  const label = (el) => (el.getAttribute('aria-label') || el.textContent || '')
    .trim().replace(/\\s+/g, ' ').slice(0, 40);
  const visible = (el, r) => {
    if (r.width === 0 || r.height === 0) return false;
    const s = getComputedStyle(el);
    return s.visibility !== 'hidden' && s.display !== 'none' && s.opacity !== '0';
  };

  // ---- Tap targets ------------------------------------------------------
  // Only controls that are actually their own target. A nested decorative
  // glyph inside a properly sized button is not a target (DESIGN.md §5), so
  // a control whose own parent is also interactive is skipped.
  const SEL = 'a[href], button, input, select, textarea, [role="button"], [role="link"], [role="checkbox"], [role="tab"], [tabindex]:not([tabindex="-1"])';
  const interactive = (el) => el && el.matches && el.matches(SEL);
  const tap = [];
  for (const el of document.querySelectorAll(SEL)) {
    if (el.disabled) continue;
    if (el.type === 'hidden') continue;
    if (interactive(el.parentElement)) continue;
    const r = el.getBoundingClientRect();
    if (!visible(el, r)) continue;
    const w = Math.round(r.width), h = Math.round(r.height);
    if (Math.min(w, h) >= ${BUDGET.tapDefault}) continue;
    tap.push({ w, h, below44: Math.min(w, h) < ${BUDGET.tapFloor}, text: label(el), path: describe(el) });
  }
  tap.sort((a, b) => Math.min(a.w, a.h) - Math.min(b.w, b.h));

  // ---- Contrast ---------------------------------------------------------
  const parse = (c) => {
    const m = (c || '').match(/[\\d.]+/g);
    if (!m) return null;
    return { r: +m[0], g: +m[1], b: +m[2], a: m[3] === undefined ? 1 : +m[3] };
  };
  // A translucent surface (the tab bar is bg-surface/95) must be composited
  // over what is actually behind it, or the ratio is computed against a
  // colour no eye ever sees.
  const bgOf = (el) => {
    let out = { r: 255, g: 255, b: 255 };
    const stack = [];
    for (let e = el; e; e = e.parentElement) {
      const c = parse(getComputedStyle(e).backgroundColor);
      if (c && c.a > 0) stack.push(c);
      if (c && c.a === 1) break;
    }
    if (stack.length) out = { r: stack[stack.length - 1].r, g: stack[stack.length - 1].g, b: stack[stack.length - 1].b };
    for (let i = stack.length - 2; i >= 0; i--) {
      const c = stack[i];
      out = {
        r: c.r * c.a + out.r * (1 - c.a),
        g: c.g * c.a + out.g * (1 - c.a),
        b: c.b * c.a + out.b * (1 - c.a),
      };
    }
    return out;
  };
  const lum = (c) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };
  const ratio = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
    return (x + 0.05) / (y + 0.05);
  };

  const contrast = [];
  const seen = new Set();
  for (const el of document.querySelectorAll('body *')) {
    // Text-bearing leaves only — a wrapper's textContent is its children's.
    const own = Array.from(el.childNodes)
      .filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim();
    if (!own) continue;
    const r = el.getBoundingClientRect();
    if (!visible(el, r)) continue;
    const s = getComputedStyle(el);
    const fg = parse(s.color);
    if (!fg || fg.a === 0) continue;
    const bg = bgOf(el);
    const composited = fg.a < 1
      ? { r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a) }
      : fg;
    const px = parseFloat(s.fontSize);
    const bold = parseInt(s.fontWeight, 10) >= 700;
    const large = px >= 24 || (bold && px >= 18.66);
    const need = large ? 3 : 4.5;
    const got = ratio(composited, bg);
    if (got >= need) continue;
    const key = s.color + '|' + Math.round(bg.r) + ',' + Math.round(bg.g) + ',' + Math.round(bg.b) + '|' + px + '|' + bold;
    if (seen.has(key)) continue;
    seen.add(key);
    contrast.push({
      ratio: Number(got.toFixed(2)), need, px, bold,
      color: s.color, bg: 'rgb(' + [bg.r, bg.g, bg.b].map(Math.round).join(', ') + ')',
      text: own.replace(/\\s+/g, ' ').slice(0, 40), path: describe(el),
    });
  }
  contrast.sort((a, b) => a.ratio - b.ratio);

  // ---- PWA installability (what a page can see of it) -------------------
  const manifestHref = (document.querySelector('link[rel="manifest"]') || {}).href || null;
  const pwa = {
    manifest: manifestHref,
    viewportMeta: !!document.querySelector('meta[name="viewport"]'),
    appleTouchIcon: !!document.querySelector('link[rel="apple-touch-icon"]'),
    themeColor: (document.querySelector('meta[name="theme-color"]') || {}).content || null,
    https: location.protocol === 'https:',
    serviceWorkerSupported: 'serviceWorker' in navigator,
    serviceWorkerRegistrations: null,
  };

  return JSON.stringify({ viewport: vw, vitals, tap, contrast, pwa });
})()`;

const evaluated = await cmd('Runtime.evaluate', { expression: probe, returnByValue: true, awaitPromise: false }, sessionId);

// Registrations are async, so they are asked for separately rather than
// reported as an unresolved promise.
const swProbe = await cmd('Runtime.evaluate', {
  expression: `navigator.serviceWorker ? navigator.serviceWorker.getRegistrations().then((r) => r.length) : -1`,
  returnByValue: true,
  awaitPromise: true,
}, sessionId);

await cmd('Browser.close'); // over the protocol — never by signal, never by pattern

const report = JSON.parse(evaluated.result?.value ?? '{}');
const swCount = swProbe.result?.value;

if (report.viewport !== width) {
  console.error(`REFUSING TO REPORT: asked for a ${width}px viewport, got ${report.viewport}px.`);
  console.error('Numbers measured against the wrong viewport are worse than none.');
  console.error(report.viewport === 980
    ? 'A layout viewport of exactly 980px is Chrome\'s fallback for a page with no\n'
      + '<meta name="viewport" content="width=device-width">.'
    : 'Device emulation did not take effect.');
  process.exit(2);
}

const { vitals, tap, contrast, pwa } = report;
const fail = [];
const mark = (ok) => (ok ? 'OK  ' : 'FAIL');

console.log(`${url}`);
console.log(`  viewport ${report.viewport}×${height} · ${throttle
  ? `throttled: ${THROTTLE.downKbps}kbps down / ${THROTTLE.rttMs}ms RTT / ${THROTTLE.cpuRate}× CPU (Lighthouse mobile)`
  : 'UNTHROTTLED — not comparable to a Lighthouse mobile run'}`);

console.log('\n  Web vitals');
console.log(`   ${mark(vitals.fcp > 0 && vitals.fcp < BUDGET.fcp)} FCP  ${vitals.fcp}ms (budget <${BUDGET.fcp}ms)`);
console.log(`   ${mark(vitals.lcp > 0 && vitals.lcp < BUDGET.lcp)} LCP  ${vitals.lcp}ms (budget <${BUDGET.lcp}ms)`);
console.log(`   ${mark(vitals.cls < BUDGET.cls)} CLS  ${vitals.cls} (budget <${BUDGET.cls})`);
console.log(`        TTFB ${vitals.ttfb}ms · transferred ~${vitals.transferKb}KB`);
if (!(vitals.fcp > 0 && vitals.fcp < BUDGET.fcp)) fail.push('FCP');
if (!(vitals.lcp > 0 && vitals.lcp < BUDGET.lcp)) fail.push('LCP');
if (!(vitals.cls < BUDGET.cls)) fail.push('CLS');

console.log('\n  PWA installability');
console.log(`   ${mark(pwa.https)} served over HTTPS`);
console.log(`   ${mark(!!pwa.manifest)} manifest linked ${pwa.manifest || ''}`);
console.log(`   ${mark(pwa.viewportMeta)} viewport meta`);
console.log(`   ${mark(!!pwa.themeColor)} theme-color ${pwa.themeColor || ''}`);
console.log(`   ${mark(pwa.appleTouchIcon)} apple-touch-icon (iOS Home Screen)`);
console.log(`   ${mark(swCount > 0)} service worker registered (${swCount < 0 ? 'unsupported' : swCount})`);
if (!pwa.https) fail.push('HTTPS');
if (!pwa.manifest) fail.push('manifest');
if (!pwa.appleTouchIcon) fail.push('apple-touch-icon');
if (!(swCount > 0)) fail.push('service worker');

console.log(`\n  Tap targets — ${tap.length} under ${BUDGET.tapDefault}px (DESIGN.md §5 default)`);
if (tap.length === 0) {
  console.log('   OK   every control is at least 48px on its short side.');
} else {
  for (const t of tap) {
    console.log(`   ${t.below44 ? 'FAIL' : 'WARN'} ${t.w}×${t.h}px ${t.text ? '"' + t.text + '"' : ''}`);
    console.log(`        ${t.path}`);
  }
  console.log(`   (FAIL = under the hard ${BUDGET.tapFloor}px floor; WARN = in the 44-47px`);
  console.log('    band, allowed only for §5\'s named dense in-row controls.)');
}
if (tap.some((t) => t.below44)) fail.push('tap targets');

console.log(`\n  Text contrast — ${contrast.length} distinct combination(s) under WCAG AA`);
if (contrast.length === 0) {
  console.log('   OK   every text/background pair meets AA.');
} else {
  for (const c of contrast) {
    console.log(`   FAIL ${c.ratio}:1 (needs ${c.need}:1) — ${c.px}px${c.bold ? ' bold' : ''} ${c.color} on ${c.bg}`);
    console.log(`        ${c.text ? '"' + c.text + '" ' : ''}${c.path}`);
  }
  fail.push('contrast');
}

console.log(fail.length === 0
  ? '\n  PASS — every budget met.'
  : `\n  ${fail.length} budget(s) failed: ${fail.join(', ')}`);

process.exit(strict && fail.length ? 1 : 0);
