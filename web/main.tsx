import React from "react";
import { createRoot } from "react-dom/client";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { installBrowserShim } from "./shims/chrome";
import WebApp from "./WebApp";
import "./style.css";

// Install browser API shim before any module that references `browser` global
installBrowserShim();

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element not found");
createRoot(rootEl).render(
  <ErrorBoundary>
    <React.StrictMode>
      <WebApp />
    </React.StrictMode>
  </ErrorBoundary>,
);
