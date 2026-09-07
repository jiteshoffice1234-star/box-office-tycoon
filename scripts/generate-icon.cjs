// Generate Box Office Tycoon icons
// Creates valid PNGs directly using Node.js buffer operations - no dependencies needed
// Beach sunset version: procedurally renders a warm ocean/sunset palette

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const resDir = 'android/app/src/main/res';

// ---- Beach sunset procedural palette ----
// Sky gradient: warm amber → deep coral → dark indigo at horizon
// Ocean: deep teal → dark navy
// Sun: golden disc near horizon
// Sand: warm tan
// Gold filmstrip accents retained from the classic design

function sampleBeachColor(nx, ny) {
  // nx, ny in [0,1]. y=0 top (sky), y=1 bottom (sand/ocean)
  const y = ny;
  const x = nx;

  // Sky: amber at top → coral → deep indigo near horizon (y ~0.62)
  let r, g, b;
  if (y < 0.45) {
    // Upper sky: warm amber/pink
    const t = y / 0.45;
    r = Math.round(245 - t * 160);
    g = Math.round(208 - t * 130);
    b = Math.round(96 + t * 50);
  } else if (y < 0.68) {
    // Horizon band: coral/orange
    const t = (y - 0.45) / 0.23;
    r = Math.round(85 + t * 50);
    g = Math.round(78 - t * 30);
    b = Math.round(146 - t * 40);
  } else if (y < 0.72) {
    // Sun glow
    const t = (y - 0.68) / 0.04;
    const glow = Math.max(0, 1 - Math.abs(t - 0.5) * 2);
    r = 255;
    g = Math.round(220 - glow * 40);
    b = Math.round(60 - glow * 30);
  } else if (y < 0.82) {
    // Ocean upper: teal
    const t = (y - 0.72) / 0.10;
    r = Math.round(100 - t * 70);
    g = Math.round(120 + t * 40);
    b = Math.round(140 + t * 40);
  } else {
    // Deep ocean: navy
    const t = Math.min(1, (y - 0.82) / 0.18);
    r = Math.round(30 - t * 15);
    g = Math.round(160 - t * 60);
    b = Math.round(180 - t * 40);
  }
  return [r, g, b];
}

// Sun position (lower-right area)
function sunGlow(nx, ny) {
  const cx = 0.65;
  const cy = 0.69;
  const dx = nx - cx;
  const dy = ny - cy;
  const d = Math.sqrt(dx * dx + dy * dy);
  if (d > 0.18) return null;
  const intensity = Math.max(0, 1 - d / 0.18);
  return [255, Math.round(230 - intensity * 40), Math.round(80 - intensity * 30)];
}

// Wave pattern on ocean
function wave(nx, ny) {
  if (ny < 0.72 || ny > 1.0) return null;
  const waveY = 0.82 + 0.08 * Math.sin(nx * Math.PI * 3);
  const distFromWave = Math.abs(ny - waveY);
  if (distFromWave < 0.015) {
    return [Math.round(100 + 30 * Math.sin(nx * 20)), Math.round(150 + 20 * Math.sin(nx * 20)), Math.round(180)];
  }
  return null;
}

// Sand color
function sandColor(nx, ny) {
  if (ny <= 0.82) return null;
  const t = (ny - 0.82) / 0.18;
  const grain = Math.sin(nx * 40) * 0.05 + Math.sin(nx * 70) * 0.03;
  return [
    Math.round(194 + grain * 20),
    Math.round(178 + grain * 15),
    Math.round(128 + grain * 10),
  ];
}

function createPNG(width, height, pixelFunc) {
  const pixels = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixelFunc(x, y, width, height);
      const offset = (y * width + x) * 4;
      pixels[offset] = r;
      pixels[offset + 1] = g;
      pixels[offset + 2] = b;
      pixels[offset + 3] = a !== undefined ? a : 255;
    }
  }
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const ihdrChunk = makeChunk('IHDR', ihdr);
  const rawData = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    rawData[y * (1 + width * 4)] = 0;
    pixels.copy(rawData, y * (1 + width * 4) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const compressed = zlib.deflateSync(rawData, { level: 9 });
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));
  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeAndData = Buffer.concat([Buffer.from(type), data]);
  const crc = crc32(typeAndData);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc, 0);
  return Buffer.concat([len, typeAndData, crcBuf]);
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function dist(x1, y1, x2, y2) { return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2); }

function inStar(x, y, cx, cy, outerR, innerR) {
  const dx = x - cx, dy = y - cy, d = Math.sqrt(dx * dx + dy * dy);
  if (d > outerR || d < 2) return false;
  let angle = Math.atan2(-dy, dx) + Math.PI / 2;
  if (angle < 0) angle += Math.PI * 2;
  const sector = angle / (Math.PI * 2) * 5;
  const frac = sector - Math.floor(sector);
  const t = frac < 0.5 ? frac * 2 : (1 - frac) * 2;
  const threshold = innerR + (outerR - innerR) * t;
  return d <= threshold;
}

function lerp(a, b, t) { return Math.round(a + (b - a) * t); }
function colorLerp(c1, c2, t) { return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)]; }

const FILM_STRIP = [30, 35, 48];
const FILM_HOLE = [42, 48, 64];
const GOLD_LIGHT = [245, 208, 96];
const GOLD = [212, 168, 67];
const GOLD_DARK = [180, 140, 50];

// Generate launcher icon
function generateLauncherIcon(size) {
  const s = size;
  const r = s * 0.22;

  return createPNG(s, s, (x, y) => {
    const corners = [[r, r], [s - r, r], [r, s - r], [s - r, s - r]];
    let inside = true;
    for (const [cx, cy] of corners) {
      if ((x < cx || x > s - cx || y < cy || y > s - cy) && dist(x, y, cx, cy) > r) {
        inside = false; break;
      }
    }
    if (!inside) return [0, 0, 0, 0];

    const nx = x / s;
    const ny = y / s;

    // Beach/sunset background
    let color = sampleBeachColor(nx, ny);
    const glow = sunGlow(nx, ny);
    if (glow) color = glow;
    const w = wave(nx, ny);
    if (w) color = w;
    const sd = sandColor(nx, ny);
    if (sd) color = sd;

    // Gold border
    const borderW = s * 0.015;
    let onBorder = false;
    for (const [cx, cy] of corners) {
      if ((x < cx || x > s - cx || y < cy || y > s - cy)) {
        const d = dist(x, y, cx, cy);
        if (d >= r - borderW && d <= r) { onBorder = true; break; }
      }
    }
    if (onBorder) {
      const gt = y / s;
      return [...colorLerp(GOLD_LIGHT, GOLD_DARK, gt), 255];
    }

    // Inner border
    const innerBorder = s * 0.04;
    if (Math.abs(x - innerBorder) < 1 || Math.abs(x - (s - innerBorder)) < 1 ||
        Math.abs(y - innerBorder) < 1 || Math.abs(y - (s - innerBorder)) < 1) {
      return [40, 45, 60, 120];
    }

    // Film strip top (15% - 27%)
    const stripTop = s * 0.15;
    const stripBot = s * 0.27;
    const stripLeft = s * 0.1;
    const stripRight = s * 0.9;
    if (y >= stripTop && y <= stripBot && x >= stripLeft && x <= stripRight) {
      const holeW = s * 0.06, holeH = s * 0.07, holeSpacing = s * 0.1;
      const startY = stripTop + (s * 0.12 - holeH) / 2;
      for (let hx = stripLeft + s * 0.03; hx < stripRight; hx += holeSpacing) {
        if (x >= hx && x <= hx + holeW && y >= startY && y <= startY + holeH) return FILM_HOLE;
      }
      return FILM_STRIP;
    }

    // Film strip bottom (73% - 85%)
    const stripTop2 = s * 0.73;
    const stripBot2 = s * 0.85;
    if (y >= stripTop2 && y <= stripBot2 && x >= stripLeft && x <= stripRight) {
      const holeW = s * 0.06, holeH = s * 0.07, holeSpacing = s * 0.1;
      const startY = stripTop2 + (s * 0.12 - holeH) / 2;
      for (let hx = stripLeft + s * 0.03; hx < stripRight; hx += holeSpacing) {
        if (x >= hx && x <= hx + holeW && y >= startY && y <= startY + holeH) return FILM_HOLE;
      }
      return FILM_STRIP;
    }

    // Gold star in center
    const cx = s / 2;
    const cy = s * 0.44;
    const outerR = s * 0.22;
    const innerR = s * 0.085;
    if (inStar(x, y, cx, cy, outerR, innerR)) {
      const st = dist(x, y, cx, cy) / outerR;
      return [...colorLerp(GOLD_LIGHT, GOLD, st), 255];
    }

    // Dollar sign
    const dx2 = x - cx;
    const dy2 = y - cy;
    const dollarW = s * 0.06, dollarH = s * 0.14;
    if (Math.abs(dx2) < dollarW && Math.abs(dy2) < dollarH) {
      if (Math.abs(dx2) < s * 0.015) return [15, 18, 25, 255];
      const curveY1 = Math.abs(dy2 + s * 0.04);
      const curveY2 = Math.abs(dy2 - s * 0.04);
      if ((curveY1 < s * 0.02 && dx2 > 0) || (curveY2 < s * 0.02 && dx2 < 0)) return [15, 18, 25, 255];
    }

    return color;
  });
}

// Generate foreground icon
function generateForegroundIcon(size) {
  const s = size;
  return createPNG(s, s, (x, y) => {
    const stripTop = s * 0.15, stripBot = s * 0.27;
    const stripLeft = s * 0.12, stripRight = s * 0.88;
    if (y >= stripTop && y <= stripBot && x >= stripLeft && x <= stripRight) {
      const holeW = s * 0.05, holeH = s * 0.08, holeSpacing = s * 0.085;
      const startY = stripTop + (s * 0.12 - holeH) / 2;
      for (let hx = stripLeft + s * 0.02; hx < stripRight; hx += holeSpacing) {
        if (x >= hx && x <= hx + holeW && y >= startY && y <= startY + holeH) return [...FILM_HOLE, 255];
      }
      return [...FILM_STRIP, 255];
    }
    const stripTop2 = s * 0.70, stripBot2 = s * 0.82;
    if (y >= stripTop2 && y <= stripBot2 && x >= stripLeft && x <= stripRight) {
      const holeW = s * 0.05, holeH = s * 0.08, holeSpacing = s * 0.085;
      const startY = stripTop2 + (s * 0.12 - holeH) / 2;
      for (let hx = stripLeft + s * 0.02; hx < stripRight; hx += holeSpacing) {
        if (x >= hx && x <= hx + holeW && y >= startY && y <= startY + holeH) return [...FILM_HOLE, 255];
      }
      return [...FILM_STRIP, 255];
    }
    const cx = s / 2, cy = s * 0.44;
    const outerR = s * 0.20, innerR = s * 0.082;
    if (inStar(x, y, cx, cy, outerR, innerR)) {
      const st = dist(x, y, cx, cy) / outerR;
      return [...colorLerp(GOLD_LIGHT, GOLD, st), 255];
    }
    const dx2 = x - cx, dy2 = y - cy;
    const dollarW = s * 0.05, dollarH = s * 0.12;
    if (Math.abs(dx2) < dollarW && Math.abs(dy2) < dollarH) {
      if (Math.abs(dx2) < s * 0.012) return [0, 0, 0, 255];
      const curveY1 = Math.abs(dy2 + s * 0.035);
      const curveY2 = Math.abs(dy2 - s * 0.035);
      if ((curveY1 < s * 0.018 && dx2 > 0) || (curveY2 < s * 0.018 && dx2 < 0)) return [0, 0, 0, 255];
    }
    return [0, 0, 0, 0];
  });
}

// ---- Web favicon (multiple sizes) ----
function generateFavicon(size) {
  return generateLauncherIcon(size);
}

const mipmapSizes = { 'mipmap-mdpi': 48, 'mipmap-hdpi': 72, 'mipmap-xhdpi': 96, 'mipmap-xxhdpi': 144, 'mipmap-xxxhdpi': 192 };
const fgSizes = { 'mipmap-mdpi': 108, 'mipmap-hdpi': 162, 'mipmap-xhdpi': 216, 'mipmap-xxhdpi': 324, 'mipmap-xxxhdpi': 432 };
const faviconSizes = [16, 32, 48, 64, 180, 192];

console.log('Generating Box Office Tycoon icons (beach-sunset edition)...\n');

const dirs = [];

// Generate launcher icons
for (const [folder, size] of Object.entries(mipmapSizes)) {
  const dir = path.join(resDir, folder);
  fs.mkdirSync(dir, { recursive: true });
  const png = generateLauncherIcon(size);
  fs.writeFileSync(path.join(dir, 'ic_launcher.png'), png);
  fs.writeFileSync(path.join(dir, 'ic_launcher_round.png'), png);
  console.log(`  ${folder}/ic_launcher.png (${size}x${size}) - ${(png.length / 1024).toFixed(1)}KB`);
  dirs.push(dir);
}

// Generate foreground icons
for (const [folder, size] of Object.entries(fgSizes)) {
  const dir = path.join(resDir, folder);
  fs.mkdirSync(dir, { recursive: true });
  const png = generateForegroundIcon(size);
  fs.writeFileSync(path.join(dir, 'ic_launcher_foreground.png'), png);
  console.log(`  ${folder}/ic_launcher_foreground.png (${size}x${size})`);
}

// Colors XML
const colorsDir = path.join(resDir, 'values');
fs.mkdirSync(colorsDir, { recursive: true });
fs.writeFileSync(path.join(colorsDir, 'colors.xml'), `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#F5F0E6</color>
</resources>
`);
console.log('  values/colors.xml');

// Generate web favicons in the public/ directory (project root / public)
const publicDir = path.join(__dirname, '..', '..', 'public');
fs.mkdirSync(publicDir, { recursive: true });
for (const size of faviconSizes) {
  const png = generateFavicon(size);
  const ext = size === 192 ? 'png' : 'png';
  const name = size === 192 ? 'icon-192x192.png' : size === 180 ? 'icon-180x180.png' : `favicon-${size}x${size}.png`;
  fs.writeFileSync(path.join(publicDir, name), png);
  console.log(`  public/${name} (${size}x${size})`);
}

// Also write the main icon-512 and apple-touch-icon
const icon512 = generateLauncherIcon(512);
fs.writeFileSync(path.join(publicDir, 'icon-512x512.png'), icon512);
console.log(`  public/icon-512x512.png (512x512)`);

const appleTouch = generateLauncherIcon(180);
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleTouch);
console.log(`  public/apple-touch-icon.png (180x180)`);

// Safari pinned tab
const safariPinned = generateLauncherIcon(32);
fs.writeFileSync(path.join(publicDir, 'safari-pinned-tab.svg.png'), safariPinned);

console.log('\n  values/colors.xml');
console.log('\nAll icons generated! 🎬');
