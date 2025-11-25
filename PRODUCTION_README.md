# Kleinanzeigen Genius AI - Production Deployment

Willkommen zur Produktionsversion der Kleinanzeigen Genius AI Anwendung! Dieses Dokument erklärt die Unterschiede zwischen Development- und Production-Umgebung sowie die Veröffentlichung auf Netlify.

## 📦 Projektstruktur

```
kleinanzeigen-genius-ai/
├── dist/                    # Build-Output für Production
├── src/                     # Quellcode
├── public/                  # Statische Assets
├── netlify.toml            # Netlify Konfiguration
├── package.json            # Dependencies & Scripts
├── vite.config.ts          # Vite Build Konfiguration
├── env.example            # Production Environment Beispiel
├── NETLIFY_SETUP_ANLEITUNG.md    # Detaillierte Setup Anleitung
└── PRODUCTION_README.md    # Dieses Dokument
```

## 🚀 Veröffentlichung auf Netlify

### Schnellstart

1. **Repository auf GitHub pushen**
   ```bash
   git add .
   git commit -m "Production setup"
   git push origin main
   ```

2. **Netlify verbinden**
   - Gehe zu [netlify.com](https://netlify.com)
   - "New site from Git" auswählen
   - GitHub Repository verbinden

3. **Build konfigurieren**
   - Build command: `npm run build`
   - Publish directory: `dist`

4. **Environment Variables setzen**
   - `VITE_OPENROUTER_KEY`: Dein OpenRouter API Key
   - `VITE_GEMINI_KEY`: Dein Google Gemini API Key

### Build-Prozess

Die Anwendung wird mit folgenden Optimierungen gebaut:

- **Code Splitting**: Aufteilung in mehrere Chunks für besseres Loading
- **Tree Shaking**: Entfernen ungenutzten Codes
- **Minification**: Komprimierung von JavaScript und CSS
- **Asset Optimization**: Optimierung von Bildern und anderen Assets
- **Gzip Compression**: Server-seitige Komprimierung

## 🔧 Environment Variablen

### Production vs Development

| Variable | Development | Production | Beschreibung |
|----------|-------------|------------|--------------|
| `VITE_OPENROUTER_KEY` | `.env.local` | Netlify UI | KI Textgenerierung |
| `VITE_GEMINI_KEY` | `.env.local` | Netlify UI | Bildanalyse |
| `VITE_APP_URL` | `http://localhost:5173` | Live URL | App Domain |
| `VITE_ENABLE_DEBUG` | `true` | `false` | Debug Modus |

### In Netlify konfigurieren

1. Site Settings → Build & deploy → Environment
2. Environment variables hinzufügen
3. Deploy neu auslösen

## 📊 Performance Optimierungen

### Build-Time Optimierungen

- **Chunked Assets**: `vendor.js`, `ai.js`, `utils.js` etc.
- **CSS Splitting**: Separate CSS Dateien für besseres Caching
- **Asset Inlining**: Kleine Assets direkt im Bundle
- **Source Maps**: Nur in Development

### Runtime Optimierungen

- **Service Worker**: Offline-Funktionalität
- **Lazy Loading**: Komponenten werden bei Bedarf geladen
- **Image Caching**: Aggressives Caching für Bilder
- **API Caching**: Response-Caching für API-Aufrufe

## 🔒 Sicherheitsmaßnahmen

### Content Security Policy
```html
default-src 'self' 'unsafe-inline' 'unsafe-eval' https: data: blob:
connect-src * wss://generativelanguage.googleapis.com
```

### Security Headers (Netlify)
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`

### API Key Sicherheit
- Keys werden nur client-seitig genutzt
- Keys werden durch Vite zur Build-Zeit eingefügt
- Keys niemals hardcoded im Repository

## 🐛 Troubleshooting

### Häufige Build-Fehler

1. **Terser nicht gefunden**
   ```bash
   npm install terser --save-dev
   ```

2. **Abhängigkeiten fehlen**
   ```bash
   npm install
   npm run build
   ```

3. **Node.js Version**
   - Stelle sicher, dass Node.js 18+ genutzt wird
   - In `netlify.toml` konfigurieren:
   ```toml
   [build.environment]
   NODE_VERSION = "18"
   ```

### API Key Probleme

1. **Keys werden nicht erkannt**
   - Überprüfe die `VITE_` Prefix
   - Stelle sicher, dass die App neu gebaut wird
   - Prüfe die Browser Console auf Fehler

2. **Rate Limiting**
   - Überprüfe die API Limits bei OpenRouter/Gemini
   - Implementiere Retry-Logik (bereits enthalten)
   - Betrachte Usage Monitoring

### Deployment Probleme

1. **404 bei Routen**
   - Überprüfe die Redirect-Regeln in `netlify.toml`
   - Stelle sicher, dass SPA Routing aktiviert ist

2. **Asset Loading fehlgeschlagen**
   - Überprüfe die Pfade in `vite.config.ts`
   - Stelle sicher, dass die Publish Directory korrekt ist

## 📈 Monitoring & Analytics

### Performance Monitoring
- Netlify Analytics für Build-Zeiten
- Lighthouse für Performance Scores
- Real User Monitoring (optional)

### Error Tracking
- Browser Console für client-seitige Errors
- Netlify Forms für User Feedback
- Optional: Sentry für Error Tracking

## 🔄 Update-Prozess

### Neue Version veröffentlichen

1. **Code ändern**
   ```bash
   git add .
   git commit -m "Feature: Neue Funktionalität"
   git push origin main
   ```

2. **Automatischer Deploy**
   - Netlify erkennt automatisch Änderungen
   - Neuer Build wird ausgelöst
   - Deploy erfolgt innerhalb von Minuten

3. **Manueller Deploy**
   - Gehe zu "Deploys" in Netlify
   - Klicke auf "Trigger deploy"
   - Wähle "Deploy site"

### Rollback
- Gehe zu "Deploys" → "Previous deploys"
- Wähle einen vorherigen erfolgreichen Deploy
- Klicke auf "Rollback to this deploy"

## 📞 Support & Hilfe

### Dokumentation
- [NETLIFY_SETUP_ANLEITUNG.md](./NETLIFY_SETUP_ANLEITUNG.md) - Detaillierte Setup Anleitung
- [README.md](./README.md) - Allgemeine Projektinformationen

### Tools
- [Netlify CLI](https://docs.netlify.com/cli/get-started/) für lokales Testing
- [Vite Dokumentation](https://vitejs.dev/guide/) für Build-Optimierungen
- [Netlify Dokumentation](https://docs.netlify.com/) für Deployment-Fragen

### Community
- Netlify Community Forum
- GitHub Issues für Projekt-spezifische Fragen
- Stack Overflow für technische Probleme

---

**Viel Erfolg mit deiner Production Deployment!** 🚀

Für weitere Fragen oder Unterstützung, siehe die entsprechenden Dokumente oder erstelle ein Issue im Repository.