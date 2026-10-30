// Content for the public NectarPay guide at /docs. Plain data so chapters are easy to edit.

export type Section = {
  id: string;
  title: string;
  body: string[];
  steps?: string[];
  bullets?: string[];
  links?: { label: string; href: string }[];
};
export type Chapter = { id: string; title: string; summary: string; sections: Section[] };

export const CHAPTERS: Chapter[] = [
  {
    id: "getting-started",
    title: "Account setup (Getting started)",
    summary: "Create your account, add your first store, and take your first payment.",
    sections: [
      {
        id: "sign-up",
        title: "Create your account",
        body: [
          "You can sign up with email, Google, a TEXITcoin wallet, or your Honest Money account. Honest Money members can connect their account later from Account → Connect Honest Money so one login works across the ecosystem.",
        ],
        links: [{ label: "Sign up", href: "/auth" }],
      },
      {
        id: "first-store",
        title: "Add your first store",
        body: ["Each store gets its own easy web address, like /stores/your-shop-name, and its own wallets, terminals and settings."],
        steps: [
          "Go to Stores and choose New store.",
          "Fill in Your Store Info: name, logo, address, website, public email and timezone.",
          "Link a wallet (see the Vault and Beekeeper chapters).",
          "Turn on the coins you want to accept on Wallets & Chains.",
          "Pair a terminal or share a payment link, and you are ready to sell.",
        ],
      },
      {
        id: "store-page",
        title: "Finding your way around a store",
        body: ["Your store page is grouped so everything is a click away:"],
        bullets: [
          "Your Store Info: name, logo, contact details, timezone and directory listing.",
          "Wallet balances: a quick look at what has arrived in your linked wallets.",
          "Get Paid: wallets & chains, terminals, payment links and invoices.",
          "Give Back: the Giving Program switch and settings.",
          "Tech Stuff: API keys and developer tools.",
          "Other Settings: terminal (POS) options, verification and promotions.",
        ],
      },
    ],
  },
  {
    id: "vault",
    title: "Linking to an HME Vault",
    summary: "Connect your HME Vault so payments go straight to wallets you control.",
    sections: [
      {
        id: "how",
        title: "How Vault linking works",
        body: [
          "NectarPay never holds your money. When you link a Vault, NectarPay only receives a watch-only view of your wallet, so it can create a fresh receiving address for each sale and see when it is paid. It can never spend.",
          "Every link is protected by a code emailed to you, so nobody can quietly swap your wallet.",
        ],
        steps: [
          "Open your store's Wallets & Chains page and choose Link HME Vault.",
          "In your Vault, open the pairing screen and scan the QR code shown by NectarPay.",
          "Enter the code we email you to confirm.",
          "Compare the preview address with the one in your Vault: they should match.",
        ],
      },
      {
        id: "main-address",
        title: "Why sales skip your main address",
        body: [
          "Your wallet's very first address (number 0) is kept as your private main address. Sales start at address 1 so your main address is never shown to customers.",
        ],
        links: [{ label: "Address rotation explained", href: "/docs/address-rotation" }],
      },
    ],
  },
  {
    id: "beekeeper",
    title: "Linking to a Beekeeper wallet",
    summary: "Skip copy-and-paste: scan one QR code with Beekeeper.money on your phone.",
    sections: [
      {
        id: "link",
        title: "Link Beekeeper in a minute",
        body: ["Beekeeper.money is the Honest Money mobile wallet. It can send NectarPay the watch-only details for every coin at once."],
        steps: [
          "Open your store's Wallets & Chains page.",
          "Find Link a Beekeeper.money wallet and show the QR code.",
          "Open Beekeeper on your phone and scan it.",
          "Approve on your phone. The wallets fill in automatically and show a lock icon.",
        ],
        bullets: ["To change a locked wallet, relink from Beekeeper rather than editing it by hand. This protects you from typos."],
        links: [
          { label: "Get Beekeeper", href: "https://beekeeper.honest.money" },
          { label: "Manual wallet setup guide", href: "/docs/wallet-setup" },
        ],
      },
    ],
  },
  {
    id: "defaults",
    title: "Setting up your defaults",
    summary: "Choose coins, terminal behavior, receipts and timezone once, and they apply everywhere.",
    sections: [
      {
        id: "coins",
        title: "Coins you accept",
        body: ["On Wallets & Chains, switch on each coin you want. TSD (Texas Stable Dollar) on TEXITcoin is pinned to the top because it holds a steady $1 value and confirms quickly."],
      },
      {
        id: "pos",
        title: "Terminal (POS) settings",
        body: ["Under POS settings you can decide:"],
        bullets: [
          "Whether to ask for tips and which tip amounts to offer.",
          "Whether to capture a customer signature, and whether to print it on the receipt (off by default to save paper).",
          "Whether to ask for the shopper's email for a receipt and an optional, unchecked mailing-list signup.",
          "Tax settings for reports.",
        ],
      },
      {
        id: "timezone",
        title: "Timezones",
        body: [
          "Set your store's timezone in Your Store Info. Reports use it to decide where a business day starts and ends, so a 10pm sale counts on the right day.",
          "You can also pick how times look to you personally on the Account page (automatic, UTC, or any zone).",
        ],
      },
    ],
  },
  {
    id: "stablecoins",
    title: "Stablecoins vs. other crypto (risk vs. reward)",
    summary: "Know what you are holding after each sale.",
    sections: [
      {
        id: "stable",
        title: "Stablecoins: steady value",
        body: [
          "Stablecoins like TSD, USDC and USDT aim to stay at $1. A $20 sale stays worth about $20 tomorrow. Good for paying bills, payroll and suppliers.",
        ],
      },
      {
        id: "volatile",
        title: "Other crypto: more upside, more swing",
        body: [
          "Coins like TEXITcoin (TXC), Bitcoin and Ethereum change price constantly. A $20 sale might be worth $25 next month, or $15. Some merchants like holding a little for potential growth.",
        ],
      },
      {
        id: "mix",
        title: "A sensible mix",
        bullets: [
          "Keep what you need for expenses in stablecoins.",
          "Hold only what you can afford to see go down in volatile coins.",
          "NectarPay locks the price at the moment of sale, so the customer always pays the correct dollar amount.",
          "Slower networks (Bitcoin, Ethereum main chain) take longer to confirm than fast ones like TEXITcoin.",
        ],
        body: [],
      },
    ],
  },
  {
    id: "nfc",
    title: "NFC tap-to-pay cards",
    summary: "Customers tap a wallet card on the terminal, enter their PIN, and they're done.",
    sections: [
      {
        id: "how",
        title: "How a tap works",
        body: ["Tap cards only hold an ID and a web address. No money is stored on the card; it lives in the shopper's wallet."],
        steps: [
          "On the payment chooser the terminal is already listening, so the customer can tap right away.",
          "The terminal asks for the card PIN (every tap).",
          "The card's wallet may ask the owner to approve on their phone (up to 15 minutes).",
          "The wallet sends the payment and the screen shows Payment sent — confirming…",
          "NectarPay checks the transaction itself, then marks the sale paid.",
        ],
      },
      {
        id: "limits",
        title: "Limits and safety",
        bullets: [
          "CryptoPOP cards: up to $100 per tap and $500 per day.",
          "5 wrong PINs in a row locks the card for the day.",
          "Taps only work in the NectarPOS Android app on a terminal with NFC.",
        ],
        body: [],
      },
      {
        id: "partners",
        title: "Card wallets we work with",
        body: [
          "CryptoPOP is the first card partner. More wallets can join; the terminal recognises which wallet a card belongs to automatically.",
          "Customers on iPhone can pair a card by scanning the card's QR code from the NFC Inspector on a terminal.",
        ],
        links: [{ label: "Tangem cards guide", href: "/docs/tap-to-pay-tangem" }],
      },
    ],
  },
  {
    id: "giving",
    title: "Giving Program (Give Back)",
    summary: "Offer shoppers a discount that goes to their church or cause, at no extra cost to them.",
    sections: [
      {
        id: "what",
        title: "What it is",
        body: [
          "When a shopper pays with an eGiving wallet, 10% of the sale goes to an approved church and the giving program, and you receive 90%. Shoppers support their community just by shopping with you.",
          "The discount is currently fixed at 10% for every store.",
        ],
      },
      {
        id: "turn-on",
        title: "Turn it on",
        steps: [
          "Open your store and choose Give Back.",
          "Switch on the Giving Program.",
          "Make sure TSD on TEXITcoin is enabled on Wallets & Chains.",
        ],
        body: [],
      },
      {
        id: "example",
        title: "Example",
        body: ["A $100 sale: you get $90, the church gets $8 and the program gets $2. Receipts show the discount and note that the giving portion is non-refundable."],
      },
      {
        id: "reports",
        title: "Reports",
        body: ["Reports → eGiving shows monthly totals, each giving sale and a CSV download."],
      },
    ],
  },
  {
    id: "pop",
    title: "POP Rewards",
    summary: "Shoppers earn POP points for supporting NectarPay merchants.",
    sections: [
      {
        id: "earn",
        title: "How shoppers earn",
        body: [
          "When a CryptoPOP wallet user pays at any NectarPay merchant, they earn 1 POP for every dollar of the full sale, rounded up. Spend $68.75 and earn 69 POP.",
          "POP is a reward point that tracks patronage. It is not money and cannot be spent.",
        ],
      },
      {
        id: "merchants",
        title: "What it means for merchants",
        bullets: [
          "Every merchant is included automatically, at no cost.",
          "Each sale can earn rewards only once.",
          "Fraud checks hold suspicious awards, such as a merchant paying their own store.",
        ],
        body: [],
      },
    ],
  },
  {
    id: "directory",
    title: "Merchant Directory",
    summary: "Get found by shoppers looking for places that accept honest money.",
    sections: [
      {
        id: "listing",
        title: "Choose how you're listed",
        body: ["On your store's Listing page, choose one:"],
        bullets: [
          "Full listing: name, logo, address, map pin, website and contact details.",
          "City only (default): shows your city and category, keeps identifying details private.",
          "Online business: name, logo, website and description, no address.",
          "Hidden: not listed at all.",
        ],
      },
      {
        id: "where",
        title: "Where it appears",
        body: [
          "The directory is public at /directory and is shared with partner wallets and apps. Stores appear once at least one coin is switched on. Give Back stores are flagged so shoppers can find them.",
        ],
        links: [{ label: "Browse the directory", href: "/directory" }],
      },
    ],
  },
  {
    id: "best",
    title: "Getting the most from NectarPay",
    summary: "Habits that make checkout faster and your books cleaner.",
    sections: [
      {
        id: "tips",
        title: "Top tips",
        bullets: [
          "Accept TSD on TEXITcoin for fast, steady-value payments.",
          "Turn on Give Back to attract community-minded shoppers.",
          "Use a full or online listing so people can actually find you.",
          "Set your store timezone so reports match your real business days.",
          "Collect receipt emails, and only add people to your list when they tick the box.",
          "Check Customers to see repeat shoppers and their totals.",
          "Use payment links for online or phone orders.",
          "Invite your team under Account → Users instead of sharing a login.",
        ],
        body: [],
      },
      {
        id: "records",
        title: "Records and exports",
        body: [
          "Every sale has its own page with amounts, the blockchain transaction and the customer's signature (if captured), which you can download. Reports cover sales, payment methods, locations, tax and tips, settlement and eGiving, and Exports gives you spreadsheets.",
        ],
      },
    ],
  },
  {
    id: "tech",
    title: "Tech stuff",
    summary: "An overview for developers and partners.",
    sections: [
      {
        id: "overview",
        title: "What developers can build",
        bullets: [
          "Create invoices and check payment status from your own website or app.",
          "Receive signed webhooks when a sale is paid.",
          "Drop a pay button onto any webpage.",
          "Read the public merchant directory feed.",
          "Read the signed list of approved eGiving churches.",
          "Card wallet and POP reward partner connections.",
        ],
        body: ["API keys are created per store under Tech Stuff → API keys."],
        links: [{ label: "Full API reference", href: "/api" }],
      },
    ],
  },
];

export const GLOSSARY: { term: string; meaning: string }[] = [
  { term: "HME", meaning: "Honest Money Ecosystem: the family of networks (TXC, ISK, ZCU), wallets and apps NectarPay belongs to." },
  { term: "TEXITcoin (TXC)", meaning: "The Texas-based blockchain NectarPay is built around." },
  { term: "TSD", meaning: "Texas Stable Dollar, a $1 stablecoin on TEXITcoin." },
  { term: "Stablecoin", meaning: "A coin designed to keep a steady value, usually $1." },
  { term: "Omni", meaning: "The token layer on TEXITcoin that carries TSD and POP." },
  { term: "Vault", meaning: "The HME Vault wallet, linked to NectarPay watch-only." },
  { term: "Beekeeper", meaning: "Beekeeper.money, the Honest Money phone wallet that links by QR code." },
  { term: "Watch-only", meaning: "Wallet access that can see payments but can never spend." },
  { term: "Address rotation", meaning: "A fresh receiving address for each sale, for privacy and accurate matching." },
  { term: "Transaction ID (txid)", meaning: "The unique receipt number of a payment on the blockchain." },
  { term: "Mempool", meaning: "The waiting room for payments that are sent but not yet in a block." },
  { term: "Confirmation", meaning: "When a payment is recorded in a block on the blockchain." },
  { term: "Underpayment", meaning: "A payment that arrived for less than the sale total." },
  { term: "NFC", meaning: "Near-field communication: the short-range radio used for card taps." },
  { term: "Card partner", meaning: "A wallet company (like CryptoPOP) whose tap cards work on NectarPay terminals." },
  { term: "Give Back / eGiving", meaning: "The Giving Program that sends part of a sale to an approved church and program." },
  { term: "POP", meaning: "Reward points earned by shoppers; a real token, but not spendable money." },
  { term: "Terminal / POS", meaning: "The countertop device or app used to take in-person payments." },
  { term: "Payment link", meaning: "A shareable link a customer can open to pay you online." },
  { term: "Invoice", meaning: "A request for payment for one sale, with its amount and coin." },
  { term: "Webhook", meaning: "An automatic message NectarPay sends to your system when a sale changes." },
  { term: "API key", meaning: "A secret that lets your own software talk to NectarPay." },
];
