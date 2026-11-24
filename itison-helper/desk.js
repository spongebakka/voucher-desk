// Runs on Voucher Desk. Hands results from the itison tab to the Voucher Desk page,
// and fetches itison's deal lists for the End of shift check when the page asks.
(() => {
  const h = location.hostname;
  if (h !== 'voucher-desk.netlify.app' && !h.endsWith('--voucher-desk.netlify.app')) return;
  if (window.vdHelperConnected) return;   // already connected
  window.vdHelperConnected = true;
  document.documentElement.dataset.vdHelper = chrome.runtime.getManifest().version;   // lets the page know the helper is installed
  chrome.runtime.onMessage.addListener((msg, sender, reply) => {
    if (msg.type === 'vd-pending') reply(document.documentElement.dataset.vdPending || '');   // which voucher this tab is redeeming
    if (msg.type === 'vd-result') window.postMessage({ from: 'vd-helper', ...msg.result }, location.origin);
  });
  // Only itison's own deal-list downloads can be fetched this way, nothing else.
  const LIST = /^https:\/\/(www\.)?itison\.com\/hub\/company\/\d+\/products\/\d+\/guestlists\.csv$/;
  window.addEventListener('message', e => {
    const m = e.data;
    if (e.source !== window || !m || m.to !== 'vd-helper' || m.type !== 'fetch-csv' || !Array.isArray(m.urls)) return;
    const urls = m.urls.filter(u => LIST.test(u)).slice(0, 20);
    chrome.runtime.sendMessage({ type: 'vd-fetch-lists', urls })
      .catch(err => urls.map(url => ({ url, ok: false, error: String(err.message || err) })))
      .then(files => window.postMessage({ from: 'vd-helper', type: 'csv', id: m.id, files }, location.origin));
  });
})();
