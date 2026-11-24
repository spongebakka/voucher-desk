// Runs on itison Hub pages. Voucher Desk opens the Hub with the code and PIN after a #,
// like .../vouchers#vd-code=1234-ABCDEF&vd-pin=1234. This:
//   1. types the code into "Search for a voucher" and searches,
//   2. if the voucher is valid, opens itison's redeem box and types the PIN in,
//   3. waits for you to press itison's green Redeem button (it never presses that itself),
//   4. once itison says "This voucher has been redeemed", tells Voucher Desk and closes this tab.
// If itison says the voucher was already used, it tells Voucher Desk and leaves the tab open.
(() => {
  const params = new URLSearchParams(location.hash.slice(1));
  // If itison's search loads a new page, carry on with the same voucher for up to 2 minutes.
  const MEMO = 'vdHelper';
  let memo = null;
  try { memo = JSON.parse(sessionStorage.getItem(MEMO) || 'null'); } catch (e) {}
  const fromLink = params.has('vd-code');
  const code = ((fromLink ? params.get('vd-code') : memo && memo.until > Date.now() && memo.code) || '').trim();
  const pin = ((fromLink ? params.get('vd-pin') : memo && memo.pin) || '').trim();
  if (!/^[A-Za-z0-9-]{3,40}$/.test(code)) return;
  const remember = on => { try { on ? sessionStorage.setItem(MEMO, JSON.stringify({ code, pin, until: Date.now() + 120000 })) : sessionStorage.removeItem(MEMO); } catch (e) {} };
  remember(true);
  // Take the code and PIN out of the address bar.
  if (fromLink) history.replaceState(history.state, '', location.pathname + location.search);

  const squash = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const visible = el => el && el.offsetParent !== null && !el.disabled;
  const typeInto = (box, text) => {
    // Use the browser's own value setter so itison's page notices the change.
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(box, text);
    box.dispatchEvent(new Event('input', { bubbles: true }));
    box.dispatchEvent(new Event('change', { bubbles: true }));
  };
  const textInputs = () => [...document.querySelectorAll('input')].filter(i =>
    visible(i) && !i.readOnly && !['checkbox', 'radio', 'hidden', 'submit', 'button'].includes(i.type));

  // A little note in the corner so you can see what the helper is doing.
  let note;
  const say = (text, good) => {
    if (!note) {
      note = document.createElement('div');
      note.style.cssText = 'position:fixed;left:16px;bottom:16px;z-index:2147483647;padding:10px 14px;border-radius:8px;font:600 14px/1.3 system-ui,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.2);max-width:360px';
      document.body.appendChild(note);
    }
    note.style.background = good ? '#1f7a3d' : '#22313f';
    note.style.color = '#fff';
    note.textContent = 'Voucher Desk: ' + text;
  };

  // What itison is showing for our code: 'valid', 'redeemed' or null (not shown yet / something else).
  const readVoucher = () => {
    const text = document.body.innerText || '';
    if (!squash(text).includes(squash(code))) return null;
    const deal = (text.match(/£\s?\d[\d,]*(?:\.\d\d)?\s+voucher[^\n\t]*/i) || [''])[0].replace(/\s*View voucher details.*$/i, '').trim();
    const face = parseFloat((deal.match(/£\s?([\d,]+(?:\.\d\d)?)/) || [, ''])[1].replace(/,/g, '')) || null;
    if (/This voucher has been redeemed/i.test(text)) {
      const usedAt = (text.match(/marked this voucher as used at ([^\n]+?)\./i) || [, ''])[1];
      return { status: 'redeemed', deal, face, usedAt };
    }
    if (/This voucher is valid for use/i.test(text)) return { status: 'valid', deal, face };
    return null;
  };

  const tell = result => chrome.runtime.sendMessage({ type: 'vd-result', result: { code, ...result } }).catch(() => {});

  let step = 'search', tries = 0, searchedAt = 0, nudges = 0, firstStatus = null;
  const stop = () => { clearInterval(timer); remember(false); };
  const timer = setInterval(() => {
    if (++tries > 4 * 60 * 15) { stop(); return; }   // give up after 15 minutes
    const v = readVoucher();

    if (step === 'search') {
      if (v) { step = 'check'; }
      else {
        const box = textInputs().find(i => /1234|voucher|code/i.test([i.placeholder, i.name, i.id, i.getAttribute('aria-label')].join(' ')));
        if (!box) return;                                      // page still loading
        if (!searchedAt) {
          if (squash(box.value) !== squash(code)) typeInto(box, code);
          box.focus(); searchedAt = Date.now(); say('code filled in, searching…'); return;
        }
        // No result yet: try the different ways a search box can be set off, one at a time.
        const wait = Date.now() - searchedAt;
        if (nudges === 0 && wait > 1000) {
          nudges++;
          for (const t of ['keydown', 'keypress', 'keyup'])
            box.dispatchEvent(new KeyboardEvent(t, { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true }));
        } else if (nudges === 1 && wait > 2200) {
          nudges++;
          const form = box.form || box.closest('form');
          const go = form && [...form.querySelectorAll('button, input[type=submit]')].find(b => b.type === 'submit' && !b.disabled);
          if (go) go.click(); else if (form) form.requestSubmit();
        } else if (nudges === 2 && wait > 3500) {
          nudges++;
          say('code filled in. Press Enter to search.');
        }
        return;
      }
    }

    if (step === 'check') {
      firstStatus = v.status;
      if (v.status === 'redeemed') {
        say('itison says this voucher was already used. Check with the customer.');
        tell({ status: 'already', deal: v.deal, face: v.face, usedAt: v.usedAt });
        stop(); return;
      }
      tell({ status: 'valid', deal: v.deal, face: v.face });
      step = 'open';
    }

    if (step === 'open') {
      if (v && v.status === 'redeemed') { step = 'wait'; }
      else {
        const pinBox = pinInput();
        if (pinBox) {
          if (pin && !pinBox.value) typeInto(pinBox, pin);
          pinBox.focus();
          say(pin ? 'PIN filled in. Check it, then press Redeem.' : 'Enter the PIN, then press Redeem.');
          step = 'wait'; return;
        }
        const btn = [...document.querySelectorAll('button, a, input[type=button], input[type=submit]')]
          .find(b => visible(b) && /^\s*Redeem voucher\s*$/i.test(b.innerText || b.value || ''));
        if (btn && !btn.dataset.vdClicked) { btn.dataset.vdClicked = '1'; btn.click(); }   // only opens itison's PIN box
        return;
      }
    }

    if (step === 'wait') {
      if (v && v.status === 'redeemed' && firstStatus === 'valid') {
        stop();
        say('redeemed. Logging it in Voucher Desk…', true);
        tell({ status: 'redeemed', deal: v.deal, face: v.face });
        setTimeout(() => chrome.runtime.sendMessage({ type: 'vd-close' }).catch(() => {}), 1500);
      } else if (step === 'wait' && !pinInput() && v && v.status === 'valid') {
        step = 'open';   // the PIN box was cancelled: wait for you to press "Redeem voucher" again
      }
    }
  }, 250);

  // itison's "Enter verification PIN" box: a visible text box near the words "PIN".
  function pinInput(){
    return textInputs().find(i => {
      if (/1234-|voucher code/i.test(i.placeholder || '')) return false;   // that's the search box
      let el = i;
      for (let k = 0; k < 4 && el; k++, el = el.parentElement) if (/verification PIN/i.test(el.innerText || '')) return true;
      return false;
    });
  }
})();
