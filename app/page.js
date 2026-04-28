"use client";

import { useState } from "react";
import styles from "./page.module.css";

function formatSmartDate(iso) {
  const date = new Date(iso);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  const isToday = date.toDateString() === today.toDateString();
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  const time = date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  if (isToday) return `Today · ${time}`;
  if (isTomorrow) return `Tomorrow · ${time}`;

  return date.toLocaleString([], {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function buildVerdict(daysSince, best) {
  if (!best) {
    return "No strong mowing window found this week.";
  }

  const bestDate = new Date(best.start);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  const isToday = bestDate.toDateString() === today.toDateString();
  const isTomorrow = bestDate.toDateString() === tomorrow.toDateString();

  const bestDayLabel = isToday
    ? "today"
    : isTomorrow
      ? "tomorrow"
      : bestDate.toLocaleDateString([], { weekday: "long" });

  if (daysSince === null) {
    return (
      <>
      The best upcoming mowing conditions arrive{" "} <strong>{bestDayLabel}.</strong>
      </>
    );
  }

  if (daysSince <= 2) {
    return (
      <>
      You probably do not need to mow yet, but{" "} 
      <strong>{bestDayLabel} offers the best upcoming conditions.</strong>
      </>
    );
  }

  if (daysSince <= 5) {
    return (
      <>
     You will likely need to mow soon, and{" "} <strong>{bestDayLabel} gives you a good opportunity.</strong> 
      </>
    );
  }

  return (
    <>
    Your lawn is likely overdue, so{" "} <strong>taking advantage of {bestDayLabel}'s conditions is a good idea.</strong>
    </>
  ); 
}

function buildWhyNotToday(daysSince, best) {
  if (!best) return null;

  const bestDate = new Date(best.start);
  const today = new Date();
  const isToday = bestDate.toDateString() === today.toDateString();

  if (isToday) return null;

  if (daysSince !== null && daysSince <= 2) {
    return "It is probably too soon since your last mow, so a later window makes more sense.";
  }

  if (daysSince !== null && daysSince <= 5) {
    return "You may need to mow soon, but the best conditions are not until later.";
  }

  return "Today is usable, but better mowing conditions arrive later.";
}

function formatWindowRange(window) {
  if (!window) return "";

  const start = formatSmartDate(window.start);
  const end = new Date(window.end).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  return `${start} – ${end}`;
}

function buildMainRecommendation(daysSince, best) {
  if (!best) return null;

  const windowText = formatWindowRange(best);

  if (daysSince === null) {
    return {
      main: (
        <>
          The best upcoming mowing window is{" "}
          <strong>{windowText}</strong>.
        </>
      ),
      why: "This window has the best balance of dryness, rain risk, and mowing conditions.",
    };
  }

  if (daysSince <= 2) {
    return {
      main: (
        <>
          You probably do not need to mow yet. Wait until{" "}
          <strong>{windowText}</strong> for the best conditions.
        </>
      ),
      why: "It is probably too soon since your last mow, so a later window makes more sense.",
    };
  }

  if (daysSince <= 5) {
    return {
      main: (
        <>
          You may need to mow soon.{" "}
          <strong>{windowText}</strong> gives you the best balance of timing and conditions.
        </>
      ),
      why: "Sooner windows are being considered, but this one looks like the best overall opportunity.",
    };
  }

  return {
    main: (
      <>
        Your lawn is likely overdue. Try to mow during{" "}
        <strong>{windowText}</strong>.
      </>
    ),
    why: "Because it has been a while since your last mow, earlier usable windows are being prioritized.",
  };
}

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [placeName, setPlaceName] = useState("");
  const [error, setError] = useState("");
  const [locationLoading, setLocationLoading] = useState(false);
  const [isUsingCurrentLocation, setIsUsingCurrentLocation] = useState(false);
  const [lastMowed, setLastMowed] = useState("");
  const [searchRange, setSearchRange] = useState("5days");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState(null);

  function resetApp() {
    setQuery("");
    setResult(null);
    setPlaceName("");
    setError("");
    setIsUsingCurrentLocation(false);
    setLastMowed("");
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedPlace(null);
  }

  function getDaysSinceMowed() {
    if (!lastMowed) return null;

    const last = new Date(lastMowed);
    const now = new Date();

    const diff = now - last;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  const daysSince = getDaysSinceMowed();
  const best = result?.windows?.[0];
  const backup = result?.windows?.[1];
  const recommendation = buildMainRecommendation(daysSince, best);

  async function getCurrentLocation() {
    if (!navigator.geolocation) {
      setError("Your browser does not support location access.");
      return;
    }

    setLocationLoading(false);
    setError("");
    setResult(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;

          setIsUsingCurrentLocation(true);
          setQuery("");
          setPlaceName("Using your current location");

          const mowRes = await fetch(
            `/api/mow?lat=${lat}&lon=${lon}&lastMowed=${lastMowed}&searchRange=${searchRange}`
          );

          if (!mowRes.ok) {
            const text = await mowRes.text();
            throw new Error(`API error: ${text}`);
          }

          const mowData = await mowRes.json();
          setResult(mowData);
        } catch (err) {
          console.error("Location fetch error:", err);
          setError(err.message || "Unable to use your current location.");
        } finally {
          setLocationLoading(false);
        }
      },
      (geoError) => {
        if (geoError.code === 1) {
          setError("Location access was denied.");
        } else if (geoError.code === 2) {
          setError("Location is unavailable.");
        } else if (geoError.code === 3) {
          setError("Location request timed out.");
        } else {
          setError("Could not get your location.");
        }
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }

  async function fetchSuggestions(value) {
    if (value.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
  
    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(value)}&count=5&language=en&format=json&country=US`
      );
  
      const data = await res.json();

const filtered = (data.results || []).filter(
  (place) => place.country_code === "US"
);

setSuggestions(filtered);
setShowSuggestions(true);
    } catch {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
  
    try {
      let place = selectedPlace;
  
      if (!place) {
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          query
        )}&count=1&language=en&format=json`;
  
        const geoRes = await fetch(geoUrl);
        const geoData = await geoRes.json();
  
        if (!geoData.results || geoData.results.length === 0) {
          throw new Error("Couldn't find that location. Try another city or ZIP.");
        }
  
        place = geoData.results[0];
      }
  
      setPlaceName(
        `${place.name}${place.admin1 ? ", " + place.admin1 : ""}`
      );
  
      const mowRes = await fetch(
        `/api/mow?lat=${place.latitude}&lon=${place.longitude}&lastMowed=${lastMowed}&searchRange=${searchRange}`
      );
  
      const mowData = await mowRes.json();
  
      if (!mowRes.ok) {
        throw new Error(mowData.error || "Failed to get mowing forecast");
      }
  
      setResult(mowData);
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <div className={styles.cardShell}>
          <h1 className={styles.title}>🌱 MowTime</h1>
          <p className={styles.subtitle}>
  Find the best next mowing window based on weather and your last cut.
</p>

          
          <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputWrapper}>
  <input
    value={query}
    placeholder={
      isUsingCurrentLocation
        ? "Using current location - type to change"
        : "Enter city or ZIP (e.g. Fort Wayne)"
    }
    onChange={(e) => {
      const value = e.target.value;
      setQuery(value);
      setSelectedPlace(null);
      setIsUsingCurrentLocation(false);
      fetchSuggestions(value);
    }}
    className={styles.input}
  />

  {query && (
    <button
      type="button"
      className={styles.clearButton}
      onClick={resetApp}
      aria-label="Clear location"
    >
      ×
    </button>
  )}
</div>

{showSuggestions && suggestions.length > 0 && (
  <div className={styles.suggestionsBox}>
    {suggestions.map((place) => (
      <button
        key={place.id}
        type="button"
        className={styles.suggestionItem}
        onClick={() => {
          const label = `${place.name}${place.admin1 ? ", " + place.admin1 : ""}`;
        
          setQuery(label);
          setPlaceName(label);
          setSelectedPlace(place);
          setSuggestions([]);
          setShowSuggestions(false);
        }}
      >
        {place.name}
{place.admin1 ? `, ${place.admin1}` : ""}
      </button>
    ))}
  </div>
)}

            <button
              type="submit"
              className={styles.button}
              disabled={loading || locationLoading}
            >
              {loading ? "Checking..." : "Find my mow time"}
            </button>

            <button
              type="button"
              className={styles.secondaryButton}
              onClick={getCurrentLocation}
              disabled={loading || locationLoading}
            >
              {locationLoading ? "Locating..." : "Use my location"}
            </button>

            <div className={styles.inputGroup}>
  <label className={styles.label}>
    Last time you mowed (optional)
  </label>
  <input
    type="date"
    value={lastMowed}
    onChange={(e) => setLastMowed(e.target.value)}
    className={styles.input}
  />
  <p className={styles.helper}>
    Helps us personalize your mowing recommendation
  </p>
</div>
<div className={styles.inputGroup}>
  <label className={styles.label}>Looking for the best weather in</label>
  <select
    value={searchRange}
    onChange={(e) => setSearchRange(e.target.value)}
    className={styles.input}
  >
    <option value="2days">Next 2 days</option>
    <option value="5days">Next 5 days</option>
    <option value="7days">Next 7 days</option>
    <option value="weekend">This weekend</option>
  </select>
</div>
          </form>

          {!result && (
  <p className={styles.helperIntro}>
    Enter a city or use your current location to get started.
  </p>
)}

{!result && !error && (
  <section className={styles.infoCard}>
    <h3 className={styles.sectionTitleList}>How it works</h3>
    <p className={styles.reason}>
      MowTime considers recent rain, upcoming weather, and your last mow date to
      recommend the most sensible next mowing window.
    </p>
    <a href="/how-it-works" className={styles.smallLink}>
  How is the score calculated?
</a>
  </section>
)}
          {error && <div className={styles.error}>{error}</div>}

          {placeName && (
  <p className={styles.location}>
    <strong>Location:</strong>{" "}
    {isUsingCurrentLocation ? "Using your current location" : placeName}
  </p>
)}

          {result && (
            <button
              className={styles.resetButton}
              onClick={resetApp}
              >
                New search
              </button>
          )}

{result?.fallbackMessage && (
  <section className={styles.alertCard}>
    <h3 className={styles.alertTitle}>Search expanded</h3>
    <p className={styles.alertText}>{result.fallbackMessage}</p>
  </section>
)}

{recommendation && (
  <section className={styles.verdictCard}>
    <h3 className={styles.sectionTitleList}>What should you do?</h3>
    <p className={styles.reason}>{recommendation.main}</p>
    <p className={styles.smallReason}>
      <strong>Why:</strong> {recommendation.why}
    </p>
  </section>
)}     
          {daysSince === null && result?.urgency && (
            <section className={styles.urgencyCard}>
              <h3 className={styles.sectionTitleList}>Should you mow soon?</h3>
              <p className={styles.reason}>{result.urgency}</p>
            </section>
          )}

          {best && (
            <section className={styles.sectionBest}>
              <h2 className={styles.sectionTitleBest}>Why this window works</h2>
              <p>
                <strong>{formatSmartDate(best.start)}</strong> –{" "}
                <strong>
                  {new Date(best.end).toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </strong>
              </p>
              <p className={styles.scoreLine}>
                Average mow score: <strong>{best.avgScore}</strong>
              </p>
              <p className={styles.reason}>{result?.bestReason}</p>
            </section>
          )}

          {backup && (
            <section className={styles.sectionBackup}>
              <h2 className={styles.sectionTitleBackup}>If you want to mow sooner</h2>
              <p>
                <strong>{formatSmartDate(backup.start)}</strong> –{" "}
                <strong>
                  {new Date(backup.end).toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </strong>
              </p>
              <p className={styles.scoreLine}>
                Average mow score: <strong>{backup.avgScore}</strong>
              </p>
              <p className={styles.reason}>{result?.backupReason}</p>
            </section>
          )}

          {result?.windows?.length > 0 && (
            <section className={styles.sectionList}>
              <h3 className={styles.sectionTitleList}>Top windows</h3>
              <ul className={styles.list}>
                {result.windows.map((window, index) => (
                  <li key={index} className={styles.listItem}>
                    {formatSmartDate(window.start)} –{" "}
                    {new Date(window.end).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    })}{" "}
                    ({window.avgScore})
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}