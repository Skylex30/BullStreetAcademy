// Simple client-side scripts including a Web Crypto-based token for gated access

// Utility: parse querystring
function q(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

// --- Web Crypto helpers ---
// We derive a key from a passphrase (app-specific secret + user email) so that tokens are encrypted per user
async function deriveKey(passphrase) {
  const enc = new TextEncoder();
  const salt = enc.encode('bullstreet-academy-salt-v1');
  const baseKey = await window.crypto.subtle.importKey('raw', enc.encode(passphrase), {name:'PBKDF2'}, false, ['deriveKey']);
  return window.crypto.subtle.deriveKey({name:'PBKDF2', salt, iterations: 100000, hash: 'SHA-256'}, baseKey, {name:'AES-GCM', length: 256}, false, ['encrypt','decrypt']);
}

async function encryptToken(key, dataObj) {
  const enc = new TextEncoder();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const cipher = await window.crypto.subtle.encrypt({name:'AES-GCM', iv}, key, enc.encode(JSON.stringify(dataObj)));
  const combined = new Uint8Array(iv.byteLength + cipher.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipher), iv.byteLength);
  return btoa(String.fromCharCode(...combined));
}

async function decryptToken(key, b64) {
  try {
    const str = atob(b64);
    const data = new Uint8Array(Array.from(str).map(c => c.charCodeAt(0)));
    const iv = data.slice(0,12);
    const cipher = data.slice(12);
    const plain = await window.crypto.subtle.decrypt({name:'AES-GCM', iv}, key, cipher);
    const dec = new TextDecoder();
    return JSON.parse(dec.decode(plain));
  } catch (e) {
    return null;
  }
}

// Store token in localStorage (encrypted)
async function saveAccessToken(email, plan, reference) {
  const passphrase = 'bullstreet-secret-' + (email || 'guest');
  const key = await deriveKey(passphrase);
  const token = {email, plan, reference, ts: Date.now()};
  const enc = await encryptToken(key, token);
  localStorage.setItem('bullstreet_access', enc);
}

async function checkAccess() {
  const enc = localStorage.getItem('bullstreet_access');
  if (!enc) return null;
  // Try to parse email from token via bruteforce of stored email? We store a little helper email in separate key
  const email = localStorage.getItem('bullstreet_access_email');
  if (!email) return null;
  const key = await deriveKey('bullstreet-secret-' + email);
  return await decryptToken(key, enc);
}

// Link behavior: Update course link visibility
async function updateCourseLink() {
  const access = await checkAccess();
  const courseLink = document.getElementById('courseLink');
  if (access) {
    courseLink.innerText = 'Course (Member)';
  } else {
    courseLink.innerText = 'Course (Members only)';
  }
}

// Checkout flow (simulated)
async function handleCheckout() {
  const plan = q('plan') || 'ordinary';
  const planDetails = document.getElementById('planDetails');
  if (planDetails) {
    planDetails.innerHTML = `<p>Selected plan: <strong>${plan}</strong></p>`;
  }

  const form = document.getElementById('checkoutForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const name = fd.get('name');
    const email = fd.get('email');
    const method = fd.get('method');

    // For wire transfer, show instructions and fake reference
    const reference = Math.random().toString(36).slice(2,10).toUpperCase();

    // Simulate payment processing delay
    const message = document.getElementById('message');
    message.style.display = 'block';
    message.innerText = 'Processing payment...';

    await new Promise(r => setTimeout(r, 1200));

    // In a real site you'd call your backend + Stripe/PayPal here.
    // We simulate success and store encrypted token
    await saveAccessToken(email, plan, reference);
    // Save email plain to help decrypt token later (only to derive key client-side)
    localStorage.setItem('bullstreet_access_email', email);

    message.innerText = `Payment complete. Reference: ${reference}. You can now access the course.`;
    document.querySelector('.btn').setAttribute('href','course.html');
    updateCourseLink();
  });
}

// Gate course page
async function gateCoursePage() {
  const locked = document.getElementById('locked');
  const unlocked = document.getElementById('unlocked');
  const access = await checkAccess();
  if (access) {
    locked.style.display = 'none';
    unlocked.style.display = 'block';
    // Show if premium
    if (access.plan === 'premium') {
      // extra note
      const premiumNote = document.createElement('p');
      premiumNote.className='notice';
      premiumNote.innerText = 'You are a premium member — you have access to 1:1 sessions. Contact us to schedule.';
      unlocked.prepend(premiumNote);
    }
  } else {
    locked.style.display = 'block';
    unlocked.style.display = 'none';
  }
}

// --- Cart Management ---
function getCart() {
  const cart = localStorage.getItem('bullstreet_cart');
  return cart ? JSON.parse(cart) : [];
}

function saveCart(cart) {
  localStorage.setItem('bullstreet_cart', JSON.stringify(cart));
}

function addToCart(id, name, price) {
  const cart = getCart();
  const existing = cart.find(item => item.id === id);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ id, name, price, quantity: 1 });
  }
  saveCart(cart);
  // Show feedback
  alert(`${name} added to cart!`);
  // Update cart display if on cart page
  if (document.getElementById('cartItems')) {
    renderCart();
  }
}

function removeFromCart(id) {
  const cart = getCart();
  const filtered = cart.filter(item => item.id !== id);
  saveCart(filtered);
  renderCart();
}

function updateQuantity(id, delta) {
  const cart = getCart();
  const item = cart.find(item => item.id === id);
  if (item) {
    item.quantity = Math.max(1, item.quantity + delta);
    saveCart(cart);
    renderCart();
  }
}

function formatPrice(price) {
  return `$${price.toFixed(2)}`;
}

function renderCart() {
  const cart = getCart();
  const cartItems = document.getElementById('cartItems');
  const emptyCart = document.getElementById('emptyCart');
  const subtotalEl = document.getElementById('subtotal');
  const grandEl = document.getElementById('grand');
  const taxEl = document.getElementById('tax');
  const checkoutBtn = document.getElementById('checkoutBtn');

  if (!cartItems) return;

  if (cart.length === 0) {
    cartItems.style.display = 'none';
    if (emptyCart) emptyCart.style.display = 'block';
    if (subtotalEl) subtotalEl.textContent = formatPrice(0);
    if (taxEl) taxEl.textContent = formatPrice(0);
    if (grandEl) grandEl.textContent = formatPrice(0);
    if (checkoutBtn) checkoutBtn.style.pointerEvents = 'none';
    if (checkoutBtn) checkoutBtn.style.opacity = '0.5';
    return;
  }

  if (emptyCart) emptyCart.style.display = 'none';
  cartItems.style.display = 'block';
  if (checkoutBtn) checkoutBtn.style.pointerEvents = 'auto';
  if (checkoutBtn) checkoutBtn.style.opacity = '1';

  cartItems.innerHTML = cart.map(item => `
    <li class="item">
      <div class="left">
        <div style="width: 54px; height: 54px; background: var(--card); border: 1px solid var(--border); border-radius: 8px; display: grid; place-items: center; font-size: 24px;">📚</div>
        <div>
          <strong>${item.name}</strong>
          <div class="muted">Package</div>
          <button class="link danger" onclick="removeFromCart('${item.id}')">Remove</button>
        </div>
      </div>
      <div class="right">
        <div class="qty">
          <button class="qty-btn" onclick="updateQuantity('${item.id}', -1)">−</button>
          <span class="qty-val">${item.quantity}</span>
          <button class="qty-btn" onclick="updateQuantity('${item.id}', 1)">+</button>
        </div>
        <div class="price">${formatPrice(item.price * item.quantity)}</div>
      </div>
    </li>
  `).join('');

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.1; // 10% tax
  const total = subtotal + tax;

  if (subtotalEl) subtotalEl.textContent = formatPrice(subtotal);
  if (taxEl) taxEl.textContent = formatPrice(tax);
  if (grandEl) grandEl.textContent = formatPrice(total);
}

function renderOrderSummary() {
  const cart = getCart();
  const orderItems = document.getElementById('orderItems');
  const orderSubtotal = document.getElementById('orderSubtotal');
  const orderTax = document.getElementById('orderTax');
  const orderTotal = document.getElementById('orderTotal');

  if (!orderItems) return;

  if (cart.length === 0) {
    orderItems.innerHTML = '<li class="item"><div>No items in cart</div></li>';
    if (orderSubtotal) orderSubtotal.textContent = formatPrice(0);
    if (orderTax) orderTax.textContent = formatPrice(0);
    if (orderTotal) orderTotal.textContent = formatPrice(0);
    return;
  }

  orderItems.innerHTML = cart.map(item => `
    <li class="item">
      <div>
        <strong>${item.name}</strong>
        <div class="muted">Qty ${item.quantity}</div>
      </div>
      <div>${formatPrice(item.price * item.quantity)}</div>
    </li>
  `).join('');

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.1;
  const total = subtotal + tax;

  if (orderSubtotal) orderSubtotal.textContent = formatPrice(subtotal);
  if (orderTax) orderTax.textContent = formatPrice(tax);
  if (orderTotal) orderTotal.textContent = formatPrice(total);
}

// Payment form handling
function handlePaymentForm() {
  const form = document.getElementById('paymentForm');
  if (!form) return;

  const payRadios = form.querySelectorAll('input[name="method"]');
  const cardFields = form.querySelector('.card-fields');
  const mobileFields = form.querySelectorAll('.mobile-fields');

  function updateMethod() {
    const method = form.querySelector('input[name="method"]:checked')?.value;
    if (cardFields) cardFields.classList.toggle('hidden', method !== 'card');
    const allMethodFields = form.querySelectorAll('[data-pay]');
    allMethodFields.forEach(field => {
      const fieldMethod = field.getAttribute('data-pay');
      field.classList.toggle('hidden', method !== fieldMethod);
    });
  }

  payRadios.forEach(r => r.addEventListener('change', updateMethod));
  updateMethod();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const cart = getCart();
    if (cart.length === 0) {
      alert('Your cart is empty!');
      return;
    }

    const fd = new FormData(form);
    const name = fd.get('name');
    const email = fd.get('email');
    const method = fd.get('method');
    const reference = Math.random().toString(36).slice(2,10).toUpperCase();

    // Get all plans from cart
    const plans = cart.map(item => item.id);

    // Simulate payment processing
    const submitBtn = form.querySelector('.pay-btn');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Processing...';
    submitBtn.disabled = true;

    await new Promise(r => setTimeout(r, 1500));

    // Save access tokens for all purchased plans
    for (const plan of plans) {
      await saveAccessToken(email, plan, reference);
    }
    localStorage.setItem('bullstreet_access_email', email);

    // Clear cart
    saveCart([]);

    submitBtn.textContent = originalText;
    submitBtn.disabled = false;

    alert(`Payment complete! Reference: ${reference}. You can now access the course.`);
    window.location.href = 'course.html';
  });
}

// Make functions global for onclick handlers
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateQuantity = updateQuantity;

// Init script for pages
document.addEventListener('DOMContentLoaded', () => {
  updateCourseLink();
  
  // Cart page
  if (document.getElementById('cartItems')) {
    renderCart();
  }
  
  // Payment page
  if (document.getElementById('paymentForm')) {
    handlePaymentForm();
    renderOrderSummary();
  }
  
  // Old checkout page (backward compatibility)
  if (document.body.classList.contains('checkout') || document.getElementById('checkoutForm')) {
    handleCheckout();
  }
  
  // Course page
  if (document.getElementById('courseContent')) {
    gateCoursePage();
  }
  
  // Market widget
  if (document.getElementById('marketChart')) {
    initMarketWidget();
  }
});

// --- Auto-rotating Real-time market widget (TradingView-style) ---
let marketChart = null;
let marketWs = null;
let marketTimer = null;
let rotationTimer = null;
let currentPairIndex = 0;
let currentPrice = 0;
let previousPrice = 0;
const currentInterval = '1m';
const maxPoints = 100;
const rotationInterval = 10000; // 10 seconds

const tradingPairs = [
  // Forex Pairs (Major)
  { symbol: 'EURUSD', name: 'EUR/USD', color: '#00d4ff', type: 'forex' },
  { symbol: 'GBPUSD', name: 'GBP/USD', color: '#00b8d4', type: 'forex' },
  { symbol: 'USDJPY', name: 'USD/JPY', color: '#00e5ff', type: 'forex' },
  { symbol: 'AUDUSD', name: 'AUD/USD', color: '#00c4e0', type: 'forex' },
  { symbol: 'USDCAD', name: 'USD/CAD', color: '#00a8cc', type: 'forex' },
  { symbol: 'NZDUSD', name: 'NZD/USD', color: '#0099b8', type: 'forex' },
  // Stocks (Major Indices)
  { symbol: 'SPX500', name: 'S&P 500', color: '#f7931a', type: 'stock' },
  { symbol: 'NAS100', name: 'NASDAQ', color: '#627eea', type: 'stock' },
  // Crypto (Popular)
  { symbol: 'BTCUSDT', name: 'BTC/USDT', color: '#f7931a', type: 'crypto' },
  { symbol: 'ETHUSDT', name: 'ETH/USDT', color: '#627eea', type: 'crypto' }
];

function createChart(ctx) {
  // Create a TradingView-style candlestick chart
  try {
    return new Chart(ctx, {
      type: 'candlestick',
      data: {
        datasets: [{
          label: 'Price',
          data: [],
          upColor: '#00ff88',
          downColor: '#ff4b5c',
          borderUpColor: '#00ff88',
          borderDownColor: '#ff4b5c',
          borderColor: 'rgba(255,255,255,0.1)'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: true,
            backgroundColor: 'rgba(5, 10, 20, 0.95)',
            borderColor: 'var(--border)',
            borderWidth: 1,
            titleColor: 'var(--text)',
            bodyColor: 'var(--text)',
            padding: 12
          }
        },
        scales: {
          x: {
            type: 'time',
            time: { unit: 'minute', displayFormats: { minute: 'HH:mm' } },
            grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false },
            ticks: { color: 'var(--muted)', font: { size: 11 } }
          },
          y: {
            position: 'right',
            grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false },
            ticks: { color: 'var(--text)', font: { size: 11 } }
          }
        },
        animation: { duration: 0 }
      }
    });
  } catch (e) {
    // fallback to line chart
    return new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Price',
          data: [],
          borderColor: 'var(--accent)',
          backgroundColor: 'rgba(0, 212, 255, 0.1)',
          pointRadius: 0,
          borderWidth: 2,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false },
            ticks: { color: 'var(--muted)', font: { size: 11 } }
          },
          y: {
            position: 'right',
            grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false },
            ticks: { color: 'var(--text)', font: { size: 11 } }
          }
        },
        animation: { duration: 0 }
      }
    });
  }
}

function pushCandle(candle) {
  if (!marketChart) return;
  const ds = marketChart.data.datasets[0].data;
  const last = ds[ds.length - 1];
  if (last && last.x && new Date(last.x).getTime() === new Date(candle.x).getTime()) {
    ds[ds.length - 1] = candle;
  } else {
    ds.push(candle);
  }
  while (ds.length > maxPoints) ds.shift();
  marketChart.update('none');
  
  // Update price display
  currentPrice = candle.c;
  updatePriceDisplay();
}

async function fetchInitialKlines(symbol, interval) {
  const pair = tradingPairs.find(p => p.symbol === symbol);
  
  // For Forex/Stocks, generate simulated data
  if (pair && (pair.type === 'forex' || pair.type === 'stock')) {
    const basePrice = pair.type === 'forex' ? 1.1000 : 4000;
    const parsed = [];
    for (let i = 0; i < maxPoints; i++) {
      const price = basePrice + (Math.random() - 0.5) * 0.02;
      parsed.push({
        x: new Date(Date.now() - (maxPoints - i) * 60000),
        o: price,
        h: price + Math.random() * 0.005,
        l: price - Math.random() * 0.005,
        c: price + (Math.random() - 0.5) * 0.002
      });
    }
    if (marketChart && marketChart.data.datasets[0]) {
      marketChart.data.datasets[0].data = parsed;
      marketChart.update();
      if (parsed.length > 0) {
        currentPrice = parsed[parsed.length - 1].c;
        previousPrice = parsed.length > 1 ? parsed[parsed.length - 2].c : currentPrice;
        updatePriceDisplay();
      }
    }
    return;
  }
  
  // For Crypto, use Binance API
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${maxPoints}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    const parsed = data.map(d => ({ 
      x: new Date(d[0]), 
      o: parseFloat(d[1]), 
      h: parseFloat(d[2]), 
      l: parseFloat(d[3]), 
      c: parseFloat(d[4]) 
    }));
    if (marketChart && marketChart.data.datasets[0]) {
      marketChart.data.datasets[0].data = parsed;
      marketChart.update();
      if (parsed.length > 0) {
        currentPrice = parsed[parsed.length - 1].c;
        previousPrice = parsed.length > 1 ? parsed[parsed.length - 2].c : currentPrice;
        updatePriceDisplay();
      }
    }
  } catch (e) {
    console.warn('Initial klines fetch failed, will simulate instead', e);
    startSimulateCandles();
  }
}

function connectBinanceKline(symbol, interval) {
  const pair = tradingPairs.find(p => p.symbol === symbol);
  
  // Only connect to Binance for crypto pairs
  if (pair && pair.type === 'crypto') {
    try {
      const stream = `${symbol.toLowerCase()}@kline_${interval}`;
      const url = `wss://stream.binance.com:9443/ws/${stream}`;
      
      if (marketWs) {
        marketWs.close();
      }
      
      marketWs = new WebSocket(url);
      
      marketWs.onopen = () => {
        console.log(`Connected to ${symbol} ${interval}`);
      };
      
      marketWs.onmessage = (ev) => {
        const msg = JSON.parse(ev.data);
        const k = msg.k;
        const candle = { 
          x: new Date(k.t), 
          o: parseFloat(k.o), 
          h: parseFloat(k.h), 
          l: parseFloat(k.l), 
          c: parseFloat(k.c) 
        };
        previousPrice = currentPrice;
        pushCandle(candle);
      };
      
      marketWs.onclose = () => {
        console.log(`Disconnected from ${symbol}`);
      };
      
      marketWs.onerror = (err) => {
        console.error('WebSocket error:', err);
        startSimulateCandles();
      };
    } catch (e) {
      console.error('Connection error:', e);
      startSimulateCandles();
    }
  } else {
    // For Forex/Stocks, use simulation
    startSimulateCandles();
  }
}

function startSimulateCandles() {
  if (marketTimer) clearInterval(marketTimer);
  const pair = tradingPairs[currentPairIndex];
  const isForex = pair && pair.type === 'forex';
  const isStock = pair && pair.type === 'stock';
  
  // Set base price based on pair type
  let last = marketChart?.data?.datasets[0]?.data?.slice(-1)[0]?.c;
  if (!last) {
    if (isForex) last = 1.1000;
    else if (isStock) last = 4000;
    else last = 50000;
  }
  
  marketTimer = setInterval(() => {
    const open = last;
    const volatility = isForex ? 0.0001 : (isStock ? 5 : open * 0.006);
    const change = (Math.random() - 0.45) * volatility;
    const close = Math.max(0.0001, open + change);
    const high = Math.max(open, close) + Math.abs(change) * Math.random();
    const low = Math.min(open, close) - Math.abs(change) * Math.random();
    const decimals = isForex ? 5 : (isStock ? 2 : 2);
    const candle = { 
      x: new Date(), 
      o: parseFloat(open.toFixed(decimals)), 
      h: parseFloat(high.toFixed(decimals)), 
      l: parseFloat(low.toFixed(decimals)), 
      c: parseFloat(close.toFixed(decimals)) 
    };
    previousPrice = currentPrice;
    last = close;
    pushCandle(candle);
  }, 1000);
}

function updatePriceDisplay() {
  const priceEl = document.getElementById('currentPrice');
  const changeEl = document.getElementById('priceChange');
  const pairLabel = document.getElementById('currentPairLabel');
  
  const currentPair = tradingPairs[currentPairIndex];
  const isForex = currentPair && currentPair.type === 'forex';
  const decimals = isForex ? 5 : 2;
  
  if (priceEl && currentPrice > 0) {
    if (isForex) {
      priceEl.textContent = currentPrice.toFixed(decimals);
    } else {
      priceEl.textContent = `$${currentPrice.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
    }
  }
  
  if (changeEl && previousPrice > 0) {
    const change = ((currentPrice - previousPrice) / previousPrice) * 100;
    const changeValue = change.toFixed(2);
    changeEl.textContent = `${change >= 0 ? '+' : ''}${changeValue}%`;
    changeEl.className = `change ${change >= 0 ? 'positive' : 'negative'}`;
  }
  
  if (pairLabel && currentPair) {
    pairLabel.textContent = currentPair.name;
  }
}

async function switchToNextPair() {
  const container = document.querySelector('.market-chart-container');
  
  // Fade out
  if (container) {
    container.style.opacity = '0.7';
  }
  
  // Close current connection
  if (marketWs) {
    marketWs.close();
    marketWs = null;
  }
  if (marketTimer) {
    clearInterval(marketTimer);
    marketTimer = null;
  }
  
  // Clear chart data
  if (marketChart && marketChart.data.datasets[0]) {
    marketChart.data.datasets[0].data = [];
    marketChart.update();
  }
  
  // Move to next pair
  currentPairIndex = (currentPairIndex + 1) % tradingPairs.length;
  const pair = tradingPairs[currentPairIndex];
  
  // Update label
  const pairLabel = document.getElementById('currentPairLabel');
  if (pairLabel) {
    pairLabel.textContent = pair.name;
  }
  
  // Reset price display
  currentPrice = 0;
  previousPrice = 0;
  updatePriceDisplay();
  
  // Fetch initial data and connect
  try {
    await fetchInitialKlines(pair.symbol, currentInterval);
    connectBinanceKline(pair.symbol, currentInterval);
  } catch (e) {
    console.warn('Failed to connect, using simulation');
    startSimulateCandles();
  }
  
  // Fade in
  if (container) {
    setTimeout(() => {
      container.style.opacity = '1';
    }, 100);
  }
}

function initMarketWidget() {
  const canvas = document.getElementById('marketChart');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  marketChart = createChart(ctx);
  
  // Start with first pair
  const pair = tradingPairs[currentPairIndex];
  const pairLabel = document.getElementById('currentPairLabel');
  if (pairLabel) {
    pairLabel.textContent = pair.name;
  }
  
  // Fetch initial data and connect
  fetchInitialKlines(pair.symbol, currentInterval).then(() => {
    try {
      connectBinanceKline(pair.symbol, currentInterval);
    } catch (e) {
      startSimulateCandles();
    }
  }).catch(() => {
    startSimulateCandles();
  });
  
  // Auto-rotate every 10 seconds
  rotationTimer = setInterval(() => {
    switchToNextPair();
  }, rotationInterval);
}
