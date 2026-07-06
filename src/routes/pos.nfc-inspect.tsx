// /pos/nfc-inspect — hidden diagnostic screen. Not linked from nav.
// Tap any NFC card on the terminal; we show UID, tech list, IsoDep info,
// NDEF records, and let you fire common SELECT-AID APDUs to identify
// secure-element cards like Tangem, EMV contactless, etc.
//
// Reach it by typing /pos/nfc-inspect in the address bar (or paired
// browser dev-tools) — intentionally undiscoverable in the UI so we
// don't confuse merchants.

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Zap } from "lucide-react";
import { NectarNfc, isNative, type TagEvent, type ApduResponse } from "@/lib/pos-native";

export const Route = createFileRoute("/pos/nfc-inspect")({
  head: () => ({
    meta: [
      { title: "NFC Inspector — Nectar.Pay" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NfcInspector,
});

// Well-known AIDs worth probing on a mystery card.
// SELECT command header = 00 A4 04 00 <Lc> <AID> 00
const PROBES: { label: string; aid: string; note: string }[] = [
  { label: "EMV PPSE (Visa/MC contactless directory)", aid: "325041592E5359532E4444463031", note: "2PAY.SYS.DDF01" },
  { label: "Tangem Wallet applet", aid: "A000000812010101", note: "legacy Tangem Note/Wallet" },
  { label: "Tangem CardCharge", aid: "F0546167656D436172644368617267", note: "TagemCardCharg" },
  { label: "NDEF Type-4 Tag", aid: "D2760000850101", note: "reads NDEF file 0xE104" },
  { label: "MIFARE DESFire master", aid: "D2760000850100", note: "returns 6A82 if not DESFire NDEF" },
  { label: "FIDO U2F", aid: "A0000006472F0001", note: "security keys" },
];

function selectAidApdu(aidHex: string): string {
  const lc = (aidHex.length / 2).toString(16).padStart(2, "0");
  return `00A40400${lc}${aidHex}00`;
}

type ProbeResult = { label: string; ok: boolean; response: string; sw?: string };

function NfcInspector() {
  const [native, setNative] = useState(false);
  const [event, setEvent] = useState<TagEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [probing, setProbing] = useState(false);
  const [probeResults, setProbeResults] = useState<ProbeResult[]>([]);
  const [customApdu, setCustomApdu] = useState("00A4040007A000000812010101");
  const [customResp, setCustomResp] = useState<ApduResponse | null>(null);
  const subRef = useRef<{ remove: () => Promise<void> } | null>(null);

  useEffect(() => {
    setNative(isNative());
    let cancelled = false;
    (async () => {
      const sub = await NectarNfc.start(
        (e) => {
          if (cancelled) return;
          setEvent(e);
          setProbeResults([]);
          setError(null);
        },
        (msg) => !cancelled && setError(msg),
      );
      subRef.current = sub;
    })();
    return () => {
      cancelled = true;
      subRef.current?.remove().catch(() => {});
    };
  }, []);

  async function runProbes() {
    setProbing(true);
    setProbeResults([]);
    const out: ProbeResult[] = [];
    for (const p of PROBES) {
      try {
        const r = await NectarNfc.transceive(selectAidApdu(p.aid));
        const sw = `${r.sw1 ?? ""}${r.sw2 ?? ""}`;
        out.push({
          label: `${p.label} — ${p.note}`,
          ok: sw === "9000",
          response: r.responseHex,
          sw,
        });
      } catch (e) {
        out.push({
          label: `${p.label} — ${p.note}`,
          ok: false,
          response: (e as Error).message,
        });
      }
      setProbeResults([...out]);
    }
    setProbing(false);
  }

  async function fireCustom() {
    setCustomResp(null);
    try {
      const r = await NectarNfc.transceive(customApdu);
      setCustomResp(r);
    } catch (e) {
      setCustomResp({ responseHex: `ERROR: ${(e as Error).message}` });
    }
  }

  return (
    <div className="min-h-screen bg-[#1a1108] text-amber-50">
      <header className="flex items-center gap-3 border-b border-amber-900/40 px-4 py-3">
        <Link to="/pos" className="rounded p-2 hover:bg-amber-900/30">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-lg font-semibold">NFC Inspector</h1>
          <p className="text-xs text-amber-200/60">
            {native ? "Native NFC ready — tap a card" : "Browser mode — no NFC hardware"}
          </p>
        </div>
      </header>

      <main className="space-y-4 p-4 text-sm">
        {error && (
          <div className="rounded border border-red-700/60 bg-red-950/40 p-3 text-red-200">
            {error}
          </div>
        )}

        {!event ? (
          <div className="rounded border border-amber-900/40 bg-black/30 p-6 text-center text-amber-200/70">
            Waiting for tap…
          </div>
        ) : (
          <>
            <Section title="Identity">
              <Kv k="UID" v={event.uid ?? "(none)"} />
              <Kv k="Action" v={event.action} />
              <Kv k="Tech list" v={(event.techList ?? []).join(", ") || "(none)"} />
            </Section>

            {event.isoDep && (
              <Section title="ISO-DEP (smartcard channel)">
                <Kv k="Historical bytes" v={event.isoDep.historicalBytesHex || "(empty)"} />
                <Kv k="Hi-layer response" v={event.isoDep.hiLayerResponseHex || "(empty)"} />
                <Kv k="Max transceive" v={String(event.isoDep.maxTransceiveLength)} />
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={runProbes}
                    disabled={probing}
                    className="flex items-center gap-2 rounded bg-amber-500 px-3 py-2 font-semibold text-black disabled:opacity-50"
                  >
                    <Zap className="h-4 w-4" />
                    {probing ? "Probing…" : "Probe known AIDs"}
                  </button>
                </div>
              </Section>
            )}

            {probeResults.length > 0 && (
              <Section title="AID probe results">
                <div className="space-y-1 font-mono text-xs">
                  {probeResults.map((r, i) => (
                    <div key={i} className={r.ok ? "text-emerald-300" : "text-amber-200/70"}>
                      {r.ok ? "✓" : "·"} [{r.sw ?? "----"}] {r.label}
                      {r.response && r.response.length > 4 && (
                        <div className="ml-4 break-all text-amber-100/50">{r.response}</div>
                      )}
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {event.isoDep && (
              <Section title="Custom APDU">
                <input
                  value={customApdu}
                  onChange={(e) => setCustomApdu(e.target.value.replace(/\s/g, ""))}
                  className="w-full rounded border border-amber-900/60 bg-black/40 p-2 font-mono text-xs"
                  spellCheck={false}
                />
                <button
                  onClick={fireCustom}
                  className="mt-2 rounded bg-amber-500 px-3 py-2 font-semibold text-black"
                >
                  Transceive
                </button>
                {customResp && (
                  <div className="mt-2 rounded bg-black/40 p-2 font-mono text-xs">
                    <div>SW: {customResp.sw1}{customResp.sw2}</div>
                    <div className="break-all text-amber-100/70">{customResp.responseHex}</div>
                  </div>
                )}
              </Section>
            )}

            <Section title="NDEF records">
              {event.records.length === 0 ? (
                <div className="text-amber-200/60">No NDEF records (raw / secure-element card)</div>
              ) : (
                <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded bg-black/40 p-2 font-mono text-xs">
                  {JSON.stringify(event.records, null, 2)}
                </pre>
              )}
            </Section>

            <Section title="Parsed">
              <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded bg-black/40 p-2 font-mono text-xs">
                {JSON.stringify(event.parsed, null, 2)}
              </pre>
            </Section>
          </>
        )}
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded border border-amber-900/40 bg-black/30 p-3">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-300/80">{title}</h2>
      {children}
    </section>
  );
}

function Kv({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-3 py-0.5">
      <span className="w-32 shrink-0 text-amber-200/60">{k}</span>
      <span className="break-all font-mono text-xs">{v}</span>
    </div>
  );
}
