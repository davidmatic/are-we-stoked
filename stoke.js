const MM_PER_INCH = 25.4;
const HOUR_MS = 60 * 60 * 1000;
const WINDOW_MS = 48 * HOUR_MS;

export function forecastInches(snowfallAmount, now) {
  const windowStart = now.getTime();
  const windowEnd = windowStart + WINDOW_MS;
  return snowfallAmount.values.reduce((total, { validTime, value }) => {
    const [startText, durationText] = validTime.split("/");
    const start = Date.parse(startText);
    const end = start + durationMs(durationText);
    const overlap =
      Math.min(end, windowEnd) - Math.max(start, windowStart);
    if (overlap <= 0) return total;
    return total + (value / MM_PER_INCH) * (overlap / (end - start));
  }, 0);
}

// NWS durations look like PT6H, PT12H or P1DT6H.
function durationMs(text) {
  const [, days = 0, hours = 0] = text.match(/^P(?:(\d+)D)?(?:T(\d+)H)?$/);
  return (Number(days) * 24 + Number(hours)) * HOUR_MS;
}

export async function resortStoke(
  gridpoint,
  now,
  fetch,
  { retryDelayMs = 3000 } = {},
) {
  try {
    return await fetchStoke(gridpoint, now, fetch);
  } catch {
    await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
  }
  try {
    return await fetchStoke(gridpoint, now, fetch);
  } catch {
    return "🤷";
  }
}

async function fetchStoke(gridpoint, now, fetch) {
  const response = await fetch(`https://api.weather.gov/gridpoints/${gridpoint}`);
  if (!response.ok) throw new Error(`NWS responded ${response.status}`);
  const { properties } = await response.json();
  return stokeText(forecastInches(properties.snowfallAmount, now));
}

export function stokeText(inches) {
  if (inches < 2) return "not stoked";
  const os = Math.min(Math.floor(inches / 2), 12);
  return `getting st${"o".repeat(os)}ked`;
}
