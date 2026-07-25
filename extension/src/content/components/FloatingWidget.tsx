import { useState, useEffect, useRef } from 'react';
import type { Product, ChatMessage } from '../../services/groqService';
import { getMockProducts, chatResponse, analyzeProduct } from '../../services/groqService';
import type { ProductAnalysis } from '../../services/groqService';

interface FloatingWidgetProps {
  logoUrl: string;
  domain: string;
}

export default function FloatingWidget({ logoUrl, domain }: FloatingWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<'products' | 'chat'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [fetched, setFetched] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [analysisOpen, setAnalysisOpen] = useState<string | null>(null);
  const [analyses, setAnalyses] = useState<Record<string, ProductAnalysis>>({});
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [cartAdded, setCartAdded] = useState<Set<string>>(new Set());
  const [position, setPosition] = useState({ x: 24, y: 24 });
  const [isDragging, setIsDragging] = useState(false);
  const [queueStatus, setQueueStatus] = useState<{ status: string, current: number, total: number } | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number } | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['widgetPosition'], (res) => {
        if (res.widgetPosition) setPosition(res.widgetPosition);
      });
    }
  }, []);

  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.runtime) return;
    const interval = setInterval(() => {
      chrome.runtime.sendMessage({ type: 'GET_QUEUE_STATUS' }, (res) => {
        if (res?.success && res.data?.status === 'SEARCHING') {
          setQueueStatus({ status: 'Adding Products...', current: res.data.currentIndex + 1, total: res.data.total });
        } else {
          setQueueStatus(null);
        }
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'BUTTON' || (e.target as HTMLElement).tagName === 'INPUT') return;
    setIsDragging(true);
    dragRef.current = { startX: e.clientX, startY: e.clientY, initialX: position.x, initialY: position.y };
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !dragRef.current) return;
    const dx = dragRef.current.startX - e.clientX;
    const dy = dragRef.current.startY - e.clientY;
    setPosition({ x: Math.max(0, dragRef.current.initialX + dx), y: Math.max(0, dragRef.current.initialY + dy) });
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      dragRef.current = null;
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set({ widgetPosition: position });
      }
    }
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Load per-site memory
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage(
        { type: 'GET_SITE_MEMORY', domain },
        (response) => {
          if (response?.success && response.data) {
            if (response.data.messages?.length) setMessages(response.data.messages);
            if (response.data.products?.length) {
              setProducts(response.data.products);
              setFetched(true);
            }
            if (response.data.analyses) setAnalyses(response.data.analyses);
          }
        }
      );
    }
  }, [domain]);

  // Save messages
  useEffect(() => {
    if (!messages.length) return;
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({ type: 'SAVE_MESSAGES', domain, messages });
    }
  }, [messages, domain]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFetch = () => {
    const prods = getMockProducts();
    setProducts(prods);
    setFetched(true);
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({ type: 'SAVE_PRODUCTS', domain, products: prods });
    }
  };

  const handleAnalysis = async (product: Product) => {
    if (analyses[product.id]) {
      setAnalysisOpen(product.id);
      return;
    }
    setAnalysisOpen(product.id);
    setAnalysisLoading(true);
    try {
      const result = await analyzeProduct(product);
      setAnalyses(prev => ({ ...prev, [product.id]: result }));
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({ type: 'SAVE_ANALYSIS', domain, productId: product.id, analysis: result });
      }
    } catch {
      // Fallback
    } finally {
      setAnalysisLoading(false);
    }
  };

  const handleAddToCart = async (product: Product) => {
    setAddingToCart(product.id);
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({ type: 'EXECUTE_SEARCH', product });
    }
    await new Promise(r => setTimeout(r, 1200));
    setCartAdded(prev => new Set(prev).add(product.id));
    setAddingToCart(null);
  };

  const handleAddAllToCart = async () => {
    const unadded = products.filter(p => !cartAdded.has(p.id));
    if (!unadded.length) return;
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({ type: 'START_CART_QUEUE', products: unadded }, (res) => {
        if (res?.success) {
          chrome.runtime.sendMessage({ type: 'EXECUTE_SEARCH', product: unadded[0] });
        }
      });
    }
  };

  const handleChatSend = async () => {
    const text = chatInput.trim();
    if (!text || chatLoading) return;
    const userMsg: ChatMessage = { role: 'user', content: text, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);
    try {
      const resp = await chatResponse([...messages, userMsg], products, domain);
      setMessages(prev => [...prev, { role: 'assistant', content: resp, timestamp: Date.now() }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, an error occurred.', timestamp: Date.now() }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Inline styles (since we're in shadow DOM, CSS file won't apply)
  const styles = {
    fab: {
      position: 'fixed' as const,
      bottom: `${position.y}px`,
      right: `${position.x}px`,
      width: '56px',
      height: '56px',
      borderRadius: '50%',
      background: 'linear-gradient(135deg, #1a1f36, #0f1225)',
      border: '2px solid rgba(129, 140, 248, 0.3)',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 20px rgba(129,140,248,0.15)',
      transition: 'all 0.3s ease',
      zIndex: 2147483647,
    },
    panel: {
      position: 'fixed' as const,
      bottom: `${position.y + 66}px`,
      right: `${position.x}px`,
      width: '380px',
      maxHeight: '500px',
      background: '#0a0e1a',
      border: '1px solid rgba(148,163,184,0.12)',
      borderRadius: '16px',
      overflow: 'hidden',
      boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
      display: 'flex',
      flexDirection: 'column' as const,
      zIndex: 2147483646,
      fontFamily: "'Inter', sans-serif",
      color: '#e2e8f0',
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px',
      background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(168,85,247,0.08))',
      borderBottom: '1px solid rgba(148,163,184,0.12)',
    },
    tabs: {
      display: 'flex',
      padding: '0 12px',
      gap: '2px',
      background: '#111827',
      borderBottom: '1px solid rgba(148,163,184,0.12)',
    },
    tab: (active: boolean) => ({
      flex: 1,
      padding: '8px 0',
      fontSize: '10px',
      fontWeight: 600,
      color: active ? '#818cf8' : '#64748b',
      background: 'none',
      border: 'none',
      borderBottom: `2px solid ${active ? '#818cf8' : 'transparent'}`,
      cursor: 'pointer',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.4px',
      fontFamily: "'Inter', sans-serif",
    }),
    content: {
      flex: 1,
      overflowY: 'auto' as const,
      padding: '12px',
      maxHeight: '380px',
      fontSize: '12px',
    },
    productCard: {
      background: '#1a2035',
      border: '1px solid rgba(148,163,184,0.12)',
      borderRadius: '10px',
      padding: '10px',
      marginBottom: '6px',
    },
    btn: (bg: string, color: string) => ({
      padding: '5px 10px',
      borderRadius: '6px',
      fontSize: '10px',
      fontWeight: 600,
      border: 'none',
      cursor: 'pointer',
      background: bg,
      color: color,
      fontFamily: "'Inter', sans-serif",
    }),
    closeBtn: {
      width: '28px',
      height: '28px',
      borderRadius: '50%',
      background: 'rgba(148,163,184,0.1)',
      border: '1px solid rgba(148,163,184,0.15)',
      color: '#94a3b8',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '14px',
    },
  };

  return (
    <>
      {/* FAB */}
      {!isOpen && (
        <div style={styles.fab} onMouseDown={handleMouseDown} onClick={(e) => { if(!isDragging) setIsOpen(true) }}>
          <img src={logoUrl} alt="F" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
          {products.length > 0 && (
            <div style={{
              position: 'absolute', top: '-4px', right: '-4px',
              width: '20px', height: '20px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #ef4444, #f87171)',
              color: 'white', fontSize: '10px', fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid #0f1225',
            }}>
              {products.length}
            </div>
          )}
        </div>
      )}

      {/* Panel */}
      {isOpen && (
        <div style={styles.panel}>
          {/* Header */}
          <div style={{ ...styles.header, cursor: 'move' }} onMouseDown={handleMouseDown}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img src={logoUrl} alt="F" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
              <span style={{
                fontSize: '14px', fontWeight: 700,
                background: 'linear-gradient(135deg, #818cf8, #c084fc)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                Arjuna Sarthi AI
              </span>
            </div>
            <button style={styles.closeBtn} onClick={() => setIsOpen(false)}>✕</button>
          </div>

          {/* Tabs */}
          <div style={styles.tabs}>
            <button style={styles.tab(tab === 'products')} onClick={() => setTab('products')}>
              📦 Products
            </button>
            <button style={styles.tab(tab === 'chat')} onClick={() => setTab('chat')}>
              💬 Chat
            </button>
          </div>

          {/* Content */}
          <div style={styles.content}>
            {tab === 'products' && (
              <>
                {!fetched ? (
                  <div style={{ textAlign: 'center', padding: '30px 20px' }}>
                    <div style={{ fontSize: '28px', marginBottom: '10px' }}>📦</div>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Fetch Products</h3>
                    <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '14px' }}>
                      Load your AI reorder list from Forecastify
                    </p>
                    <button
                      style={{
                        ...styles.btn('linear-gradient(135deg, #059669, #10b981)', 'white'),
                        width: '100%',
                        padding: '10px',
                        fontSize: '12px',
                      }}
                      onClick={handleFetch}
                    >
                      ⚡ Fetch Products
                    </button>
                  </div>
                ) : (
                  <>
                    {products.map(p => (
                      <div key={p.id} style={styles.productCard}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: '#e2e8f0' }}>{p.name}</div>
                            <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}>{p.category}</div>
                          </div>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: '#818cf8' }}>
                            {p.quantity} <span style={{ fontSize: '9px', color: '#64748b' }}>{p.unit}</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
                          <button
                            style={styles.btn('rgba(168,85,247,0.12)', '#a78bfa')}
                            onClick={() => handleAnalysis(p)}
                          >
                            📈 Analysis
                          </button>
                          <button
                            style={styles.btn(
                              cartAdded.has(p.id) ? 'rgba(52,211,153,0.2)' : 'rgba(52,211,153,0.12)',
                              '#34d399'
                            )}
                            onClick={() => handleAddToCart(p)}
                            disabled={addingToCart === p.id || cartAdded.has(p.id)}
                          >
                            {addingToCart === p.id ? '⏳...' : cartAdded.has(p.id) ? '✅ Added' : '🛒 Cart'}
                          </button>
                        </div>
                        {/* Inline analysis */}
                        {analysisOpen === p.id && analyses[p.id] && (
                          <div style={{
                            marginTop: '8px', padding: '10px',
                            background: 'rgba(129,140,248,0.06)',
                            border: '1px solid rgba(129,140,248,0.15)',
                            borderRadius: '8px',
                          }}>
                            <div style={{ fontSize: '10px', fontWeight: 700, color: '#818cf8', marginBottom: '6px' }}>
                              🧠 7-Day Demand Forecast
                            </div>
                            {/* Mini bar chart */}
                            <div style={{ display: 'flex', gap: '3px', alignItems: 'flex-end', height: '50px', marginBottom: '8px' }}>
                              {analyses[p.id].demandData.map((d, i) => {
                                const maxDemand = Math.max(...analyses[p.id].demandData.map(x => x.demand));
                                const h = maxDemand > 0 ? (d.demand / maxDemand) * 50 : 10;
                                return (
                                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                    <div style={{
                                      width: '100%', height: `${h}px`,
                                      background: `linear-gradient(to top, rgba(129,140,248,${0.3 + i * 0.1}), rgba(192,132,252,${0.3 + i * 0.1}))`,
                                      borderRadius: '3px 3px 0 0',
                                    }} />
                                    <span style={{ fontSize: '7px', color: '#64748b' }}>{d.day.replace('Day ', 'D')}</span>
                                  </div>
                                );
                              })}
                            </div>
                            <p style={{ fontSize: '10px', lineHeight: 1.5, color: '#94a3b8' }}>
                              {analyses[p.id].theory}
                            </p>
                            <button
                              style={{ ...styles.btn('transparent', '#64748b'), padding: '4px 0', marginTop: '4px', fontSize: '9px' }}
                              onClick={() => setAnalysisOpen(null)}
                            >
                              Close ✕
                            </button>
                          </div>
                        )}
                        {analysisOpen === p.id && analysisLoading && (
                          <div style={{ textAlign: 'center', padding: '12px', fontSize: '11px', color: '#64748b' }}>
                            Analyzing with Groq AI...
                          </div>
                        )}
                      </div>
                    ))}
                  </>
                )}
                
                {/* Global Actions */}
                {fetched && products.length > 0 && (
                  <div style={{ marginTop: '10px', display: 'flex', gap: '6px' }}>
                    <button
                      style={{
                        ...styles.btn('linear-gradient(135deg, #059669, #10b981)', 'white'),
                        flex: 1, padding: '10px', fontSize: '12px'
                      }}
                      onClick={handleAddAllToCart}
                      disabled={cartAdded.size === products.length || !!queueStatus}
                    >
                      {queueStatus ? `⏳ ${queueStatus.status} (${queueStatus.current}/${queueStatus.total})` : cartAdded.size === products.length ? '✅ All Added' : '🛒 Add All To Cart'}
                    </button>
                    <button
                      style={{
                        ...styles.btn('rgba(239,68,68,0.1)', '#ef4444'),
                        padding: '10px', fontSize: '14px', border: '1px solid rgba(239,68,68,0.2)'
                      }}
                      onClick={() => {
                         setCartAdded(new Set());
                         if (typeof chrome !== 'undefined' && chrome.runtime) {
                           chrome.runtime.sendMessage({ type: 'CLEAR_SITE_MEMORY', domain });
                           chrome.storage.local.set({ cartAutomationState: null });
                           setQueueStatus(null);
                         }
                      }}
                      title="Reset Session & Clear Queue"
                    >
                      🔄
                    </button>
                  </div>
                )}
              </>
            )}

            {tab === 'chat' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '300px' }}>
                  {messages.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '30px 10px' }}>
                      <div style={{ fontSize: '22px', marginBottom: '8px' }}>🤖</div>
                      <p style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>AI Procurement Chat</p>
                      <p style={{ fontSize: '10px', color: '#64748b' }}>Ask about products, alternatives, or deals</p>
                    </div>
                  )}
                  {messages.map((msg, i) => (
                    <div key={i} style={{
                      maxWidth: '85%',
                      padding: '8px 12px',
                      borderRadius: '10px',
                      fontSize: '11px',
                      lineHeight: 1.5,
                      alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                      background: msg.role === 'user'
                        ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                        : '#1a2035',
                      color: msg.role === 'user' ? 'white' : '#94a3b8',
                      border: msg.role === 'assistant' ? '1px solid rgba(148,163,184,0.12)' : 'none',
                    }}>
                      {msg.content}
                    </div>
                  ))}
                  {chatLoading && (
                    <div style={{
                      alignSelf: 'flex-start', padding: '8px 12px', borderRadius: '10px',
                      background: '#1a2035', border: '1px solid rgba(148,163,184,0.12)',
                      fontSize: '11px', color: '#64748b',
                    }}>
                      Thinking...
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
                <div style={{
                  display: 'flex', gap: '6px', marginTop: '8px',
                  paddingTop: '8px', borderTop: '1px solid rgba(148,163,184,0.12)',
                }}>
                  <input
                    style={{
                      flex: 1, padding: '8px 12px', background: '#1a2035',
                      border: '1px solid rgba(148,163,184,0.12)', borderRadius: '8px',
                      color: '#e2e8f0', fontSize: '11px', outline: 'none',
                      fontFamily: "'Inter', sans-serif",
                    }}
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleChatSend(); }}
                    placeholder="Ask about procurement..."
                  />
                  <button
                    style={{
                      width: '34px', height: '34px', borderRadius: '8px',
                      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      border: 'none', color: 'white', cursor: 'pointer', fontSize: '14px',
                      flexShrink: 0,
                    }}
                    onClick={handleChatSend}
                    disabled={!chatInput.trim() || chatLoading}
                  >
                    ➤
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
