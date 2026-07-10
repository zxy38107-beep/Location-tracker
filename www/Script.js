// ---------- State ----------
let homeLocation = JSON.parse(localStorage.getItem('homeLocation') || 'null');
let radius = parseInt(localStorage.getItem('radius') || '100', 10);
let watchId = null;
let isInsideHome = false;
let lastNotifiedAt = 0;

// ---------- Elements ----------
const setupCard = document.getElementById('setup-card');
const homeCard = document.getElementById('home-card');
const trackingCard = document.getElementById('tracking-card');
const logCard = document.getElementById('log-card');

const setHomeBtn = document.getElementById('set-home-btn');
const changeHomeBtn = document.getElementById('change-home-btn');
const homeCoordsEl = document.getElementById('home-coords');

const radiusSlider = document.getElementById('radius-slider');
const radiusValue = document.getElementById('radius-value');

const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const distanceText = document.getElementById('distance-text');
const lastUpdate = document.getElementById('last-update');
const logList = document.getElementById('log-list');

const addressInput = document.getElementById('address-input');
const searchBtn = document.getElementById('search-btn');
const searchResults = document.getElementById('search-results');

// ---------- Helpers ----------
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // meters
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function addLog(message) {
  logCard.hidden = false;
  const li = document.createElement('li');
  const time = new Date().toLocaleTimeString();
  li.textContent = `${time} — ${message}`;
  logList.prepend(li);
}

function requestNotificationPermission() {
  if (window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.LocalNotifications) {
    Capacitor.Plugins.LocalNotifications.requestPermissions();
    return;
  }
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function notifyArrivedHome() {
  const now = Date.now();
  if (now - lastNotifiedAt < 5 * 60 * 1000) return; // avoid spamming, 5 min cooldown
  lastNotifiedAt = now;

  if (window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.LocalNotifications) {
    Capacitor.Plugins.LocalNotifications.schedule({
      notifications: [
        {
          id: Math.floor(Math.random() * 100000),
          title: 'Welcome home 🏠',
          body: 'You have arrived home.',
        },
      ],
    });
  } else if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Welcome home 🏠', { body: 'You have arrived home.' });
  }
  addLog('Arrived home ✅');
}

function renderHomeCard() {
  if (!homeLocation) return;
  setupCard.hidden = true;
  homeCard.hidden = false;
  trackingCard.hidden = false;
  homeCoordsEl.textContent = `Lat ${homeLocation.lat.toFixed(5)}, Lng ${homeLocation.lng.toFixed(5)}`;
  radiusSlider.value = radius;
  radiusValue.textContent = radius;
}

function saveHome(lat, lng) {
  homeLocation = { lat, lng };
  localStorage.setItem('homeLocation', JSON.stringify(homeLocation));
  renderHomeCard();
  addLog('Home location set');
}

// ---------- Set home via current location ----------
setHomeBtn.addEventListener('click', () => {
  if (!navigator.geolocation) {
    alert('Geolocation is not supported on this device/browser.');
    return;
  }
  setHomeBtn.textContent = 'Locating...';
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      saveHome(pos.coords.latitude, pos.coords.longitude);
      setHomeBtn.textContent = '📍 Use My Current Location';
    },
    (err) => {
      alert('Could not get location: ' + err.message);
      setHomeBtn.textContent = '📍 Use My Current Location';
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
});

changeHomeBtn.addEventListener('click', () => {
  setupCard.hidden = false;
  homeCard.hidden = true;
});

// ---------- Address search (OpenStreetMap Nominatim, free, no API key) ----------
searchBtn.addEventListener('click', async () => {
  const query = addressInput.value.trim();
  if (!query) return;
  searchResults.innerHTML = 'Searching...';
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`
    );
    const results = await res.json();
    searchResults.innerHTML = '';
    if (results.length === 0) {
      searchResults.innerHTML = '<div class="hint">No results found.</div>';
      return;
    }
    results.forEach((r) => {
      const div = document.createElement('div');
      div.className = 'result-item';
      div.textContent = r.display_name;
      div.addEventListener('click', () => {
        saveHome(parseFloat(r.lat), parseFloat(r.lon));
        searchResults.innerHTML = '';
        addressInput.value = '';
      });
      searchResults.appendChild(div);
    });
  } catch (e) {
    searchResults.innerHTML = '<div class="hint">Search failed. Check your connection.</div>';
  }
});

// ---------- Radius slider ----------
radiusSlider.addEventListener('input', () => {
  radius = parseInt(radiusSlider.value, 10);
  radiusValue.textContent = radius;
  localStorage.setItem('radius', radius);
});

// ---------- Tracking ----------
function startTracking() {
  if (!homeLocation) {
    alert('Set your home location first.');
    return;
  }
  if (!navigator.geolocation) {
    alert('Geolocation is not supported on this device/browser.');
    return;
  }

  requestNotificationPermission();

  // Battery-friendly options: no high accuracy needed once outside home radius,
  // and we don't need frequent polling for a "home arrival" use case.
  const options = {
    enableHighAccuracy: false,
    maximumAge: 60000, // reuse a cached position up to 1 min old
    timeout: 20000,
  };

  watchId = navigator.geolocation.watchPosition(onPosition, onPositionError, options);

  statusDot.classList.add('active');
  statusText.textContent = 'Tracking';
  startBtn.hidden = true;
  stopBtn.hidden = false;
  addLog('Tracking started');
}

function stopTracking() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
  statusDot.classList.remove('active');
  statusText.textContent = 'Not tracking';
  startBtn.hidden = false;
  stopBtn.hidden = true;
  addLog('Tracking stopped');
}

function onPosition(pos) {
  const { latitude, longitude } = pos.coords;
  const dist = haversineDistance(latitude, longitude, homeLocation.lat, homeLocation.lng);

  distanceText.textContent = `Distance from home: ${Math.round(dist)}m`;
  lastUpdate.textContent = `Last update: ${new Date().toLocaleTimeString()}`;

  const nowInside = dist <= radius;
  if (nowInside && !isInsideHome) {
    notifyArrivedHome();
  } else if (!nowInside && isInsideHome) {
    addLog('Left home');
  }
  isInsideHome = nowInside;
}

function onPositionError(err) {
  addLog('Location error: ' + err.message);
}

startBtn.addEventListener('click', startTracking);
stopBtn.addEventListener('click', stopTracking);

// ---------- Init ----------
if (homeLocation) {
  renderHomeCard();
}
  
