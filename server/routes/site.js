const express = require('express');
const router = express.Router();
const siteSettings = require('../models/siteSettings');

// GET /api/site/home-content
router.get('/home-content', async (req, res, next) => {
  try {
    res.json(await siteSettings.getHomeContent());
  } catch (err) {
    next(err);
  }
});

module.exports = router;
