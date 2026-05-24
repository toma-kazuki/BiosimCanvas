import { useCallback, useEffect, useRef, useState } from "react";
import { useCanvasStore } from "../../state/store";
import { callLlm, extractXmlFromResponse, isApiKeyConfigured } from "../../llm/openaiAdapter";
import { emitBiosim } from "../../io/emitBiosim";
import { parseBiosim } from "../../io/parseBiosim";

/**
 * LLM chat sidebar — right-panel "Chat" tab.
 * Implements F-LLM-1 through F-LLM-6 and NF-11.
 */
export function LlmChat() {
  const doc = useCanvasStore((s) => s.doc);
  const replaceDoc = useCanvasStore((s) => s.replaceDoc);
  const undo = useCanvasStore((s) => s.undo);
  const chatMessages = useCanvasStore((s) => s.chatMessages);
  const addChatMessage = useCanvasStore((s) => s.addChatMessage);
  const clearChat = useCanvasStore((s) => s.clearChat);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastAppliedIndex, setLastAppliedIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const apiConfigured = isApiKeyConfigured();

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages, loading]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading || !apiConfigured) return;
    setInput("");

    // Append user message
    addChatMessage({ role: "user", content: text });

    // Serialize current config as context (F-LLM-2)
    const currentXml = doc ? emitBiosim(doc) : "<BiosimInitConfig/>";

    // Build history excluding the message we just added (store update is async)
    const historyForCall = chatMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    setLoading(true);
    try {
      const response = await callLlm(historyForCall, text, currentXml);
      const xml = extractXmlFromResponse(response);

      if (xml) {
        // Config update path (F-LLM-3)
        try {
          const parsed = parseBiosim(xml, doc?.sourceName ?? "llm-output.biosim");
          replaceDoc(parsed); // pushes to undo stack
          const idx = chatMessages.length + 1; // index after user + assistant
          setLastAppliedIndex(idx);
          addChatMessage({ role: "assistant", content: response, appliedConfig: true });
        } catch {
          addChatMessage({
            role: "assistant",
            content:
              response +
              "\n\n⚠ The generated XML could not be parsed. The canvas was not updated.",
          });
        }
      } else {
        // Answer-only path (F-LLM-4)
        addChatMessage({ role: "assistant", content: response });
      }
    } catch (err) {
      // API error — show in chat, no crash (NF-11)
      addChatMessage({
        role: "assistant",
        content: `⚠ API error: ${(err as Error).message}`,
      });
    } finally {
      setLoading(false);
    }
  }, [input, loading, apiConfigured, doc, chatMessages, addChatMessage, replaceDoc]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      void send();
    }
  };

  const moduleCount = doc?.modules.length ?? 0;

  if (!apiConfigured) {
    return (
      <div className="llm-chat llm-no-key">
        <div className="llm-no-key-title">API key not configured</div>
        <p>
          Add your OpenAI API key to <code>.env</code> in the <code>app/</code> folder:
        </p>
        <pre className="llm-code">VITE_OPENAI_API_KEY=sk-...</pre>
        <p>Then restart the dev server (<code>npm run dev</code>).</p>
      </div>
    );
  }

  return (
    <div className="llm-chat">
      {/* Context indicator (F-LLM-2) */}
      <div className="llm-context-bar">
        Context: current config — {moduleCount} module{moduleCount !== 1 ? "s" : ""}
        {chatMessages.length > 0 && (
          <button type="button" className="llm-clear" onClick={clearChat} title="Clear chat">
            Clear
          </button>
        )}
      </div>

      {/* Message list */}
      <div className="llm-messages" ref={scrollRef}>
        {chatMessages.length === 0 && (
          <div className="llm-empty">
            Ask me to generate or modify the configuration, or ask a question about BioSim.
          </div>
        )}
        {chatMessages.map((msg, i) => (
          <div
            key={i}
            className={`llm-msg llm-msg-${msg.role}`}
          >
            <div className="llm-msg-content">
              {/* Strip the raw XML from the display text for cleanliness */}
              {stripXmlBlock(msg.content)}
            </div>
            {msg.appliedConfig && (
              <div className="llm-applied">
                Canvas updated
                {lastAppliedIndex === i && (
                  <>
                    {" "}·{" "}
                    <button
                      type="button"
                      className="llm-undo-link"
                      onClick={() => { undo(); setLastAppliedIndex(null); }}
                    >
                      Undo
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="llm-msg llm-msg-assistant llm-thinking">
            <div className="llm-msg-content">
              <span className="llm-dot" /><span className="llm-dot" /><span className="llm-dot" />
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="llm-input-row">
        <textarea
          className="llm-input"
          placeholder="Ask a question or describe a change… (⌘/Ctrl+Enter to send)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          rows={3}
          disabled={loading}
        />
        <button
          type="button"
          className="llm-send"
          onClick={() => void send()}
          disabled={loading || !input.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}

/** Remove raw XML blocks from display text so the chat stays readable. */
function stripXmlBlock(text: string): string {
  return text
    .replace(/<\?xml[\s\S]*?<\/BiosimInitConfig>/g, "[configuration updated]")
    .replace(/<BiosimInitConfig[\s\S]*?<\/BiosimInitConfig>/g, "[configuration updated]")
    .trim();
}
