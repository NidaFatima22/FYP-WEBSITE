// Thin wrapper around the Anthropic API. Returns null (never throws) if no API key
// is configured or the call fails, so every caller can fall back to rule-based logic.

const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-5';

async function callClaude({ system, prompt, maxTokens = 1200 }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) {
      console.error('Claude API error:', res.status, await res.text());
      return null;
    }

    const data = await res.json();
    const textBlock = (data.content || []).find((b) => b.type === 'text');
    return textBlock ? textBlock.text : null;
  } catch (err) {
    console.error('Claude API call failed:', err.message);
    return null;
  }
}

module.exports = { callClaude };
