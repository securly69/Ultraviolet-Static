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

// Create the BareMux connection (new code)
const connection = new BareMux.BareMuxConnection("/baremux/worker.js");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  // Get the search query and clear the input (old behavior)
  const query = address.value;
  address.value = "";

  // Register the service worker
  try {
    await registerSW();
  } catch (err) {
    error.textContent = "Failed to register service worker.";
    errorCode.textContent = err.toString();
    throw err;
  }

  // Compose the URL using your search function (assumed available)
  const url = search(query, searchEngine.value);

  // Ensure the proxy UI is visible (old behavior)
  showProxy();

  // Set up the BareMux transport
  const wispUrl =
    (location.protocol === "https:" ? "wss" : "ws") +
    "://" +
    location.host +
    "/wisp/";
  if (await connection.getTransport() !== "/epoxy/index.mjs") {
    await connection.setTransport("/epoxy/index.mjs", [{ wisp: wispUrl }]);
  }

  const encodedUrl = __uv$config.prefix + __uv$config.encodeUrl(url);

// Debugging: Log before opening the tab
console.log("Original URL:", url);
console.log("Encoded URL:", encodedUrl);

newTab("https://fantastic-carnival-975695q6769x3p5xx-8080.app.github.dev" + encodedUrl);

});

// Helper functions from your old code

function urlEncode(phrase) {
  return encodeURIComponent(phrase);
}

function goHome() {
  closeAllTabs(); // Assumes your tabs.js provides this function.
  hideProxy();
}

function showProxy() {
  const proxyDiv = document.getElementById("proxy-div");
  if (proxyDiv) {
    proxyDiv.classList = ["show-proxy-div"];
  }
}

function hideProxy() {
  const proxyDiv = document.getElementById("proxy-div");
  if (proxyDiv) {
    proxyDiv.classList = ["hide-proxy-div"];
  }
}
