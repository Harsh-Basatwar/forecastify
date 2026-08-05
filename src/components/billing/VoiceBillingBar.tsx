"use client";

import React, { useState } from "react";
import { Mic, MicOff, Send, Sparkles, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceBillingBarProps {
  onProcessVoiceCommand: (transcript: string) => Promise<void>;
  loading: boolean;
}

export default function VoiceBillingBar({
  onProcessVoiceCommand,
  loading,
}: VoiceBillingBarProps) {
  const [isListening, setIsListening] = useState(false);
  const [voiceText, setVoiceText] = useState("");
  const [statusMsg, setStatusMsg] = useState("");

  const sampleCommands = [
    "Sell 5 Maggi",
    "One Amul Milk",
    "2 Bisleri Water",
    "Remove Coke",
  ];

  const handleVoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voiceText.trim() || loading) return;

    setStatusMsg("Parsing voice billing command with Groq AI...");
    await onProcessVoiceCommand(voiceText.trim());
    setVoiceText("");
    setStatusMsg("");
  };

  const handleSampleClick = async (cmd: string) => {
    setVoiceText(cmd);
    setStatusMsg("Parsing voice billing command with Groq AI...");
    await onProcessVoiceCommand(cmd);
    setVoiceText("");
    setStatusMsg("");
  };

  const toggleListen = () => {
    if (!isListening) {
      setIsListening(true);
      setStatusMsg("Listening to speech input...");
      // Simulate Web Speech API listener
      setTimeout(() => {
        setVoiceText("Sell 5 Maggi");
        setIsListening(false);
        setStatusMsg("Speech recognized!");
      }, 1500);
    } else {
      setIsListening(false);
      setStatusMsg("");
    }
  };

  return (
    <div className="fx-card p-3 bg-card border-accent/30 shadow-sm rounded-xl space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
          <Sparkles className="w-4 h-4 text-accent animate-pulse" />
          <span>Voice Billing Assistant (AI Architecture)</span>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded">
          Speech-to-Cart Pipeline
        </span>
      </div>

      <form onSubmit={handleVoiceSubmit} className="flex gap-2">
        <button
          type="button"
          onClick={toggleListen}
          className={cn(
            "p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center transition-all shrink-0",
            isListening
              ? "bg-danger text-white border-danger animate-pulse"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80 border-border"
          )}
          title="Toggle Microphone"
        >
          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-accent" />}
        </button>

        <input
          type="text"
          placeholder="Try voice command: 'Sell 5 Maggi', 'One Amul Milk', 'Remove Coke'..."
          value={voiceText}
          onChange={(e) => setVoiceText(e.target.value)}
          className="fx-input flex-1 text-xs h-9"
        />

        <button
          type="submit"
          disabled={loading || !voiceText.trim()}
          className="fx-btn fx-btn-accent text-xs h-9 px-3 shrink-0 flex items-center gap-1 font-semibold"
        >
          <Send className="w-3.5 h-3.5" /> Parse
        </button>
      </form>

      {/* Quick sample command pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto text-[10.5px]">
        <span className="text-muted-foreground shrink-0">Quick test:</span>
        {sampleCommands.map((cmd) => (
          <button
            key={cmd}
            type="button"
            onClick={() => handleSampleClick(cmd)}
            className="px-2 py-0.5 rounded bg-secondary/40 hover:bg-accent/15 hover:text-accent border border-border/60 text-muted-foreground transition-colors shrink-0"
          >
            "{cmd}"
          </button>
        ))}
      </div>

      {statusMsg && <p className="text-[11px] text-accent">{statusMsg}</p>}
    </div>
  );
}
