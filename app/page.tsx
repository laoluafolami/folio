"use client";

import { useEffect, useState } from "react";

type TalkSource = { type: string; reference?: string; text?: string };

type TalkResult = {
  id: string;
  title: string;
  centralMessage?: string;
  outline?: string;
  fullTalk?: string;
  sources?: TalkSource[];
  warning?: string;
};

type SavedTalk = TalkResult & {
  savedAt: string;
  meta?: { audience: string; tone: string; lengthMinutes: number };
};

const starterTopics = [
  "Trusting God in difficult times",
  "The dignity of work",
  "Friendship and everyday holiness",
  "Forgiving when it feels impossible",
  "Prayer in a noisy world",
];

const audiences = ["General", "Young adults", "Youth", "Professionals", "Retreat"];
const tones = ["Warm", "Inspiring", "Reflective", "Bold"];
const lengths = [15, 30, 45];

const fullJourney = [
  "Reading your uploaded books...",
  "Finding the right opening story...",
  "Drawing from the Catechism...",
  "Weaving in St. Josemaría...",
  "Shaping the spoken voice...",
  "Polishing the final draft...",
];

const outlineJourney = [
  "Sketching the structure...",
  "Choosing the opening story...",
  "Placing the anecdotes...",
  "Sharpening the central message...",
];

const LIBRARY_KEY = "folio-library";

function loadLibrary(): SavedTalk[] {
  try {
    const raw = window.localStorage.getItem(LIBRARY_KEY);
    return raw ? (JSON.parse(raw) as SavedTalk[]) : [];
  } catch {
    return [];
  }
}

function persistLibrary(list: SavedTalk[]) {
  try {
    window.localStorage.setItem(LIBRARY_KEY, JSON.stringify(list));
  } catch {
    // storage unavailable
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function textToHtml(value: string): string {
  return value
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br />")}</p>`)
    .join("");
}

function buildExportHtml(result: TalkResult): string {
  const parts: string[] = [];
  parts.push(`<h1>${escapeHtml(result.title)}</h1>`);
  if (result.centralMessage) {
    parts.push(`<p><strong>Central message:</strong> ${escapeHtml(result.centralMessage)}</p>`);
  }
  if (result.outline) {
    parts.push(`<h2>Outline</h2>`);
    parts.push(textToHtml(result.outline));
  }
  if (result.fullTalk) {
    parts.push(`<h2>Full Talk</h2>`);
    parts.push(textToHtml(result.fullTalk));
  }
  const talkIncludesReferences = /references\s*:/i.test(result.fullTalk || "");
  if (!talkIncludesReferences && result.sources && result.sources.length > 0) {
    parts.push(`<h2>Sources</h2><ul>`);
    result.sources.forEach((s) => {
      const ref = s.reference ? ` — ${escapeHtml(s.reference)}` : "";
      const txt = s.text ? `: ${escapeHtml(s.text)}` : "";
      parts.push(`<li>${escapeHtml(s.type)}${ref}${txt}</li>`);
    });
    parts.push(`</ul>`);
  }
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  body { font-family: Georgia, "Times New Roman", serif; line-height: 1.75; color: #1d1a16; max-width: 780px; margin: 40px auto; padding: 0 24px; }
  h1 { font-size: 34px; line-height: 1.1; margin-bottom: 12px; }
  h2 { margin-top: 28px; margin-bottom: 10px; font-size: 22px; }
  p { margin: 0 0 14px; }
  ul { padding-left: 20px; }
  li { margin: 6px 0; }
  @media print { body { margin: 18mm; } }
</style>
</head>
<body>
${parts.join("\n")}
</body>
</html>`;
}

function downloadWord(result: TalkResult) {
  const blob = new Blob(["\ufeff", buildExportHtml(result)], {
    type: "application/msword;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "talk.doc";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function printPdf(result: TalkResult) {
  const frame = document.createElement("iframe");
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  document.body.appendChild(frame);
  const doc = frame.contentDocument || frame.contentWindow?.document;
  if (!doc) return;
  doc.open();
  doc.write(buildExportHtml(result));
  doc.close();
  window.setTimeout(() => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    window.setTimeout(() => frame.remove(), 10000);
  }, 350);
}

const BookIcon = () => (
  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
);

const LibraryIcon = () => (
  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m16 6 4 14" /><path d="M12 6v14" /><path d="M8 8v12" /><path d="M4 4v16" />
  </svg>
);

const CloseIcon = () => (
  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18" /><path d="m6 6 12 12" />
  </svg>
);

const FolderIcon = () => (
  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
  </svg>
);

const FeatherIcon = () => (
  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" />
    <line x1="16" y1="8" x2="2" y2="22" /><line x1="17.5" y1="15" x2="9" y2="15" />
  </svg>
);

const SparkIcon = () => (
  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
  </svg>
);

export default function Home() {
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("General");
  const [tone, setTone] = useState("Warm");
  const [lengthMinutes, setLengthMinutes] = useState(30);
  const [extra, setExtra] = useState("");
  const [showMore, setShowMore] = useState(false);

  const [loading, setLoading] = useState<"" | "outline" | "full">("");
  const [result, setResult] = useState<TalkResult | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const [libraryOpen, setLibraryOpen] = useState(false);
  const [library, setLibrary] = useState<SavedTalk[]>(() => loadLibrary());
  const [statusIndex, setStatusIndex] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLibraryOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!loading) {
      setStatusIndex(0);
      return;
    }
    const journey = loading === "full" ? fullJourney : outlineJourney;
    const interval = window.setInterval(() => {
      setStatusIndex((prev) => Math.min(prev + 1, journey.length - 1));
    }, 5000);
    return () => window.clearInterval(interval);
  }, [loading]);

  async function generate(mode: "outline" | "full") {
    if (!topic.trim()) {
      setError("Please enter a topic first.");
      return;
    }
    setError("");
    setLoading(mode);
    const id =
      (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `talk-${Date.now()}`);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          audience,
          occasion: audience === "Retreat" ? "Retreat talk" : "Talk",
          lengthMinutes,
          tone,
          extra,
          mode,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The generator could not be reached.");

      setResult({
        id,
        title: data.title || topic,
        centralMessage: data.central_message || data.centralMessage || "",
        outline: data.outline || "",
        fullTalk: data.full_talk || data.fullTalk || "",
        sources: data.sources || [],
        warning: data.warning || "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading("");
    }
  }

  function saveTalk() {
    if (!result) return;
    const entry: SavedTalk = {
      ...result,
      savedAt: new Date().toISOString(),
      meta: { audience, tone, lengthMinutes },
    };
    setLibrary((prev) => {
      const next = [entry, ...prev.filter((t) => t.id !== entry.id)];
      persistLibrary(next);
      return next;
    });
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1800);
  }

  function openTalk(t: SavedTalk) {
    setResult({ ...t });
    setLibraryOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function deleteTalk(id: string) {
    setLibrary((prev) => {
      const next = prev.filter((t) => t.id !== id);
      persistLibrary(next);
      return next;
    });
  }

  async function copyAll(talk: TalkResult) {
    const text = [
      talk.title,
      talk.centralMessage ? `Central message: ${talk.centralMessage}` : "",
      talk.outline ? `Outline:\n${talk.outline}` : "",
      talk.fullTalk ? `Full talk:\n${talk.fullTalk}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard unavailable
    }
  }

  function renderTalkWithCitations(talkText: string, sources: TalkSource[]) {
    if (!talkText) return null;
    const parts = talkText.split(/(\(\d+\))/g);
    return parts.map((part, index) => {
      const match = part.match(/^\((\d+)\)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        const source = sources[num - 1];
        if (source) {
          return (
            <span key={index} className="citation-wrapper" tabIndex={0}>
              <span className="citation-number">({num})</span>
              <span className="citation-tooltip">
                <strong className="tooltip-type">{source.type}</strong>
                {source.reference && <div className="tooltip-ref">{source.reference}</div>}
                {source.text && <div className="tooltip-text">“{source.text}”</div>}
              </span>
            </span>
          );
        }
      }
      return part;
    });
  }

  function renderFullTalk(talkText: string, sources: TalkSource[]) {
    const refMatch = talkText.match(/^\s*references\s*:/im);
    let body = talkText;
    let references = "";
    if (refMatch && typeof refMatch.index === "number") {
      body = talkText.slice(0, refMatch.index);
      references = talkText.slice(refMatch.index);
    }
    return (
      <>
        <div className="talkText">{renderTalkWithCitations(body, sources)}</div>
        {references && (
          <div className="referencesBox">{renderTalkWithCitations(references, sources)}</div>
        )}
      </>
    );
  }

  const journey = loading === "full" ? fullJourney : outlineJourney;
  const statusMessage = journey[Math.min(statusIndex, journey.length - 1)];

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbarInner">
          <div className="brand">
          <div className="brandMark">
              <img src="/logo.png" alt="Folio" className="brandLogo" />
            </div>
            <div>
              <div className="brandTitle">Folio</div>
              <div className="brandSub">Talk Atelier</div>
            </div>
          </div>
          <div className="topbarRight">
            <div className="pill"><span className="pillDot" /> Agent connected</div>
            <button className="pillButton" onClick={() => setLibraryOpen(true)}>
              <LibraryIcon /> Library
            </button>
          </div>
        </div>
      </header>

      <section className="hero fadeUp">
        <h1 className="heroTitle">
          Talks that feel <em>lived</em>, not written.
        </h1>
                <p className="heroCopy">
          Give Folio a topic and receive a talk that feeds the soul and sounds like a
          friend.
        </p>
        <div className="tryRow">
          <span className="tryLabel">Try a topic:</span>
          {starterTopics.map((t) => (
            <button key={t} className="chipButton" onClick={() => setTopic(t)}>
              {t}
            </button>
          ))}
        </div>
      </section>

      <main className="layout">
        <aside className="briefCard fadeUp">
          <div className="briefHead"><FeatherIcon /> The brief</div>

          <div className="fieldLabel">Topic of the talk</div>
          <textarea
            className="topicBox"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === "Enter") generate("full");
            }}
            placeholder="e.g. Trusting God in difficult times..."
          />
          <div className="tip">Tip: press Ctrl/⌘ + Enter to generate</div>

          <div className="fieldLabel">Audience</div>
          <div className="chipRow">
            {audiences.map((a) => (
              <button
                key={a}
                className={`chip ${audience === a ? "chipOn" : ""}`}
                onClick={() => setAudience(a)}
              >
                {a}
              </button>
            ))}
          </div>

                    <button className="moreBtn" onClick={() => setShowMore(!showMore)}>
            {showMore ? "Fewer options" : "More options"}
          </button>

          {showMore && (
            <>
              <div className="fieldLabel">Tone</div>
              <div className="chipRow">
                {tones.map((t) => (
                  <button
                    key={t}
                    className={`chip ${tone === t ? "chipOn" : ""}`}
                    onClick={() => setTone(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div className="fieldLabel">Anything else (optional)</div>
              <input
                className="noteBox"
                value={extra}
                onChange={(e) => setExtra(e.target.value)}
                placeholder="e.g. Emphasise mercy. Two anecdotes maximum."
              />
            </>
          )}

          <button className="composeBtn" onClick={() => generate("full")} disabled={Boolean(loading)}>
            <SparkIcon /> {loading === "full" ? "Composing..." : "Compose the talk"}
          </button>
          <button className="ghostBtn" onClick={() => generate("outline")} disabled={Boolean(loading)}>
            {loading === "outline" ? "Drafting outline..." : "or draft an outline first"}
          </button>

          {error && <div className="notice" style={{ marginTop: 14 }}>{error}</div>}
        </aside>

        <section className="stageCard fadeUp">
          {loading && (
            <div className="status">
              <span className="dot" />
              <span key={statusIndex} className="statusText">{statusMessage}</span>
            </div>
          )}

          {!result && !loading && (
            <div className="stageEmpty">
              <div className="quoteBadge">”</div>
              <p className="stageQuote">
                “Your talk will appear here — opening story, anecdotes, and all.”
              </p>
              <p className="stageHint">
                Pick a topic on the left, choose your audience and tone, then press Compose.
              </p>
            </div>
          )}

          {result && (
            <>
              <div className="resultHead">
                <div>
                  <div className="kicker">Generated draft</div>
                  <h2 className="resultTitle">{result.title}</h2>
                  {result.centralMessage && <p className="resultMeta">{result.centralMessage}</p>}
                </div>
                <div className="toolbar">
                  <button className="toolBtn primary" onClick={saveTalk}>
                    {savedFlash ? "Saved ✓" : "Save"}
                  </button>
                  <button className="toolBtn" onClick={() => copyAll(result)}>
                    {copied ? "Copied" : "Copy"}
                  </button>
                  <button className="toolBtn" onClick={() => downloadWord(result)}>Word</button>
                  <button className="toolBtn" onClick={() => printPdf(result)}>PDF</button>
                </div>
              </div>

              {result.warning && <div className="notice">{result.warning}</div>}

              {result.outline && (
                <div className="outlineBox">{renderTalkWithCitations(result.outline, result.sources || [])}</div>
              )}

              {result.fullTalk && renderFullTalk(result.fullTalk, result.sources || [])}
            </>
          )}
        </section>
      </main>

      <div className={`scrim ${libraryOpen ? "open" : ""}`} onClick={() => setLibraryOpen(false)} />

      <aside className={`libraryPanel ${libraryOpen ? "open" : ""}`}>
        <div className="libraryHead">
          <div>
            <div className="kicker">Your shelf</div>
            <h2 className="libraryTitle">Library</h2>
          </div>
          <button className="closeBtn" onClick={() => setLibraryOpen(false)} aria-label="Close library">
            <CloseIcon />
          </button>
        </div>
        <div className="libraryBody">
          {library.length === 0 ? (
            <div className="libraryEmpty">
              <FolderIcon />
              <p>Nothing saved yet. When a talk is good, press “Save” and it will live here.</p>
            </div>
          ) : (
            library.map((t) => (
              <div key={t.id} className="shelfItem" onClick={() => openTalk(t)}>
                <div>
                  <div className="shelfTitle">{t.title}</div>
                  <div className="shelfMeta">
                    {new Date(t.savedAt).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                    {t.meta ? ` · ${t.meta.audience} · ${t.meta.lengthMinutes} min` : ""}
                  </div>
                </div>
                <button
                  className="shelfDelete"
                  aria-label="Delete talk"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteTalk(t.id);
                  }}
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

            <footer className="footer">
        <div className="footerInner">
          <div className="footerBrand">Folio · Talk Atelier</div>
          <div className="footerNote">
            © {new Date().getFullYear()} Rizconect Solutions. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}