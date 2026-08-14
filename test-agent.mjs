import { AzureCliCredential } from "@azure/identity";

const endpoint =
  "https://talk-writer-agent.services.ai.azure.com/openai/v1";
const agentName = "talk-writer-agent";

try {
  console.log("1) Getting token from your az login...");
  const credential = new AzureCliCredential();
  const token = await credential.getToken("https://ai.azure.com/.default");
  console.log("   Token OK:", token ? token.token.slice(0, 8) + "..." : "NONE");

  console.log("2) Calling the agent...");
  const res = await fetch(`${endpoint}/openai/v1/responses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: "Reply with the single word: hello",
      agent_reference: { name: agentName, type: "agent_reference" },
    }),
  });

  const text = await res.text();
  console.log("   Status:", res.status);
  console.log("   Body:", text.slice(0, 800));
} catch (err) {
  console.log("ERROR MESSAGE:", err?.message);
  console.log("ERROR CAUSE CODE:", err?.cause?.code);
  console.log("ERROR CAUSE MESSAGE:", err?.cause?.message);
}