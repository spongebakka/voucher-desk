// Passes results from the itison tab to the Voucher Desk tab, and closes the itison tab once a voucher is redeemed.
const isDesk = url => { try { const h = new URL(url).hostname; return h === 'voucher-desk.netlify.app' || h.endsWith('--voucher-desk.netlify.app'); } catch (e) { return false; } };
const squash = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

// If a Voucher Desk tab was open before the add-on was installed or updated, it isn't connected yet: connect it, then resend.
const send = (tabId, msg) => chrome.tabs.sendMessage(tabId, msg).catch(() =>
  chrome.scripting.executeScript({ target: { tabId }, files: ['desk.js'] })
    .then(() => chrome.tabs.sendMessage(tabId, msg)).catch(() => undefined));

chrome.runtime.onMessage.addListener((msg, sender) => {
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
