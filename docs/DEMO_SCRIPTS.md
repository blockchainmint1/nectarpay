# /demo — video scripts

Shooting scripts for the four tiles on `/demo`. Each script has a target
runtime, a voice-over track (VO), an on-screen action track (SCREEN), and
optional b-roll notes. Voice = one working merchant, conversational, no sales
gloss. Assume 150 wpm — a "~3 min" video is ~450 words of VO.

Common conventions:

- Cold-open on the app, not on a talking head.
- No music under VO — light beat only on stingers.
- End card on every video: NectarPay hive mark + `nectar-pay.com/demo` +
  "Book a live demo" chip. Hold 2s.
- Lower-third on first speaker: name, "NectarPay merchant, {city}".

---

## 1. Setting up a new account (~3:00)

**Goal:** email → wallet-linked merchant, ready to accept a payment, in
under 3 minutes on screen. Prove there is no gatekeeper.

### Cold open (0:00–0:08)

SCREEN: `nectar-pay.com` landing, cursor moves to "Get started".
VO: "Three minutes. That's the whole thing. From nothing to taking your
first crypto payment. Watch."

### Sign up (0:08–0:45)

SCREEN: click Get started → `/auth` → type email → magic-link toast → open
inbox tab → click link → land in `/dashboard`.
VO: "No credit check, no application, no 'we'll get back to you.' Enter an
email. We send a link. You click it. You're in."

Beat: pause on the empty dashboard.

VO: "This is your dashboard. Empty for now. Let's give it something to do."

### Create a store (0:45–1:25)

SCREEN: click "New store" → fill name ("Trailhead Coffee"), category,
city → save → land on the store page.
VO: "A store is where a location's sales live. Name it, tell us what you
sell, drop a city so customers can find you on the merchant map. Save."

### Link a wallet (1:25–2:20)

SCREEN: Chains tab → pick Bitcoin → paste an xpub → save → repeat with
TEXITcoin → green "watching" indicator.
VO: "Now the important part. NectarPay never holds your money. You give us
a watch-only key — an xpub — and we watch the addresses that belong to
you. Sales land in your wallet directly. Not ours. Not a middleman's."

Callout: on-screen chip — "Non-custodial · your keys, your coins."

VO: "TEXITcoin, Bitcoin, USDC on any chain you already run — pick the ones
you actually want."

### First invoice (2:20–2:55)

SCREEN: `/pos` → punch in $12.00 → present QR → phone off-camera scans
and pays → confirmation checkmark on the terminal.
VO: "Three minutes in. Real payment. Real settlement. That's setup."

### End card (2:55–3:00)

SCREEN: hive mark + `nectar-pay.com/demo`.

---

## 2. Processing a crypto transaction (~2:00)

**Goal:** show one full tap-to-pay checkout from the merchant side, no
narration filler. This is the money shot.

### Cold open (0:00–0:06)

SCREEN: close-up of the terminal on a coffee counter, screen dark.
VO: "One sale. Real time. Nothing cut."

### Ring it up (0:06–0:30)

SCREEN: barista taps `/pos` on the terminal → three items: latte, croissant,
gift card → total $18.75 → hits "Charge".
VO: "Ring the sale like any register. Hit charge."

### Present the QR (0:30–1:00)

SCREEN: QR appears with amount, chain, and expiry countdown. Customer
holds phone up. Wallet app detects, shows the amount in their currency,
customer taps confirm.
VO: "The terminal shows a payment request — amount, network, expires in a
few minutes. Customer scans with any wallet. They see the amount in their
own money. They tap send."

### Settle (1:00–1:35)

SCREEN: terminal flips to "Confirming…" for ~4 seconds, then a green
checkmark, then prints a receipt.
VO: "First confirmation lands in seconds. You'd wait longer for a card
network authorization. And unlike a card, there's no chargeback risk, no
interchange, no bank sitting in the middle taking a cut."

### The receipt (1:35–1:55)

SCREEN: close-up on the printed receipt — merchant, items, USD, sats,
tx id.
VO: "Customer walks. Money's already in your wallet. That's the whole
loop."

### End card (1:55–2:00)

---

## 3. The velocity of money (~4:00)

**Goal:** the argument video. Card rails skim, hold your money for days,
and you re-spend it back through the same rails. Crypto rails compound in
your own hands. Use one real merchant's numbers.

### Cold open (0:00–0:12)

SCREEN: hand-drawn loop diagram — Customer → Card → Processor →
Bank → Merchant (T+2) → same processor for supplier payments →
repeat. Every arrow bleeds ~3%.
VO: "Every time a dollar loops through card rails, someone skims. Not
once. Every time."

### Set the math (0:12–1:00)

SCREEN: on-screen calculator UI.

- Monthly card volume: $60,000
- Effective card cost: 2.9% + 30¢ per swipe
- Payout delay: 2 business days
- Supplier payments back onto the same rails: ~40% of gross

VO: "Say you do sixty thousand a month on card. Almost three percent goes
to the processor. Your money waits two days to clear. And forty percent of
what you actually keep goes right back out through the same rails to your
suppliers — where they skim you a second time."

Callout: annualized: ~$2,000/mo evaporated, $24k/year gone.

### The alternative (1:00–2:00)

SCREEN: same calculator, crypto path.

- Cost per transaction: network fee only (~cents)
- Payout delay: seconds
- Supplier paid direct in same crypto: no round-trip

VO: "Now the crypto path. You get paid in seconds. Network fees are
cents, not percent. When you pay a supplier who also takes crypto — and
more do every month — the money stays on the same rail. No round-trip.
No second skim."

### Real merchant story (2:00–3:15)

SCREEN: cut to a merchant at their counter. Lower-third: name + city.
Merchant on camera:

> "We were burning about eighteen hundred a month between processor fees
> and float. Since we moved to NectarPay for anyone who wants to pay in
> crypto — that's maybe a third of our customers now — we're keeping that
> money and it's compounding in our wallet. I paid my roaster in USDC
> last month. Zero fees. Same day."

### The point (3:15–3:50)

SCREEN: back to the loop diagram — the crypto loop stays whole, no arrows
bleeding out.
VO: "Velocity is how fast a dollar changes hands and how much survives
each hop. Card rails are designed to slow it down and take a cut on the
way through. Crypto rails are designed to move it and let you keep it."

### End card (3:50–4:00)

---

## 4. Cashing out to your bank (~3:00)

**Goal:** kill the "but how do I pay rent" objection. Show that going to
USD is easy, on your terms, not required.

### Cold open (0:00–0:12)

SCREEN: wallet balance in USDC and BTC, big numbers.
VO: "You've been paid in crypto for a month. Rent is due Friday. Here's
how you get to dollars — only when you actually need them."

### Option A: on-ramp/off-ramp partner (0:12–1:15)

SCREEN: `/onramp` page → click "Sell to USD" → pick asset (USDC),
amount ($4,000), destination (linked bank account) → confirm → success.
VO: "The simplest path — sell inside NectarPay through a licensed on-ramp
partner. Pick the coin, pick the amount, pick your bank account. Funds
land the next business day. KYC is a one-time thing, and you only do it
if and when you want to touch the banking system."

### Option B: pay suppliers directly (1:15–2:00)

SCREEN: split screen — left: sending USDC to a roaster's address; right:
paying a Visa bill in USDC through a bill-pay service like Bitrefill or
Coinsbee.
VO: "Or skip the bank entirely. Pay your suppliers in the same crypto
you got paid in — zero round-trip. Cover a card bill, a phone bill, a
gift card, straight from your wallet through a bill-pay service. For a
lot of merchants, this replaces the cash-out entirely."

### Option C: hold (2:00–2:35)

SCREEN: same wallet, chart line ticking up.
VO: "Or — and this is the one nobody tells you about — hold. The money
you would have handed a processor is compounding. The dollar you didn't
convert didn't lose to a wire fee. Cashing out is a choice you make when
you need to, not a fee you pay every day."

### Your call (2:35–2:55)

SCREEN: three-tile summary: Cash out · Pay direct · Hold.
VO: "Cash out, pay direct, or hold. Your money, your call, your keys."

### End card (2:55–3:00)

---

## Production notes

- Shoot the terminal footage on a real counter, not a desk. The context
  sells it.
- The merchant interview in video 3 is the load-bearing beat — book a
  real customer, not a stand-in. Their numbers over ours, always.
- Do not use stock crypto b-roll (no glowing coins, no "matrix" shots).
  Use the actual app, the actual terminal, the actual receipt.
- Captions on by default. A lot of these get watched on muted phones on a
  sales floor.
- Each video ends with the same end card and CTA — makes the /demo grid
  feel like a series, not a playlist.
