export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");
  const address = searchParams.get("address");

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  const fallbackLocation = () => {
    const addressText = (address || "").toLowerCase();
    const knownCities: Record<string, { city: string; state: string; pincode: string; area: string; lat: number; lon: number }> = {
      pune: { city: "Pune", state: "Maharashtra", pincode: "411005", area: "Shivajinagar", lat: 18.5204, lon: 73.8567 },
      jalgaon: { city: "Jalgaon", state: "Maharashtra", pincode: "425001", area: "Shivaji Nagar", lat: 21.0077, lon: 75.5626 },
      mumbai: { city: "Mumbai", state: "Maharashtra", pincode: "400001", area: "Fort", lat: 19.076, lon: 72.8777 },
      delhi: { city: "Delhi", state: "Delhi", pincode: "110001", area: "Central Delhi", lat: 28.6139, lon: 77.209 },
      bengaluru: { city: "Bengaluru", state: "Karnataka", pincode: "560001", area: "Central Bengaluru", lat: 12.9716, lon: 77.5946 },
      bangalore: { city: "Bengaluru", state: "Karnataka", pincode: "560001", area: "Central Bengaluru", lat: 12.9716, lon: 77.5946 },
      chennai: { city: "Chennai", state: "Tamil Nadu", pincode: "600001", area: "Central Chennai", lat: 13.0827, lon: 80.2707 },
      hyderabad: { city: "Hyderabad", state: "Telangana", pincode: "500001", area: "Central Hyderabad", lat: 17.385, lon: 78.4867 },
      kolkata: { city: "Kolkata", state: "West Bengal", pincode: "700001", area: "Central Kolkata", lat: 22.5726, lon: 88.3639 },
      ahmedabad: { city: "Ahmedabad", state: "Gujarat", pincode: "380001", area: "Central Ahmedabad", lat: 23.0225, lon: 72.5714 },
      jaipur: { city: "Jaipur", state: "Rajasthan", pincode: "302001", area: "Central Jaipur", lat: 26.9124, lon: 75.7873 },
      lucknow: { city: "Lucknow", state: "Uttar Pradesh", pincode: "226001", area: "Central Lucknow", lat: 26.8467, lon: 80.9462 },
    };
    const matched = Object.entries(knownCities).find(([key]) => addressText.includes(key))?.[1] || knownCities.pune;

    return {
      formattedAddress: address || `${matched.city}, ${matched.state}, India`,
      city: matched.city,
      state: matched.state,
      country: "India",
      pincode: matched.pincode,
      area: matched.area,
      lat: lat || matched.lat,
      lon: lon || matched.lon,
      isFallback: true,
    };
  };

  try {
    if (!apiKey) {
      return Response.json(fallbackLocation());
    }

    let url: string;

    if (address) {
      // Forward geocode: address → coordinates
      url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&components=country:IN&region=in&key=${apiKey}`;
    } else if (lat && lon) {
      // Reverse geocode: coordinates → address
      url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&result_type=street_address|route|sublocality|locality&key=${apiKey}`;
    } else {
      return Response.json({ error: "Provide either 'address' or 'lat' and 'lon'" }, { status: 400 });
    }

    const res = await fetch(url);

    if (!res.ok) {
      return Response.json({ error: "Geocoding failed" }, { status: 502 });
    }

    const data = await res.json();

    if (data.status !== "OK" || !data.results?.length) {
      return Response.json(fallbackLocation());
    }

    const result = data.results[0];
    const components = result.address_components || [];
    const geo = result.geometry?.location;

    const getComponent = (type: string) =>
      components.find((c: { types: string[] }) => c.types.includes(type))?.long_name || "";

    return Response.json({
      formattedAddress: result.formatted_address,
      city: getComponent("locality") || getComponent("postal_town") || getComponent("administrative_area_level_3") || getComponent("administrative_area_level_2"),
      state: getComponent("administrative_area_level_1"),
      country: getComponent("country"),
      pincode: getComponent("postal_code"),
      area: getComponent("sublocality_level_1") || getComponent("sublocality_level_2") || getComponent("sublocality") || getComponent("route"),
      lat: geo?.lat || null,
      lon: geo?.lng || null,
    });
  } catch (err) {
    console.error("Location API error:", err);
    return Response.json({ error: "Location service unavailable" }, { status: 500 });
  }
}
