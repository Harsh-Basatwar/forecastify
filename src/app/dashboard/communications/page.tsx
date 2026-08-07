/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect } from 'react';
import { AnalyticsCardGrid } from '@/components/communications/analytics-card-grid';
import { ThreadList } from '@/components/communications/thread-list';
import { ChatView } from '@/components/communications/chat-view';
import { ContextPanel } from '@/components/communications/context-panel';
import { TemplatesManager } from '@/components/communications/templates-manager';
import type { MessageThreadRow, MessageRow } from '@/lib/communication/types';
import { MessageSquare, LayoutGrid, FileText, Activity } from 'lucide-react';

export default function CommunicationsPage() {
  const [activeTab, setActiveTab] = useState<'inbox' | 'templates' | 'analytics'>('inbox');
  const [threads, setThreads] = useState<MessageThreadRow[]>([]);
  const [activeThread, setActiveThread] = useState<MessageThreadRow | undefined>(undefined);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [participantFilter, setParticipantFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const [analyticsStats, setAnalyticsStats] = useState({
    totalOutbound: 18,
    totalInbound: 14,
    deliveryRatePct: 98.5,
    readRatePct: 84.2,
    totalCost: 24.5,
    currency: 'INR',
  });
  const [providerHealth, setProviderHealth] = useState<any[]>([]);

  // Fetch threads on mount and filter changes
  useEffect(() => {
    fetchThreads();
    fetchAnalytics();
  }, [participantFilter]);

  const fetchThreads = async () => {
    try {
      const res = await fetch(`/api/communications/threads?participantType=${participantFilter}`);
      const json = await res.json();
      if (json.success && json.threads) {
        setThreads(json.threads);
        if (!activeThread && json.threads.length > 0) {
          setActiveThread(json.threads[0]);
          fetchMessages(json.threads[0].id);
        }
      }
    } catch (err) {
      console.error('fetchThreads error:', err);
    }
  };

  const fetchMessages = async (threadId: string) => {
    try {
      const res = await fetch(`/api/communications/messages?threadId=${threadId}`);
      const json = await res.json();
      if (json.success) {
        setMessages(json.messages || []);
      }
    } catch (err) {
      console.error('fetchMessages error:', err);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await fetch('/api/communications/analytics');
      const json = await res.json();
      if (json.success) {
        if (json.stats) setAnalyticsStats(json.stats);
        if (json.providerHealth) setProviderHealth(json.providerHealth);
      }
    } catch (err) {
      console.error('fetchAnalytics error:', err);
    }
  };

  const handleSelectThread = (thread: MessageThreadRow) => {
    setActiveThread(thread);
    fetchMessages(thread.id);
  };

  const handleSendMessage = async (text: string, buttons?: Array<{ id: string; title: string }>) => {
    if (!activeThread) return;
    setLoading(true);

    const participant = activeThread.participants?.[0];
    const phone = participant?.identifier || '+919876543210';

    try {
      const res = await fetch('/api/communications/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: activeThread.store_id,
          organizationId: activeThread.organization_id,
          threadId: activeThread.id,
          recipientIdentifier: phone,
          text,
          buttons,
          channelCode: activeThread.channel_code || 'whatsapp',
        }),
      });

      const json = await res.json();
      if (json.success) {
        fetchMessages(activeThread.id);
        fetchThreads();
      }
    } catch (err) {
      console.error('handleSendMessage error:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredThreads = threads.filter((t) => {
    if (!searchQuery) return true;
    const title = t.thread_title || t.participants?.[0]?.identifier || '';
    return title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 overflow-hidden">
      {/* Header Bar */}
      <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-400" />
            <span>Conversation Center & Communication Subsystem</span>
          </h1>
          <p className="text-xs text-slate-400">
            Autonomous Multi-Channel Platform • WhatsApp Business Cloud API • SMS • Email
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTab('inbox')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeTab === 'inbox' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Live Inbox</span>
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeTab === 'templates' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Templates</span>
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeTab === 'analytics' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Metrics & Health</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'inbox' && (
          <div className="flex h-full w-full overflow-hidden">
            <ThreadList
              threads={filteredThreads}
              activeThreadId={activeThread?.id}
              onSelectThread={handleSelectThread}
              participantFilter={participantFilter}
              onFilterChange={setParticipantFilter}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
            <ChatView
              thread={activeThread}
              messages={messages}
              onSendMessage={handleSendMessage}
              loading={loading}
            />
            <ContextPanel thread={activeThread} />
          </div>
        )}

        {activeTab === 'templates' && (
          <div className="p-6 overflow-y-auto h-full">
            <TemplatesManager />
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="p-6 overflow-y-auto h-full space-y-6">
            <AnalyticsCardGrid stats={analyticsStats} providerHealth={providerHealth} />
          </div>
        )}
      </div>
    </div>
  );
}
