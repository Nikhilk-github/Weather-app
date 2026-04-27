// ══════════════════════════════════════════════
//  WEATHER APP — PREMIUM CANVAS ANIMATION ENGINE
// ══════════════════════════════════════════════

const api = {
  key: "fcc8de7015bbb202209bbf0261babf4c",
  base: "https://api.openweathermap.org/data/2.5/"
};

// ── SEARCH ──
const searchbox = document.querySelector('.search-box');
searchbox.addEventListener('keypress', (evt) => {
  if (evt.keyCode === 13) getResults(searchbox.value.trim());
});

function getResults(query) {
  if (!query) return;
  fetch(`${api.base}weather?q=${query}&units=metric&APPID=${api.key}`)
    .then(res => res.json())
    .then(displayResults)
    .catch(() => console.warn("City not found or API error."));
}

// Weather emoji map
const weatherEmoji = {
  Clear: '☀️',
  Clouds: '⛅',
  Rain: '🌧️',
  Drizzle: '🌦️',
  Thunderstorm: '⛈️',
  Snow: '❄️',
  Mist: '🌫️',
  Fog: '🌫️',
  Haze: '🌫️',
  Smoke: '🌫️',
  Dust: '🌪️',
  Sand: '🌪️',
  Tornado: '🌪️',
};

function displayResults(weather) {
  if (!weather || weather.cod === '404') {
    console.warn("City not found");
    return;
  }

  document.querySelector('.location .city').innerText =
    `${weather.name}, ${weather.sys.country}`;

  document.querySelector('.location .date').innerText =
    dateBuilder(new Date());

  document.querySelector('.current .temp').innerHTML =
    `${Math.round(weather.main.temp)}<span>°c</span>`;

  const condition = weather.weather[0].main;
  const emoji = weatherEmoji[condition] || '🌡️';

  document.querySelector('.weather-emoji').innerText = emoji;
  document.querySelector('.weather-text').innerText = weather.weather[0].description
    .split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  document.querySelector('.hi-low').innerText =
    `${Math.round(weather.main.temp_min)}°c  /  ${Math.round(weather.main.temp_max)}°c`;

  setWeatherAnimation(condition);

  // Re-trigger entrance animations
  const temp = document.querySelector('.current .temp');
  temp.style.animation = 'none';
  temp.offsetHeight; // reflow
  temp.style.animation = '';
}

function dateBuilder(d) {
  const months = ["January","February","March","April","May","June",
    "July","August","September","October","November","December"];
  const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

// ══════════════════════════════════════════════
//  CANVAS ENGINE
// ══════════════════════════════════════════════

const canvas = document.getElementById("weatherCanvas");
const ctx = canvas.getContext("2d");

let W = canvas.width  = window.innerWidth;
let H = canvas.height = window.innerHeight;

window.addEventListener("resize", () => {
  W = canvas.width  = window.innerWidth;
  H = canvas.height = window.innerHeight;
});

let mouseX = W / 2;
window.addEventListener("mousemove", e => { mouseX = e.clientX; });

// ── STATE ──
let currentType = "default";
let particles   = [];
let stars       = [];
let clouds      = [];
let lightningTimer = 0;
let lightningActive = false;
let lightningAlpha  = 0;
let lightningBolt   = [];

// ── STARS (always visible in dark sky) ──
function initStars(count = 90) {
  stars = Array.from({ length: count }, () => ({
    x: Math.random() * W,
    y: Math.random() * H * 0.7,
    r: Math.random() * 1.5 + 0.3,
    phase: Math.random() * Math.PI * 2,
    speed: Math.random() * 0.5 + 0.2,
    brightness: Math.random(),
  }));
}

// ── CLOUDS ──
function initClouds(count = 5) {
  clouds = Array.from({ length: count }, () => createCloud());
}

function createCloud(offscreen = false) {
  return {
    x: offscreen ? -300 : Math.random() * (W + 400) - 200,
    y: Math.random() * H * 0.45,
    speed: Math.random() * 0.35 + 0.1,
    scale: Math.random() * 0.7 + 0.5,
    alpha: Math.random() * 0.25 + 0.07,
  };
}

// ── PARTICLES ──
function spawnParticles(count, factory) {
  particles = Array.from({ length: count }, factory);
}

// Rain drop
function makeRain() {
  const angle = 0.3; // slight slant
  const speed = Math.random() * 10 + 12;
  return {
    x: Math.random() * (W + 200) - 100,
    y: Math.random() * H - H,
    speedX: Math.sin(angle) * speed,
    speedY: Math.cos(angle) * speed,
    length: Math.random() * 18 + 10,
    alpha: Math.random() * 0.4 + 0.3,
    width: Math.random() * 0.8 + 0.4,
  };
}

// Heavy rain
function makeHeavyRain() {
  const p = makeRain();
  p.speedY *= 1.5;
  p.length *= 1.4;
  p.alpha *= 0.85;
  return p;
}

// Snow flake
function makeSnow() {
  return {
    x: Math.random() * W,
    y: Math.random() * H - H * 0.2,
    r: Math.random() * 4 + 1.5,
    speedY: Math.random() * 1.5 + 0.5,
    drift: Math.random() * Math.PI * 2,
    driftAmp: Math.random() * 1.2 + 0.3,
    driftSpeed: Math.random() * 0.02 + 0.008,
    alpha: Math.random() * 0.5 + 0.5,
    sparkle: Math.random() > 0.7,
  };
}

// Mist particle
function makeMist() {
  return {
    x: Math.random() * W,
    y: Math.random() * H,
    r: Math.random() * 100 + 60,
    speedX: Math.random() * 0.4 - 0.2,
    alpha: Math.random() * 0.07 + 0.02,
    phase: Math.random() * Math.PI * 2,
  };
}

// Sun ray
function makeSunRay(i, total) {
  return {
    angle: (i / total) * Math.PI * 2,
    len: Math.random() * 120 + 80,
    width: Math.random() * 3 + 1,
    alpha: Math.random() * 0.12 + 0.04,
    speed: Math.random() * 0.002 + 0.001,
  };
}

// Cloud wisp (Clouds type)
function makeWisp() {
  return {
    x: Math.random() * W,
    y: Math.random() * H * 0.7,
    r: Math.random() * 80 + 40,
    speedX: Math.random() * 0.3 + 0.05,
    alpha: Math.random() * 0.12 + 0.03,
    phase: Math.random() * Math.PI * 2,
  };
}

// ── LIGHTNING BOLT GENERATOR ──
function generateBolt(x1, y1, x2, y2, roughness, depth) {
  if (depth <= 0 || Math.abs(y2 - y1) < 10) {
    return [[x1, y1], [x2, y2]];
  }
  const mx = (x1 + x2) / 2 + (Math.random() - 0.5) * roughness;
  const my = (y1 + y2) / 2;
  const left  = generateBolt(x1, y1, mx, my, roughness * 0.6, depth - 1);
  const right = generateBolt(mx, my, x2, y2, roughness * 0.6, depth - 1);
  return [...left, ...right];
}

function triggerLightning() {
  const startX = W * (0.2 + Math.random() * 0.6);
  lightningBolt = generateBolt(startX, 0, startX + (Math.random()-0.5)*200, H * 0.7, 120, 6);
  lightningActive = true;
  lightningAlpha  = 1;

  // Flash the body bg
  document.body.style.transition = 'background 0.05s';
  document.body.style.background = 'rgba(200,220,255,0.25)';
  setTimeout(() => { document.body.style.background = ''; document.body.style.transition = ''; }, 80);
}

// ── SET WEATHER TYPE ──
function setWeatherAnimation(condition) {
  const c = condition.toLowerCase();
  currentType = c;

  // Update body class
  document.body.className = '';
  if (c.includes('clear'))       document.body.classList.add('clear');
  else if (c.includes('cloud'))  document.body.classList.add('clouds');
  else if (c.includes('rain'))   document.body.classList.add('rain');
  else if (c.includes('drizzle'))document.body.classList.add('drizzle');
  else if (c.includes('snow'))   document.body.classList.add('snow');
  else if (c.includes('thunder'))document.body.classList.add('thunderstorm');
  else if (c.includes('mist') || c.includes('fog') || c.includes('haze'))
    document.body.classList.add('mist');

  particles = [];
  clouds = [];

  if (c.includes('thunderstorm')) {
    spawnParticles(220, makeHeavyRain);
    lightningTimer = 0;
  } else if (c.includes('rain')) {
    spawnParticles(160, makeRain);
  } else if (c.includes('drizzle')) {
    spawnParticles(80, makeRain);
  } else if (c.includes('snow')) {
    spawnParticles(120, makeSnow);
  } else if (c.includes('mist') || c.includes('fog') || c.includes('haze')) {
    spawnParticles(30, makeMist);
  } else if (c.includes('cloud')) {
    spawnParticles(18, makeWisp);
    initClouds(6);
  } else if (c.includes('clear')) {
    const sunRayCount = 24;
    particles = Array.from({ length: sunRayCount }, (_, i) => makeSunRay(i, sunRayCount));
  }
}

// ── SUN POSITION ──
let sunPulse = 0;

// ── DRAW FUNCTIONS ──

function drawStars(t) {
  const showStars = ['thunderstorm','rain','drizzle','default','clear'].some(k => currentType.includes(k));
  if (!showStars) return;
  stars.forEach(s => {
    const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * s.speed + s.phase));
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r * tw, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${0.3 + 0.6 * tw})`;
    ctx.fill();
  });
}

function drawClouds() {
  clouds.forEach(c => {
    drawCloudShape(c.x, c.y, c.scale, c.alpha);
    c.x += c.speed;
    if (c.x > W + 300) Object.assign(c, createCloud(true));
  });
}

function drawCloudShape(cx, cy, scale, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#fff';
  const blobs = [
    [0,   0,   50 * scale],
    [-45 * scale, 15 * scale, 40 * scale],
    [45 * scale,  10 * scale, 42 * scale],
    [-20 * scale, 10 * scale, 48 * scale],
    [20 * scale,  12 * scale, 46 * scale],
  ];
  blobs.forEach(([ox, oy, r]) => {
    ctx.beginPath();
    ctx.arc(cx + ox, cy + oy, r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function drawRain() {
  ctx.strokeStyle = 'rgba(170,210,255,0.55)';
  particles.forEach(p => {
    const drift = (mouseX - W / 2) * 0.0008;
    p.x += p.speedX + drift;
    p.y += p.speedY;
    if (p.y > H + 20) {
      p.y = -20;
      p.x = Math.random() * (W + 200) - 100;
    }
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.lineWidth = p.width;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + p.speedX * 0.6, p.y + p.length);
    ctx.stroke();
    ctx.restore();
  });
}

function drawSnow(t) {
  particles.forEach(p => {
    p.drift += p.driftSpeed;
    p.x += Math.sin(p.drift) * p.driftAmp + (mouseX - W/2) * 0.0003;
    p.y += p.speedY;
    if (p.y > H + 10) { p.y = -10; p.x = Math.random() * W; }
    if (p.x > W + 10)  p.x = -10;
    if (p.x < -10)     p.x = W + 10;

    ctx.save();
    ctx.globalAlpha = p.alpha * (0.8 + 0.2 * Math.sin(t * 2 + p.drift));
    if (p.sparkle) {
      // sparkle cross
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = p.r * 0.4;
      ctx.beginPath();
      ctx.moveTo(p.x - p.r, p.y); ctx.lineTo(p.x + p.r, p.y);
      ctx.moveTo(p.x, p.y - p.r); ctx.lineTo(p.x, p.y + p.r);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#d8eeff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  });
}

function drawMist(t) {
  particles.forEach(p => {
    p.x += p.speedX;
    if (p.x > W + p.r) p.x = -p.r;
    const a = p.alpha * (0.7 + 0.3 * Math.sin(t * 0.4 + p.phase));
    const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
    grad.addColorStop(0, `rgba(200,210,220,${a})`);
    grad.addColorStop(1, 'rgba(200,210,220,0)');
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
  });
}

function drawSun(t) {
  sunPulse = t;
  const sx = W * 0.75;
  const sy = H * 0.18;
  const cr = 55;

  // Outer glow rings
  for (let i = 3; i >= 1; i--) {
    const glowR = cr + i * 28 + Math.sin(t * 0.8) * 6;
    const alpha = (0.04 + 0.02 * Math.sin(t * 0.5)) / i;
    const grad = ctx.createRadialGradient(sx, sy, cr, sx, sy, glowR);
    grad.addColorStop(0, `rgba(255,210,60,${alpha * 3})`);
    grad.addColorStop(1, 'rgba(255,140,0,0)');
    ctx.beginPath();
    ctx.arc(sx, sy, glowR, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
  }

  // Sun disc
  const discGrad = ctx.createRadialGradient(sx - 8, sy - 8, 5, sx, sy, cr);
  discGrad.addColorStop(0, '#fff7a0');
  discGrad.addColorStop(0.5, '#ffd030');
  discGrad.addColorStop(1, '#ff8c00');
  ctx.beginPath();
  ctx.arc(sx, sy, cr, 0, Math.PI * 2);
  ctx.fillStyle = discGrad;
  ctx.fill();

  // Rotating rays
  particles.forEach(ray => {
    ray.angle += ray.speed;
    const rx = sx + Math.cos(ray.angle) * (cr + 8);
    const ry = sy + Math.sin(ray.angle) * (cr + 8);
    const ex = sx + Math.cos(ray.angle) * (cr + 8 + ray.len);
    const ey = sy + Math.sin(ray.angle) * (cr + 8 + ray.len);
    const a = ray.alpha * (0.6 + 0.4 * Math.abs(Math.sin(t * 0.5 + ray.angle)));
    ctx.save();
    ctx.globalAlpha = a;
    ctx.strokeStyle = '#ffd030';
    ctx.lineWidth = ray.width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(rx, ry);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.restore();
  });
}

function drawWisps(t) {
  particles.forEach(p => {
    p.x += p.speedX;
    if (p.x > W + p.r) p.x = -p.r;
    const a = p.alpha * (0.5 + 0.5 * Math.sin(t * 0.3 + p.phase));
    const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
    grad.addColorStop(0, `rgba(255,255,255,${a})`);
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
  });
}

function drawLightning(t) {
  lightningTimer++;

  // Random lightning trigger: every ~3-6 seconds
  if (lightningTimer > 60 * (3 + Math.random() * 3)) {
    triggerLightning();
    lightningTimer = 0;
  }

  if (lightningActive) {
    // Draw bolt
    ctx.save();
    ctx.globalAlpha = lightningAlpha;
    ctx.shadowBlur = 30;
    ctx.shadowColor = '#a0d0ff';
    ctx.strokeStyle = '#e0f0ff';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    lightningBolt.forEach(([px, py], i) => {
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();

    // Core white
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    lightningAlpha -= 0.08;
    if (lightningAlpha <= 0) {
      lightningActive = false;
      lightningAlpha  = 0;
    }
  }
}

// ── AURORA LAYER (default/night sky) ──
let auroraT = 0;
function drawAurora(t) {
  if (!['default','clear'].some(k => currentType === k || currentType.includes('clear'))) return;
  auroraT = t;
  ctx.save();
  ctx.globalAlpha = 0.07 + 0.04 * Math.sin(t * 0.3);
  const colors = ['rgba(0,229,255,1)', 'rgba(120,80,255,1)', 'rgba(0,255,150,1)'];
  for (let i = 0; i < 3; i++) {
    const grad = ctx.createLinearGradient(0, 0, W, H * 0.6);
    grad.addColorStop(0, 'transparent');
    grad.addColorStop(0.3 + 0.1 * i, colors[i]);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H * 0.55);
  }
  ctx.restore();
}

// ── MAIN LOOP ──
let frame = 0;
function animate() {
  requestAnimationFrame(animate);
  ctx.clearRect(0, 0, W, H);
  const t = frame * 0.016;
  frame++;

  drawAurora(t);
  drawStars(t);

  const c = currentType;

  if (c.includes('thunderstorm')) {
    drawRain();
    drawClouds();
    drawLightning(t);
  } else if (c.includes('rain')) {
    drawRain();
    drawClouds();
  } else if (c.includes('drizzle')) {
    drawRain();
  } else if (c.includes('snow')) {
    drawSnow(t);
  } else if (c.includes('mist') || c.includes('fog') || c.includes('haze')) {
    drawMist(t);
  } else if (c.includes('cloud')) {
    drawWisps(t);
    drawClouds();
  } else if (c.includes('clear')) {
    drawSun(t);
  }
}

// ── BOOT ──
initStars(100);
initClouds(4);
animate();
getResults("Dehradun");
