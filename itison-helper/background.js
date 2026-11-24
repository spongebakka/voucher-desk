// Passes results from the itison tab to the Voucher Desk tab, and closes the itison tab once a voucher is redeemed.
const isDesk = url => { try { const h = new URL(url).hostname; return h === 'voucher-desk.netlify.app' || h.endsWith('--voucher-desk.netlify.app'); } catch (e) { return false; } };

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type === 'vd-result') {
    chrome.tabs.query({ url: 'https://*.netlify.app/*' }).then(tabs => {
      const desks = tabs.filter(t => isDesk(t.url));
      for (const t of desks) chrome.tabs.sendMessage(t.id, msg).catch(() => {});
      if (msg.result.status === 'redeemed' && desks[0]) {
        chrome.tabs.update(desks[0].id, { active: true });
        chrome.windows.update(desks[0].windowId, { focused: true });
      }
    });
  }
  if (msg.type === 'vd-close' && sender.tab) chrome.tabs.remove(sender.tab.id);
});
