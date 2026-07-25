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

function fallbackPromos(query: string) {
  const context = query.replace(/\s+/g, " ").trim() || "grocery store";
  const offers: Signal[] = [
    {
      title: "Supplier scheme check for fast-moving grocery items",
      snippet: `Use ${context} to prioritize beverage, dairy, biscuits, snacks, staples, and household supplier schemes before purchase ordering.`,
      link: "#",
    },
    {
      title: "Weather-aware bundle promotion",
      snippet: "Create bundles based on current weather: beverages and dairy for warm days, tea and biscuits for rainy or cloudy days.",
      link: "#",
    },
    {
      title: "Low-stock promotion guard",
      snippet: "Avoid promoting products below reorder level; promote overstock or near-expiry items with controlled discounts.",
      link: "#",
    },
  ];
  const promotions: Signal[] = [
    { title: "Festival basket promotion", snippet: "Prepare small baskets around snacks, sweets, staples, pooja essentials, and beverages when local events are near.", link: "#" },
    { title: "Checkout add-on campaign", snippet: "Place impulse packs such as biscuits, chocolate, mouth fresheners, and small beverages near billing.", link: "#" },
  ];
  const news: Signal[] = [
    { title: "Local demand watch", snippet: "Refresh promotions after checking local events, weather, stockout risk, and slow-moving inventory.", link: "#" },
  ];
  const categories = ["Dairy beverages", "Biscuits snacks", "Staples grains", "Tea breakfast", "Instant food", "Personal care", "Household care"];
  for (const category of categories) {
    offers.push({
      title: `${category} margin offer plan`,
      snippet: `Use ${context} to check distributor discounts, expiry terms, and reorder pressure before promoting ${category.toLowerCase()}.`,
      link: "#",
    });
    promotions.push({
      title: `${category} customer bundle`,
      snippet: `Create one visible shelf bundle for ${category.toLowerCase()} and pair it with a fast-moving add-on product.`,
      link: "#",
    });
    news.push({
      title: `${category} market signal`,
      snippet: `Review whether weather, local events, and current stock make ${category.toLowerCase()} worth promoting this week.`,
      link: "#",
    });
  }
  return { offers, promotions, news };
}

export async function POST(request: Request) {
  try {
    const { query } = await request.json();

    if (!query || typeof query !== "string") {
      return Response.json({ error: "query is required" }, { status: 400 });
    }

    const apiKey = process.env.SERPER_API_KEY;
    if (!apiKey) {
      return Response.json(fallbackPromos(query));
    }
    const imagePool = await fetchSerperImages(apiKey, `${query} grocery FMCG offers deals products India`, 30);

    const searches = [
      { q: `${query} offers deals discounts India 2026`, label: "offers" },
      { q: `${query} brand promotions advertisements India`, label: "promotions" },
      { q: `${query} market trends demand news India`, label: "news" },
    ];

    const results = await Promise.all(
      searches.map(async ({ q, label }) => {
        const [res, queryImages] = await Promise.all([
          fetch("https://google.serper.dev/search", {
          method: "POST",
          headers: {
            "X-API-KEY": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ q, gl: "in", num: 10 }),
          }),
          fetchSerperImages(apiKey, q, 10),
        ]);

        if (!res.ok) {
          const errText = await res.text();
          console.error(`Serper API error for promos: ${res.status} - ${errText}`);
          return { label, items: [] };
        }
        const data = await res.json();
        const images = [...(data.images || []).map((img: { imageUrl?: string; thumbnailUrl?: string; thumbnail?: string }) => img.imageUrl || img.thumbnailUrl || img.thumbnail).filter(Boolean), ...queryImages, ...imagePool];
        const itemsList = data.news || data.organic || [];
        const items = itemsList.slice(0, 10).map(
          (item: { title: string; snippet: string; link: string; imageUrl?: string; thumbnailUrl?: string; thumbnail?: string }, index: number) => ({
            title: item.title,
            snippet: item.snippet,
            link: item.link,
            imageUrl: item.imageUrl || item.thumbnailUrl || item.thumbnail || images[index % Math.max(images.length, 1)],
          })
        );
        return { label, items };
      })
    );

    const mapped: Record<string, Signal[]> = {};
    for (const r of results) mapped[r.label] = r.items;

    return Response.json(mapped);
  } catch (err) {
    console.error("Search promos error:", err);
    return Response.json({ error: "Search service unavailable" }, { status: 500 });
  }
}
