// Runs on Voucher Desk. Hands results from the itison tab to the Voucher Desk page.
(() => {
  const h = location.hostname;
  if (h !== 'voucher-desk.netlify.app' && !h.endsWith('--voucher-desk.netlify.app')) return;
  if (window.vdHelperConnected) return;   // already connected
  window.vdHelperConnected = true;
  document.documentElement.dataset.vdHelper = chrome.runtime.getManifest().version;   // lets the page know the helper is installed
  chrome.runtime.onMessage.addListener(msg => {
    if (msg.type === 'vd-result') window.postMessage({ from: 'vd-helper', ...msg.result }, location.origin);
  });
})();
