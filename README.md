# Voucher Desk

A single page that replaces the paper checklist and the Excel sheet for itison vouchers.
It is just `index.html`. It needs no install, no logins and no internet (the fonts fall back if it's offline).

## Putting it on the host desk laptop
1. Open https://voucher-desk.netlify.app/ in Chrome and bookmark it. It updates about a minute after a change lands on `main`.
2. Go to Settings and add the staff names, the real deals with their till amounts, and the itison redemption page link.

Offline fallback: save `index.html` somewhere permanent and open it. That copy keeps its own separate log.

## Sharing the log between the desk laptops (Supabase)
One-time setup, all on supabase.com:
1. New project (any name, region London). The database password it asks for isn't needed by the app; let it generate one.
2. SQL Editor → New query → paste all of `supabase-setup.sql` → Run. The result at the bottom is your **setup link**. Keep it private and out of the repo.
3. Project Settings → API (or Connect): the **Project URL** and the **publishable** (or anon) key go in `SB_URL` and `SB_KEY` at the top of the script in `index.html`. Both are safe to be public.
4. Open the setup link once on each desk laptop, starting with the laptop that already has the real deals and staff. No sign-in needed. Lost the link? Run the last line of the SQL file again.

If the wifi drops, each laptop keeps logging and sends everything when it's back (the top bar shows "Offline · N to send").

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
