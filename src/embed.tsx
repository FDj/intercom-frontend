import React from "react";
import ReactDOM from "react-dom/client";
import { MemoryRouter } from "react-router";
import App from "./App.tsx";
// import "./embed.css"; // Moved to injectStyles() to keep embed.js self-contained

// Function to inject CSS into the head
function injectStyles() {
  const styleId = "intercom-embed-styles";
  if (document.getElementById(styleId)) return;

  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `
/* Scoped styles for embedded intercom app */
[data-intercom-embed] {
  /* Container base styles */
  font-size: 100%;
  box-sizing: border-box;
  overflow: hidden;
  /* Height is dynamically adjusted in embed.js/tsx to avoid vertical gaps */
  display: block;
  position: relative; /* Added to contain absolute placeholder */
  margin-bottom: 0;
}

/* Extra wrapper for scaling to avoid layout issues with the host container */
.intercom-scale-wrapper {
  /* Scale down to 50% as requested */
  transform: scale(0.50);
  transform-origin: top left;
  width: 200%; /* Compensate for scale: 100% / 0.50 */
  display: block;
}

/* Inner wrapper styles */
.intercom-scale-wrapper > div {
  font-size: 1.6rem;
  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;
  color-scheme: light dark;
  color: rgba(255, 255, 255, 0.87);
  background-color: transparent !important; /* Force transparency to avoid mismatch */
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  height: auto;
  min-height: 100%;
  overflow: visible !important; /* Ensure content is not clipped by the wrapper */
  transition: opacity 0.3s ease-in-out;
  box-sizing: border-box;
}

.intercom-scale-wrapper.loading > div {
  opacity: 0;
  pointer-events: none;
}

.intercom-embed-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  /*background-color: #242424;*/
  color: #9e9e9e;
  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
  font-size: 1.4rem;
  z-index: 10;
  border-radius: 0.5rem;
  box-sizing: border-box;
  /*border: 1px solid #424242;*/
}

.intercom-embed-placeholder .spinner {
  border: 0.3rem solid rgba(255, 255, 255, 0.1);
  border-top: 0.3rem solid #e2e2e2;
  border-radius: 50%;
  width: 1rem;
  height: 1rem;
  animation: spin 1s linear infinite;
  margin-right: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@-webkit-keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@-moz-keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.intercom-scale-wrapper *,
.intercom-scale-wrapper *:before,
.intercom-scale-wrapper *:after {
  box-sizing: inherit;
  -moz-osx-font-smoothing: grayscale;
  -webkit-font-smoothing: antialiased;
  font-smoothing: antialiased;
}

/* Minimal reset - only reset what's necessary and won't break styled-components */

.intercom-scale-wrapper article,
.intercom-scale-wrapper aside,
.intercom-scale-wrapper details,
.intercom-scale-wrapper figcaption,
.intercom-scale-wrapper figure,
.intercom-scale-wrapper footer,
.intercom-scale-wrapper header,
.intercom-scale-wrapper hgroup,
.intercom-scale-wrapper menu,
.intercom-scale-wrapper nav,
.intercom-scale-wrapper section {
  display: block;
}

.intercom-scale-wrapper ol,
.intercom-scale-wrapper ul {
  list-style: none;
}

.intercom-scale-wrapper blockquote,
.intercom-scale-wrapper q {
  quotes: none;
}

.intercom-scale-wrapper blockquote:before,
.intercom-scale-wrapper blockquote:after,
.intercom-scale-wrapper q:before,
.intercom-scale-wrapper q:after {
  content: "";
  content: none;
}

.intercom-scale-wrapper table {
  border-collapse: collapse;
  border-spacing: 0;
}

.intercom-scale-wrapper img,
.intercom-scale-wrapper svg {
  width: 100%;
  height: auto;
  display: block;
}

.intercom-scale-wrapper strong {
  font-weight: bold;
}
  `;
  document.head.appendChild(style);
}

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
  // Inject styles immediately upon initialization
  injectStyles();

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
