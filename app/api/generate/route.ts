import { NextResponse } from "next/server";
import dns from "node:dns";

// Permanently fixes the Windows "fetch failed / EAI_AGAIN" DNS glitch
dns.setDefaultResultOrder("ipv4first");

export const runtime = "nodejs";
export const maxDuration = 300;

type GenerateRequest = {
  topic: string;
  audience: string;
  occasion: string;
  lengthMinutes: number;
  tone: string;
  extra: string;
  mode: "outline" | "full";
};

function buildUserPrompt(body: GenerateRequest): string {
  return `Create a ${body.mode} for this talk.

Topic: ${body.topic}
Audience: ${body.audience}
Occasion: ${body.occasion}
Target length: ${body.lengthMinutes} minutes
Tone: ${body.tone}
Additional direction from speaker: ${body.extra || "None"}

${body.mode === "outline"
      ? "Return a spoken outline that starts with a story and includes 2 to 4 anecdotes."
      : "Return the full spoken talk, roughly 130 to 150 words per minute."}

STRICT STYLE RULES:
- Sound like a real person speaking aloud to an audience, not like a book or essay.
- Use direct address ("you", "we"), short sentences, rhetorical questions, and natural transitions.
- Begin with a real-life story or a clearly labeled illustrative story connected to the topic.
- Include 2 to 4 anecdotes or stories across the talk.
- Use Scripture, the Catechism of the Catholic Church, St. Josemaría Escrivá, and the uploaded books only when they genuinely strengthen the talk.
- Do not invent exact quotations. If not certain, paraphrase instead of quoting.
- Avoid academic tone and dense exposition.

CITATION AND REFERENCING RULES (CRITICAL):
- When quoting the Catechism of the Catholic Church, ALWAYS use the format: "Catechism point [number] says..." (e.g., "Catechism point 1505 says...").
- When quoting St. Josemaría or other books, ALWAYS mention the book title and section/point/page (e.g., "As St. Josemaría writes in 'The Way', point 291...").
- Immediately after referencing or quoting a source in the talk text, append an inline number like (1), (2), (3) in the exact order they appear.
- The 'sources' array in the JSON MUST contain these sources in the exact same order.
- At the very end of the 'full_talk' text, on a new line, add a "References:" section formatted exactly like this:
  References:
  (1) Catechism of the Catholic Church, paragraph 1505.
  (2) St. Josemaría Escrivá, The Way, point 291.

Return ONLY valid JSON with this shape (no markdown):
${body.mode === "outline"
      ? `{ "title": "string", "central_message": "string", "outline": "string" }`
      : `{ "title": "string", "central_message": "string", "outline": "string", "full_talk": "string", "sources": [{ "type": "string", "reference": "string", "text": "string" }] }`}
`;
}

function normalizeObject(data: any) {
  const outline = typeof data.outline === "string" ? data.outline : data.outline ? JSON.stringify(data.outline, null, 2) : "";
  const fullTalk = typeof data.full_talk === "string" ? data.full_talk : typeof data.fullTalk === "string" ? data.fullTalk : data.full_talk ? JSON.stringify(data.full_talk, null, 2) : "";
  return {
    title: data.title || "Generated talk",
    central_message: data.central_message || data.centralMessage || "",
    outline,
    full_talk: fullTalk,
    sources: Array.isArray(data.sources) ? data.sources : [],
    warning: data.warning || "",
  };
}

function parseAgentOutput(content: string, mode: "outline" | "full") {
  if (!content) return null;
  const clean = content.trim().replace(/^```json\s*/i, "").replace(/```$/, "");
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try { return normalizeObject(JSON.parse(clean.slice(start, end + 1))); } catch {}
  }
  if (mode === "outline") return { title: "Generated outline", central_message: "", outline: content, full_talk: "", sources: [], warning: "" };
  return { title: "Generated talk", central_message: "", outline: "", full_talk: content, sources: [], warning: "" };
}

function demoResponse(body: GenerateRequest) {
  const title = body.topic?.trim() || "Your talk topic";
  return {
    title,
    central_message: `A clear, practical, spoken message about ${title.toLowerCase()}.`,
    outline: body.mode === "outline" ? "1. Opening story\n2. Human experience\n3. Spiritual insight\n4. Practical step\n5. Hopeful conclusion" : "",
    full_talk: body.mode === "full" ? "Sample mode. Connect Azure to generate the real talk." : "",
    sources: [],
    warning: "Sample mode is active.",
  };
}

export async function POST(request: Request) {
  let body: GenerateRequest = { topic: "", audience: "", occasion: "", lengthMinutes: 30, tone: "", extra: "", mode: "full" };
  
  try {
    body = (await request.json()) as GenerateRequest;
    if (!body.topic) return NextResponse.json({ error: "Topic is required." }, { status: 400 });

    // 1. The CORRECT Project Endpoint for Agents (from your Foundry portal)
    const projectEndpoint = "https://talk-writer-agent.services.ai.azure.com/api/projects/laoluafolami-8396";
    const agentName = "talk-writer-agent";

    // 2. Get the API Key from the live server environment
    const apiKey = process.env.AZURE_PROJECT_API_KEY;
    if (!apiKey) throw new Error("Missing AZURE_PROJECT_API_KEY in Azure Environment Variables");

   // 3. Call the Foundry Agent Responses API using the API Key
    const url = `${projectEndpoint}/openai/v1/responses`;

    const response = await fetch(url, {
     method: "POST",
     headers: {
       "api-key": apiKey,
       "Content-Type": "application/json",
     },
      body: JSON.stringify({
        input: buildUserPrompt(body),
        agent_reference: {
          name: agentName,
          type: "agent_reference",
        },
      }),
    });

    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(`Foundry API error ${response.status}: ${responseText.slice(0, 500)}`);
    }

    let data = JSON.parse(responseText);

    // Poll if the agent is still reading books/thinking (background mode)
    let guard = 0;
    while (data.status === "in_progress" || data.status === "queued") {
      if (guard++ > 60) throw new Error("Agent timed out after 3 minutes.");
      await new Promise((r) => setTimeout(r, 3000)); // Wait 3 seconds
      
      const pollRes = await fetch(`${url}/${data.id}`, {
        headers: { Authorization: `Bearer ${token.token}` },
      });
      const pollText = await pollRes.text();
      if (!pollRes.ok) throw new Error(`Poll error: ${pollText}`);
      data = JSON.parse(pollText);
    }

    // Extract the final text
    let finalText = data.output_text || "";
    if (!finalText && Array.isArray(data.output)) {
      finalText = data.output
        .filter((item: any) => item.type === "message")
        .flatMap((item: any) => item.content || [])
        .map((c: any) => c.text)
        .join("\n\n");
    }

    const parsed = parseAgentOutput(finalText, body.mode);

    if (!parsed) {
      return NextResponse.json({ ...demoResponse(body), warning: "The agent returned an empty response." });
    }

    return NextResponse.json(parsed);

  } catch (error) {
    console.error("Azure Agent Error:", error);
        const cause = (error as any)?.cause;
    const raw =
      error instanceof Error
        ? `${error.message}${cause ? ` [cause: ${cause.code || cause.message || "see terminal"}]` : ""}`
        : "Unknown error";
    return NextResponse.json({ ...demoResponse(body), warning: `Azure error: ${raw}` });
  }
}