// Passes results from the itison tab to the Voucher Desk tab, and closes the itison tab once a voucher is redeemed.
const isDesk = url => { try { const h = new URL(url).hostname; return h === 'voucher-desk.netlify.app' || h.endsWith('--voucher-desk.netlify.app'); } catch (e) { return false; } };
const squash = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

// If a Voucher Desk tab was open before the add-on was installed or updated, it isn't connected yet: connect it, then resend.
const send = (tabId, msg) => chrome.tabs.sendMessage(tabId, msg).catch(() =>
  chrome.scripting.executeScript({ target: { tabId }, files: ['desk.js'] })
    .then(() => chrome.tabs.sendMessage(tabId, msg)).catch(() => undefined));

// Fetch itison's deal lists (guestlists.csv) with the laptop's itison login.
const looksLikeList = t => /^\uFEFF?[^\n]*Voucher Code/i.test(t);
async function fetchList(url){
  try {
    const r = await fetch(url, { credentials: 'include', cache: 'no-store' });
    const text = await r.text();
    if (r.ok && looksLikeList(text)) return { url, ok: true, text };
    return { url, ok: false, error: r.ok ? 'itison asked to sign in (open itison on this laptop and sign in)' : `itison answered ${r.status}` };
  } catch (e) { return { url, ok: false, error: "couldn't reach itison" }; }
}
// Second try from inside an itison tab, in case the login only works there.
async function fetchListsInTab(urls){
  const tab = await chrome.tabs.create({ url: 'https://www.itison.com/hub/', active: false });
  try {
    await new Promise(res => {
      const on = (id, info) => { if (id === tab.id && info.status === 'complete') { chrome.tabs.onUpdated.removeListener(on); res(); } };
      chrome.tabs.onUpdated.addListener(on); setTimeout(res, 15000);
    });
    const [{ result }] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, args: [urls],
      func: urls => Promise.all(urls.map(u => fetch(u, { credentials: 'include', cache: 'no-store' }).then(r => r.text()).catch(() => ''))) });
    return result;
  } finally { chrome.tabs.remove(tab.id).catch(() => {}); }
}
async function fetchLists(urls){
  const files = await Promise.all(urls.map(fetchList));
  const failed = files.filter(f => !f.ok);
  if (failed.length) {
    const texts = await fetchListsInTab(failed.map(f => f.url)).catch(() => []);
    failed.forEach((f, i) => { if (looksLikeList(texts[i] || '')) Object.assign(f, { ok: true, text: texts[i], error: undefined }); });
  }
  return files;
}

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (msg.type === 'vd-fetch-lists') {   // answers later
    const LIST = /^https:\/\/(www\.)?itison\.com\/hub\/company\/\d+\/products\/\d+\/guestlists\.csv$/;
    fetchLists((msg.urls || []).filter(u => LIST.test(u))).then(reply); return true;
  }
  if (msg.type === 'vd-result') (async () => {
    const desks = (await chrome.tabs.query({ url: 'https://*.netlify.app/*' })).filter(t => isDesk(t.url));
    // Find the Voucher Desk tab that is redeeming this code (there may be more than one Voucher Desk tab open).
    const pending = await Promise.all(desks.map(t => send(t.id, { type: 'vd-pending' })));
    const mine = desks.filter((t, i) => squash(pending[i]) === squash(msg.result.code));
    for (const t of mine.length ? mine : desks) send(t.id, msg);
    const back = mine[0] || desks.find(t => t.id === sender.tab?.openerTabId) || (desks.length === 1 ? desks[0] : null);
    if (msg.result.status !== 'valid' && back) {   // finished (well or not): go back to Voucher Desk
      chrome.tabs.update(back.id, { active: true });
      chrome.windows.update(back.windowId, { focused: true });
    }
  })();
  if (msg.type === 'vd-close' && sender.tab) chrome.tabs.remove(sender.tab.id);
});
