import { explainWindow, groupGoodWindows, scoreForecastHours, getMowUrgency, getTopVerdict, } from "@/lib/mowScore";


export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get("lat");
    const lon = searchParams.get("lon");
    const lastMowed = searchParams.get("lastMowed");

    if (!lat || !lon) {
      return Response.json({ error: "Missing lat or lon" }, { status: 400 });
    }

    const hourlyVars = [
      "temperature_2m",
      "precipitation",
      "precipitation_probability",
      "relative_humidity_2m",
      "wind_speed_10m",
    ].join(",");

    const weatherUrl =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat}` +
      `&longitude=${lon}` +
      `&hourly=${hourlyVars}` +
      `&forecast_days=7` +
      `&past_days=2` +
      `&timezone=auto`;

    const weatherRes = await fetch(weatherUrl, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!weatherRes.ok) {
      throw new Error("Weather fetch failed");
    }

    const weatherData = await weatherRes.json();
    
    
    function getDaysSinceMowed(lastMowed) {
      if (!lastMowed) return null;
    
      const last = new Date(lastMowed);
      const now = new Date();
    
      return Math.floor((now - last) / (1000 * 60 * 60 * 24));
    }
    
    const daysSinceMowed = getDaysSinceMowed(lastMowed);

    const scored = scoreForecastHours(weatherData.hourly);
    const windows = groupGoodWindows(scored, 70, daysSinceMowed);

    return Response.json({
  latitude: weatherData.latitude,
  longitude: weatherData.longitude,
  timezone: weatherData.timezone,
  windows: windows.slice(0, 5),
  bestReason: "Best option: " + explainWindow(windows[0]),
  backupReason: "Backup: " + explainWindow(windows[1]),
  urgency: getMowUrgency(scored, windows),
  verdict: getTopVerdict(windows),
  scoredPreview: scored.slice(0, 24),
});
  } catch (error) {
    return Response.json(
      { error: error.message || "Unknown error" },
      { status: 500 }
    );
  }
}
