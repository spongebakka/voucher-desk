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
  // Count page loads for this voucher. If the page keeps reloading, stop instead of going round in circles.
  // nudged: already tried pressing Enter once, so never again for this voucher. valid: itison has shown it as valid.
  const saved = fromLink ? { code, pin, until: Date.now() + 120000, loads: 1 } : { ...memo, loads: (memo.loads || 0) + 1 };
  const remember = (on, extra) => { try { Object.assign(saved, extra); on ? sessionStorage.setItem(MEMO, JSON.stringify(saved)) : sessionStorage.removeItem(MEMO); } catch (e) {} };
  if (saved.loads > 4) { remember(false); return; }
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

  // What itison is showing for our code: 'valid', 'redeemed', 'other' (e.g. expired) or null (no result yet).
  // itison has two layouts: a big panel ("This voucher is valid for use" / "This voucher has been redeemed")
  // and a short one ("Status: Redeemed").
  const readVoucher = () => {
    const text = document.body.innerText || '';
    const deal = (text.match(/£\s?\d[\d,]*(?:\.\d\d)?\s+voucher[^\n\t]*/i) || [''])[0].replace(/\s*View voucher.*$/i, '').trim();
    const face = parseFloat((deal.match(/£\s?([\d,]+(?:\.\d\d)?)/) || [, ''])[1].replace(/,/g, '')) || null;
    const label = (text.match(/Status:\s*([A-Za-z]+)/) || [, ''])[1];
    if (/This voucher has been redeemed/i.test(text) || /^redeemed$/i.test(label)) {
      const usedAt = (text.match(/marked this voucher as used at ([^\n]+?)\./i) || [, ''])[1];
      return { status: 'redeemed', deal, face, usedAt };
    }
    if (/This voucher is valid for use/i.test(text) || /^(valid|active|available|unused|live|booked|purchased|paid)$/i.test(label)) return { status: 'valid', deal, face, label };
    if (/^(expired|cancelled|canceled|refunded|void|voided|invalid)$/i.test(label)) return { status: 'other', deal, face, label };
    if (label) return { status: 'unknown', deal, face, label };   // a word we don't know: open the details to find out
    return null;
  };

  const tell = result => chrome.runtime.sendMessage({ type: 'vd-result', result: { code, ...result } }).catch(() => {});

  let step = 'search', tries = 0, searchedAt = 0, nudges = saved.nudged ? 1 : 0, firstStatus = saved.valid ? 'valid' : null;
  const stop = () => { clearInterval(timer); remember(false); };
  // Tell Voucher Desk how it went, then close this tab so you land back on Voucher Desk.
  const finishWith = (result, text, good) => {
    stop(); say(text, good); tell(result);
    setTimeout(() => chrome.runtime.sendMessage({ type: 'vd-close' }).catch(() => {}), 800);
  };
  const pageSays = re => re.test(document.body.innerText || '');
  const timer = setInterval(() => {
    if (++tries > 4 * 60 * 15) { stop(); return; }   // give up after 15 minutes
    const v = readVoucher();

    if (step === 'search' && v && v.status === 'unknown') {
      const row = shortResult();
      if (row && !row.dataset.vdClicked) { row.dataset.vdClicked = '1'; row.click(); }
      else if (!row || Date.now() - (+row.dataset.vdAt || (row.dataset.vdAt = Date.now())) > 3000)
        say(`itison says "${v.label}". Open the voucher to see if it can be redeemed.`);
      return;
    }
    if (step === 'search') {
      if (v) { step = 'check'; }
      else if (pageSays(/Please enter the full voucher code/i)) {
        finishWith({ status: 'badcode' }, "itison says that isn't a full voucher code."); return;
      }
      else {
        const box = textInputs().find(i => /1234|voucher|code/i.test([i.placeholder, i.name, i.id, i.getAttribute('aria-label')].join(' ')));
        if (!box) return;                                      // page still loading
        // itison searched for this code (it's in the address) but shows nothing: it doesn't know the code.
        const searched = squash(new URLSearchParams(location.search).get('redeem-code')) === squash(code);
        if (searched && searchedAt && Date.now() - searchedAt > 2000) {
          finishWith({ status: 'notfound' }, "itison didn't find this code."); return;
        }
        if (!searchedAt) {
          if (squash(box.value) !== squash(code)) typeInto(box, code);
          box.focus(); searchedAt = Date.now(); say('code filled in, searching…'); return;
        }
        // No result yet: try the different ways a search box can be set off, one at a time.
        const wait = Date.now() - searchedAt;
        if (nudges === 0 && wait > 1000) {
          nudges++;
          remember(true, { nudged: true });   // if this reloads the page, don't do it again
          for (const t of ['keydown', 'keypress', 'keyup'])
            box.dispatchEvent(new KeyboardEvent(t, { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true }));
        } else if (nudges === 1 && wait > 2200) {
          nudges++;
          say('code filled in. Press Enter to search.');
        }
        return;
      }
    }

    if (step === 'check') {
      if (v.status === 'redeemed' && firstStatus === 'valid') step = 'wait';   // itison reloaded the page after you pressed Redeem
      else if (v.status === 'other') {
        finishWith({ status: 'other', deal: v.deal, face: v.face, label: v.label }, `itison says this voucher is "${v.label}".`); return;
      }
      else if (v.status === 'redeemed') {
        finishWith({ status: 'already', deal: v.deal, face: v.face, usedAt: v.usedAt }, 'itison says this voucher was already used.'); return;
      }
      else {
        firstStatus = 'valid'; remember(true, { valid: true });
        tell({ status: 'valid', deal: v.deal, face: v.face });
        step = 'open';
      }
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
        else if (!btn) {
          // Short layout: clicking the result opens the full details, which have the Redeem voucher button.
          const row = shortResult();
          if (row && !row.dataset.vdClicked) { row.dataset.vdClicked = '1'; row.click(); }
          else say('valid. Open the voucher and press Redeem voucher. The PIN will fill in.');
        }
        return;
      }
    }

    if (step === 'wait') {
      if (v && v.status === 'redeemed' && firstStatus === 'valid') {
        finishWith({ status: 'redeemed', deal: v.deal, face: v.face }, 'redeemed. Logging it in Voucher Desk…', true);
      } else if (pageSays(/Pin is incorrect/i)) {
        finishWith({ status: 'badpin', deal: v && v.deal, face: v && v.face }, 'itison says the PIN is wrong.');
      } else if (step === 'wait' && !pinInput() && v && v.status === 'valid') {
        step = 'open';   // the PIN box was cancelled: wait for you to press "Redeem voucher" again
      }
    }
  }, 250);

  // In the short layout, the bit of the result that says "Status: …" (clicking it opens the details).
  function shortResult(){
    const all = document.body.querySelectorAll('*');
    for (const el of all) {
      if (!visible(el) || el.closest('a[href]:not([href="#"])')) continue;   // never follow a link to another page
      if ([...el.childNodes].some(n => n.nodeType === 3 && /Status:/.test(n.textContent))) return el;
    }
    return null;
  }

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
