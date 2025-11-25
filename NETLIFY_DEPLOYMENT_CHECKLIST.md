# Netlify Deployment Checkliste

## 🚀 Pre-Deployment Verification

### Build-Prozess Überprüfung
- [x] **Build test erfolgreich** - `npm run build` liefert Exit-Code 0
- [x] **Produktions-Assets generiert** - dist-Ordner enthält alle notwendigen Dateien
- [x] **Preview-Modus funktioniert** - `npm run preview` startet erfolgreich
- [x] **SPA-Routing konfiguriert** - netlify.toml enthält korrekte Redirect-Regeln
- [x] **PWA-Features aktiviert** - Service Worker und Manifest konfiguriert

### API-Schlüssel Überprüfung
- [x] **Init-Skript vorhanden** - init-keys.js initialisiert API-Schlüssel
- [x] **Schlüssel-Hardcoding entfernt** - Nur für lokale Tests, nicht für Produktion
- [x] **Environment-Setup dokumentiert** - API-Schlüssel müssen in Netlify UI gesetzt werden

### Sicherheits-Checkliste
- [x] **Security Headers** - CSP, XSS-Protection, Frame-Options konfiguriert
- [x] **API Keys geschützt** - Keine Keys im Repository, nur in Environment-Variables
- [x] **Service Worker sichergestellt** - Cache-Control Header korrekt gesetzt

## 🔧 Netlify Setup Anleitung

### 1. Repository Verbindung
1. **Netlify Account erstellen** - https://app.netlify.com
2. **New site from Git** auswählen
3. **Repository verbinden** - GitHub/GitLab/Bitbucket Konto verknüpfen
4. **Repository auswählen** - `kleinanzeigen-genius-ai` Repository wählen
5. **Build Settings konfigurieren**:
   ```
   Build command: npm run build
   Publish directory: dist
   ```

### 2. Environment Variables Konfiguration
**Site Settings > Environment variables** hinzufügen:

| Variable | Wert | Beschreibung |
|----------|------|-------------|
| `VITE_OPENROUTER_KEY` | `sk-or-v1-deine-api-key` | OpenRouter API Key |
| `VITE_GEMINI_KEY` | `AIzaSy-deine-api-key` | Google Gemini API Key |
| `VITE_APP_TITLE` | `Kleinanzeigen Genius AI` | App Titel |
| `VITE_APP_DESCRIPTION` | `KI-gestützte Kleinanzeigen Erstellung mit Fotoanalyse` | App Beschreibung |
| `VITE_APP_URL` | `https://deine-domain.netlify.app` | Produktiv-URL |
| `VITE_ENABLE_ANALYTICS` | `false` | Analytics aktivieren |
| `VITE_ENABLE_DEBUG` | `false` | Debug-Modus |
| `VITE_ENABLE_SERVICE_WORKER` | `true` | Service Worker aktivieren |

### 3. Domain Konfiguration
1. **Custom Domain** in Site Settings einrichten
2. **SSL/HTTPS** automatisch aktivieren
3. **DNS-Einträge** beim Domain-Provider konfigurieren

### 4. Build & Deploy
1. **Manual Publish** - Erstes Deployment manuell starten
2. **Branch Selection** - Production Branch (meist `main` oder `master`) wählen
3. **Auto Publish** - Automatische Deployments bei Git Push aktivieren

## ✅ Post-Deployment Verification

### Funktionale Tests
- [ ] **App lädt korrekt** - Keine 404 oder Build-Fehler
- [ ] **API Keys initialisiert** - Schlüssel werden automatisch gesetzt
- [ ] **Bilder Upload funktioniert** - File Upload und Analyse testen
- [ ] **Textgenerierung arbeitet** - KI-Textgenerierung mit echten Bildern testen
- [ ] **Responsive Design** - Mobile und Desktop Ansicht prüfen

### Performance Tests
- [ ] **Ladezeiten optimiert** - Google PageSpeed Insights überprüfen
- [ ] **Bundle-Größe** - JavaScript/CSS Assets komprimiert
- [ ] **Caching funktioniert** - Service Worker und Asset-Caching testen

### Sicherheit Tests
- [ ] **Security Headers** - Browser Developer Tools überprüfen
- [ ] **HTTPS erzwungen** - HTTP Redirect zu HTTPS
- [ ] **API Keys geschützt** - Keys nicht im Quellcode sichtbar

## 🔧 Troubleshooting Guide

### Häufige Build-Fehler
```bash
# Error: Cannot find module 'vite'
npm install

# Error: Build failed with exit code 1
npm run build --verbose

# Error: Out of memory
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

### API Key Probleme
```javascript
// Prüfen ob Schlüssel gesetzt sind
console.log('OpenRouter:', localStorage.getItem('openrouter_api_key'));
console.log('Gemini:', localStorage.getItem('gemini_api_key'));

// Schlüssel neu initialisieren
// Aufruf: https://deine-domain.netlify.app/init-keys.js
```

### Service Worker Issues
```javascript
// Service Worker Debugging
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(let registration of registrations) {
      registration.unregister();
    }
  });
}
```

### Cache-Probleme
1. **Hard Refresh** - `Ctrl+Shift+R` (Windows) / `Cmd+Shift+R` (Mac)
2. **Cache leeren** - Browser Developer Tools > Application > Clear Storage
3. **Service Worker löschen** - Application > Service Workers > Unregister

### Netlify spezifische Probleme
```toml
# netlify.toml korrigieren bei Routing-Problemen
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

## 📋 Deployment Commands

### Lokale Tests
```bash
# Build testen
npm run build

# Production Preview
npm run preview

# Clean Build
rm -rf dist && npm run build
```

### API Key Management
```javascript
// Keys manuell setzen (für Testing)
localStorage.setItem('openrouter_api_key', 'dein-key');
localStorage.setItem('gemini_api_key', 'dein-key');

// Keys löschen
localStorage.removeItem('openrouter_api_key');
localStorage.removeItem('gemini_api_key');

// Alle Keys löschen
localStorage.clear();
```

## 🎯 Deployment Status

- [x] **Build-Prozess verifiziert**
- [x] **Production Assets generiert**
- [x] **Preview-Modus funktioniert**
- [x] **Netlify Konfiguration bereit**
- [x] **API Key Setup dokumentiert**
- [x] **Security Headers konfiguriert**
- [ ] **Live Deployment durchführen**
- [ ] **Post-Deployment Tests abschließen**

## 📞 Support

Bei Fragen zum Deployment:
1. **Build-Logs prüfen** - Netlify Site Settings > Build & deploy
2. **Console Errors** - Browser Developer Tools > Console
3. **Network Requests** - Developer Tools > Network
4. **API Response** - OpenRouter/Gemini API Keys prüfen

---

**Letzte Aktualisierung:** 25.11.2025  
**Version:** 1.0.0  
**Status:** Bereit für Production Deployment