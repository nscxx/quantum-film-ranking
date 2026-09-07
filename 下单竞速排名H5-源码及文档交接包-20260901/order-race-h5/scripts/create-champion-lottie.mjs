import { readFileSync, writeFileSync } from 'node:fs';

// Reproducible 15-second composition. All coordinates are in a 1920×1080 stage.
const END = 900, FR = 60;
const f = k => ({ a: 0, k });
const animated = (entries, linear = false) => ({ a: 1, k: entries.map(([t, s], index) => ({
  t, s: Array.isArray(s) ? s : [s],
  ...(index === entries.length - 1 ? {} : {
    i: { x: linear ? 1 : .7, y: 1 }, o: { x: linear ? 0 : .2, y: 0 },
  }),
})) });
const gold = [1, .69, .24, 1], ivory = [1, .96, .79, 1], amber = [.57, .24, .055, 1];
const layers = [];
const assets = ['city', 'body', 'head', 'cloud', 'pedestal'].map(id => {
  const png = readFileSync(new URL('../public/lottie/champion/' + id + '.png', import.meta.url));
  return { id, w: png.readUInt32BE(16), h: png.readUInt32BE(20), u: '', p: id + '.png', e: 0 };
});
function layer(nm, ty, props = {}, ks = {}, timing = {}) {
  const entry = { ddd: 0, ind: layers.length + 1, ty, nm, sr: 1,
    ks: { o: f(100), r: f(0), p: f([0, 0, 0]), a: f([0, 0, 0]), s: f([100, 100, 100]), ...ks },
    ao: 0, ip: 0, op: END, st: 0, bm: 0, ...props, ...(props.masksProperties ? { hasMask: true } : {}), ...timing };
  layers.push(entry); return entry;
}
const shape = (nm, shapes, ks = {}, props = {}, timing = {}) => layer(nm, 4, { shapes, ...props }, ks, timing);
const poly = (v, c = true) => ({ v, i: v.map(() => [0, 0]), o: v.map(() => [0, 0]), c });
const path = (v, c = true) => ({ ty: 'sh', ks: f(poly(v, c)), d: 1 });
const ellipse = (w, h = w) => ({ ty: 'el', p: f([0, 0]), s: f([w, h]), d: 1 });
const fill = (c, o = 100) => ({ ty: 'fl', c: f(c), o: f(o), r: 1 });
const stroke = (c, w, o = 100) => ({ ty: 'st', c: f(c), o: f(o), w: f(w), lc: 2, lj: 2, ml: 4 });
const gradient = (s, e, stops, o = 100) => ({ ty: 'gf', t: 1, r: 1, s: f(s), e: f(e), o: f(o), g: { p: stops.length / 4, k: f(stops) } });
const metal = (h = 200) => gradient([0, -h / 2], [0, h / 2], [
  0, 1, .99, .87, .2, 1, .8, .43, .48, .55, .25, .055, .55, .97, .62, .22, .81, 1, .94, .65, 1, .71, .36, .08,
]);
const reveal = (at, span = 60, max = 100) => animated([...(at > 0 ? [[0, 0]] : []), [at, 0], [at + span, max], [899, max]]);
const pulse = (at, period = 120, low = 30, high = 100) => {
  const entries = [[0, 0], [at, 0]];
  for (let t = at + 20; t < END; t += period / 2) entries.push([t, entries.length % 2 ? low : high]);
  entries.push([899, high]); return animated(entries.filter((entry, i, all) => i === 0 || entry[0] > all[i - 1][0]));
};
function image(nm, id, width, position, extra = {}, props = {}) {
  const asset = assets.find(item => item.id === id), scale = width / asset.w * 100;
  return layer(nm, 2, { refId: id, ...props }, { p: f([...position, 0]), a: f([asset.w / 2, asset.h / 2, 0]), s: f([scale, scale, 100]), ...extra });
}
function rig(nm, ks, parent) { return layer(nm, 3, parent ? { parent } : {}, ks); }
const group = it => ({ ty: 'gr', it: [...it, { ty: 'tr', p: f([0, 0]), a: f([0, 0]), s: f([100, 100]), r: f(0), o: f(100), sk: f(0), sa: f(0) }] });

// 00 — City dolly, columns of light and a distant gold constellation.
const city = assets.find(a => a.id === 'city'), base = 1920 / city.w * 100;
image('City / slow camera push', 'city', 1920, [960, 540], { s: animated([[0, [base, base, 100]], [899, [base * 1.075, base * 1.075, 100]]]), o: animated([[0, 20], [100, 100], [899, 100]]) });
for (let j = 0; j < 14; j++) {
  const x = 160 + j * 126, tilt = (j - 6.5) * -4;
  shape('Volumetric gold beam ' + j, [path([[-10, 0], [-90, -980], [90, -980], [10, 0]]),
    gradient([0, 0], [0, -950], [0, 1, .67, .23, 1, .11, .065, .02], 9)],
    { p: f([x, 940, 0]), r: animated([[0, tilt - 13], [300, tilt + 8], [600, tilt - 7], [899, tilt + 5]]), o: pulse(20 + j * 6, 280, 22, 75) });
}
for (let j = 0; j < 84; j++) {
  const x = (j * 277 % 1900) + 10, y = (j * 173 % 990) + 25, size = j % 7 === 0 ? 3.6 : 1.3;
  shape('Floating gold dust ' + j, [ellipse(size), fill(j % 4 ? gold : ivory)], {
    p: animated([[0, [x, y + 90, 0]], [899, [x + (j % 2 ? 85 : -85), y - 100, 0]]], true),
    o: pulse(j % 12 * 8, 210 + j % 6 * 20, 5, 60 + j % 4 * 10),
  });
}

// 01 — Independent cloud banks roll in at different depths.
for (let j = 0; j < 3; j++) {
  image('Cloud bank / depth ' + j, 'cloud', 1740 + j * 180, [960, 630 + j * 64], {
    p: animated([[0, [960 + (j - 1) * 140, 970 + j * 50, 0]], [120 + j * 25, [960, 675 + j * 45, 0]],
      [400, [900 + j * 40, 650 + j * 42, 0]], [650, [995 - j * 30, 685 + j * 40, 0]], [899, [960, 660 + j * 45, 0]]]),
    o: reveal(j * 15, 100, j === 0 ? 75 : 36),
    r: animated([[0, -2 + j], [420, 1 - j], [899, -1 + j]]),
  });
}

// 02 — Back halves of the orbital ribbons pass behind the dragon.
function ribbon(j, front = false) {
  const ring = [ellipse(1230 + j * 120, 310 + j * 28), stroke(j % 2 ? ivory : gold, j % 2 ? 2.2 : 5, front ? 82 : 64),
    { ty: 'tm', s: f(front ? 0 : 50), e: f(front ? 48 : 100), o: animated([[0, j * 46], [899, j * 46 + (j % 2 ? -650 : 740)]], true), m: 1 }];
  shape((front ? 'Front' : 'Rear') + ' orbital ribbon ' + j, ring, {
    p: animated([[0, [960, 660, 0]], [180, [960, 425 + j * 75, 0]], [550, [960, 410 + j * 75, 0]], [899, [960, 425 + j * 75, 0]]]),
    r: animated([[0, -19 + j * 18], [450, -13 + j * 18], [899, -19 + j * 18]]),
    o: reveal(75 + j * 30, 70),
    s: animated([[0, [15, 15, 100]], [75 + j * 30, [15, 15, 100]], [180 + j * 25, [100, 100, 100]], [899, [104, 104, 100]]]),
  });
}
for (let j = 0; j < 3; j++) ribbon(j);

// 03 — The dragon uses articulated raster sections, sharing a moving body root.
const dragonRig = rig('Dragon / coiling root', {
  p: animated([[0, [850, 720, 0]], [90, [850, 720, 0]], [230, [960, 405, 0]], [400, [953, 390, 0]], [580, [968, 415, 0]], [750, [951, 393, 0]], [899, [960, 405, 0]]]),
  r: animated([[0, -15], [90, -15], [230, 0], [400, 1.2], [580, -1.1], [750, 1.4], [899, 0]]),
  s: animated([[0, [45, 45, 100]], [90, [45, 45, 100]], [230, [100, 100, 100]], [600, [101.5, 101.5, 100]], [899, [100, 100, 100]]]),
  o: reveal(90, 70),
});
const body = assets.find(a => a.id === 'body'), bodyScale = 1520 / body.w;
const tailShape = poly([[body.w * .716, body.h * .55], [body.w, body.h * .46], [body.w, body.h], [body.w * .7, body.h], [body.w * .68, body.h * .74]]);
const clawShape = poly([[body.w * .49, body.h * .53], [body.w * .64, body.h * .59], [body.w * .71, body.h * .86], [body.w * .48, body.h * .87]]);
const mask = (mode, pt) => ({ inv: false, mode, pt: f(pt), o: f(100), x: f(0) });
image('Dragon / upper coil and chest', 'body', 1520, [0, 0], { o: reveal(90, 70) }, { parent: dragonRig.ind, masksProperties: [mask('s', tailShape), mask('s', clawShape)] });
const tailAnchor = [body.w * .705, body.h * .68];
image('Dragon / articulated tail', 'body', 1520, [(tailAnchor[0] - body.w / 2) * bodyScale, (tailAnchor[1] - body.h / 2) * bodyScale], {
  a: f([...tailAnchor, 0]), o: reveal(90, 70), r: animated([[0, 0], [240, 0], [360, -2.5], [480, 3], [620, -2.5], [760, 2.5], [899, 0]]),
}, { parent: dragonRig.ind, masksProperties: [mask('a', tailShape), mask('s', clawShape)] });
const headRig = rig('Dragon / independent head turn', {
  p: animated([[0, [195, -30, 0]], [150, [195, -30, 0]], [265, [230, -80, 0]], [415, [218, -100, 0]], [560, [242, -72, 0]], [720, [220, -100, 0]], [899, [230, -80, 0]]]),
  r: animated([[0, -17], [150, -17], [255, 1], [405, -3], [565, 2], [725, -2.5], [899, 0]]), o: reveal(160, 60),
}, dragonRig.ind);
const head = assets.find(a => a.id === 'head');
image('Dragon / face horns and mane', 'head', 720, [0, 0], { a: f([head.w * .46, head.h * .72, 0]), o: reveal(160, 60) }, { parent: headRig.ind });

// Flowing whiskers extend beyond the sprite and follow the head's local axes.
for (let j = 0; j < 5; j++) {
  const frames = [];
  for (let t = 0; t <= 900; t += 30) {
    const vertices = Array.from({ length: 19 }, (_, k) => [240 + k * 15, 20 - k * (j + 2.4) + Math.sin(k * .4 - t * .018 + j) * k * .85]);
    frames.push([t, [poly(vertices, false)]]);
  }
  shape('Dragon / flowing whisker ' + j, [{ ty: 'sh', ks: animated(frames, true), d: 1 }, stroke(j % 2 ? ivory : gold, 1.2 + j % 2, 78)],
    { o: reveal(200 + j * 9, 40) }, { parent: headRig.ind });
}
shape('Dragon / luminous eye', [
  group([ellipse(38, 15), fill(gold, 18)]),
  group([ellipse(13, 7), fill(ivory, 94)]),
  group([ellipse(92, 2), fill(ivory, 68)]),
], { p: f([236, -68, 0]), o: pulse(260, 190, 25, 90) }, { parent: headRig.ind });

// Tiny glints travel across the raised scales along the upper coil.
for (let j = 0; j < 38; j++) {
  const a = j / 37 * Math.PI * 1.5;
  const x = -150 + Math.cos(a) * 430, y = -100 + Math.sin(a) * 200;
  shape('Dragon / scale glint ' + j, [
    group([ellipse(3 + j % 3), fill(ivory)]),
    group([path([[0, -12], [2, -2], [12, 0], [2, 2], [0, 12], [-2, 2], [-12, 0], [-2, -2]]), fill(gold, 80)]),
  ], { p: f([x, y, 0]), s: f([j % 3 ? 50 : 95, j % 3 ? 50 : 95, 100]), o: pulse(220 + j * 5, 170, 0, 100) }, { parent: dragonRig.ind });
}

// 04 — A golden number rises, then the jeweled crown lands above it.
const trophyRig = rig('Trophy / rising monolith', {
  p: animated([[0, [960, 780, 0]], [200, [960, 780, 0]], [360, [960, 453, 0]], [400, [960, 465, 0]], [899, [960, 460, 0]]]),
  s: animated([[0, [30, 30, 100]], [200, [30, 30, 100]], [365, [102, 102, 100]], [400, [100, 100, 100]], [899, [100, 100, 100]]]),
  o: reveal(200, 70),
});
const one = [[-130, -134], [-22, -192], [95, -192], [95, 200], [-20, 200], [-20, -65], [-130, -19]];
for (let depth = 7; depth >= 0; depth--) {
  shape('Number 1 / beveled gold layer ' + depth, [path(one), depth ? fill([.21 + depth * .025, .095 + depth * .012, .018, 1]) : metal(400), stroke(depth ? gold : ivory, depth ? 1.4 : 3.2)],
    { p: f([depth * -3.5, depth * 2, 0]), o: reveal(200, 70) }, { parent: trophyRig.ind });
}
shape('Number 1 / inner inset highlight', [path([[-115, -124], [-12, -179], [81, -179], [81, 184]], false), stroke(ivory, 2.2)],
  { o: pulse(330, 260, 25, 100) }, { parent: trophyRig.ind });
const crownRig = rig('Crown / coronation bounce', {
  p: animated([[0, [0, -590, 0]], [300, [0, -590, 0]], [395, [0, -225, 0]], [420, [0, -241, 0]], [440, [0, -231, 0]], [620, [0, -236, 0]], [899, [0, -231, 0]]]),
  r: animated([[0, -18], [300, -18], [395, 5], [425, -2], [450, 0], [680, 1.6], [899, 0]]), o: reveal(300, 50),
}, trophyRig.ind);
shape('Crown / five gold points', [path([[-86, 18], [-99, -64], [-58, -31], [-46, -76], [-13, -35], [0, -96], [28, -35], [57, -73], [62, -22], [99, -57], [84, 18]]),
  metal(120), stroke(ivory, 2.3)], { o: reveal(300, 50) }, { parent: crownRig.ind });
shape('Crown / curved gold band', [ellipse(171, 35), metal(38), stroke(gold, 4)], { p: f([0, 17, 0]), o: reveal(300, 50) }, { parent: crownRig.ind });
for (let j = 0; j < 7; j++) {
  const x = -77 + j * 26;
  shape('Crown / ruby ' + j, [path([[0, -10], [6, 0], [0, 9], [-6, 0]]), fill(j === 3 ? [.82, .04, .025, 1] : ivory), stroke(gold, 1.2)],
    { p: f([x, 17, 0]), o: pulse(385 + j * 5, 180, 62, 100) }, { parent: crownRig.ind });
}
shape('Crown / central red diamond', [path([[0, -20], [13, 0], [0, 19], [-13, 0]]),
  gradient([0, -20], [0, 20], [0, 1, .45, .18, .4, .8, .025, .015, 1, .22, .005, .001]), stroke(ivory, 1.8)],
  { p: f([0, -36, 0]), o: pulse(370, 230, 75, 100) }, { parent: crownRig.ind });
for (const [x, y] of [[-99, -64], [-46, -76], [0, -96], [57, -73], [99, -57]]) {
  shape('Crown / pearl ' + x, [ellipse(12), metal(12), stroke(ivory, 1)], { p: f([x, y, 0]), o: pulse(365 + Math.abs(x) / 4, 200, 70, 100) }, { parent: crownRig.ind });
}
for (let j = 0; j < 3; j++) ribbon(j, true);

// Claw tips are masked from the same source, so they pass in front of the numeral.
const clawAnchor = [body.w * .53, body.h * .57];
image('Dragon / foreground talons', 'body', 1520, [(clawAnchor[0] - body.w / 2) * bodyScale, (clawAnchor[1] - body.h / 2) * bodyScale], {
  a: f([...clawAnchor, 0]), o: reveal(90, 70),
  r: animated([[0, 0], [260, 0], [390, 1.1], [540, -1.2], [710, 1], [899, 0]]),
}, { parent: dragonRig.ind, masksProperties: [mask('a', clawShape)] });

// 05 — Award plaque unfolds into place; live province typography sits on top.
const plaqueRig = rig('Plaque / unfurl', {
  p: animated([[0, [960, 810, 0]], [365, [960, 810, 0]], [445, [960, 738, 0]], [899, [960, 735, 0]]]),
  s: animated([[0, [0, 45, 100]], [365, [0, 45, 100]], [420, [105, 100, 100]], [450, [100, 100, 100]], [899, [100, 100, 100]]]), o: reveal(365, 40),
});
const plaque = [[-560, -86], [-488, -116], [490, -116], [563, -82], [548, 88], [462, 111], [-465, 111], [-548, 84]];
shape('Plaque / cast gold outer frame', [path(plaque), metal(230), stroke(ivory, 2.4)], {}, { parent: plaqueRig.ind });
shape('Plaque / polished black face', [path(plaque.map(([x, y]) => [x * .982, y * .94])), gradient([0, -110], [0, 110], [0, .16, .085, .025, .35, .035, .025, .019, .65, .018, .013, .012, 1, .1, .046, .012]), stroke(gold, 1.6)], {}, { parent: plaqueRig.ind });
shape('Plaque / top rim glint', [path([[-480, -111], [0, -119], [475, -111]], false), stroke(ivory, 2.4)],
  { o: pulse(445, 200, 12, 100) }, { parent: plaqueRig.ind });
for (let side = 0; side < 2; side++) {
  const sign = side ? 1 : -1;
  for (let j = 0; j < 13; j++) {
    const t = j / 12, x = sign * (454 + Math.sin(t * Math.PI * .85) * 64), y = 86 - t * 175;
    const leaf = { v: [[0, 0], [15, -10], [0, -33], [-7, -11]], i: [[0, 0], [0, 10], [10, 8], [-2, -8]], o: [[8, -3], [0, -8], [-6, 6], [0, 6]], c: true };
    shape('Plaque / laurel ' + side + '/' + j, [{ ty: 'sh', ks: f(leaf), d: 1 }, metal(35), stroke(ivory, .9)],
      { p: f([x, y, 0]), r: animated([[0, sign * 100], [420 + j * 3, sign * 100], [465 + j * 3, sign * (66 - t * 113)], [680, sign * (61 - t * 113)], [899, sign * (66 - t * 113)]]),
        s: animated([[0, [0, 0, 100]], [420 + j * 3, [0, 0, 100]], [465 + j * 3, [100, 100, 100]], [899, [100, 100, 100]]]) }, { parent: plaqueRig.ind });
  }
}

// 06 — The pedestal rises through the cloud and circulates light around its rim.
image('Podium / ceremonial rise', 'pedestal', 1520, [960, 685], {
  p: animated([[0, [960, 940, 0]], [100, [960, 735, 0]], [180, [960, 685, 0]], [899, [960, 685, 0]]]),
  o: reveal(10, 90),
});
for (let j = 0; j < 5; j++) {
  shape('Podium / revolving gold ring ' + j, [ellipse(1260 + j * 50, 128 + j * 12), stroke(j % 2 ? ivory : gold, j % 2 ? 1.5 : 3.2, 78),
    { ty: 'tm', s: f(0), e: f(35 + j * 7), o: animated([[0, j * 60], [899, j * 60 + (j % 2 ? -880 : 1100)]], true), m: 1 }],
    { p: f([960, 944 + j * 6, 0]), o: reveal(70 + j * 15, 55) });
}
for (let j = 0; j < 30; j++) {
  const a = j / 30 * Math.PI * 2;
  shape('Podium / sequential rim light ' + j, [ellipse(j % 3 ? 5 : 9), fill(ivory)], {
    p: f([960 + Math.cos(a) * 647, 947 + Math.sin(a) * 72, 0]), o: pulse(140 + j * 10, 150, 15, 100),
  });
}

// 07 — Gold fountains and near/far confetti, timed in waves instead of one static burst.
for (let j = 0; j < 90; j++) {
  const start = 380 + j % 15 * 12, sign = j % 2 ? 1 : -1;
  const endX = 960 + sign * (260 + j * 173 % 900), endY = 270 + j * 83 % 560;
  shape('Celebration / spark fountain ' + j, [path([[0, 0], [sign * (8 + j % 5 * 5), -15 - j % 7 * 4]], false), stroke(j % 5 ? gold : ivory, j % 3 ? 1.7 : 3)],
    { p: animated([[start, [960 + sign * 460, 910, 0]], [start + 90, [endX, endY, 0]], [start + 205, [endX + sign * 140, endY + 245, 0]]], true),
      o: animated([[start, 0], [start + 12, 100], [start + 135, 80], [start + 210, 0]]) }, {}, { ip: start, op: Math.min(END, start + 211) });
}
for (let j = 0; j < 110; j++) {
  const at = 380 + j % 19 * 13, x = j * 367 % 2050 - 70, drift = j * 137 % 570 - 285;
  const big = j % 9 === 0, shapes = big ? [path([[-9, -20], [10, -12], [8, 18], [-11, 12]]), metal(40)] : [path([[-4, -8], [5, -6], [4, 8], [-5, 6]]), fill(j % 4 ? gold : ivory)];
  shape('Celebration / gold confetti ' + j, shapes, {
    p: animated([[at, [x, -70, 0]], [899, [x + drift, 1100 + j % 6 * 65, 0]]], true),
    r: animated([[at, j * 33], [899, j * 33 + (j % 2 ? 520 : -490)]], true),
    s: animated([[at, [30, 40, 100]], [at + 100, [big ? 175 : 90, 100, 100]], [at + 210, [20, big ? 160 : 95, 100]], [899, [big ? 230 : 130, big ? 180 : 110, 100]]]),
    o: animated([[at, 0], [at + 24, 92], [860, 92], [899, 0]]),
  }, {}, { ip: at });
}
for (let j = 0; j < 25; j++) {
  const x = 180 + j * 131 % 1560, y = 70 + j * 139 % 850;
  shape('Celebration / star flare ' + j, [
    group([path([[0, -28], [3, -3], [28, 0], [3, 3], [0, 28], [-3, 3], [-28, 0], [-3, -3]]), fill(ivory)]),
    group([ellipse(7), fill(ivory)]),
  ], { p: f([x, y, 0]), o: pulse(300 + j * 12, 220 + j % 3 * 50, 0, 95), r: animated([[0, 0], [899, 60]], true) });
}
const data = { v: '5.13.0', fr: FR, ip: 0, op: END, w: 1920, h: 1080, nm: 'Golden dragon / National champion', ddd: 0, assets,
  layers: layers.reverse(), markers: [
    { tm: 0, cm: 'Cloud sea / anticipation', dr: 120 }, { tm: 120, cm: 'Dragon arrival', dr: 150 },
    { tm: 270, cm: 'Number one and coronation', dr: 150 }, { tm: 420, cm: 'Champion reveal', dr: 150 },
    { tm: 570, cm: 'Golden celebration', dr: 285 }, { tm: 855, cm: 'Fade to rankings', dr: 45 },
  ] };
writeFileSync(new URL('../public/lottie/champion/champion.json', import.meta.url), JSON.stringify(data));
console.log('Champion: ' + layers.length + ' layers, ' + assets.length + ' image assets, ' + END / FR + ' seconds.');
