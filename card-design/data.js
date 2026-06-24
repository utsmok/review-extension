/* Canonical content for every card proposal — the real AI2 Asta review.
   Proposals INLINE these values into static markup (no JS-timing risk on
   screenshot). This file is the reference for exact copy + numbers. */
window.REVIEW = {
  tool: "AI2 Asta",
  company: "Allen Institute for AI",
  url: "asta.ai",
  descriptor: "AI academic search over the Semantic Scholar corpus",
  dataSources: ["Peer-reviewed papers", "Preprints"],
  pricing: "Free \u00b7 Open access",

  verdict: "RECOMMENDED",
  verdictKey: "recommended", // → --v-recommended (green)
  verdictTone: "A confident pass.",

  principles: [
    { code: "TR", name: "Transparent", score: 2.5, color: "var(--c-tr)" },
    { code: "RE", name: "Reliable", score: 3.0, color: "var(--c-re)" },
    { code: "US", name: "User-centric", score: 2.5, color: "var(--c-us)" },
    { code: "SE", name: "Soundness", score: 2.5, color: "var(--c-se)" },
    { code: "TC", name: "Traceable", score: 3.0, color: "var(--c-tc)" },
  ],
  total: 13.5, // sum of principle averages
  totalMax: 15, // 5 principles \u00d7 3

  strength:
    "Restricts outputs to the verifiable Semantic Scholar corpus and exposes its reasoning chain.",
  weakness: "Ranking methodology is not fully disclosed, capping Transparency.",
  note: "Excels in Traceability and Reliability.",

  reviewer: "Two information specialists \u00b7 shared verdict",
  date: "2026",
  venue: "LIBER 2026 \u00b7 Trondheim",
  framework: "TRUST Framework v1.1",

  oneliner: "A framework for evaluating AI-based search tools.",
  hubUrl: "https://trust.samuelmok.cc/tools/ai2-asta",
};
