import type { ToolProfile } from "./tool-profiles";

export interface TestQuery {
  query: string;
  purpose: string;
}

const ACADEMIC_SEARCH_QUERIES: TestQuery[] = [
  {
    query: "climate change adaptation strategies in coastal cities",
    purpose: "Cross-disciplinary coverage",
  },
  {
    query: "machine learning bias in healthcare diagnostics",
    purpose: "AI ethics and bias detection",
  },
  {
    query: "quantum computing error correction methods 2024",
    purpose: "Recent publication coverage",
  },
  {
    query: "systematic review meta-analysis social media mental health",
    purpose: "Synthesis quality",
  },
  {
    query: "bibliometric analysis renewable energy research trends",
    purpose: "Citation and metrics handling",
  },
  {
    query: "action research community development sub-saharan africa",
    purpose: "Regional and niche coverage",
  },
];

const AI_ASSISTANT_QUERIES: TestQuery[] = [
  {
    query: "What are the latest treatments for type 2 diabetes?",
    purpose: "Medical accuracy",
  },
  {
    query: "Compare BERT and GPT architectures for NLP tasks",
    purpose: "Technical depth",
  },
  {
    query: "Summarize the debate on social media regulation",
    purpose: "Balanced perspective",
  },
  {
    query: "How does CRISPR gene editing work?",
    purpose: "Explanatory quality",
  },
];

export function getSuggestedQueries(
  category: ToolProfile["category"],
): TestQuery[] {
  switch (category) {
    case "academic_search":
    case "database":
      return ACADEMIC_SEARCH_QUERIES.slice(0, 6);
    case "ai_assistant":
      return AI_ASSISTANT_QUERIES.slice(0, 4);
    default:
      return ACADEMIC_SEARCH_QUERIES.slice(0, 4);
  }
}
