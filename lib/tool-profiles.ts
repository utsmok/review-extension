import { TOOL_REGISTRY } from "@/data/tools";

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

export const TOOL_PROFILES: ToolProfile[] = TOOL_REGISTRY.filter((t) => t.hostnames.length > 0).map(
  (t) => ({ hostnames: t.hostnames, defaults: t.defaults, category: t.category }),
);

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
