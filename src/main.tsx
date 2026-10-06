import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import App from "./App";
import { publicBootstrap } from "./seo/client";
import "./index.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found");
}

const application = (
  <StrictMode>
    <App />
  </StrictMode>
);

// Public pages already have usable, styled HTML and their exact public data.
// Reuse those nodes rather than clearing the SSR tree and replaying the page.
if (publicBootstrap() && root.hasChildNodes()) {
  hydrateRoot(root, application);
} else {
  // Private routes retain client rendering and never hydrate session data.
  createRoot(root).render(application);
}
