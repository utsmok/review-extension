import { FRAMEWORK_CONFIG } from "@/data/framework";
import type { FrameworkBranding } from "@/lib/types";

/** Shipped branding (logos injected from lib/logos.ts at config load). */
export const BRANDING: FrameworkBranding = FRAMEWORK_CONFIG.branding;

export { applyBrandingTokens, getActiveBranding, getReportBranding } from "@/lib/framework-config";
