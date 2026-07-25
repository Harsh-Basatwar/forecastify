type Signal = { title: string; snippet: string; link: string; imageUrl?: string };

async function fetchSerperImages(apiKey: string, query: string, count = 24) {
  try {
    const res = await fetch("https://google.serper.dev/images", {
      method: "POST",
      headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ q: query, gl: "in", hl: "en", num: count }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.images || [])
      .map((img: { imageUrl?: string; thumbnailUrl?: string; thumbnail?: string }) => img.imageUrl || img.thumbnailUrl || img.thumbnail)
      .filter(Boolean) as string[];
  } catch {
    return [];
  }
}

function attachImages(groups: Record<string, Signal[]>, images: string[]) {
  let idx = 0;
  Object.values(groups).forEach(items => {
    items.forEach(item => {
      if (!item.imageUrl && images.length) {
        item.imageUrl = images[idx % images.length];
        idx++;
      }
    });
  });
  return groups;
}

function fallbackSignals(storeCategory: string, location: string, weather?: { temp?: number; description?: string }) {
  const isHot = Number(weather?.temp || 0) >= 30;
  const isRain = /rain|drizzle|storm|cloud/i.test(weather?.description || "");
  const base = /grocery|supermarket|kirana|fmcg/i.test(storeCategory) ? "grocery store" : storeCategory;
  const suffix = location || "your area";
  const offers: Signal[] = [
    {
      title: `Local ${base} stock opportunity in ${suffix}`,
      snippet: `${isHot ? "Warm weather supports beverages, curd, lassi, water, ice cream, and quick snacks." : isRain ? "Cloudy or rainy weather supports tea, biscuits, instant mixes, and home-cooking essentials." : "Use current store inventory and local demand to promote fast-moving essentials."}`,
      link: "#",
    },
    {
      title: "FMCG distributor offers to verify today",
      snippet: "Check dairy, beverage, biscuit, snack, staple, and personal-care supplier schemes before placing the next purchase order.",
      link: "#",
    },
  ];
  const trending: Signal[] = [
    { title: "Demand-sensitive categories for today", snippet: `${isHot ? "Beverages, dairy drinks, water, and snacks should be reviewed first." : isRain ? "Tea, coffee, biscuits, instant food, spices, and staples should be reviewed first." : "Prioritize products with low stock, high daily demand, and nearby event relevance."}`, link: "#" },
    { title: "Retail owner action", snippet: "Compare current stock with reorder level, expiry dates, and blocked capital before increasing purchase quantity.", link: "#" },
  ];
  const events: Signal[] = [
    { title: "Upcoming local event check", snippet: `Review festivals, school cycles, salary-week shopping, and local market closures around ${suffix} for grocery demand impact.`, link: "#" },
  ];
  const categories = ["Dairy and beverages", "Biscuits and snacks", "Staples and grains", "Tea and breakfast", "Personal care", "Instant food"];
  for (const category of categories) {
    trending.push({
      title: `${category} watch for ${suffix}`,
      snippet: `Check ${category.toLowerCase()} inventory against current weather, reorder level, and near-term local demand before ordering.`,
      link: "#",
    });
    offers.push({
      title: `${category} supplier update`,
      snippet: `Ask distributors for current schemes, combo margins, and expiry terms before increasing ${category.toLowerCase()} stock.`,
      link: "#",
    });
    events.push({
      title: `${category} event impact`,
      snippet: `Map local events and weekly shopping behavior to ${category.toLowerCase()} so the store does not overbuy slow-moving stock.`,
      link: "#",
    });
  }
  return { offers, trending, events };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { storeCategory, city, state, weather, query } = body;

    if (!storeCategory) {
      return Response.json({ error: "storeCategory is required" }, { status: 400 });
    }

    const apiKey = process.env.SERPER_API_KEY;
    const location = [city, state, "India"].filter(Boolean).join(", ");
    const today = new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" });

    // Determine what kind of store this is for smarter queries
    const isGrocery = /grocery|supermarket|kirana|provision|fmcg|general store|departmental/i.test(storeCategory);
    const isMedical = /medical|pharmacy|chemist|health/i.test(storeCategory);
    const isFoodBev = /restaurant|cafe|food|bakery|dhaba/i.test(storeCategory);

    const categoryContext = isGrocery
      ? "grocery FMCG kirana retail"
      : isMedical
      ? "pharmacy medical store"
      : isFoodBev
      ? "food beverage restaurant"
      : storeCategory;

    // Specific queries — no tech/gadget results, only relevant store deals
    const queries = [
      // Real grocery/FMCG deals and offers running now in India
      `${query ? `${query} ` : ""}${categoryContext} wholesale discount offers deals ${location} ${today}`,
      // Trending FMCG / grocery products demand India right now
      `${query ? `${query} ` : ""}trending ${categoryContext} products high demand India ${today}`,
      // Upcoming local festivals and events relevant to shopping
      `${query ? `${query} ` : ""}upcoming festivals fairs mela events ${location} ${today} shopping demand`,
    ];

    if (!apiKey) {
      return Response.json(fallbackSignals(storeCategory, location, weather));
    }

    const imagePool = await fetchSerperImages(apiKey, `${query || categoryContext} grocery retail news offers products India`, 30);
    const results = await Promise.all(
      queries.map(async (q) => {
        const [res, queryImages] = await Promise.all([
          fetch("https://google.serper.dev/news", {
          method: "POST",
          headers: {
            "X-API-KEY": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ q, gl: "in", hl: "en", num: 10 }),
          }),
          fetchSerperImages(apiKey, q, 10),
        ]);

        if (!res.ok) {
          const errText = await res.text();
          console.error(`Serper API error for news: ${res.status} - ${errText}`);
          return [];
        }
        const data = await res.json();
        const images = [...(data.images || []).map((img: { imageUrl?: string; thumbnailUrl?: string; thumbnail?: string }) => img.imageUrl || img.thumbnailUrl || img.thumbnail).filter(Boolean), ...queryImages, ...imagePool];
        
        const itemsList = data.news || data.organic || [];
        return itemsList.map((item: { title: string; snippet: string; link: string; imageUrl?: string; thumbnailUrl?: string; thumbnail?: string }, index: number) => ({
          title: item.title,
          snippet: item.snippet,
          link: item.link,
          imageUrl: item.imageUrl || item.thumbnailUrl || item.thumbnail || images[index % Math.max(images.length, 1)],
        }));
      })
    );

    const payload = {
      offers: results[0] || [],
      trending: results[1] || [],
      events: results[2] || [],
    };

    return Response.json(attachImages(payload, imagePool));
  } catch (err) {
    console.error("News search error:", err);
    return Response.json({ error: "News service unavailable" }, { status: 500 });
  }
}
