const express = require('express');
const router = express.Router();

// In-memory session store. Swap for Redis/DB before running multiple server instances.
const sessions = new Map();

const QUESTIONS = [
  { key: 'goal', text: "What's the main goal for the store right now — more traffic, higher conversion, or repeat customers?" },
  { key: 'targetCustomers', text: 'Who is your ideal customer, in a sentence or two?' },
  { key: 'pricingStance', text: 'How would you describe your pricing versus your closest competitors?' },
  { key: 'challenges', text: "What's the biggest thing getting in the way of growth right now?" },
];

// POST /api/interview/start  -> { sessionId, question }
router.post('/start', (req, res) => {
  const sessionId = 'sess_' + Math.random().toString(36).slice(2, 10);
  sessions.set(sessionId, { answers: {}, step: 0 });
  res.json({ sessionId, question: QUESTIONS[0].text, step: 0, total: QUESTIONS.length });
});

// POST /api/interview/answer  { sessionId, answer } -> next question or { done: true, answers }
router.post('/answer', (req, res) => {
  const { sessionId, answer } = req.body || {};
  const session = sessions.get(sessionId);

  if (!session) {
    return res.status(404).json({ error: 'Unknown session. Call /start first.' });
  }

  const current = QUESTIONS[session.step];
  session.answers[current.key] = answer;
  session.step += 1;

  if (session.step >= QUESTIONS.length) {
    // Interview complete — this is where a real LLM call would turn free-text
    // answers into structured signals for the reasoning engine (routes/report.js).
    // e.g. call the Anthropic API with process.env.ANTHROPIC_API_KEY here.
    return res.json({ done: true, answers: session.answers });
  }

  res.json({
    done: false,
    question: QUESTIONS[session.step].text,
    step: session.step,
    total: QUESTIONS.length,
  });
});

module.exports = router;
