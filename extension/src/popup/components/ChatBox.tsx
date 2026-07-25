import { useState, useRef, useEffect } from 'react';
import type { Product, ChatMessage } from '../../services/groqService';
import { chatResponse } from '../../services/groqService';

interface ChatBoxProps {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  products: Product[];
  currentSite: string;
}

export default function ChatBox({ messages, setMessages, products, currentSite }: ChatBoxProps) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const allMessages = [...messages, userMessage];
      const response = await chatResponse(allMessages, products, currentSite);

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (messages.length === 0 && !loading) {
    return (
      <div className="chat-container">
        <div className="chat-empty">
          <div className="chat-empty-icon">🤖</div>
          <h3>Procurement Assistant</h3>
          <p>
            Ask me about product matching, alternatives, bulk deals,
            supplier recommendations, or procurement strategy.
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '6px',
            width: '100%',
            marginTop: '4px',
          }}>
            {[
              'What should I buy first?',
              'Find alternatives for sugar',
              'Best bulk deals today',
              'Stockout risk analysis',
            ].map(suggestion => (
              <button
                key={suggestion}
                className="btn btn-secondary"
                style={{ fontSize: '10px', textAlign: 'left', padding: '8px 10px' }}
                onClick={() => {
                  setInput(suggestion);
                  setTimeout(() => inputRef.current?.focus(), 100);
                }}
              >
                💡 {suggestion}
              </button>
            ))}
          </div>
        </div>
        <div className="chat-input-area">
          <input
            ref={inputRef}
            className="chat-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about procurement..."
          />
          <button
            className="chat-send"
            onClick={handleSend}
            disabled={!input.trim() || loading}
          >
            ➤
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`chat-message ${msg.role}`}>
            {msg.role === 'assistant' && <div className="msg-label">🤖 Arjuna Sarthi AI</div>}
            {msg.content}
          </div>
        ))}
        {loading && (
          <div className="chat-message assistant">
            <div className="msg-label">🤖 Forecastify AI</div>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <div className="spinner spinner-sm" style={{
                borderColor: 'rgba(129, 140, 248, 0.2)',
                borderTopColor: 'var(--accent)',
              }} />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="chat-input-area">
        <input
          ref={inputRef}
          className="chat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about procurement..."
        />
        <button
          className="chat-send"
          onClick={handleSend}
          disabled={!input.trim() || loading}
        >
          ➤
        </button>
      </div>
    </div>
  );
}
