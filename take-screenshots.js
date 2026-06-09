/**
 * Screenshot generator for Keyro marketplace demos.
 * Uses Playwright to capture screenshots of the live GitHub Pages demos.
 *
 * Usage:
 *   node take-screenshots.js
 *
 * Requires: npm install playwright
 */

const { chromium } = require('playwright');
const path = require('path');

const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');
const BASE_URL = 'https://labssynova-coder.github.io/keyro-marketplace';

const ADMIN_SECTIONS = [
  { label: 'dashboard', selector: 'text=Tableau de bord', file: 'admin-dashboard.png' },
  { label: 'products',  selector: 'text=Produits',         file: 'admin-products.png' },
  { label: 'orders',    selector: 'text=Commandes',        file: 'admin-orders.png' },
  { label: 'users',     selector: 'text=Utilisateurs',     file: 'admin-users.png' },
  { label: 'reviews',   selector: 'text=Avis',            file: 'admin-reviews.png' },
  { label: 'keys',      selector: 'text=Clés',            file: 'admin-keys.png' },
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 2,
  });

  // --- Frontend page ---
  console.log('📸 Capturing frontend storefront...');
  const frontendPage = await context.newPage();
  await frontendPage.goto(BASE_URL + '/', { waitUntil: 'networkidle', timeout: 60000 });

  // Wait for images to load, then scroll to trigger lazy loading
  await frontendPage.waitForTimeout(5000);
  await frontendPage.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 300;
      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= document.body.scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 200);
    });
  });
  await frontendPage.evaluate(() => window.scrollTo(0, 0));
  await frontendPage.waitForTimeout(1000);

  await frontendPage.screenshot({
    path: path.join(SCREENSHOTS_DIR, 'frontend.png'),
    fullPage: true,
  });
  console.log('  ✓ screenshots/frontend.png');
  await frontendPage.close();

  // --- Admin panel sections ---
  console.log('\n📸 Capturing admin panel sections...');
  const adminPage = await context.newPage();
  await adminPage.goto(BASE_URL + '/admin.html', { waitUntil: 'networkidle', timeout: 60000 });
  await adminPage.waitForTimeout(3000);

  for (const section of ADMIN_SECTIONS) {
    try {
      const link = adminPage.locator(section.selector).first();
      if (await link.isVisible({ timeout: 3000 })) {
        await link.click();
        await adminPage.waitForTimeout(1500);
        await adminPage.screenshot({
          path: path.join(SCREENSHOTS_DIR, section.file),
          fullPage: true,
        });
        console.log(`  ✓ screenshots/${section.file}`);
      } else {
        console.log(`  ⚠ ${section.label} link not visible, skipping`);
      }
    } catch (e) {
      console.log(`  ✗ Could not capture ${section.label}: ${e.message}`);
    }
  }

  await adminPage.close();
  await browser.close();

  console.log('\n✅ All screenshots complete!');
})();