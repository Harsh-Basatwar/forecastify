/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React from 'react';
import { Search, MessageSquare, Truck, Users, UserCheck } from 'lucide-react';
import type { MessageThreadRow } from '@/lib/communication/types';

interface ThreadListProps {
  threads: MessageThreadRow[];
  activeThreadId?: string;
  onSelectThread: (thread: MessageThreadRow) => void;
  participantFilter: string;
  onFilterChange: (filter: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const ThreadList: React.FC<ThreadListProps> = ({
  threads,
  activeThreadId,
  onSelectThread,
  participantFilter,
  onFilterChange,
  searchQuery,
  onSearchChange,
}) => {
  const filterTabs = [
    { id: 'all', label: 'All', icon: MessageSquare },
    { id: 'supplier', label: 'Suppliers', icon: Truck },
    { id: 'customer', label: 'Customers', icon: Users },
    { id: 'employee', label: 'Employees', icon: UserCheck },
  ];

  return (
    <div className="w-full md:w-80 bg-slate-900/90 border-r border-slate-800 flex flex-col h-full">
      {/* Header & Search */}
      <div className="p-3 border-b border-slate-800 space-y-2">
        <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center justify-between">
          <span>Conversations</span>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-normal">
            Live Meta API
          </span>
        </h2>

        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search phone or name..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50"
          />
        </div>

        {/* Tab Filters */}
        <div className="grid grid-cols-4 gap-1 pt-1">
          {filterTabs.map((tab) => {
            const Icon = tab.icon;
            const active = participantFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onFilterChange(tab.id)}
                className={`py-1 px-1.5 rounded-md text-[11px] font-medium flex items-center justify-center gap-1 transition-all ${
                  active
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Thread Item List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50">
        {threads.length === 0 ? (
          <div className="p-6 text-center text-slate-500 text-xs">No active conversations found</div>
        ) : (
          threads.map((thread) => {
            const isActive = thread.id === activeThreadId;
            const primaryPart = thread.participants?.[0];
            const title = thread.thread_title || primaryPart?.identifier || 'Conversation';
            const channel = thread.channel_code || 'whatsapp';

            return (
              <button
                key={thread.id}
                onClick={() => onSelectThread(thread)}
                className={`w-full text-left p-3 transition-colors flex items-start justify-between ${
                  isActive ? 'bg-slate-800/90 border-l-2 border-emerald-500' : 'hover:bg-slate-800/40'
                }`}
              >
                <div className="space-y-1 min-w-0 flex-1 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-slate-200 truncate">{title}</span>
                    <span className="text-[9px] uppercase px-1.5 py-0.2 bg-slate-800 text-slate-400 rounded font-mono">
                      {channel}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">{thread.last_message_preview || 'No messages yet'}</p>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <span className="text-[10px] text-slate-500">
                    {thread.last_message_at ? new Date(thread.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                  {thread.unread_count > 0 && (
                    <span className="bg-emerald-500 text-slate-950 font-bold text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                      {thread.unread_count}
                    </span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
