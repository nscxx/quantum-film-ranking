import { writeFileSync } from 'node:fs';

// Reproducible, native Lottie shape layers; the image plate retains crystal detail.
const fixed = (k) => ({ a: 0, k });
const keys = (entries) => ({ a: 1, k: entries.map(([t, s]) => ({ t, s: Array.isArray(s) ? s : [s], i: { x: .65, y: 1 }, o: { x: .25, y: 0 } })) });
const layers = [];
function shape(name, shapes, p, extra = {}) {
  layers.push({ ddd: 0, ind: layers.length + 1, ty: 4, nm: name, sr: 1,
    ks: { o: fixed(100), r: fixed(0), p: fixed(p), a: fixed([0, 0, 0]), s: fixed([100, 100, 100]), ...extra },
    ao: 0, shapes, ip: 0, op: 90, st: 0, bm: 0 });
}
const stroke = (color, width, opacity = 100) => ({ ty: 'st', c: fixed(color), o: fixed(opacity), w: fixed(width), lc: 2, lj: 2 });
const ellipse = (w, h) => ({ ty: 'el', p: fixed([0, 0]), s: fixed([w, h]), d: 1 });
for (let n = 0; n < 3; n++) {
  shape(`Expanding energy ring ${n}`, [ellipse(900, 225), stroke([.62, .3, 1, 1], 3 - n * .6)], [768, 790, 0], {
    s: keys([[0, [65 + n * 12, 65 + n * 12, 100]], [55, [110 + n * 9, 110 + n * 9, 100]], [89, [120 + n * 9, 120 + n * 9, 100]]]),
    o: keys([[0, 0], [10 + n * 5, 70], [65, 45], [89, 0]]),
  });
}
shape('Lightning emblem orbit', [ellipse(140, 140), stroke([.8, .48, 1, 1], 3), { ty: 'tm', s: fixed(0), e: fixed(72), o: fixed(0), m: 1 }], [768, 139, 0], { r: keys([[0, 0], [89, 340]]), o: keys([[0, 0], [12, 100], [78, 100], [89, 0]]) });
for (let n = 0; n < 32; n++) {
  const angle = (n * 2.39996), radius = 170 + n % 7 * 47;
  const x = Math.cos(angle), y = Math.sin(angle);
  shape(`Crystal spark ${n}`, [ellipse(n % 3 + 2, n % 3 + 2), { ty: 'fl', c: fixed(n % 4 ? [.7, .48, 1, 1] : [.4, .85, 1, 1]), o: fixed(100), r: 1 }], [768, 650, 0], {
    p: keys([[0, [768 + x * radius * .5, 640 + y * radius * .3, 0]], [89, [768 + x * radius * 1.7, 500 + y * radius, 0]]]),
    o: keys([[0, 0], [8 + n % 12, 85], [60 + n % 15, 70], [89, 0]]),
  });
}
layers.push({ ddd: 0, ind: layers.length + 1, ty: 2, nm: 'Crystal background plate', refId: 'plate', sr: 1,
  ks: { o: fixed(100), r: fixed(0), p: fixed([768, 512, 0]), a: fixed([768, 512, 0]), s: fixed([100, 100, 100]) }, ao: 0, ip: 0, op: 90, st: 0, bm: 0 });
writeFileSync(new URL('../public/lottie/milestone.json', import.meta.url), JSON.stringify({ v: '5.12.2', fr: 30, ip: 0, op: 90, w: 1536, h: 1024, nm: 'Quantum score milestone', ddd: 0, assets: [{ id: 'plate', w: 1536, h: 1024, u: '', p: 'milestone-plate.png', e: 0 }], layers, markers: [] }));
