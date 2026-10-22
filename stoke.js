const MM_PER_INCH = 25.4;
const HOUR_MS = 60 * 60 * 1000;
const WINDOW_MS = 48 * HOUR_MS;
const INCHES_PER_O = 2;
const MAX_OS = 12;

export function forecastInches(snowfallAmount, now) {
  const windowStart = now.getTime();
  const windowEnd = windowStart + WINDOW_MS;
  return snowfallAmount.values.reduce((total, { validTime, value }) => {
    const [startText, durationText = ""] = validTime.split("/");
    const start = Date.parse(startText);
    const duration = durationMs(durationText);
    if (Number.isNaN(start) || !duration) return total;
    const end = start + duration;
    const overlap = Math.min(end, windowEnd) - Math.max(start, windowStart);
    if (overlap <= 0) return total;
    return total + (value / MM_PER_INCH) * (overlap / duration);
  }, 0);
}

// NWS durations look like PT6H, PT1H30M or P1DT6H; anything else is unreadable (0).
function durationMs(text) {
  const match = text.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?$/);
  if (!match) return 0;
  const [, days = 0, hours = 0, minutes = 0] = match;
  return ((Number(days) * 24 + Number(hours)) * 60 + Number(minutes)) * 60 * 1000;
}

export async function resortStoke(
  gridpoint,
  now,
  fetch,
  { retryDelayMs = 3000 } = {},
) {
  const attempts = 2;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fetchStoke(gridpoint, now, fetch);
    } catch {
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }
    }
  }
  return "🤷";
}

async function fetchStoke(gridpoint, now, fetch) {
  const response = await fetch(`https://api.weather.gov/gridpoints/${gridpoint}`);
  if (!response.ok) throw new Error(`NWS responded ${response.status}`);
  const { properties } = await response.json();
  return stokeText(forecastInches(properties.snowfallAmount, now));
}

export function stokeText(inches) {
  if (inches < INCHES_PER_O) return "not stoked";
  const oCount = Math.min(Math.floor(inches / INCHES_PER_O), MAX_OS);
  return `get st${"o".repeat(oCount)}ked`;
}
