"use server";

export async function getWeatherAction(query?: string, lat?: number, lon?: number) {
	const apiKey = process.env.WEATHER_API_KEY;
	if (!apiKey) {
		console.warn("[Weather API] WEATHER_API_KEY is not configured.");
		return { success: false, error: "API key not configured" };
	}

	try {
		let url = "";
		if (lat !== undefined && lon !== undefined) {
			url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
		} else {
			// Clean query and extract city
			let city = "New York";
			if (query) {
				const cleaned = query.toLowerCase().trim();
				// Basic extraction e.g. "weather in london" -> "london"
				const match = cleaned.match(/(?:weather|forecast|temperature|humidity)(?:\s+(?:in|for|at))?\s+([a-z\s\u0080-\uF8FF]+)/i);
				if (match && match[1].trim()) {
					city = match[1].trim();
				} else {
					// Fallback: search for words and use the last non-weather word as city
					const words = cleaned.split(/\s+/).filter(w => !["weather", "forecast", "check", "the", "in", "for", "at", "current", "conditions", "now"].includes(w));
					if (words.length > 0) {
						city = words[words.length - 1];
					}
				}
			}
			url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;
		}

		console.log(`[Weather API] Fetching: ${url.replace(apiKey, "HIDDEN")}`);
		const response = await fetch(url, { next: { revalidate: 60 } }); // Cache response for 60 seconds
		if (!response.ok) {
			let errorMsg = `HTTP Error ${response.status}`;
			try {
				const errData = await response.json();
				if (errData && errData.message) {
					errorMsg = errData.message;
				}
			} catch {}
			return { success: false, error: errorMsg };
		}

		const data = await response.json();
		return {
			success: true,
			location: data.name,
			tempC: Math.round(data.main.temp),
			tempF: Math.round((data.main.temp * 9) / 5 + 32),
			condition: data.weather[0]?.main || "Unknown",
			description: data.weather[0]?.description || "No description",
			humidity: data.main.humidity,
			windSpeed: data.wind?.speed || 0,
		};
	} catch (error: any) {
		console.error("[Weather API] Error fetching weather data:", error);
		return { success: false, error: error?.message || "Failed to fetch weather data" };
	}
}
