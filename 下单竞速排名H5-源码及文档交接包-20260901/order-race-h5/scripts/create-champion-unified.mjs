import { readFileSync, writeFileSync } from 'node:fs';

// Unified dragon pass: one connected image layer, plus independent atmosphere and vector effects.
const W = 1920, H = 1080, FPS = 60, END = 900;
const f = k => ({ a: 0, k });
const k = (entries, linear = false) => ({ a: 1, k: entries.map(([t, s], i) => ({
  t, s: Array.isArray(s) ? s : [s],
  ...(i === entries.length - 1 ? {} : { i: { x: linear ? 1 : .7, y: 1 }, o: { x: linear ? 0 : .2, y: 0 } }),
})) });
const layers = [];
const assetNames = ['city', 'dragon', 'cloud', 'pedestal'];
const assets = assetNames.map(id => {
  const b = readFileSync(new URL('../public/lottie/champion/' + id + '.png', import.meta.url));
  return { id, w: b.readUInt32BE(16), h: b.readUInt32BE(20), u: '', p: id + '.png', e: 0 };
});
const asset = id => assets.find(item => item.id === id);
const fill = (c, o = 100) => ({ ty: 'fl', c: f(c), o: f(o), r: 1 });
const stroke = (c, w, o = 100) => ({ ty: 'st', c: f(c), o: f(o), w: f(w), lc: 2, lj: 2 });
const ellipse = (w, h = w) => ({ ty: 'el', p: f([0, 0]), s: f([w, h]), d: 1 });
const path = (v, closed = true) => ({ ty: 'sh', ks: f({ v, i: v.map(() => [0, 0]), o: v.map(() => [0, 0]), c: closed }), d: 1 });
const group = (...items) => ({ ty: 'gr', it: [...items, { ty: 'tr', p: f([0, 0]), a: f([0, 0]), s: f([100, 100]), r: f(0), o: f(100), sk: f(0), sa: f(0) }] });
const reveal = (at, span = 60, max = 100) => k([...(at ? [[0, 0]] : []), [at, 0], [at + span, max], [899, max]]);
const pulse = (at, period = 160, low = 18, high = 100) => {
  const entries = [[0, 0], [at, 0]];
  for (let t = at + 20; t < END; t += period / 2) entries.push([t, entries.length % 2 ? low : high]);
  entries.push([899, high]); return k(entries);
};
function layer(nm, ty, props = {}, ks = {}, timing = {}) {
  const out = { ddd: 0, ind: layers.length + 1, ty, nm, sr: 1,
    ks: { o: f(100), r: f(0), p: f([0, 0, 0]), a: f([0, 0, 0]), s: f([100, 100, 100]), ...ks },
    ao: 0, ip: 0, op: END, st: 0, bm: 0, ...props, ...timing };
  layers.push(out); return out;
}
function image(nm, id, width, position, ks = {}, props = {}) {
  const a = asset(id); return layer(nm, 2, { refId: id, ...props }, {
    p: f([...position, 0]), a: f([a.w / 2, a.h / 2, 0]), s: f([width / a.w * 100, width / a.w * 100, 100]), ...ks,
  });
}
function shape(nm, shapes, ks = {}, props = {}, timing = {}) { return layer(nm, 4, { shapes, ...props }, ks, timing); }
function ring(nm, diameter, y, color, width, at, turn) {
  shape(nm, [ellipse(diameter, diameter * .28), stroke(color, width, 74),
    { ty: 'tm', s: f(0), e: f(33), o: k([[0, 0], [899, turn]], true), m: 1 }],
  { p: f([960, y, 0]), r: k([[0, -18], [420, 8], [899, -12]]), o: reveal(at, 70),
    s: k([[0, [8, 8, 100]], [at, [8, 8, 100]], [at + 100, [100, 100, 100]], [899, [104, 104, 100]]) });
}

image('City / continuous camera push', 'city', W, [W / 2, H / 2], {
  s: k([[0, [114.8, 114.8, 100]], [899, [123, 123, 100]]]), o: k([[0, 12], [80, 100], [899, 100]]),
});
for (let j = 0; j < 3; j++) image('Cloud / depth ' + j, 'cloud', 1780 + j * 130,
  [960 + (j - 1) * 100, 690 + j * 42], {
    p: k([[0, [960 + (j - 1) * 160, 1020, 0]], [130 + j * 20, [960, 700 + j * 30, 0]],
      [420, [920 + j * 30, 685 + j * 30, 0]], [899, [980 - j * 20, 700 + j * 25, 0]]]),
    r: k([[0, -2 + j], [400, 1 - j], [899, -1 + j]]), o: reveal(j * 18, 100, j === 0 ? 78 : 42),
  });

// The dragon stays intact: one bitmap layer, one root transform, no masks or body joints.
image('Dragon / unified connected creature', 'dragon', 1550, [960, 505], {
  p: k([[0, [960, 825, 0]], [105, [960, 740, 0]], [210, [960, 440, 0]], [360, [955, 425, 0]],
    [520, [972, 445, 0]], [690, [951, 430, 0]], [899, [960, 437, 0]]]),
  r: k([[0, -12], [120, -12], [220, 0], [360, 1.2], [520, -1.1], [690, 1], [899, 0]]),
  s: k([[0, [34, 34, 100]], [105, [34, 34, 100]], [225, [100, 100, 100]], [360, [102, 102, 100]],
    [520, [100, 100, 100]], [899, [101, 101, 100]]]), o: reveal(105, 95),
});
for (let j = 0; j < 6; j++) ring('Gold orbital ribbon ' + j, 1090 + j * 110, 440 + j * 54,
  j % 2 ? [.99, .91, .68, 1] : [1, .58, .08, 1], j % 2 ? 2 : 4, 145 + j * 26, j % 2 ? -800 : 1050);
for (let j = 0; j < 8; j++) {
  const a = j * Math.PI / 4;
  shape('Dragon aura pulse ' + j, [ellipse(370 + j * 30, 90 + j * 14), stroke([1, .62, .13, 1], 3, 45)],
    { p: f([960 + Math.cos(a) * 380, 450 + Math.sin(a) * 120, 0]), r: k([[0, j * 25], [899, j * 25 + 480]], true),
      o: pulse(180 + j * 8, 210, 0, 70) });
}
// A separate eye spark adds life without trying to animate the dragon's joints.
shape('Dragon eye spark', [ellipse(32, 15), fill([1, .98, .78, 1]), ellipse(110, 4), fill([1, .75, .25, 1], 60)],
  { p: k([[0, [1120, 312, 0]], [210, [1120, 307, 0]], [899, [1118, 310, 0]]]), o: pulse(260, 180, 22, 100) });

const trophy = layer('Champion number 1 / unified title card', 4, {}, {
  p: k([[0, [960, 820, 0]], [260, [960, 820, 0]], [370, [960, 472, 0]], [899, [960, 470, 0]]]),
  s: k([[0, [22, 22, 100]], [260, [22, 22, 100]], [385, [100, 100, 100]], [899, [101, 101, 100]]]), o: reveal(260, 100),
});
const one = [[-110, -200], [40, -200], [40, 200], [-34, 200], [-34, -115], [-110, -73]];
for (let d = 7; d >= 0; d--) shape('Number 1 extrusion ' + d,
  [path(one), fill(d ? [.18 + d * .03, .07 + d * .01, .015, 1] : [1, .73, .28, 1]), stroke(d ? [1, .55, .1, 1] : [1, .97, .78, 1], d ? 1.5 : 3)],
  { p: f([d * -3, d * 2, 0]), o: reveal(260, 100) }, { parent: trophy.ind });
for (let j = 0; j < 5; j++) ring('Behind trophy halo ' + j, 570 + j * 48, 460, [1, .74, .28, 1], j % 2 ? 2 : 4, 270 + j * 10, j % 2 ? -470 : 610);
// Crown, separate but attached to the number's local root.
shape('Crown gold', [path([[-96, 24], [-110, -66], [-62, -27], [-28, -82], [0, -36], [27, -82], [63, -27], [109, -66], [96, 24]]),
  fill([1, .7, .22, 1]), stroke([1, .95, .72, 1], 2.4)], {
  p: k([[0, [0, -590, 0]], [300, [0, -590, 0]], [410, [0, -244, 0]], [470, [0, -232, 0]], [899, [0, -236, 0]]]),
  r: k([[0, -15], [300, -15], [410, 4], [450, -2], [899, 0]]), o: reveal(300, 85),
}, { parent: trophy.ind });
shape('Crown red jewel', [path([[0, -24], [14, 0], [0, 24], [-14, 0]]), fill([.9, .05, .02, 1]), stroke([1, .9, .6, 1], 2)],
  { p: f([0, -37, 0]), o: pulse(395, 200, 55, 100) }, { parent: trophy.ind });
for (let j = 0; j < 3; j++) ring('Foreground celebration ring ' + j, 1240 + j * 80, 830 + j * 20,
  j % 2 ? [1, .95, .7, 1] : [1, .59, .15, 1], j % 2 ? 2 : 5, 450 + j * 20, j % 2 ? -900 : 1200);
image('Pedestal / unified ceremonial base', 'pedestal', 1530, [960, 690], {
  p: k([[0, [960, 980, 0]], [110, [960, 770, 0]], [200, [960, 690, 0]], [899, [960, 690, 0]]]), o: reveal(20, 120),
});
for (let j = 0; j < 36; j++) {
  const a = j / 36 * Math.PI * 2;
  shape('Podium chase light ' + j, [ellipse(j % 3 ? 5 : 10), fill([1, .94, .68, 1])],
    { p: f([960 + Math.cos(a) * 660, 944 + Math.sin(a) * 78, 0]), o: pulse(170 + j * 10, 170, 10, 100) });
}
for (let j = 0; j < 140; j++) {
  const at = 410 + j % 25 * 15, x = j * 379 % 2050 - 65, drift = j * 131 % 600 - 300;
  shape('Gold celebration fragment ' + j, [
    path(j % 6 ? [[-4, -8], [5, -6], [4, 8], [-5, 6]] : [[-9, -20], [10, -12], [8, 18], [-11, 12]]),
    fill(j % 4 ? [1, .67, .18, 1] : [1, .96, .77, 1]),
  ], { p: k([[at, [x, -90, 0]], [899, [x + drift, 1120 + j % 6 * 65, 0]]], true),
    r: k([[at, j * 31], [899, j * 31 + (j % 2 ? 520 : -490)]], true),
    s: k([[at, [30, 40, 100]], [at + 100, [j % 6 ? 90 : 170, 105, 100]], [at + 210, [20, 145, 100]], [899, [j % 6 ? 130 : 230, 170, 100]]]),
    o: k([[at, 0], [at + 25, 92], [899, 0]]) }, {}, { ip: at });
}
const data = { v: '5.13.0', fr: FPS, ip: 0, op: END, w: W, h: H, nm: 'Golden dragon unified champion', ddd: 0,
  assets, layers: layers.reverse(), markers: [
    { tm: 0, cm: 'Cloud sea and city lights', dr: 120 }, { tm: 120, cm: 'Unified dragon rises', dr: 160 },
    { tm: 280, cm: 'Trophy and coronation', dr: 180 }, { tm: 460, cm: 'Champion title reveal', dr: 180 },
    { tm: 640, cm: 'Gold celebration', dr: 230 }, { tm: 870, cm: 'Exit', dr: 30 },
  ] };
writeFileSync(new URL('../public/lottie/champion/champion.json', import.meta.url), JSON.stringify(data));
console.log('Unified dragon champion: ' + layers.length + ' layers, one connected dragon image, 15 seconds.');
