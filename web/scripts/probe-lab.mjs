// `node scripts/probe-lab.mjs <screenshot-dir>` — the lab in a headless Chromium against `vite preview`
// (built dist/). Not part of `npm test`: it needs playwright-core (present through vitest's browser package)
// and a Chromium (env CHROMIUM, default the Playwright install path). Exits 1 on any broken law:
// one canvas on /, byte-identical frames one second apart at rest and after a walk, the walk and the
// door waking then sleeping the loop, the Laterion drawer with no href, the spec drawer, a mid-door
// pagehide/pageshow reset, one same-tab Continuum navigation and Back, the Chronarch door unmounting
// the lab, 0 canvas on the workbench, the reduced-motion station list, no console error, no external request.
import { spawn } from "node:child_process";
import { chromium } from "playwright-core";
const PORT = Number(process.env.PORT ?? 4208); const BASE = `http://localhost:${PORT}`; const CONT = "https://continuum.rexmetrix.com"; const OUT = process.argv[2] ?? ".";
const preview = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 60; i++) { try { if ((await fetch(BASE + "/")).ok) break; } catch {} await sleep(500); }
let fail = false; const why = []; const out = {}; let page = null; const navs = [];
const check = (cond, msg) => { if (!cond) { fail = true; why.push(msg); } };
try {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--no-sandbox"] });
  const problems = [], requests = [];
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  page = await ctx.newPage();
  page.on("pageerror", (e) => problems.push("pageerror: " + e.message.slice(0, 200)));
  page.on("console", (m) => { if (m.type() === "error") problems.push("console.error: " + m.text().slice(0, 200)); });
  page.on("request", (r) => { const u = r.url(); if (!u.startsWith(BASE) && !u.startsWith(CONT)) requests.push(u); if (r.isNavigationRequest() && r.frame() === page.mainFrame()) navs.push(u); });
  await page.route(CONT + "/**", (route) => route.fulfill({ status: 200, contentType: "text/html", body: "<title>stub</title><p>host stub</p>" }));
  const attr = (sel, a) => page.getAttribute(sel, a);
  const count = (sel) => page.locator(sel).count();
  await page.goto(BASE + "/", { waitUntil: "networkidle" }); await sleep(2500);
  out.cold = {
    mode: await attr('[data-testid="landing-body"]', "data-mode"), canvases: await count("canvas"), loop: await attr('[data-testid="lab-viewport"]', "data-loop"),
    strip: await count('[data-testid="legal-strip"]'), llc: await page.innerText('[data-testid="strip-llc"]'), buyer: await page.innerText('[data-testid="buyer-line"]'), hint: await page.innerText('[data-testid="lab-sentence"]'),
    gate: (await count('[data-testid="gate"]')) + (await count('input[type="checkbox"]')), signs: await page.$$eval('[data-testid^="sign-"]', (els) => els.map((e) => e.textContent)),
    storage: await page.evaluate(() => localStorage.length), slogan: (await page.innerText("body")).includes("Measurement is King"), stationList: await count('[data-testid="station-list"]'),
  };
  const cv = page.locator("canvas");
  const a0 = await cv.screenshot(); await sleep(1000); const a1 = await cv.screenshot(); out.stillAtRest = a0.equals(a1);
  await page.screenshot({ path: OUT + "/lab-cold.png" });
  // hover a mesh (the Chronarch display sits under its sign): the sentence changes, one frame, then rest
  const box = await page.locator('[data-testid="sign-chronarch"]').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height + 55); await sleep(500);
  out.hover = { sentence: await page.innerText('[data-testid="lab-sentence"]'), cursor: await page.evaluate(() => document.body.style.cursor) };
  await page.mouse.move(20, 450); await sleep(600);
  out.hoverReset = { sentence: await page.innerText('[data-testid="lab-sentence"]'), loop: await attr('[data-testid="lab-viewport"]', "data-loop") };
  // walk to the covered bench: the loop wakes for the walk, the drawer opens, no door, the loop sleeps, the frame is still
  await page.click('[data-testid="sign-laterion"]'); await sleep(350);
  out.walkLoop = await attr('[data-testid="lab-viewport"]', "data-loop");
  await page.waitForSelector('[data-testid="laterion-drawer"]', { timeout: 8000 });
  out.laterion = { drawer: await page.innerText('[data-testid="laterion-drawer"]'), links: await count('[data-testid="laterion-drawer"] a'), url: page.url(), doorIris: await count('[data-testid="door-iris"]'), hrefs: await page.$$eval("a", (els) => els.map((x) => x.getAttribute("href") ?? "").filter((h) => /laterion/i.test(h)).length) };
  await sleep(1300); out.loopAfterWalk = await attr('[data-testid="lab-viewport"]', "data-loop");
  const b0 = await cv.screenshot(); await sleep(1000); const b1 = await cv.screenshot(); out.stillAfterWalk = b0.equals(b1);
  await page.screenshot({ path: OUT + "/lab-laterion.png" });
  await page.click('[data-testid="laterion-drawer-close"]');
  // the spec board: the legal text in a drawer
  await page.click('[data-testid="sign-specboard"]'); await page.waitForSelector('[data-testid="spec-drawer"]', { timeout: 8000 });
  out.spec = { llc: await page.innerText('[data-testid="board-llc"]'), attributions: await count('[data-testid^="board-attribution-"]'), url: page.url() };
  await page.click('[data-testid="spec-drawer-close"]');
  // the Chronarch door, reset mid-door by pagehide + pageshow (a BFCache restore): plane gone, flag clear, no navigation
  // (armed in the page itself: under a software GPU a protocol round trip can outlast the 700 ms door)
  const armed = page.evaluate(() => new Promise((res) => {
    const fire = () => { const loop = document.querySelector('[data-testid="lab-viewport"]')?.getAttribute("data-loop"); window.dispatchEvent(new Event("pagehide")); const e = new Event("pageshow"); Object.defineProperty(e, "persisted", { value: true }); window.dispatchEvent(e); res(loop); };
    const mo = new MutationObserver(() => { if (document.querySelector('[data-testid="door-iris"]')) { mo.disconnect(); fire(); } });
    mo.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => { mo.disconnect(); res("no door within 12 s"); }, 12000);
  }));
  await page.click('[data-testid="sign-chronarch"]');
  out.doorLoop = await armed;
  await sleep(1200);
  out.afterPageshow = { url: page.url(), doorIris: await count('[data-testid="door-iris"]'), leaving: await attr('[data-testid="landing-body"]', "data-leaving") };
  // the camera eases back from the piece to the shop window, then the loop sleeps
  let restAt = null; for (let i = 0; i < 40; i++) { if ((await attr('[data-testid="lab-viewport"]', "data-loop")) === "demand") { restAt = i * 250; break; } await sleep(250); }
  out.afterPageshow.loop = await attr('[data-testid="lab-viewport"]', "data-loop"); out.afterPageshow.restAfterMs = restAt;
  const r0 = await cv.screenshot(); await sleep(1000); const r1 = await cv.screenshot(); out.afterPageshow.still = r0.equals(r1);
  out.ivoryFraction = await page.evaluate(async (png) => {
    const img = new Image(); img.src = "data:image/png;base64," + png; await img.decode();
    const c = document.createElement("canvas"); c.width = img.width; c.height = img.height; const g = c.getContext("2d"); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data; let ivory = 0; for (let i = 0; i < d.length; i += 16) { if (d[i] > 200 && d[i + 1] > 200 && d[i + 2] > 190) ivory++; } return ivory / (d.length / 16);
  }, (await page.screenshot()).toString("base64"));
  // Continuum: the walk, the door, then exactly one same-tab navigation to its host (stubbed); no new page
  await page.click('[data-testid="sign-continuum"]');
  await page.waitForURL((u) => u.toString().startsWith(CONT), { timeout: 10000 });
  out.continuum = { url: page.url(), navsToHost: navs.filter((u) => u.startsWith(CONT)).length, pages: ctx.pages().length };
  // Back: the lab, not a plane
  await page.goBack({ waitUntil: "networkidle" }); await sleep(2500);
  out.back = { url: page.url(), doorIris: await count('[data-testid="door-iris"]'), leaving: await attr('[data-testid="landing-body"]', "data-leaving"), canvases: await count("canvas"), loop: await attr('[data-testid="lab-viewport"]', "data-loop") };
  // the Chronarch door reaches /chronarch and the lab unmounts (one canvas: the well)
  await page.click('[data-testid="sign-chronarch"]'); await page.waitForURL(/\/chronarch$/, { timeout: 10000 });
  const tUrl = Date.now();
  await page.waitForSelector('[data-testid="lab-viewport"]', { state: "detached", timeout: 15000 });
  out.chronarch = { url: page.url(), labGone: (await count('[data-testid="lab-viewport"]')) === 0, unmountMs: Date.now() - tUrl, canvases: await count("canvas"), well: await count('[data-testid="viewport"]') };
  await page.goto(BASE + "/chronarch/tech", { waitUntil: "networkidle" }); await sleep(600);
  out.tech = { canvases: await count("canvas"), bench: await count('[data-testid="tech-bench"]') };
  // reduced motion: no canvas, the station list
  const ctx2 = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1440, height: 900 } });
  const p2 = await ctx2.newPage(); await p2.goto(BASE + "/", { waitUntil: "networkidle" }); await sleep(800);
  out.reduced = { mode: await p2.getAttribute('[data-testid="landing-body"]', "data-mode"), canvases: await p2.locator("canvas").count(), stations: await p2.$$eval('[data-testid^="station-door-"]', (els) => els.map((e) => [e.getAttribute("data-testid"), e.tagName, e.getAttribute("href")])) };
  await p2.screenshot({ path: OUT + "/lab-reduced.png", fullPage: false });
  out.externalRequests = requests; out.problems = problems;
  console.log(JSON.stringify(out, null, 1));
  check(problems.length === 0, "console/page errors"); check(requests.length === 0, "external requests");
  check(out.cold.mode === "lab" && out.cold.canvases === 1 && out.cold.loop === "demand" && out.cold.strip === 1 && out.cold.llc.includes("RexMetrix Technologies, LLC") && out.cold.buyer.startsWith("A local workbench") && out.cold.gate === 0 && out.cold.storage === 0 && !out.cold.slogan && out.cold.stationList === 0, "cold load");
  check(JSON.stringify(out.cold.signs) === JSON.stringify(["CONTINUUM · RUNNING", "CHRONARCH · RUNNING", "SPEC BOARD · LEGAL", "LAB BOOK · WORKBENCH", "LATERION · NOT SHIPPING · NOT A DIAGNOSTIC"]), "signs");
  check(out.stillAtRest, "rest frames differ"); check(out.hover.sentence.startsWith("Chronarch") && out.hover.cursor === "pointer", "hover sentence"); check(out.hoverReset.loop === "demand", "loop after hover");
  check(out.walkLoop === "always", "walk did not wake the loop"); check(out.laterion.drawer.includes("Not shipping. Not a diagnostic. Not a person-score.") && out.laterion.links === 0 && out.laterion.url.endsWith("/") && out.laterion.doorIris === 0 && out.laterion.hrefs === 0, "laterion drawer");
  check(out.loopAfterWalk === "demand" && out.stillAfterWalk, "loop or frame after the walk");
  check(out.spec.llc === "RexMetrix Technologies, LLC" && out.spec.attributions === 2 && out.spec.url.endsWith("/"), "spec drawer");
  check(out.doorLoop === "always" && out.afterPageshow.url.endsWith("/") && out.afterPageshow.doorIris === 0 && out.afterPageshow.leaving === "" && out.afterPageshow.loop === "demand" && out.afterPageshow.still && out.ivoryFraction < 0.02, "door reset");
  check(out.continuum.url.startsWith(CONT) && out.continuum.navsToHost === 1 && out.continuum.pages === 1, "continuum door");
  check(out.back.url.endsWith("/") && out.back.doorIris === 0 && out.back.leaving === "" && out.back.canvases === 1 && out.back.loop === "demand", "back from continuum");
  check(out.chronarch.url.endsWith("/chronarch") && out.chronarch.labGone && out.chronarch.canvases === 1 && out.chronarch.well === 1, "chronarch door"); check(out.tech.canvases === 0 && out.tech.bench === 1, "tech");
  check(out.reduced.mode === "reduced-motion" && out.reduced.canvases === 0 && out.reduced.stations.length === 5 && out.reduced.stations[2][1] === "BUTTON" && out.reduced.stations[2][2] === null && out.reduced.stations[1][2] === CONT, "reduced");
  await browser.close();
} catch (e) { fail = true; why.push("threw: " + (e && e.message)); out.navs = navs; out.urlAtFailure = page ? page.url() : null; console.log(JSON.stringify(out, null, 1)); try { if (page) await page.screenshot({ path: OUT + "/lab-failure.png" }); } catch {} } finally { preview.kill(); }
if (why.length) console.error("FAILED: " + why.join("; "));
process.exit(fail ? 1 : 0);
