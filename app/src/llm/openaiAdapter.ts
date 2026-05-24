import OpenAI from "openai";
import { BIOSIM_SYSTEM_PROMPT } from "./systemPrompt";

// API key from .env — Vite exposes VITE_* vars to the browser bundle.
const apiKey = (import.meta.env.VITE_OPENAI_API_KEY as string | undefined) ?? "";
export interface LlmMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Send a message to GPT-4o with the current config XML as context.
 * Prepends the XML in a <configuration> block to the user message so the
 * agent always sees the latest canvas state (F-LLM-2, F-LLM-6).
 */
export async function callLlm(
  history: LlmMessage[],
  userMessage: string,
  currentXml: string,
): Promise<string> {
  if (!apiKey) {
    throw new Error(
      "VITE_OPENAI_API_KEY is not set. Add it to your .env file and restart the dev server.",
    );
  }

  const client = new OpenAI({
    apiKey,
    // Route through the Vite dev-server proxy (/openai-api → api.openai.com).
    // This avoids browser CORS preflight and forbidden-header (User-Agent) issues.
    //baseURL: `${window.location.origin}/openai-api/v1`,
    dangerouslyAllowBrowser: true,
  });

  const contextualMessage =
    `<configuration>\n${currentXml}\n</configuration>\n\n${userMessage}`;

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: BIOSIM_SYSTEM_PROMPT },
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: contextualMessage },
  ];

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages,
  });

  return response.choices[0]?.message?.content ?? "";
}

/**
 * Returns the raw XML string if the LLM response contains a full .biosim
 * document, otherwise returns null (answer-only response, F-LLM-4).
 *
 * Detection: look for the <biosim> root element that parseBiosim() expects.
 */
export function extractXmlFromResponse(response: string): string | null {
  // Match <biosim ...> ... </biosim> (the actual root emitBiosim() produces)
  const biosimRoot = response.match(/<biosim[\s\S]*?<\/biosim>/);
  if (biosimRoot) return biosimRoot[0];

  return null;
}

export function isApiKeyConfigured(): boolean {
  return apiKey.length > 0;
}
