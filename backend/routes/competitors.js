const express = require('express');
const router = express.Router();

// POST /api/competitors  { url, niche? }
// Returns a list of "discovered" competitor stores with comparable metrics.
//
// To make this real: call a search/SERP API (e.g. SerpAPI, Bing Web Search) scoped to
// the store's product category, then run each result through the same logic as
// routes/analyze.js so the metrics are directly comparable.
router.post('/', (req, res) => {
  const { url } = req.body || {};

  if (!url) {
    return res.status(400).json({ error: 'A store url is required.' });
  }

  const mockCompetitors = [
    { name: 'Competitor A', pricingTier: 'mid-market', catalogSize: 210, hasBundlePricing: true, hasFreeShipping: true },
    { name: 'Competitor B', pricingTier: 'budget', catalogSize: 340, hasBundlePricing: false, hasFreeShipping: true },
    { name: 'Competitor C', pricingTier: 'premium', catalogSize: 95, hasBundlePricing: true, hasFreeShipping: false },
    { name: 'Competitor D', pricingTier: 'mid-market', catalogSize: 180, hasBundlePricing: true, hasFreeShipping: false },
    { name: 'Competitor E', pricingTier: 'budget', catalogSize: 260, hasBundlePricing: false, hasFreeShipping: true },
  ];

  res.json({ url, competitors: mockCompetitors, discoveredAt: new Date().toISOString() });
});

module.exports = router;
