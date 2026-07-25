import { useState } from 'react';
import type { Product, ProductAnalysis } from '../../services/groqService';
import ProductAnalysisModal from './ProductAnalysis';

interface ProductListProps {
  products: Product[];
  fetched: boolean;
  analyses: Record<string, ProductAnalysis>;
  onFetch: () => void;
  onAnalysisSave: (productId: string, analysis: ProductAnalysis) => void;
  currentSite: string;
}

export default function ProductList({
  products,
  fetched,
  analyses,
  onFetch,
  onAnalysisSave,
  currentSite,
}: ProductListProps) {
  const [analysisProduct, setAnalysisProduct] = useState<Product | null>(null);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [cartAdded, setCartAdded] = useState<Set<string>>(new Set());

  const handleAddToCart = async (product: Product) => {
    setAddingToCart(product.id);

    // Simulate adding to cart (in real implementation, this would use cartAutomation)
    await new Promise(r => setTimeout(r, 1500));

    setCartAdded(prev => new Set(prev).add(product.id));
    setAddingToCart(null);

    // Send message to content script to search & add
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, {
            type: 'ADD_TO_CART',
            product: {
              name: product.name,
              quantity: product.quantity,
              unit: product.unit,
            },
          });
        }
      });
    }
  };

  const handleAddAllToCart = async () => {
    const unadded = products.filter(p => !cartAdded.has(p.id));
    if (!unadded.length) return;

    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({ type: 'START_CART_QUEUE', products: unadded }, (res) => {
        if (res?.success) {
          // Tell the active tab to start the first search
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.id) {
              chrome.tabs.sendMessage(tabs[0].id, {
                type: 'EXECUTE_SEARCH',
                product: unadded[0],
              });
            }
          });
        }
      });
    }
  };

  if (!fetched) {
    return (
      <div className="fetch-area">
        <div className="fetch-icon">📦</div>
        <h3>Ready to Procure</h3>
        <p>
          Fetch your AI-generated reorder list from Forecastify's forecasting engine.
          Products recommended based on demand, stock levels, and market signals.
        </p>
        <button className="btn btn-success btn-full" onClick={onFetch}>
          ⚡ Fetch Products
        </button>
      </div>
    );
  }

  const highPriority = products.filter(p => p.priority === 'High').length;
  const totalCost = products.reduce((sum, p) => sum + (p.estimatedCost || 0), 0);

  return (
    <div>
      {/* Stats */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-value">{products.length}</div>
          <div className="stat-label">Products</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--red)', WebkitTextFillColor: 'var(--red)' }}>
            {highPriority}
          </div>
          <div className="stat-label">Urgent</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">₹{totalCost.toLocaleString()}</div>
          <div className="stat-label">Est. Cost</div>
        </div>
      </div>

      {/* Urgency banner */}
      {highPriority > 0 && (
        <div className="urgency-banner urgency-critical">
          ⚠️ {highPriority} products need urgent restocking — stock may run out within 2 days
        </div>
      )}

      {/* Product list */}
      {products.map((product) => (
        <div key={product.id} className="product-card">
          <div className="product-card-header">
            <div>
              <div className="product-name">{product.name}</div>
              <div className="product-category">{product.category}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span className="product-qty">{product.quantity}</span>
              <span className="product-unit">{product.unit}</span>
            </div>
          </div>

          <div className="product-meta">
            <span className={`product-stock ${
              (product.currentStock || 0) <= 3 ? 'stock-low' :
              (product.currentStock || 0) <= 8 ? 'stock-medium' : 'stock-ok'
            }`}>
              📊 Stock: {product.currentStock ?? '?'}
            </span>
            {product.priority && (
              <span className={`priority-badge priority-${product.priority.toLowerCase()}`}>
                {product.priority}
              </span>
            )}
            {product.estimatedCost && (
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                ₹{product.estimatedCost}
              </span>
            )}
          </div>

          <div className="product-actions">
            <button
              className="btn btn-analysis"
              onClick={() => setAnalysisProduct(product)}
            >
              📈 Analysis
            </button>
            <button
              className="btn btn-cart"
              onClick={() => handleAddToCart(product)}
              disabled={addingToCart === product.id || cartAdded.has(product.id)}
            >
              {addingToCart === product.id ? (
                <><div className="spinner spinner-sm" /> Adding...</>
              ) : cartAdded.has(product.id) ? (
                '✅ Added'
              ) : (
                '🛒 Add to Cart'
              )}
            </button>
          </div>
        </div>
      ))}

      {/* Add All button */}
      <button
        className="btn btn-success btn-full"
        onClick={handleAddAllToCart}
        disabled={cartAdded.size === products.length}
        style={{ marginTop: '8px' }}
      >
        {cartAdded.size === products.length ? '✅ All Added to Cart' : '🛒 Add All to Cart'}
      </button>

      {/* Refetch */}
      <button
        className="btn btn-secondary btn-full"
        onClick={onFetch}
        style={{ marginTop: '6px' }}
      >
        🔄 Refresh Products
      </button>

      {/* Analysis Modal */}
      {analysisProduct && (
        <ProductAnalysisModal
          product={analysisProduct}
          cachedAnalysis={analyses[analysisProduct.id]}
          onClose={() => setAnalysisProduct(null)}
          onSave={(analysis: ProductAnalysis) => onAnalysisSave(analysisProduct.id, analysis)}
        />
      )}
    </div>
  );
}
