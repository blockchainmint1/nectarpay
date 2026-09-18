# Upgrade merchant payment emails

## What will change
- Replace the plain dark alert with a polished NectarPay receipt-style email.
- Lead with a celebratory “You made a sale” message and the amount received.
- Name the store prominently so multi-store merchants know which business was paid.
- Identify NectarPay clearly as the notification sender and preserve the merchant’s configured delivery address.
- Show useful payment details: invoice, payment method/network, amount paid, amount due, and merchant order reference when available.
- Add a clear dashboard button and the standard honest.money, Terms, Privacy, and Manifesto footer links.
- Give underpayment notices a clear, professional warning treatment rather than a celebration.

## Technical details
- Pass structured store and invoice details from settlement into the notification renderer.
- Add a dedicated, email-client-safe payment notification renderer using inline styles and a white outer background.
- Keep Telegram notifications concise and unchanged in behavior.
- Verify the updated email markup and run the focused typecheck.
