const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const requireAdmin = require('../middleware/admin');

const STEAM_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'fr-FR,fr;q=0.9',
  'Accept': 'application/json'
};

// GET /api/steam/search?q=...
router.get('/search', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const q = req.query.q;
    if (!q || q.length < 2) return res.json([]);

    const url = 'https://store.steampowered.com/api/storesearch/?term=' + encodeURIComponent(q) + '&l=french&cc=fr';
    const response = await fetch(url, { headers: STEAM_HEADERS });

    if (!response.ok) return res.status(502).json({ error: 'Steam API unavailable' });

    const data = await response.json();
    const items = (data.items || []).map(item => ({
      id: item.id,
      name: item.name,
      image: item.tiny_image || null,
      platforms: item.platforms || {}
    }));

    res.json(items);
  } catch (err) { next(err); }
});

// GET /api/steam/game/:appId
router.get('/game/:appId', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const appId = req.params.appId;
    const url = 'https://store.steampowered.com/api/appdetails?appids=' + appId + '&cc=fr&l=french';
    const response = await fetch(url, { headers: STEAM_HEADERS });

    if (!response.ok) return res.status(502).json({ error: 'Steam API unavailable' });

    const data = await response.json();
    if (!data[appId] || !data[appId].success) {
      return res.status(404).json({ error: 'Jeu introuvable sur Steam' });
    }

    const g = data[appId].data;
    const reqs = parseRequirements(g.pc_requirements || {});

    let price = null;
    if (g.price_overview) {
      price = {
        initial: g.price_overview.initial / 100,
        final: g.price_overview.final / 100,
        discount_percent: g.price_overview.discount_percent,
        currency: g.price_overview.currency
      };
    } else if (g.is_free) {
      price = { initial: 0, final: 0, discount_percent: 0, currency: 'EUR' };
    }

    res.json({
      steamAppId: appId,
      name: g.name,
      description: g.short_description || '',
      headerImage: 'https://cdn.akamai.steamstatic.com/steam/apps/' + appId + '/capsule_616x353.jpg',
      price: price,
      genres: (g.genres || []).map(genre => genre.description),
      platforms: g.platforms || {},
      releaseDate: g.release_date || {},
      requirements: reqs,
      isFree: g.is_free || false
    });
  } catch (err) { next(err); }
});

function parseRequirements(pcReqs) {
  const result = { os: '', cpu: '', ram: '', gpu: '' };
  const html = (pcReqs && pcReqs.minimum) || '';
  if (!html) return result;

  const re = /<strong>\s*([^<]+?)\s*:?\s*<\/strong>\s*([^<]*)/gi;
  let match;
  while ((match = re.exec(html)) !== null) {
    const label = match[1].replace(/:$/, '').trim().toLowerCase();
    const value = match[2].replace(/<[^>]*>/g, '').trim();
    if (/^os|^operating|^syst/.test(label)) result.os = value;
    else if (/^processor|^processeur|^cpu/.test(label)) result.cpu = value;
    else if (/^memory|^mémoire|^ram/.test(label)) result.ram = value;
    else if (/^graphics|^graphiques|^gpu|^video/.test(label)) result.gpu = value;
  }

  return result;
}

module.exports = router;