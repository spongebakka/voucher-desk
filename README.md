# Voucher Desk

A single page that replaces the paper checklist and the Excel sheet for itison vouchers.
It is just `index.html`. It needs no install, no logins and no internet (the fonts fall back if it's offline).

## Live version
https://spongebakka.github.io/voucher-desk/ (updates about a minute after a change lands on `main`). On the host laptop, open that link and bookmark it. That is easier than copying the file across.
1. Copy `index.html` to the laptop (USB stick, email it to yourself, AirDrop, anything).
2. Save it somewhere permanent, e.g. Documents. **Don't leave it in Downloads**: if the file moves, the saved data stays behind.
3. Open it in Chrome. Bookmark it, or pin the tab next to itison.
4. Go to Settings and add the staff names, the real deals with their till amounts, and the itison redemption page link.

## Where the data lives
In that laptop's browser only, under that file's location. Clearing the browser data wipes it, so use **Settings → Download backup** weekly.
History → Download as spreadsheet gives managers a CSV that opens in Excel.

## How the end of shift check works
- Compares the logged total against the itison total on the Waiter Mate end-of-day report.
- Optional: paste the itison Hub's redemptions list (select all, copy, paste). Every logged code is searched for in that text, whatever its layout, and any code that's missing gets flagged.

## Limits
- itison and Waiter Mate don't offer public APIs, so nothing is pulled from them automatically. Ask the itison account manager about a CSV export or API.
- One laptop only. A second device would have its own separate log.
- A "night" runs from 5am to 5am, so a 1am close still counts as the night before.
