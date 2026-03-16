import { CHATBOT_SYSTEM_PROMPT } from "../config/chatbotPrompt";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export async function callAssistant(userId: string, content: string): Promise<string> {
  if (!process.env.AI_API_URL || !process.env.AI_API_KEY) {
    throw new Error("AI API is not configured");
  }

  const messages: ChatMessage[] = [
    { role: "system", content: CHATBOT_SYSTEM_PROMPT },
    {
      role: "system",
      content: `ID пользователя: ${userId}. Отвечай, учитывая, что это диалог внутри сервиса "Объекты.online".`,
    },
    { role: "user", content },
  ];

  const response = await fetch(process.env.AI_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.AI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.AI_MODEL || "gpt-4.1-mini",
      messages,
    }),
  });

  if (!response.ok) {
    throw new Error("AI API request failed");
  }

  const data: any = await response.json();
  const text: string | undefined = data?.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error("AI API returned empty response");
  }
  return text;
}

