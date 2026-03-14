/* ── Thermometer PWA ── app.js ── */

// ── Registra il Service Worker ──────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js')
    .then(() => console.log('[SW] Registrato con successo'))
    .catch(err => console.warn('[SW] Errore registrazione:', err));
}

// ── Elementi DOM ─────────────────────────────────────────────────────────────
const slider        = document.getElementById('thermometer-slider');
const label         = document.querySelector('[for="thermometer-slider"]');
const locationName  = document.getElementById('location-name');
const feelsLike     = document.getElementById('feels-like');
const humidity      = document.getElementById('humidity');
const wind          = document.getElementById('wind');
const weatherIcon   = document.getElementById('weather-icon');
const condition     = document.getElementById('condition');
const lastUpdate    = document.getElementById('last-update');
const refreshBtn    = document.getElementById('refresh-btn');
const offlineBadge  = document.getElementById('offline-badge');
const toast         = document.getElementById('toast');
const forecastBody  = document.getElementById('forecast-body');

// ── Stato ────────────────────────────────────────────────────────────────────
let currentLat = null;
let currentLon = null;
let isLoading  = false;

// ── WMO Weather Codes ────────────────────────────────────────────────────────
const WMO_CODES = {
  0:  { icon: '☀️',  text: 'Cielo sereno' },
  1:  { icon: '🌤️', text: 'Quasi sereno' },
  2:  { icon: '⛅',  text: 'Parz. nuvoloso' },
  3:  { icon: '☁️',  text: 'Coperto' },
  45: { icon: '🌫️', text: 'Nebbia' },
  48: { icon: '🌫️', text: 'Nebbia con brina' },
  51: { icon: '🌦️', text: 'Pioggerella' },
  53: { icon: '🌦️', text: 'Pioggerella mod.' },
  55: { icon: '🌧️', text: 'Pioggerella int.' },
  61: { icon: '🌧️', text: 'Pioggia leggera' },
  63: { icon: '🌧️', text: 'Pioggia moderata' },
  65: { icon: '🌧️', text: 'Pioggia forte' },
  71: { icon: '🌨️', text: 'Neve leggera' },
  73: { icon: '🌨️', text: 'Neve moderata' },
  75: { icon: '❄️',  text: 'Neve abbondante' },
  77: { icon: '🌨️', text: 'Granelli di neve' },
  80: { icon: '🌦️', text: 'Rovesci leggeri' },
  81: { icon: '🌧️', text: 'Rovesci moderati' },
  82: { icon: '⛈️',  text: 'Rovesci violenti' },
  85: { icon: '🌨️', text: 'Rovesci di neve' },
  86: { icon: '❄️',  text: 'Neve forte' },
  95: { icon: '⛈️',  text: 'Temporale' },
  96: { icon: '⛈️',  text: 'Temp. con grandine' },
  99: { icon: '⛈️',  text: 'Temp. violento' },
};

function getWeatherInfo(code) {
  return WMO_CODES[code] ?? { icon: '🌡️', text: 'N/D' };
}

// ── Nomi giorni della settimana in italiano ───────────────────────────────────
const GIORNI = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
const MESI   = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];

function formatDay(dateStr, index) {
  if (index === 0) return 'Oggi';
  if (index === 1) return 'Domani';
  const d = new Date(dateStr + 'T00:00:00');
  return `${GIORNI[d.getDay()]} ${d.getDate()} ${MESI[d.getMonth()]}`;
}

// ── Colore temperatura ────────────────────────────────────────────────────────
function tempColor(t) {
  if (t <= 0)  return 'oklch(75% 0.12 220)';  // freddo → azzurro
  if (t <= 10) return 'oklch(78% 0.10 200)';
  if (t <= 20) return 'oklch(80% 0.12 140)';  // mite → verde
  if (t <= 30) return 'oklch(75% 0.15 60)';   // caldo → arancio
  return             'oklch(65% 0.18 30)';     // molto caldo → rosso
}

// ── Aggiorna label termometro ─────────────────────────────────────────────────
function updateLabel(value) {
  const temp = Math.round(parseFloat(value));
  label.textContent = `${temp}°C`;
  const bg = Math.max(0, Math.min(175, 95 - temp * 1.9));
  label.dataset.bg = bg;
}

// ── Popola la tabella previsioni ──────────────────────────────────────────────
function renderForecast(daily) {
  const { time, weather_code, temperature_2m_max, temperature_2m_min,
          precipitation_sum, wind_speed_10m_max } = daily;

  forecastBody.innerHTML = time.map((date, i) => {
    const info    = getWeatherInfo(weather_code[i]);
    const max     = Math.round(temperature_2m_max[i]);
    const min     = Math.round(temperature_2m_min[i]);
    const precip  = precipitation_sum[i].toFixed(1);
    const windMax = Math.round(wind_speed_10m_max[i]);
    const isToday = i === 0;

    return `<tr class="${isToday ? 'today-row' : ''}">
      <td class="day-cell">${formatDay(date, i)}</td>
      <td class="icon-cell" title="${info.text}">${info.icon}</td>
      <td class="temp-cell" style="color:${tempColor(max)}">${max}°</td>
      <td class="temp-cell" style="color:${tempColor(min)}">${min}°</td>
      <td class="num-cell">${precip}</td>
      <td class="num-cell">${windMax}</td>
    </tr>`;
  }).join('');
}

// ── Reverse geocoding (Nominatim) ─────────────────────────────────────────────
async function getLocationName(lat, lon) {
  try {
    const res  = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
      { headers: { 'Accept-Language': 'it' } }
    );
    const data = await res.json();
    const a    = data.address;
    return a.city || a.town || a.village || a.hamlet || a.county || a.state || 'Posizione sconosciuta';
  } catch {
    return 'Posizione sconosciuta';
  }
}

// ── Fetch meteo attuale + 7 giorni (Open-Meteo) ───────────────────────────────
async function fetchWeather(lat, lon) {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude',  lat);
  url.searchParams.set('longitude', lon);
  url.searchParams.set('current', [
    'temperature_2m', 'apparent_temperature',
    'relative_humidity_2m', 'wind_speed_10m', 'weather_code',
  ].join(','));
  url.searchParams.set('daily', [
    'weather_code', 'temperature_2m_max', 'temperature_2m_min',
    'precipitation_sum', 'wind_speed_10m_max',
  ].join(','));
  url.searchParams.set('wind_speed_unit', 'kmh');
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('forecast_days', '7');

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
  return res.json();
}

// ── Aggiorna tutta la UI ──────────────────────────────────────────────────────
async function updateWeather(lat, lon) {
  if (isLoading) return;
  isLoading = true;
  refreshBtn.classList.add('spinning');
  locationName.classList.add('skeleton');
  forecastBody.innerHTML = '<tr><td colspan="6" class="forecast-loading">Caricamento…</td></tr>';

  try {
    const [data, name] = await Promise.all([
      fetchWeather(lat, lon),
      getLocationName(lat, lon),
    ]);

    const cur  = data.current;
    const temp = Math.round(cur.temperature_2m);
    const info = getWeatherInfo(cur.weather_code);

    // Termometro
    slider.value = Math.max(-40, Math.min(50, temp));
    updateLabel(temp);

    // Icona e condizione oggi
    weatherIcon.textContent = info.icon;
    condition.textContent   = info.text;

    // Header
    locationName.textContent = name;
    feelsLike.textContent    = `🤔 ${Math.round(cur.apparent_temperature)}°C`;
    humidity.textContent     = `💧 ${cur.relative_humidity_2m}%`;
    wind.textContent         = `💨 ${Math.round(cur.wind_speed_10m)} km/h`;

    // Tabella 7 giorni
    renderForecast(data.daily);

    // Timestamp
    const now = new Date();
    lastUpdate.textContent = `Aggiornato: ${now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`;

    // Cache
    localStorage.setItem('thermo-cache', JSON.stringify({
      temp, lat, lon, name, info,
      apparent: cur.apparent_temperature,
      hum: cur.relative_humidity_2m,
      windNow: cur.wind_speed_10m,
      daily: data.daily,
      ts: Date.now(),
    }));

    document.querySelector('.location-icon').classList.add('done');
    document.querySelector('.location-icon').textContent = '📍';

  } catch (err) {
    console.error('[meteo]', err);
    showToast('⚠️ Impossibile aggiornare. Dati dalla cache.');
    loadFromCache();
  } finally {
    isLoading = false;
    refreshBtn.classList.remove('spinning');
    locationName.classList.remove('skeleton');
  }
}

// ── Carica dalla cache ────────────────────────────────────────────────────────
function loadFromCache() {
  try {
    const c = JSON.parse(localStorage.getItem('thermo-cache'));
    if (!c) return false;

    slider.value = Math.max(-40, Math.min(50, c.temp));
    updateLabel(c.temp);
    locationName.textContent = `${c.name} (cache)`;
    weatherIcon.textContent  = c.info.icon;
    condition.textContent    = c.info.text;
    feelsLike.textContent    = `🤔 ${Math.round(c.apparent)}°C`;
    humidity.textContent     = `💧 ${c.hum}%`;
    wind.textContent         = `💨 ${Math.round(c.windNow)} km/h`;
    if (c.daily) renderForecast(c.daily);

    const ago = Math.round((Date.now() - c.ts) / 60000);
    lastUpdate.textContent = `Cache di ${ago} min fa`;
    return true;
  } catch { return false; }
}

// ── IP geolocation fallback ───────────────────────────────────────────────────
async function locateByIP() {
  console.log('[geo] Provo con IP geolocation…');
  locationName.textContent = 'Localizzazione tramite IP…';
  try {
    const res  = await fetch('https://freeipapi.com/api/json');
    const data = await res.json();
    if (!data.latitude || !data.longitude) throw new Error('freeipapi fallita');
    console.log(`[geo] IP OK: ${data.cityName} (${data.latitude}, ${data.longitude})`);
    currentLat = data.latitude;
    currentLon = data.longitude;
    updateWeather(currentLat, currentLon);
  } catch (err) {
    console.warn('[geo] IP fallita:', err);
    document.querySelector('.location-icon').textContent = '⚠️';
    locationName.textContent = 'Posizione non disponibile';
    showToast('⚠️ Impossibile rilevare la posizione. Dati dalla cache.');
    loadFromCache();
  }
}

// ── Geolocalizzazione ─────────────────────────────────────────────────────────
function locate() {
  locationName.textContent = 'Localizzazione in corso…';
  document.querySelector('.location-icon').textContent = '🔍';

  if (!navigator.geolocation) { locateByIP(); return; }

  navigator.geolocation.getCurrentPosition(
    pos => {
      currentLat = pos.coords.latitude;
      currentLon = pos.coords.longitude;
      updateWeather(currentLat, currentLon);
    },
    err => {
      console.warn('[geo] GPS fallito (code ' + err.code + '):', err.message);
      if (err.code === 1) {
        locationName.textContent = 'Permesso negato. Abilita la posizione.';
        document.querySelector('.location-icon').textContent = '⚠️';
        loadFromCache();
      } else {
        locateByIP();
      }
    },
    { timeout: 8000, maximumAge: 300000, enableHighAccuracy: false }
  );
}

// ── Online/Offline ────────────────────────────────────────────────────────────
function updateOnlineStatus() {
  if (navigator.onLine) {
    offlineBadge.classList.remove('visible');
  } else {
    offlineBadge.classList.add('visible');
    loadFromCache();
  }
}
window.addEventListener('online',  updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);
updateOnlineStatus();

// ── Toast ─────────────────────────────────────────────────────────────────────
function showToast(msg, duration = 3000) {
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

// ── Interazione slider ────────────────────────────────────────────────────────
slider.addEventListener('input', () => updateLabel(slider.value));

document.addEventListener('wheel', (e) => {
  if (e.deltaY < 0) slider.value = parseInt(slider.value) + 1;
  else              slider.value = parseInt(slider.value) - 1;
  updateLabel(slider.value);
}, { passive: true });

refreshBtn.addEventListener('click', () => {
  if (currentLat && currentLon) updateWeather(currentLat, currentLon);
  else locate();
});

// ── Auto-refresh ogni 10 minuti ───────────────────────────────────────────────
setInterval(() => {
  if (navigator.onLine && currentLat && currentLon) updateWeather(currentLat, currentLon);
}, 10 * 60 * 1000);

// ── Init ──────────────────────────────────────────────────────────────────────
updateLabel(0);
locate();
