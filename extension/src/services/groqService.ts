const GROQ_API_KEY = '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';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.1-8b-instant';

export interface Product {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  currentStock?: number;
  priority?: 'High' | 'Medium' | 'Low';
  estimatedCost?: number;
}

export interface ProductAnalysis {
  product: string;
  demandData: { day: string; demand: number }[];
  theory: string;
  alternative?: {
    name: string;
    priceDiff: string;
    availability: string;
  };
  urgency: string;
  daysUntilStockout: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

async function groqRequest(messages: { role: string; content: string }[], temperature = 0.7): Promise<string> {
  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq API error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

export async function analyzeProduct(product: Product): Promise<ProductAnalysis> {
  const prompt = `You are an AI procurement analyst for a retail store. Analyze this product for restocking:

Product: ${product.name}
Category: ${product.category}
Current Stock: ${product.currentStock ?? 'Unknown'} ${product.unit}
Recommended Reorder: ${product.quantity} ${product.unit}

Respond in this exact JSON format (no markdown, just raw JSON):
{
  "demandData": [
    {"day": "Day 1", "demand": <number>},
    {"day": "Day 2", "demand": <number>},
    {"day": "Day 3", "demand": <number>},
    {"day": "Day 4", "demand": <number>},
    {"day": "Day 5", "demand": <number>},
    {"day": "Day 6", "demand": <number>},
    {"day": "Day 7", "demand": <number>}
  ],
  "theory": "<4-5 line explanation of why demand is expected to increase, including seasonal/weather/market factors>",
  "alternative": {
    "name": "<alternative product name>",
    "priceDiff": "<e.g. +3% or -5%>",
    "availability": "<High/Medium/Low>"
  },
  "urgency": "<Critical/High/Medium/Low>",
  "daysUntilStockout": <number>
}

Make the demand data show a realistic increasing trend over 7 days. Be specific about Indian retail market conditions.`;

  const result = await groqRequest([
    { role: 'system', content: 'You are a retail procurement analyst. Respond only with valid JSON, no markdown.' },
    { role: 'user', content: prompt },
  ]);

  try {
    const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return {
      product: product.name,
      ...parsed,
    };
  } catch {
    return {
      product: product.name,
      demandData: [
        { day: 'Day 1', demand: Math.round(product.quantity * 0.12) },
        { day: 'Day 2', demand: Math.round(product.quantity * 0.13) },
        { day: 'Day 3', demand: Math.round(product.quantity * 0.14) },
        { day: 'Day 4', demand: Math.round(product.quantity * 0.15) },
        { day: 'Day 5', demand: Math.round(product.quantity * 0.16) },
        { day: 'Day 6', demand: Math.round(product.quantity * 0.17) },
        { day: 'Day 7', demand: Math.round(product.quantity * 0.19) },
      ],
      theory: `Based on current market trends, ${product.name} demand is expected to rise steadily over the next 7 days. Seasonal consumption patterns and regional demand signals suggest an increasing trajectory. Current stock levels indicate a reorder is necessary to prevent stockout. The recommended quantity of ${product.quantity} ${product.unit} accounts for buffer stock.`,
      urgency: 'High',
      daysUntilStockout: 2,
    };
  }
}

export async function chatResponse(
  messages: ChatMessage[],
  products: Product[],
  currentSite: string
): Promise<string> {
  const productContext = products.length > 0
    ? `\n\nCurrent procurement list:\n${products.map(p => `- ${p.name}: ${p.quantity} ${p.unit} (Priority: ${p.priority || 'Medium'})`).join('\n')}`
    : '';

  const systemPrompt = `You are Forecastify's AI Procurement Assistant. You help retailers make smart purchasing decisions.

Current website: ${currentSite}
${productContext}

Your capabilities:
- Match forecasted products with platform listings
- Resolve naming variations between suppliers
- Recommend alternative products when exact matches are unavailable
- Explain procurement recommendations
- Prioritize urgent stock replenishment
- Suggest bulk purchase opportunities
- Provide supplier-side insights

Be concise, helpful, and specific to Indian retail context. Use ₹ for currency.`;

  const chatMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map(m => ({ role: m.role, content: m.content })),
  ];

  return groqRequest(chatMessages);
}

export async function matchProductOnPlatform(
  productName: string,
  platform: string
): Promise<{ searchQuery: string; tips: string }> {
  const prompt = `For the product "${productName}", suggest the best search query to find it on ${platform} (Indian e-commerce/wholesale platform).

Respond in JSON format:
{
  "searchQuery": "<optimized search query>",
  "tips": "<brief tip about finding this product on this platform>"
}`;

  const result = await groqRequest([
    { role: 'system', content: 'Respond only with valid JSON.' },
    { role: 'user', content: prompt },
  ], 0.3);

  try {
    const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return {
      searchQuery: productName,
      tips: `Search for "${productName}" on ${platform}`,
    };
  }
}

export function getMockProducts(): Product[] {
  return [
    { id: '1', name: 'Amul Milk 500ml', quantity: 50, unit: 'Units', category: 'Dairy', currentStock: 8, priority: 'High', estimatedCost: 1350 },
    { id: '2', name: 'Parle-G Biscuits', quantity: 20, unit: 'Packets', category: 'Snacks', currentStock: 5, priority: 'High', estimatedCost: 100 },
    { id: '3', name: 'Tata Sugar 1kg', quantity: 15, unit: 'Bags', category: 'Groceries', currentStock: 3, priority: 'Medium', estimatedCost: 675 },
    { id: '4', name: 'Red Label Tea 250g', quantity: 10, unit: 'Packets', category: 'Beverages', currentStock: 2, priority: 'High', estimatedCost: 1200 },
    { id: '5', name: 'Fortune Sunflower Oil 1L', quantity: 12, unit: 'Bottles', category: 'Cooking', currentStock: 4, priority: 'Medium', estimatedCost: 1680 },
    { id: '6', name: 'Maggi Noodles', quantity: 30, unit: 'Packets', category: 'Snacks', currentStock: 10, priority: 'Low', estimatedCost: 420 },
    { id: '7', name: 'Surf Excel Detergent 1kg', quantity: 8, unit: 'Packets', category: 'Household', currentStock: 1, priority: 'High', estimatedCost: 1520 },
    { id: '8', name: 'Britannia Bread', quantity: 25, unit: 'Loaves', category: 'Bakery', currentStock: 6, priority: 'Medium', estimatedCost: 1000 },
  ];
}
