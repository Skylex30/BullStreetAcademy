Bullstreet Academy — MVP (static)

Overview
- Static HTML/CSS/JS MVP that simulates a paid 5-day trading course.
- Content is gated: after "payment" the site stores an encrypted access token using the Web Crypto API and user email in localStorage; the course page decrypts it to reveal content.

Files
- `index.html` — Home/hero and features
- `pricing.html` — Shows Ordinary ($49) and Premium ($199)
- `checkout.html` — Simulated checkout form (no real payments integrated)
- `course.html` — Member-only (gated) course content
- `styles.css` — Minimal responsive styles
- `scripts.js` — Payment simulation and Web Crypto encryption helpers
- `logo-placeholder.png` — Replace with your actual logo (keep filename `logo-placeholder.png` or update the HTML)

How it works
1. Visit `pricing.html`, pick a plan and click Buy.
2. On `checkout.html`, fill the form and "Pay now" — the script simulates payment, creates a random reference, encrypts a JSON token with a derived key, and stores it in `localStorage`.
3. The `course.html` page decrypts that token (using the stored email to derive the key) and unlocks the content if valid.

Security note
- This is a client-only simulation for an MVP. For production:
  - Use server-side payment handling (Stripe/PayPal) and server-side authentication/session management.
  - Store sensitive tokens only on the server; do not rely on client-side storage for access control.

Next steps (I can do any of these for you):
- Integrate real payments (Stripe + server endpoint)
- Add a server-side user system (login + DB) and proper encryption flows
- Replace simulated flow with server-issued signed JWTs for access control

To preview locally
- Open `index.html` in a browser (double-click or open from a simple static server like `npx serve`)

Replace the placeholder logo with your provided logo.png and I'll update the pages accordingly.

Live Market Preview
- The homepage now includes a **Live Market Preview** powered by Chart.js and Binance public trade streams.
- Select a trading pair (BTC/USDT, ETH/USDT, etc.) or choose 'Simulate' to see a real-time moving chart. If your environment blocks outbound websockets you can use the 'Simulate' option which generates live-like data.
- Added **timeframe selection** (1m, 5m, 15m, 1h) which uses Binance kline streams and a candlestick (OHLC) chart representation. Use timeframe buttons to change interval; historical candles are loaded from Binance REST before subscribing to updates.

Theme update
- Page styling updated to a black/blue theme. Colors use a dark background with blue accents for buttons and charts.