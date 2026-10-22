# Observed snowfall ("snow stake" data) for Utah ski resorts

Research date: **2026-10-21** (US Mountain time; servers reported `Thu, 22 Oct 2026 05:xx–06:xx GMT`).
This is a companion to [snowfall-forecast-apis.md](snowfall-forecast-apis.md), which covers *forecast* snow. This doc covers snow that has *already fallen*.
Every "observed" claim comes from a `curl` call or page fetch made that day. Every doc or terms claim links to the owner's own page. Anything I couldn't verify is marked **(unverified)**.

It is the off-season: every resort below is closed, so most numbers were `0` or `"--"`. The data **shapes** are real, but I could not watch any value change during a storm.

## TL;DR recommendation

1. **Primary (works today, clean licence): NRCS SNOTEL, already covered in [the forecast doc §4](snowfall-forecast-apis.md#4-nrcs-snotel--awdb-rest-api-observed-snow-not-forecast).**
   - No key, `Access-Control-Allow-Origin: *`, hourly `SNWD` (snow depth) and `WTEQ` (water equivalent).
   - Stations exist for 7 of the 8 resorts. The one new for this doc is **Powder Mountain `1300:UT:SNTL`** (8,490 ft, ~1.3 km from the resort point). The gap is **Snowbasin**: the nearest SNOTEL is ~19 km away.
   - "New snow in 24 h" is a *derived* number: the positive change in `SNWD`, cross-checked with the change in `WTEQ`. It is not a resort's 24 h report.
2. **Show stake cams as links (or plain `<img>` hotlinks) and don't read numbers from them.** Alta, Snowbird, Snowbasin and Solitude publish official stake cams. They are images or YouTube streams. Turning one into a number means image analysis; OpenSnow sells that as a paid feature ("Powder Vision").
3. **Resort-reported 24 h / 48 h / storm totals: technically reachable, but not from the browser, and mostly against the operators' terms.**
   - Six of the eight resorts expose machine-readable data behind their pages, listed in the table below.
   - Only the MountainPowder feed used by Solitude and Deer Valley sends `Access-Control-Allow-Origin: *`. It works only with a bearer token that belongs to Alterra, and Alterra's terms prohibit "scraping or aggregating information".
   - Everything else needs a server-side fetch, e.g. a GitHub Actions cron that writes `observed.json` into the repo.
   - Park City (Vail) blocks scripted requests at the CDN (Akamai).
   - Alterra (Solitude, Deer Valley) and POWDR (Snowbird) terms explicitly prohibit bots or automated collection, and OpenSnow's terms prohibit scraping.
   - **If you want these numbers, ask the resorts (or Ski Utah) for permission first.**
4. **Skip:**
   - OpenSnow API: "only available to commercial partners".
   - Synoptic/MesoWest API: free access is limited to .edu/NOAA users or a 14-day trial, and it needs a token, which would be public on a static site.
   - Utah Avalanche Center API: token required.
   - NWS `/observations`: has no snow fields.
   - CoCoRaHS: has CORS and new-snow fields, but no observers in the Cottonwoods in the sample I pulled.

## The aggregator you probably saw

Several sites put Utah stake cams on one page. None of them has an API or live numbers.

| Site | What it is | Observed details |
|---|---|---|
| **[SkiTalk "Utah Resort Snow Stakes Web Cams"](https://www.skitalk.com/pages/utahsnowstakecams/)** | Forum page, "Real-time snow depth from all major Utah resorts", auto-refreshing every 7 minutes | The page source is a hardcoded JS array `// Updated December 11, 2025`. It hotlinks Alta's S3 image and Snowbird's/Snowbasin's hdrelay snapshots, and embeds YouTube for Brighton, Deer Valley and Solitude. **The base and new-snow numbers are static strings typed into the page** (e.g. `base: "27\""`), not live data. |
| **[Utah Cams "Utah Ski Resort Snow Stakes!"](https://utahcams.com/utah-ski-resort-snow-stakes/)** | Blog-style page of stake cams | Hotlinks Alta (S3), Snowbird (`b9.hdrelay.com`), Snowbasin (`img.hdrelay.com`) and Powder Mountain (`ixnay.net`). No image shown for Deer Valley or Park City. |
| **[SnowGrabber](https://snowgrabber.com/index.php?ski-cam-location=UT)** | Webcam aggregator, "65 Utah ski resort webcams" | Not inspected in depth (unverified). |
| **[Ski Utah webcams](https://www.skiutah.com/resorts/webcams)** / **[Ski Utah snow report](https://www.skiutah.com/snowreport)** | The official state ski association | The snow report is server-rendered HTML with one number per resort ("snowfall / 24 hours") plus an "Updated" timestamp (observed `2026-10-09 20:23:40` for Alta). "View full snow report" links go out to the resorts via `/go/to/snowreport/...`, which `robots.txt` disallows. No `Access-Control-Allow-Origin` header. No terms-of-use page found (`/terms-of-use` returned 404; only a privacy policy is linked). |
| **[OnTheSnow](https://www.onthesnow.com/utah/skireport)** | Snow report aggregator | No API mentioned. Terms: "The use of this service is reserved for strictly personal use… Any commercial use of any of the Site Elements is prohibited" ([terms](https://www.onthesnow.com/news/onthesnow-terms-conditions/)). |
| **OpenSnow** | Forecasts plus resort snow reports; many resorts embed its data | See §3 below. Its "Powder Vision" estimates hourly snowfall from "over 60 snow stake cameras" on the paid "Base & Premium" plan ([guide](https://support.opensnow.com/feature-guides/powder-vision)). |
| **snow-forecast.com** | Forecasts and snow reports | Terms: "You must not use any part of our Content for commercial purposes", "Our Services must not be framed on any other site" ([terms](https://www.snow-forecast.com/pages/terms)). Data feeds are a separate paid product (unverified). |
| **Powderchasers** | Forecast commentary | No API or snow-report feed found (unverified). |

My best guess for the page the owner remembers is the SkiTalk page or utahcams.com. Both are hand-maintained lists of hotlinked stake-cam images.

## Comparison table: resort-published snow reports

"Machine-readable source" is what the official page itself loads. "Browser CORS" is what came back when I sent `Origin: https://example.com` or `Origin: https://davidmatic.github.io`.

| Resort (operator) | Official page | Numbers published | Machine-readable source (observed) | Browser CORS | Stake cam |
|---|---|---|---|---|---|
| **Alta** (independent) | [alta.com/weather](https://www.alta.com/weather) | `last12`, `last24`, `storm_total`, `base_depth`, `year_to_date` (in); plus a daily history with `new_snow`, `new_water`, `density` | JSON blob `window.Alta = {...}` inline in the HTML | **No** ACAO header | **Yes**: "Snow Stake" at Collins, "Board cleared daily at 4am and 4pm" (JPEG) |
| **Snowbird** (POWDR) | [snowbird.com mountain report](https://www.snowbird.com/the-mountain/mountain-report/current-conditions-weather/) | "Overnight (4 pm - 9 am)", "24-Hour", "48-Hour", "7-Day", "Base Depth", "Season Total" | `https://api.snowbird.com/api/v1/dor/drupal/snow-reports?sort=date&direction=desc` (JSON) | **No**: ACAO is `https://www.snowbird.com` only; other origins get **HTTP 500** | **Yes**: [Snowstake Webcam](https://www.snowbird.com/the-mountain/webcams/snowstake-webcam/) (hdrelay) |
| **Brighton** (Boyne) | [brightonresort.com/conditions](https://www.brightonresort.com/conditions) | Overnight, since 5am, 12 h, 24 h, 48 h, 72 h, 7 days, season total, base (in and cm) | `https://www.brightonresort.com/api/reportpal?resortName=br&useReportPal=true` (JSON) | **No** ACAO header | Not found on the official page (unverified). SkiTalk lists a YouTube stream. |
| **Solitude** (Alterra) | [conditions-and-maps](https://www.solitudemountain.com/mountain-and-village/conditions-and-maps) | Per area (Base/Mid/Summit): since lifts closed, 24 h, 48 h, 72 h, 7 days, base; storm total; season total | MountainPowder feed `https://mtnpowder.com/feed/v3.json?bearer_token=…&resortId[]=65` | **Yes, `*`**, but see the terms below | **Yes**: "Solitude Snow Stake" (YouTube), "unofficial snowfall at the top of the mountain" |
| **Deer Valley** (Alterra) | [mountain-report](https://www.deervalley.com/explore-the-mountain/mountain-report) | Same MountainPowder schema (Base/Mid-Mountain/Summit) | Same feed, `resortId[]=49` | **Yes, `*`**, but see the terms below | Not listed on [webcams](https://www.deervalley.com/explore-the-mountain/webcams) (camstreamer/YouTube embeds, unlabelled) (unverified) |
| **Park City Mountain** (Vail) | [snow-and-weather-report.aspx](https://www.parkcitymountain.com/the-mountain/mountain-conditions/snow-and-weather-report.aspx) | Not visible in the fetched content: values are rendered client-side (unverified) | **Blocked**: `curl` gets an Akamai "The system cannot process your request" page | n/a | None on the [mountain cams page](https://www.parkcitymountain.com/the-mountain/mountain-conditions/mountain-cams.aspx) (7 cams, all scenic) |
| **Snowbasin** (independent) | [mountain-report](https://www.snowbasin.com/the-mountain/mountain-report/) | "Overnight", "24 hours", "7 days", "Base", "Season", plus "Last Updated: Oct 21 10:20 AM MT" | Server-rendered HTML only (`<p class="mc__num">0&#8221;</p>`); no JSON found | **No** ACAO header | **Yes**: "Snowstake Cam", elevation 8,000' ([web-cams](https://www.snowbasin.com/the-mountain/web-cams/)) |
| **Powder Mountain** (independent) | [powdermountain.com/conditions](https://powdermountain.com/conditions) | 12HR, 24HR, 48HR plus JSON `overnight`, `freshSnowFallDepth12H/24H/48H/72H/7D`, `snowTotalDepth`, `lastSnowFallDate` (cm, with inch `countryValue`) | Next.js server-rendered payload inline in the HTML. The upstream provider is not identifiable (unverified). | **No** ACAO header | Not on the official page (3 Prism scenic cams). utahcams.com hotlinks `ixnay.net/cams/pm/s1/current.jpg` (`Last-Modified: 2025-11-05`, i.e. stale) |

## Per-resort details

### Alta

- The `/weather` page (redirected from `/conditions/daily-mountain-report/snow-report`) embeds `<script>window.Alta = {...}`. Observed:

```jsonc
"conditions": { "dated_at": "2026-10-21 22:00:00", "last12": "0.0", "last24": "0.0",
  "base_depth": "2.0", "storm_total": "0.0", "year_to_date": "15.0",
  "updated_at": "2026-10-21 23:10:06" },
"seasonal": { "show_12hr_snow": false, "show_24hr_snow": false, "show_storm_total": false, ... },
"snowfall": { "history": [ { "reported_at": "2026-10-13", "new_snow": 7, "new_water": 0.56,
  "density": 8, "storm_total": 13, "ytd_snow": 13 }, ... ] }
```

- `updated_at` ticked hourly-ish (23:10 for a 22:00 reading), which suggests an automated feed rather than a once-a-morning report (unverified). The page also links "Collins Study Plot | NOAA" (`weather.gov/wrh/timeseries?site=CLN`) and "Alta Guard Study Plot" (`site=AGD`), so the Collins study plot is the likely measurement site (unverified).
- Stake cam: `https://alta-webcams.sfo3.cdn.digitaloceanspaces.com/Collins_Snow_Stake.jpg`, `Last-Modified: Thu, 22 Oct 2026 06:03:09 GMT`. The page says "Board cleared daily at 4am and 4pm, conditions permitting." Aggregators still hotlink the older `altaskiarea.s3-us-west-2.amazonaws.com/mountain-cams/Collins_Snow_Stake.jpg`.
- `robots.txt` disallows `/api/`. The page HTML has `cache-control: no-cache, private` and no ACAO.
- Alta is listed as an OpenSnow API partner ([OpenSnow API](https://opensnow.com/api/index.html)), and its forecast icons come from `blizzard.opensnow.com`.
- Terms: only a `/privacy-policy` link was found in the footer. Alta's terms of use are **unverified**.

### Snowbird (POWDR)

The site is Gatsby. Its JS builds `https://api.snowbird.com/api/v1` + `/dor/drupal/snow-reports?sort=date&direction=desc`. Other `/dor/` paths in the bundle: `/dor/sensors`, `/dor/weather-forecast`, `/dor/24-hour-weather`, `/dor/status`. Observed response (10 reports, newest first):

```jsonc
{ "date": "2026-10-20 09:00:00", "amount": 0, "overnight_amount": 0, "base_depth": 2,
  "unit_of_measurement": "in", "report": "<p>…</p>",
  "computed": { "24_hour": 0, "48_hour": 0, "72_hour": 0, "7_day": 0, "30_day": 17, "month": 17, "total": 17 } }
```

- **CORS:**
  - With `Origin: https://www.snowbird.com`: 200 and `access-control-allow-origin: https://www.snowbird.com`.
  - With `Origin: https://example.com` or `https://davidmatic.github.io`: **HTTP 500**.
  - With no Origin (server-side): 200.
- Page labels come from the Gatsby `page-data.json`: "Overnight (4 pm - 9 am)" → `overnight_amount`, "24-Hour" → `24_hour`, "48-Hour" → `48_hour`, " 7-Day" → `7_day`, "Base Depth" → `base_depth`, "Season Total" → `total`.
- The report is typed by a named staff author once a day around 09:00 (observed `date` values).
- **Terms (POWDR):** "collect information from the Services using an automated software tool or manually on a mass basis" and "use automated means to access the Services" are prohibited. Content may not be "redistributed, reused, or modified for any purpose, without the express written permission of Powdr" ([powdr.com/terms](https://www.powdr.com/terms/)). They apply to sites "belonging to a ski resort … owned by POWDR Corp." that link to these terms. Snowbird's footer links POWDR's privacy policy; I did not confirm that it links these terms (unverified).
- `robots.txt` allows everything.

### Brighton (Boyne)

The site is Next.js. Its JS calls the same-origin route `/api/reportpal?resortName=${code}&useReportPal=${bool}`. Observed `GET https://www.brightonresort.com/api/reportpal?resortName=br&useReportPal=true`:

```jsonc
{ "updated": "2026-10-22T05:59:00Z",
  "currentConditions": { "resortLocations": { "location": [ { "name": "Brighton",
    "snowOverNight": { "inches": "0", "centimeters": "0" },
    "snow12Hours": {...}, "snow24Hours": {...}, "snow48Hours": {...}, "snow72Hours": {...},
    "snow7Days": {...}, "snowSeasonTotal": {...}, "base": {...}, "snowSince5am": null } ] } } }
```

- No ACAO header, so a browser on another origin can't read it.
- The page config shows featured stat `snow24Hours`, with `snowOverNight`, `snow48Hours`, `snow7Days`, `snowSeasonTotal`, `base`.
- Brighton's terms of use: no link found on the page (only `/terms-of-sale` and Boyne's privacy policy). **Unverified.**

### Solitude and Deer Valley (Alterra): MountainPowder feed

- Both pages embed `liftsAndTrailsConfig = { liftsAndTrailsBuilderBasePath: "https://v4.mtnfeed.com/", resortPath: "solitude" | "deer-valley" }`.
- The widget then loads `https://v4.mtnfeed.com/resorts/solitude.json`, which returns `{"resortIds":[65],"bearerToken":"qB3H…"}`. Deer Valley's is `resortIds: [49]`.
- The widget calls `https://mtnpowder.com/feed/v3.json?bearer_token=…&resortId[]=65`.
- Observed headers: `access-control-allow-origin: *`, `cache-control: max-age=0`.
- `SnowReport` contains `LastUpdate`, `StormTotalIn/CM`, `SeasonTotalIn/Cm`, `SnowBaseRangeIn`, and `BaseArea` / `MidMountainArea` / `SummitArea`. Each area has `SinceLiftsClosedIn`, `Last24HoursIn`, `Last48HoursIn`, `Last72HoursIn`, `Last7DaysIn` and `BaseIn` (plus Cm). Unused fields are the string `"--"`.
- Solitude reports only Mid-Mountain. Deer Valley fills Base, Mid-Mountain and Summit.
- I found that one resort's token returned the other resort's data when I swapped the `resortId`. The tokens are therefore not scoped to a resort, but they are still Alterra's credentials, not ours.
- **Terms (Alterra, which covers "Alterra Mountain Company and its subsidiaries"):** "Website access by means of bots, spiders, and similar tools is expressly prohibited". Prohibited purposes include "accessing the website for purposes of scraping or aggregating information". Content is "intended solely for personal, non-commercial use" ([alterramtn.co/terms-of-use](https://www.alterramtn.co/terms-of-use)).
- MountainPowder's own terms were not found (unverified). **Even though CORS allows it, calling this feed from our site with Alterra's token is the riskiest option here.**
- Stake cams:
  - Solitude: a "Solitude Snow Stake" YouTube embed, captioned "This snow stake represents unofficial snowfall at the top of the mountain. These totals may differ from the official resort snowfall." ([webcams](https://www.solitudemountain.com/mountain-and-village/webcams)).
  - Deer Valley: none labelled as a stake (unverified; cams may change in winter).

### Park City Mountain (Vail Resorts)

- Every `curl` attempt got Akamai's 740-byte "The system cannot process your request… support ID" page, even with full browser headers and cookies.
- `WebFetch` got the page shell, but no snowfall values were in it: they load client-side.
- Field labels, update times and any JSON endpoint are therefore **unverified**.
- I could not reach a Vail terms-of-use page (`vailresorts.com/terms-of-use` returned 404) (unverified).
- The mountain cams page lists Lookout Cabin, High Meadow, Top Obx, Canyons Village Ski Beach, Top Crescent, Crescent Ridge and Mountain Village. There is **no stake cam**.
- Treat Park City as not scrapeable.

### Snowbasin

- Server-rendered HTML.
- Snow Report section: "Overnight", "Base", "24 hours", "Season", plus "7 days" in the summary.
- Timestamp: "Last Updated: Oct 21, 10:20 AM MT".
- `Cache-Control: no-cache,no-store`, no ACAO.
- Stake cam: "Snowstake Cam", "Elevation: 8,000'", on the [web-cams page](https://www.snowbasin.com/the-mountain/web-cams/) (hdrelay, `data-webcamtype="hdrelay"`).
- The [legal page](https://www.snowbasin.com/about/legal) has only "©2026 Snowbasin Resort Company. All Rights Reserved."; the Terms of Service text was not found (unverified).

### Powder Mountain

- Next.js, server-rendered. The RSC payload in the HTML contains `currentSnow` with `{value, unit: "CENTIMETER", countryValue, countryUnit: "INCH"}` for these fields: `overnight`, `freshSnowFallDepth12H`/`24H`/`48H`/`72H`/`7D`, `snowTotalDepth`, `snowFallDepthCompleteSeason`, `lastSnowFallDate` (`2026-04-13`) and `lastModified` (`2026-06-11T10:45`).
- The visible page shows "12HR / 24HR / 48HR Snowfall".
- The upstream data provider isn't named in the page (unverified). The forecast comes from OpenSnow (`utm_medium=external-api`).
- **Terms:** "The website and the Powder Mountain Content are intended solely for personal, non-commercial use"; "You may not reproduce (except as noted above), publish, transmit, distribute, display, modify…" ([termsofuse](https://powdermountain.com/termsofuse)).
- There is no official stake cam on the page. The only one I found (via utahcams.com) is on `ixnay.net`, last modified 2025-11-05.

## Snow stake cams: can we get a number?

- Every official stake cam is a still JPEG (Alta), an hdrelay snapshot (Snowbird, Snowbasin) or a YouTube live stream (Solitude, and per SkiTalk also Brighton and Deer Valley).
- None publishes a numeric reading alongside it. A number would need image analysis: board detection, reading the ruler, night and snow-glare handling, and so on.
  - OpenSnow built exactly that as a paid product: "we built a system to estimate the amount of snow that accumulates on a snow stake camera every hour" ([Powder Vision](https://support.opensnow.com/feature-guides/powder-vision)).
  - **Not practical** for this project.
- Displaying them:
  - An `<img src>` hotlink needs no CORS. Alta's DigitalOcean image is served with `vary: Origin` and no ACAO, which is fine for `<img>` but not for `fetch()`/canvas.
  - The hdrelay snapshot URLs returned **HTTP 500** to `HEAD` on 2026-10-21 (off-season or HEAD unsupported; unverified).
  - The images are the resorts' copyrighted content (see the terms above). **Linking to the resort's cam page is the safe default.**

## Government and open observation data

| Source | Snow fields | Cadence | Key | CORS (observed) | Terms | Verdict |
|---|---|---|---|---|---|---|
| **NRCS SNOTEL (AWDB REST)** | `SNWD` depth (in), `WTEQ` SWE (in) | Hourly and daily | No | `*` | US gov (see forecast doc) | **Use** |
| **Synoptic / MesoWest** (includes resort mesonets: Alta Collins `CLN`, Alta Base `ATB`, Brighton Crest `BRC`, DV Bald Eagle `DVB`, Snowbasin Mid Bowl `SNI`, …) | `snow_depth`, `snow_interval`, `snow_accum`, `snow_water_equiv` (variable names seen in NWS's own timeseries JS, `weather.gov/source/wrh/timeseries/obs.js`) | Station-dependent, often hourly | **Yes** (401 "Missing token") | `*` | Commercial plans; "Open Access" only for .edu ([open access](https://synopticdata.com/pricing/open-access-pricing/)); otherwise a 14-day trial ([pricing](https://synopticdata.com/pricing/)) | Skip unless you get a token, and even then it would be public in a static site |
| **NWS `api.weather.gov` stations** | **None.** Observation properties have only `precipitationLast3Hours`, temperature, etc. (observed on `BRIU1`). Mesonet IDs like `CLN`/`ATB` are listed under `/stations?state=UT` but return 0 observations. | Hourly | No | `*` | Public domain | Skip for snow |
| **NWS SLC Local Storm Reports (`/products/types/LSR/locations/SLC`)** | Free-text reports, sometimes snowfall | Event-driven | No | `*` | Public domain | Irregular. Ski-area snow totals appearing in LSR or PNS during storms is **unverified** (no PNS existed on the test day; the 8 LSRs were flash floods). |
| **CoCoRaHS export** (`data.cocorahs.org/export/exportreports.aspx?...&Format=CSV&State=UT`) | `NewSnowDepth`, `NewSnowSWE`, `TotalSnowDepth`, `TotalSnowSWE` | Daily (morning) | No | `*` | Terms not checked (unverified) | Valley and town observers only. Near the resorts there are two Park City observers (`UT-SM-17`, `UT-SM-12`) and Eden/Huntsville near Powder Mountain/Snowbasin. **None in Big or Little Cottonwood.** |
| **Utah Avalanche Center** | Forecast JSON at `/forecast/salt-lake/json` | Daily | **Yes** (401: "request a token" at `/api-access`) | none on 401 | API page blocked by Cloudflare (unverified) | Skip |

**SNOTEL stations per resort** (triplets from `/services/v1/stations?stateCds=UT`; five of them are already listed in the forecast doc):

| Resort | Station | Elev (ft) | Distance |
|---|---|---|---|
| Alta | `1308:UT:SNTL` Atwater | 8,750 | at base |
| Snowbird | `766:UT:SNTL` Snowbird | 9,170 | at resort |
| Brighton | `366:UT:SNTL` Brighton | 8,790 | at base |
| Solitude | `366:UT:SNTL` Brighton (2.5 km) or `628:UT:SNTL` Mill-D North | 8,790 / 8,940 | nearby |
| Park City | `814:UT:SNTL` Thaynes Canyon | 9,260 | on mountain |
| Deer Valley | `814:UT:SNTL` Thaynes Canyon | 9,260 | ~5 km |
| Powder Mountain | **`1300:UT:SNTL` Powder Mountain** (41.37428, -111.76673) | 8,490 | ~1.3 km |
| Snowbasin | `1300:UT:SNTL` Powder Mountain or `332:UT:SNTL` Ben Lomond Peak | 8,490 / 7,690 | **~19 km**, weak proxy |

Observed: `.../data?stationTriplets=1300:UT:SNTL&elements=SNWD,WTEQ&duration=HOURLY&beginDate=2026-10-21 12:00&endDate=2026-10-21 23:00` returned hourly `SNWD` values (all `0`).

## Feasibility for a static GitHub Pages site

| Approach | Works from browser? | Needs proxy/cron? | Legal / ToS risk | Notes |
|---|---|---|---|---|
| SNOTEL `SNWD`/`WTEQ` deltas | **Yes** (CORS `*`) | No | Low (US gov) | Derived new snow, affected by settling. Snowbasin has no close station. |
| Link to resort report and stake-cam pages | Yes | No | None | Zero data, but honest. |
| Hotlink stake-cam `<img>` | Yes | No | Medium (resort copyright) | URLs change (Alta moved from S3 to DigitalOcean). |
| MountainPowder feed (Solitude, DV) | Technically yes (CORS `*`) | No | **High**: Alterra's token; Alterra's terms ban bots and aggregation | Don't. |
| GitHub Actions cron fetching Alta HTML, Snowbird DOR API, Brighton reportpal, Snowbasin HTML, PowMow HTML, writing `observed.json` | Yes (reads same-origin JSON) | **Yes** | **Medium–high**: POWDR bans automated collection; PowMow is personal/non-commercial and bans redistribution; Alta, Brighton and Snowbasin terms unverified | Brittle: five different formats. Park City is unreachable (Akamai). |
| OpenSnow API | n/a | Server-side only ("server-to-server") | Partners only, and it requires "Powered by OpenSnow" | Not available to a hobby site. |
| Synoptic API | Yes (CORS `*`) | Token would be public | Not free for non-academic users | Skip. |

## Ranked recommendation

1. **SNOTEL deltas (now).**
   - Compute "new snow last 24 h / 48 h" per resort as `max(0, SNWD_now − min(SNWD over window))`, and sanity-check it against the rise in `WTEQ` (e.g. ≥0.1 in SWE).
   - Label it "measured near <station>", not "resort reported".
   - No proxy, no key, CORS `*`, already in the stack.
2. **Link out to each resort's report and stake cam** next to the verdict, so people can eyeball the board. Optionally hotlink the Alta, Snowbird and Snowbasin stake images.
3. **Resort-reported numbers only with permission.**
   - If Ski Utah or individual resorts agree, a GitHub Actions cron writing `observed.json` is the right shape: it avoids CORS and gives one consistent verdict.
   - Start with the cleanest JSON: Brighton `reportpal`, Snowbird DOR `snow-reports`, Alta `window.Alta`.
4. **Don't** use the MountainPowder token, scrape Park City, or derive numbers from cam images.

## Open questions and caveats

- **Off-season snapshot.** All resorts were closed, so I saw schemas, not live storm values. The update cadence of the winter reports (e.g. whether Snowbird's DOR report updates more than once a day, or whether Alta's `last24` is automated) is unverified.
- **Definitions differ.** Snowbird "Overnight" = 4 pm–9 am. Alta's board is cleared at 4 am and 4 pm. Solitude's stake is "unofficial", at the summit. MountainPowder reports per elevation band. "24 h" is not comparable across resorts.
- **SNOTEL vs resort numbers.** Depth deltas under-count new snow because the snowpack settles. SWE is the better "did it snow" signal, but it needs a density assumption to convert to inches.
- **Terms not found:** Alta, Brighton/Boyne, Snowbasin, Vail/Park City, MountainPowder, CoCoRaHS, UAC.
- **Endpoints are undocumented.** Every resort JSON path above was reverse-engineered from the resort's own front-end, not published as an API, and could change without notice.
