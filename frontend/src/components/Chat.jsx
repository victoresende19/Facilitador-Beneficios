import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function generateSessionId() {
  if (window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return "sessao-" + Math.random().toString(36).substring(2, 10);
}

export default function Chat() {
  const [sessionId, setSessionId] = useState("");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setSessionId(generateSessionId());
  }, []);

  const handleSend = async (e) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || !sessionId) return;

    // adiciona mensagem do usuário otimistamente
    const newMessages = [...messages, { role: "user", content: trimmed }];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("https://facilitador-beneficios.onrender.com/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session_id: sessionId,
          message: trimmed,
        }),
      });

      if (!res.ok) {
        throw new Error("Erro na resposta da API");
      }

      const data = await res.json();
      setMessages(data.messages);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Tive um problema ao falar com o servidor. Tente novamente em instantes.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-panel">
        <div className="chat-messages">
          {messages.length === 0 && (
            <div className="chat-empty">
              <h2>Bem-vindo(a) 👋</h2>
              <p>
                Sou o agente <strong>“Facilitador Benefícios”</strong>. Pergunte
                sobre regras, elegibilidade ou informações sobre benefícios.
              </p>
              <p className="chat-empty-hint">
                Ex: “Quais os benefícios da empresa?”
              </p>
            </div>
          )}

          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`chat-bubble-row ${m.role === "user"
                  ? "chat-bubble-row-user"
                  : "chat-bubble-row-assistant"
                }`}
            >
              <div
                className={`chat-bubble ${m.role === "user"
                    ? "chat-bubble-user"
                    : "chat-bubble-assistant"
                  }`}
              >
                <div className="chat-markdown">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({ node, ...props }) => (
                        <p  {...props} />
                      ),
                      ul: ({ node, ...props }) => (
                        <ul
                          {...props}
                        />
                      ),
                      ol: ({ node, ...props }) => (
                        <ol
                          {...props}
                        />
                      ),
                      li: ({ node, ...props }) => (
                        <li {...props} />
                      ),
                    }}
                  >
                    {m.content}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="chat-bubble-row chat-bubble-row-assistant">
              <div className="chat-bubble chat-bubble-assistant chat-typing">
                Digitando... Isso pode levar alguns segundos, aguarde... ⏳
              </div>
            </div>
          )}
        </div>

        <form className="chat-input-row" onSubmit={handleSend}>
          <input
            type="text"
            placeholder="Digite sua dúvida sobre benefícios..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
          />
          <button type="submit" disabled={isLoading || !input.trim()}>
            Enviar
          </button>
        </form>
      </div>
    </div>
  );
}
