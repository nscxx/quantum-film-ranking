import { writeFileSync } from 'node:fs';

const fixed = (k) => ({ a: 0, k });
const keys = (entries) => ({ a: 1, k: entries.map(([t, s]) => ({ t, s: Array.isArray(s) ? s : [s], i: { x: .72, y: 1 }, o: { x: .18, y: 0 } })) });
const layers = [];
const ellipse = (w, h) => ({ ty: 'el', p: fixed([0, 0]), s: fixed([w, h]), d: 1 });
const path = (vertices, closed = true) => ({ ty: 'sh', ks: fixed({ v: vertices, i: vertices.map(() => [0, 0]), o: vertices.map(() => [0, 0]), c: closed }), d: 1 });
const fill = (color, opacity = 100) => ({ ty: 'fl', c: fixed(color), o: fixed(opacity), r: 1 });
const stroke = (color, width, opacity = 100) => ({ ty: 'st', c: fixed(color), o: fixed(opacity), w: fixed(width), lc: 2, lj: 2 });
function add(name, shapes, position, transform = {}, blend = 0) {
  layers.push({ ddd: 0, ind: layers.length + 1, ty: 4, nm: name, sr: 1,
    ks: { o: fixed(100), r: fixed(0), p: fixed(position), a: fixed([0, 0, 0]), s: fixed([100, 100, 100]), ...transform },
    ao: 0, shapes, ip: 0, op: 240, st: 0, bm: blend });
}

add('Central blue aura', [ellipse(1250, 760), fill([.015, .25, .72, 1], 24)], [960, 555, 0], { s: keys([[0, [35, 35, 100]], [52, [115, 115, 100]], [205, [103, 103, 100]], [239, [125, 125, 100]]]), o: keys([[0, 0], [34, 0], [65, 100], [215, 76], [239, 0]]) }, 1);
add('Central gold flash', [ellipse(680, 680), fill([1, .55, .08, 1], 38)], [960, 555, 0], { s: keys([[0, [0, 0, 100]], [38, [0, 0, 100]], [52, [150, 150, 100]], [82, [72, 72, 100]], [210, [82, 82, 100]], [239, [130, 130, 100]]]), o: keys([[0, 0], [38, 0], [50, 100], [88, 38], [214, 30], [239, 0]]) }, 1);

for (let i = 0; i < 28; i += 1) {
  const rotation = i * (360 / 28);
  const long = 390 + (i % 5) * 45;
  add(`Volumetric burst ray ${i + 1}`, [path([[-5, 0], [-20, -long], [20, -long], [5, 0]]), fill(i % 4 ? [1, .62, .13, 1] : [.08, .55, 1, 1], i % 4 ? 52 : 44)], [960, 585, 0], {
    r: fixed(rotation), s: keys([[0, [8, 8, 100]], [36 + i % 8, [8, 8, 100]], [66 + i % 10, [108, 108, 100]], [210, [92, 92, 100]], [239, [120, 120, 100]]]),
    o: keys([[0, 0], [35 + i % 8, 0], [58 + i % 10, 82], [190, 28], [225, 0]])
  }, 1);
}

for (let i = 0; i < 6; i += 1) {
  add(`Gold cyan energy ring ${i + 1}`, [ellipse(760 + i * 95, 260 + i * 34), stroke(i % 2 ? [.08, .58, 1, 1] : [1, .71, .2, 1], 5 - i * .5, 90)], [960, 715, 0], {
    s: keys([[0, [18, 18, 100]], [30 + i * 7, [18, 18, 100]], [84 + i * 8, [112, 112, 100]], [205, [132, 132, 100]], [239, [150, 150, 100]]]),
    o: keys([[0, 0], [30 + i * 7, 0], [53 + i * 7, 90], [155, 40], [215, 0]])
  }, 1);
}

for (let side = -1; side <= 1; side += 2) {
  for (let i = 0; i < 7; i += 1) {
    const y = -145 + i * 48;
    const verts = [[0, 0], [side * (95 + i * 12), y * .1], [side * (210 + i * 18), y], [side * (330 + i * 19), y]];
    add(`${side < 0 ? 'Left' : 'Right'} circuit wing ${i + 1}`, [path(verts, false), stroke(i % 2 ? [.1, .58, 1, 1] : [1, .72, .22, 1], 4 - i * .25, 88)], [960, 565, 0], { o: keys([[0, 0], [45 + i * 3, 0], [72 + i * 3, 100], [211, 72], [235, 0]]) }, 1);
  }
}

for (let i = 0; i < 82; i += 1) {
  const angle = i * 2.399963;
  const radius = 190 + (i % 12) * 42;
  const start = [960 + Math.cos(angle) * 50, 575 + Math.sin(angle) * 28, 0];
  const end = [960 + Math.cos(angle) * radius * 1.75, 575 + Math.sin(angle) * radius, 0];
  const shape = i % 6 === 0 ? path([[0, -10], [3, -3], [10, 0], [3, 3], [0, 10], [-3, 3], [-10, 0], [-3, -3]]) : i % 5 === 0 ? { ty: 'rc', d: 1, p: fixed([0, 0]), s: fixed([15, 5]), r: fixed(1) } : ellipse(4 + i % 5, 4 + i % 5);
  add(`Premium celebration particle ${i + 1}`, [shape, fill(i % 4 ? [1, .73, .22, 1] : [.12, .67, 1, 1])], start, {
    p: keys([[0, start], [43 + i % 22, start], [164 + i % 42, end], [239, end]]), r: keys([[0, 0], [239, 360 + i * 13]]),
    s: keys([[0, [20, 20, 100]], [48 + i % 20, [115, 115, 100]], [210, [78, 78, 100]]]), o: keys([[0, 0], [42 + i % 22, 0], [62 + i % 22, 100], [178 + i % 34, 74], [224, 0]])
  }, 1);
}

for (let i = 0; i < 18; i += 1) {
  const x = 250 + (i * 83) % 1420;
  const y = 110 + (i * 137) % 760;
  add(`Floating gold sparkle ${i + 1}`, [path([[0, -10], [2, -2], [10, 0], [2, 2], [0, 10], [-2, 2], [-10, 0], [-2, -2]]), fill([1, .83, .4, 1])], [x, y, 0], {
    r: keys([[0, 0], [239, 180]]), s: keys([[0, [25, 25, 100]], [75 + i * 3, [110, 110, 100]], [145 + i * 2, [35, 35, 100]], [220, [95, 95, 100]]]),
    o: keys([[0, 0], [55 + i * 2, 0], [78 + i * 2, 95], [150 + i * 2, 25], [218, 0]])
  }, 1);
}

layers.unshift({ ddd: 0, ind: layers.length + 1, ty: 2, nm: 'Premium mechanical plaque and wings', refId: 'premium-frame', sr: 1,
  ks: { o: keys([[0, 0], [22, 0], [37, 100], [220, 100], [239, 0]]), r: fixed(0), p: fixed([960, 540, 0]), a: fixed([836, 470, 0]),
    s: keys([[0, [48, 48, 100]], [22, [48, 48, 100]], [42, [119, 119, 100]], [52, [112, 112, 100]], [210, [114, 114, 100]], [239, [121, 121, 100]]]) },
  ao: 0, ip: 0, op: 240, st: 0, bm: 0 });

const animation = { v: '5.13.0', fr: 30, ip: 0, op: 240, w: 1920, h: 1080, nm: 'Hangzhou Baotong premium customer celebration', ddd: 0,
  assets: [{ id: 'premium-frame', w: 1672, h: 940, u: '', p: 'big-customer-frame-final.png', e: 0 }], layers,
  markers: [{ tm: 0, cm: 'screen dim', dr: 30 }, { tm: 30, cm: 'gold energy ignition', dr: 35 }, { tm: 65, cm: 'mechanical wings and plaque reveal', dr: 50 }, { tm: 115, cm: 'prestige hold', dr: 95 }, { tm: 210, cm: 'clean exit', dr: 30 }] };
writeFileSync(new URL('../public/lottie/big-customer.json', import.meta.url), JSON.stringify(animation));
