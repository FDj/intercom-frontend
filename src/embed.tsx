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

  // Create a wrapper for scaling if it doesn't exist
  let scaleWrapper = container.querySelector('.intercom-scale-wrapper') as HTMLElement;
  if (!scaleWrapper) {
    scaleWrapper = document.createElement('div');
    scaleWrapper.className = 'intercom-scale-wrapper loading'; // Add loading class initially
    container.appendChild(scaleWrapper);

    // Create a placeholder
    const placeholder = document.createElement('div');
    placeholder.className = 'intercom-embed-placeholder';
    placeholder.innerHTML = '<div class="spinner"></div>';
    container.appendChild(placeholder);

    // Initial fixed height for placeholder (around 80px)
    container.style.height = '80px';

    // Remove loading state after 2 seconds
    setTimeout(() => {
      scaleWrapper.classList.remove('loading');
      if (placeholder.parentNode) {
        placeholder.parentNode.removeChild(placeholder);
      }
      adjustHeight();
    }, 2000);
  }

  // Set up height adjustment for scaled content
  const adjustHeight = () => {
    // Don't adjust height if still loading
    if (scaleWrapper.classList.contains('loading')) {
      return;
    }

    // Reset height to auto first to get accurate measurement
    container.style.height = 'auto';
    
    // Use the scaleWrapper's scrollHeight as it contains the scaled content
    const contentHeight = scaleWrapper.scrollHeight;
    
    // Set the container height to 50% of the content height to match the 0.5 scale
    // Add a slightly larger buffer (4px) to prevent clipping
    const scaledHeight = Math.ceil(contentHeight * 0.5) + 4;
    container.style.height = `${scaledHeight}px`;
    
    // Ensure the first child (React app root) doesn't clip
    const contentElement = scaleWrapper.firstChild as HTMLElement;
    if (contentElement) {
      contentElement.style.height = 'auto';
      contentElement.style.overflow = 'visible';
    }
  };

  // Mount the React app into the scale wrapper
  const root = ReactDOM.createRoot(scaleWrapper);
  root.render(
    <React.StrictMode>
      <EmbeddedApp initialPath={uri} />
    </React.StrictMode>
  );

  // Use ResizeObserver to detect content changes and adjust height
  const resizeObserver = new ResizeObserver(() => {
    adjustHeight();
  });

  // Observe the scaleWrapper itself to detect content changes
  const observerInterval = setInterval(() => {
    if (scaleWrapper) {
      resizeObserver.observe(scaleWrapper);
      clearInterval(observerInterval);
    }
  }, 100);

  // Initial adjustment
  setTimeout(adjustHeight, 1000);
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
