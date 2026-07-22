/*
 * Claude API (server-only, FR-AI-06). Returns null gracefully when the key
 * isn't configured, so every AI feature degrades instead of erroring.
 * Structured outputs are requested as JSON and validated by callers (FR-AI-04).
 */
import { pick } from './env';

export const AI_MODEL = 'claude-sonnet-5';
export const aiConfigured = () => !!pick('ANTHROPIC_API_KEY');

export async function claudeJSON<T = any>(system: string, user: string, maxTokens = 2000): Promise<T | null> {
  const key = pick('ANTHROPIC_API_KEY');
  if (!key) return null;
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: AI_MODEL,
        max_tokens: maxTokens,
        system: system + ' Respond with ONLY valid JSON — no prose, no markdown fences.',
        messages: [{ role: 'user', content: user }],
      }),
    });
    if (!res.ok) { console.error('claude:', res.status, await res.text()); return null; }
    const j: any = await res.json();
    let text: string = j.content?.[0]?.text ?? '';
    text = text.trim().replace(/^```(?:json)?/, '').replace(/```$/, '').trim();
    return JSON.parse(text) as T;
  } catch (e) { console.error('claude:', e); return null; }
}
