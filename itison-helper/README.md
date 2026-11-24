# itison helper (Chrome add-on)

Makes **Redeem on itison** in Voucher Desk do most of the work:

1. Opens the itison Hub, types the voucher code in and searches.
2. If itison says the voucher is valid, opens itison's redeem box and types the PIN in.
3. **You press itison's green Redeem button.** The add-on never presses that itself.
4. When itison says "This voucher has been redeemed", it tells Voucher Desk, closes the itison tab and takes you back to Voucher Desk.
5. Voucher Desk logs it with the right deal. The first time it sees a deal (like "£100 voucher to spend on food & drinks") it asks you to pick which of your deals it is, and remembers that for next time.

If something's wrong, the itison tab closes too, and Voucher Desk shows a red warning saying why:
- the voucher was **already used**, or has **expired**
- itison **didn't find the code**, or it isn't a full code
- the **PIN is wrong** (nothing is redeemed)

Press **Back to details** to fix the code or PIN and try again, or **itison rejected it** to give up.

It only runs on itison Hub pages and on Voucher Desk. It doesn't send anything anywhere else or save anything.

## Install (once, on the host desk laptop)

1. Download the Voucher Desk files: https://github.com/spongebakka/voucher-desk/archive/refs/heads/main.zip
2. Open the downloaded zip so it unzips into a folder. Move that folder somewhere it won't get deleted, like Documents.
3. In Chrome, go to `chrome://extensions`
4. Turn on **Developer mode** (top right).
5. Click **Load unpacked** and pick the `itison-helper` folder inside the unzipped folder.
6. "Voucher Desk itison helper" should now be in the list. Done.

Don't delete the folder afterwards. Chrome loads the add-on from it.

## Updating to a new version

1. Download and unzip the files again (step 1 and 2 above), and choose **Replace** when moving the folder.
2. In `chrome://extensions`, click the round reload arrow on "Voucher Desk itison helper".
