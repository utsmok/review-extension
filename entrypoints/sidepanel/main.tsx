import React from "react";
import { createRoot } from "react-dom/client";
import App from "@/components/App";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { applyBrandingTokens, applyPrincipleTokens } from "@/lib/framework-config";
import { useFrameworkCustomizationStore } from "@/stores/framework-customization";
import "./style.css";

// Inject framework principle/branding colors as CSS custom properties at boot,
// and re-apply whenever the user customizes the framework (live theme updates).
applyPrincipleTokens();
applyBrandingTokens();
useFrameworkCustomizationStore.subscribe(() => {
  applyPrincipleTokens();
  applyBrandingTokens();
});

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element not found");
createRoot(rootEl).render(
  <ErrorBoundary>
    <React.StrictMode>
      <App />
    </React.StrictMode>
  </ErrorBoundary>,
);
