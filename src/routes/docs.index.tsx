import { createFileRoute, Link } from "@tanstack/react-router";

import { MarketingNav, MarketingFooter } from "@/components/marketing-shell";
import { DashboardShell } from "@/components/dashboard-shell";
import { useAuth } from "@/lib/auth-context";
import { CHAPTERS, GLOSSARY, type Chapter } from "@/lib/docs-guide";

export const Route = createFileRoute("/docs/")({
  head: () => ({
    meta: [
      { title: "NectarPay Guide: How Everything Works · Nectar.Pay" },
      {
        name: "description",
        content:
          "The complete NectarPay how-to guide: getting started, wallets, Vault and Beekeeper linking, tap-to-pay cards, Give Back, POP rewards, the merchant directory and more.",
      },
      { property: "og:title", content: "The NectarPay Guide" },
      {
        property: "og:description",
        content:
          "Step-by-step chapters, a glossary, and plain-English answers for merchants accepting honest money with NectarPay.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://app.nectar-pay.com/docs" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://app.nectar-pay.com/docs" }],
  }),
  component: DocsPage,
});

function DocsPage() {
  const { user, loading } = useAuth();
  if (!loading && user) {
    return (
      <DashboardShell>
        <Guide />
      </DashboardShell>
    );
  }
  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />
      <Guide />
      <MarketingFooter />
    </div>
  );
}

function Guide() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 md:py-14">
      <header className="mb-10 max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">The NectarPay Guide</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">Everything NectarPay does, explained</h1>
        <p className="mt-3 text-muted-foreground">
          A plain-English how-to for merchants: getting set up, getting paid, giving back, rewarding shoppers and
          getting found. Jump to any chapter below, or look up a word in the{" "}
          <a href="#glossary" className="text-primary underline">glossary</a>. Developers can head straight to the{" "}
          <Link to="/api" className="text-primary underline">API reference</Link>.
        </p>
      </header>

      <div className="grid gap-10 lg:grid-cols-[240px_1fr]">
        <nav aria-label="Guide contents" className="lg:sticky lg:top-6 lg:self-start">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contents</p>
          <ol className="space-y-1 text-sm">
            {CHAPTERS.map((c, i) => (
              <li key={c.id}>
                <a href={`#${c.id}`} className="block rounded px-2 py-1 hover:bg-muted">
                  <span className="text-muted-foreground">{i + 1}.</span> {c.title}
                </a>
              </li>
            ))}
            <li>
              <a href="#glossary" className="block rounded px-2 py-1 hover:bg-muted">Glossary</a>
            </li>
          </ol>
        </nav>

        <main className="min-w-0 space-y-16">
          <section aria-label="Chapter index" className="grid gap-3 sm:grid-cols-2">
            {CHAPTERS.map((c, i) => (
              <a key={c.id} href={`#${c.id}`} className="rounded-lg border bg-card p-4 transition hover:border-primary">
                <p className="text-xs text-muted-foreground">Chapter {i + 1}</p>
                <p className="font-semibold">{c.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{c.summary}</p>
              </a>
            ))}
          </section>

          {CHAPTERS.map((c, i) => (
            <ChapterView key={c.id} chapter={c} n={i + 1} />
          ))}

          <section id="glossary" className="scroll-mt-6">
            <h2 className="text-2xl font-bold">Glossary</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              {GLOSSARY.map((g) => (
                <div key={g.term} id={`term-${slug(g.term)}`} className="rounded-lg border bg-card p-4">
                  <dt className="font-semibold">{g.term}</dt>
                  <dd className="mt-1 text-sm text-muted-foreground">{g.meaning}</dd>
                </div>
              ))}
            </dl>
          </section>
        </main>
      </div>
    </div>
  );
}

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function ChapterView({ chapter, n }: { chapter: Chapter; n: number }) {
  return (
    <section id={chapter.id} className="scroll-mt-6 border-t pt-10">
      <p className="text-xs font-semibold uppercase tracking-wider text-primary">Chapter {n}</p>
      <h2 className="mt-1 text-2xl font-bold">{chapter.title}</h2>
      <p className="mt-2 text-muted-foreground">{chapter.summary}</p>
      {chapter.sections.length > 1 && (
        <ul className="mt-3 flex flex-wrap gap-2 text-xs">
          {chapter.sections.map((s) => (
            <li key={s.id}>
              <a href={`#${chapter.id}-${s.id}`} className="rounded-full border px-3 py-1 hover:bg-muted">{s.title}</a>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-6 space-y-8">
        {chapter.sections.map((s) => (
          <div key={s.id} id={`${chapter.id}-${s.id}`} className="scroll-mt-6">
            <h3 className="text-lg font-semibold">{s.title}</h3>
            {s.body.map((p, i) => (
              <p key={i} className="mt-2 leading-relaxed">{p}</p>
            ))}
            {s.steps && (
              <ol className="mt-3 list-decimal space-y-1 pl-5">
                {s.steps.map((st, i) => <li key={i}>{st}</li>)}
              </ol>
            )}
            {s.bullets && (
              <ul className="mt-3 list-disc space-y-1 pl-5">
                {s.bullets.map((b, i) => <li key={i}>{b}</li>)}
              </ul>
            )}
            {s.links && (
              <div className="mt-3 flex flex-wrap gap-3 text-sm">
                {s.links.map((l) => (
                  <a key={l.href} href={l.href} className="text-primary underline">{l.label} →</a>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
