import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingNav, MarketingFooter } from "@/components/marketing-shell";
import vertexLogo from "../assets/fake-logo-vertex.png";
import schrodingerLogo from "../assets/fake-logo-schrodinger.png";
import ghostLogo from "../assets/fake-logo-ghost.png";
import imaginaryLogo from "../assets/fake-logo-imaginary.png";

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

function FakeInvestorCallout({
  logo,
  name,
  round,
  blurb,
}: {
  logo: string;
  name: string;
  round: string;
  blurb: string;
}) {
  return (
    <div className="my-10 rounded-xl border border-border/60 bg-card/40 p-6 text-center">
      <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-background">
        <img src={logo} alt={`${name} logo`} className="h-20 w-20 object-contain" loading="lazy" width={80} height={80} />
      </div>
      <p className="mt-4 text-lg font-bold tracking-wide">{name}</p>
      <p className="text-xs uppercase tracking-[0.3em] text-primary">{round}</p>
      <p className="mt-4 text-sm leading-relaxed text-foreground/70">{blurb}</p>
    </div>
  );
}

function InvestorsPage() {
  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />
      <article className="mx-auto max-w-3xl px-6 py-20">


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

      <FakeInvestorCallout
        logo={vertexLogo}
        name="Vertex Horizon Capital"
        round="Series A — $14,000,000"
        blurb="This firm does not exist. We invented them. Their 'portfolio' is a list of companies that went public in dreams. Does it make us look more impressive?"
      />

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

      <FakeInvestorCallout
        logo={schrodingerLogo}
        name="Schrödinger's Fund"
        round="Strategic Round — $8,000,000"
        blurb="Simultaneously our largest investor and not an investor at all. When we opened the term sheet, the signature collapsed into a single probability. Are we more trustworthy with this here?"
      />

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
        <h2 className="mb-3 text-2xl font-bold uppercase tracking-wide">
          Grab Some TXC. Right Here.
        </h2>
        <p className="mb-6 text-lg leading-relaxed text-foreground/85">
          No exchange signup. No KYC tollbooth. Send stablecoins from any major
          chain, get TXC delivered to your wallet. Powered by our friends at{" "}
          <a
            href="https://swap.honest.money"
            target="_blank"
            rel="noreferrer"
            className="text-primary underline-offset-4 hover:underline"
          >
            swap.honest.money
          </a>.
        </p>
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card/40">
          <iframe
            src="https://swap.honest.money/embed"
            title="Swap stablecoins for TXC"
            className="block h-[520px] w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Embedded live. Having trouble?{" "}
          <a
            href="https://swap.honest.money/embed"
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline"
          >
            Open in a new tab →
          </a>
        </p>
      </section>

      <FakeInvestorCallout
        logo={ghostLogo}
        name="Ghost Money Capital"
        round="Series B — $22,000,000"
        blurb="Invisible LPs. Invisible returns. Zero portfolio companies. One very convincing landing page that loads to a 404. They don't return phone calls."
      />

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
            Promotion and customers referred via our partnership with{" "}
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
        <h2 className="mb-4 text-2xl font-bold uppercase tracking-wide">
          Case Study: Dollar Shave Club vs. Gillette
        </h2>
        <div className="rounded-xl border border-border/60 border-l-4 border-l-primary/70 bg-card/60 p-8 shadow-sm">
          <div className="space-y-5 text-lg leading-relaxed text-foreground/85">
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
            <blockquote className="my-4 border-l-2 border-primary/60 pl-6 text-base italic text-foreground/80">
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
        </div>
      </section>

      <Rule />

      <section>
        <h2 className="mb-4 text-2xl font-bold uppercase tracking-wide">
          Case Study: Kodak vs. The Camera Phone
        </h2>
        <div className="rounded-xl border border-border/60 border-t-4 border-t-warning/60 bg-card/60 p-8 shadow-sm">
          <div className="space-y-5 text-lg leading-relaxed text-foreground/85">
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
        </div>
      </section>

      <FakeInvestorCallout
        logo={imaginaryLogo}
        name="Imaginary Number Partners"
        round="Seed — $6,000,000"
        blurb="They claim a 47x return on zero deployed capital. Their IRR involves the square root of negative one. Their due diligence was a calculus textbook."
      />

      <Rule />

      <section className="rounded-lg border border-border/60 bg-card/40 p-8 text-center">
        <p className="text-[0.7rem] uppercase tracking-[0.4em] text-muted-foreground">
          TL;DR
        </p>
        <p className="mt-4 text-xl leading-relaxed text-foreground/90">
          You can't buy a piece of Nectar.Pay. But you can buy a piece of
          the digital commodity from the rail it runs on, join the community
          that built it, and help write the bright future it's pulling toward us.
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

      <Rule />

      <section>
        <h2 className="mb-6 text-2xl font-bold uppercase tracking-wide">
          Why Are We Doing All This?
        </h2>
        <div className="space-y-5 text-lg leading-relaxed text-foreground/85">
          <p>
            Two reasons. First, we think crypto is the most honest money
            civilization has ever seen — and yet the crypto industry is doing
            it all wrong. Distracted by shiny things, everyone forgot to get
            crypto used as money before moving on to the fun stuff. That's okay.
            We'll do that part.
          </p>
          <p>
            Second, for <strong>TEXITcoin</strong> to win (that's our upside), we
            need real utility, purpose and value to come from our work, efforts
            and results. So we're killing two birds with one stone: building the
            important service the industry forgot, and increasing TXC's value in
            the marketplace.
          </p>
          <p>
            If we're right — we'll get rich. <strong>Win along with us.</strong>
          </p>
        </div>
      </section>

      <Rule />

      <section className="rounded-xl border border-dashed border-border/60 bg-card/30 p-6">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-[0.3em] text-muted-foreground">
          Disclaimers & Fine Print
        </h3>
        <ul className="space-y-3 text-sm leading-relaxed text-foreground/65">
          <li>
            <strong>Fake investors are fake.</strong> The logos and firm names
            scattered across this page are entirely fictional. They do not
            exist. They have never existed. No money changed hands. No term
            sheets were signed. No 6am Pacific Zoom calls were endured. They
            are satirical decorations parodying the "proudly backed by" badges
            every other startup plasters on their website. If you believed they
            were real, that's kind of the point.
          </li>
          <li>
            <strong>Not financial advice.</strong> We are not financial
            advisors. We are not even sure we're qualified to advise you on
            what to have for lunch.
          </li>
          <li>
            <strong>Past performance does not indicate future results.</strong>{" "}
            In our case, there is no past performance because we haven't
            started yet.
          </li>
          <li>
            <strong>No animals were harmed</strong> in the making of this
            page. Several egos were bruised.
          </li>
          <li>
            <strong>TEXITcoin may go up, down, or sideways.</strong> That's
            generally how markets work.
          </li>
          <li>
            <strong>This page contains satire.</strong> If you are a regulatory
            body, please re-read the first sentence of this list.
          </li>
        </ul>
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
      <MarketingFooter />
    </div>
  );
}
