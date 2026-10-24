const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

function crc32(buf) {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }
  let crc = 0 ^ -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeAndData = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([len, typeAndData, crc]);
}

function generateShieldPng(size) {
  const width = size;
  const height = size;
  const rows = [];

  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 4);
    row[0] = 0; // Filter type 0 (None)

    const ny = (y / (height - 1)) * 2 - 1; // -1 (top) to 1 (bottom)
    for (let x = 0; x < width; x++) {
      const nx = (x / (width - 1)) * 2 - 1; // -1 (left) to 1 (right)
      const offset = 1 + x * 4;

      // Shield boundary
      const inShieldTop = ny >= -0.85 && ny <= 0.05 && Math.abs(nx) <= 0.78;
      const inShieldBottom =
        ny > 0.05 &&
        ny <= 0.9 &&
        Math.abs(nx) <= 0.78 * (1 - Math.pow((ny - 0.05) / 0.85, 1.4));
      const inShield =
        (inShieldTop || inShieldBottom) && !(ny < -0.7 && Math.abs(nx) > 0.65);

      // Inner shield
      const inInnerTop = ny >= -0.72 && ny <= 0.02 && Math.abs(nx) <= 0.62;
      const inInnerBottom =
        ny > 0.02 &&
        ny <= 0.78 &&
        Math.abs(nx) <= 0.62 * (1 - Math.pow((ny - 0.02) / 0.76, 1.4));
      const inInner = inInnerTop || inInnerBottom;

      // Emblem (keyhole / lock / star center)
      const isCore =
        Math.hypot(nx, ny - -0.18) <= 0.22 ||
        (Math.abs(nx) <= 0.12 && ny >= -0.18 && ny <= 0.35);

      if (inInner) {
        if (isCore) {
          // White emblem
          row[offset] = 255;
          row[offset + 1] = 255;
          row[offset + 2] = 255;
          row[offset + 3] = 255;
        } else {
          // Emerald green #10b981
          row[offset] = 16;
          row[offset + 1] = 185;
          row[offset + 2] = 129;
          row[offset + 3] = 255;
        }
      } else if (inShield) {
        // Deep teal border #047857
        row[offset] = 4;
        row[offset + 1] = 120;
        row[offset + 2] = 87;
        row[offset + 3] = 255;
      } else {
        // Transparent
        row[offset] = 0;
        row[offset + 1] = 0;
        row[offset + 2] = 0;
        row[offset + 3] = 0;
      }
    }
    rows.push(row);
  }

  const rawData = Buffer.concat(rows);
  const compressedData = zlib.deflateSync(rawData);

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // Bit depth
  header[9] = 6; // Color type: RGBA
  header[10] = 0; // Compression method
  header[11] = 0; // Filter method
  header[12] = 0; // Interlace method

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = makeChunk('IHDR', header);
  const idat = makeChunk('IDAT', compressedData);
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdr, idat, iend]);
}

[16, 48, 128].forEach((size) => {
  const buf = generateShieldPng(size);
  const target = path.join(
    __dirname,
    '..',
    'assets',
    'icons',
    `icon${size}.png`,
  );
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, buf);
  console.log(`Generated icon${size}.png (${buf.length} bytes)`);
});
