function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function hourFromIso(isoString) {
  return new Date(isoString).getHours();
}

function sumRange(arr, start, end) {
  let total = 0;
  for (let i = start; i <= end && i < arr.length; i++) {
    if (i >= 0) total += arr[i] ?? 0;
  }
  return total;
}

function getTempBonus(temp) {
  if (temp >= 60 && temp <= 78) return 8;
  if (temp >= 52 && temp < 60) return 3;
  if (temp > 78 && temp <= 85) return 2;
  if (temp < 45) return -8;
  return 0;
}

function getWindPenalty(wind) {
  if (wind > 20) return 15;
  if (wind > 15) return 8;
  if (wind > 10) return 3;
  return 0;
}

function getHumidityPenalty(humidity) {
  if (humidity >= 95) return 12;
  if (humidity >= 90) return 8;
  if (humidity >= 80) return 4;
  return 0;
}

function getAfternoonBonus(hour) {
  if (hour >= 13 && hour <= 18) return 10;
  if (hour >= 11 && hour <= 12) return 5;
  return 0;
}

function getWetnessIndex(rainLast24, rainLast48, humidity, hour) {
  let wetness = 0;

  if (rainLast24 > 6) wetness += 35;
  else if (rainLast24 > 3) wetness += 22;
  else if (rainLast24 > 1) wetness += 10;

  if (rainLast48 > 10) wetness += 18;
  else if (rainLast48 > 6) wetness += 10;

  if (humidity >= 95) wetness += 15;
  else if (humidity >= 90) wetness += 10;
  else if (humidity >= 80) wetness += 5;

  if (hour < 9) wetness += 12;
  if (hour >= 10 && hour <= 17) wetness -= 6;

  return clamp(wetness, 0, 100);
}

function getGrowthPressure(rainLast72, avgTemp) {
  let pressure = 0;

  if (rainLast72 > 12) pressure += 30;
  else if (rainLast72 > 8) pressure += 20;
  else if (rainLast72 > 4) pressure += 10;

  if (avgTemp >= 75) pressure += 20;
  else if (avgTemp >= 65) pressure += 12;
  else if (avgTemp >= 55) pressure += 6;

  return clamp(pressure, 0, 100);
}

export function scoreForecastHours(hourly) {
  const results = [];

  const {
    time,
    temperature_2m,
    precipitation,
    relative_humidity_2m,
    wind_speed_10m,
    precipitation_probability,
  } = hourly;

  for (let i = 0; i < time.length; i++) {
    let score = 100;
    const hour = hourFromIso(time[i]);

    const rainLast24 = sumRange(precipitation, i - 24, i - 1);
    const rainLast48 = sumRange(precipitation, i - 48, i - 1);
    const rainLast72 = sumRange(precipitation, i - 72, i - 1);
    const rainNext6 = sumRange(precipitation, i, i + 6);
    
    const pop = precipitation_probability?.[i] ?? 0;
    const temp = temperature_2m[i];
    const humidity = relative_humidity_2m[i];
    const wind = wind_speed_10m[i];

    const wetness = getWetnessIndex(rainLast24, rainLast48, humidity, hour)
    const growthPressure = getGrowthPressure(rainLast72, temp);


    if (rainLast24 > 4) score -= 30;
    else if (rainLast24 > 2) score -= 18;
    else if (rainLast24 > 0.5) score -= 8;

    if (rainLast48 > 8) score -= 15;
    else if (rainLast48 > 4) score -= 8;

    if (rainNext6 > 3) score -= 28;
    else if (rainNext6 > 1) score -= 16;
    else if (rainNext6 > 0.2) score -= 6;

    if (pop >= 80) score -= 20;
    else if (pop >= 60) score -= 12;
    else if (pop >= 40) score -= 6;

    score += getTempBonus(temp);
    score -= getWindPenalty(wind);
    score -= getHumidityPenalty(humidity);
    score += getAfternoonBonus(hour);

    if (hour < 9) score -= 12;
    if (hour > 19) score -= 6;

    score -= Math.round(wetness * 0.35);

    if (growthPressure >= 35 && score >= 65) {
      score += 4;
    }
    score = clamp(score, 5, 95);

    results.push({
      time: time[i],
      hour,
      score,
      rainLast24,
      rainNext6,
      temp,
      humidity,
      wind,
      pop,
      wetness,
      growthPressure,
      rainLast72,
    });
  }

  return results;
}

export function groupGoodWindows(scoredHours, minScore = 70) {
  const now = new Date();

  const candidateHours = scoredHours.filter((item) => {
    const itemDate = new Date(item.time);
    const hour = itemDate.getHours();

    return (
      itemDate > now &&
      item.score >= minScore &&
      hour >= 10 &&
      hour <= 19
    );
  });

  const windows = [];
  let current = null;

  for (let i = 0; i < candidateHours.length; i++) {
    const item = candidateHours[i];
    const itemDate = new Date(item.time);
    const prev = candidateHours[i - 1];
    const prevDate = prev ? new Date(prev.time) : null;

    const isConsecutive =
      prev &&
      itemDate.getTime() - prevDate.getTime() === 60 * 60 * 1000 &&
      itemDate.toDateString() === prevDate.toDateString();

    if (!current) {
      current = {
        start: item.time,
        end: item.time,
        hours: [item],
      };
    } else if (isConsecutive) {
      current.end = item.time;
      current.hours.push(item);
    } else {
      windows.push(current);
      current = {
        start: item.time,
        end: item.time,
        hours: [item],
      };
    }
  }

  if (current) windows.push(current);

  return windows
    .map((window) => {
      const maxHours = 4;

      if (window.hours.length <= maxHours) {
        const avgScore =
          window.hours.reduce((sum, h) => sum + h.score, 0) / window.hours.length;

        return {
          start: window.hours[0].time,
          end: window.hours[window.hours.length - 1].time,
          hours: window.hours,
          avgScore: Math.round(avgScore),
        };
      }

      let bestSlice = window.hours.slice(0, maxHours);
      let bestAvg =
        bestSlice.reduce((sum, h) => sum + h.score, 0) / bestSlice.length;

      for (let i = 1; i <= window.hours.length - maxHours; i++) {
        const slice = window.hours.slice(i, i + maxHours);
        const avg =
          slice.reduce((sum, h) => sum + h.score, 0) / slice.length;

        if (avg > bestAvg) {
          bestAvg = avg;
          bestSlice = slice;
        }
      }

      return {
        start: bestSlice[0].time,
        end: bestSlice[bestSlice.length - 1].time,
        hours: bestSlice,
        avgScore: Math.round(bestAvg),
      };
    })
    .filter((w) => w.hours.length >= 2)
    .sort((a, b) => b.avgScore - a.avgScore);
}

export function explainWindow(window) {
  if (!window || !window.hours || window.hours.length === 0) {
    return "No strong mowing window found this week.";
  }

  const avgHumidity =
    window.hours.reduce((sum, h) => sum + (h.humidity || 0), 0) /
    window.hours.length;

  const avgWind =
    window.hours.reduce((sum, h) => sum + (h.wind || 0), 0) /
    window.hours.length;

  const avgWetness =
    window.hours.reduce((sum, h) => sum + (h.wetness || 0), 0) /
    window.hours.length;

  const avgGrowth =
    window.hours.reduce((sum, h) => sum + (h.growthPressure || 0), 0) /
    window.hours.length;

  const rainSoon = window.hours.some((h) => h.rainNext6 > 1);

  const reasons = [];

  if (avgWetness < 20) {
    reasons.push("the yard should be fairly dry");
  } else if (avgWetness < 35) {
    reasons.push("the yard is drying out well");
  } else {
    reasons.push("the grass may still be a little damp");
  }

  if (!rainSoon) {
    reasons.push("rain does not look likely right after");
  } else {
    reasons.push("rain may return later");
  }

  if (avgHumidity < 75) {
    reasons.push("humidity looks manageable");
  }

  if (avgWind < 12) {
    reasons.push("wind should stay light");
  }

  if (avgGrowth > 30) {
    reasons.push("recent weather likely sped up grass growth");
  }

  return reasons.join(", ") + ".";
}

export function getMowUrgency(scoredHours) {
  if (!scoredHours || scoredHours.length === 0) {
    return "No urgency data available.";
  }

  const recent = scoredHours.slice(-48);

  const avgGrowth =
    recent.reduce((sum, h) => sum + (h.growthPressure || 0), 0) / recent.length;

  const avgRain72 =
    recent.reduce((sum, h) => sum + (h.rainLast72 || 0), 0) / recent.length;

  if (avgGrowth >= 30 || avgRain72 >= 8) {
    return "Your lawn is probably growing quickly, so mowing soon is a good idea.";
  }

  if (avgGrowth >= 18 || avgRain72 >= 4) {
    return "Grass growth looks moderate, so mowing in the next few days makes sense.";
  }

  return "Grass growth pressure looks fairly low right now.";
}

export function getTopVerdict(windows) {
  if (!windows || windows.length === 0) {
    return "No strong mowing window this week.";
  }

  const best = windows[0];
  const bestDate = new Date(best.start);
  const today = new Date();

  const sameDay = bestDate.toDateString() === today.toDateString();

  if (sameDay) {
    return "Best move: mow today.";
  }

  return `Best move: wait until ${bestDate.toLocaleDateString([], {
    weekday: "long",
  })}.`;
}