"use strict";

const uvForm       = document.getElementById("uv-form");
const uvAddress    = document.getElementById("uv-address");
const navForm      = document.getElementById("nav-bar-form");
const navAddress   = document.getElementById("nav-bar-address");
const searchEngine = document.querySelector("#uv-search-engine");
const error        = document.getElementById("uv-error");
const errorCode    = document.getElementById("uv-error-code");
const connection   = new BareMux.BareMuxConnection("/baremux/worker.js");

function checkSecureConnection() {
  const httpsLockIcon = document.getElementById("https-lock");
  httpsLockIcon.textContent = location.protocol === "https:" ? "lock" : "no_encryption";
}
checkSecureConnection();

function getActiveIframe() {
  return document.getElementById("frame" + currentTab);
}

async function handleSubmit(query) {
  try {
    await registerSW();
  } catch (err) {
    if (error)     error.textContent = "Failed to register service worker.";
    if (errorCode) errorCode.textContent = err.toString();
    throw err;
  }

  const iframe = getActiveIframe();
  const url    = search(query, searchEngine.value);
  const prefix = __uv$config.prefix;
  const encUrl = prefix + __uv$config.encodeUrl(url);
  showProxy();

  const wispUrl = (location.protocol === "https:" ? "wss" : "ws")
                + "://" + location.host + "/wisp/";
  if (await connection.getTransport() !== "/epoxy/index.mjs") {
    await connection.setTransport("/epoxy/index.mjs", [{ wisp: wispUrl }]);
  }

  const finalUrl = "https://pegleg.cbass92.org/active" + encUrl;
  iframe ? iframe.src = finalUrl : newTab(finalUrl);
}

uvForm?.addEventListener("submit", async e => {
  e.preventDefault();
  const q = uvAddress.value.trim();
  if (!q) return;
  uvAddress.value = "";
  await handleSubmit(q);
});

navForm?.addEventListener("submit", async e => {
  e.preventDefault();
  const q = navAddress.value.trim();
  if (!q) return;
  navAddress.value = "";
  await handleSubmit(q);
  navAddress.blur();
  // update once on manual submit
  const f = getActiveIframe();
  let raw = "";
  try { raw = f.contentWindow.location.href; }
  catch { raw = f ? f.src : ""; }
  const enc = raw.replace(/^.*?__uv$config\.prefix/, "");
  const dec = __uv$config.decodeUrl ? __uv$config.decodeUrl(enc) : atob(enc);
  navAddress.value = dec.slice(dec.indexOf("https://"));
});

function showProxy() { document.getElementById("proxy-div").className = "show-proxy-div"; }
function hideProxy() { document.getElementById("proxy-div").className = "hide-proxy-div"; }
function goHome()    { closeAllTabs(); hideProxy(); }
function goBack()    { const f = getActiveIframe(); f && f.contentWindow.history.back(); }
function goForward() { const f = getActiveIframe(); f && f.contentWindow.history.forward(); }
function reloadPage(){ const f = getActiveIframe(); f && f.contentWindow.location.reload(); }
function proxyFullscreen() {
  const f = getActiveIframe();
  f && (f.requestFullscreen?.() || f.webkitRequestFullscreen?.() || f.msRequestFullscreen?.());
}
function windowPopout() {
  const f = getActiveIframe();
  if (!f) return;
  const win = window.open();
  const nf  = win.document.createElement("iframe");
  nf.style.cssText = "width:100%;height:100%;border:none;";
  nf.src = f.src;
  win.document.body.appendChild(nf);
}

var currentTabId = 0;
var currentTab   = 0;
var tabIds       = [];

function getTabId() {
  tabIds.push(currentTabId);
  return currentTabId++;
}

function newTab(url = __uv$config.prefix + __uv$config.encodeUrl("https://google.com")) {
  const el    = document.getElementById("tabBarTabs");
  const tabId = getTabId();
  el.innerHTML += 
    `<div class="tabBarTab w3-bar-item" id="tab${tabId}" style="width:225px" onclick="openTab(${tabId})">
      <div style="display:inline-flex;align-items:center;width:170px;overflow-x:hidden;white-space:nowrap;cursor:default;">
        <img id="favicon-${tabId}" style="width:25px;height:25px;margin-right:6px;object-fit:contain;vertical-align:middle;">
        <span id="title-${tabId}" style="overflow:hidden;text-overflow:ellipsis;"></span>
      </div>
      <i class="fa-solid fa-xmark" style="cursor:pointer;float:right;line-height:1.5;"
         onclick="event.stopPropagation();this.parentNode.animate([{'width':'150px'},{'width':'0'}],{fill:'forwards',duration:125});
                  setTimeout(function(el){el.remove();closeTab('${tabId}');},100,this.parentElement);"></i>
    </div>`;

  const tab   = el.lastElementChild;
  setTimeout(() => tab.style.marginTop = "5px", 1);

  const frame = document.createElement("iframe");
  frame.src            = url;
  frame.classList.add("tab");
  frame.id             = "frame" + tabId;
  frame.style.cssText  = "width:100%;height:100%;border:none;display:none;";
  document.getElementById("frames").append(frame);

  openTab(tabId);
  return frame;
}

function openTab(tabId) {
  if (document.getElementById("frame" + currentTab)) {
    document.getElementById("frame" + currentTab).style.display = "none";
    document.getElementById("tab" + currentTab).style.backgroundColor = "rgb(29,30,34)";
  }
  currentTab = tabId;
  document.getElementById("frame" + currentTab).style.display = "block";
  document.getElementById("tab" + currentTab).style.backgroundColor = "rgb(49,50,64)";
  // update navAddress on tab switch
  const f = document.getElementById("frame" + tabId);
  let raw;
  try { raw = f.contentWindow.location.href; }
  catch { raw = f.src; }
  const enc = raw.replace(/^.*?__uv$config\.prefix/, "");
  const dec = __uv$config.decodeUrl ? __uv$config.decodeUrl(enc) : atob(enc);
  navAddress.value = dec.slice(dec.indexOf("https://"));
}

function closeAllTabs() {
  document.getElementById("frames").innerHTML    = "";
  document.getElementById("tabBarTabs").innerHTML = "";
  tabIds = [];
  currentTab = 0;
}

function closeTab(id) {
  document.getElementById("frame" + id).remove();
  for (let i = 0; i < tabIds.length; i++) {
    if (tabIds[i] == id) tabIds.splice(i, 1);
  }
  if (currentTab == id && tabIds.length) {
    openTab(tabIds[tabIds.length - 1]);
  }
}

function universalAdapter() {
  if (document.activeElement === navAddress) return;

  for (let i = 0; i < tabIds.length; i++) {
    const frame = document.getElementById("frame" + tabIds[i]);
    if (!frame) continue;

    let raw;
    try { raw = frame.contentWindow.location.href; }
    catch { raw = frame.src; }

    const enc = raw.replace(/^.*?__uv$config\.prefix/, "");
    const dec = __uv$config.decodeUrl ? __uv$config.decodeUrl(enc) : atob(enc);
    const url = dec.slice(dec.indexOf("https://"));

    document.getElementById(`title-${tabIds[i]}`).textContent =
      (frame.contentDocument && frame.contentDocument.title) ||
      url.split("/").pop() ||
      "untitled";

    document.getElementById(`favicon-${tabIds[i]}`).src =
      `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(url)}&size=256`;

    if (tabIds[i] === currentTab) {
      navAddress.value = url;
    }
  }
}

setInterval(universalAdapter, 1000);
