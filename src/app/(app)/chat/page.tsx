"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Send, Trash2 } from "lucide-react";
import { toast } from "sonner";

const PRESET_QUESTIONS = [
  "How much did I spend on food this month?",
  "What's my biggest expense category?",
  "How are my savings looking?",
  "Summarize my finances this month",
];

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ChatPage() {
  const savedMessages = useQuery(api.chat.list, { limit: 20 }) ?? [];
  const saveMessage = useMutation(api.chat.save);
  const clearHistory = useMutation(api.chat.clearHistory);
  const dashboardSummary = useQuery(api.dashboard.getSummary);

  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Sync saved messages into local state on first load
  useEffect(() => {
    if (savedMessages.length > 0 && localMessages.length === 0) {
      setLocalMessages(savedMessages.map((m: { role: "user" | "assistant"; content: string }) => ({ role: m.role, content: m.content })));
    }
  }, [savedMessages]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localMessages, streaming]);

  async function sendMessage(content: string) {
    if (!content.trim() || streaming) return;
    setInput("");

    const userMsg: Message = { role: "user", content: content.trim() };
    const newMessages = [...localMessages, userMsg];
    setLocalMessages(newMessages);

    try {
      await saveMessage({ role: "user", content: userMsg.content });
    } catch { /* non-blocking */ }

    setStreaming(true);
    let assistantText = "";
    const assistantMsg: Message = { role: "assistant", content: "" };
    setLocalMessages([...newMessages, assistantMsg]);

    try {
      const snap = dashboardSummary
        ? {
            totalBalance: dashboardSummary.totalBalance,
            monthIncome: dashboardSummary.monthIncome,
            monthExpenses: dashboardSummary.monthExpenses,
            netSavings: dashboardSummary.netSavings,
            topCategories: dashboardSummary.categorySpend.slice(0, 3).map((c: { name: string; amount: number }) => ({
              name: c.name,
              amount: c.amount,
            })),
          }
        : undefined;

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.slice(-20),
          financialSnapshot: snap,
        }),
      });

      if (!res.ok) {
        throw new Error("AI service unavailable");
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));
        for (const line of lines) {
          const data = line.slice(6);
          if (data === "[DONE]") break;
          try {
            const { text } = JSON.parse(data) as { text: string };
            assistantText += text;
            setLocalMessages([...newMessages, { role: "assistant", content: assistantText }]);
          } catch { /* skip malformed chunk */ }
        }
      }

      await saveMessage({ role: "assistant", content: assistantText });
    } catch {
      const errorText = "I'm having trouble connecting right now. Please try again in a moment.";
      setLocalMessages([...newMessages, { role: "assistant", content: errorText }]);
      toast.error("Couldn't reach AI");
    } finally {
      setStreaming(false);
    }
  }

  async function handleClear() {
    if (!confirm("Clear chat history?")) return;
    await clearHistory();
    setLocalMessages([]);
  }

  const hasMessages = localMessages.length > 0;

  return (
    <div className="flex flex-col h-[calc(100vh-7.5rem)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div>
          <p className="text-sm font-medium">penny-wise AI</p>
          <p className="text-xs text-muted-foreground">Ask anything about your finances</p>
        </div>
        {hasMessages && (
          <button onClick={handleClear} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-4">
        {!hasMessages && (
          <div className="flex flex-col items-center gap-6 pt-8">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-2xl">
              🤖
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Ask me anything about your finances. I know your numbers.
            </p>
            <div className="flex flex-col gap-2 w-full max-w-sm">
              {PRESET_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-left text-sm text-foreground/80 border border-border rounded-lg px-4 py-2.5 hover:bg-surface-hover transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {localMessages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              "flex mb-4",
              msg.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-card border border-border rounded-bl-sm"
              )}
            >
              {msg.content || (
                <span className="flex gap-1 items-center text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" />
                </span>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </ScrollArea>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border flex gap-2 items-end">
        <Textarea
          placeholder="Ask about your finances…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage(input);
            }
          }}
          rows={1}
          className="resize-none min-h-[40px] max-h-32"
          disabled={streaming}
        />
        <Button
          size="icon"
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || streaming}
          className="shrink-0"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
