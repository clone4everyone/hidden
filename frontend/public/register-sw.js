"use strict";

/**
 * Distributed with Ultraviolet and compatible with most configurations.
 */
const stockSW = "/uv/sw.js";

/**
 * List of hostnames that are allowed to run serviceworkers on http://
 */
const swAllowedHostnames = ["localhost", "127.0.0.1"];

/**
 * Global util
 * Used in 404.html and index.html
 */
async function registerSW() {
  if (!("serviceWorker" in navigator)) {
    throw new Error("Your browser doesn't support service workers.");
  }

  if (
    location.protocol !== "https:" &&
    !swAllowedHostnames.includes(location.hostname)
  ) {
    throw new Error("Service workers cannot be registered without https.");
  }

  // Register service worker with explicit scope
  await navigator.serviceWorker.register(stockSW, { scope: "/uv/" });

  // Wait until it is fully active before continuing
  await navigator.serviceWorker.ready;
  console.log("✅ Service worker registered and ready");
}
