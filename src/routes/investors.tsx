import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/investors")({
  head: () => ({
    meta: [
      { title: "Investors — You Can't Invest in Nectar.Pay (And That's the Point)" },
      {
        name: "description",
        content:
          "No seed round. No VCs. No board. Here's why Nectar.Pay didn't raise — and how you can win alongside us anyway by holding TEXITcoin.",
      },
      { property: "og:title", content: "You Can't Invest in Nectar.Pay" },
      {
        property: "og:description",
        content:
          "Crypto payment gateways raised hundreds of millions and process 220 tx/day. We took zero and we'll beat that our first month. Here's how to win with us.",
      },
    ],
  }),
  component: InvestorsPage,
});

function Rule() {
  return <div aria-hidden className="mx-auto my-12 h-px w-24 bg-border" />;
}

function StatCard({
  company,
  raised,
  status,
  punch,
}: {
  company: string;
  raised: string;
  status: string;
  punch: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/40 p-5">
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-base font-bold uppercase tracking-wide">{company}</div>
        <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{status}</div>
      </div>
      <div className="mt-2 font-mono text-2xl text-primary">{raised}</div>
      <p className="mt-2 text-sm leading-relaxed text-foreground/75">{punch}</p>
    </div>
  );
}

function InvestorsPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-20">
      <Link
        to="/"
        className="mb-12 inline-flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.4em] text-muted-foreground hover:text-foreground"
      >
        ← Nectar.Pay
      </Link>

      <header className="border-y border-border/60 py-10 text-center">
        <p className="text-[0.7rem] uppercase tracking-[0.6em] text-muted-foreground">
          Investor Relations
        </p>
        <h1 className="mt-4 text-4xl font-bold uppercase leading-tight sm:text-5xl">
          Bad News.<br />
          You <span className="text-primary">Can't Invest</span> in Nectar.Pay.
        </h1>
        <p className="mt-6 text-[0.7rem] uppercase tracking-[0.4em] text-muted-foreground">
          No seed round · No VCs · No board · No exit
        </p>
      </header>

      <section className="mt-16 space-y-6 text-lg leading-relaxed text-foreground/85">
        <p>
          There was no seed round. There was no Series A. We didn't sell our souls
          to the overlords and hedgies in a glass-walled conference room in
          Menlo Park. Nobody got a board seat in exchange for a wire transfer.
        </p>
        <p>
          We don't have anything against capital. It's just not how <em>we</em> do it.
        </p>
        <p>
          Because every good project driven by decentralized ethos but controlled
          by centralized capital eventually ends up right back where it started:
          gatekeeping who's allowed to transact, and taking a cut for the privilege.
        </p>
      </section>

      <Rule />

      <section>
        <h2 className="mb-6 text-2xl font-bold uppercase tracking-wide">
          Exhibit A: The Competition
        </h2>
        <p className="mb-8 text-lg leading-relaxed text-foreground/85">
          The crypto payments industry has raised, conservatively, north of{" "}
          <strong>three quarters of a billion dollars</strong> in venture money.
          Here's what that money bought:
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard
            company="BitPay"
            raised="$72.5M raised"
            status="Est. 2011"
            punch="Processes ~220 transactions per day. Globally. After 14 years and Series B from Index Ventures. Decides who's an approved merchant and charges 1–2% for the favor."
          />
          <StatCard
            company="Circle"
            raised="$1.1B+ raised"
            status="Stablecoin issuer"
            punch="Froze $63M of USDC on Tornado Cash addresses the day OFAC asked. The currency is programmable — programmable by them."
          />
          <StatCard
            company="MoonPay"
            raised="$642M raised"
            status="$3.4B valuation"
            punch="Insiders cashed out $150M to themselves in the Series A. Customers wait days for KYC and pay 4.5% to buy their own money."
          />
          <StatCard
            company="Wyre"
            raised="$29M raised"
            status="Shut down 2023"
            punch="Acquired by Bolt for $1.5B. Deal collapsed. Company collapsed. Customer funds stuck. The textbook centralized-rails ending."
          />
        </div>

        <p className="mt-8 text-lg leading-relaxed text-foreground/85">
          We took <strong>zero dollars</strong>. We'll do BitPay's annual volume
          in our first month and we won't ask anyone for permission to do it.
        </p>
      </section>

      <Rule />

      <section>
        <h2 className="mb-6 text-2xl font-bold uppercase tracking-wide">
          So How Do You Win With Us?
        </h2>
        <div className="space-y-6 text-lg leading-relaxed text-foreground/85">
          <p>
            Nectar.Pay is built on the <strong>TEXITcoin</strong> ecosystem — a
            project picking up where the Bitcoin community left off in 2017,
            when the early adopters got rich and the banks took over.
          </p>
          <p>
            If you like what we're doing and want to support it, the path is
            embarrassingly simple:
          </p>
          <div className="rounded-lg border border-primary/40 bg-primary/5 p-6 text-center">
            <p className="text-[0.7rem] uppercase tracking-[0.4em] text-primary">
              The Whole Pitch
            </p>
            <p className="mt-3 text-2xl font-bold uppercase">
              Buy. Hold. Trade. <span className="text-primary">TXC.</span>
            </p>
          </div>
          <p>
            TEXITcoin is made-in-America, mined in Texas, available on
            well-respected markets and exchanges, and out since 2024.
            Nectar.Pay is one of the very first products built on it — and
            we're just getting started.
          </p>
          <p className="text-center">
            <a
              href="https://texitcoin.org/build"
              className="text-primary underline-offset-4 hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              Learn more at texitcoin.org/build →
            </a>
          </p>
        </div>
      </section>

      <Rule />

      <section>
        <h2 className="mb-6 text-2xl font-bold uppercase tracking-wide">
          The Plan
        </h2>
        <p className="mb-6 text-lg leading-relaxed text-foreground/85">
          Our goal is stupidly simple. You can write it on a napkin:
        </p>
        <ul className="space-y-3 border-l-2 border-primary/60 pl-6 text-lg leading-relaxed text-foreground/85">
          <li><strong>10,000 merchants</strong> in 6 months.</li>
          <li><strong>100 sales</strong> at each merchant per week.</li>
          <li>
            Hardware distribution via our partnership with{" "}
            <strong>CryptoPOP</strong>.
          </li>
          <li>
            A direct line to disrupt the boring, tired payment services
            industry and establish crypto as a real, usable, valuable
            alternative to existing rails.
          </li>
        </ul>
        <p className="mt-6 text-lg leading-relaxed text-foreground/85">
          We're going to do to the card network industry what{" "}
          <strong>Dollar Shave Club</strong> did to Gillette.
        </p>
      </section>

      <Rule />

      <section>
        <h2 className="mb-6 text-2xl font-bold uppercase tracking-wide">
          Case Study: Dollar Shave Club vs. Gillette
        </h2>
        <div className="space-y-6 text-lg leading-relaxed text-foreground/85">
          <p>
            In 2011 Gillette owned <strong>70% of the global razor market</strong>.
            A multi-billion-dollar fortress with NFL ad budgets, Olympic
            sponsorships, and patent-protected five-blade engineering nobody
            asked for.
          </p>
          <p>
            Then a guy named Michael Dubin made a $4,500 YouTube video that
            opened with "Our blades are f***ing great." Five years later
            Unilever bought his company for{" "}
            <strong>$1 billion in cash</strong>. Gillette's market share
            collapsed from 70% to under 50%. They're still bleeding.
          </p>
          <blockquote className="my-6 border-l-2 border-primary/60 pl-6 text-base italic text-foreground/80">
            Gillette didn't lose because their razors got worse. They lost
            because they kept charging $32 for something that should cost $3,
            and a smaller, faster, honest competitor walked in the door and
            said so out loud.
          </blockquote>
          <p>
            Sound familiar? <strong>2.9% + 30¢</strong> is the new
            five-blade titanium-coated swivel-head razor cartridge.
          </p>
        </div>
      </section>

      <Rule />

      <section>
        <h2 className="mb-6 text-2xl font-bold uppercase tracking-wide">
          Case Study: Kodak vs. The Camera Phone
        </h2>
        <div className="space-y-6 text-lg leading-relaxed text-foreground/85">
          <p>
            Kodak invented the digital camera in <strong>1975</strong>. Their
            own engineer, Steven Sasson, built the first one. Management
            shelved it because it threatened the film business.
          </p>
          <p>
            By 1996 Kodak was worth <strong>$28 billion</strong> with 140,000
            employees. By 2012 they filed for bankruptcy. Not because digital
            photography failed — because <em>they</em> refused to disrupt
            their own profitable, boring, gatekept rail.
          </p>
          <p>
            The card networks invented the rails that crypto runs circles
            around. They know it. They're shelving it. The Kodak moment for
            payments isn't coming — it's here, and we're holding the camera.
          </p>
        </div>
      </section>

      <Rule />

      <section className="rounded-lg border border-border/60 bg-card/40 p-8 text-center">
        <p className="text-[0.7rem] uppercase tracking-[0.4em] text-muted-foreground">
          TL;DR
        </p>
        <p className="mt-4 text-xl leading-relaxed text-foreground/90">
          You can't buy a piece of Nectar.Pay. But you can buy a piece of
          the rail it runs on, the community that built it, and the future
          it's pulling toward us.
        </p>
        <p className="mt-6 text-2xl font-bold uppercase">
          Pick up a handful of <span className="text-primary">TXC.</span>
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <a
            href="https://texitcoin.org"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Get TEXITcoin
          </a>
          <Link
            to="/manifesto"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Read the Manifesto
          </Link>
        </div>
      </section>

      <footer className="mt-16 text-center text-sm text-muted-foreground">
        <p>
          Part of the{" "}
          <a href="https://honest.money" className="text-primary hover:underline">
            Honest Money Ecosystem
          </a>{" "}
          ·{" "}
          <Link to="/terms" className="hover:text-foreground">Terms</Link> ·{" "}
          <Link to="/privacy" className="hover:text-foreground">Privacy</Link> ·{" "}
          <Link to="/manifesto" className="hover:text-foreground">Manifesto</Link>
        </p>
      </footer>
    </article>
  );
}
