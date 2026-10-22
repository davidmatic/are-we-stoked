# Snowfall forecast APIs for Salt Lake City and Utah ski resorts

Research date: **2026-10-21** (US Mountain time; API servers reported `Thu, 22 Oct 2026 03:2x GMT`).
Every "observed" claim below comes from a `curl` call made that day. Every doc claim links to the vendor's own page. Anything I couldn't verify is marked **(unverified)**.

## TL;DR recommendation

1. **Primary source: NWS `api.weather.gov` gridpoint `snowfallAmount`.**
   - No key, no signup, public domain.
   - `Access-Control-Allow-Origin: *`, so a static page can call it directly.
   - The data is the Salt Lake City NWS office's own 2.5 km forecast grid, edited by forecasters, in 6-hour snowfall blocks out to about 7 days.
   - It was the only source that agreed with the NWS text forecast for Alta on the test day.
   - Hardcode each location's gridpoint URL. That turns the two-step `/points` → `/gridpoints` lookup into one request per location.
2. **Secondary / fallback / cross-check: Open-Meteo.**
   - No key, CORS `*`, up to 16 days.
   - It is the only free API with an explicit `elevation=` parameter, which it uses for statistical downscaling.
   - It also lets you choose the model (`models=ncep_nbm_conus`, `gfs_hrrr`, …).
   - The free tier is **non-commercial only** and needs CC BY 4.0 attribution. A free, ad-free hobby site counts as non-commercial under [Open-Meteo's terms](https://open-meteo.com/en/terms).
3. **Observed snow ("did it actually snow?"): NRCS SNOTEL AWDB REST API.** No key, CORS `*`, hourly and daily snow depth (`SNWD`) and SWE (`WTEQ`) from stations at the resort base areas: Snowbird, Atwater/Alta, Brighton, Thaynes Canyon/Park City.
4. **Skip for this project:**
   - Visual Crossing, Tomorrow.io, OpenWeatherMap and Pirate Weather all need an API key. On a client-side static page the key would be public.
   - None of them gives better mountain-elevation handling than NWS or Open-Meteo.
   - MET Norway has **no snowfall field** at all.
5. **Architecture:** a pure client-side static page is feasible. NWS, Open-Meteo and SNOTEL all returned `Access-Control-Allow-Origin: *` and need no secrets.
   - A small scheduled job (e.g. a GitHub Actions cron writing a static `snow.json`) is **optional**. It would be worth it to smooth over the NWS gridpoint 5xx errors the [NWS changelog](https://www.weather.gov/documentation/services-web-api) mentions, to compute one consistent "stoked" verdict, and to avoid 6+ API calls per visitor.
   - If you do add one, note that NWS says proxies hit its unpublished rate limit more easily, and Open-Meteo says shared-IP hosts (Vercel/Netlify) may be rate-limited earlier (see below).

## Comparison table

| Source | Snowfall field (units, step) | Resolution / elevation handling | Horizon | Key? | Free rate limit | CORS (observed) | ToS / attribution |
|---|---|---|---|---|---|---|---|
| **NWS api.weather.gov** | `snowfallAmount` in gridpoint data, `wmoUnit:mm`, 6 h ISO-8601 intervals (observed); text periods say "New snow accumulation of 1 to 3 inches" | ~2.5 km WFO grid ([docs](https://www.weather.gov/documentation/services-web-api)); response gives grid-cell `elevation` (Alta cell = 2987 m / 9,800 ft); **no elevation parameter** | ~7 days (`validTimes` `P7DT13H`; last snow block 2026-10-28T18Z) | No (User-Agent header required; empty UA → 403) | Not public, "generous", retry after ~5 s ([docs](https://www.weather.gov/documentation/services-web-api)) | `*` | Public domain; don't imply NWS endorsement or present modified data as official ([disclaimer](https://www.weather.gov/disclaimer)) |
| **Open-Meteo** | hourly `snowfall` (cm, or inch with `precipitation_unit=inch`); daily `snowfall_sum`; also `snow_depth`, `freezing_level_height` | Model-dependent (HRRR/NBM ~3 km in US via `best_match`); `elevation=` param for statistical downscaling, default = 90 m DEM; `cell_selection=land` picks a similar-elevation cell ([docs](https://open-meteo.com/en/docs)) | Up to 16 days (`forecast_days=16` worked) | No (free tier) | 600/min, 5,000/h, 10,000/day, 300,000/month ([terms](https://open-meteo.com/en/terms)) | `*` | Free tier **non-commercial only**; CC BY 4.0 attribution ([licence](https://open-meteo.com/en/licence)) |
| **MET Norway Locationforecast 2.0** | **None.** Only `precipitation_amount` (mm) plus symbol codes like `lightsleet` (observed) | Outside Nordics: ECMWF ~9 km; `altitude=` adjusts *air temperature* only via lapse rate ([data model](https://docs.api.met.no/doc/locationforecast/datamodel)) | ~10 days (observed to 2026-10-31T12Z) | No (identifying User-Agent/Origin required) | 20 req/s total per application ([ToS](https://docs.api.met.no/doc/TermsOfService)) | `*` | CC BY 4.0 / NLOD; credit "MET Norway" ([license](https://api.met.no/doc/License)) |
| **NRCS SNOTEL (AWDB REST)** — *observed* | `SNWD` snow depth (in), `WTEQ` SWE (in), `PREC` (in); hourly/daily | Point stations at real elevations (e.g. Snowbird 9,170 ft) | Observations only | No | Not documented (unverified) | `*` | US government data (licence not checked; unverified) |
| **Pirate Weather** | `precipAccumulation`, `snowAccumulation` (cm, or inches in `us` units) ([docs](https://docs.pirateweather.net/en/latest/API/)) | HRRR/NBM/GFS sources ([docs](https://docs.pirateweather.net/en/latest/API/)); elevation handling unverified | 48 h hourly (168 h with `extend=hourly`) | **Yes** | 10,000 calls/month free ([home](https://docs.pirateweather.net/en/latest/)) | `*` (on 401 response) | Licence not verified |
| **Visual Crossing Timeline** | `snow` ("amount of snow that fell or is predicted to fall"), `snowdepth` ([docs](https://www.visualcrossing.com/resources/documentation/weather-api/timeline-weather-api/)) | Blended; optional `forecastDataset=ndfd/hrrr/...`; `elevationDifference` only filters stations | 15 days | **Yes** | 1,000 records/day free ([editions](https://www.visualcrossing.com/weather-data-editions)) | `*` | Free tier requires attribution link ([editions](https://www.visualcrossing.com/weather-data-editions)) |
| **Tomorrow.io v4** | `snowAccumulation` (mm/in, hourly, does not aggregate daily) ([data layers](https://docs.tomorrow.io/reference/data-layers-core)) | Not documented for elevation (unverified) | 120 h hourly / 5 days daily ([forecast docs](https://docs.tomorrow.io/reference/weather-forecast)) | **Yes** | Per plan, numbers not on accessible pages (unverified) | Reflects request Origin + credentials | "Powered by Tomorrow.io" required ([ToS](https://www.tomorrow.io/terms-of-service/)) |
| **OpenWeatherMap One Call 3.0** | `hourly.snow.1h` (mm/h), `daily.snow` (mm only; depth vs water equivalent ambiguous) ([docs](https://openweathermap.org/api/one-call-3)) | Not documented for elevation | 48 h hourly / 8 days daily | **Yes**, separate "One Call" subscription | 1,000 calls/day free ([pricing](https://openweathermap.org/full-price)) | `*` | ODbL, attribution required ([pricing](https://openweathermap.org/full-price)) |
| **Weather Unlocked Ski Resort API** | Snowfall predictions for base/mid/upper elevations ([overview](https://developer.weatherunlocked.com/skiresort)) | Explicit base/mid/upper forecasts | 7 days | Yes (free *trial*, not free tier) | unverified | not tested | unverified |

## Per-source details

### 1. NWS api.weather.gov (recommended primary)

**How it works.** Calling `/points/{lat},{lon}` returns the forecast office and grid cell. You then fetch `/gridpoints/{office}/{x},{y}` (raw grid data), `/forecast` (12 h text periods) or `/forecast/hourly`. NWS describes the grid as "Forecasts are created at each NWS Weather Forecast Office (WFO) on their own grid definition, at a resolution of about 2.5km x 2.5km" ([NWS API docs](https://www.weather.gov/documentation/services-web-api)). The NDFD CONUS 2.5 km grid definition is on [MDL's NDFD spatial reference page](https://vlab.noaa.gov/web/mdl/ndfd-spatial-reference-system). The National Blend of Models is "a highly accurate, skillful and consistent starting point for the gridded forecast" that forecasters then edit ([MDL NBM](https://vlab.noaa.gov/web/mdl/nbm)).

**Observed request/response (2026-10-21):**

```bash
curl -s -A "are-we-stoked (contact@example)" https://api.weather.gov/points/40.5884,-111.6386
# properties.gridId "SLC", gridX 108, gridY 167, relativeLocation.city "Alta"
# forecastGridData: https://api.weather.gov/gridpoints/SLC/108,167

curl -s -A "are-we-stoked (contact@example)" https://api.weather.gov/gridpoints/SLC/108,167
```

```jsonc
// properties (trimmed)
"updateTime": "2026-10-21T18:41:37+00:00",
"validTimes": "2026-10-21T12:00:00+00:00/P7DT13H",
"elevation": { "unitCode": "wmoUnit:m", "value": 2987.04 },
"snowfallAmount": {
  "uom": "wmoUnit:mm",
  "values": [
    { "validTime": "2026-10-23T06:00:00+00:00/PT6H", "value": 0 },
    { "validTime": "2026-10-23T12:00:00+00:00/PT6H", "value": 22.86 },
    { "validTime": "2026-10-23T18:00:00+00:00/PT6H", "value": 25.4 },
    { "validTime": "2026-10-24T00:00:00+00:00/PT6H", "value": 7.62 },
    { "validTime": "2026-10-24T06:00:00+00:00/PT6H", "value": 5.08 }
  ]
},
"snowLevel": { "uom": "wmoUnit:m", "values": [ { "validTime": "...", "value": 3373.2 } ] }
```

Notes:
- The values are snow *depth* in mm, not water equivalent; 25.4 mm = 1.0 in. The gridpoint data also has `quantitativePrecipitation`, `snowLevel` (m), `probabilityOfPrecipitation`, `weather` and `temperature`.
- `validTime` is an ISO-8601 start/duration interval. Here it was always `PT6H`, but code should honour whatever duration is given.
- The same Friday was summarized in the text forecast (`/gridpoints/SLC/108,167/forecast`) as *"New snow accumulation of 1 to 3 inches possible"*, then *"less than one inch"* Friday night. That is consistent with ~2.4 in on the grid.

**All target locations (fetched 2026-10-21, sum of every `snowfallAmount` block, ~7 days):**

| Location | Query lat,lon | Gridpoint | NWS grid-cell elevation | 7-day snow |
|---|---|---|---|---|
| Salt Lake City | 40.7608,-111.8910 | SLC/100,175 | 1306 m (4,285 ft) | 0 mm |
| Alta | 40.5884,-111.6386 | SLC/108,167 | 2987 m (9,800 ft) | 66.0 mm (2.6 in) |
| Snowbird | 40.5830,-111.6556 | SLC/107,166 | 2834 m (9,298 ft) | 5.1 mm (0.2 in) |
| Brighton | 40.5980,-111.5832 | SLC/110,167 | 2669 m (8,757 ft) | 10.2 mm (0.4 in) |
| Solitude | 40.6199,-111.5919 | SLC/110,168 | 2692 m (8,832 ft) | 5.1 mm (0.2 in) |
| Park City | 40.6514,-111.5080 | SLC/113,169 | 2109 m (6,919 ft) | 0 mm |

Adjacent 2.5 km cells (Alta vs Snowbird) differed by 10x, so the cell you pick matters.

**Elevation.** You cannot pass an elevation. The API reports the grid cell's elevation, and at Alta that cell (9,800 ft) is about 1,250 ft above the DEM elevation at the base-area coordinate (2603 m / 8,540 ft, from the Open-Meteo Elevation API; see Resort coordinates below). For "is it snowing on the mountain" that bias is acceptable or even desirable. Forecasters at WFO SLC edit this grid, so mountain/valley differences reflect human judgement, not only raw model output.

**Rate limit, auth, ToS:**
- "The rate limit is not public information, but allows a generous amount for typical use … may be retried after the limit clears (typically within 5 seconds). Proxies are more likely to reach the limit, whereas requests directly from clients are not" ([docs](https://www.weather.gov/documentation/services-web-api)).
- A User-Agent is required; NWS says it "will be replaced with an API key in the future" (same page). Observed: with an **empty** User-Agent, NWS returned **403**. With a browser-style User-Agent and an `Origin` header it returned 200.
- Data is public domain. Don't claim it as your own, imply NOAA endorsement, or present modified content as official ([weather.gov/disclaimer](https://www.weather.gov/disclaimer)).

**CORS (observed):** `access-control-allow-origin: *` on `/points`, `/gridpoints`, `/forecast/hourly`. The OPTIONS preflight returned `access-control-allow-headers: API-Key, User-Agent`.

**Caching (observed):**
- `/points`: `cache-control: public, max-age=11244, s-maxage=86400`. Point→grid mappings are stable, so hardcode them.
- `/forecast/hourly`: `max-age=1022, s-maxage=3600`.

### 2. Open-Meteo (recommended fallback / cross-check)

**Docs facts** ([open-meteo.com/en/docs](https://open-meteo.com/en/docs)):
- Hourly `snowfall` is "Snowfall amount of the preceding hour in centimeters. For the water equivalent in millimeter, divide by 7."
- Daily `snowfall_sum` is in cm.
- `elevation` is "The elevation used for statistical downscaling. Per default, a 90 meter digital elevation model is used. You can manually set the elevation to correctly match mountain peaks. If `&elevation=nan` is specified, downscaling will be disabled and the API uses the average grid-cell height."
- `cell_selection` defaults to `land`: "finds a suitable grid-cell on land with similar elevation to the requested coordinates using a 90-meter digital elevation model". `nearest` is the alternative.
- In North America, `best_match` adds NOAA HRRR on top of the global ICON/GFS/IFS backbone. "For each weather variable and forecast hour, the highest-resolution model takes precedence."

**Observed request (2026-10-21):**

```bash
curl -s "https://api.open-meteo.com/v1/forecast?latitude=40.5884&longitude=-111.6386\
&hourly=snowfall,snow_depth,freezing_level_height&daily=snowfall_sum\
&timezone=America%2FDenver&forecast_days=16"
```

```jsonc
{ "latitude": 40.615543, "longitude": -111.6266, "elevation": 2603.0,
  "daily_units": { "snowfall_sum": "cm" },
  "daily": { "time": ["2026-10-21", ..., "2026-11-05"],
             "snowfall_sum": [0.0, 0.07, 2.4, 0.0, ...] } }
```

**Effect of `elevation` and model choice at Alta** (sum of daily `snowfall_sum`, 16 days unless the model is shorter):

| Variant | Returned elevation | Returned grid point | Snow (cm) |
|---|---|---|---|
| default (DEM) | 2603 | 40.6155,-111.6266 | 2.47 |
| `elevation=1300` (SLC-like) | 1300 | 40.6155,-111.6266 | 0.0 (min temps 8–13 °C) |
| `elevation=3300` | 3300 | 40.5581,-111.6508 | 5.69 |
| `elevation=nan` (no downscaling) | 2929 | 40.5889,-111.6212 | 5.06 |
| `models=ncep_nbm_conus` | 2603 | 40.6228,-111.6171 | **9.16** |
| `models=gfs_hrrr` | 2603 | 40.6155,-111.6266 | 0.07 (only ~2 days of data) |
| `models=ecmwf_ifs025` | 2603 | 40.5,-111.75 | 0.35 |
| `models=ecmwf_ifs` | 2603 | 40.5975,-111.6407 | 0.14 |
| `models=gem_seamless` | 2603 | 40.6049,-111.6224 | 0.91 |
| `models=icon_seamless` | 2603 | 40.625,-111.625 | 0.84 |

Takeaways:
- `elevation` changes both the temperature downscaling (snow vs rain) **and** which grid cell is picked. With the default it jumped about 3 km north of the requested point.
- Model spread is large in complex terrain. NBM (9.2 cm ≈ 3.6 in) was closest to NWS's 2.6 in, which makes sense because NBM is the NWS starting point. `best_match` (≈1 in) under-forecast relative to NWS.
- **If you use Open-Meteo, pin `models=ncep_nbm_conus` and pass explicit resort elevations.**

Multiple locations work in one call (comma-separated lat/lon). Observed for SLC, Alta, Snowbird, Brighton, Solitude and Park City: DEM elevations 1302/2603/2513/2680/2499/2125 m.

**Limits and ToS:**
- Free API: "Less than 10'000 API calls per day, 5'000 per hour and 600 per minute. You may only use the free API services for non-commercial purposes. You accept to the CC-BY 4.0 licence."
- Limits apply per IP. "If you are using providers like Vercel, Netlify, Render, or Google Sheets you might be rate-limited earlier."
- Non-commercial includes "Private or non-profit websites or apps that do not have subscriptions or advertising"; tip jars are OK ([terms](https://open-meteo.com/en/terms)).
- Requests with more than 10 variables or more than 2 weeks count as fractional extra calls ([pricing](https://open-meteo.com/en/pricing)).
- CC BY 4.0 attribution is required ([licence](https://open-meteo.com/en/licence)).

**CORS (observed):** `access-control-allow-origin: *`, methods `GET, POST, OPTIONS`.

### 3. MET Norway Locationforecast 2.0 (not suitable: no snowfall)

**Observed** (`/complete?lat=40.5884&lon=-111.6386&altitude=2600`):
- 91 timesteps from 2026-10-22T03Z to 2026-10-31T12Z.
- Period fields are only `precipitation_amount`, `air_temperature_max` and `air_temperature_min`. No snowfall.
- Precipitation type is only implied by `symbol_code` (e.g. `"lightsleet"`).

**Docs facts:**
- Outside the Nordic/Arctic domains it uses ECMWF at ~9 km for 0–10 days.
- Elevation is used only "to adjust the air temperature forecasts … using a standard adiabatic lapse rate" ([data model](https://docs.api.met.no/doc/locationforecast/datamodel)).
- ToS limits: 20 req/s total per application.
- Browsers must identify themselves via `Origin`. Low-volume sites may use simple CORS GETs; heavy traffic must go through a caching proxy ([ToS](https://docs.api.met.no/doc/TermsOfService)).
- Licence: CC BY 4.0 / NLOD, credit "MET Norway" ([license](https://api.met.no/doc/License)).

**CORS (observed):** `access-control-allow-origin: *`. The docs say a missing User-Agent gives 403 ([HowTO](https://docs.api.met.no/doc/locationforecast/HowTO)), but a request with an empty UA returned 200 on 2026-10-21.

### 4. NRCS SNOTEL / AWDB REST API (observed snow, not forecast)

The OpenAPI spec is at `https://wcc.sc.egov.usda.gov/awdbRestApi/v3/api-docs`, with endpoints `/services/v1/stations`, `/data`, `/forecasts` (water-supply forecasts) and `/reference-data`.

**Stations near the resorts** (from `/services/v1/stations?stateCds=UT`; elevation in ft):

| Triplet | Name | Lat, Lon | Elev (ft) | Near |
|---|---|---|---|---|
| 766:UT:SNTL | Snowbird | 40.56914, -111.65852 | 9,170 | Snowbird |
| 1308:UT:SNTL | Atwater | 40.59124, -111.63775 | 8,750 | Alta base (Alta Central snow course 11J61 is co-located) |
| 366:UT:SNTL | Brighton | 40.59936, -111.58167 | 8,790 | Brighton |
| 628:UT:SNTL | Mill-D North | 40.65883, -111.63683 | 8,940 | Big Cottonwood / Solitude area |
| 814:UT:SNTL | Thaynes Canyon | 40.6235, -111.53322 | 9,260 | Park City Mountain |

**Observed request:**

```bash
curl -s "https://wcc.sc.egov.usda.gov/awdbRestApi/services/v1/data?stationTriplets=766:UT:SNTL,366:UT:SNTL\
&elements=SNWD,WTEQ,PREC&duration=DAILY&beginDate=2026-10-14&endDate=2026-10-21"
# 766:UT:SNTL SNWD (in): 10-17: 2, 10-18: 1, 10-19: 0, 10-20: 0
# 766:UT:SNTL WTEQ (in): 10-17: 0.9 ... 10-20: 0.0
```

`duration=HOURLY` also works, e.g. `{"date":"2026-10-21 18:00","value":0}` for Snowbird SNWD.

There is no "new snowfall" element in what I queried. You derive it as the positive change in `SNWD`, which is noisy because of settling.

**CORS (observed):** `access-control-allow-origin: *`. No key. Rate limits and licence are not documented on the pages I fetched (unverified).

### 5. Pirate Weather

Requires an API key in the URL path (`/forecast/[apikey]/lat,lon`). Observed: 401 without a valid key, with `access-control-allow-origin: *`.

From the [API docs](https://docs.pirateweather.net/en/latest/API/):
- `precipAccumulation` and `snowAccumulation` are in cm (inches in `us` units). `snowAccumulation` needs `version=2`.
- Hourly data covers 48 h, or 168 h with `extend=hourly`.
- Sources include `hrrr`, `nbm`, `gfs`, `gefs`, `ecmwf_ifs`, among others.

Free tier: 10,000 calls/month ([docs home](https://docs.pirateweather.net/en/latest/)). Elevation handling and data licence: unverified. On a static site the key would be exposed.

### 6. Visual Crossing Timeline API

Key required. Observed: 401 without a key, CORS `*`.
- Fields `snow` and `snowdepth`; a 15-day forecast by default.
- `forecastDataset` can select `ndfd`, `hrrr`, `gfs`, `ecmwf` and others (the docs say it "requires forecast data access", so it may not be on the free plan; unverified) ([docs](https://www.visualcrossing.com/resources/documentation/weather-api/timeline-weather-api/)).
- Elevation is only a station-filter (`elevationDifference`); it does not downscale.
- Free plan: 1,000 records/day, and attribution is required ([editions](https://www.visualcrossing.com/weather-data-editions)).

### 7. Tomorrow.io v4

Key required. Observed: 401 without a key. The CORS response echoed `access-control-allow-origin: https://example.com` with credentials.
- `snowAccumulation` "will always return hourly data and does not aggregate", so daily `snowAccumulationMax` is the max hourly value, not the day total ([data layers](https://docs.tomorrow.io/reference/data-layers-core)). You would sum hourly values yourself.
- Forecast covers 120 h hourly and 5 days daily ([forecast docs](https://docs.tomorrow.io/reference/weather-forecast)).
- "Powered by Tomorrow.io" attribution is required ([ToS](https://www.tomorrow.io/terms-of-service/)).
- Free-plan limits: the pricing page is JS-rendered, so I could not read them (unverified).

### 8. OpenWeatherMap One Call 3.0

Key required, plus a separate "One Call API" subscription that "includes 1,000 calls/day for free" ([docs](https://openweathermap.org/api/one-call-3)). Observed: 401 without a key, CORS `*`.
- `daily.snow` is "Snow volume, mm", with mm the only unit. It is ambiguous whether that is depth or water equivalent.
- Hourly forecast covers 48 h; daily covers 8 days.
- ODbL licence, attribution required ([pricing](https://openweathermap.org/full-price)).
- The docs recommend the newer One Call 4.0 for new integrations (not investigated).

### 9. Others considered

- **Weather Unlocked Ski Resort API:** base/mid/upper elevation forecasts and snowfall for next day/48 h/72 h/week, 3,000+ resorts ([overview](https://developer.weatherunlocked.com/skiresort)). It is a free *trial*, not a free tier. Pricing and terms unverified. It is the only one built per resort, so worth revisiting if the free options disappoint.
- **NDFD GRIB2 / NBM direct downloads:** the same data as NWS gridpoints but in bulk. Overkill for a few points.

## Resort coordinates and elevations used

| Location | Query lat, lon | Coordinate source (OSM via Nominatim, 2026-10-21) | DEM elevation at query point (Open-Meteo Elevation API, 90 m) | NWS grid-cell elevation |
|---|---|---|---|---|
| Salt Lake City | 40.7608, -111.8910 | Downtown SLC; Open-Meteo snapped to 40.7462,-111.9054 | 1302 m (4,272 ft) | 1306 m |
| Alta | 40.5884, -111.6386 | [node 2632729163](https://www.openstreetmap.org/node/2632729163) "Alta Ski Area" at 40.58824,-111.63840 | 2603 m (8,540 ft) | 2987 m |
| Snowbird | 40.5830, -111.6556 | [node 150937306](https://www.openstreetmap.org/node/150937306) "Snowbird" at 40.58075,-111.65730 (~300 m away) | 2513 m (8,245 ft) | 2834 m |
| Brighton | 40.5980, -111.5832 | [way 182573699](https://www.openstreetmap.org/way/182573699) "Brighton Resort" at 40.59834,-111.58374 | 2680 m (8,793 ft) | 2669 m |
| Solitude | 40.6199, -111.5919 | [node 12059589230](https://www.openstreetmap.org/node/12059589230) "Solitude Mountain Resort" at 40.62058,-111.59174 | 2499 m (8,199 ft) | 2692 m |
| Park City | 40.6514, -111.5080 | [node 355685310](https://www.openstreetmap.org/node/355685310) "Park City Mountain Resort" at 40.65135,-111.50769 | 2125 m (6,972 ft) | 2109 m |

How the elevations were obtained:
- DEM elevations come from `GET https://api.open-meteo.com/v1/elevation?latitude=...&longitude=...`, which returned `[1302, 2603, 2513, 2680, 2499, 2125]`.
- The base elevations you quoted (Alta ~8,500 ft, SLC ~4,200 ft) match the DEM (8,540 ft, 4,272 ft). They are also corroborated by SNOTEL Atwater/Alta Central at 8,750 ft.
- I could not get official base and summit elevations from the resorts' own sites: the Alta, Snowbird and Solitude stats URLs returned 404, and Brighton lists only "1,875 Vertical Feet" ([brightonresort.com/mountain-stats](https://www.brightonresort.com/mountain-stats)). Official resort elevations are therefore **unverified**.

## Open questions and caveats

- **NWS gridpoint vs point/text forecasts.** The `/forecast` text is generated from the same grid, but it is rounded into ranges ("1 to 3 inches"). The gridpoint `snowfallAmount` gives numbers that are easy to threshold. Use gridpoints for logic and the text only for display, if at all.
- **Grid-cell choice.** NWS 2.5 km cells around Little Cottonwood differ a lot (Alta 2.6 in vs Snowbird 0.2 in for the same storm). Consider querying 2–3 cells per resort (base and upper mountain) and taking the max, or picking the cell whose elevation is mid-mountain.
- **Elevation mismatch.** NWS gives no elevation control, and its cell average can be ~1,000+ ft above the base. Open-Meteo lets you set elevation, but the setting also moves the grid cell. Decide whether "stoked" means snow at the base or on the mountain.
- **Open-Meteo model choice.** `best_match` differed from NWS by ~3.5x in this test. NBM matched best. Pin `models=ncep_nbm_conus` if you use it. HRRR is only ~48 h.
- **Snow depth vs water equivalent.** NWS (mm of snow), Open-Meteo (cm of snow, where 7 cm ≈ 10 mm water), Pirate Weather (cm) and Tomorrow.io (mm or in) are snow depth. OpenWeatherMap `snow` (mm) is ambiguous. SNOTEL `WTEQ` is water equivalent and `SNWD` is depth.
- **Observed vs forecast.** SNOTEL gives truth after the fact. "New snow" from SNOTEL is a depth delta and is affected by settling. Resort-reported 24 h totals are not available via any free API I verified.
- **Single snapshot.** All numbers are from one forecast run on 2026-10-21, early season. This shows how much sources can differ, not which is most accurate. A real accuracy comparison needs a season of forecast-vs-SNOTEL verification.
- **NWS reliability.** NWS's changelog notes past frequent 500/503s on gridpoints. Handle errors, fall back to Open-Meteo, or cache via a cron job.
- **NWS User-Agent from browsers.** Browsers cannot set a custom User-Agent. A browser-style UA with `Origin` returned 200, so client-side calls work today. NWS says an API key will replace the UA "in the future" (unverified when).
