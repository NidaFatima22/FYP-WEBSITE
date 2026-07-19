const express = require('express');
const router = express.Router();
const { callClaude } = require('../lib/claude');
const { readJSON, writeJSON } = require('../lib/storage');

// POST /api/report  { analysis, competitors, interviewAnswers }
// Combines the three data streams into a structured growth report.
//
// If ANTHROPIC_API_KEY is set (see .env.example), this calls Claude to actually
// reason over the data and write the report. Without a key, it falls back to the
// rule-based logic below so the product still works end-to-end for free.

// Turns the owner's free-text "goal" answer into a short, ordered action plan.
// Used only in rule-based fallback mode — Claude writes its own roadmap when available.
function buildGoalRoadmap(goal = '') {
  const g = goal.toLowerCase();

  if (/traffic/.test(g)) {
    return [
      'Fix the SEO issues in the snapshot above first — they cap every traffic channel at once.',
      'Publish 2-3 category/buying-guide pages targeting the keywords your top competitors already rank for.',
      'Reinvest 10-15% of current ad spend into the highest-converting existing channel before adding new ones.',
    ];
  }
  if (/conversion|checkout|drop.?off/.test(g)) {
    return [
      'Remove friction at checkout first (guest checkout, fewer form fields) — it compounds every other fix.',
      'Add trust and urgency signals (reviews, stock counts) on your top 5 highest-traffic product pages.',
      'A/B test price presentation against the bundle pricing competitors are already running.',
    ];
  }
  if (/repeat|retention|loyal/.test(g)) {
    return [
      'Set up a post-purchase email flow — most repeat-customer revenue is lost in the first 30 days of silence.',
      'Introduce a simple loyalty or reorder incentive matched to your pricing tier.',
      'Segment past buyers by product category and target them with relevant restock or complementary offers.',
    ];
  }
  return [
    'Start by closing the SEO and checkout gaps in this report — they affect every growth goal at once.',
    'Pick one metric (traffic, conversion, or repeat purchases) to focus the next 30 days on.',
    'Re-run this audit in 4-6 weeks to measure movement before adding a second initiative.',
  ];
}

function buildRuleBasedReport(analysis, competitors, interviewAnswers) {
  const competitorComparisons = [];
  const weaknesses = [];
  const recommendations = [];
  const seo = analysis.seo || {};

  if (seo.googleRankingEstimate && seo.googleRankingEstimate !== 'top 3') {
    weaknesses.push(`Estimated Google ranking for your main keyword: ${seo.googleRankingEstimate} — real visibility is likely limited.`);
    recommendations.push('Target page-1 ranking with on-page SEO fixes (title tags, meta descriptions, internal links) before spending more on ads.');
  }
  if (seo.pageSpeedScore !== undefined && seo.pageSpeedScore < 60) {
    weaknesses.push(`Page speed score is ${seo.pageSpeedScore}/100 — slow load times hurt both ranking and conversion.`);
    recommendations.push('Compress product images and lazy-load below-the-fold content to lift page speed.');
  }
  if (seo.mobileFriendly === false) {
    weaknesses.push('Store is not fully mobile-friendly — this directly caps Google mobile ranking.');
    recommendations.push('Fix mobile layout issues; Google ranks mobile experience as a core signal.');
  }
  if (seo.metaDescriptionMissing) {
    weaknesses.push('Meta descriptions are missing on key pages, hurting click-through from search results.');
    recommendations.push('Write unique meta descriptions for your top 10 product and category pages.');
  }
  if (seo.altTextCoverage !== undefined && seo.altTextCoverage < 60) {
    weaknesses.push(`Only ${seo.altTextCoverage}% of product images have alt text — a missed, easy SEO win.`);
    recommendations.push('Add descriptive alt text to product images to improve image-search ranking.');
  }

  const bundleCompetitors = competitors.filter((c) => c.hasBundlePricing).length;
  if (bundleCompetitors > 0) {
    competitorComparisons.push(`${bundleCompetitors} of ${competitors.length || 5} niche competitors run bundle pricing you may not offer.`);
    recommendations.push('Introduce a starter bundle to match competitor pricing tiers.');
  }

  const avgCatalog = competitors.length
    ? Math.round(competitors.reduce((sum, c) => sum + (c.catalogSize || 0), 0) / competitors.length)
    : null;
  if (avgCatalog && analysis.catalogSizeEstimate && avgCatalog > analysis.catalogSizeEstimate) {
    competitorComparisons.push(`Average competitor catalog (~${avgCatalog} items) is larger than yours (~${analysis.catalogSizeEstimate}).`);
  }

  const freeShippingCompetitors = competitors.filter((c) => c.hasFreeShipping).length;
  if (freeShippingCompetitors > 0) {
    competitorComparisons.push(`${freeShippingCompetitors} competitors run an always-on free shipping threshold.`);
    recommendations.push('Test a free-shipping threshold against current margin.');
  }

  if (analysis.hasGuestCheckout === false) {
    weaknesses.push('Checkout requires account creation before payment.');
    recommendations.push('Add guest checkout to reduce drop-off.');
  }

  if (interviewAnswers.pricingStance && /higher/i.test(interviewAnswers.pricingStance)) {
    weaknesses.push('Pricing is positioned above competitors without clear quality signaling on product pages.');
    recommendations.push('Add quality/differentiation messaging near price on product pages.');
  }

  if (interviewAnswers.challenges) {
    weaknesses.push(`Owner-reported challenge: ${interviewAnswers.challenges}`);
  }

  if (competitorComparisons.length === 0) {
    competitorComparisons.push('Competitor set shows mixed pricing strategies with no dominant pattern yet.');
  }
  if (weaknesses.length === 0) {
    weaknesses.push('No major structural weaknesses detected — focus shifts to conversion testing.');
  }
  if (recommendations.length === 0) {
    recommendations.push('Run a structured A/B test on your highest-traffic product page.');
  }

  return {
    competitorComparisons,
    weaknesses,
    recommendations,
    goalRoadmap: buildGoalRoadmap(interviewAnswers.goal || ''),
  };
}

const CLAUDE_SYSTEM_PROMPT = `You are StoreSage's AI reasoning engine — an AI business consultant for e-commerce stores.
You're given structured data: a website analysis (including SEO/Google ranking signals), a set of niche competitors, and answers from a short owner discovery interview.

Return ONLY valid JSON, no markdown fences, no commentary, matching exactly this shape:
{
  "competitorComparisons": string[],
  "weaknesses": string[],
  "recommendations": string[],
  "goalRoadmap": string[]
}

Rules:
- 3-6 items per array, each concrete and grounded in the specific data given — never generic filler.
- "weaknesses" must include SEO/ranking issues from the data when present (ranking position, page speed, mobile-friendliness, meta descriptions, alt text).
- "recommendations" should be actionable and prioritized toward the owner's stated goal and toward profit growth, not just traffic.
- "goalRoadmap" is an ordered, numbered-feeling action plan (as plain strings, no numbering prefix) specifically aimed at helping the owner reach the goal they stated in the interview and improve profitability.`;

async function generateReportWithClaude(analysis, competitors, interviewAnswers) {
  const prompt = JSON.stringify({ analysis, competitors, interviewAnswers }, null, 2);
  const text = await callClaude({ system: CLAUDE_SYSTEM_PROMPT, prompt, maxTokens: 1400 });
  if (!text) return null;

  try {
    const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/, '');
    const parsed = JSON.parse(cleaned);
    if (
      Array.isArray(parsed.competitorComparisons) &&
      Array.isArray(parsed.weaknesses) &&
      Array.isArray(parsed.recommendations) &&
      Array.isArray(parsed.goalRoadmap)
    ) {
      return parsed;
    }
    return null;
  } catch (err) {
    console.error('Failed to parse Claude report JSON:', err.message);
    return null;
  }
}

router.post('/', async (req, res) => {
  const { analysis = {}, competitors = [], interviewAnswers = {} } = req.body || {};
  const seo = analysis.seo || {};

  let reasoning = await generateReportWithClaude(analysis, competitors, interviewAnswers);
  let source = 'claude';
  if (!reasoning) {
    reasoning = buildRuleBasedReport(analysis, competitors, interviewAnswers);
    source = 'rule-based';
  }

  const report = {
    url: analysis.url || 'yourstore.com',
    generatedAt: new Date().toISOString(),
    source, // 'claude' or 'rule-based' — visible in the admin panel for transparency
    seoSnapshot: seo,
    competitorComparisons: reasoning.competitorComparisons,
    weaknesses: reasoning.weaknesses,
    recommendations: reasoning.recommendations,
    goalRoadmap: reasoning.goalRoadmap,
  };

  // Persist so the admin panel can list every audit that's been run.
  try {
    const audits = readJSON('audits.json');
    audits.push({
      id: 'audit_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      url: report.url,
      generatedAt: report.generatedAt,
      source,
      interviewAnswers,
      report,
    });
    writeJSON('audits.json', audits);
  } catch (err) {
    console.error('Failed to persist audit:', err.message);
  }

  res.json(report);
});

module.exports = router;
