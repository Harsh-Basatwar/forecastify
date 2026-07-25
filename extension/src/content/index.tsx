import React from 'react';
import ReactDOM from 'react-dom/client';
import FloatingWidget from './components/FloatingWidget';

// Only inject once
if (!document.getElementById('forecastify-widget-root')) {
  const container = document.createElement('div');
  container.id = 'forecastify-widget-root';
  document.body.appendChild(container);

  const shadowRoot = container.attachShadow({ mode: 'open' });

  // Inject styles into shadow DOM
  const style = document.createElement('style');
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

    :host {
      all: initial;
      position: fixed;
      z-index: 2147483647;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }
  `;
  shadowRoot.appendChild(style);

  const mountPoint = document.createElement('div');
  shadowRoot.appendChild(mountPoint);

  const logoUrl = chrome.runtime.getURL('icons/extension.png');
  const domain = window.location.hostname;

  ReactDOM.createRoot(mountPoint).render(
    <React.StrictMode>
      <FloatingWidget logoUrl={logoUrl} domain={domain} />
    </React.StrictMode>
  );
}

import { searchOnPlatform, extractProductOptions } from './utils/cartAutomation';

// Process automated cart queue on page load
if (typeof chrome !== 'undefined' && chrome.runtime) {
  const sendMsg = async (msg: any): Promise<any> => {
    if (!chrome?.runtime?.id) return null;
    try {
      return await Promise.race([
        chrome.runtime.sendMessage(msg),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 8000))
      ]);
    } catch (e) {
      // Natively catch Extension context invalidated or timeout
      return null;
    }
  };

  setTimeout(async () => {
    try {
      const response = await sendMsg({ type: 'GET_QUEUE_STATUS' });
      if (response?.success && response.data) {
        const state = response.data;
        if (state.status === 'SEARCHING' && state.queue && state.queue.length > 0) {
          const currentItem = state.queue[state.currentIndex];
          
          await new Promise(r => setTimeout(r, 2500)); // Wait longer for SPA hydration
          const options = extractProductOptions();
          
          if (options.length > 0) {
            const matchResp = await sendMsg({ 
              type: 'MATCH_PRODUCT', 
              targetName: currentItem.name, 
              options: options.map(o => ({ id: o.id, text: o.text })) 
            });
            
            if (matchResp?.success && matchResp.matchedId !== -1) {
              const bestOption = options.find(o => o.id === matchResp.matchedId);
              if (bestOption) {
                // Dispatch simulated click with coordinates for strict React/SPA frameworks
                const rect = bestOption.button.getBoundingClientRect();
                const x = rect.left + rect.width / 2;
                const y = rect.top + rect.height / 2;
                
                bestOption.button.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y }));
                bestOption.button.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y }));
                bestOption.button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y }));
                bestOption.button.click();
                await new Promise(r => setTimeout(r, 1500));
                
                const targetQty = currentItem.quantity || 1;
                if (targetQty > 1) {
                  const plusButtons = Array.from(bestOption.container.querySelectorAll('button, [role="button"]')).filter(b => {
                    const t = b.textContent?.trim() || '';
                    const aria = b.getAttribute('aria-label')?.toLowerCase() || '';
                    return t === '+' || aria.includes('increase') || aria.includes('plus');
                  });
                  
                  if (plusButtons.length > 0) {
                    const plusBtn = plusButtons[0] as HTMLButtonElement;
                    const pRect = plusBtn.getBoundingClientRect();
                    const px = pRect.left + pRect.width / 2;
                    const py = pRect.top + pRect.height / 2;
                    
                    for (let i = 1; i < targetQty; i++) {
                      plusBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window, clientX: px, clientY: py }));
                      plusBtn.click();
                      await new Promise(r => setTimeout(r, 300));
                    }
                  }
                }
                await new Promise(r => setTimeout(r, 1000));
              }
            }
            
            const nextResp = await sendMsg({ type: 'NEXT_IN_QUEUE' });
            if (nextResp?.success && nextResp.next) {
              searchOnPlatform(nextResp.next.name);
            }
          } else {
            const nextResp = await sendMsg({ type: 'NEXT_IN_QUEUE' });
            if (nextResp?.success && nextResp.next) {
              searchOnPlatform(nextResp.next.name);
            }
          }
        }
      }
    } catch (err) {
      // Catch any unexpected loop errors to prevent halting
    }
  }, 1500);

  try {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message.type === 'EXECUTE_SEARCH') {
        searchOnPlatform(message.product.name);
        sendResponse({ success: true });
      }
      return true;
    });
  } catch (e) {
    // Ignore listener error
  }
}
