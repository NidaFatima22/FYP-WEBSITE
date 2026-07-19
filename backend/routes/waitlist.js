const express = require('express');
const { readJSON, writeJSON } = require('../lib/storage');
const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/waitlist  { email } -> { success: true }
router.post('/', (req, res) => {
  const { email } = req.body || {};

  if (!email || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'A valid email is required.' });
  }

  const list = readJSON('waitlist.json');
  if (list.some((entry) => entry.email.toLowerCase() === email.toLowerCase())) {
    return res.json({ success: true, alreadyOnList: true });
  }

  list.push({ email, joinedAt: new Date().toISOString() });
  writeJSON('waitlist.json', list);

  res.json({ success: true, position: list.length });
});

// GET /api/waitlist/count -> { count }
router.get('/count', (req, res) => {
  res.json({ count: readJSON('waitlist.json').length });
});

module.exports = router;
