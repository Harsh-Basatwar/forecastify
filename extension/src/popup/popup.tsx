import { useState, useEffect } from 'react';
import ProductList from './components/ProductList';
import ChatBox from './components/ChatBox';
import OrbitalGlobe from './components/OrbitalGlobe';
import type { Product, ChatMessage, ProductAnalysis } from '../services/groqService';
import { getMockProducts } from '../services/groqService';

type Tab = 'products' | 'chat' | 'about';

export default function Popup() {
  const [tab, setTab] = useState<Tab>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [analyses, setAnalyses] = useState<Record<string, ProductAnalysis>>({});
  const [currentSite, setCurrentSite] = useState('');
  const [fetched, setFetched] = useState(false);

  // Get current tab's domain
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.url) {
          try {
            const url = new URL(tabs[0].url);
            setCurrentSite(url.hostname);
          } catch {
            setCurrentSite('extension');
          }
        }
      });
    } else {
      setCurrentSite('localhost');
    }
  }, []);

  // Load per-site memory
  useEffect(() => {
    if (!currentSite) return;
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage(
        { type: 'GET_SITE_MEMORY', domain: currentSite },
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
  }, [currentSite]);

  // Save messages when they change
  useEffect(() => {
    if (!currentSite || !messages.length) return;
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({
        type: 'SAVE_MESSAGES',
        domain: currentSite,
        messages,
      });
    }
  }, [messages, currentSite]);

  const handleFetchProducts = () => {
    const mockProducts = getMockProducts();
    setProducts(mockProducts);
    setFetched(true);
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({
        type: 'SAVE_PRODUCTS',
        domain: currentSite,
        products: mockProducts,
      });
    }
  };

  const handleAnalysisSave = (productId: string, analysis: ProductAnalysis) => {
    setAnalyses(prev => ({ ...prev, [productId]: analysis }));
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({
        type: 'SAVE_ANALYSIS',
        domain: currentSite,
        productId,
        analysis,
      });
    }
  };

  const logoUrl = typeof chrome !== 'undefined' && chrome.runtime
    ? chrome.runtime.getURL('icons/extension.png')
    : '/icons/extension.png';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '540px' }}>
      {/* Header */}
      <div className="ext-header">
        <div className="ext-header-left">
          <img src={logoUrl} alt="Arjuna Sarthi AI" className="ext-logo" />
          <div>
            <div className="ext-title">Arjuna Sarthi AI</div>
            <div className="ext-subtitle">Smart Procurement Assistant</div>
          </div>
        </div>
        {currentSite && (
          <div className="ext-site-badge" title={currentSite}>
            🌐 {currentSite}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="ext-tabs">
        <button
          className={`ext-tab ${tab === 'products' ? 'active' : ''}`}
          onClick={() => setTab('products')}
        >
          📦 Products
        </button>
        <button
          className={`ext-tab ${tab === 'chat' ? 'active' : ''}`}
          onClick={() => setTab('chat')}
        >
          💬 Chat
        </button>
        <button
          className={`ext-tab ${tab === 'about' ? 'active' : ''}`}
          onClick={() => setTab('about')}
        >
          🌍 About
        </button>
      </div>

      {/* Content */}
      <div className="ext-content">
        {tab === 'products' && (
          <ProductList
            products={products}
            fetched={fetched}
            analyses={analyses}
            onFetch={handleFetchProducts}
            onAnalysisSave={handleAnalysisSave}
            currentSite={currentSite}
          />
        )}
        {tab === 'chat' && (
          <ChatBox
            messages={messages}
            setMessages={setMessages}
            products={products}
            currentSite={currentSite}
          />
        )}
        {tab === 'about' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <OrbitalGlobe logoUrl={logoUrl} />
            <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center' }}>
              AI-Powered Procurement
            </p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.6, maxWidth: '320px' }}>
              Forecastify bridges inventory forecasting with product purchasing.
              Get AI-driven restock recommendations and one-click cart population
              on any supplier platform.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', width: '100%', marginTop: '8px' }}>
              {[
                '✓ AI Reorder Lists',
                '✓ One-Click Cart',
                '✓ Smart Matching',
                '✓ Demand Graphs',
                '✓ Alt Suggestions',
                '✓ Stockout Alerts',
              ].map(f => (
                <div key={f} style={{
                  padding: '8px 10px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  fontSize: '10px',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                }}>{f}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
