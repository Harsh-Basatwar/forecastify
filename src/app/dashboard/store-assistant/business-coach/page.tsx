/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Brain, ArrowLeft, Send, Sparkles, Lightbulb, MessageSquare } from "lucide-react";
import { useStoreAssistant } from "@/hooks/use-store-assistant";

export default function BusinessCoachPage() {
  const { callApi } = useStoreAssistant();
  const [adviceList, setAdviceList] = useState<any[]>([]);
  const [question, setQuestion] = useState("");
  const [chatHistory, setChatHistory] = useState<{ q: string; a: string }[]>([]);
  const [asking, setAsking] = useState(false);

  const loadAdvice = async () => {
    const advice = await callApi("coach.daily");
    if (advice) setAdviceList(advice);
  };

  useEffect(() => {
    loadAdvice();
  }, []);

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setAsking(true);
    const qText = question;
    setQuestion("");
    const answer = await callApi("coach.ask", { question: qText });
    setChatHistory((prev) => [...prev, { q: qText, a: answer || "I am analyzing your store metrics." }]);
    setAsking(false);
  };

  return (
    <div className="space-y-6 p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/store-assistant" className="p-2 rounded-lg bg-card hover:bg-accent/10 border border-border text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="w-6 h-6 text-accent" /> AI Business Coach
          </h1>
          <p className="text-xs text-muted-foreground">Proactive business advice & interactive Q&A for shop owners</p>
        </div>
      </div>

      {/* Daily Advice Section */}
      <div className="space-y-4">
        <h2 className="text-base font-bold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent" /> Today's Actionable Coaching Recommendations
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {adviceList.map((adv) => (
            <div key={adv.id} className="fx-card p-5 space-y-3 border-l-4 border-l-accent">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-accent/15 text-accent">
                  {adv.category}
                </span>
                <span className="text-[10px] font-semibold text-muted-foreground">{adv.priority} priority</span>
              </div>
              <h3 className="text-sm font-bold">{adv.title}</h3>
              <p className="text-xs text-muted-foreground">{adv.advice}</p>
              <div className="pt-2 border-t border-border/40 text-[11px] font-bold text-accent">
                Expected Impact: {adv.impact}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ask Coach Q&A Box */}
      <div className="fx-card p-6 space-y-4">
        <h2 className="text-base font-bold flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-accent" /> Ask Your Business Coach
        </h2>

        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
          {chatHistory.map((item, idx) => (
            <div key={idx} className="space-y-2 text-xs">
              <div className="p-3 rounded-lg bg-card border border-border text-foreground font-semibold">
                <strong>You:</strong> {item.q}
              </div>
              <div className="p-3 rounded-lg bg-accent/10 border border-accent/30 text-accent-foreground">
                <strong className="text-accent">Coach:</strong> {item.a}
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleAsk} className="flex items-center gap-2 pt-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask anything (e.g., How can I increase monthly profits?)"
            className="flex-1 bg-background border border-border rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={asking}
            className="px-5 py-2.5 rounded-xl bg-accent text-accent-foreground font-bold text-xs hover:opacity-90 transition-all flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" /> Ask
          </button>
        </form>
      </div>
    </div>
  );
}
