const express = require('express');
const router = express.Router();

// POST /api/analyze  { url }
// Returns the step-by-step audit trail the frontend prints into the receipt/scan card,
// plus a structured summary the report route can reuse.
//
// This is currently rule-based mock logic so the product works end-to-end without
// external dependencies. To make it real:
//   1. Fetch the page with `fetch` or a headless browser (e.g. Playwright).
//   2. Parse it with `cheerio` to pull product counts, pricing, nav structure, etc.
//   3. Replace the values below with the real extracted data.
router.post('/', (req, res) => {
  const { url } = req.body || {};

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'A store url is required.' });
  }

  const cleanUrl = url.replace(/^https?:\/\//, '').replace(/\/$/, '');

  const steps = [
    { label: 'Fetching storefront', status: 'OK' },
    { label: 'Reading product catalog', status: 'OK' },
    { label: 'Mapping pricing patterns', status: 'OK' },
    { label: 'Checking checkout flow', status: 'OK' },
    { label: 'Checking SEO & Google ranking signals', status: 'OK' },
    { label: 'Scanning niche competitors', status: 'OK' },
    { label: 'Queuing discovery interview', status: 'READY' },
  ];

  // seo: mocked signals that stand in for a real Google ranking/SEO check.
  // To make this real: pull actual position data from Google Search Console API
  // or a rank-tracking API (e.g. SerpAPI, Ahrefs API), and run a real Lighthouse
  // pass (via the `lighthouse` npm package) for the performance/mobile scores.
  const seo = {
    googleRankingEstimate: ['top 3', 'page 1 (4-10)', 'page 2-3', 'beyond page 3'][Math.floor(Math.random() * 4)],
    pageSpeedScore: Math.floor(35 + Math.random() * 60), // 0-100, Lighthouse-style
    mobileFriendly: Math.random() > 0.3,
    metaDescriptionMissing: Math.random() > 0.5,
    altTextCoverage: Math.floor(20 + Math.random() * 75), // % of product images with alt text
  };

  const summary = {
    url: cleanUrl,
    catalogSizeEstimate: Math.floor(40 + Math.random() * 200),
    hasGuestCheckout: Math.random() > 0.5,
    hasFreeShippingThreshold: Math.random() > 0.5,
    pricingTier: ['budget', 'mid-market', 'premium'][Math.floor(Math.random() * 3)],
    seo,
    analyzedAt: new Date().toISOString(),
  };

  res.json({ steps, summary });
});

module.exports = router;
