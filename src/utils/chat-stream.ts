import type { ChatStreamResult } from "../types/tools";

export function parseChatStream(
  stream: string,
  fallbackChatId: string | null = null,
): ChatStreamResult {
  let chatId: string | null = fallbackChatId;
  let text = "";
  for (const line of stream.split(/\r?\n/)) {
    if (!line.startsWith("data: ")) continue;
    const payload = line.slice(6).trim();
    if (payload === "[DONE]") continue;
    try {
      const frame = JSON.parse(payload) as Record<string, unknown>;
      const fragment = frame.delta ?? frame.textDelta;
      if (frame.type === "text-delta" && typeof fragment === "string")
        text += fragment;
      if (
        !chatId &&
        isRecord(frame.messageMetadata) &&
        typeof frame.messageMetadata.chatId === "string"
      ) {
        chatId = frame.messageMetadata.chatId;
      }
    } catch {
      // Ignore non-JSON SSE frames so protocol additions remain forwards compatible.
    }
  }
  return { chatId, text: text || stream };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
