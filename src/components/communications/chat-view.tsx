/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState } from 'react';
import { Send, Check, CheckCheck, FileText, Bot, CornerDownLeft } from 'lucide-react';
import type { MessageRow, MessageThreadRow } from '@/lib/communication/types';

interface ChatViewProps {
  thread?: MessageThreadRow;
  messages: MessageRow[];
  onSendMessage: (text: string, buttons?: Array<{ id: string; title: string }>) => Promise<void>;
  loading?: boolean;
}

export const ChatView: React.FC<ChatViewProps> = ({ thread, messages, onSendMessage, loading }) => {
  const [inputText, setInputText] = useState('');
  const [isInteractiveMode, setIsInteractiveMode] = useState(false);

  if (!thread) {
    return (
      <div className="flex-1 bg-slate-950 flex flex-col items-center justify-center text-slate-500 p-8">
        <Bot className="w-12 h-12 mb-3 text-slate-700 animate-pulse" />
        <p className="text-sm font-medium">Select a conversation thread to view live WhatsApp messages</p>
      </div>
    );
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || loading) return;

    let buttons: Array<{ id: string; title: string }> | undefined = undefined;
    if (isInteractiveMode) {
      buttons = [
        { id: `btn_app_${Date.now()}`, title: 'Approve Order' },
        { id: `btn_mod_${Date.now()}`, title: 'Modify Qty' },
        { id: `btn_rej_${Date.now()}`, title: 'Reject Order' },
      ];
    }

    const textToSend = inputText;
    setInputText('');
    await onSendMessage(textToSend, buttons);
  };

  const participant = thread.participants?.[0];
  const title = thread.thread_title || participant?.identifier || 'Conversation';

  return (
    <div className="flex-1 bg-slate-950 flex flex-col h-full overflow-hidden">
      {/* Thread Header */}
      <div className="p-3 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-400 text-xs">
            {title.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-100">{title}</h3>
            <p className="text-[10px] text-slate-400 flex items-center gap-2">
              <span>{participant?.identifier || 'Meta Cloud'}</span> •{' '}
              <span className="text-emerald-400 font-medium">24h Session Active</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsInteractiveMode(!isInteractiveMode)}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
              isInteractiveMode
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {isInteractiveMode ? 'Interactive Buttons: ON' : '+ Attach Buttons'}
          </button>
        </div>
      </div>

      {/* Message Timeline */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-slate-600 text-xs py-8">No message history yet</div>
        ) : (
          messages.map((msg) => {
            const isOutbound = msg.direction === 'outbound';
            return (
              <div key={msg.id} className={`flex flex-col ${isOutbound ? 'items-end' : 'items-start'}`}>
                <div
                  className={`max-w-md p-3 rounded-xl text-xs space-y-2 ${
                    isOutbound
                      ? 'bg-emerald-600/90 text-slate-50 rounded-br-none border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700/60'
                  }`}
                >
                  {/* Message Sender Header */}
                  <div className="flex items-center justify-between text-[10px] opacity-75 gap-4">
                    <span className="font-semibold uppercase tracking-wider">
                      {msg.sender_type === 'system' ? 'Forecastify Engine' : msg.sender_type === 'ai_agent' ? 'AI Assistant' : isOutbound ? 'You' : title}
                    </span>
                    <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  {/* Body Content */}
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>

                  {/* Interactive Button Rendering */}
                  {msg.interactive_payload?.buttons && (
                    <div className="pt-2 border-t border-emerald-500/30 space-y-1">
                      {msg.interactive_payload.buttons.map((btn: any, bIdx: number) => (
                        <div
                          key={bIdx}
                          className="w-full text-center py-1 bg-emerald-700/60 text-slate-100 font-medium rounded text-[11px] hover:bg-emerald-700 cursor-pointer"
                        >
                          [ {btn.title} ]
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Delivery Status Indicator */}
                  {isOutbound && (
                    <div className="flex justify-end pt-0.5">
                      {msg.delivery_status === 'read' ? (
                        <CheckCheck className="w-3.5 h-3.5 text-sky-300" />
                      ) : msg.delivery_status === 'delivered' ? (
                        <CheckCheck className="w-3.5 h-3.5 opacity-80" />
                      ) : (
                        <Check className="w-3.5 h-3.5 opacity-70" />
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input Bar */}
      <form onSubmit={handleSend} className="p-3 bg-slate-900/90 border-t border-slate-800 flex items-center gap-2">
        <input
          type="text"
          placeholder={isInteractiveMode ? 'Enter prompt body (will append 3 interactive buttons)...' : 'Type a reply or command...'}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50"
        />
        <button
          type="submit"
          disabled={loading || !inputText.trim()}
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors"
        >
          <span>Send</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
