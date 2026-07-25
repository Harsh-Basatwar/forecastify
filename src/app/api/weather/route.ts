export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");
  const displayCity = searchParams.get("city");

  if (!lat || !lon) {
    return Response.json({ error: "lat and lon are required" }, { status: 400 });
  }

  const apiKey = process.env.OPENWEATHER_API_KEY;

  try {
    // Fetch current weather + 7-day forecast
    const [currentRes, forecastRes] = await Promise.all([
      fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`
      ),
      fetch(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&cnt=56&appid=${apiKey}`
      ),
    ]);

    if (!currentRes.ok || !forecastRes.ok) {
      console.warn("OpenWeather API responded with error code:", currentRes.status, forecastRes.status);
      throw new Error(`OpenWeather API returned error: current=${currentRes.status}, forecast=${forecastRes.status}`);
    }

    const current = await currentRes.json();
    const forecast = await forecastRes.json();

    // Group forecast by day
    const dailyForecast: Record<string, { temps: number[]; weather: string[]; humidity: number[] }> = {};
    for (const item of forecast.list) {
      const date = item.dt_txt.split(" ")[0];
      if (!dailyForecast[date]) {
        dailyForecast[date] = { temps: [], weather: [], humidity: [] };
      }
      dailyForecast[date].temps.push(item.main.temp);
      dailyForecast[date].weather.push(item.weather[0].main);
      dailyForecast[date].humidity.push(item.main.humidity);
    }

    const days = Object.entries(dailyForecast).slice(0, 7).map(([date, data]) => ({
      date,
      avgTemp: Math.round(data.temps.reduce((a, b) => a + b, 0) / data.temps.length),
      maxTemp: Math.round(Math.max(...data.temps)),
      minTemp: Math.round(Math.min(...data.temps)),
      avgHumidity: Math.round(data.humidity.reduce((a, b) => a + b, 0) / data.humidity.length),
      weather: data.weather.sort((a, b) =>
        data.weather.filter((v) => v === b).length - data.weather.filter((v) => v === a).length
      )[0],
    }));

    return Response.json({
      current: {
        temp: Math.round(current.main.temp),
        feelsLike: Math.round(current.main.feels_like),
        humidity: current.main.humidity,
        weather: current.weather[0].main,
        description: current.weather[0].description,
        windSpeed: current.wind.speed,
        city: displayCity || current.name,
      },
      forecast: days,
    });
  } catch (err) {
    console.error("Weather API error, returning fallback weather details:", err);
    
    // Fallback data in case OpenWeather API is down or key is unauthorized
    const todayStr = new Date().toISOString().split("T")[0];
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      days.push({
        date: d.toISOString().split("T")[0],
        avgTemp: 32 - i % 3,
        maxTemp: 35 - i % 2,
        minTemp: 25,
        avgHumidity: 65 + i * 2,
        weather: i % 3 === 0 ? "Rain" : i % 2 === 0 ? "Clouds" : "Clear",
      });
    }
    
    return Response.json({
      current: {
        temp: 32,
        feelsLike: 35,
        humidity: 62,
        weather: "Clouds",
        description: "partly cloudy",
        windSpeed: 4.2,
        city: displayCity || "Local Store Area",
      },
      forecast: days,
      isFallback: true
    });
  }
}
