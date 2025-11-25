# Netlify Setup Anleitung

Diese Anleitung erklärt Schritt für Schritt, wie du die Kleinanzeigen Genius AI Anwendung auf Netlify veröffentlichen kannst.

## Voraussetzungen

- [GitHub Account](https://github.com)
- [Netlify Account](https://netlify.com)
- GitHub Repository mit dem Projektcode

## Schritt 1: Repository auf GitHub hochladen

1. **Repository erstellen**
   - Gehe zu [GitHub](https://github.com) und erstelle ein neues Repository
   - Wähle einen passenden Namen (z.B. `kleinanzeigen-genius-ai`)
   - Setze das Repository auf **public** (kostenlos bei Netlify)

2. **Code hochladen**
   ```bash
   git init
   git add .
   git commit -m "Initial setup for Netlify deployment"
   git branch -M main
   git remote add origin https://github.com/DEIN_USERNAME/kleinanzeigen-genius-ai.git
   git push -u origin main
   ```

## Schritt 2: Netlify Site einrichten

1. **Netlify Account erstellen**
   - Gehe zu [netlify.com](https://netlify.com) und registriere dich
   - Melde dich an

2. **Neue Site erstellen**
   - Klicke auf "Add new site" → "Import an existing project"
   - Wähle "GitHub" als Git Provider
   - Authorisiere Netlify für deinen GitHub Account
   - Wähle dein Repository aus der Liste

3. **Build-Einstellungen konfigurieren**
   - **Branch to deploy**: `main`
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - Klicke auf "Deploy site"

## Schritt 3: Environment Variables konfigurieren

1. **Zur Site Settings navigieren**
   - Gehe zu deiner Site in Netlify
   - Klicke auf "Site settings"
   - Wähle "Environment variables" unter "Build & deploy"

2. **API Keys hinzufügen**
   Füge folgende Environment Variables hinzu:

   | Key | Value | Beschreibung |
   |-----|-------|-------------|
   | `VITE_OPENROUTER_KEY` | `sk-or-v1-deine-echte-api-key` | OpenRouter API Key für KI-Textgenerierung |
   | `VITE_GEMINI_KEY` | `AIzaSyCG-SNjbf-aCJvaijfoFiRkRSwFogglxDA` | Google Gemini API Key für Bildanalyse |

3. **Optionale Variablen**
   | Key | Value | Beschreibung |
   |-----|-------|-------------|
   | `VITE_APP_TITLE` | `Kleinanzeigen Genius AI` | Titel der Anwendung |
   | `VITE_APP_DESCRIPTION` | `KI-gestützte Kleinanzeigen Erstellung` | Beschreibung |
   | `VITE_APP_URL` | `https://deine-site.netlify.app` | URL der Live-Site |

## Schritt 4: Domain konfigurieren

1. **Custom Domain (optional)**
   - Gehe zu "Site settings" → "Domain management"
   - Klicke auf "Add custom domain"
   - Wähle einen kostenlosen `.netlify.app` Subdomain oder verbinde deine eigene Domain

2. **SSL aktivieren**
   - Netlify aktiviert automatisch SSL für alle Sites
   - Überprüfe unter "Site settings" → "SSL" dass HTTPS aktiviert ist

## Schritt 5: Production Build testen

1. **Lokal testen**
   ```bash
   npm install
   npm run build
   npm run preview
   ```
   
2. **Online testen**
   - Öffne die bereitgestellte Netlify URL
   - Überprüfe, ob die Anwendung korrekt lädt
   - Teste die API-Integration mit den gesetzten Keys

## Troubleshooting

### Häufige Probleme

1. **Build fehlschlägt**
   - Überprüfe die Build Logs in Netlify
   - Stelle sicher, dass alle Dependencies in `package.json` enthalten sind
   - Prüfe die Node.js Version (empfohlen: 18)

2. **API Keys funktionieren nicht**
   - Überprüfe die Key-Formatierung
   - Stelle sicher, dass die Keys in Netlify als Environment Variables gesetzt sind
   - Teste die Keys in der lokalen Entwicklungsumgebung

3. **Routen funktionieren nicht**
   - Überprüfe die `netlify.toml` Redirect-Regeln
   - Stelle sicher, dass SPA-Routing korrekt konfiguriert ist

4. **Performance-Probleme**
   - Überprüfe die Asset-Größen im Build-Output
   - Aktiviere ggf. Bildoptimierung
   - Prüfe die Cache-Einstellungen

### Build Logs analysieren

1. Gehe zu "Deploys" in deinem Netlify Dashboard
2. Wähle den letzten Deploy aus
3. Klicke auf "View build logs"
4. Suche nach Fehlern oder Warnungen

### Reset & Neu-Deploy

Wenn Probleme auftreten:
1. Gehe zu "Site settings" → "Build & deploy"
2. Klicke auf "Trigger deploy" → "Deploy site"
3. Wähle "Clear cache and deploy site"

## Optimierungstipps

1. **Performance**
   - Aktiviere Asset Optimization in den Site Settings
   - Nutze die integrierte Image Optimization
   - Konfiguriere aggressive Caching für statische Assets

2. **Sicherheit**
   - Aktiviere alle Security Headers
   - Nutze reCAPTCHA für Formulare (optional)
   - Implementiere Rate Limiting falls nötig

3. **Monitoring**
   - Richte Error Tracking ein (z.B. Sentry)
   - Nutze Netlify Analytics für Performance-Monitoring
   - Setze Upptime Monitoring ein

## Support

Falls du Probleme hast:
1. Überprüfe die [Netlify Dokumentation](https://docs.netlify.com)
2. Besuche das [Netlify Community Forum](https://community.netlify.com)
3. Erstelle ein Issue in diesem Repository

Viel Erfolg mit deiner Veröffentlichung! 🚀