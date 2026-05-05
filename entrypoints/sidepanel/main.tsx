import React from "react";
import { createRoot } from "react-dom/client";
import App from "@/components/App";
import ErrorBoundary from "@/components/ErrorBoundary";
import "./style.css";

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <React.StrictMode>
      <App />
    </React.StrictMode>
  </ErrorBoundary>,
);
