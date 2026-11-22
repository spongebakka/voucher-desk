// Voucher Desk opens the itison Hub with the code after a #, like .../vouchers#vd-code=1234-ABCDEF.
// This finds the "Search for a voucher" box and types the code in. It doesn't press search or redeem anything.
(() => {
  const m = location.hash.match(/vd-code=([^&]+)/);
  if (!m) return;
  const code = decodeURIComponent(m[1]).trim();
  if (!/^[A-Za-z0-9-]{3,40}$/.test(code)) return;

  const findBox = () => [...document.querySelectorAll('input')].find(i =>
    (i.type === 'text' || i.type === 'search' || !i.getAttribute('type')) &&
    !i.disabled && !i.readOnly && i.offsetParent !== null &&
    /1234|voucher|code/i.test([i.placeholder, i.name, i.id, i.getAttribute('aria-label')].join(' ')));

  const fill = box => {
    // Use the browser's own value setter so the page's framework notices the change.
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(box, code);
    box.dispatchEvent(new Event('input', { bubbles: true }));
    box.dispatchEvent(new Event('change', { bubbles: true }));
    box.focus();
    // Take the code out of the address bar so a reload doesn't fill it in again.
    history.replaceState(history.state, '', location.pathname + location.search);
  };

  // The page may still be loading, so keep looking for the box for up to 15 seconds.
  let tries = 0;
  const timer = setInterval(() => {
    const box = findBox();
    if (box) { clearInterval(timer); fill(box); }
    else if (++tries > 60) clearInterval(timer);
  }, 250);
})();
