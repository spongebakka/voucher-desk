# Voucher Desk

A single page that replaces the paper checklist and the Excel sheet for itison vouchers.
It is just `index.html`. It needs no install, no logins and no internet (the fonts fall back if it's offline).

## Putting it on the host desk laptop
1. Open https://spongebakka.github.io/voucher-desk/ in Chrome and bookmark it. It updates about a minute after a change lands on `main`.
2. Go to Settings and add the staff names, the real deals with their till amounts, and the itison redemption page link.

Offline fallback: save `index.html` somewhere permanent and open it. That copy keeps its own separate log.

## Where the data lives
In that laptop's browser only, tied to the web address. Updating the code doesn't touch it. Clearing the browser data wipes it, so use **Settings → Download backup** weekly.
History → Download as spreadsheet gives managers a CSV that opens in Excel.

## How the end of shift check works
- Compares the logged total against the itison total on the Waiter Mate end-of-day report.
- Optional: paste the itison Hub's redemptions list (select all, copy, paste). Every logged code is searched for in that text, whatever its layout, and any code that's missing gets flagged.

## Limits
- itison and Waiter Mate don't offer public APIs, so nothing is pulled from them automatically. Ask the itison account manager about a CSV export or API.
- One laptop only. A second device would have its own separate log.
- A "night" runs from 5am to 5am, so a 1am close still counts as the night before.
