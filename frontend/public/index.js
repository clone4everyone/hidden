"use strict";

/**
 * @type {HTMLFormElement}
 */
const form = document.getElementById("uv-form");
/**
 * @type {HTMLInputElement}
 */
const address = document.getElementById("uv-address");
/**
 * @type {HTMLInputElement}
 */
const searchEngine = document.getElementById("uv-search-engine");
/**
 * @type {HTMLParagraphElement}
 */
const error = document.getElementById("uv-error");
/**
 * @type {HTMLPreElement}
 */
const errorCode = document.getElementById("uv-error-code");

// Global BareMux connection - reuse the same connection
let globalConnection = null;

// Function to get or create BareMux connection
async function getBareMuxConnection() {
  if (!globalConnection) {
    globalConnection = new BareMux.BareMuxConnection("/baremux/worker.js");
  }
  return globalConnection;
}

// Function to ensure transport is properly set
async function ensureTransport() {
  try {
    const connection = await getBareMuxConnection();
    let wispUrl = (location.protocol === "https:" ? "wss" : "ws") + "://" + location.host + "/wisp/";
    
    // Check if transport is already set correctly
    const currentTransport = await connection.getTransport();
    if (currentTransport !== "/epoxy/index.mjs") {
      await connection.setTransport("/epoxy/index.mjs", [{ wisp: wispUrl }]);
      console.log("BareMux transport set successfully");
    } else {
      console.log("BareMux transport already configured");
    }
    
    return true;
  } catch (err) {
    console.error("Failed to set BareMux transport:", err);
    return false;
  }
}

// Enhanced form submit handler
if (form) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    // Clear previous errors
    if (error) error.textContent = "";
    if (errorCode) errorCode.textContent = "";

    try {
      // Register service worker
      await registerSW();
      console.log("Service worker registered successfully");
    } catch (err) {
      console.error("Failed to register service worker:", err);
      if (error) {
        error.textContent = "Failed to register service worker.";
      }
      if (errorCode) {
        errorCode.textContent = err.toString();
      }
      return;
    }

    try {
      // Ensure BareMux transport is set
      const transportReady = await ensureTransport();
      if (!transportReady) {
        throw new Error("Failed to configure proxy transport");
      }

      // Wait a moment for everything to be ready
      await new Promise(resolve => setTimeout(resolve, 200));

      // Get the URL using the search function
      const url = search(address.value, searchEngine.value);
      console.log("Navigating to URL:", url);

      // Get iframe and navigate
      let frame = document.getElementById("uv-frame");
      if (frame) {
        frame.style.display = "block";
        const proxiedUrl = __uv$config.prefix + __uv$config.encodeUrl(url);
        frame.src = proxiedUrl;
        console.log("Frame src set to:", proxiedUrl);
      } else {
        console.error("uv-frame not found");
      }

    } catch (err) {
      console.error("Navigation error:", err);
      if (error) {
        error.textContent = "Failed to navigate to the requested URL.";
      }
      if (errorCode) {
        errorCode.textContent = err.toString();
      }
    }
  });
}

// Expose functions globally for use by React components
window.getBareMuxConnection = getBareMuxConnection;
window.ensureTransport = ensureTransport;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log("UV index.js loaded and ready");
  });
} else {
  console.log("UV index.js loaded and ready");
}