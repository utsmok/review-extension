import React from "react";
import { createRoot } from "react-dom/client";
import App from "@/components/App";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import "./style.css";

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element not found");
createRoot(rootEl).render(
  <ErrorBoundary>
    <React.StrictMode>
      <App />
    </React.StrictMode>
  </ErrorBoundary>,
);
