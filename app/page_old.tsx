"use client";

import { useState } from "react";

type TalkSource = {
  type: string;
  reference?: string;
  text?: string;
};

type TalkResult = {
  title: string;
  centralMessage?: string;
  outline?: string;
  fullTalk?: string;
  sources?: TalkSource[];
  warning?: string;
};

type FormState = {
  topic: string;
  audience: string;
  occasion: string;
  lengthMinutes: number;
  tone: string;
  extra: string;
};

const starterTopics = [
  "Holiness in ordinary work",
  "Finding God in suffering",
  "Prayer in family life",
  "Courage in uncertainty",
  "The Eucharist changes everything",
];

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
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br />")}</p>`)
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
    parts.push(`<h2>Sources</h2>`);
    parts.push(`<ul>`);
    result.sources.forEach((source) => {
      const reference = source.reference ? ` — ${escapeHtml(source.reference)}` : "";
      const text = source.text ? `: ${escapeHtml(source.text)}` : "";
      parts.push(`<li>${escapeHtml(source.type)}${reference}${text}</li>`);
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
  const html = buildExportHtml(result);
  const blob = new Blob(["\ufeff", html], {
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
  const html = buildExportHtml(result);
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
  doc.write(html);
  doc.close();

  window.setTimeout(() => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    window.setTimeout(() => frame.remove(), 10000);
  }, 350);
}

export default function Home() {
  const [form, setForm] = useState<FormState>({
    topic: "",
    audience: "Parish adults",
    occasion: "Talk",
    lengthMinutes: 30,
    tone: "Warm, natural, spoken",
    extra: "",
  });

  const [loading, setLoading] = useState<"" | "outline" | "full">("");
  const [result, setResult] = useState<TalkResult | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function generate(mode: "outline" | "full") {
    if (!form.topic.trim()) {
      setError("Please enter a topic first.");
      return;
    }

    setError("");
    setLoading(mode);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          lengthMinutes: Number(form.lengthMinutes),
          mode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "The generator could not be reached.");
      }

      setResult({
        title: data.title || form.topic,
        centralMessage: data.central_message || data.centralMessage || "",
        outline: data.outline || "",
        fullTalk: data.full_talk || data.fullTalk || "",
        sources: data.sources || [],
        warning: data.warning || "",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
    } finally {
      setLoading("");
    }
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

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbarInner">
          <div className="brand">
            <div className="brandMark">TS</div>
            <div className="brandText">
              <div className="brandTitle">Talk Studio</div>
              <div className="brandSub">Azure Foundry Edition</div>
            </div>
          </div>
          <div className="badge">Spoken-first • Source-aware • Human-toned</div>
        </div>
      </header>

      <main className="layout">
        <aside className="panel composer fadeUp">
          <div className="sectionLabel">Talk brief</div>

          <div className="field">
            <label className="label" htmlFor="topic">Topic</label>
            <input
              id="topic"
              className="input"
              value={form.topic}
              onChange={(e) => update("topic", e.target.value)}
              placeholder="e.g. Finding God in ordinary work"
              autoComplete="off"
            />
          </div>

          <div className="grid2">
            <div className="field">
              <label className="label" htmlFor="audience">Audience</label>
              <input
                id="audience"
                className="input"
                value={form.audience}
                onChange={(e) => update("audience", e.target.value)}
                placeholder="e.g. Young professionals"
                autoComplete="off"
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="occasion">Occasion</label>
              <input
                id="occasion"
                className="input"
                value={form.occasion}
                onChange={(e) => update("occasion", e.target.value)}
                placeholder="e.g. Parish retreat"
                autoComplete="off"
              />
            </div>
          </div>

          <div className="grid2">
            <div className="field">
              <label className="label" htmlFor="length">Length</label>
              <select
                id="length"
                className="select"
                value={form.lengthMinutes}
                onChange={(e) => update("lengthMinutes", Number(e.target.value))}
              >
                <option value={10}>10 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={20}>20 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
              </select>
            </div>
            <div className="field">
              <label className="label" htmlFor="tone">Tone</label>
              <input
                id="tone"
                className="input"
                value={form.tone}
                onChange={(e) => update("tone", e.target.value)}
                placeholder="Warm, pastoral, direct"
                autoComplete="off"
              />
            </div>
          </div>

          <div className="field">
            <label className="label" htmlFor="extra">Extra direction</label>
            <textarea
              id="extra"
              className="textarea"
              value={form.extra}
              onChange={(e) => update("extra", e.target.value)}
              placeholder="Add a personal story, a scripture preference, or anything you want emphasized."
            />
          </div>

          <div className="actions">
            <button
              className="button buttonSecondary"
              onClick={() => generate("outline")}
              disabled={Boolean(loading)}
            >
              {loading === "outline" ? "Preparing..." : "Generate Outline"}
            </button>
            <button
              className="button buttonPrimary"
              onClick={() => generate("full")}
              disabled={Boolean(loading)}
            >
              {loading === "full" ? "Writing..." : "Generate Full Talk"}
            </button>
          </div>

          <div className="microNote">
            The app starts in sample mode. Add your Azure endpoint in
            <strong> .env.local</strong> to connect your Foundry agent.
          </div>

          {error && <div className="notice">{error}</div>}
        </aside>

        <section className="panel outputPanel fadeUp">
          {loading && (
            <div className="status">
              <span className="dot" />
              {loading === "outline"
                ? "Preparing the outline..."
                : "Writing the spoken draft..."}
            </div>
          )}

          {!result && !loading && (
            <div className="emptyState">
              <div className="emptyKicker">Talk Composer</div>
              <h1 className="emptyTitle">
                Create talks that sound like a person, not a document.
              </h1>
              <p className="emptyCopy">
                Enter a topic, choose your audience, and generate a spoken-first
                draft with story-led structure, clear points, and source-aware
                references.
              </p>
              <div className="chips">
                {starterTopics.map((topic) => (
                  <button
                    key={topic}
                    className="chipButton"
                    onClick={() => update("topic", topic)}
                  >
                    {topic}
                  </button>
                ))}
              </div>
            </div>
          )}

          {result && (
            <>
              <div className="resultHeader">
                <div>
                  <div className="sectionLabel">Generated draft</div>
                  <h1 className="resultTitle">{result.title}</h1>
                  {result.centralMessage && (
                    <p className="resultMeta">{result.centralMessage}</p>
                  )}
                </div>
                <div className="toolbar">
                  <button className="toolButton" onClick={() => copyAll(result)}>
                    {copied ? "Copied" : "Copy"}
                  </button>
                  <button className="toolButton" onClick={() => downloadWord(result)}>
                    Word
                  </button>
                  <button className="toolButton" onClick={() => printPdf(result)}>
                    PDF
                  </button>
                </div>
              </div>

              {result.warning && <div className="notice">{result.warning}</div>}

              {result.outline && (
                <div>
                  <div className="sectionLabel">Outline</div>
                  <div className="outlineBox">{result.outline}</div>
                </div>
              )}

              {result.fullTalk && (
                <div>
                  <div className="sectionLabel">Full spoken script</div>
                  {renderFullTalk(result.fullTalk, result.sources || [])}
                </div>
              )}

              {result.sources &&
                result.sources.length > 0 &&
                !/references\s*:/i.test(result.fullTalk || "") && (
                  <div>
                    <div className="sectionLabel">Sources</div>
                    <div className="sources">
                      {result.sources.map((source, index) => (
                        <div key={index} className="sourceCard">
                          <div className="sourceType">{source.type}</div>
                          {source.reference && (
                            <div>
                              <strong>{source.reference}</strong>
                            </div>
                          )}
                          {source.text && <div>{source.text}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </>
          )}
        </section>
      </main>

      <footer className="footer">
        Built with Next.js and Azure AI Foundry. Review quotes and sources before use.
      </footer>
    </div>
  );
}