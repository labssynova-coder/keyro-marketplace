const fs = require('fs');
const path = require('path');
const env = require('../config/env');

async function downloadExternalImage(url) {
  if (!url || !url.startsWith('http')) return null;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'fr-FR,fr;q=0.9',
        'Accept': 'image/*'
      }
    });

    if (!response.ok) return null;

    const contentType = response.headers.get('content-type') || '';
    let ext = '.jpg';
    if (contentType.includes('png')) ext = '.png';
    else if (contentType.includes('webp')) ext = '.webp';
    else if (contentType.includes('jpeg')) ext = '.jpg';

    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    const uploadDir = path.join(__dirname, '..', '..', env.uploadDir);

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, filename);
    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    return `/img/products/${filename}`;
  } catch (err) {
    console.error('Failed to download image:', url, err.message);
    return null;
  }
}

module.exports = { downloadExternalImage };