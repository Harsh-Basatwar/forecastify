import type { Product, ChatMessage, ProductAnalysis } from '../services/groqService';

// ─── Storage helpers ───
interface SiteMemory {
  messages: ChatMessage[];
  products: Product[];
  analyses: Record<string, ProductAnalysis>;
  lastUpdated: number;
}

function getSiteKey(domain: string) {
  return `forecastify_${domain}`;
}

async function getSiteMemory(domain: string): Promise<SiteMemory> {
  const key = getSiteKey(domain);
  const result = await chrome.storage.local.get(key);
  return result[key] || { messages: [], products: [], analyses: {}, lastUpdated: Date.now() };
}

async function saveSiteMemory(domain: string, memory: SiteMemory): Promise<void> {
  const key = getSiteKey(domain);
  memory.lastUpdated = Date.now();
  await chrome.storage.local.set({ [key]: memory });
}

// ─── Groq API call (from background to avoid CORS) ───
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.1-8b-instant';

async function callGroq(messages: { role: string; content: string }[], temperature = 0.7): Promise<string> {
  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: MODEL, messages, temperature, max_tokens: 2048 }),
  });
  if (!response.ok) throw new Error(`Groq error: ${response.status}`);
  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

// ─── Message handler ───
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const handler = async () => {
    try {
      switch (message.type) {
        case 'GET_SITE_MEMORY': {
          const memory = await getSiteMemory(message.domain);
          sendResponse({ success: true, data: memory });
          break;
        }
        case 'SAVE_MESSAGES': {
          const mem = await getSiteMemory(message.domain);
          mem.messages = message.messages;
          await saveSiteMemory(message.domain, mem);
          sendResponse({ success: true });
          break;
        }
        case 'SAVE_PRODUCTS': {
          const mem = await getSiteMemory(message.domain);
          mem.products = message.products;
          await saveSiteMemory(message.domain, mem);
          sendResponse({ success: true });
          break;
        }
        case 'SAVE_ANALYSIS': {
          const mem = await getSiteMemory(message.domain);
          mem.analyses[message.productId] = message.analysis;
          await saveSiteMemory(message.domain, mem);
          sendResponse({ success: true });
          break;
        }
        case 'GROQ_CHAT': {
          const result = await callGroq(message.messages, message.temperature);
          sendResponse({ success: true, data: result });
          break;
        }
        case 'CLEAR_SITE_MEMORY': {
          const key = getSiteKey(message.domain);
          await chrome.storage.local.remove(key);
          sendResponse({ success: true });
          break;
        }
        case 'START_CART_QUEUE': {
          await chrome.storage.local.set({
            cartAutomationState: {
              status: 'SEARCHING',
              queue: message.products,
              currentIndex: 0,
              total: message.products.length,
            }
          });
          sendResponse({ success: true });
          break;
        }
        case 'GET_QUEUE_STATUS': {
          const state = await chrome.storage.local.get('cartAutomationState');
          sendResponse({ success: true, data: state.cartAutomationState });
          break;
        }
        case 'NEXT_IN_QUEUE': {
          const stateData = await chrome.storage.local.get('cartAutomationState');
          const state = stateData.cartAutomationState;
          if (state && state.currentIndex < state.queue.length - 1) {
            state.currentIndex++;
            state.status = 'SEARCHING';
            await chrome.storage.local.set({ cartAutomationState: state });
            sendResponse({ success: true, next: state.queue[state.currentIndex] });
          } else {
            await chrome.storage.local.set({
              cartAutomationState: { status: 'IDLE', queue: [], currentIndex: 0, total: 0 }
            });
            sendResponse({ success: true, next: null });
          }
          break;
        }
        case 'MATCH_PRODUCT': {
          const prompt = `You are a SMART AI product matching assistant.
Target Product: "${message.targetName}"

Available Options on Screen:
${message.options.map((opt: any) => `[ID: ${opt.id}] ${opt.text}`).join('\n')}

Identify the ID of the option that best matches the target product.
RULES:
1. ALWAYS return the ID of the closest matching product, even if it is a completely different brand or slightly different variation (e.g. if target is "Milk", you can select ANY milk or dairy product; if target is "Bread", select ANY bread).
2. DO NOT return -1. You MUST pick the absolute best option from the list.
3. Return ONLY the numerical ID of the best match. Do not include any other text.`;
          
          try {
            const result = await callGroq([{ role: 'user', content: prompt }], 0.1);
            let matchedId = parseInt(result.replace(/[^0-9-]/g, ''), 10);
            
            // Fallback to first option if AI completely fails
            if (isNaN(matchedId) || matchedId === -1) {
              matchedId = message.options.length > 0 ? message.options[0].id : -1;
            }
            
            sendResponse({ success: true, matchedId });
          } catch (e) {
            // Absolute fallback
            sendResponse({ success: true, matchedId: message.options.length > 0 ? message.options[0].id : -1 });
          }
          break;
        }
        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error: any) {
      sendResponse({ success: false, error: error.message });
    }
  };
  handler();
  return true; // Keep message channel open for async response
});

// ─── Install handler ───
chrome.runtime.onInstalled.addListener(() => {
  console.log('Forecastify Smart Procurement Extension installed');
});
