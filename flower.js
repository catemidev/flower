const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const PALETTES = {
  'a': ['#8B0000', '#E85D1E', '#FFD700'],
  'e': ['#000080', '#1E90FF', '#87CEFA'],
  'i': ['#4B0082', '#FF1493', '#FFC0CB'],
  'o': ['#2a004d', '#8A2BE2', '#DDA0DD'],
  'u': ['#003311', '#228B22', '#98FB98'],
  'def': ['#8B4513', '#D9720F', '#FFF8DC']
};

function hashSeed(str) {
  let h = 0; for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return h >>> 0;
}
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Análisis de datos para definir los colores biológicos
function analyzeName(str) {
  const s = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  let chars = []; let counts = { a: 0, e: 0, i: 0, o: 0, u: 0 };
  for (let i = 0; i < str.length; i++) {
    if (str[i].trim() === '') continue;
    chars.push(str[i].toUpperCase());
    let lower = s[i].toLowerCase();
    if (counts[lower] !== undefined) counts[lower]++;
  }
  let max = 0, dom = 'def';
  for (let v of ['a', 'e', 'i', 'o', 'u']) if (counts[v] > max) { max = counts[v]; dom = v; }
  return { palette: PALETTES[max === 0 ? 'def' : dom], chars, text: str.trim() };
}

const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
const easeOutBack = t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };

// MAPA TIPOGRÁFICO EXACTO AL TAMAÑO DEL RECEPTÁCULO
function createLetterMap(char, maxRadius) {
  const size = Math.ceil(maxRadius * 2); // Diámetro exacto
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const ctx = c.getContext('2d', { willReadFrequently: true });

  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#fff';
  // La letra escala siempre al 75% del Receptáculo Floral
  ctx.font = `bold ${size * 0.75}px "Fraunces", serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(char, size / 2, size / 2 + size * 0.06);

  return { data: ctx.getImageData(0, 0, size, size).data, size };
}

// SISTEMA-L BOTÁNICO ORIGINAL
function buildPlant(rnd, baseX, groundY, stepLen, branchAngleBase, isLetter) {
  let x = baseX, y = groundY, heading = 90;
  const segs = [], leaves = [];
  function fwd(len) {
    const rad = heading * Math.PI / 180;
    const nx = x + len * Math.cos(rad), ny = y - len * Math.sin(rad);
    segs.push({ x1: x, y1: y, x2: nx, y2: ny }); x = nx; y = ny;
  }

  fwd(stepLen);
  fwd(stepLen);

  let branchPoint = { x, y, heading };
  heading += branchAngleBase + (rnd() * 8 - 4);
  fwd(stepLen * 0.65);
  leaves.push({ x: x, y: y, angle: heading, length: stepLen, width: stepLen * 0.48 });
  x = branchPoint.x; y = branchPoint.y; heading = branchPoint.heading;

  fwd(stepLen);

  branchPoint = { x, y, heading };
  heading -= branchAngleBase + (rnd() * 8 - 4);
  fwd(stepLen * 0.65);
  leaves.push({ x: x, y: y, angle: heading, length: stepLen, width: stepLen * 0.48 });
  x = branchPoint.x; y = branchPoint.y; heading = branchPoint.heading;

  if (isLetter) fwd(stepLen * 0.8); // Tramo final extra para las letras principales

  segs.forEach((s, i) => s.tone = i / (segs.length - 1));
  return { segments: segs, leaves, topX: x, topY: y };
}

function buildFlower(rnd, cx, cy, petalCount, radius, charStr) {
  const petals = [], dots = [], glowDots = [];
  const off = rnd() * 360;

  for (let j = 0; j < petalCount; j++) {
    const theta = off + j * (360 / petalCount) + (rnd() * 4 - 2);
    const len = radius * (0.85 + rnd() * 0.2);
    const width = Math.max(4, radius * Math.min(0.8, (2 * Math.PI * 0.6) / petalCount));
    petals.push({ cx, cy, theta, len, width });
  }

  const golden = 137.508 * Math.PI / 180;
  const isLetter = !!charStr;

  const dotCount = isLetter ? Math.floor(450 + rnd() * 100) : Math.floor(60 + rnd() * 40);
  // Ampliamos el Receptáculo para las flores tipográficas
  const dotMaxR = isLetter ? radius * 0.55 : radius * 0.35;

  const letterMap = isLetter ? createLetterMap(charStr, dotMaxR) : null;

  for (let k = 0; k < dotCount; k++) {
    const r = dotMaxR * Math.sqrt(k / dotCount);
    const a = k * golden;

    const relX = r * Math.cos(a);
    const relY = r * Math.sin(a);
    let isGlowing = false;

    if (letterMap) {
      const mapX = Math.floor(letterMap.size / 2 + relX);
      const mapY = Math.floor(letterMap.size / 2 + relY);
      if (mapX >= 0 && mapX < letterMap.size && mapY >= 0 && mapY < letterMap.size) {
        const pixelIndex = (mapY * letterMap.size + mapX) * 4;
        if (letterMap.data[pixelIndex] > 128) isGlowing = true;
      }
    }

    const dotObj = { x: cx + relX, y: cy + relY, r: Math.max(1.2, radius * (isGlowing ? 0.025 : 0.02)) };

    if (isGlowing) glowDots.push(dotObj);
    else dots.push(dotObj);
  }
  return { petals, dots, glowDots };
}

function buildGrass(rnd, w, groundY) {
  const blades = [];
  const count = Math.floor(w * 0.8);
  for (let i = 0; i < count; i++) {
    blades.push({
      x: rnd() * w,
      y: groundY + (rnd() * 20 - 5),
      h: 15 + rnd() * 35,
      bend: (rnd() - 0.5) * 30,
      tone: rnd()
    });
  }
  return blades;
}

function buildGarden(nameData, w, h) {
  const seed = hashSeed(nameData.text);
  const rnd = mulberry32(seed);
  const plants = [];

  const baseGroundY = h * 0.92;
  const grass = buildGrass(rnd, w, baseGroundY);

  const numBg = 20 + Math.floor(rnd() * 15);
  for (let i = 0; i < numBg; i++) {
    const z = rnd() * 0.5;
    const groundY = baseGroundY - (z * h * 0.2);
    const baseX = w * (0.02 + rnd() * 0.96);
    const scaleZ = 0.3 + z * 0.6;
    const stepLen = h * 0.08 * scaleZ * (0.8 + rnd() * 0.4);

    const plant = buildPlant(rnd, baseX, groundY, stepLen, 20 + rnd() * 15, false);
    const petalCount = [8, 10, 12, 14][Math.floor(rnd() * 4)];
    const flowerRadius = Math.min(w, h) * 0.09 * scaleZ * (0.7 + rnd() * 0.6);

    const flower = buildFlower(rnd, plant.topX, plant.topY, petalCount, flowerRadius, null);
    plants.push({ ...plant, petalCount, flower, z, isLetter: false, delay: z * 1000 + rnd() * 600 });
  }

  const chars = nameData.chars;
  const maxAncho = Math.min(w * 0.85, 1100);
  const spacing = maxAncho / Math.max(1, chars.length);
  const startX = (w - (spacing * (chars.length - 1))) / 2;

  for (let i = 0; i < chars.length; i++) {
    const z = 0.7 + (rnd() * 0.3);
    const arc = Math.sin((i / Math.max(1, chars.length - 1)) * Math.PI);
    const groundY = baseGroundY + 10 - (arc * h * 0.04);

    const baseX = startX + i * spacing;
    const scaleZ = 0.85 + z * 0.15;
    const stepLen = h * 0.11 * scaleZ * (0.9 + rnd() * 0.2);

    const plant = buildPlant(rnd, baseX, groundY, stepLen, 25 + rnd() * 10, true);
    const petalCount = [12, 15, 18, 21][Math.floor(rnd() * 4)];

    const flowerRadius = Math.max(35, Math.min(spacing * 0.55, h * 0.18));
    const flower = buildFlower(rnd, plant.topX, plant.topY, petalCount, flowerRadius, chars[i]);

    const delay = 1500 + (i * 450) + rnd() * 200;
    plants.push({ ...plant, char: chars[i], petalCount, flower, z, isLetter: true, delay });
  }

  return { palette: nameData.palette, text: nameData.text, grass, plants, h };
}

function buildTimeline(garden, phrase) {
  const items = [];

  garden.grass.forEach((blade, i) => {
    items.push({ z: -1, delay: i * 3, duration: 800, kind: 'grass', blade, ease: easeOutCubic });
  });

  garden.plants.forEach(plant => {
    const segDur = 250;
    plant.segments.forEach((seg, idx) => {
      items.push({ z: plant.z, delay: plant.delay + idx * segDur, duration: segDur, kind: 'stem', seg, ease: easeOutCubic });
    });
    const stemDone = plant.delay + plant.segments.length * segDur;

    plant.leaves.forEach((leaf, idx) => {
      items.push({ z: plant.z, delay: plant.delay + (idx * 180), duration: 450, kind: 'leaf', leaf, ease: easeOutBack });
    });

    const flowerDelay = stemDone + 150;
    plant.flower.petals.forEach((petal, j) => {
      items.push({ z: plant.z, delay: flowerDelay + (j / plant.petalCount) * 600, duration: 550, kind: 'petal', petal, ease: easeOutBack });
    });

    const dotsDelay = flowerDelay + 700;
    plant.flower.dots.forEach((dot, k) => {
      items.push({ z: plant.z, delay: dotsDelay + (k * 3), duration: 300, kind: 'dot', dot, ease: easeOutCubic });
    });

    if (plant.isLetter) {
      plant.flower.glowDots.forEach((gDot, k) => {
        items.push({
          z: plant.z + 0.1,
          delay: dotsDelay + 500 + (k * 4),
          duration: 600,
          kind: 'glowDot',
          dot: gDot,
          ease: easeOutBack
        });
      });
    }
  });
  
  items.push({
    z: 100, delay: 4000, duration: 2000, kind: 'title', text: phrase, ease: easeOutCubic
  });

  items.sort((a, b) => a.z - b.z);
  return items;
}

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const dpr = Math.min(window.devicePixelRatio, 2);

function resizeCanvas() {
  const w = window.innerWidth, h = window.innerHeight;
  canvas.width = w * dpr; canvas.height = h * dpr;
  canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function hexToRgb(hex) { hex = hex.replace('#', ''); return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)]; }
function lerpHex(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return `rgb(${Math.round(A[0] + (B[0] - A[0]) * t)},${Math.round(A[1] + (B[1] - A[1]) * t)},${Math.round(A[2] + (B[2] - A[2]) * t)})`;
}

function drawGrass(blade, e) {
  const tx = blade.x + blade.bend * e;
  const ty = blade.y - blade.h * e;
  ctx.strokeStyle = lerpHex('#112110', '#2a4524', blade.tone);
  ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(blade.x, blade.y);
  ctx.quadraticCurveTo(blade.x + blade.bend / 2, blade.y - blade.h / 2, tx, ty);
  ctx.stroke();
}
function drawStem(seg, e) {
  const tx = seg.x1 + (seg.x2 - seg.x1) * e, ty = seg.y1 + (seg.y2 - seg.y1) * e;
  ctx.strokeStyle = lerpHex('#1e331b', '#486e3f', seg.tone);
  ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(seg.x1, seg.y1); ctx.lineTo(tx, ty); ctx.stroke();
}
function drawLeaf(leaf, e) {
  ctx.save(); ctx.translate(leaf.x, leaf.y); ctx.rotate(-leaf.angle * Math.PI / 180); ctx.scale(e, e);
  const L = leaf.length, w = leaf.width / 2;
  const grad = ctx.createLinearGradient(0, 0, L, 0);
  grad.addColorStop(0, '#2e4a27'); grad.addColorStop(1, '#538047');
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.moveTo(0, 0);
  ctx.bezierCurveTo(L * 0.25, -w * 1.2, L * 0.75, -w * 1.0, L, 0);
  ctx.bezierCurveTo(L * 0.75, w * 1.0, L * 0.25, w * 1.2, 0, 0);
  ctx.fill(); ctx.restore();
}
function drawPetal(petal, e, palette) {
  ctx.save(); ctx.translate(petal.cx, petal.cy); ctx.rotate(-petal.theta * Math.PI / 180); ctx.scale(e, e);
  const len = petal.len, w = petal.width;
  const grad = ctx.createLinearGradient(0, 0, 0, -len);
  grad.addColorStop(0, palette[1]); grad.addColorStop(1, palette[2]);
  ctx.fillStyle = grad;
  ctx.shadowColor = palette[0]; ctx.shadowBlur = 8;
  ctx.beginPath(); ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-w * 0.55, -len * 0.25, -w * 0.65, -len * 0.65, 0, -len);
  ctx.bezierCurveTo(w * 0.65, -len * 0.65, w * 0.55, -len * 0.25, 0, 0);
  ctx.closePath(); ctx.fill(); ctx.restore();
}
function drawBaseDot(dot, e) {
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#2b1a0d';
  ctx.beginPath(); ctx.arc(dot.x, dot.y, dot.r * e, 0, Math.PI * 2); ctx.fill();
}
function drawGlowDot(dot, e, palette) {
  ctx.shadowColor = palette[2];
  ctx.shadowBlur = 10;
  ctx.fillStyle = '#fff4d9';
  ctx.beginPath(); ctx.arc(dot.x, dot.y, dot.r * e, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
}
function drawTitle(text, e, w, h) {
  ctx.save();
  ctx.globalAlpha = e;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.shadowColor = 'rgba(255,255,255,0.4)';
  ctx.shadowBlur = 10;
  const fontSize = Math.min(w * 0.05, 32);
  ctx.font = `italic 400 ${fontSize}px "Fraunces", serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(text, w / 2, h * 0.08);
  ctx.restore();
}

let garden = null, timeline = [], gStartTime = 0, gRafId = null;

function renderAt(elapsed) {
  const w = canvas.width / dpr, h = canvas.height / dpr;
  ctx.clearRect(0, 0, w, h);

  ctx.fillStyle = '#060a0f';
  ctx.fillRect(0, garden.h * 0.92, w, h * 0.1);

  let allDone = true;
  for (const it of timeline) {
    const t = Math.max(0, Math.min(1, (elapsed - it.delay) / it.duration));
    if (t < 1) allDone = false;
    if (t <= 0) continue;
    const e = it.ease(t);

    if (it.kind === 'grass') drawGrass(it.blade, e);
    else if (it.kind === 'stem') drawStem(it.seg, e);
    else if (it.kind === 'leaf') drawLeaf(it.leaf, e);
    else if (it.kind === 'petal') drawPetal(it.petal, e, garden.palette);
    else if (it.kind === 'dot') drawBaseDot(it.dot, e);
    else if (it.kind === 'glowDot') drawGlowDot(it.dot, e, garden.palette);
    else if (it.kind === 'title') drawTitle(it.text, e, w, h);
  }
  return allDone;
}

function frameLoop(now) {
  if (!gStartTime) gStartTime = now;
  const done = renderAt(now - gStartTime);
  if (!done) {
    gRafId = requestAnimationFrame(frameLoop);
  } else {
    canvas.classList.add('settled');
    // document.getElementById('ui-buttons').style.opacity = 1;
  }
}

export default function startGarden(nameStr, phrase) {
  if (!nameStr.trim()) return;
  document.getElementById('gate').style.display = 'none';
  document.getElementById('showImage').style.display = 'block'; 
  canvas.style.display = 'block';
  // document.getElementById('ui-buttons').style.opacity = 0;
  canvas.classList.remove('settled');

  document.fonts.ready.then(() => {
    resizeCanvas();
    const nameData = analyzeName(nameStr);
    garden = buildGarden(nameData, canvas.width / dpr, canvas.height / dpr);
    timeline = buildTimeline(garden, phrase);
    gStartTime = 0;
    if (gRafId) cancelAnimationFrame(gRafId);

    if (REDUCED) {
      const maxEnd = Math.max(...timeline.map(it => it.delay + it.duration));
      renderAt(maxEnd);
      canvas.classList.add('settled');
      // document.getElementById('ui-buttons').style.opacity = 1;
      return;
    }
    gRafId = requestAnimationFrame(frameLoop);
  });
}

