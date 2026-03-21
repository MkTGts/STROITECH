import { CHATBOT_SYSTEM_PROMPT } from "../config/chatbotPrompt";

export type AssistantTurn = {
  role: "user" | "assistant";
  content: string;
};

/**
 * Отправляет в Timeweb Cloud AI до 7 последних реплик (хронологически),
 * последняя должна быть от пользователя — на неё и ориентируется ответ агента.
 */
export async function callAssistant(userId: string, turns: AssistantTurn[]): Promise<string> {
  const baseUrl = process.env.AI_API_URL || "https://agent.timeweb.cloud";
  const agentId = process.env.AI_AGENT_ID;
  const apiKey = process.env.AI_API_KEY;

  if (!agentId || !apiKey) {
    throw new Error("AI agent is not configured (AI_AGENT_ID / AI_API_KEY)");
  }

  const url = `${baseUrl.replace(/\/$/, "")}/api/v1/cloud-ai/agents/${agentId}/call`;

  const recent = turns.slice(-7);
  const dialogBlock =
    recent.length > 0
      ? [
          "",
          "Диалог (до 7 последних реплик, от более ранних к более поздним):",
          ...recent.map((t) =>
            t.role === "user"
              ? `Пользователь: ${t.content}`
              : `Ассистент: ${t.content}`,
          ),
          "",
          "Ответь на последнюю реплику пользователя, опираясь на весь приведённый диалог выше.",
        ].join("\n")
      : "";

  const message = [CHATBOT_SYSTEM_PROMPT, "", `ID пользователя: ${userId}`, dialogBlock].join("\n");

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


