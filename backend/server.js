require('dotenv').config();
const express = require('express');
const cors = require('cors');

const analyzeRoute = require('./routes/analyze');
const competitorsRoute = require('./routes/competitors');
const interviewRoute = require('./routes/interview');
const reportRoute = require('./routes/report');
const waitlistRoute = require('./routes/waitlist');
const adminRoute = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// simple request log
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'storesage-backend', time: new Date().toISOString() });
});

app.use('/api/analyze', analyzeRoute);
app.use('/api/competitors', competitorsRoute);
app.use('/api/interview', interviewRoute);
app.use('/api/report', reportRoute);
app.use('/api/waitlist', waitlistRoute);
app.use('/api/admin', adminRoute);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`StoreSage backend running on http://localhost:${PORT}`);
});
