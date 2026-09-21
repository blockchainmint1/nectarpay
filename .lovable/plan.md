# Upgrade subscription billing emails

## What will change
- Replace the dark generic renewal message with a polished NectarPay billing receipt.
- Use friendly language that confirms continued service without calling the paid plan “Cheap.”
- Show the plan, USD price, TXC charged, renewal date, and remaining TXC balance in a clear summary.
- Add a direct billing/dashboard button and the standard honest.money, Terms, Privacy, and Manifesto footer.
- Give failed-renewal and blocked-account emails matching branded warning layouts.

## Technical details
- Pass structured billing details from the renewal job into the notification renderer.
- Add email-client-safe inline HTML for successful renewals and billing warnings while preserving Telegram text and current notification preferences.
- Verify the generated content and run the focused typecheck.
