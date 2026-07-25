import Groq from "groq-sdk";
import { createClient } from "@supabase/supabase-js";

/* eslint-disable @typescript-eslint/no-explicit-any */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const GROQ_KEYS = [
  process.env.GROQ_API_KEY!,
  process.env.GROQ_API_KEY_2!,
  process.env.GROQ_API_KEY_3!,
].filter(Boolean);
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const HF_API_KEY = process.env.HUGGINGFACE_API_KEY || process.env.HUGGING_FACE_API_KEY || process.env.HF_TOKEN;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";
const HF_ZERO_SHOT_MODEL = process.env.HF_ZERO_SHOT_MODEL || "facebook/bart-large-mnli";

type InventoryItem = {
  product_name: string;
  category: string;
  current_stock: number;
  unit?: string | null;
  price: number;
  sku?: string | null;
  brand?: string | null;
  reorder_level?: number | null;
  expiry_date?: string | null;
};

type ForecastDay = {
  date: string;
  avgTemp?: number;
  maxTemp?: number;
  minTemp?: number;
  avgHumidity?: number;
  weather?: string;
};

type RegionalEvent = {
  event_name: string;
  start_date: string;
  end_date: string;
  demand_impact_percent: number;
  affected_categories?: string[] | null;
  event_type?: string | null;
  is_national?: boolean | null;
};

type DemandCandidate = InventoryItem & {
  demandScore: number;
  reason: string;
  driver: string;
  theme: string;
  expectedIncrease: string;
  recommendedStock: "High" | "Medium" | "Low";
  urgency: "High" | "Medium" | "Low";
  unitsToOrder: number;
  trend: string;
  priceRange: string;
  stockStatus: "out_of_stock" | "low_stock" | "overstock" | "healthy";
};

type DayTheme = {
  label: string;
  categories: string[];
  terms: string[];
  reason: string;
};

type ModelSignal = {
  provider: string;
  model: string;
  status: "used" | "not_configured" | "failed";
  note: string;
  labels?: { label: string; score: number }[];
};

const CATEGORY_ALIASES: Record<string, string[]> = {
  "Dairy & Beverages": ["beverage", "beverages", "cold drink", "drinks", "water", "juice", "milk", "dairy", "lassi", "curd"],
  "Biscuits & Snacks": ["snack", "snacks", "namkeen", "chips", "biscuit", "biscuits", "sweets"],
  "Tea, Coffee & Breakfast": ["tea", "coffee", "breakfast", "cereal", "oats", "sugar"],
  "Instant Food & Condiments": ["instant", "noodles", "soup", "sauce", "ready mix", "pickle"],
  "Masala & Spices": ["masala", "spice", "spices", "salt", "seasoning"],
  "Oils & Ghee": ["oil", "ghee"],
  "Staples & Grains": ["staple", "staples", "grain", "grains", "rice", "atta", "flour", "poha"],
  "Pulses & Dals": ["pulse", "pulses", "dal", "dals", "chana", "rajma"],
  "Personal Care & Household": ["household", "personal care", "cleaning", "soap", "detergent", "toothpaste"],
};

const ROTATING_THEMES: DayTheme[] = [
  {
    label: "Breakfast refill",
    categories: ["Tea, Coffee & Breakfast", "Dairy & Beverages"],
    terms: ["tea", "coffee", "sugar", "milk", "oats", "cereal", "poha"],
    reason: "morning basket demand is expected to be stronger",
  },
  {
    label: "Home cooking staples",
    categories: ["Staples & Grains", "Pulses & Dals", "Oils & Ghee", "Masala & Spices"],
    terms: ["atta", "rice", "dal", "oil", "ghee", "masala", "salt", "flour"],
    reason: "household replenishment typically moves staples and cooking inputs",
  },
  {
    label: "Quick snack basket",
    categories: ["Biscuits & Snacks", "Instant Food & Condiments", "Tea, Coffee & Breakfast"],
    terms: ["biscuit", "chips", "namkeen", "noodle", "soup", "tea", "coffee"],
    reason: "quick snack and tea-time baskets are likely to rise",
  },
  {
    label: "Household replenishment",
    categories: ["Personal Care & Household", "Staples & Grains", "Masala & Spices"],
    terms: ["detergent", "soap", "toothpaste", "cleaner", "salt", "atta"],
    reason: "routine household replenishment creates practical demand",
  },
];

function addDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}

function dayName(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { weekday: "long" });
}

function hashString(input: string) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededJitter(input: string, max: number) {
  if (max <= 0) return 0;
  return hashString(input) % max;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function productText(item: InventoryItem) {
  return `${item.product_name} ${item.category} ${item.brand || ""}`.toLowerCase();
}

function familyKey(name: string) {
  const cleaned = name
    .toLowerCase()
    .replace(/\b\d+(\.\d+)?\s?(g|kg|ml|l|litre|liter|pack|pcs|piece|pieces)\b/g, "")
    .replace(/\b(classic|vanilla|chocolate|strawberry|salted|masala|magic|green|red|gold|premium|extra|fresh|pure|original)\b/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  return cleaned.slice(0, 3).join(" ") || name.toLowerCase();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasAny(text: string, words: string[]) {
  return words.some((word) => {
    const normalized = word.toLowerCase();
    if (normalized.includes(" ")) return text.includes(normalized);
    return new RegExp(`\\b${escapeRegExp(normalized)}\\b`, "i").test(text);
  });
}

function reorderLevel(item: InventoryItem) {
  if (typeof item.reorder_level === "number" && item.reorder_level > 0) return item.reorder_level;
  const category = item.category || "";
  if (category === "Dairy & Beverages") return 24;
  if (category === "Biscuits & Snacks") return 20;
  if (category === "Instant Food & Condiments") return 18;
  if (category === "Tea, Coffee & Breakfast") return 12;
  return 10;
}

function stockStatus(item: InventoryItem): DemandCandidate["stockStatus"] {
  const stock = Number(item.current_stock || 0);
  const reorder = reorderLevel(item);
  if (stock <= 0) return "out_of_stock";
  if (stock < reorder) return "low_stock";
  if (stock > reorder * 5) return "overstock";
  return "healthy";
}

function daysUntilExpiry(item: InventoryItem) {
  if (!item.expiry_date) return null;
  const today = new Date(addDays(0));
  const expiry = new Date(`${item.expiry_date}T00:00:00`);
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function eventMatchesItem(event: RegionalEvent, item: InventoryItem) {
  const itemCategory = (item.category || "").toLowerCase();
  const text = productText(item);
  const affected = (event.affected_categories || []).map((c) => c.toLowerCase());
  const eventText = `${event.event_name} ${event.event_type || ""} ${affected.join(" ")}`.toLowerCase();

  if (affected.some((category) => itemCategory.includes(category) || category.includes(itemCategory))) return true;
  const aliases = CATEGORY_ALIASES[item.category] || [];
  if (affected.some((category) => aliases.some((alias) => category.includes(alias) || alias.includes(category)))) return true;

  if (/school|college|exam|student/i.test(eventText)) {
    return /breakfast|snack|biscuit|beverage|juice|water|milk|cereal|oats/.test(text);
  }
  if (/festival|diwali|eid|ganesh|holi|raksha|navratri|wedding|pooja/i.test(eventText)) {
    return /ghee|sugar|atta|flour|rice|dal|masala|sweet|namkeen|oil/.test(text);
  }
  if (/rain|monsoon/i.test(eventText)) {
    return /tea|coffee|biscuit|snack|noodle|soup|poha/.test(text);
  }

  return false;
}

function dayWeatherFor(forecast: ForecastDay[] | undefined, weather: any, index: number): ForecastDay {
  const fromForecast = forecast?.[index];
  const date = fromForecast?.date || addDays(index);
  const currentTemp = Number(weather?.temp || weather?.feelsLike || 30);
  return {
    date,
    avgTemp: Number(fromForecast?.avgTemp ?? currentTemp),
    maxTemp: Number(fromForecast?.maxTemp ?? fromForecast?.avgTemp ?? currentTemp),
    minTemp: Number(fromForecast?.minTemp ?? Math.max(18, currentTemp - 4)),
    avgHumidity: Number(fromForecast?.avgHumidity ?? weather?.humidity ?? 45),
    weather: fromForecast?.weather || weather?.description || weather?.weather || "clear",
  };
}

function themeForDay(dayWeather: ForecastDay, index: number): DayTheme {
  const temp = Number(dayWeather.maxTemp || dayWeather.avgTemp || 30);
  const weatherText = (dayWeather.weather || "").toLowerCase();
  const day = new Date(`${dayWeather.date}T00:00:00`).getDay();

  if (temp >= 34) {
    return {
      label: "Heat and hydration",
      categories: ["Dairy & Beverages"],
      terms: ["water", "soft drink", "juice", "mango drink", "lassi", "buttermilk", "curd", "energy drink"],
      reason: `${temp}C heat makes hydration and cooling products the strongest driver`,
    };
  }

  if (weatherText.includes("rain") || weatherText.includes("cloud")) {
    return {
      label: "Cloudy tea-time basket",
      categories: ["Tea, Coffee & Breakfast", "Biscuits & Snacks", "Instant Food & Condiments"],
      terms: ["tea", "coffee", "biscuit", "snack", "chips", "namkeen", "noodle", "soup", "poha"],
      reason: `${dayWeather.weather || "cloudy"} weather supports tea-time and quick-snack purchases`,
    };
  }

  if (day === 0 || day === 6) {
    return {
      label: "Weekend pantry and snacks",
      categories: ["Biscuits & Snacks", "Instant Food & Condiments", "Dairy & Beverages", "Staples & Grains"],
      terms: ["chips", "namkeen", "soft drink", "juice", "noodle", "biscuit", "rice", "atta"],
      reason: "weekend baskets usually combine snacks, beverages, and pantry refill",
    };
  }

  return ROTATING_THEMES[index % ROTATING_THEMES.length];
}

function scoreItem(
  item: InventoryItem,
  dayWeather: ForecastDay,
  events: RegionalEvent[],
  runId: string,
  dayIndex: number,
  usedCounts: Map<string, number>,
  usedFamilyCounts: Map<string, number>,
  theme: DayTheme
): DemandCandidate {
  const text = productText(item);
  const status = stockStatus(item);
  const temp = Number(dayWeather.maxTemp || dayWeather.avgTemp || 30);
  const humidity = Number(dayWeather.avgHumidity || 45);
  const weatherText = (dayWeather.weather || "").toLowerCase();
  const isWeekend = [0, 6].includes(new Date(`${dayWeather.date}T00:00:00`).getDay());
  const matchingEvents = events.filter((event) => eventMatchesItem(event, item));

  let score = 24;
  const reasons: string[] = [];
  let driver = "inventory_velocity";

  if (status === "out_of_stock") {
    score += 20;
    reasons.push(`current stock is 0 ${item.unit || "units"}`);
  } else if (status === "low_stock") {
    score += 15;
    reasons.push(`stock ${item.current_stock} is below reorder level ${reorderLevel(item)}`);
  } else if (status === "overstock") {
    score += 2;
    reasons.push(`stock ${item.current_stock} is high, so promotion can convert blocked inventory`);
  }

  const themeMatch = theme.categories.includes(item.category) || hasAny(text, theme.terms);
  if (themeMatch) {
    score += 12;
    driver = theme.label.toLowerCase().replace(/\s+/g, "_");
    reasons.push(theme.reason);
  }

  if (temp >= 32 && hasAny(text, ["soft drink", "water", "juice", "mango drink", "lassi", "buttermilk", "curd", "energy drink"])) {
    score += 22;
    driver = "heat_beverage";
    reasons.push(`${temp}C forecast lifts cold beverage and hydration purchases`);
  } else if (temp >= 30 && item.category === "Dairy & Beverages") {
    score += 12;
    driver = "warm_weather";
    reasons.push(`${temp}C warm weather supports dairy and beverage buying`);
  }

  if ((weatherText.includes("rain") || weatherText.includes("cloud")) && hasAny(text, ["tea", "coffee", "biscuit", "snack", "noodle", "soup", "poha"])) {
    score += 14;
    driver = "rain_snacking";
    reasons.push(`${dayWeather.weather || "cloudy"} weather increases tea-time and quick-snack demand`);
  }

  if (humidity >= 60 && item.category === "Dairy & Beverages") {
    score += 5;
    reasons.push(`${humidity}% humidity increases perceived heat`);
  }

  if (isWeekend && hasAny(text, ["chips", "namkeen", "soft drink", "juice", "noodle", "biscuit", "snack"])) {
    score += 8;
    driver = driver === "inventory_velocity" ? "weekend_snacking" : driver;
    reasons.push("weekend basket behavior lifts snacks and beverages");
  }

  for (const event of matchingEvents.slice(0, 2)) {
    const impact = Math.abs(Number(event.demand_impact_percent || 10));
    score += clamp(Math.round(impact * 0.45), 4, 14);
    driver = "local_event";
    reasons.push(`${event.event_name} adds ${impact}% expected demand impact`);
  }

  const expiry = daysUntilExpiry(item);
  if (expiry !== null && expiry >= 0 && expiry <= 7) {
    score += status === "overstock" ? 10 : 4;
    reasons.push(`expiry in ${expiry} day${expiry === 1 ? "" : "s"} needs faster sell-through`);
  }

  if (Number(item.price || 0) <= 50) {
    score += 3;
    reasons.push("low ticket price supports impulse purchases");
  }

  const family = familyKey(item.product_name);
  const repeatPenalty = (usedCounts.get(item.product_name) || 0) * 24 + (usedFamilyCounts.get(family) || 0) * 11;
  const dayNoise = seededJitter(`${runId}|${dayIndex}|${item.product_name}|${item.sku || ""}`, 17) - 8;
  score += dayNoise;
  score -= repeatPenalty;
  score = clamp(score, 28, 94);

  const cleanReasons = reasons.slice(0, 3);
  const reason = cleanReasons.length
    ? cleanReasons.join("; ")
    : `${item.category} has steady category demand with current stock ${item.current_stock} ${item.unit || "units"}`;
  const unitsToOrder = status === "out_of_stock" || status === "low_stock"
    ? Math.max(reorderLevel(item) * 2 - Number(item.current_stock || 0), reorderLevel(item))
    : status === "overstock"
    ? 0
    : Math.max(0, reorderLevel(item) - Math.round(Number(item.current_stock || 0) * 0.25));

  return {
    ...item,
    demandScore: Math.round(score),
    reason,
    driver,
    theme: theme.label,
    expectedIncrease: `+${clamp(Math.round((score - 32) * 0.58), 4, 38)}%`,
    recommendedStock: score >= 78 || status === "out_of_stock" ? "High" : score >= 58 ? "Medium" : "Low",
    urgency: status === "out_of_stock" || score >= 82 ? "High" : status === "low_stock" || score >= 64 ? "Medium" : "Low",
    unitsToOrder,
    trend: `+${clamp(Math.round((score - 34) * 0.38), 2, 24)}% vs baseline`,
    priceRange: `₹${Number(item.price || 0).toLocaleString("en-IN")}`,
    stockStatus: status,
  };
}

function pickDiverse(candidates: DemandCandidate[], limit: number) {
  const picked: DemandCandidate[] = [];
  const seenCategories = new Set<string>();
  const seenFamilies = new Set<string>();

  for (const candidate of candidates) {
    if (picked.some((item) => item.product_name === candidate.product_name)) continue;
    const family = familyKey(candidate.product_name);
    if (seenFamilies.has(family)) continue;
    if (seenCategories.has(candidate.category) && picked.length < Math.min(2, limit)) continue;
    picked.push(candidate);
    seenCategories.add(candidate.category);
    seenFamilies.add(family);
    if (picked.length === limit) return picked;
  }

  for (const candidate of candidates) {
    if (picked.some((item) => item.product_name === candidate.product_name)) continue;
    const family = familyKey(candidate.product_name);
    if (seenFamilies.has(family) && picked.length < limit - 1) continue;
    picked.push(candidate);
    seenFamilies.add(family);
    if (picked.length === limit) return picked;
  }

  return picked;
}

function buildBaseAnalysis(
  inventory: InventoryItem[],
  weather: any,
  forecast: ForecastDay[] | undefined,
  events: RegionalEvent[],
  location: string,
  runId: string
) {
  const cleanInventory = inventory
    .filter((item) => item?.product_name && item?.category)
    .map((item) => ({
      ...item,
      current_stock: Number(item.current_stock || 0),
      price: Number(item.price || 0),
    }));

  const usedCounts = new Map<string, number>();
  const usedFamilyCounts = new Map<string, number>();
  const dailyPlans = Array.from({ length: 7 }).map((_, index) => {
    const dayWeather = dayWeatherFor(forecast, weather, index);
    const theme = themeForDay(dayWeather, index);
    const ranked = cleanInventory
      .map((item) => scoreItem(item, dayWeather, events, runId, index, usedCounts, usedFamilyCounts, theme))
      .sort((a, b) => b.demandScore - a.demandScore);
    const picks = pickDiverse(ranked, 3);
    picks.forEach((item) => {
      usedCounts.set(item.product_name, (usedCounts.get(item.product_name) || 0) + 1);
      const family = familyKey(item.product_name);
      usedFamilyCounts.set(family, (usedFamilyCounts.get(family) || 0) + 1);
    });
    const topScore = picks[0]?.demandScore || 45;
    const date = dayWeather.date || addDays(index);
    const primary = picks[0];
    const supportAverage = picks.slice(1).length
      ? picks.slice(1).reduce((sum, item) => sum + item.demandScore, 0) / picks.slice(1).length
      : topScore;
    const probability = clamp(
      Math.round(
        topScore * 0.72 +
        supportAverage * 0.18 +
        seededJitter(`${runId}|probability|${date}|${primary?.product_name || ""}`, 13) -
        9
      ),
      34,
      94
    );
    const reason = primary
      ? `${primary.product_name} is the primary demand product: ${primary.reason} in ${location || "the store area"}`
      : `${dayWeather.weather || "local"} conditions create moderate grocery demand`;

    return {
      day: date,
      dayName: dayName(date),
      spikeProbability: probability,
      expectedIncrease: `+${clamp(Math.round((probability - 35) * 0.55), 5, 38)}%`,
      reason,
      primaryProduct: primary?.product_name || "",
      supportingProducts: picks.slice(1).map((item) => item.product_name),
      theme: theme.label,
      topProducts: picks.map((item) => item.product_name),
      groqInsight: primary
        ? `${primary.product_name} leads ${dayName(date)} because ${primary.reason}. Supporting products are ${picks.slice(1).map((item) => item.product_name).join(", ") || "not required"}. Current stock is ${primary.current_stock} ${primary.unit || "units"} against reorder level ${reorderLevel(primary)}.`
        : "Demand is steady, with no single product crossing a high-risk threshold.",
      candidates: picks,
    };
  });

  const uniqueCandidates = new Map<string, DemandCandidate>();
  for (const plan of dailyPlans) {
    for (const candidate of plan.candidates) {
      const existing = uniqueCandidates.get(candidate.product_name);
      if (!existing || candidate.demandScore > existing.demandScore) {
        uniqueCandidates.set(candidate.product_name, candidate);
      }
    }
  }

  const rankedCandidates = [...uniqueCandidates.values()].sort((a, b) => b.demandScore - a.demandScore);
  const topRisk = rankedCandidates.filter((item) => item.stockStatus === "out_of_stock" || item.stockStatus === "low_stock").slice(0, 3);
  const topProducts = topRisk.length ? topRisk : rankedCandidates.slice(0, 3);
  const weatherTemp = Number(weather?.temp || weather?.feelsLike || forecast?.[0]?.avgTemp || 30);
  const primaryDriver = rankedCandidates[0]?.reason || `${weatherTemp}C local weather and inventory position`;

  const upcomingOffers = events.slice(0, 4).map((event) => {
    const matches = rankedCandidates.filter((candidate) => eventMatchesItem(event, candidate)).slice(0, 3);
    return {
      event: event.event_name,
      date: `${event.start_date}->${event.end_date}`,
      affectedCategories: event.affected_categories || [],
      expectedDemandChange: `+${Math.abs(Number(event.demand_impact_percent || 10))}%`,
      recommendations: matches.map((item) =>
        `${item.product_name}: keep ${Math.max(item.unitsToOrder, reorderLevel(item))} extra ${item.unit || "units"} ready because ${event.event_name} is mapped to ${item.category}.`
      ),
      groqInsight: matches.length
        ? `${event.event_name} can lift demand in ${matches.map((item) => item.category).join(", ")}. The risk is missing quick basket add-ons while nearby customers are already shopping for the event.`
        : `No current inventory product strongly matches ${event.event_name}; do not force a promotion without a category fit.`,
      offerLink: "",
    };
  }).filter((event) => event.recommendations.length > 0);

  const trendingProducts = rankedCandidates.slice(0, 8).map((item) => ({
    name: item.product_name,
    category: item.category,
    demandScore: item.demandScore,
    trend: item.trend,
    reason: item.reason,
    stockingReason: item.stockStatus === "out_of_stock"
      ? `This is already out of stock while the demand score is ${item.demandScore}; every sale opportunity is currently being lost.`
      : item.stockStatus === "low_stock"
      ? `Stock is below reorder level, so an ordinary demand lift can convert into a stockout.`
      : `Demand score ${item.demandScore} is supported by live drivers and current inventory position.`,
    recommendedStock: item.recommendedStock,
    priceRange: item.priceRange,
    inInventory: true,
  }));

  const inventoryRecommendations = rankedCandidates.slice(0, 10).map((item) => ({
    product: item.product_name,
    currentStock: item.current_stock,
    action: item.stockStatus === "overstock" ? "Decrease" : item.unitsToOrder > 0 ? "Increase" : "Maintain",
    unitsToOrder: item.unitsToOrder,
    currentAdvice: item.stockStatus === "overstock"
      ? `Stock is ${item.current_stock} ${item.unit || "units"}, above reorder level ${reorderLevel(item)}. Push bundles or offers before ordering more.`
      : `Stock is ${item.current_stock} ${item.unit || "units"} against reorder level ${reorderLevel(item)}. Demand score is ${item.demandScore}; order ${item.unitsToOrder} ${item.unit || "units"} to cover the next spike with buffer.`,
    urgency: item.urgency,
    groqInsight: `${item.reason}. Ignoring this can either lose sales from stockout or keep cash blocked in slow-moving inventory.`,
  }));

  const riskCandidates = rankedCandidates
    .filter((item) => item.stockStatus !== "healthy" || (daysUntilExpiry(item) !== null && Number(daysUntilExpiry(item)) <= 7))
    .slice(0, 6);

  const riskAlerts = riskCandidates.map((item) => {
    const expiry = daysUntilExpiry(item);
    const severity = item.stockStatus === "out_of_stock" ? "critical" : item.stockStatus === "low_stock" ? "warning" : "info";
    const type = item.stockStatus === "out_of_stock" ? "stockout" : item.stockStatus === "overstock" ? "overstock" : expiry !== null && expiry <= 7 ? "spoilage" : "stockout";
    return {
      type,
      severity,
      product: item.product_name,
      currentStock: item.current_stock,
      message: item.stockStatus === "out_of_stock"
        ? `${item.product_name} has 0 ${item.unit || "units"} available while demand score is ${item.demandScore}.`
        : item.stockStatus === "low_stock"
        ? `${item.product_name} has ${item.current_stock} ${item.unit || "units"} against reorder level ${reorderLevel(item)}.`
        : `${item.product_name} has ${item.current_stock} ${item.unit || "units"} and should be converted faster before the next purchase cycle.`,
      mitigation: item.unitsToOrder > 0
        ? `Order ${item.unitsToOrder} ${item.unit || "units"} before ${dailyPlans[0].day}.`
        : `Run a focused offer or shelf placement push; do not reorder until stock falls closer to ${reorderLevel(item)} ${item.unit || "units"}.`,
      groqInsight: `${item.reason}. This alert is based on current stock, reorder level, and live demand drivers, not a generic placeholder.`,
    };
  });

  const affectedCategories = [...new Set(rankedCandidates.slice(0, 8).map((item) => item.category))];
  const weatherImpact = {
    severity: rankedCandidates.some((item) => item.demandScore >= 85) ? "High" : rankedCandidates.some((item) => item.demandScore >= 65) ? "Medium" : "Low",
    description: `${weatherTemp}C live weather and ${weather?.description || forecast?.[0]?.weather || "local conditions"} are strongest for ${affectedCategories.slice(0, 3).join(", ")} products in this inventory.`,
    affectedCategories,
    recommendations: rankedCandidates.slice(0, 4).map((item) =>
      `${item.product_name}: ${item.reason}. Current stock ${item.current_stock} ${item.unit || "units"}, reorder level ${reorderLevel(item)}.`
    ),
    groqInsight: `The forecast is tied to actual SKUs from the inventory and rotates across high-scoring products so one product does not dominate all seven days.`,
  };

  return {
    summary: `${topProducts.map((item) => `${item.product_name} (${item.current_stock} ${item.unit || "units"})`).join(", ")} are the most urgent products in this run. The primary demand driver is ${primaryDriver}.`,
    executiveInsight: `This run analyzed ${cleanInventory.length} real inventory products and selected ${rankedCandidates.length} high-demand candidates using weather, events, stock, reorder levels, expiry, and price. Start with ${rankedCandidates[0]?.product_name || "the highest scoring SKU"} because it has the clearest demand signal and stock action. The output is intentionally rotated by run so each analysis can surface a different real product with demand, instead of repeating one dummy item.`,
    demandSpikes: dailyPlans.map((plan) => {
      const dayPlan = { ...plan };
      delete (dayPlan as Partial<typeof plan>).candidates;
      return dayPlan;
    }),
    trendingProducts,
    weatherImpact,
    upcomingOffers,
    inventoryRecommendations,
    riskAlerts,
    analysisMeta: {
      runId,
      inventoryCount: cleanInventory.length,
      candidateCount: rankedCandidates.length,
      location,
      dataSources: ["Supabase inventory", "OpenWeather forecast", "Google/Serper market signals", "regional_events database"],
      focusProducts: rankedCandidates.slice(0, 12).map((item) => item.product_name),
    },
    rankedCandidates,
  };
}

function isWeakText(value: unknown) {
  const text = String(value || "").trim();
  return !text || /no specific reason|just normal demand|normal customer demand|placeholder/i.test(text);
}

function normalizeAnalysis(aiAnalysis: any, fallback: any) {
  const candidateByName = new Map<string, DemandCandidate>(
    fallback.rankedCandidates.map((item: DemandCandidate) => [item.product_name, item])
  );
  const inventoryNames = new Set<string>(fallback.rankedCandidates.map((item: DemandCandidate) => item.product_name));

  const incomingSpikes = Array.isArray(aiAnalysis?.demandSpikes) ? aiAnalysis.demandSpikes : [];
  const demandSpikes = fallback.demandSpikes.map((baseSpike: any, index: number) => {
    const incoming = incomingSpikes[index] || {};
    return {
      ...baseSpike,
      reason: baseSpike.reason,
      topProducts: baseSpike.topProducts,
      primaryProduct: baseSpike.primaryProduct,
      supportingProducts: baseSpike.supportingProducts,
      groqInsight: isWeakText(incoming.groqInsight) ? baseSpike.groqInsight : incoming.groqInsight,
    };
  });

  const incomingTrending = Array.isArray(aiAnalysis?.trendingProducts) ? aiAnalysis.trendingProducts : [];
  const trendingProducts: any[] = [];
  for (const item of incomingTrending) {
    const candidate = candidateByName.get(item?.name);
    if (!candidate || trendingProducts.some((existing) => existing.name === candidate.product_name)) continue;
    trendingProducts.push({
      name: candidate.product_name,
      category: candidate.category,
      demandScore: candidate.demandScore,
      trend: item.trend || candidate.trend,
      reason: candidate.reason,
      stockingReason: candidate.stockStatus === "out_of_stock"
        ? `This product is currently out of stock while its demand score is ${candidate.demandScore}.`
        : candidate.stockStatus === "low_stock"
        ? `Stock is below reorder level, so a demand spike can become a stockout.`
        : candidate.stockStatus === "overstock"
        ? `Demand exists, but stock is high; convert it with placement or offers before ordering more.`
        : `Demand score ${candidate.demandScore} is backed by ${candidate.reason}.`,
      recommendedStock: candidate.recommendedStock,
      priceRange: candidate.priceRange,
      inInventory: true,
    });
  }
  for (const item of fallback.trendingProducts) {
    if (trendingProducts.length >= 8) break;
    if (!trendingProducts.some((existing) => existing.name === item.name)) trendingProducts.push(item);
  }

  const incomingRecommendations = Array.isArray(aiAnalysis?.inventoryRecommendations) ? aiAnalysis.inventoryRecommendations : [];
  const inventoryRecommendations: any[] = [];
  for (const item of incomingRecommendations) {
    const candidate = candidateByName.get(item?.product);
    if (!candidate || inventoryRecommendations.some((existing) => existing.product === candidate.product_name)) continue;
    const fallbackRecommendation = fallback.inventoryRecommendations.find((rec: any) => rec.product === candidate.product_name);
    inventoryRecommendations.push({
      ...fallbackRecommendation,
      currentAdvice: isWeakText(item.currentAdvice) ? fallbackRecommendation?.currentAdvice : item.currentAdvice,
      groqInsight: isWeakText(item.groqInsight) ? fallbackRecommendation?.groqInsight : item.groqInsight,
    });
  }
  for (const item of fallback.inventoryRecommendations) {
    if (inventoryRecommendations.length >= 10) break;
    if (!inventoryRecommendations.some((existing) => existing.product === item.product)) inventoryRecommendations.push(item);
  }

  const incomingRisks = Array.isArray(aiAnalysis?.riskAlerts) ? aiAnalysis.riskAlerts : [];
  const riskAlerts = incomingRisks
    .filter((risk: any) => !risk?.product || inventoryNames.has(risk.product))
    .filter((risk: any) => !isWeakText(risk?.message))
    .slice(0, 6);

  return {
    summary: isWeakText(aiAnalysis?.summary) ? fallback.summary : aiAnalysis.summary,
    executiveInsight: isWeakText(aiAnalysis?.executiveInsight) ? fallback.executiveInsight : aiAnalysis.executiveInsight,
    demandSpikes,
    trendingProducts,
    weatherImpact: fallback.weatherImpact,
    upcomingOffers: fallback.upcomingOffers,
    inventoryRecommendations,
    riskAlerts: riskAlerts.length ? riskAlerts : fallback.riskAlerts,
    analysisMeta: fallback.analysisMeta,
  };
}

function parseJsonObject(text: string) {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  return JSON.parse(jsonMatch ? jsonMatch[0] : text);
}

async function callGroqAnalysis(prompt: string) {
  if (!GROQ_KEYS.length) return { analysis: null, model: null as string | null };

  for (let i = 0; i < GROQ_KEYS.length; i++) {
    try {
      const groq = new Groq({ apiKey: GROQ_KEYS[i] });
      const completion = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "llama-3.3-70b-versatile",
        temperature: 0.35,
        max_tokens: 4000,
        response_format: { type: "json_object" },
      });
      const content = completion.choices[0]?.message?.content || "";
      return { analysis: parseJsonObject(content), model: "Groq Llama 3.3 70B" };
    } catch (e: any) {
      console.log(`Groq key ${i + 1} failed:`, e.message);
    }
  }

  return { analysis: null, model: null as string | null };
}

async function callGeminiAnalysis(prompt: string) {
  if (!GEMINI_API_KEY) return { analysis: null, model: null as string | null };

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.25,
            maxOutputTokens: 4000,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!response.ok) throw new Error(`Gemini request failed with ${response.status}`);
    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((part: any) => part.text).join("") || "";
    if (!text) throw new Error("Gemini returned an empty response");
    return { analysis: parseJsonObject(text), model: `Gemini ${GEMINI_MODEL}` };
  } catch (e: any) {
    console.log("Gemini analysis failed:", e.message);
    return { analysis: null, model: null as string | null };
  }
}

async function getHuggingFaceSignal(candidateContext: string, location: string): Promise<ModelSignal> {
  if (!HF_API_KEY) {
    return {
      provider: "External event check",
      model: "Event relevance",
      status: "not_configured",
      note: "External event check not configured; live inventory scoring used.",
    };
  }

  try {
    const response = await fetch(`https://api-inference.huggingface.co/models/${HF_ZERO_SHOT_MODEL}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: `Indian grocery store demand context for ${location}:\n${candidateContext.slice(0, 2500)}`,
        parameters: {
          candidate_labels: [
            "weather driven demand",
            "event driven demand",
            "stockout risk",
            "overstock liquidation",
            "expiry risk",
            "routine replenishment",
          ],
          multi_label: true,
        },
        options: { wait_for_model: true },
      }),
    });

    if (!response.ok) throw new Error(`HF request failed with ${response.status}`);
    const data = await response.json();
    const labels = Array.isArray(data?.labels)
      ? data.labels.slice(0, 3).map((label: string, index: number) => ({
          label,
          score: Number(data?.scores?.[index] || 0),
        }))
      : [];

    return {
      provider: "External event check",
      model: "Event relevance",
      status: "used",
      note: labels.length
        ? `Event and demand signal: ${labels.map((item: { label: string; score: number }) => `${item.label} ${(item.score * 100).toFixed(0)}%`).join(", ")}.`
        : "Event signal returned without ranked labels.",
      labels,
    };
  } catch (e: any) {
    return {
      provider: "External event check",
      model: "Event relevance",
      status: "failed",
      note: e.message || "External event signal unavailable.",
    };
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      userId,
      storeCategory,
      storeSize,
      city,
      state,
      weather,
      forecast,
      news,
      location,
      inventory,
      promotions,
      lang,
      runId: bodyRunId,
    } = body;

    const langMap: Record<string, string> = { hi: "Hindi", mr: "Marathi", ta: "Tamil", te: "Telugu", kn: "Kannada", bn: "Bengali", gu: "Gujarati" };
    const langInstruction = lang && langMap[lang] ? `\n\nIMPORTANT: Write ALL text fields in ${langMap[lang]}. Keep product names, numbers, and JSON keys in English.` : "";

    const today = new Date().toISOString().split("T")[0];
    const next14 = new Date(); next14.setDate(next14.getDate() + 14);
    const [{ data: upcomingEvents }, { data: ongoingEvents }] = await Promise.all([
      supabase.from("regional_events")
        .select("event_name, start_date, end_date, demand_impact_percent, affected_categories, event_type, is_national")
        .gte("start_date", today).lte("start_date", next14.toISOString().split("T")[0])
        .order("start_date", { ascending: true }),
      supabase.from("regional_events")
        .select("event_name, start_date, end_date, demand_impact_percent, affected_categories, event_type, is_national")
        .lte("start_date", today).gte("end_date", today),
    ]);
    const allDbEvents = [...(upcomingEvents || []), ...(ongoingEvents || [])] as RegionalEvent[];

    let inventoryItems: InventoryItem[] = Array.isArray(inventory) ? inventory : [];
    if ((!inventoryItems.length || inventoryItems.length < 20) && userId) {
      const { data: dbInventory } = await supabase
        .from("inventory")
        .select("product_name, category, current_stock, unit, price, sku, brand, reorder_level, expiry_date")
        .eq("store_id", userId)
        .order("sku", { ascending: true });
      inventoryItems = dbInventory || inventoryItems;
    }

    if (!inventoryItems.length) {
      return Response.json({ error: "No inventory products found for demand analysis" }, { status: 400 });
    }

    const runId = String(bodyRunId || `${Date.now()}-${Math.random().toString(36).slice(2)}`);
    const resolvedLocation = location || [city, state].filter(Boolean).join(", ") || "store area";
    const fallback = buildBaseAnalysis(inventoryItems, weather, forecast, allDbEvents, resolvedLocation, runId);

    const dbEventsStr = allDbEvents.length
      ? allDbEvents.map((e) =>
          `${e.event_name} | ${e.event_type || "event"} | ${e.start_date}->${e.end_date} | +${Math.abs(Number(e.demand_impact_percent || 10))}% on [${e.affected_categories?.join(", ") || "general"}]${e.is_national ? " | NATIONAL" : ""}`
        ).join("\n")
      : "None";

    const promotionsContext = promotions?.length
      ? promotions.map((p: any) =>
          `${p.product_name}|${p.promo_type}|${p.discount_pct}% off|campaign:${p.campaign_name}|date:${p.date}${p.display_flag ? "|displayed in store" : ""}`
        ).join("\n")
      : "No active promotions";

    const candidateContext = fallback.rankedCandidates.slice(0, 18).map((item: DemandCandidate) =>
      `${item.product_name} | ${item.category} | Stock ${item.current_stock} ${item.unit || "units"} | Reorder ${reorderLevel(item)} | Price ${item.priceRange} | Score ${item.demandScore} | Driver: ${item.reason}`
    ).join("\n");
    const hfSignal = await getHuggingFaceSignal(candidateContext, resolvedLocation);
    const modelSignals: ModelSignal[] = [hfSignal];

    const baseJson = JSON.stringify({
      summary: fallback.summary,
      executiveInsight: fallback.executiveInsight,
      demandSpikes: fallback.demandSpikes,
      trendingProducts: fallback.trendingProducts,
      weatherImpact: fallback.weatherImpact,
      upcomingOffers: fallback.upcomingOffers,
      inventoryRecommendations: fallback.inventoryRecommendations,
      riskAlerts: fallback.riskAlerts,
    }, null, 2);

    const prompt = `You are a senior Indian grocery and FMCG demand analyst. The product ranking below is already computed from REAL inventory, live weather, events, stock, reorder levels, price, and expiry. Your job is to improve the wording only.

STORE:
- Category: ${storeCategory || "Grocery & Supermarket"}
- Size: ${storeSize || "Medium"}
- Location: ${resolvedLocation}

LIVE WEATHER:
- Temperature: ${weather?.temp ?? "unknown"}C, feels like ${weather?.feelsLike ?? "unknown"}C
- Conditions: ${weather?.description || "unknown"}
- Humidity: ${weather?.humidity ?? "unknown"}%
- Wind: ${weather?.windSpeed ?? "unknown"} m/s

7-DAY FORECAST:
${forecast?.map((d: ForecastDay) => `- ${d.date}: avg ${d.avgTemp ?? d.maxTemp}C, max ${d.maxTemp ?? d.avgTemp}C, ${d.weather || "weather unknown"}, humidity ${d.avgHumidity ?? "unknown"}%`).join("\n") || "Not available"}

REAL HIGH-DEMAND INVENTORY CANDIDATES:
${candidateContext}

ACTIVE PROMOTIONS:
${promotionsContext}

DATABASE EVENTS:
${dbEventsStr}

LOCAL MARKET SIGNALS:
Offers:
${(news?.offers || []).slice(0, 3).map((n: any) => `- ${n.title}: ${n.snippet}`).join("\n") || "None"}
Trending:
${(news?.trending || []).slice(0, 3).map((n: any) => `- ${n.title}: ${n.snippet}`).join("\n") || "None"}

ANALYSIS SIGNALS:
- Live inventory scorer: used for product scores, daily probabilities, stock actions, and candidate ranking.
- ${hfSignal.provider} ${hfSignal.model}: ${hfSignal.status}. ${hfSignal.note}

STRICT RULES:
1. Use ONLY product names that appear in REAL HIGH-DEMAND INVENTORY CANDIDATES.
2. Do not add market-suggestion products. All products must be inInventory true.
3. Preserve the exact dates, scores, stock counts, prices, primaryProduct, supportingProducts, and topProducts from BASE JSON unless improving wording.
4. Never write "No specific reason", "normal demand", or generic filler.
5. Each day must focus on that day's listed topProducts, not a single repeated product.
6. Return raw JSON only, with the same keys as BASE JSON.

BASE JSON TO PRESERVE AND ENRICH:
${baseJson}
${langInstruction}`;

    let aiAnalysis: any = null;
    const modelsUsed = ["Live inventory scorer"];
    if (hfSignal.status === "used") modelsUsed.push("External event relevance check");

    const groqResult = await callGroqAnalysis(prompt);
    if (groqResult.analysis) {
      aiAnalysis = groqResult.analysis;
      if (groqResult.model) modelsUsed.push("Business narrative generator");
    } else {
      const geminiResult = await callGeminiAnalysis(prompt);
      if (geminiResult.analysis) {
        aiAnalysis = geminiResult.analysis;
        if (geminiResult.model) modelsUsed.push("Business narrative generator");
      }
    }

    (fallback as any).analysisMeta = {
      ...fallback.analysisMeta,
      modelsUsed,
      modelSignals,
    };

    const analysis = normalizeAnalysis(aiAnalysis || {}, fallback);
    return Response.json({ analysis, generatedAt: new Date().toISOString() });
  } catch (err) {
    console.error("Demand analysis error:", err);
    return Response.json({ error: "Demand analysis service unavailable" }, { status: 500 });
  }
}
