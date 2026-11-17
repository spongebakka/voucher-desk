# Voucher Desk: notes for Claude

The owner is a beginner and a restaurant supervisor, and they usually edit from their phone mid-shift. Keep replies short and plain-English, and end each change with what to test.

- The whole app is `index.html` (HTML, CSS and JS inline, no build step, no dependencies). Keep it that way.
- It is live on Netlify, deployed from `main`: https://voucher-desk.netlify.app/. A change only goes live once it's on `main`, and Netlify takes under a minute to update. When working on a branch, offer to merge it to `main` so the change can be tested.
- Data lives in the browser's localStorage under `voucherDesk.v1`. **Never rename that key or change the saved data's shape without migrating it**, or the host laptop loses its log.
- No real data goes in the repo (it's public): no staff names, codes or restaurant name. Those are entered in the app's Settings.
- No API for itison or Waiter Mate (the till, by OrderMate). The end of shift check works on the itison Hub text the user pastes in.
- A "night" runs 5am to 5am (`DAY_START_HOUR`).
- Flow: details (code, PIN, deal, table) → redeem on itison → "Accepted" logs it with the itison step ticked, "Rejected" saves it with `status: 'rejected'` (left out of every total). **The PIN is held in memory only and is never saved.** Keep it that way.
- One device: everyone brings vouchers to the host desk laptop, so the log lives there. Don't add a shared database unless that changes.
