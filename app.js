const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const restartBtn = document.getElementById('restart');
const W = canvas.width, H = canvas.height;

let audioCtx = null;
function beep(freq, dur) {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq, audioCtx.currentTime);
    o.frequency.exponentialRampToValueAtTime(freq * 1.5, audioCtx.currentTime + dur);
    g.gain.setValueAtTime(0.08, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime + dur);
  } catch (e) {}
}

let best = 0;
let cat, cukes, keys, running, startTime, lastSpawn, spawnInterval, lastScream;
let stars = [];
let streaks = [];

function initDecor() {
  stars = [];
  for (let i = 0; i < 10; i++) {
    stars.push({
      x: Math.random() * W,
      y: Math.random() * H,
      s: 3 + Math.random() * 4,
      c: ['#8a94c8', '#c97b5a', '#e8e4d8', '#7fa89a'][Math.floor(Math.random() * 4)]
    });
  }
  streaks = [];
  for (let i = 0; i < 5; i++) {
    streaks.push({
      y: Math.random() * H,
      offset: Math.random() * 1000,
      amp: 20 + Math.random() * 30,
      speed: 0.3 + Math.random() * 0.4
    });
  }
}

function drawStar(x, y, s, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a1 = (Math.PI * 2 * i) / 5 - Math.PI / 2;
    const a2 = a1 + Math.PI / 5;
    ctx.lineTo(Math.cos(a1) * s, Math.sin(a1) * s);
    ctx.lineTo(Math.cos(a2) * s * 0.45, Math.sin(a2) * s * 0.45);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawBackground(t) {
  ctx.fillStyle = '#1a1d3a';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(154,160,201,0.15)';
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  for (const st of streaks) {
    ctx.beginPath();
    for (let x = -20; x <= W + 20; x += 10) {
      const y = st.y + Math.sin((x + t * st.speed + st.offset) * 0.01) * st.amp;
      if (x === -20) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  for (const s of stars) drawStar(s.x, s.y, s.s, s.c);
}

function reset() {
  cat = { x: W / 2, y: H / 2, r: 18, speed: 4 };
  cukes = [];
  keys = {};
  running = true;
  startTime = performance.now();
  lastSpawn = 0;
  spawnInterval = 1400;
  lastScream = 0;
  restartBtn.style.display = 'none';
  initDecor();
}

function spawnCuke() {
  const edge = Math.floor(Math.random() * 4);
  let x, y;
  if (edge === 0) { x = Math.random() * W; y = -20; }
  else if (edge === 1) { x = W + 20; y = Math.random() * H; }
  else if (edge === 2) { x = Math.random() * W; y = H + 20; }
  else { x = -20; y = Math.random() * H; }
  cukes.push({ x, y, r: 12 });
}

// pixel-art cat sprite, drawn on an 11x15 grid — bigger, pointier ears
const CAT_PIXELS = [
  ".X.......X.",
  "XX.......XX",
  "XX.......XX",
  ".XX.....XX.",
  ".XXX...XXX.",
  "XXXX...XXXX",
  "XXXXX.XXXXX",
  "XXXXXXXXXXX",
  "XXXOXXXOXXX",
  "XXOWXXXWOXX",
  "XXXXXXXXXXX",
  "-XXXXXXXXX-",
  "-XXXXXXXXX-",
  "-XXXXXXXXX-",
  "--XXXXXXX--",
  "--XXXXXXX--"
];

function drawCat(x, y, r, scared) {
  const cols = CAT_PIXELS[0].length;
  const rows = CAT_PIXELS.length;
  const px = (r * 2.2) / cols;
  ctx.save();
  ctx.translate(x - (cols * px) / 2, y - (rows * px) / 2);
  for (let ry = 0; ry < rows; ry++) {
    for (let rx = 0; rx < cols; rx++) {
      const c = CAT_PIXELS[ry][rx];
      if (c === '-') continue;
      let fill = '#111';
      if (c === 'O') fill = scared ? '#ffe14d' : '#e8e4d8';
      if (c === 'W') fill = '#111';
      ctx.fillStyle = fill;
      ctx.fillRect(rx * px, ry * px, px + 0.5, px + 0.5);
    }
  }
  if (scared) {
    ctx.strokeStyle = '#ffe14d';
    ctx.lineWidth = 1.5;
    const wx = cols * px * 0.15, wy = rows * px * 0.58;
    ctx.beginPath(); ctx.moveTo(wx - 10, wy - 3); ctx.lineTo(wx - 22, wy - 8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(wx - 10, wy + 2); ctx.lineTo(wx - 22, wy + 2); ctx.stroke();
    const wx2 = cols * px * 0.85;
    ctx.beginPath(); ctx.moveTo(wx2 + 10, wy - 3); ctx.lineTo(wx2 + 22, wy - 8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(wx2 + 10, wy + 2); ctx.lineTo(wx2 + 22, wy + 2); ctx.stroke();
  }
  ctx.restore();
}

function drawCuke(x, y, r) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#4a9b7f';
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.7, r * 1.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1d9e75';
  ctx.lineWidth = 1;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(-r * 0.6, i * r * 0.4);
    ctx.lineTo(r * 0.6, i * r * 0.4);
    ctx.stroke();
  }
  ctx.restore();
}

function nearestCukeDist() {
  let min = Infinity;
  for (const c of cukes) {
    const d = Math.hypot(c.x - cat.x, c.y - cat.y);
    if (d < min) min = d;
  }
  return min;
}

window.addEventListener('keydown', e => { keys[e.key.toLowerCase()] = true; });
window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

let dragging = false;
canvas.addEventListener('pointerdown', () => { dragging = true; });
canvas.addEventListener('pointerup', () => { dragging = false; });
canvas.addEventListener('pointermove', e => {
  if (!dragging || !running) return;
  const rect = canvas.getBoundingClientRect();
  cat.x = (e.clientX - rect.left) * (W / rect.width);
  cat.y = (e.clientY - rect.top) * (H / rect.height);
});

function loop(t) {
  if (!running) return;
  const elapsed = (t - startTime) / 1000;

  let dx = 0, dy = 0;
  if (keys['arrowleft'] || keys['a']) dx -= 1;
  if (keys['arrowright'] || keys['d']) dx += 1;
  if (keys['arrowup'] || keys['w']) dy -= 1;
  if (keys['arrowdown'] || keys['s']) dy += 1;
  const len = Math.hypot(dx, dy) || 1;
  cat.x += (dx / len) * cat.speed;
  cat.y += (dy / len) * cat.speed;
  cat.x = Math.max(cat.r, Math.min(W - cat.r, cat.x));
  cat.y = Math.max(cat.r, Math.min(H - cat.r, cat.y));

  spawnInterval = Math.max(280, 1400 - elapsed * 40);
  if (t - lastSpawn > spawnInterval) { spawnCuke(); lastSpawn = t; }

  const speedBoost = 1 + elapsed * 0.03;
  for (const c of cukes) {
    const ang = Math.atan2(cat.y - c.y, cat.x - c.x);
    c.x += Math.cos(ang) * 1.1 * speedBoost;
    c.y += Math.sin(ang) * 1.1 * speedBoost;
  }

  const dist = nearestCukeDist();
  if (dist < 90 && t - lastScream > Math.max(150, dist * 3)) {
    const pitch = 500 + (90 - Math.min(dist, 90)) * 8;
    beep(pitch, 0.12);
    lastScream = t;
  }

  for (const c of cukes) {
    if (Math.hypot(c.x - cat.x, c.y - cat.y) < c.r + cat.r * 0.7) {
      running = false;
      beep(180, 0.5);
      best = Math.max(best, Math.floor(elapsed * 10));
      bestEl.textContent = best;
      restartBtn.style.display = 'inline-block';
    }
  }

  drawBackground(t);
  for (const c of cukes) drawCuke(c.x, c.y, c.r);
  drawCat(cat.x, cat.y, cat.r, dist < 90);

  scoreEl.textContent = Math.floor(elapsed * 10);

  if (!running) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 46px Impact, "Arial Black", sans-serif';
    const gx = W / 2, gy = H / 2;
    const depth = 10;
    for (let i = depth; i > 0; i--) {
      ctx.fillStyle = `rgb(${20 + i}, ${22 + i}, ${45 + i})`;
      ctx.fillText('CUCUMBERED.', gx + i, gy + i);
    }
    ctx.fillStyle = '#f4f1e6';
    ctx.fillText('CUCUMBERED.', gx, gy);
    ctx.strokeStyle = '#1a1d3a';
    ctx.lineWidth = 2.5;
    ctx.strokeText('CUCUMBERED.', gx, gy);
    ctx.restore();
    return;
  }
  requestAnimationFrame(loop);
}

restartBtn.addEventListener('click', () => { reset(); requestAnimationFrame(loop); });

reset();
requestAnimationFrame(loop);