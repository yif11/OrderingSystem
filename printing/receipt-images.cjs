const fs = require('node:fs');
const path = require('node:path');
const { PNG } = require('pngjs');

const imageCache = new Map();
const defaultDirectory = path.join(__dirname, '..', 'public');

// Flatten transparency onto white paper, then preserve solid ink when scaling.
// Threshold before scaling so the QR's lighter orange dots also print in black.
function prepareReceiptImage(data, { maxWidth = 384, crop = false } = {}) {
    const source = PNG.sync.read(data);
    const ink = new Uint8Array(source.width * source.height);
    let left = source.width, top = source.height, right = -1, bottom = -1;
    for (let y = 0; y < source.height; y++) {
        for (let x = 0; x < source.width; x++) {
            const pixel = y * source.width + x;
            const offset = pixel * 4;
            const alpha = source.data[offset + 3] / 255;
            const gray = (source.data[offset] * .299 + source.data[offset + 1] * .587 + source.data[offset + 2] * .114) * alpha + 255 * (1 - alpha);
            if (gray < 200) {
                ink[pixel] = 1;
                if (crop) {
                    left = Math.min(left, x); top = Math.min(top, y);
                    right = Math.max(right, x); bottom = Math.max(bottom, y);
                }
            }
        }
    }
    if (!crop || right < left) {
        left = 0; top = 0; right = source.width - 1; bottom = source.height - 1;
    }
    const sourceWidth = right - left + 1, sourceHeight = bottom - top + 1;
    const width = Math.min(maxWidth, sourceWidth);
    const height = Math.max(1, Math.round(sourceHeight * width / sourceWidth));
    const image = new PNG({ width, height });
    const scaleX = sourceWidth / width, scaleY = sourceHeight / height;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const x0 = left + x * scaleX, x1 = left + (x + 1) * scaleX;
            const y0 = top + y * scaleY, y1 = top + (y + 1) * scaleY;
            let coverage = 0;
            for (let sy = Math.floor(y0); sy < Math.min(Math.ceil(y1), source.height); sy++) {
                const weightY = Math.min(y1, sy + 1) - Math.max(y0, sy);
                for (let sx = Math.floor(x0); sx < Math.min(Math.ceil(x1), source.width); sx++) {
                    coverage += ink[sy * source.width + sx] * weightY * (Math.min(x1, sx + 1) - Math.max(x0, sx));
                }
            }
            const offset = (y * width + x) * 4;
            const shade = coverage >= scaleX * scaleY / 2 ? 0 : 255;
            image.data.fill(shade, offset, offset + 3);
            image.data[offset + 3] = 255;
        }
    }
    return PNG.sync.write(image);
}

function loadReceiptImages(directory = defaultDirectory) {
    const images = {};
    for (const name of ['logo', 'qr']) {
        const filename = path.join(directory, `${name}.png`);
        try {
            const stat = fs.statSync(filename);
            const signature = `${stat.mtimeMs}:${stat.size}`;
            const cached = imageCache.get(filename);
            if (cached?.signature === signature) images[name] = cached.image;
            else {
                const image = prepareReceiptImage(fs.readFileSync(filename), { maxWidth: name === 'logo' ? 360 : 384, crop: name === 'logo' }).toString('base64');
                imageCache.set(filename, { signature, image });
                images[name] = image;
            }
        } catch (error) {
            throw new Error(`レシート画像 ${name}.png を読み込めませんでした: ${error.message}`, { cause: error });
        }
    }
    return images;
}

module.exports = { prepareReceiptImage, loadReceiptImages };
