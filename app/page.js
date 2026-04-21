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
      The best upcoming mowing conditions arrive{" "} <strong>${bestDayLabel}.</strong>
      </>
    );
  }

  if (daysSince <= 2) {
    return (
      <>
      You probably do not need to mow yet, but{" "} 
      <strong>${bestDayLabel} offers the best upcoming conditions.</strong>
      </>
    );
  }

  if (daysSince <= 5) {
    return (
      <>
     You will likely need to mow soon, and{" "} <strong>${bestDayLabel} gives you a good opportunity.</strong> 
      </>
    );
  }

  return (
    <>
    Your lawn is likely overdue, so{" "} <strong>taking advantage of ${bestDayLabel}'s conditions is a good idea.</strong>
    </>
  ); 
}

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [placeName, setPlaceName] = useState("");
  const [error, setError] = useState("");
  const [locationLoading, setLocationLoading] = useState(false);
  const [lastMowed, setLastMowed] = useState("");

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
  const verdict = buildVerdict(daysSince, best);

  async function getCurrentLocation() {
    if (!navigator.geolocation) {
      setError("Your browser does not support location access.");
      return;
    }

    setLocationLoading(true);
    setError("");
    setResult(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;

          setQuery("Current location");
          setPlaceName(`Lat ${lat.toFixed(2)}, Lon ${lon.toFixed(2)}`);

          const mowRes = await fetch(
            `/api/mow?lat=${lat}&lon=${lon}&lastMowed=${lastMowed}`
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

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        query
      )}&count=1&language=en&format=json`;

      const geoRes = await fetch(geoUrl);
      const geoData = await geoRes.json();

      if (!geoData.results || geoData.results.length === 0) {
        throw new Error("Couldn't find that location. Try another city or ZIP.");
      }

      const place = geoData.results[0];
      setPlaceName(
        `${place.name}${place.admin1 ? ", " + place.admin1 : ""}${
          place.country ? ", " + place.country : ""
        }`
      );

      const mowRes = await fetch(
        `/api/mow?lat=${place.latitude}&lon=${place.longitude}&lastMowed=${lastMowed}`
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
            Find the best upcoming time to mow your lawn
          </p>

          <form onSubmit={handleSubmit} className={styles.form}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter city or ZIP (e.g. Fort Wayne)"
              className={styles.input}
            />

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
          </form>

          {error && <div className={styles.error}>{error}</div>}

          {placeName && (
            <p className={styles.location}>
              <strong>Location:</strong> {placeName}
            </p>
          )}

          {best && (
            <section className={styles.verdictCard}>
              <h3 className={styles.sectionTitleList}>What should you do?</h3>
              <p className={styles.reason}>{verdict}</p>
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
              <h2 className={styles.sectionTitleBest}>Recommended window</h2>
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
              <h2 className={styles.sectionTitleBackup}>Alternative window</h2>
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