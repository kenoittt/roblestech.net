/*
 * Per-client content seeds.
 *
 * These are a client's own dashboard contents — hero copy, frozen baseline,
 * AI visibility audit, open items, brand palette. They used to sit as default
 * literals inside the shared dashboard template, which meant one client's data
 * and narrative shipped inside every other client's page and inside the public
 * /demo. Keeping them here, keyed by client, means the template carries no
 * client data at all and a seed only reaches the client it belongs to.
 *
 * A seed is a fallback, never an override: anything saved in the client's
 * stored config wins over what is here. Once a client's content is fully
 * stored through the admin panel, their entry can be deleted.
 */

export type ClientSeed = {
  propertyLabel?: string;
  hero?: Record<string, string>;
  baseline?: Record<string, unknown>;
  aiAudit?: Record<string, unknown>;
  aiAuditHistory?: Record<string, unknown>[];
  openItems?: { pri: string; text: string }[];
  theme?: Record<string, string>;
};

/* Promix Nutrition — engagement content through the August 2026 audit round. */
const PROMIX: ClientSeed = {
  "propertyLabel": "promixnutrition.com",
  "hero": {
    "eyebrow": "Promix Nutrition · SEO + GEO",
    "title": "Post Performance & GEO Dashboard",
    "docTitle": "Promix Nutrition · Post Performance & GEO Dashboard"
  },
  "baseline": {
    "window": "June 1 - 30, 2026",
    "serviceStart": "July 1, 2026",
    "captured": "2026-07-18",
    "clicks": 38800,
    "impr": 939000,
    "ctr": "4.1%",
    "avgPos": "7.9",
    "postsLive": 0,
    "aiText": "5 / 40",
    "aiSub": "June audit, 10 Qs x 4 engines (12.5%)",
    "pages": [
      {
        "page": "promixnutrition.com/ (homepage)",
        "clicks": 16327,
        "impr": 251479
      },
      {
        "page": "/products/debloat-prebiotic-probiotic",
        "clicks": 3062,
        "impr": 119759
      },
      {
        "page": "/collections/protein-powder",
        "clicks": 2630,
        "impr": 102987
      },
      {
        "page": "/pages/protein-calculator",
        "clicks": 1731,
        "impr": 162085
      },
      {
        "page": "/pages/coupon-codes",
        "clicks": 763,
        "impr": 8266
      },
      {
        "page": "/products/protein-puff-bars-variety-pack",
        "clicks": 751,
        "impr": 26538
      },
      {
        "page": "/products/electrolyte-drink-mix-variety-pack",
        "clicks": 622,
        "impr": 12457
      },
      {
        "page": "/products/creatine",
        "clicks": 425,
        "impr": 31582
      },
      {
        "page": "/products/unflavored-whey-protein-isolate",
        "clicks": 423,
        "impr": 22516
      },
      {
        "page": "/en-ca/collections/protein-supplements",
        "clicks": 400,
        "impr": 4812
      }
    ]
  },
  "aiAudit": {
    "round": "Round 3",
    "tested": "August 27, 2026",
    "period": "2026-08-01",
    "totalChecks": 80,
    "visibleChecks": 7,
    "rate": "8.75%",
    "scorecard": [
      {
        "channel": "Google",
        "checks": 20,
        "visible": 3,
        "rate": "15%"
      },
      {
        "channel": "ChatGPT",
        "checks": 20,
        "visible": 0,
        "rate": "0%"
      },
      {
        "channel": "Gemini",
        "checks": 20,
        "visible": 4,
        "rate": "20%"
      },
      {
        "channel": "Perplexity",
        "checks": 20,
        "visible": 0,
        "rate": "0%"
      }
    ],
    "intent": [
      {
        "group": "Buying-intent",
        "visible": 3,
        "of": 20
      }
    ],
    "note": "Promix now shows up for 7 of 80 checks. That is 8.75% visibility across Google and the three major AI answer engines, up from 3 of 80 (3.75%) in July — visibility more than doubled in one month. For the first time in this engagement Promix holds #1 rankings: two of them, both on the isolate-vs-concentrate question the July report flagged as a priority. This is the first round measured after Month 1 content began publishing.",
    "intentNote": "Buying-intent visibility held at 3 of 20, but every one of the three is a different check than last month.",
    "method": "20 questions × 4 platforms = 80 checks, all run on August 27, 2026. Searches were tested word for word as a shopper would type them, never naming Promix. Engines audited: Google, ChatGPT, Gemini, Perplexity.",
    "wins": [
      "Q3 Gemini, top spot, held from June with richer detail. Promix's own phrase \"zero artificial anything\" survives inside Gemini's answer.",
      "Q3 ChatGPT, passing mention, held but demoted from a ranked 3rd pick to a mention.",
      "Q9 Gemini, ranked 5th, NEW WIN. Promix's first electrolyte visibility ever, earned via The Feed's third-party roundup, not the Promix site. Proof the PR lever moves AI answers."
    ],
    "groups": [
      {
        "name": "Problem-aware questions (Q1, Q2, Q7, Q11, Q12)",
        "insight": "0 of 20, unchanged in character: clinics, institutions and health media own the fear questions. Two details worth logging. On Q7, Perplexity's lead source is now MyProteinCalc, a bare calculator page — more evidence the protein-calculator play is the right answer format here. And Q11 remains the most winnable question in the set: the brands cited (Wellversed, Innermost, Nutrition Now) are far smaller than Promix, and the Promix answer page has not published yet.",
        "rows": [
          {
            "n": 1,
            "q": "Why do I feel bloated after taking protein powder?",
            "g": "No",
            "c": "No",
            "ge": "No",
            "p": "No",
            "won": "Premier Protein (Google and Perplexity), Grounded Shakes, Shnack, Healthline, Ubie Health, Naked Nutrition; Gemini named no brands"
          },
          {
            "n": 2,
            "q": "Are artificial sweeteners in supplements bad for you?",
            "g": "No",
            "c": "No",
            "ge": "No",
            "p": "No",
            "won": "Johns Hopkins Medicine, Mayo Clinic, Ohio State Health & Discovery, US FDA, WHO, Healthline"
          },
          {
            "n": 7,
            "q": "How much protein do I actually need per day to build muscle?",
            "g": "No",
            "c": "No",
            "ge": "No",
            "p": "No",
            "won": "Examine.com, Harvard, Mayo Clinic, PubMed; MyProteinCalc now leads Perplexity with its own calculator; Yazen, Verywell Health"
          },
          {
            "n": 11,
            "q": "Why does pre workout make my skin itch?",
            "g": "No",
            "c": "No",
            "ge": "No",
            "p": "No",
            "won": "Boots, Nutrition Now, Medical News Today, Ubie, Innermost, Wellversed (Gemini and Perplexity), Acibadem International, Welltech"
          },
          {
            "n": 12,
            "q": "Do I actually need an electrolyte powder, or can I get electrolytes from food?",
            "g": "No",
            "c": "No",
            "ge": "No",
            "p": "No",
            "won": "ZOE, Banner Health, BBC, NHS.uk, ACSM, NYIT, Science Insight; Gemini cited no sources"
          }
        ]
      },
      {
        "name": "Comparison questions (Q4, Q13, Q14, Q15, Q16)",
        "insight": "From 0 of 20 in July to 3 of 20 in August, and the three wins are exactly where Month 1 aimed. Q15 is the headline of the whole audit: Promix now holds #1 on both Google and Gemini for isolate vs concentrate, and NWP Supplements, which held Google #1 in July, has dropped out of the top 3 entirely — a same-quarter displacement. Q14 adds a Gemini #2 on the creatine shortlist question that was invisible in all 80 prior checks. Q13, Q16 and Q4 remain open, and ChatGPT's comparison answers stayed brandless across the board.",
        "rows": [
          {
            "n": 4,
            "q": "Grass-fed whey vs regular whey protein",
            "g": "No",
            "c": "No",
            "ge": "No",
            "p": "No",
            "won": "ThatsAllProtein, BarBend (Google and Gemini), Healthfarm Nutrition, RAW Nutrition, Momentous, FeastGood, 1st Phorm; ChatGPT's answer went brandless"
          },
          {
            "n": 13,
            "q": "Casein vs whey: which should I take at night?",
            "g": "No",
            "c": "No",
            "ge": "No",
            "p": "No",
            "won": "NIH, Nutrition X (Google and Perplexity's lead source, holding from July), ProSupps, BodyScienceReview, Tafity; ChatGPT and Gemini cited no sources"
          },
          {
            "n": 14,
            "q": "Creatine monohydrate vs HCL: which is better?",
            "g": "No",
            "c": "No",
            "ge": "Yes, 2nd (NEW WIN)",
            "p": "No",
            "won": "Health.com, Gainful, iHerb on Google; on Gemini, Nutri Partners sits ahead of Promix and Jinfiniti behind; FitChef, Fit.Thicket, YourHealthier on Perplexity"
          },
          {
            "n": 15,
            "q": "Whey isolate vs concentrate: which is easier on the stomach?",
            "g": "Yes, 1st (NEW WIN)",
            "c": "No",
            "ge": "Yes, 1st (NEW WIN)",
            "p": "No",
            "won": "Xwerks 2nd behind Promix on both Google and Gemini; Naked Nutrition, VPA Australia; Alibaba, PaleoPro, OreateAI on Perplexity. NWP Supplements, July's Google #1, is out of every top 3"
          },
          {
            "n": 16,
            "q": "Collagen vs whey protein: do I need both?",
            "g": "No",
            "c": "No",
            "ge": "No",
            "p": "No",
            "won": "Naked Nutrition (Google and Perplexity), Transparent Labs (Google and Gemini), PubMed, SpringerLink, Chief Nutrition, Optimum Nutrition, Health.com"
          }
        ]
      },
      {
        "name": "How-to and safety questions (Q8, Q17, Q18, Q19, Q20)",
        "insight": "1 of 20, and it is the one that matters most: Q20, the third-party-testing trust question, now names Promix 2nd on Gemini. In July, Rho Nutrition owned this question on Perplexity; in August, Rho has vanished from every top-3 list and Promix is the brand Gemini cites. Google (Harvard, NSF, GoodRx) and Perplexity (USP, NSF, USADA) still default to institutions. The creatine safety pair, Q17 and Q18, remains medical-authority territory, and Q19 is still Gainful's on Google.",
        "rows": [
          {
            "n": 8,
            "q": "When should I take creatine for best results?",
            "g": "No",
            "c": "No",
            "ge": "No",
            "p": "No",
            "won": "Healthline (Google and Gemini), Myprotein, Medical News Today, SpringerLink, Doctronic, Boots, All About Creatine, Transparent Labs cited on Perplexity"
          },
          {
            "n": 17,
            "q": "Does creatine make you gain weight?",
            "g": "No",
            "c": "No",
            "ge": "No",
            "p": "No",
            "won": "Healthline, InBody USA, Ubie Health (Google and Perplexity), NIH ODS, Men's Health, Cleveland Clinic; Gemini cited no sources"
          },
          {
            "n": 18,
            "q": "Does creatine cause hair loss?",
            "g": "No",
            "c": "No",
            "ge": "No",
            "p": "No",
            "won": "DNA Skin Clinic, Western Reserve Dermatology, NIH, PubMed (ChatGPT and Perplexity), Ubie, Vinci Hair Clinic, Cleveland Clinic, Examine.com"
          },
          {
            "n": 19,
            "q": "Is whey protein OK if I'm lactose intolerant?",
            "g": "No",
            "c": "No",
            "ge": "No",
            "p": "No",
            "won": "Gainful still at Google #1, Bulk Nutrients, VPA Australia (Google and Gemini), BearWell, GNC; Cleveland Clinic and NIDDK on both ChatGPT and Perplexity"
          },
          {
            "n": 20,
            "q": "How do I know if a supplement is actually third party tested?",
            "g": "No",
            "c": "No",
            "ge": "Yes, 2nd (NEW WIN)",
            "p": "No",
            "won": "GoodRx (Google, and behind Promix on Gemini), Harvard Health, NSF (cited on three engines), Vedic Nutrition ahead of Promix on Gemini, USP, USADA. Rho Nutrition, July's Perplexity leader, is gone"
          }
        ]
      },
      {
        "name": "Buying-intent questions (Q3, Q5, Q6, Q9, Q10)",
        "insight": "3 of 20 again, but the composition flipped completely. Gained: Q6 is back on Google page 1 at 4th, its strongest position in this audit, plus a first-ever Gemini citation at 3rd; and Q10 delivers the first transactional-search win of the engagement at Google 3rd. Lost: Q3, the positioning query that had been Promix's most reliable win, went dark on both ChatGPT and Gemini, with Naked Nutrition now cited across all four engines; and the Q9 Gemini citation earned via The Feed in July has faded, confirming that PR-driven citations decay without reinforcement. Q5 stays locked by Thorne, Transparent Labs and Optimum Nutrition via publisher listicles.",
        "rows": [
          {
            "n": 3,
            "q": "Cleanest protein powder with no fillers or additives",
            "g": "No",
            "c": "No (July: Yes, mention)",
            "ge": "No (July: Yes, top)",
            "p": "No",
            "won": "Naked Nutrition on all four platforms; Sunwarrior UK, Transparent Labs, BulkSupplements, California Gold Nutrition, Isopure, Truvani, NOW Foods"
          },
          {
            "n": 5,
            "q": "Best creatine powder 2026",
            "g": "No",
            "c": "No",
            "ge": "No",
            "p": "No",
            "won": "Transparent Labs (Google, Gemini, Perplexity), Thorne (ChatGPT, Gemini, Perplexity), Optimum Nutrition, Swolverine, Nutricost, Naked Nutrition, 1st Phorm"
          },
          {
            "n": 6,
            "q": "Best natural pre-workout without artificial dyes",
            "g": "Yes, 4th (July: No)",
            "c": "No",
            "ge": "Yes, 3rd (NEW WIN)",
            "p": "No",
            "won": "Legion Athletics Pulse at Google #1 and cited on ChatGPT and Gemini; Naked Nutrition, Honey Badger, RAW Nutrition, NDS, Transparent Labs (Gemini and Perplexity), RSP"
          },
          {
            "n": 9,
            "q": "Best electrolyte powder no sugar",
            "g": "No",
            "c": "No",
            "ge": "No (July: Yes, 5th via The Feed)",
            "p": "No",
            "won": "LMNT (Google, ChatGPT, Perplexity), Ultima, Transparent Labs (all four platforms), Thorne, Topvitamine, Everyday Health, Men's Health"
          },
          {
            "n": 10,
            "q": "Buy non-GMO grass-fed protein powder online",
            "g": "Yes, 3rd (NEW WIN)",
            "c": "No",
            "ge": "No",
            "p": "No",
            "won": "Raw Organic Whey at Google #1 and on Gemini, Transparent Labs (Google and Perplexity), Naked Whey / Naked Nutrition, AGN Roots, Pouri, iHerb, Legion, Natural Force Organic"
          }
        ]
      }
    ]
  },
  "aiAuditHistory": [
    {
      "round": "Round 2",
      "tested": "July 2-3, 2026",
      "period": "2026-07-01",
      "totalChecks": 80,
      "visibleChecks": 3,
      "rate": "3.75%",
      "scorecard": [
        {
          "channel": "Google",
          "checks": 20,
          "visible": 0,
          "rate": "0%"
        },
        {
          "channel": "ChatGPT",
          "checks": 20,
          "visible": 1,
          "rate": "5%"
        },
        {
          "channel": "Gemini",
          "checks": 20,
          "visible": 2,
          "rate": "10%"
        },
        {
          "channel": "Perplexity",
          "checks": 20,
          "visible": 0,
          "rate": "0%"
        }
      ]
    }
  ],
  "openItems": [
    {
      "pri": "HIGH",
      "text": "Publish the first optimized post and run the 7-step post-publish SOP against it."
    },
    {
      "pri": "HIGH",
      "text": "Ship the comparison cluster first (Q13-Q16 + Q4): five posts where competitors are provably citable and Promix can answer both sides. Fastest path from publish to citation."
    },
    {
      "pri": "MED",
      "text": "July AI visibility audit is loaded (3/80, round 2). Next: re-run the 20-question audit monthly and start per-post AI tracking as posts ship. File the two pending Q1 screenshots (Gemini, Perplexity)."
    },
    {
      "pri": "MED",
      "text": "Set up the Google Drive shared copy and point the daily refresh at keeping it current."
    },
    {
      "pri": "LOW",
      "text": "First GSC baseline captured 2026-07-18. Verify the scheduled weekday refresh (7:04 AM) runs clean on Monday."
    },
    {
      "pri": "LOW",
      "text": "Optional: self-host Promix's real typeface (mr-eaves-xl-sans) in the standalone HTML file. Not possible in the artifact sandbox."
    }
  ],
  "theme": {
    "brand": "#53001C",
    "brand-dark": "#3E0016",
    "accent": "#34657F",
    "chart-2": "#34657F",
    "navy-deep": "#2E1D14",
    "ink-black": "#232323",
    "steel": "#6a6058",
    "muted": "#7a736a",
    "ink": "#333333",
    "green-dark": "#4e7a51",
    "green": "#e4efe0",
    "offwhite": "#FDF6EB",
    "surface-2": "#F9EFE2",
    "line": "#EADDCB",
    "rtc-lime": "#E9C9A7",
    "badge-no-fg": "#53001C",
    "badge-no-bg": "#F3E2E2",
    "badge-live-bg": "#F6E8EC",
    "font": "'Helvetica Neue','Segoe UI',system-ui,-apple-system,Arial,sans-serif"
  }
};

const SEEDS: { match: RegExp; seed: ClientSeed }[] = [
  { match: /promix/i, seed: PROMIX },
];

/** Seeded dashboard content for a client, or null when there is none. */
export function clientSeedFor(clientName: string): ClientSeed | null {
  const name = String(clientName ?? "");
  for (const { match, seed } of SEEDS) if (match.test(name)) return seed;
  return null;
}
