/**
 * Cart Automation — Platform-specific search and add-to-cart
 */

export interface CartAction {
  platform: string;
  searchSelector: string;
  formSelector: string;
  addToCartSelector: string;
  quantitySelector: string;
  firstResultAddToCartSelector?: string;
  searchUrlTemplate?: string;
}

const PLATFORMS: Record<string, CartAction> = {
  'amazon.in': {
    platform: 'Amazon India',
    searchSelector: '#twotabsearchtextbox',
    formSelector: '#nav-search-bar-form',
    addToCartSelector: '#add-to-cart-button',
    quantitySelector: '#quantity',
    firstResultAddToCartSelector: '.s-result-item button[name="submit.addToCart"]',
    searchUrlTemplate: 'https://www.amazon.in/s?k={query}'
  },
  'amazon.com': {
    platform: 'Amazon',
    searchSelector: '#twotabsearchtextbox',
    formSelector: '#nav-search-bar-form',
    addToCartSelector: '#add-to-cart-button',
    quantitySelector: '#quantity',
    firstResultAddToCartSelector: '.s-result-item button[name="submit.addToCart"]',
    searchUrlTemplate: 'https://www.amazon.com/s?k={query}'
  },
  'flipkart.com': {
    platform: 'Flipkart',
    searchSelector: 'input[name="q"]',
    formSelector: 'form[action="/search"]',
    addToCartSelector: 'button._2KpZ6l._2U9uOA',
    quantitySelector: '',
    firstResultAddToCartSelector: 'button._2KpZ6l._2U9uOA',
    searchUrlTemplate: 'https://www.flipkart.com/search?q={query}'
  },
  'jiomart.com': {
    platform: 'JioMart',
    searchSelector: '#autocomplete-0-input',
    formSelector: 'form',
    addToCartSelector: '.add-to-cart-btn',
    quantitySelector: '',
    firstResultAddToCartSelector: '.add-to-cart-btn',
    searchUrlTemplate: 'https://www.jiomart.com/search/{query}'
  },
  'bigbasket.com': {
    platform: 'BigBasket',
    searchSelector: 'input[placeholder*="Search"], input[type="text"], input[type="search"]',
    formSelector: 'form',
    addToCartSelector: 'button[qa="add"], .add-to-cart',
    quantitySelector: '',
    firstResultAddToCartSelector: 'button[qa="add"], .add-to-cart',
  },
  'indiamart.com': {
    platform: 'IndiaMART',
    searchSelector: '#search_string',
    formSelector: '#frm',
    addToCartSelector: '',
    quantitySelector: '',
    firstResultAddToCartSelector: '.btn-contact',
    searchUrlTemplate: 'https://dir.indiamart.com/search.mp?ss={query}'
  },
};

export function detectPlatform(hostname: string): CartAction | null {
  for (const [domain, action] of Object.entries(PLATFORMS)) {
    if (hostname.includes(domain)) {
      return action;
    }
  }
  return null;
}

export function searchOnPlatform(productName: string): boolean {
  const hostname = window.location.hostname;
  const platform = detectPlatform(hostname);

  if (platform && platform.searchUrlTemplate) {
    const url = platform.searchUrlTemplate.replace('{query}', encodeURIComponent(productName));
    window.location.href = url;
    return true;
  }

  // Fallback to DOM manipulation if no template exists
  const selector = platform?.searchSelector
    || 'input[type="search"], input[name="q"], input[placeholder*="Search"], input[placeholder*="search"]';

  const searchInput = document.querySelector<HTMLInputElement>(selector);

  if (!searchInput) return false;

  // Focus and set value
  searchInput.focus();
  searchInput.value = '';

  // Use native input setter to trigger React state updates
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype, 'value'
  )?.set;
  nativeInputValueSetter?.call(searchInput, productName);

  searchInput.dispatchEvent(new Event('input', { bubbles: true }));
  searchInput.dispatchEvent(new Event('change', { bubbles: true }));

  // Submit form via React-compatible events, NOT native submit which causes 404 reloads
  searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
  searchInput.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
  searchInput.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));

  // Fallback: Click the physical search button if React blocks synthetic keys
  const form = searchInput.closest('form') || searchInput.parentElement;
  if (form) {
    const submitBtn = form.querySelector('button[type="submit"], input[type="submit"], button[aria-label*="search" i], button i.icon-search');
    if (submitBtn) {
      const btnEl = submitBtn as HTMLElement;
      btnEl.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
      btnEl.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
      btnEl.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      btnEl.click();
    }
  }

  return true;
}

export function getCurrentPlatformName(): string {
  const hostname = window.location.hostname;
  const platform = detectPlatform(hostname);
  return platform?.platform || hostname;
}

export function addFirstSearchResultToCart(): boolean {
  const hostname = window.location.hostname;
  const platform = detectPlatform(hostname);

  const selector = platform?.firstResultAddToCartSelector || 'button[aria-label*="cart" i], .add-to-cart, [class*="add-to-cart" i], [class*="addToCart" i]';
  const addBtn = document.querySelector<HTMLButtonElement>(selector);
  
  if (addBtn) {
    addBtn.click();
    return true;
  }

  // Universal Fallback: find any button that says 'Add' or 'Cart'
  const allButtons = Array.from(document.querySelectorAll('button'));
  for (const btn of allButtons) {
    const text = btn.textContent?.toLowerCase() || '';
    if (text.includes('add') || text.includes('cart')) {
      btn.click();
      return true;
    }
  }

  return false;
}

export interface ScrapedOption {
  id: number;
  text: string;
  button: HTMLButtonElement;
  container: HTMLElement;
}

export function extractProductOptions(): ScrapedOption[] {
  const options: ScrapedOption[] = [];
  const allButtons = Array.from(document.querySelectorAll('button, [role="button"], a.add-to-cart, div[role="button"]'));
  
  const hostname = window.location.hostname;
  const platform = detectPlatform(hostname);
  const platformSelector = platform?.addToCartSelector || platform?.firstResultAddToCartSelector;
  
  let idCounter = 0;
  for (const btn of allButtons) {
    const text = btn.textContent?.toLowerCase() || '';
    const aria = btn.getAttribute('aria-label')?.toLowerCase() || '';
    const cls = btn.classList.toString().toLowerCase();
    
    const isPlatformMatch = platformSelector ? btn.matches(platformSelector) : false;
    
    // Loosely identify "Add" or "Cart" buttons, OR explicitly match platform selector
    if (isPlatformMatch || text.includes('add') || text.includes('cart') || aria.includes('add') || aria.includes('cart') || cls.includes('add')) {
      
      // Crawl up to find a container that has text (like price, product name)
      let container: HTMLElement | null = btn as HTMLElement;
      let depth = 0;
      
      // We want a container that has a decent amount of text but isn't the whole page
      // Increased depth to 12 for complex sites like BigBasket
      while (container && depth < 12) {
        const textLen = container.textContent?.trim().length || 0;
        if (textLen > 15 && textLen < 1500) {
          // Stop if we hit a generic main container to avoid pulling the whole page
          if (container.tagName === 'MAIN' || container.tagName === 'BODY') break;
          break;
        }
        container = container.parentElement;
        depth++;
      }
      
      if (container && container.textContent) {
        // Clean up the text for the AI
        const cleanText = container.textContent.replace(/\s+/g, ' ').trim();
        options.push({
          id: idCounter++,
          text: cleanText,
          button: btn as HTMLButtonElement,
          container: container
        });
      }
    }
  }
  
  // Deduplicate by text to avoid sending 50 buttons from the same card
  const uniqueOptions: ScrapedOption[] = [];
  const seenTexts = new Set<string>();
  for (const opt of options) {
    if (!seenTexts.has(opt.text)) {
      seenTexts.add(opt.text);
      uniqueOptions.push(opt);
    }
  }
  
  return uniqueOptions.slice(0, 20); // Limit to top 20
}
