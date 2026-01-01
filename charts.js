// Premium Trading Charts Page

let currentSymbol = 'EURUSD';
let currentTimeframe = '1';
let tradingViewWidget = null;
let orderBookWs = null;
let tradesWs = null;
let tickerWs = null;

// Trading pairs data - Mix of Forex, Stocks, and Crypto (mainly Forex)
const tradingPairs = [
  // Forex Pairs (Major)
  { symbol: 'EURUSD', name: 'EUR/USD', color: '#00d4ff', type: 'forex' },
  { symbol: 'GBPUSD', name: 'GBP/USD', color: '#00b8d4', type: 'forex' },
  { symbol: 'USDJPY', name: 'USD/JPY', color: '#00e5ff', type: 'forex' },
  { symbol: 'AUDUSD', name: 'AUD/USD', color: '#00c4e0', type: 'forex' },
  { symbol: 'USDCAD', name: 'USD/CAD', color: '#00a8cc', type: 'forex' },
  { symbol: 'NZDUSD', name: 'NZD/USD', color: '#0099b8', type: 'forex' },
  { symbol: 'EURGBP', name: 'EUR/GBP', color: '#0088a3', type: 'forex' },
  { symbol: 'USDCHF', name: 'USD/CHF', color: '#00778f', type: 'forex' },
  // Stocks (Major Indices)
  { symbol: 'SPX500', name: 'S&P 500', color: '#f7931a', type: 'stock' },
  { symbol: 'NAS100', name: 'NASDAQ', color: '#627eea', type: 'stock' },
  { symbol: 'DJ30', name: 'Dow Jones', color: '#f3ba2f', type: 'stock' },
  // Crypto (Popular)
  { symbol: 'BTCUSDT', name: 'BTC/USDT', color: '#f7931a', type: 'crypto' },
  { symbol: 'ETHUSDT', name: 'ETH/USDT', color: '#627eea', type: 'crypto' },
  { symbol: 'BNBUSDT', name: 'BNB/USDT', color: '#f3ba2f', type: 'crypto' }
];

// Initialize 3D particles background
function initParticles() {
  const canvas = document.getElementById('particlesCanvas');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  
  const particles = [];
  const particleCount = 50;
  
  class Particle {
    constructor() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.z = Math.random() * 1000;
      this.size = Math.random() * 2 + 1;
      this.speed = Math.random() * 0.5 + 0.2;
    }
    
    update() {
      this.z -= this.speed;
      if (this.z <= 0) {
        this.z = 1000;
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
      }
    }
    
    draw() {
      const x = (this.x - canvas.width / 2) * (1000 / this.z) + canvas.width / 2;
      const y = (this.y - canvas.height / 2) * (1000 / this.z) + canvas.height / 2;
      const size = this.size * (1000 / this.z);
      
      if (x >= 0 && x <= canvas.width && y >= 0 && y <= canvas.height) {
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 212, 255, ${0.5 * (1000 / this.z)})`;
        ctx.fill();
      }
    }
  }
  
  for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle());
  }
  
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(particle => {
      particle.update();
      particle.draw();
    });
    requestAnimationFrame(animate);
  }
  
  animate();
  
  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });
}

// Initialize TradingView widget (using embed widget)
function initTradingView() {
  const container = document.getElementById('tradingview-widget');
  if (!container) return;
  
  // Use TradingView embed widget
  const tvSymbol = getTradingViewSymbol(currentSymbol);
  const timeframe = currentTimeframe === 'D' ? '1D' : currentTimeframe + 'm';
  
  container.innerHTML = `
    <div class="tradingview-widget-container__widget"></div>
    <script type="text/javascript" src="https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js" async>
    {
      "autosize": true,
      "symbol": "${tvSymbol}",
      "interval": "${timeframe}",
      "timezone": "Etc/UTC",
      "theme": "dark",
      "style": "1",
      "locale": "en",
      "backgroundColor": "#0a1118",
      "gridColor": "rgba(255, 255, 255, 0.05)",
      "upColor": "#00ff88",
      "downColor": "#ff4b5c",
      "chartType": "candles",
      "hide_top_toolbar": false,
      "hide_legend": false,
      "save_image": true,
      "support_host": "https://www.tradingview.com"
    }
    </script>
  `;
}

// Fallback: Use Chart.js with real Binance data
function initChartJS() {
  const container = document.getElementById('tradingview-widget');
  if (!container) return;
  
  container.innerHTML = '<canvas id="chartCanvas"></canvas>';
  const canvas = document.getElementById('chartCanvas');
  if (!canvas) return;
  
  // Check if Chart.js is available
  if (typeof Chart === 'undefined') {
    container.innerHTML = `
      <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: var(--muted);">
        <div style="text-align: center;">
          <div style="font-size: 48px; margin-bottom: 16px;">📈</div>
          <div>Loading Chart Library...</div>
        </div>
      </div>
    `;
    return;
  }
  
  // Initialize Chart.js candlestick chart
  initBinanceChart(canvas);
}

// Initialize Chart.js with Binance data
let binanceChart = null;
let binanceWs = null;

async function initBinanceChart(canvas) {
  const container = canvas.parentElement;
  const ctx = canvas.getContext('2d');
  
  // Set canvas size
  const resizeCanvas = () => {
    canvas.width = container.offsetWidth;
    canvas.height = container.offsetHeight;
  };
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  
  // Fetch initial klines
  const interval = currentTimeframe === 'D' ? '1d' : currentTimeframe + 'm';
  const limit = 200;
  
  try {
    const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${currentSymbol}&interval=${interval}&limit=${limit}`);
    const klines = await response.json();
    
    const data = klines.map(k => ({
      x: new Date(k[0]),
      o: parseFloat(k[1]),
      h: parseFloat(k[2]),
      l: parseFloat(k[3]),
      c: parseFloat(k[4]),
      v: parseFloat(k[5])
    }));
    
    // Create candlestick chart
    try {
      binanceChart = new Chart(ctx, {
        type: 'candlestick',
        data: {
          datasets: [{
            label: currentSymbol,
            data: data,
            upColor: '#00ff88',
            downColor: '#ff4b5c',
            borderUpColor: '#00ff88',
            borderDownColor: '#ff4b5c'
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
              bodyColor: 'var(--text)'
            }
          },
          scales: {
            x: {
              type: 'time',
              time: { unit: 'minute' },
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
      // Fallback to line chart if candlestick not available
      binanceChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: data.map(d => d.x),
          datasets: [{
            label: currentSymbol,
            data: data.map(d => d.c),
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
    
    // Connect to WebSocket for real-time updates
    connectBinanceStream(currentSymbol, interval);
  } catch (e) {
    console.error('Failed to initialize chart:', e);
    container.innerHTML = `
      <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: var(--muted);">
        <div style="text-align: center;">
          <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
          <div>Failed to load chart data</div>
        </div>
      </div>
    `;
  }
}

function connectBinanceStream(symbol, interval) {
  if (binanceWs) {
    binanceWs.close();
  }
  
  const pair = tradingPairs.find(p => p.symbol === symbol);
  
  // Only connect to Binance for crypto pairs
  if (pair && pair.type === 'crypto') {
    const stream = `${symbol.toLowerCase()}@kline_${interval}`;
    const url = `wss://stream.binance.com:9443/ws/${stream}`;
    
    binanceWs = new WebSocket(url);
    
    binanceWs.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const k = data.k;
      
      if (binanceChart && binanceChart.data.datasets[0]) {
        const candle = {
          x: new Date(k.t),
          o: parseFloat(k.o),
          h: parseFloat(k.h),
          l: parseFloat(k.l),
          c: parseFloat(k.c)
        };
        
        const dataset = binanceChart.data.datasets[0].data;
        const last = dataset[dataset.length - 1];
        
        if (last && new Date(last.x).getTime() === candle.x.getTime()) {
          dataset[dataset.length - 1] = candle;
        } else {
          dataset.push(candle);
          if (dataset.length > 200) dataset.shift();
        }
        
        binanceChart.update('none');
      }
    };
    
    binanceWs.onerror = () => {
      // Fallback to simulation
      startSimulateCandles();
    };
  } else {
    // For Forex/Stocks, use simulation
    startSimulateCandles();
  }
}

// Fetch market data (handles Forex, Stocks, and Crypto)
async function fetchMarketData(symbol) {
  const pair = tradingPairs.find(p => p.symbol === symbol);
  
  // For Forex and Stocks, use simulated data (in production, use a Forex/Stock API)
  if (pair && (pair.type === 'forex' || pair.type === 'stock')) {
    // Simulate Forex/Stock data
    const basePrice = pair.type === 'forex' ? (Math.random() * 0.5 + 0.8) : (Math.random() * 5000 + 3000);
    const lastPrice = basePrice.toFixed(pair.type === 'forex' ? 5 : 2);
    const change = (Math.random() * 2 - 1).toFixed(2);
    const simulatedData = {
      lastPrice: lastPrice,
      priceChangePercent: change,
      highPrice: (parseFloat(lastPrice) + Math.random() * 0.01).toFixed(pair.type === 'forex' ? 5 : 2),
      lowPrice: (parseFloat(lastPrice) - Math.random() * 0.01).toFixed(pair.type === 'forex' ? 5 : 2)
    };
    updateMarketStats(simulatedData);
    return simulatedData;
  }
  
  // For Crypto, use Binance API
  try {
    const response = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`);
    const data = await response.json();
    updateMarketStats(data);
    return data;
  } catch (e) {
    console.error('Failed to fetch market data:', e);
    // Fallback to simulated data
    const simulatedData = {
      lastPrice: (Math.random() * 50000 + 10000).toFixed(2),
      priceChangePercent: (Math.random() * 10 - 5).toFixed(2),
      highPrice: (Math.random() * 1000 + 50000).toFixed(2),
      lowPrice: (Math.random() * 1000 + 49000).toFixed(2)
    };
    updateMarketStats(simulatedData);
    return simulatedData;
  }
}

// Update market statistics
function updateMarketStats(data) {
  const priceEl = document.getElementById('currentPrice');
  const changeEl = document.getElementById('priceChange');
  const highEl = document.getElementById('high24h');
  const lowEl = document.getElementById('low24h');
  
  if (priceEl) {
    priceEl.textContent = `$${parseFloat(data.lastPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 })}`;
  }
  
  if (changeEl) {
    const change = parseFloat(data.priceChangePercent);
    changeEl.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
    changeEl.className = `stat-value change ${change >= 0 ? 'positive' : 'negative'}`;
  }
  
  if (highEl) {
    highEl.textContent = `$${parseFloat(data.highPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 })}`;
  }
  
  if (lowEl) {
    lowEl.textContent = `$${parseFloat(data.lowPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 })}`;
  }
}

// Connect to order book WebSocket (only for crypto pairs)
function connectOrderBook(symbol) {
  if (orderBookWs) {
    orderBookWs.close();
  }
  
  const pair = tradingPairs.find(p => p.symbol === symbol);
  
  // Only connect to Binance for crypto pairs
  if (pair && pair.type === 'crypto') {
    const stream = `${symbol.toLowerCase()}@depth20@100ms`;
    const url = `wss://stream.binance.com:9443/ws/${stream}`;
    
    orderBookWs = new WebSocket(url);
    
    orderBookWs.onmessage = (event) => {
      const data = JSON.parse(event.data);
      updateOrderBook(data);
    };
    
    orderBookWs.onerror = (error) => {
      console.error('Order book WebSocket error:', error);
      // Simulate order book for demo
      simulateOrderBook();
    };
  } else {
    // Simulate order book for Forex/Stocks
    simulateOrderBook();
  }
}

// Simulate order book for Forex/Stocks
function simulateOrderBook() {
  const basePrice = parseFloat(document.getElementById('currentPrice')?.textContent.replace(/[^0-9.]/g, '') || '1.1000');
  const asks = [];
  const bids = [];
  
  for (let i = 0; i < 10; i++) {
    const askPrice = basePrice + (i + 1) * 0.0001;
    const bidPrice = basePrice - (i + 1) * 0.0001;
    const amount = (Math.random() * 100 + 10).toFixed(4);
    
    asks.push([askPrice.toFixed(5), amount]);
    bids.push([bidPrice.toFixed(5), amount]);
  }
  
  updateOrderBook({ a: asks, b: bids });
}

// Update order book display
function updateOrderBook(data) {
  const asksContainer = document.getElementById('orderbookAsks');
  const bidsContainer = document.getElementById('orderbookBids');
  
  if (!asksContainer || !bidsContainer) return;
  
  // Sort asks (ascending) and bids (descending)
  const asks = data.a.slice(0, 10).sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]));
  const bids = data.b.slice(0, 10).sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]));
  
  // Calculate spread
  if (asks.length > 0 && bids.length > 0) {
    const bestAsk = parseFloat(asks[0][0]);
    const bestBid = parseFloat(bids[0][0]);
    const spread = bestAsk - bestBid;
    const spreadPercent = (spread / bestBid) * 100;
    
    const spreadValue = document.getElementById('spreadValue');
    const spreadPercentEl = document.getElementById('spreadPercent');
    
    if (spreadValue) spreadValue.textContent = `$${spread.toFixed(2)}`;
    if (spreadPercentEl) spreadPercentEl.textContent = `${spreadPercent.toFixed(2)}%`;
  }
  
  // Render asks
  asksContainer.innerHTML = asks.map(ask => {
    const price = parseFloat(ask[0]);
    const amount = parseFloat(ask[1]);
    const total = price * amount;
    return `
      <div class="orderbook-row">
        <span class="orderbook-row-price">${price.toFixed(2)}</span>
        <span class="orderbook-row-amount">${amount.toFixed(4)}</span>
        <span class="orderbook-row-total">${total.toFixed(2)}</span>
      </div>
    `;
  }).join('');
  
  // Render bids
  bidsContainer.innerHTML = bids.map(bid => {
    const price = parseFloat(bid[0]);
    const amount = parseFloat(bid[1]);
    const total = price * amount;
    return `
      <div class="orderbook-row">
        <span class="orderbook-row-price">${price.toFixed(2)}</span>
        <span class="orderbook-row-amount">${amount.toFixed(4)}</span>
        <span class="orderbook-row-total">${total.toFixed(2)}</span>
      </div>
    `;
  }).join('');
}

// Connect to trades WebSocket (only for crypto pairs)
function connectTrades(symbol) {
  if (tradesWs) {
    tradesWs.close();
  }
  
  const pair = tradingPairs.find(p => p.symbol === symbol);
  
  // Only connect to Binance for crypto pairs
  if (pair && pair.type === 'crypto') {
    const stream = `${symbol.toLowerCase()}@trade`;
    const url = `wss://stream.binance.com:9443/ws/${stream}`;
    
    tradesWs = new WebSocket(url);
    const recentTrades = [];
    
    tradesWs.onmessage = (event) => {
      const data = JSON.parse(event.data);
      recentTrades.unshift({
        price: parseFloat(data.p),
        amount: parseFloat(data.q),
        time: new Date(data.T),
        isBuyer: data.m
      });
      
      if (recentTrades.length > 20) {
        recentTrades.pop();
      }
      
      updateTradesList(recentTrades);
    };
    
    tradesWs.onerror = (error) => {
      console.error('Trades WebSocket error:', error);
      simulateTrades();
    };
  } else {
    // Simulate trades for Forex/Stocks
    simulateTrades();
  }
}

// Simulate trades for Forex/Stocks
function simulateTrades() {
  const basePrice = parseFloat(document.getElementById('currentPrice')?.textContent.replace(/[^0-9.]/g, '') || '1.1000');
  const recentTrades = [];
  
  for (let i = 0; i < 20; i++) {
    const price = basePrice + (Math.random() - 0.5) * 0.001;
    recentTrades.push({
      price: price,
      amount: Math.random() * 10 + 1,
      time: new Date(Date.now() - i * 60000),
      isBuyer: Math.random() > 0.5
    });
  }
  
  updateTradesList(recentTrades);
  
  // Update trades periodically
  setInterval(() => {
    const newPrice = basePrice + (Math.random() - 0.5) * 0.001;
    recentTrades.unshift({
      price: newPrice,
      amount: Math.random() * 10 + 1,
      time: new Date(),
      isBuyer: Math.random() > 0.5
    });
    if (recentTrades.length > 20) recentTrades.pop();
    updateTradesList(recentTrades);
  }, 3000);
}

// Update trades list
function updateTradesList(trades) {
  const container = document.getElementById('tradesList');
  if (!container) return;
  
  container.innerHTML = trades.map(trade => {
    const timeStr = trade.time.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return `
      <div class="trade-item">
        <span class="trade-price ${trade.isBuyer ? 'sell' : 'buy'}">${trade.price.toFixed(2)}</span>
        <span class="trade-amount">${trade.amount.toFixed(4)}</span>
        <span class="trade-time">${timeStr}</span>
      </div>
    `;
  }).join('');
}

// Update market list
function updateMarketList() {
  const container = document.getElementById('marketList');
  if (!container) return;
  
  // Fetch market data (handle Forex/Stocks differently)
  Promise.all(tradingPairs.map(async pair => {
    if (pair.type === 'crypto') {
      try {
        const response = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${pair.symbol}`);
        const data = await response.json();
        return { ...pair, data };
      } catch (e) {
        // Simulate data for crypto if API fails
        return {
          ...pair,
          data: {
            lastPrice: (Math.random() * 50000 + 10000).toFixed(2),
            priceChangePercent: (Math.random() * 10 - 5).toFixed(2)
          }
        };
      }
    } else {
      // Simulate Forex/Stock data
      return {
        ...pair,
        data: {
          lastPrice: (Math.random() * 2 + 0.5).toFixed(5),
          priceChangePercent: (Math.random() * 2 - 1).toFixed(2)
        }
      };
    }
  })).then(pairsWithData => {
    container.innerHTML = pairsWithData.map(pair => {
      if (!pair.data) return '';
      const change = parseFloat(pair.data.priceChangePercent);
      const isActive = pair.symbol === currentSymbol;
      return `
        <div class="market-item ${isActive ? 'active' : ''}" data-symbol="${pair.symbol}">
          <span class="market-item-symbol">${pair.name}</span>
          <div style="display: flex; gap: 12px; align-items: center;">
            <span class="market-item-price">$${parseFloat(pair.data.lastPrice).toFixed(2)}</span>
            <span class="market-item-change ${change >= 0 ? 'positive' : 'negative'}">
              ${change >= 0 ? '+' : ''}${change.toFixed(2)}%
            </span>
          </div>
        </div>
      `;
    }).join('');
    
    // Add click handlers
    container.querySelectorAll('.market-item').forEach(item => {
      item.addEventListener('click', () => {
        const symbol = item.dataset.symbol;
        switchSymbol(symbol);
      });
    });
  });
}

// Switch trading symbol
function switchSymbol(symbol) {
  currentSymbol = symbol;
  const pair = tradingPairs.find(p => p.symbol === symbol);
  
  // Update UI
  document.getElementById('chartSymbol').textContent = pair ? pair.name : symbol;
  document.querySelectorAll('.symbol-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.symbol === symbol);
  });
  
  // Update chart - reload TradingView widget
  initTradingView();
  
  // Update Chart.js if it exists
  if (binanceChart) {
    const interval = currentTimeframe === 'D' ? '1d' : currentTimeframe + 'm';
    const pair = tradingPairs.find(p => p.symbol === symbol);
    
    if (pair && pair.type === 'crypto') {
      fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=200`)
        .then(r => r.json())
        .then(klines => {
          const data = klines.map(k => ({
            x: new Date(k[0]),
            o: parseFloat(k[1]),
            h: parseFloat(k[2]),
            l: parseFloat(k[3]),
            c: parseFloat(k[4])
          }));
          binanceChart.data.datasets[0].data = data;
          binanceChart.data.datasets[0].label = symbol;
          binanceChart.update();
          connectBinanceStream(symbol, interval);
        });
    } else {
      // Simulate data for Forex/Stocks
      const simulatedData = [];
      const basePrice = 1.1000;
      for (let i = 0; i < 200; i++) {
        const price = basePrice + (Math.random() - 0.5) * 0.01;
        simulatedData.push({
          x: new Date(Date.now() - (200 - i) * 60000),
          o: price,
          h: price + Math.random() * 0.002,
          l: price - Math.random() * 0.002,
          c: price + (Math.random() - 0.5) * 0.001
        });
      }
      binanceChart.data.datasets[0].data = simulatedData;
      binanceChart.data.datasets[0].label = symbol;
      binanceChart.update();
    }
  }
  
  // Update data
  fetchMarketData(symbol);
  connectOrderBook(symbol);
  connectTrades(symbol);
  updateMarketList();
}

// Switch timeframe
function switchTimeframe(tf) {
  currentTimeframe = tf;
  
  document.querySelectorAll('.tf-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tf === tf);
  });
  
  // Reload chart with new timeframe
  initTradingView();
  
  // Update Chart.js if it exists
  if (binanceChart) {
    const interval = tf === 'D' ? '1d' : tf + 'm';
    fetch(`https://api.binance.com/api/v3/klines?symbol=${currentSymbol}&interval=${interval}&limit=200`)
      .then(r => r.json())
      .then(klines => {
        const data = klines.map(k => ({
          x: new Date(k[0]),
          o: parseFloat(k[1]),
          h: parseFloat(k[2]),
          l: parseFloat(k[3]),
          c: parseFloat(k[4])
        }));
        binanceChart.data.datasets[0].data = data;
        binanceChart.update();
        connectBinanceStream(currentSymbol, interval);
      });
  }
}

// Initialize page
function initChartsPage() {
  // Initialize 3D particles
  initParticles();
  
  // Initialize TradingView widget
  initTradingView();
  
  // Also initialize Chart.js as backup
  setTimeout(() => {
    if (!document.querySelector('.tradingview-widget-container__widget')) {
      initChartJS();
    }
  }, 2000);
  
  // Initialize symbol buttons
  document.querySelectorAll('.symbol-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      switchSymbol(btn.dataset.symbol);
    });
  });
  
  // Initialize timeframe buttons
  document.querySelectorAll('.tf-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      switchTimeframe(btn.dataset.tf);
    });
  });
  
  // Initialize controls
  const fullscreenBtn = document.getElementById('fullscreenBtn');
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', () => {
      document.body.classList.toggle('fullscreen');
      const main = document.querySelector('.charts-main');
      if (main) {
        main.classList.toggle('fullscreen');
      }
    });
  }
  
  // Load initial data
  fetchMarketData(currentSymbol);
  connectOrderBook(currentSymbol);
  connectTrades(currentSymbol);
  updateMarketList();
  
  // Update market list every 30 seconds
  setInterval(updateMarketList, 30000);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initChartsPage);
} else {
  initChartsPage();
}

