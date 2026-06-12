export interface ToolProfile {
  hostnames: string[];
  defaults: {
    company?: string;
    usesAi?: boolean;
    dataSources?: string[];
    searchMethods?: string[];
    discipline?: string[];
    pricing?: string;
    availability?: string;
    authenticationMethod?: string;
  };
  category: "academic_search" | "general_search" | "ai_assistant" | "database" | "other";
}

export const TOOL_PROFILES: ToolProfile[] = [
  {
    hostnames: ["semanticscholar.org"],
    defaults: {
      company: "Allen Institute for AI",
      usesAi: true,
      dataSources: ["Peer-reviewed papers", "Preprints"],
      searchMethods: ["Semantic search", "Keyword search"],
      discipline: ["Multidisciplinary"],
      pricing: "Free",
      availability: "Open access",
      authenticationMethod: "None required",
    },
    category: "academic_search",
  },
  {
    hostnames: ["elicit.com"],
    defaults: {
      company: "Elicit",
      usesAi: true,
      dataSources: ["Peer-reviewed papers"],
      searchMethods: ["Natural language queries", "Semantic search"],
      discipline: ["Multidisciplinary"],
      pricing: "Freemium",
      availability: "Open access",
      authenticationMethod: "Email",
    },
    category: "academic_search",
  },
  {
    hostnames: ["consensus.app"],
    defaults: {
      company: "Consensus",
      usesAi: true,
      dataSources: ["Peer-reviewed papers"],
      searchMethods: ["Natural language queries"],
      discipline: ["Multidisciplinary"],
      pricing: "Freemium",
    },
    category: "academic_search",
  },
  {
    hostnames: ["asta.ai2.dev", "allennlp.org"],
    defaults: {
      company: "Allen Institute for AI",
      usesAi: true,
      dataSources: ["Peer-reviewed papers"],
      searchMethods: ["Semantic search"],
      discipline: ["Multidisciplinary"],
      pricing: "Free",
      availability: "Open access",
    },
    category: "academic_search",
  },
  {
    hostnames: ["scholar.google.com"],
    defaults: {
      company: "Google",
      usesAi: false,
      dataSources: ["Peer-reviewed papers", "Preprints", "Theses", "Books"],
      searchMethods: ["Keyword search", "Citation search"],
      discipline: ["Multidisciplinary"],
      pricing: "Free",
      availability: "Open access",
    },
    category: "academic_search",
  },
  {
    hostnames: ["webofscience.com"],
    defaults: {
      company: "Clarivate",
      usesAi: false,
      dataSources: ["Peer-reviewed papers", "Conference proceedings"],
      searchMethods: ["Keyword search", "Citation search"],
      discipline: ["Multidisciplinary"],
      pricing: "Subscription",
      availability: "Institutional access",
    },
    category: "academic_search",
  },
  {
    hostnames: ["scopus.com"],
    defaults: {
      company: "Elsevier",
      usesAi: false,
      dataSources: ["Peer-reviewed papers", "Conference proceedings"],
      searchMethods: ["Keyword search", "Citation search"],
      discipline: ["Multidisciplinary"],
      pricing: "Subscription",
      availability: "Institutional access",
    },
    category: "academic_search",
  },
  {
    hostnames: ["pubmed.ncbi.nlm.nih.gov"],
    defaults: {
      company: "NIH/NLM",
      usesAi: false,
      dataSources: ["Peer-reviewed papers", "Preprints"],
      searchMethods: ["Keyword search", "MeSH terms"],
      discipline: ["Biomedical", "Life sciences"],
      pricing: "Free",
      availability: "Open access",
    },
    category: "academic_search",
  },
  {
    hostnames: ["jstor.org"],
    defaults: {
      company: "ITHAKA",
      usesAi: false,
      dataSources: ["Peer-reviewed papers", "Books"],
      searchMethods: ["Keyword search", "Full-text search"],
      discipline: ["Humanities", "Social sciences"],
      pricing: "Subscription",
      availability: "Institutional access",
    },
    category: "academic_search",
  },
  {
    hostnames: ["base-search.net"],
    defaults: {
      company: "Bielefeld University Library",
      usesAi: false,
      dataSources: ["Peer-reviewed papers", "Preprints", "Theses"],
      searchMethods: ["Keyword search"],
      discipline: ["Multidisciplinary"],
      pricing: "Free",
      availability: "Open access",
    },
    category: "academic_search",
  },
  {
    hostnames: ["core.ac.uk"],
    defaults: {
      company: "Open University",
      usesAi: false,
      dataSources: ["Peer-reviewed papers", "Preprints"],
      searchMethods: ["Keyword search"],
      discipline: ["Multidisciplinary"],
      pricing: "Free",
      availability: "Open access",
    },
    category: "academic_search",
  },
  {
    hostnames: ["app.dimensions.ai"],
    defaults: {
      company: "Digital Science",
      usesAi: true,
      dataSources: ["Peer-reviewed papers", "Patents", "Clinical trials"],
      searchMethods: ["Keyword search", "Semantic search"],
      discipline: ["Multidisciplinary"],
      pricing: "Freemium",
      availability: "Open access",
    },
    category: "academic_search",
  },
  {
    hostnames: ["proquest.com"],
    defaults: {
      company: "Clarivate",
      usesAi: false,
      dataSources: ["Peer-reviewed papers", "Dissertations", "Newspapers"],
      searchMethods: ["Keyword search", "Boolean search"],
      discipline: ["Multidisciplinary"],
      pricing: "Subscription",
      availability: "Institutional access",
    },
    category: "academic_search",
  },
  {
    hostnames: ["ebsco.com", "search.ebscohost.com"],
    defaults: {
      company: "EBSCO",
      usesAi: false,
      dataSources: ["Peer-reviewed papers", "Magazines", "Books"],
      searchMethods: ["Keyword search", "Boolean search"],
      discipline: ["Multidisciplinary"],
      pricing: "Subscription",
      availability: "Institutional access",
    },
    category: "academic_search",
  },
  {
    hostnames: ["perplexity.ai"],
    defaults: {
      company: "Perplexity AI",
      usesAi: true,
      dataSources: ["Web search", "Peer-reviewed papers"],
      searchMethods: ["Natural language queries"],
      discipline: ["Multidisciplinary"],
      pricing: "Freemium",
    },
    category: "ai_assistant",
  },
];

export function detectToolProfile(url: string): ToolProfile | null {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    return (
      TOOL_PROFILES.find((p) =>
        p.hostnames.some((h) => hostname === h || hostname.endsWith(`.${h}`)),
      ) ?? null
    );
  } catch {
    return null;
  }
}
