import { test } from "node:test";
import assert from "node:assert/strict";
import { forecastInches, resortStoke, stokeText } from "./stoke.js";

const now = new Date("2026-10-23T12:00:00Z");

function snowfall(...values) {
  return {
    uom: "wmoUnit:mm",
    values: values.map(([validTime, value]) => ({ validTime, value })),
  };
}

test("adds up 6-hour blocks inside the next 48 hours, in inches", () => {
  const amount = snowfall(
    ["2026-10-23T12:00:00+00:00/PT6H", 25.4],
    ["2026-10-23T18:00:00+00:00/PT6H", 50.8],
  );
  assert.equal(forecastInches(amount, now), 3);
});

test("ignores snow that already fell or is more than 48 hours out", () => {
  const amount = snowfall(
    ["2026-10-23T06:00:00+00:00/PT6H", 254],
    ["2026-10-24T12:00:00+00:00/PT6H", 25.4],
    ["2026-10-25T12:00:00+00:00/PT6H", 254],
  );
  assert.equal(forecastInches(amount, now), 1);
});

test("counts the in-window share of blocks that straddle either edge", () => {
  const amount = snowfall(
    // 2 of 6 hours are still ahead: a third of 3 inches.
    ["2026-10-23T08:00:00+00:00/PT6H", 76.2],
    // 4 of 12 hours fall before the window closes at 25 Oct 12:00: a third of 6 inches.
    ["2026-10-25T08:00:00+00:00/PT12H", 152.4],
    // 1 day 6 hours, wholly inside: all 1 inch.
    ["2026-10-23T12:00:00+00:00/P1DT6H", 25.4],
  );
  assert.ok(Math.abs(forecastInches(amount, now) - 4) < 1e-9);
});

test("under 2 inches is not stoked", () => {
  assert.equal(stokeText(0), "not stoked");
  assert.equal(stokeText(1.99), "not stoked");
});

test("2 inches is getting stoked, with one more o per extra 2 inches", () => {
  assert.equal(stokeText(2), "getting stoked");
  assert.equal(stokeText(3.9), "getting stoked");
  assert.equal(stokeText(4), "getting stooked");
  assert.equal(stokeText(6), "getting stoooked");
  assert.equal(stokeText(10.5), "getting stoooooked");
});

test("stoke tops out at 12 o's", () => {
  assert.equal(stokeText(24), "getting stooooooooooooked");
  assert.equal(stokeText(60), "getting stooooooooooooked");
});

function gridpointResponse(amount) {
  return { ok: true, json: async () => ({ properties: { snowfallAmount: amount } }) };
}

test("a resort's stoke comes from its NWS gridpoint forecast", async () => {
  const requested = [];
  const fetch = async (url) => {
    requested.push(url);
    return gridpointResponse(
      snowfall(["2026-10-23T12:00:00+00:00/PT6H", 101.6]),
    );
  };
  assert.equal(
    await resortStoke("SLC/108,167", now, fetch),
    "getting stooked",
  );
  assert.deepEqual(requested, ["https://api.weather.gov/gridpoints/SLC/108,167"]);
});

test("a failed NWS request is retried once", async () => {
  const responses = [
    { ok: false, status: 503, json: async () => ({}) },
    gridpointResponse(snowfall(["2026-10-23T12:00:00+00:00/PT6H", 50.8])),
  ];
  const fetch = async () => responses.shift();
  assert.equal(
    await resortStoke("SLC/108,167", now, fetch, { retryDelayMs: 0 }),
    "getting stoked",
  );
});

test("shrugs when NWS fails twice", async () => {
  const failures = {
    "an error status": async () => ({ ok: false, status: 500, json: async () => ({}) }),
    "a network error": async () => {
      throw new TypeError("Failed to fetch");
    },
    "malformed data": async () => ({ ok: true, json: async () => ({ properties: {} }) }),
  };
  for (const [kind, fetch] of Object.entries(failures)) {
    assert.equal(
      await resortStoke("SLC/108,167", now, fetch, { retryDelayMs: 0 }),
      "🤷",
      kind,
    );
  }
});
