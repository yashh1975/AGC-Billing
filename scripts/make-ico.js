const fs = require('fs');
const path = require('path');

const pngPath = path.join(__dirname, '..', 'assets', 'logo', 'agc-logo.png');
const buildDir = path.join(__dirname, '..', 'build');
const icoPath = path.join(buildDir, 'icon.ico');

if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

const pngBuffer = fs.readFileSync(pngPath);

// Create 22-byte ICO header for 256x256 PNG
const header = Buffer.alloc(22);
header.writeUInt16LE(0, 0); // Reserved
header.writeUInt16LE(1, 2); // Type 1 = ICO
header.writeUInt16LE(1, 4); // Count = 1 image

header.writeUInt8(0, 6); // Width (0 means 256)
header.writeUInt8(0, 7); // Height (0 means 256)
header.writeUInt8(0, 8); // Color palette
header.writeUInt8(0, 9); // Reserved
header.writeUInt16LE(1, 10); // Color planes
header.writeUInt16LE(32, 12); // Bits per pixel
header.writeUInt32LE(pngBuffer.length, 14); // Image data size in bytes
header.writeUInt32LE(22, 18); // Offset to image data

const icoBuffer = Buffer.concat([header, pngBuffer]);
fs.writeFileSync(icoPath, icoBuffer);
console.log('Successfully generated build/icon.ico with size:', icoBuffer.length);
