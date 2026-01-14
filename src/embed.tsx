import React from "react";
import ReactDOM from "react-dom/client";
import { MemoryRouter } from "react-router";
import App from "./App.tsx";
import "./embed.css";

// Wrapper component that uses MemoryRouter for embedded mode
function EmbeddedApp({ initialPath }: { initialPath?: string }) {
  const initialEntries = initialPath ? [`/${initialPath}`] : ["/"];

  return (
    <MemoryRouter initialEntries={initialEntries}>
      <App />
    </MemoryRouter>
  );
}

// Function to initialize the embedded app
function initIntercomEmbed(containerId: string) {
  const container = document.getElementById(containerId);

  if (!container) {
    console.error(`Container with id "${containerId}" not found`);
    return;
  }

  // Read data attributes
  const declutter = container.dataset.declutter === "true";
  const username = container.dataset.username || "";
  const kiosk = container.dataset.kiosk === "true";
  const uri = container.dataset.uri || "";

  // Store in sessionStorage for the app to access
  if (declutter) {
    sessionStorage.setItem("declutter", "true");
  }
  if (username) {
    sessionStorage.setItem("username", username);
  }
  if (kiosk) {
    sessionStorage.setItem("kiosk", "true");
  }
  if (uri) {
    sessionStorage.setItem("uri", uri);
  }

  // Mount the React app
  const root = ReactDOM.createRoot(container);
  root.render(
    <React.StrictMode>
      <EmbeddedApp initialPath={uri} />
    </React.StrictMode>
  );
}

// Auto-initialize all containers with data-intercom-embed
document.addEventListener("DOMContentLoaded", () => {
  const containers = document.querySelectorAll("[data-intercom-embed]");
  containers.forEach((container) => {
    if (container.id) {
      initIntercomEmbed(container.id);
    } else {
      console.warn("Intercom embed container found without an ID", container);
    }
  });
});

// Export for manual initialization
(window as any).initIntercomEmbed = initIntercomEmbed;
