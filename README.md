# are-we-stoked

A text-only page that says whether Salt Lake and Eastern Sierra ski resorts are getting snow in the next 48 hours, using the National Weather Service forecast.

- `index.html` – the page (no build step)
- `page.js` – fetches every Resort and renders the list
- `stoke.js` – turns an NWS gridpoint forecast into a Resort's Stoke
- `stoke.test.js` – run with `node --test`

To preview locally: `python3 -m http.server`, then open http://localhost:8000.
