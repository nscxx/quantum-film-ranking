import { writeFileSync } from 'node:fs';

// Five seconds, 60 fps. Everything is baked: seeking gives the same frame.
const FPS = 60, END = 300;
const f = k => ({ a: 0, k });
const ease = { i: { x: .65, y: 1 }, o: { x: .22, y: 0 } };
const key = entries => ({ a: 1, k: entries.map(([t, s], index) => ({
  t, s: Array.isArray(s) ? s : [s], ...(index === entries.length - 1 ? {} : ease),
})) });
const linear = entries => ({ a: 1, k: entries.map(([t, s], index) => ({
  t, s: Array.isArray(s) ? s : [s],
  ...(index === entries.length - 1 ? {} : { i: { x: 1, y: 1 }, o: { x: 0, y: 0 } }),
})) });
const blue = [.07, .36, 1, 1], cyan = [.24, .8, 1, 1], white = [.87, .96, 1, 1], gold = [1, .74, .32, 1];
const layers = [];
const transform = (p = [0, 0, 0], extra = {}) => ({
  o: f(100), r: f(0), p: f(p), a: f([0, 0, 0]), s: f([100, 100, 100]), ...extra,
});
function layer(nm, ty, props = {}, ks = {}, timing = {}) {
  const result = { ddd: 0, ind: layers.length + 1, ty, nm, sr: 1, ks: transform([0, 0, 0], ks), ao: 0, ip: 0, op: END, st: 0, bm: 0, ...props, ...timing };
  layers.push(result);
  return result;
}
const fill = (c, o = 100) => ({ ty: 'fl', c: f(c), o: f(o), r: 1 });
const stroke = (c, w = 2, o = 100) => ({ ty: 'st', c: f(c), o: f(o), w: f(w), lc: 2, lj: 2, ml: 4 });
const ellipse = (w, h = w) => ({ ty: 'el', p: f([0, 0]), s: f([w, h]), d: 1 });
const polygon = (v, c = true) => ({ i: v.map(() => [0, 0]), o: v.map(() => [0, 0]), v, c });
const path = (v, c = true) => ({ ty: 'sh', ks: f(polygon(v, c)), d: 1 });
const shape = (nm, shapes, ks = {}, timing) => layer(nm, 4, { shapes }, ks, timing);
const gradient = (s, e, stops, type = 1, opacity = 100) => ({
  ty: 'gf', o: f(opacity), r: 1, t: type, s: f(s), e: f(e), g: { p: stops.length / 4, k: f(stops) },
});
const goldFill = (height = 100) => gradient([0, -height / 2], [0, height / 2], [
  0, 1, .97, .84, .26, 1, .84, .52, .5, .56, .31, .12, .66, 1, .84, .54, 1, 1, .97, .85,
]);
const reveal = (at, span = 25) => key([[0, 0], [at, 0], [at + span, 100], [299, 100]]);

// Author back-to-front; reverse once for Lottie's painter order.
layer('Neon city / camera dolly', 2, { refId: 'track' }, {
  p: f([960, 540, 0]), a: f([836, 470.5, 0]),
  s: key([[0, [114.9, 114.9, 100]], [299, [122, 122, 100]]]),
});
shape('Deep title atmosphere', [path([[0, 0], [1920, 0], [1920, 445], [0, 445]]), fill([.005, .015, .055, 1], 32)], { o: key([[0, 65], [90, 100], [299, 85]]) });

// The portal is made of independently rotating concentric broken rings.
for (let j = 0; j < 7; j++) {
  const diameter = 750 + j * 38;
  const ring = [ellipse(diameter), stroke(j % 3 === 0 ? gold : blue, j % 2 ? 4 : 12, j % 2 ? 78 : 28)];
  if (j < 5) ring.push({ ty: 'tm', s: f(j * 11), e: f(62 + j * 7), o: f(0), m: 1 });
  shape('Portal / ring ' + j, ring, {
    p: f([960, 657, 0]), r: linear([[0, j * 49], [299, j * 49 + (j % 2 ? -200 : 240)]]),
    o: reveal(8 + j * 2),
    s: key([[0, [65, 65, 100]], [55, [100, 100, 100]], [299, [106, 106, 100]]]),
  });
}
for (let j = 0; j < 16; j++) {
  const angle = j * Math.PI / 8;
  shape('Orbit capsule ' + j, [path([[-3, -16], [3, -16], [3, 16], [-3, 16]]), fill(j % 3 ? cyan : gold)], {
    p: f([960 + Math.cos(angle) * 440, 657 + Math.sin(angle) * 440, 0]),
    r: f(angle * 180 / Math.PI), o: key([[0, 0], [28 + j, 0], [48 + j, 85], [140, 30], [220, 90], [299, 45]]),
  });
}

// Continuous cloth waves: adjacent cells share the exact same animated vertices.
function flagPoint(u, v, t, side) {
  const x = -90 + 660 * u;
  const y = 225 + 230 * u + v * (320 - 100 * u) + Math.sin(u * 8 - t * .065 + v * .65) * 18;
  return [side ? 1920 - x : x, y];
}
for (let side = 0; side < 2; side++) {
  const cells = [];
  for (let row = 0; row < 5; row++) for (let col = 0; col < 11; col++) {
    const sequence = [];
    for (let t = 0; t <= 300; t += 15) {
      const coords = [[col / 11, row / 5], [(col + 1) / 11, row / 5], [(col + 1) / 11, (row + 1) / 5], [col / 11, (row + 1) / 5]];
      sequence.push([t, [polygon(coords.map(([u, v]) => flagPoint(u, v, t, side)))]]);
    }
    const isLight = (row + col) % 2 === 0;
    cells.push({ ty: 'gr', it: [
      { ty: 'sh', ks: linear(sequence), d: 1 },
      fill(isLight ? [.5 + col * .019, .62 + col * .014, .94, 1] : [.025, .055, .15, 1], isLight ? 84 : 96),
      { ty: 'tr', p: f([0, 0]), a: f([0, 0]), s: f([100, 100]), r: f(0), o: f(100), sk: f(0), sa: f(0) },
    ] });
  }
  shape('Waving checkered flag / ' + side, cells, {
    p: key([[0, [side ? 260 : -260, 0, 0]], [40, [0, 0, 0]], [299, [0, 0, 0]]]), o: reveal(0, 35),
  });
}

// Road streaks repeatedly rush from the vanishing point past the camera.
for (let j = 0; j < 42; j++) {
  const side = j % 2 ? 1 : -1;
  const endX = 960 + side * (350 + (j * 139 % 1180));
  const endY = 800 + (j * 71 % 380);
  const dx = endX - 960, dy = endY - 745;
  for (let cycle = 0; cycle < 5; cycle++) {
    const at = 10 + j % 14 * 3 + cycle * 53;
    if (at + 26 > END) continue;
    shape('Track speedline ' + j + '/' + cycle,
      [path([[0, 0], [dx * .26, dy * .26]], false), stroke(j % 7 ? cyan : gold, j % 3 ? 2 : 5)],
      { p: linear([[at, [960 + dx * .1, 745 + dy * .1, 0]], [at + 27, [endX, endY, 0]]]),
        o: key([[at, 0], [at + 7, 75], [at + 25, 85], [at + 28, 0]]) },
      { ip: at, op: at + 29 });
  }
}

// Cubic outline of a bold italic 3: a font-independent, portable gold vector.
function cubicOutline(commands) {
  const v = [], i = [], o = [];
  for (const cmd of commands) {
    if (cmd.length === 2) { v.push(cmd); i.push([0, 0]); o.push([0, 0]); }
    else {
      const prev = v[v.length - 1], [x1, y1, x2, y2, x, y] = cmd;
      o[o.length - 1] = [x1 - prev[0], y1 - prev[1]];
      v.push([x, y]); i.push([x2 - x, y2 - y]); o.push([0, 0]);
    }
  }
  return { v, i, o, c: true };
}
const three = cubicOutline([
  [0, 70], [12, 15, 54, 0, 119, 0], [194, 0, 234, 27, 222, 90],
  [218, 120, 198, 142, 168, 158], [204, 170, 214, 196, 207, 231],
  [195, 303, 144, 344, 60, 344], [-10, 344, -42, 312, -37, 255], [34, 246],
  [30, 275, 46, 290, 76, 290], [109, 290, 132, 270, 137, 239],
  [143, 204, 124, 190, 84, 190], [58, 190], [68, 137], [94, 137],
  [131, 137, 149, 120, 154, 92], [159, 67, 147, 53, 121, 53],
  [94, 53, 78, 69, 70, 94], [0, 83],
]);
for (let depth = 4; depth >= 0; depth--) {
  shape('TOP 3 / gold extrusion ' + depth, [
    { ty: 'sh', ks: f(three), d: 1 },
    depth ? fill([.32 + depth * .015, .16, .05, 1]) : gradient([0, 0], [0, 345], [0, 1, .98, .86, .32, 1, .81, .5, .51, .54, .28, .12, .69, 1, .76, .45, 1, 1, .97, .84]),
    stroke(depth ? gold : [1, .96, .82, 1], depth ? 1 : 3.2),
  ], {
    p: key([[0, [950 + depth * 2, 500 + depth * 3, 0]], [28, [950 + depth * 2, 500 + depth * 3, 0]], [56, [940 + depth * 2, 399 + depth * 3, 0]], [299, [940 + depth * 2, 393 + depth * 3, 0]]]),
    s: key([[0, [42, 42, 100]], [28, [42, 42, 100]], [60, [104, 104, 100]], [76, [100, 100, 100]], [299, [102, 102, 100]]]), o: reveal(28, 25),
  });
}

// Sparks launch from behind the three cars, before the car image layers.
for (let j = 0; j < 50; j++) {
  const a = Math.PI + (j * .731 % Math.PI);
  const dx = Math.cos(a) * (220 + j % 9 * 48), dy = Math.sin(a) * (95 + j % 7 * 40);
  const at = 28 + j % 18 * 3;
  for (let cycle = 0; cycle < 3; cycle++) {
    const start = at + cycle * 78;
    shape('Golden acceleration spark ' + j + '/' + cycle,
      [path([[0, 0], [dx * .1, dy * .1]], false), stroke(j % 4 ? gold : white, 1.5 + j % 3)],
      { p: linear([[start, [960, 790, 0]], [start + 45, [960 + dx, 790 + dy, 0]]]),
        o: key([[start, 0], [start + 6, 95], [start + 32, 70], [start + 46, 0]]) },
      { ip: start, op: Math.min(END, start + 47) });
  }
}

const vehiclePlans = [
  { name: 'Left chase car', x: 579, y: 780, scale: 16.5, at: 14, sway: -1 },
  { name: 'Right chase car', x: 1347, y: 792, scale: 15.7, at: 24, sway: 1 },
  { name: 'Hero car', x: 960, y: 930, scale: 39, at: 33, sway: 1 },
];
for (const car of vehiclePlans) {
  const position = [], scale = [], reflectionScale = [], rotation = [];
  for (let t = 0; t <= 300; t += 3) {
    const arrival = Math.max(0, Math.min(1, (t - car.at) / 67));
    const travel = 1 - (1 - arrival) ** 3;
    const settle = Math.max(0, Math.min(1, (t - 112) / 188));
    const vibration = arrival * Math.sin(t * 1.07) * (car.name === 'Hero car' ? 1.15 : .55);
    const p = [960 + (car.x - 960) * travel + Math.sin(t * .072) * 6 * travel * car.sway,
      736 + (car.y - 736) * travel + vibration + settle * 9, 0];
    const s = 4 + (car.scale - 4) * travel + settle * car.scale * .035;
    position.push([t, p]); scale.push([t, [s, s, 100]]);
    reflectionScale.push([t, [s, -s * .48, 100]]);
    rotation.push([t, Math.sin(t * .091) * .35 * travel * car.sway]);
  }
  // Same moving contact point anchors tires, reflection and light.
  layer(car.name + ' / road reflection', 2, { refId: 'car' }, {
    p: linear(position), a: f([836, 852, 0]), s: linear(reflectionScale), r: linear(rotation),
    o: key([[0, 0], [car.at + 10, 0], [car.at + 60, 15], [299, 19]]),
  });
  shape(car.name + ' / underglow', [ellipse(1370, 125), gradient([0, 0], [700, 0], [0, .18, .62, 1, 1, .005, .018, .055], 2, 60)], {
    p: linear(position), s: linear(scale), o: reveal(car.at, 60),
  });
  layer(car.name + ' / independently driven body', 2, { refId: 'car' }, {
    p: linear(position), a: f([836, 852, 0]), s: linear(scale), r: linear(rotation), o: reveal(car.at, 20),
  });
  // Flares follow the very same chassis keyframes rather than remaining on the background.
  for (const sign of [-1, 1]) {
    const flare = [];
    for (const [t, p] of position) {
      const s = scale.find(([frame]) => frame === t)[1][0] / 100;
      flare.push([t, [p[0] + sign * 630 * s, p[1] - 440 * s, 0]]);
    }
    shape(car.name + ' / headlight ' + sign, [
      ellipse(680, 16), fill(cyan, 15), ellipse(340, 4), fill(white, 95),
      ellipse(25, 25), fill(white, 82),
    ], { p: linear(flare), s: linear(scale), o: key([[0, 0], [car.at + 30, 0], [car.at + 64, 80], [142, 45], [181, 100], [225, 40], [279, 80], [299, 60]]) });
  }
}

// Crown and laurel leaves assemble individually around the dynamic heading.
shape('Gold crown / float', [
  path([[-53, 16], [-65, -28], [-29, -7], [0, -53], [28, -7], [65, -28], [53, 16]]),
  goldFill(90), stroke([1, .93, .72, 1], 1.5),
  path([[-53, 22], [53, 22], [50, 30], [-50, 30]]), fill(gold),
], { p: key([[0, [960, 25, 0]], [38, [960, 92, 0]], [110, [960, 86, 0]], [190, [960, 94, 0]], [260, [960, 85, 0]], [299, [960, 90, 0]]]),
  r: key([[0, -13], [48, 0], [145, 3], [240, -3], [299, 0]]), o: reveal(10, 20) });
for (let side = 0; side < 2; side++) {
  const sign = side ? 1 : -1;
  const stem = [];
  for (let j = 0; j < 25; j++) {
    const t = j / 24;
    stem.push([960 + sign * (345 + Math.sin(t * Math.PI * .87) * 112), 315 - t * 195]);
  }
  shape('Laurel branch ' + side, [path(stem, false), stroke(gold, 2.2)], { o: reveal(24, 35) });
  for (let j = 0; j < 12; j++) {
    const t = j / 11;
    const x = 960 + sign * (345 + Math.sin(t * Math.PI * .87) * 112);
    const y = 315 - t * 195;
    const leaf = { v: [[0, 0], [18, -11], [0, -40], [-8, -13]], i: [[0, 0], [0, 12], [12, 10], [-3, -10]], o: [[10, -4], [0, -10], [-8, 7], [0, 8]], c: true };
    shape('Laurel leaf ' + side + '/' + j, [{ ty: 'sh', ks: f(leaf), d: 1 }, goldFill(40), stroke([1, .94, .77, 1], 1)], {
      p: f([x, y, 0]), r: key([[0, sign * 95], [28 + j * 2, sign * 95], [55 + j * 2, sign * (65 - t * 110)], [180, sign * (60 - t * 110)], [299, sign * (65 - t * 110)]]),
      s: key([[0, [0, 0, 100]], [25 + j * 2, [0, 0, 100]], [55 + j * 2, [100, 100, 100]], [299, [100, 100, 100]]]), o: reveal(25 + j * 2, 20),
    });
  }
}

// Foreground confetti: far pieces are small; near pieces grow and fly past.
for (let j = 0; j < 44; j++) {
  const start = j % 12 * 7;
  const x = (j * 373 % 2080) - 80, drift = ((j * 157 % 700) - 350);
  shape('Flying confetti / ' + j, [path([[-5, -11], [6, -8], [5, 11], [-6, 8]]), fill(j % 3 ? gold : cyan)], {
    p: linear([[start, [x, -90, 0]], [299, [x + drift, 1120 + j % 5 * 70, 0]]]),
    r: linear([[start, j * 51], [299, j * 51 + (j % 2 ? 550 : -490)]]),
    s: key([[start, [45, 70, 100]], [100 + j, [j % 4 ? 100 : 190, 110, 100]], [210 + j, [25, 140, 100]], [299, [j % 4 ? 125 : 260, 170, 100]]]),
    o: key([[start, 0], [start + 15, 90], [275, 90], [299, 0]]),
  }, { ip: start });
}

const data = { v: '5.13.0', fr: FPS, ip: 0, op: END, w: 1920, h: 1080, nm: 'Quantum / Top three racing arrival', ddd: 0,
  assets: [{ id: 'track', w: 1672, h: 941, u: '', p: 'track.png', e: 0 }, { id: 'car', w: 1672, h: 941, u: '', p: 'car.png', e: 0 }],
  layers: layers.reverse(), markers: [{ tm: 0, cm: 'Ignition', dr: 30 }, { tm: 30, cm: 'Three car charge', dr: 80 }, { tm: 110, cm: 'Victory hold', dr: 160 }, { tm: 270, cm: 'Exit', dr: 30 }] };
writeFileSync(new URL('../public/lottie/top3/top3.json', import.meta.url), JSON.stringify(data));
console.log('Built ' + data.layers.length + ' independently timed layers, 5 seconds at 60 fps.');
