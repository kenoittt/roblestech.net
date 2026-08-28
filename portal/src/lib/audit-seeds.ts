/*
 * Per-client AI visibility seed data.
 *
 * This is a stopgap, not the intended home. Audit figures belong in the
 * client's stored config, set either by uploading an HTML audit (read
 * automatically) or through "Set AI visibility figures" in the admin panel.
 * Anything stored always wins over what is here — a seed only fills the gap
 * for a client whose figures have not been saved yet, so the dashboard shows
 * the real audit rather than zeros.
 *
 * When a client's figures are saved through the admin panel, their entry here
 * can be deleted.
 */

export type SeedScorecardRow = { channel: string; checks: number; visible: number; rate: string };
export type SeedGroupRow = { n: string; q: string; g: string; c: string; ge: string; p: string; won: string };
export type SeedGroup = { name: string; insight: string; rows: SeedGroupRow[] };

export type AuditSeed = {
  aiAudit: Record<string, unknown>;
  aiAuditHistory?: Record<string, unknown>[];
};

/* Robles Technologies Corp. — baseline round 1, August 2026.
   20 questions across the six service lines x 4 platforms = 80 checks, run
   22 August 2026. "n/a" means the platform surfaced no sources at all on that
   check, which is distinct from being passed over. */
const RTC: AuditSeed = {
  aiAudit: {
    round: 'Baseline round 1',
    tested: 'August 22, 2026',
    period: '2026-08-01',
    totalChecks: 80,
    visibleChecks: 2,
    rate: '2.5%',
    note:
      'When buyers ask these questions, Robles Technologies Corp. shows up for 2 of 80 checks — 2.5% visibility across Google and the three major AI platforms. Both of those two are the same question. This is a baseline: every question is tied to a specific post or conversion page in the RTC 90-Day Content Plan, so nothing is measured here that the plan does not already act on.',
    intentNote:
      'By intent group: buying-intent 0 of 24, comparison 0 of 16, problem-aware 0 of 24, how-to 2 of 16. By service line: Line 01 (GEO and SEO) 0 of 32, Line 02 (Project Management Optimization) 2 of 24, Lines 03–06 0 of 24.',
    method:
      '20 questions buyers ask across the six service lines, checked on Google, ChatGPT, Gemini and Perplexity on 22 August 2026 — 80 checks. For Google, visible means page 1 or the AI Overview. 19 of the 80 checks returned no sources at all (ChatGPT 11, Gemini 8), shown as n/a rather than as a miss. Search volumes from Semrush, US database, pulled 26 August 2026.',
    scorecard: [
      { channel: 'Google', checks: 20, visible: 1, rate: '5%' },
      { channel: 'ChatGPT', checks: 20, visible: 0, rate: '0%' },
      { channel: 'Gemini', checks: 20, visible: 1, rate: '5%' },
      { channel: 'Perplexity', checks: 20, visible: 0, rate: '0%' },
    ] as SeedScorecardRow[],
    intent: [
      { group: 'Buying-intent', visible: 0, of: 24 },
      { group: 'Comparison', visible: 0, of: 16 },
      { group: 'Problem-aware', visible: 0, of: 24 },
      { group: 'How-to', visible: 2, of: 16 },
    ],
    wins: [
      'P4 (submitting data to Smartsheet without a licence) is cited on two engines — Google 2nd and Gemini 1st. It is the only question in the set with a live RTC post already behind it, which is the whole argument for the content plan in one data point.',
    ],
    groups: [
      {
        name: 'Buying-intent questions (G5, G6, G8, P1, P5, D2)',
        insight:
          '0 of 24, and the six do not behave alike. G6 and G8 pulled full source lists on all four platforms, and every name on them is an agency or a directory — a contestable field. P1 and P5 are Smartsheet product questions where Smartsheet.com holds first on every platform that cited anything; second place is the realistic goal, and P4 already proves it can be taken. G5 and D2 are the weakest: neither ChatGPT nor Gemini offered any source list on either.',
        rows: [
          { n: 'G5', q: 'What does an AI visibility audit include?', g: 'No', c: 'n/a', ge: 'n/a', p: 'No', won: 'Cision, PartnerStack, Forbes' },
          { n: 'G6', q: 'How much should I pay an SEO agency?', g: 'No', c: 'No', ge: 'No', p: 'No', won: 'Sharp Rocket, OuterBox, Clutch' },
          { n: 'G8', q: 'Which agency should I hire for AI search optimization?', g: 'No', c: 'No', ge: 'No', p: 'No', won: 'Thrive Internet Marketing, Sightivo, geotoolbox.ai' },
          { n: 'P1', q: 'How much does Smartsheet cost per user?', g: 'No', c: 'No', ge: 'No', p: 'No', won: 'Smartsheet, Tech.co, Forbes' },
          { n: 'P5', q: 'Who can help me set up Smartsheet properly?', g: 'No', c: 'No', ge: 'No', p: 'No', won: 'Smartsheet, Credly, Freelancer' },
          { n: 'D2', q: 'Do I need a fractional CTO?', g: 'No', c: 'n/a', ge: 'n/a', p: 'No', won: 'Medium, Lemon.io, Amazing CTO' },
        ],
      },
      {
        name: 'Comparison questions (G1, P2, A2, W1)',
        insight:
          '0 of 16, and G1 is the most winnable question in the entire report. Google gave GEO versus SEO to Informa TechTarget, Contentful and Semrush; Perplexity to Coursera, Evergreen and ClickForest. Not one of those six is a specialist in the thing being defined. Neither ChatGPT nor Gemini surfaced sources on G1 or W1, so those two are a Google and Perplexity game — half the surface, and still the clearest open door.',
        rows: [
          { n: 'G1', q: 'What is the difference between GEO and SEO?', g: 'No', c: 'n/a', ge: 'n/a', p: 'No', won: 'Informa TechTarget, Contentful, Coursera' },
          { n: 'P2', q: 'Is Smartsheet better than Monday.com?', g: 'No', c: 'No', ge: 'No', p: 'No', won: 'Monday.com, Smartsheet, TechnologyAdvice' },
          { n: 'A2', q: 'Should I use Zapier, Make, or n8n?', g: 'No', c: 'No', ge: 'No', p: 'No', won: 'Zapier, Make, n8n' },
          { n: 'W1', q: 'Should I buy or build a client portal?', g: 'No', c: 'n/a', ge: 'n/a', p: 'No', won: 'Liferay, Enablix, Moxo' },
        ],
      },
      {
        name: 'Problem-aware questions (G2, G4, P3, P6, A1, D1)',
        insight:
          '0 of 24, and the thinnest citable surface in the report. Eight of these 24 checks returned no sources at all: on P6, A1 and D1 both ChatGPT and Gemini answered without citing anything, making those three effectively two-platform questions. D1 belongs to a consulting-authority field (Grant Thornton, PwC, BCG) where topical presence, not a position above PwC, is the honest expectation. G2 and G4 are the exceptions worth the work — the names holding them are the same tier of company as RTC.',
        rows: [
          { n: 'G2', q: 'Do I still need SEO if AI is answering everything?', g: 'No', c: 'n/a', ge: 'No', p: 'No', won: 'WSI Smart Marketing, Mangools, omnicite.ai' },
          { n: 'G4', q: 'How do I know if AI is recommending my brand?', g: 'No', c: 'n/a', ge: 'No', p: 'No', won: 'Forbes, Ahrefs, Semrush' },
          { n: 'P3', q: 'Should I switch away from Smartsheet?', g: 'No', c: 'No', ge: 'No', p: 'No', won: 'Productive.io, Stackby, Capterra' },
          { n: 'P6', q: 'How do I get portfolio visibility across all my projects?', g: 'No', c: 'n/a', ge: 'n/a', p: 'No', won: 'Project Director, Atlassian, Asana' },
          { n: 'A1', q: 'What should I automate first in my business?', g: 'No', c: 'n/a', ge: 'n/a', p: 'No', won: 'mende.io, GoDaddy, AvePoint' },
          { n: 'D1', q: 'Why do digital transformation projects fail?', g: 'No', c: 'n/a', ge: 'n/a', p: 'No', won: 'Grant Thornton, PwC, Boston Consulting Group' },
        ],
      },
      {
        name: 'How-to questions (G3, G7, P4, W2)',
        insight:
          '2 of 16, and both are P4 — the only group with any visibility in the report. It is not an accident that the wins are in the how-to group: the proof is procedural, and P4 is the one question with a live RTC post already behind it. G7 is the next most winnable after G1: on llms.txt, ChatGPT cited exactly one source, the specification itself, so there is no editorial incumbent at all.',
        rows: [
          { n: 'G3', q: 'How do I get my brand mentioned in ChatGPT?', g: 'No', c: 'n/a', ge: 'No', p: 'No', won: 'SparkToro, Austin Heaton, The HOTH' },
          { n: 'G7', q: 'Do I need an llms.txt file?', g: 'No', c: 'No', ge: 'No', p: 'No', won: 'Medium, Safari Digital, llmstxt.org' },
          { n: 'P4', q: 'How do I let someone submit data to Smartsheet without a licence?', g: 'Yes, 2nd', c: 'No', ge: 'Yes, 1st', p: 'No', won: 'Smartsheet, Certifier.io, Microsoft' },
          { n: 'W2', q: 'What does smart contract development actually involve?', g: 'No', c: 'n/a', ge: 'n/a', p: 'No', won: 'IBM, Coursera, OpenZeppelin' },
        ],
      },
    ] as SeedGroup[],
  },
  // Baseline round: nothing earlier to compare against yet.
  aiAuditHistory: [],
};

const SEEDS: { match: RegExp; seed: AuditSeed }[] = [
  { match: /robles/i, seed: RTC },
];

/** Seed figures for a client, or null when there are none. */
export function auditSeedFor(clientName: string): AuditSeed | null {
  const name = String(clientName ?? '');
  for (const { match, seed } of SEEDS) if (match.test(name)) return seed;
  return null;
}
