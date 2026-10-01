const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, 'public', 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

const logoPath = path.join(__dirname, 'public', 'لوجو.jpg');
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

sizes.forEach(s => {
    const destPath = path.join(iconsDir, `icon-${s}x${s}.png`);
    fs.copyFileSync(logoPath, destPath);
    console.log(`Created: icon-${s}x${s}.png`);
});

console.log('\n✅ Icons ready in public/icons/');
