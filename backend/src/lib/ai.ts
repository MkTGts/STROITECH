import { CHATBOT_SYSTEM_PROMPT } from "../config/chatbotPrompt";

export async function callAssistant(userId: string, content: string): Promise<string> {
  const baseUrl = process.env.AI_API_URL || "https://agent.timeweb.cloud";
  const agentId = process.env.AI_AGENT_ID;
  const apiKey = process.env.AI_API_KEY;

  if (!agentId || !apiKey) {
    throw new Error("AI agent is not configured (AI_AGENT_ID / AI_API_KEY)");
  }

  const url = `${baseUrl.replace(/\/$/, "")}/api/v1/cloud-ai/agents/${agentId}/call`;

  const message = [
    CHATBOT_SYSTEM_PROMPT,
    "",
    `ID пользователя: ${userId}`,
    "",
    "Вопрос / сообщение пользователя:",
    content,
  ].join("\n");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "x-proxy-source": "stroitech-backend",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`AI API request failed: ${response.status} ${text}`);
  }

  const data: any = await response.json();
  const text: string | undefined = data?.message;
  if (!text) {
    throw new Error("AI API returned empty response");
  }
  return text;
}


