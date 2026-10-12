// ShipClips video generator: turns a short JSON spec into a HyperFrames project.
// Usage: node build.mjs spec.json outDir
// Retention style: fast cuts, word pops, a progress bar, and original sound effects,
// with every screen held long enough to read at an average pace.
import fs from 'fs';
import path from 'path';

const [, , specPath, outDir] = process.argv;
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const here = path.dirname(new URL(import.meta.url).pathname);

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const words = (s) => String(s).trim().split(/\s+/).filter(Boolean);
const countWords = (b) => {
  const parts = [b.kicker, b.title, b.badge, b.line, b.url, b.name, ...(b.lines || []), ...(b.items || []), ...(b.rows || [])];
  return parts.filter(Boolean).reduce((n, p) => n + words(p).length, 0);
};
// Reading pace: about 4 words a second, plus time for the entrance to land.
const holdFor = (b) => Math.min(3.6, Math.max(1.7, 0.95 + countWords(b) * 0.27));

const T = Object.assign({ bg: '#fbfaf7', ink: '#121212', accent: '#ff4d1c', accentInk: '#121212', card: '#ffffff', line: '#e2ddd2', muted: '#5d5951' }, spec.theme || {});

let t = 0;
const beats = spec.beats.map((b, i) => {
  const dur = +(holdFor(b) + (b.type === 'cta' ? 0.9 : 0)).toFixed(2);
  const beat = { ...b, i, start: +t.toFixed(2), dur };
  t += dur;
  return beat;
});
const total = +t.toFixed(2);

// Markup for one line of headline text, split into words so each can pop in.
const popLine = (line, id, emph) => {
  const ws = words(line).map((w, k) => `<span class="w" id="${id}w${k}">${esc(w)}</span>`).join(' ');
  return `<span class="ln${emph ? ' em' : ''}">${ws}</span>`;
};

const sfx = []; // [file, time, volume]
const anim = [];
const W = (id) => `#${id}`;

const html = beats.map((b) => {
  const id = `b${b.i}`;
  const s = b.start;
  if (b.i > 0) sfx.push(['whoosh', s - 0.08, 0.55]);
  // Every beat: quick whip-in, then a slow push so the frame never sits still.
  anim.push(`tl.fromTo("${W(id + 'in')}", {x: ${b.i % 2 ? -90 : 90}, opacity: 0, filter: "blur(14px)"}, {x: 0, opacity: 1, filter: "blur(0px)", duration: 0.24, ease: "power3.out"}, ${s});`);
  anim.push(`tl.fromTo("${W(id + 'in')}", {scale: 1}, {scale: 1.05, duration: ${b.dur}, ease: "none"}, ${s});`);

  if (b.type === 'hook' || b.type === 'big') {
    const lines = (b.lines || []).map((ln, k) => popLine(ln, `${id}l${k}`, b.em === k)).join('');
    const kick = b.kicker ? `<div class="kicker" id="${id}k">${esc(b.kicker)}</div>` : '';
    if (b.kicker) anim.push(`tl.fromTo("${W(id + 'k')}", {y: 24, opacity: 0}, {y: 0, opacity: 1, duration: 0.25, ease: "power3.out"}, ${s + 0.05});`);
    const ids = [];
    (b.lines || []).forEach((ln, k) => words(ln).forEach((_, j) => ids.push(`#${id}l${k}w${j}`)));
    anim.push(`tl.fromTo(${JSON.stringify(ids)}, {yPercent: 70, opacity: 0, scale: 0.8}, {yPercent: 0, opacity: 1, scale: 1, duration: 0.3, ease: "back.out(2.2)", stagger: 0.07}, ${s + 0.12});`);
    sfx.push(['pop', s + 0.12, 0.5]);
    sfx.push(['thud', s + 0.12 + ids.length * 0.07, 0.6]);
    return `<div class="scene clip" id="${id}" data-start="${s}" data-duration="${b.dur}" data-track-index="1"><div class="inner" id="${id}in">${kick}<div class="h ${b.type}">${lines}</div></div></div>`;
  }

  if (b.type === 'card') {
    const rows = (b.rows || []).map((r, k) => `<div class="row" id="${id}r${k}"><i class="tick"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg></i><span>${esc(r)}</span></div>`).join('');
    const badge = b.badge ? `<div class="badge" id="${id}bd">${esc(b.badge)}</div>` : '';
    anim.push(`tl.fromTo("${W(id + 'c')}", {scale: 0.82, y: 60, opacity: 0}, {scale: 1, y: 0, opacity: 1, duration: 0.35, ease: "back.out(1.7)"}, ${s + 0.08});`);
    sfx.push(['thud', s + 0.1, 0.5]);
    (b.rows || []).forEach((_, k) => {
      const at = +(s + 0.45 + k * 0.32).toFixed(2);
      anim.push(`tl.fromTo("${W(id + 'r' + k)}", {x: -30, opacity: 0}, {x: 0, opacity: 1, duration: 0.22, ease: "power3.out"}, ${at});`);
      sfx.push(['click', at, 0.7]);
    });
    if (b.badge) {
      const at = +(s + 0.45 + (b.rows || []).length * 0.32 + 0.1).toFixed(2);
      anim.push(`tl.fromTo("${W(id + 'bd')}", {scale: 0.4, opacity: 0}, {scale: 1, opacity: 1, duration: 0.3, ease: "back.out(2.6)"}, ${at});`);
      sfx.push(['pop', at, 0.55]);
    }
    return `<div class="scene clip" id="${id}" data-start="${s}" data-duration="${b.dur}" data-track-index="1"><div class="inner" id="${id}in"><div class="card" id="${id}c"><div class="ctitle">${esc(b.title || '')}</div>${rows}${badge}</div></div></div>`;
  }

  if (b.type === 'list') {
    const items = (b.items || []).map((it, k) => `<div class="item" id="${id}i${k}"><b>${k + 1}</b><span>${esc(it)}</span></div>`).join('');
    anim.push(`tl.fromTo("${W(id + 't')}", {y: 24, opacity: 0}, {y: 0, opacity: 1, duration: 0.25, ease: "power3.out"}, ${s + 0.05});`);
    (b.items || []).forEach((_, k) => {
      const at = +(s + 0.3 + k * 0.38).toFixed(2);
      anim.push(`tl.fromTo("${W(id + 'i' + k)}", {x: 70, opacity: 0}, {x: 0, opacity: 1, duration: 0.26, ease: "back.out(1.6)"}, ${at});`);
      sfx.push(['pop', at, 0.45]);
    });
    return `<div class="scene clip" id="${id}" data-start="${s}" data-duration="${b.dur}" data-track-index="1"><div class="inner" id="${id}in"><div class="ltitle" id="${id}t">${esc(b.title || '')}</div>${items}</div></div>`;
  }

  if (b.type === 'cta') {
    sfx.push(['rise', s - 0.75, 0.45]);
    sfx.push(['ding', s + 0.2, 0.5]);
    anim.push(`tl.fromTo("${W(id + 'n')}", {scale: 0.6, opacity: 0}, {scale: 1, opacity: 1, duration: 0.4, ease: "back.out(2)"}, ${s + 0.1});`);
    anim.push(`tl.fromTo("${W(id + 'p')}", {y: 30, opacity: 0}, {y: 0, opacity: 1, duration: 0.3, ease: "power3.out"}, ${s + 0.45});`);
    anim.push(`tl.fromTo("${W(id + 'u')}", {opacity: 0}, {opacity: 1, duration: 0.3}, ${s + 0.7});`);
    anim.push(`tl.fromTo("${W(id + 'p')}", {scale: 1}, {scale: 1.06, duration: 0.35, yoyo: true, repeat: 3, ease: "sine.inOut"}, ${s + 0.9});`);
    return `<div class="scene clip" id="${id}" data-start="${s}" data-duration="${b.dur}" data-track-index="1"><div class="inner center" id="${id}in"><div class="name" id="${id}n">${esc(b.name)}</div><div class="pill" id="${id}p">${esc(b.line)}</div><div class="url" id="${id}u">${esc(b.url || '')}</div></div></div>`;
  }
  throw new Error('Unknown beat type ' + b.type);
}).join('\n');

// Sound is off unless the spec sets "sound": true (the synthesized effects are placeholders until a licensed library is added).
const audio = !spec.sound ? '' : sfx.filter(([, at]) => at >= 0 && at < total - 0.05).map(([f, at, v], k) => {
  const len = { whoosh: 0.45, pop: 0.1, click: 0.03, ding: 0.9, thud: 0.35, rise: 0.9 }[f];
  const d = Math.min(len, +(total - at).toFixed(2));
  return `<audio id="sfx${k}" src="sfx/${f}.wav" data-start="${at.toFixed(2)}" data-duration="${d}" data-track-index="${10 + (k % 4)}" data-volume="${v}"></audio>`;
}).join('\n');

const doc = `<!doctype html>
<html lang="en" data-resolution="portrait">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=1080, height=1920" />
<script src="assets/gsap.min.js"></script>
<style>
@font-face { font-family: "Bricolage Grotesque"; src: url("assets/bricolage-grotesque-latin-800-normal.woff2") format("woff2"); font-weight: 800; }
@font-face { font-family: "Bricolage Grotesque"; src: url("assets/bricolage-grotesque-latin-700-normal.woff2") format("woff2"); font-weight: 700; }
@font-face { font-family: "Inter"; src: url("assets/inter-latin-500-normal.woff2") format("woff2"); font-weight: 500; }
@font-face { font-family: "Inter"; src: url("assets/inter-latin-600-normal.woff2") format("woff2"); font-weight: 600; }
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 1080px; height: 1920px; overflow: hidden; background: ${T.bg}; }
#root { width: 100%; height: 100%; position: relative; background: ${T.bg}; color: ${T.ink}; font-family: "Inter", sans-serif; }
.progress { position: absolute; left: 0; top: 0; height: 12px; width: 100%; background: ${T.accent}; transform-origin: left center; }
.scene { position: absolute; inset: 0; }
.inner { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: center; padding: 0 88px; }
.inner.center { align-items: center; text-align: center; }
.kicker { align-self: flex-start; font-size: 34px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: ${T.accentInk}; background: ${T.accent}; padding: 12px 24px; border-radius: 999px; margin-bottom: 44px; }
.h { font-family: "Bricolage Grotesque", sans-serif; font-weight: 800; letter-spacing: -0.045em; line-height: 1.02; }
.h.hook { font-size: 136px; } .h.big { font-size: 118px; }
.ln { display: block; padding-bottom: 12px; }
.ln.em { color: ${T.accent}; }
.w { display: inline-block; }
.card { background: ${T.card}; border: 4px solid ${T.border || T.ink}; border-radius: 44px; padding: 60px 56px; box-shadow: 18px 18px 0 ${T.shadow || T.ink}; }
.ctitle { font-family: "Bricolage Grotesque", sans-serif; font-weight: 800; font-size: 76px; letter-spacing: -0.04em; line-height: 1.04; margin-bottom: 30px; color: ${T.cardInk || T.ink}; }
.row { display: flex; align-items: center; gap: 28px; font-size: 50px; font-weight: 600; line-height: 1.2; padding: 22px 0; border-top: 3px solid ${T.line}; color: ${T.cardInk || T.ink}; }
.tick { flex: none; width: 68px; height: 68px; border-radius: 50%; background: ${T.accent}; color: ${T.accentInk}; display: flex; align-items: center; justify-content: center; }
.tick svg { width: 38px; height: 38px; }
.badge { display: inline-block; margin-top: 34px; font-size: 40px; font-weight: 600; background: ${T.badgeBg || T.ink}; color: ${T.badgeInk || T.card}; padding: 18px 32px; border-radius: 999px; }
.ltitle { font-family: "Bricolage Grotesque", sans-serif; font-weight: 800; font-size: 100px; letter-spacing: -0.04em; margin-bottom: 30px; }
.item { display: flex; align-items: center; gap: 34px; margin-top: 38px; font-size: 56px; font-weight: 600; line-height: 1.15; letter-spacing: -0.01em; }
.item b { flex: none; width: 96px; height: 96px; border-radius: 28px; background: ${T.accent}; color: ${T.accentInk}; font-family: "Bricolage Grotesque", sans-serif; font-size: 52px; display: flex; align-items: center; justify-content: center; }
.name { font-family: "Bricolage Grotesque", sans-serif; font-weight: 800; font-size: 150px; letter-spacing: -0.05em; line-height: 1; }
.pill { margin-top: 56px; font-size: 52px; font-weight: 600; background: ${T.accent}; color: ${T.accentInk}; padding: 30px 54px; border-radius: 999px; }
.url { margin-top: 44px; font-size: 44px; font-weight: 500; color: ${T.muted}; }
</style>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="${total}" data-width="1080" data-height="1920">
<div class="progress" id="progress"></div>
${html}
${audio}
</div>
<script>
const tl = gsap.timeline({ paused: true });
tl.fromTo("#progress", { scaleX: 0 }, { scaleX: 1, duration: ${total}, ease: "none" }, 0);
${anim.join('\n')}
window.__timelines["main"] = tl;
tl.seek(0);
</script>
</body>
</html>
`;

fs.mkdirSync(path.join(outDir, 'assets'), { recursive: true });
fs.mkdirSync(path.join(outDir, 'sfx'), { recursive: true });
for (const f of fs.readdirSync(path.join(here, 'fonts'))) fs.copyFileSync(path.join(here, 'fonts', f), path.join(outDir, 'assets', f));
fs.copyFileSync(path.join(here, 'gsap.min.js'), path.join(outDir, 'assets', 'gsap.min.js'));
for (const f of fs.readdirSync(path.join(here, 'sfx'))) fs.copyFileSync(path.join(here, 'sfx', f), path.join(outDir, 'sfx', f));
fs.writeFileSync(path.join(outDir, 'index.html'), doc);
fs.writeFileSync(path.join(outDir, 'hyperframes.json'), JSON.stringify({ paths: { assets: 'assets' }, media: { autoProxy: false } }, null, 2));
fs.writeFileSync(path.join(outDir, 'package.json'), JSON.stringify({ name: spec.id || 'shipclips-video', private: true }, null, 2));
console.log(`${spec.id}: ${beats.length} beats, ${total}s, ${sfx.length} sound cues`);
