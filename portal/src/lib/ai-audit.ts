/*
 * Read the headline figures out of an uploaded AI Visibility Audit so the
 * dashboard updates itself when a new audit is added, instead of the numbers
 * staying frozen on whatever round was last hand-entered into the config.
 *
 * Two routes, in order of trust:
 *   1. A machine-readable block in the audit file:
 *        <script type="application/json" id="rtc-ai-audit">{ ... }</script>
 *      Exact, unambiguous, and the shape the SOP should emit going forward.
 *   2. Pattern-matching the phrasing RTC's audits already use — "3 of 80
 *      checks", "Round 2", "tested July 2-3, 2026", and per-engine rows.
 *
 * Nothing is guessed. If neither route yields a total and a visible count, the
 * function returns null and the caller leaves the existing figures alone — on a
 * client-facing dashboard, wrong numbers are worse than stale ones.
 */

export type AiScorecardRow = { channel: string; checks: number; visible: number; rate: string };

export type AiAuditFigures = {
  round: string;
  tested: string;
  totalChecks: number;
  visibleChecks: number;
  rate: string;
  scorecard: AiScorecardRow[];
  /** How the figures were obtained, for the confirmation message. */
  source: 'json' | 'parsed';
};

const ENGINES = ['Google', 'ChatGPT', 'Gemini', 'Perplexity', 'Claude', 'Copilot'];

const pct = (visible: number, total: number) =>
  total > 0 ? `${Math.round((visible / total) * 1000) / 10}%` : '0%';

/** Strip tags so prose patterns match across markup boundaries. */
const textOf = (html: string) =>
  html.replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ');

function fromJsonBlock(html: string): AiAuditFigures | null {
  const m = html.match(
    /<script[^>]*type=["']application\/json["'][^>]*id=["']rtc-ai-audit["'][^>]*>([\s\S]*?)<\/script>/i
  ) || html.match(
    /<script[^>]*id=["']rtc-ai-audit["'][^>]*type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/i
  );
  if (!m) return null;
  try {
    const j = JSON.parse(m[1].trim()) as Record<string, unknown>;
    const total = Number(j.totalChecks);
    const visible = Number(j.visibleChecks);
    if (!Number.isFinite(total) || !Number.isFinite(visible) || total <= 0) return null;
    const rows = Array.isArray(j.scorecard) ? (j.scorecard as Record<string, unknown>[]) : [];
    return {
      round: String(j.round ?? '').trim(),
      tested: String(j.tested ?? '').trim(),
      totalChecks: total,
      visibleChecks: visible,
      // Always derived, never trusted from the file — a stale rate beside fresh
      // counts is the kind of inconsistency nobody spots.
      rate: pct(visible, total),
      scorecard: rows
        .map((r) => ({
          channel: String(r.channel ?? '').trim(),
          checks: Number(r.checks) || 0,
          visible: Number(r.visible) || 0,
          rate: pct(Number(r.visible) || 0, Number(r.checks) || 0),
        }))
        .filter((r) => r.channel && r.checks > 0),
      source: 'json',
    };
  } catch {
    return null;
  }
}

function fromPatterns(html: string): AiAuditFigures | null {
  const t = textOf(html);

  // "3 of 80 checks" / "3 of 80 checks visible"
  const counts = t.match(/(\d[\d,]*)\s+of\s+(\d[\d,]*)\s+checks/i);
  if (!counts) return null;
  const visible = Number(counts[1].replace(/,/g, ''));
  const total = Number(counts[2].replace(/,/g, ''));
  if (!Number.isFinite(visible) || !Number.isFinite(total) || total <= 0 || visible > total) return null;

  const round = (t.match(/\bRound\s+(\d+)\b/i) || [])[1];
  const tested = (t.match(/tested\s+([A-Z][a-z]+\s+\d{1,2}(?:\s*[-–]\s*\d{1,2})?,\s*\d{4})/) || [])[1];

  // Per-engine rows: "ChatGPT 20 1 5%" in a scorecard table.
  const scorecard: AiScorecardRow[] = [];
  for (const engine of ENGINES) {
    const re = new RegExp(engine + '\\s+(\\d[\\d,]*)\\s+(\\d[\\d,]*)', 'i');
    const m = t.match(re);
    if (!m) continue;
    const checks = Number(m[1].replace(/,/g, ''));
    const vis = Number(m[2].replace(/,/g, ''));
    if (checks > 0 && vis <= checks) scorecard.push({ channel: engine, checks, visible: vis, rate: pct(vis, checks) });
  }
  // Only trust the scorecard if it reconciles with the headline total.
  const sum = scorecard.reduce((a, r) => a + r.checks, 0);
  const trusted = sum === total ? scorecard : [];

  return {
    round: round ? `Round ${round}` : '',
    tested: tested ? tested.replace(/\s*[-–]\s*/, '-') : '',
    totalChecks: total,
    visibleChecks: visible,
    rate: pct(visible, total),
    scorecard: trusted,
    source: 'parsed',
  };
}

/** Best-effort figures from an uploaded HTML audit, or null if not readable. */
export function extractAudit(html: string): AiAuditFigures | null {
  return fromJsonBlock(html) ?? fromPatterns(html);
}

/**
 * Fold new figures into a client's config. The incoming round becomes current;
 * the round it replaces is kept in aiAuditHistory so earlier numbers remain
 * available for comparison.
 *
 * Narrative fields from the previous round (note, wins, groups, intent
 * commentary) are deliberately NOT carried over — July's write-up sitting under
 * September's numbers would read as current analysis when it is nothing of the
 * kind. They are cleared, and the template renders nothing where it finds an
 * empty string.
 */
export function mergeAuditIntoConfig(
  config: Record<string, any>,
  fig: AiAuditFigures,
  period: string
): Record<string, any> {
  const cfg = config && typeof config === 'object' ? { ...config } : {};
  const previous = cfg.aiAudit && typeof cfg.aiAudit === 'object' ? cfg.aiAudit : null;
  const history = Array.isArray(cfg.aiAuditHistory) ? cfg.aiAuditHistory.slice() : [];
  if (previous && (previous.totalChecks || previous.round)) history.unshift(previous);

  cfg.aiAuditHistory = history.slice(0, 12);
  cfg.aiAudit = {
    round: fig.round || (period ? `Audit ${period.slice(0, 7)}` : 'Latest audit'),
    tested: fig.tested,
    totalChecks: fig.totalChecks,
    visibleChecks: fig.visibleChecks,
    rate: fig.rate,
    scorecard: fig.scorecard,
    // Cleared rather than inherited — see the note above.
    intent: [], wins: [], groups: [], change: [],
    note: '', intentNote: '', method: '',
    period,
  };
  return cfg;
}
