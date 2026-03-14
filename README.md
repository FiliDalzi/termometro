# 🌡️ Termometro Live PWA

Termometro in tempo reale basato sulla tua posizione GPS, costruito come Progressive Web App.

## ✨ Funzionalità

- 📍 **Geolocalizzazione** automatica via browser (API nativa, gratuita)
- 🌡️ **Temperatura reale** da [Open-Meteo](https://open-meteo.com/) (gratuita, no API key)
- 🗺️ **Nome della città** via [Nominatim/OpenStreetMap](https://nominatim.org/) (gratuito)
- 💧 Umidità, temperatura percepita, velocità del vento
- 🔄 **Auto-aggiornamento** ogni 10 minuti
- 📵 **Modalità offline** con cache locale (localStorage + Service Worker)
- 📱 **Installabile** su Android e iOS come app nativa

## 🚀 Deploy su GitHub Pages

1. Crea un repository su GitHub (es. `termometro-pwa`)
2. Carica tutti i file in questo pacchetto
3. Vai su **Settings → Pages**
4. Seleziona **Branch: main**, **Folder: / (root)**
5. Salva → dopo qualche minuto l'app sarà disponibile su:
   `https://TUO-USERNAME.github.io/termometro-pwa/`

## 📁 Struttura file

```
termometro-pwa/
├── index.html      # HTML principale
├── style.css       # Stili (termometro + UI)
├── app.js          # Logica: geo + meteo + interazione
├── sw.js           # Service Worker (cache offline)
├── manifest.json   # Manifest PWA
└── icons/
    ├── icon-192.png
    └── icon-512.png
```

## 🔌 API utilizzate (tutte gratuite)

| Servizio | URL | Uso |
|---|---|---|
| Open-Meteo | `api.open-meteo.com` | Temperatura, meteo attuale |
| Nominatim | `nominatim.openstreetmap.org` | Nome città da coordinate |
| Browser Geolocation API | — | Coordinate GPS |

## 📱 Installazione come app

- **Android (Chrome)**: Banner automatico o menu → "Installa app"
- **iOS (Safari)**: Condividi → "Aggiungi a schermata Home"
- **Desktop (Chrome/Edge)**: Icona ⊕ nella barra indirizzi

## 🛠️ Sviluppo locale

```bash
# Python (qualsiasi versione)
python3 -m http.server 8080

# Node.js
npx serve .
```

Apri `http://localhost:8080` nel browser.

> ⚠️ La geolocalizzazione richiede HTTPS in produzione.  
> GitHub Pages serve automaticamente in HTTPS. ✅
