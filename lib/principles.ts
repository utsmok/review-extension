export const PRINCIPLES = [
  { id: "TR", code: "TR", color: "#2563eb" },
  { id: "RE", code: "RE", color: "#16a34a" },
  { id: "US", code: "US", color: "#9333ea" },
  { id: "SE", code: "SE", color: "#ea580c" },
  { id: "TC", code: "TC", color: "#0d9488" },
] as const;

export const PRINCIPLE_COLORS: Readonly<Record<string, string>> = {
  ...Object.fromEntries(PRINCIPLES.map((p) => [p.id, p.color])),
  control: "#002c5f",
};
