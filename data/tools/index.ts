import registry from "./registry.json";

export interface ToolRegistryEntry {
  name: string;
  category: "academic_search" | "general_search" | "ai_assistant" | "database" | "other";
  url: string;
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
  review?: {
    verdict: string;
    scores: { TR: number; RE: number; US: number; SE: number; TC: number };
    total: number;
    totalMax: number;
    status: string;
    notes: string;
  };
}

export const TOOL_REGISTRY: ToolRegistryEntry[] = registry as ToolRegistryEntry[];
