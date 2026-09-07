// Generate Box Office Tycoon icons — Fantasy Illustration Edition
// Theme: Girl reading book with dragon, colorful forest, deep purple/blue sky
// No external dependencies — pure Node.js PNG generation

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const resDir = 'android/app/src/main/res';

// ---- Color palette from the fantasy illustration ----
const SKY_TOP = [26, 10, 46];      // deep purple
const SKY_MID = [45, 27, 78];     // purple
const SKY_LOW = [30, 58, 95];     // blue
const SKY_BOT = [15, 25, 35];     // dark blue

const DRAGON_BODY = [255, 140, 66]; // orange
const DRAGON_DARK = [204, 68, 0];   // dark orange
const DRAGON_SPIKE = [255, 105, 180]; // pink
const DRAGON_EYE = [255, 255, 255];   // white
const DRAGON_PUPIL = [26, 10, 46];    // purple

const GIRL_HAIR = [74, 25, 66];    // dark purple
const GIRL_SKIN = [244, 199, 160]; // skin tone
const GIRL_SHIRT = [233, 30, 140]; // pink/magenta
const BOOK_COVER = [255, 192, 72]; // gold
const BOOK_PAGE = [255, 220, 150]; // cream

const LEAF_COLORS = [
  [255, 107, 53],  // orange
  [255, 71, 87],   // red
  [255, 192, 72],  // yellow
  [139, 92, 246],  // purple
  [255, 105, 180], // pink
  [255, 140, 66],  // orange
];

const GOLD_LIGHT = [245, 208, 96];
const GOLD = [212, 168, 67];
const FILM_STRIP = [30, 35, 48];
const FILM_HOLE = [42, 48, 64];

// ---- PNG generation ----
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
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
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
function lerp(a, b, t) { return Math.round(a + (b - a) * t); }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function colorLerp(c1, c2, t) {
  return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
}

// ---- Star shape ----
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

// ---- Fantasy scene color sampling ----
function fantasyColor(nx, ny, s) {
  // Sky gradient
  let color;
  if (ny < 0.35) {
    const t = ny / 0.35;
    color = colorLerp(SKY_TOP, SKY_MID, t);
  } else if (ny < 0.55) {
    const t = (ny - 0.35) / 0.2;
    color = colorLerp(SKY_MID, SKY_LOW, t);
  } else {
    const t = (ny - 0.55) / 0.45;
    color = colorLerp(SKY_LOW, SKY_BOT, t);
  }
  return color;
}

// Seeded random for deterministic foliage
function seededRandom(seed) {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// ---- Main icon generator ----
function generateIcon(size) {
  const s = size;
  const cx = s / 2;
  const cy = s / 2;

  return createPNG(s, s, (x, y, w, h) => {
    const nx = x / s;
    const ny = y / s;

    // Rounded corners
    const r = s * 0.18;
    const corners = [[r, r], [s - r, r], [r, s - r], [s - r, s - r]];
    let inside = true;
    for (const [ccx, ccy] of corners) {
      if ((x < ccx || x > s - ccx || y < ccy || y > s - ccy) && dist(x, y, ccx, ccy) > r) {
        inside = false; break;
      }
    }
    if (!inside) return [0, 0, 0, 0];

    // Background sky
    let color = fantasyColor(nx, ny, s);

    // Stars (small white dots)
    const starSeeds = [0.15, 0.12, 0.85, 0.08, 0.3, 0.25, 0.7, 0.18, 0.5, 0.1, 0.2, 0.35, 0.8, 0.3, 0.1, 0.45, 0.9, 0.15, 0.6, 0.22, 0.4, 0.05, 0.75, 0.28];
    for (let i = 0; i < starSeeds.length; i += 2) {
      const sx = starSeeds[i];
      const sy = starSeeds[i + 1];
      const d = dist(nx, ny, sx, sy);
      if (d < 0.012) {
        const intensity = clamp(1 - d / 0.012, 0, 1);
        color = lerpArray(color, [255, 255, 255], intensity * 0.6);
      }
    }

    // Colorful foliage at bottom (0.65 - 1.0)
    if (ny > 0.62) {
      for (let i = 0; i < 30; i++) {
        const seed = i * 7.31;
        const lx = seededRandom(seed) * 1.2 - 0.1;
        const ly = 0.68 + seededRandom(seed + 1) * 0.32;
        const leafR = (0.06 + seededRandom(seed + 2) * 0.1) * (s / 512);
        const d = dist(nx, ny, lx, ly);
        if (d < leafR) {
          const leafColor = LEAF_COLORS[i % LEAF_COLORS.length];
          const intensity = clamp(1 - d / leafR, 0, 1) * 0.75;
          color = lerpArray(color, leafColor, intensity);
        }
      }
    }

    // Dragon body (center-right, curved)
    const dragonCx = 0.62;
    const dragonCy = 0.32;
    const dragonD = dist(nx, ny, dragonCx, dragonCy);
    if (dragonD < 0.18) {
      // Body gradient
      const bodyIntensity = clamp(1 - dragonD / 0.18, 0, 1);
      const bodyColor = colorLerp(DRAGON_DARK, DRAGON_BODY, 1 - dragonD / 0.18);
      color = lerpArray(color, bodyColor, bodyIntensity * 0.85);

      // Spikes on top
      if (ny < dragonCy - 0.05 && ny > dragonCy - 0.18) {
        const spikePhase = Math.sin(nx * 40);
        if (spikePhase > 0.7) {
          color = lerpArray(color, DRAGON_SPIKE, 0.9);
        }
      }

      // Eye
      const eyeX = dragonCx - 0.06;
      const eyeY = dragonCy - 0.04;
      const eyeD = dist(nx, ny, eyeX, eyeY);
      if (eyeD < 0.025) {
        color = DRAGON_EYE;
      }
      if (eyeD < 0.012) {
        color = DRAGON_PUPIL;
      }
    }

    // Girl figure (center-left, lower)
    const girlCx = 0.38;
    const girlCy = 0.62;

    // Hair (dark purple sphere)
    const hairD = dist(nx, ny, girlCx, girlCy - 0.1);
    if (hairD < 0.1) {
      const intensity = clamp(1 - hairD / 0.1, 0, 1);
      color = lerpArray(color, GIRL_HAIR, intensity * 0.9);
    }

    // Face
    const faceD = dist(nx, ny, girlCx, girlCy - 0.06);
    if (faceD < 0.07) {
      const intensity = clamp(1 - faceD / 0.07, 0, 1);
      color = lerpArray(color, GIRL_SKIN, intensity * 0.9);
    }

    // Shirt (pink, below face)
    const shirtDx = nx - girlCx;
    const shirtDy = ny - (girlCy + 0.06);
    if (Math.abs(shirtDx) < 0.09 && shirtDy > -0.06 && shirtDy < 0.12) {
      const intensity = clamp(1 - Math.abs(shirtDx) / 0.09, 0, 1) * clamp(1 - Math.abs(shirtDy) / 0.12, 0, 1);
      color = lerpArray(color, GIRL_SHIRT, intensity * 0.85);
    }

    // Book (orange/yellow rectangle in front of girl)
    const bookX = girlCx - 0.08;
    const bookY = girlCy - 0.02;
    if (nx > bookX && nx < bookX + 0.16 && ny > bookY && ny < bookY + 0.1) {
      const intensity = 0.9;
      if (nx < bookX + 0.08) {
        color = lerpArray(color, BOOK_PAGE, intensity);
      } else {
        color = lerpArray(color, BOOK_COVER, intensity);
      }
    }

    // Gold film strip at top (12% - 22%)
    const stripTop = s * 0.08;
    const stripBot = s * 0.18;
    const stripLeft = s * 0.08;
    const stripRight = s * 0.92;
    if (y >= stripTop && y <= stripBot && x >= stripLeft && x <= stripRight) {
      const holeW = s * 0.05, holeH = s * 0.06, holeSpacing = s * 0.09;
      const startY = stripTop + (s * 0.1 - holeH) / 2;
      for (let hx = stripLeft + s * 0.02; hx < stripRight; hx += holeSpacing) {
        if (x >= hx && x <= hx + holeW && y >= startY && y <= startY + holeH) {
          return [...FILM_HOLE, 255];
        }
      }
      return [...FILM_STRIP, 255];
    }

    // Title bar at bottom (82% - 100%)
    const titleTop = s * 0.82;
    if (y >= titleTop) {
      // Dark overlay
      const titleAlpha = clamp((y - titleTop) / (s * 0.05), 0, 0.85);
      color = lerpArray(color, [15, 10, 25], titleAlpha);

      // Title text area
      if (y > titleTop + s * 0.03 && y < s * 0.95) {
        // "BOX OFFICE" line
        const textY = titleTop + s * 0.04;
        const textY2 = s * 0.92;
        if (Math.abs(ny - textY / s) < 0.015 || Math.abs(ny - textY2 / s) < 0.015) {
          // Simple text simulation - horizontal lines
          const textLeft = 0.25;
          const textRight = 0.75;
          if (nx > textLeft && nx < textRight) {
            const letterPhase = Math.sin(nx * 60);
            if (letterPhase > 0.3) {
              return [...GOLD_LIGHT, 255];
            }
          }
        }
      }
    }

    // Gold border around icon
    const borderWidth = s * 0.012;
    for (const [ccx, ccy] of corners) {
      if ((x < ccx || x > s - ccx || y < ccy || y > s - ccy)) {
        const d = dist(x, y, ccx, ccy);
        if (d >= r - borderWidth && d <= r) {
          return [...GOLD, 255];
        }
      }
    }

    return [...color, 255];
  });
}

function lerpArray(a, b, t) {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

// ---- Generate all icon sizes ----
const mipmapSizes = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

const fgSizes = {
  'mipmap-mdpi': 108,
  'mipmap-hdpi': 162,
  'mipmap-xhdpi': 216,
  'mipmap-xxhdpi': 324,
  'mipmap-xxxhdpi': 432,
};

console.log('Generating fantasy-themed Box Office Tycoon icons...\n');

// Generate launcher icons
for (const [folder, size] of Object.entries(mipmapSizes)) {
  const dir = path.join(resDir, folder);
  fs.mkdirSync(dir, { recursive: true });
  const png = generateIcon(size);
  fs.writeFileSync(path.join(dir, 'ic_launcher.png'), png);
  fs.writeFileSync(path.join(dir, 'ic_launcher_round.png'), png);
  console.log(`  ${folder}/ic_launcher.png (${size}x${size}) - ${(png.length / 1024).toFixed(1)}KB`);
}

// Generate foreground icons for adaptive
for (const [folder, size] of Object.entries(fgSizes)) {
  const dir = path.join(resDir, folder);
  fs.mkdirSync(dir, { recursive: true });
  const png = generateIcon(size);
  fs.writeFileSync(path.join(dir, 'ic_launcher_foreground.png'), png);
  console.log(`  ${folder}/ic_launcher_foreground.png (${size}x${size})`);
}

// Colors XML
const colorsDir = path.join(resDir, 'values');
fs.mkdirSync(colorsDir, { recursive: true });
fs.writeFileSync(path.join(colorsDir, 'colors.xml'), `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#1a0a2e</color>
</resources>
`);
console.log('  values/colors.xml');

// Web favicons
const publicDir = path.join(__dirname, '..', '..', 'public');
fs.mkdirSync(publicDir, { recursive: true });
const faviconSizes = [16, 32, 48, 64, 180, 192];
for (const size of faviconSizes) {
  const png = generateIcon(size);
  const name = size === 192 ? 'icon-192x192.png' : size === 180 ? 'apple-touch-icon.png' : `favicon-${size}x${size}.png`;
  fs.writeFileSync(path.join(publicDir, name), png);
  console.log(`  public/${name} (${size}x${size})`);
}

const icon512 = generateIcon(512);
fs.writeFileSync(path.join(publicDir, 'icon-512x512.png'), icon512);
console.log('  public/icon-512x512.png (512x512)');

console.log('\nAll fantasy-themed icons generated! 🧙‍♀️🐉');
