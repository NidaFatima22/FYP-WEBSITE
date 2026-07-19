const express = require('express');
const crypto = require('crypto');
const { readJSON } = require('../lib/storage');
const router = express.Router();

// In-memory session tokens. Lost on server restart — fine for a small admin panel.
// For real production use, swap this for signed JWTs with expiry, and hash
// ADMIN_PASSWORD (e.g. with bcrypt) instead of comparing plain text.
const sessions = new Set();

function requireAdmin(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token || !sessions.has(token)) {
    return res.status(401).json({ error: 'Unauthorized. Log in again.' });
  }
  next();
}

// POST /api/admin/login  { username, password } -> { token }
router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  const validUser = process.env.ADMIN_USERNAME;
  const validPass = process.env.ADMIN_PASSWORD;

  if (!validUser || !validPass) {
    return res.status(500).json({
      error: 'Admin credentials not configured. Set ADMIN_USERNAME and ADMIN_PASSWORD in .env.',
    });
  }

  if (username !== validUser || password !== validPass) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  const token = crypto.randomBytes(24).toString('hex');
  sessions.add(token);
  res.json({ token });
});

// POST /api/admin/logout
router.post('/logout', requireAdmin, (req, res) => {
  const token = req.headers.authorization.slice(7);
  sessions.delete(token);
  res.json({ success: true });
});

// GET /api/admin/audits -> every audit report that's been generated, newest first
router.get('/audits', requireAdmin, (req, res) => {
  const audits = readJSON('audits.json').slice().reverse();
  res.json({ audits });
});

// GET /api/admin/waitlist -> every waitlist signup, newest first
router.get('/waitlist', requireAdmin, (req, res) => {
  const waitlist = readJSON('waitlist.json').slice().reverse();
  res.json({ waitlist });
});

module.exports = router;
