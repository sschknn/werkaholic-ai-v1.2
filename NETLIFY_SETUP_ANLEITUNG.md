# Netlify Setup Anleitung

Diese Anleitung erklärt Schritt für Schritt, wie du die Kleinanzeigen Genius AI Anwendung auf Netlify veröffentlichen kannst.

## Voraussetzungen

- [GitHub Account](https://github.com)
- [Netlify Account](https://netlify.com)
- GitHub Repository mit dem Projektcode

## Wichtige Hinweise zu API Keys

Bevor du mit der Einrichtung beginnst, stelle sicher, dass du die folgenden API Keys besitzt:

### Erforderliche API Keys

1. **OpenRouter API Key** - Für KI-gestützte Textgenerierung
   - Wird für die Analyse von Bildern und die Erstellung von Kleinanzeigen-Texten benötigt
   - Kostenpflichtig, aber sehr zuverlässig

2. **Google Gemini API Key** - Für Live-Scanning Funktionen
   - Wird für die Echtzeit-Bildanalyse über die Kamera benötigt
   - Teil des Google AI Studio, oftmals mit Free Tier verfügbar

**⚠️ Sicherheitshinweis**: Diese Keys sind vertraulich und dürfen nicht im Source Code oder öffentlichen Repositories veröffentlicht werden!

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
    Füge folgende **zwingend erforderliche** Environment Variables hinzu:

    | Key | Value Format | Beschreibung |
    |-----|-------------|-------------|
    | `VITE_OPENROUTER_KEY` | `sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` | OpenRouter API Key für KI-Textgenerierung |
    | `VITE_GEMINI_KEY` | `AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX` | Google Gemini API Key für Bildanalyse |

### So erhältst du die API Keys

#### OpenRouter API Key
1. Gehe zu [openrouter.ai](https://openrouter.ai)
2. Melde dich an oder erstelle ein Konto
3. Gehe zu "Settings" → "API Keys"
4. Klicke auf "Create new key"
5. Kopiere den generierten Key (beginnt mit `sk-or-v1-`)
6. **Wichtiger Schritt**: Lade dein Konto auf, da OpenRouter kostenpflichtig ist

#### Google Gemini API Key
1. Gehe zu [Google AI Studio](https://aistudio.google.com)
2. Melde dich mit deinem Google Account an
3. Klicke auf dein Profilbild → "APIs & Keys"
4. Erstelle ein neues Projekt oder wähle ein bestehendes
5. Gehe zu "Settings" → "API Key"
6. Kopiere den generierten Key
7. **Hinweis**: Google bietet oft ein Free Tier, prüfe die aktuellen Limits

### API Key Integration im Code

Die Anwendung verwendet die Keys wie folgt:

- **OpenRouter Key** ([`VITE_OPENROUTER_KEY`](netlify.toml:48)): Wird in [`geminiService.ts`](services/geminiService.ts:61) für Bildanalyse und Textgenerierung verwendet
- **Google Gemini Key** ([`VITE_GEMINI_KEY`](netlify.toml:49)): Wird in [`liveService.ts`](services/liveService.ts:57) für Live-Scanning und Echtzeitanalyse verwendet

Die Keys werden zur Build-Zeit in die Anwendung eingebettet und sind nur über die `VITE_`-Präfix-Variablen im Frontend verfügbar.

3. **Optionale Variablen**
    | Key | Value | Beschreibung |
    |-----|-------|-------------|
    | `VITE_APP_TITLE` | `Kleinanzeigen Genius AI` | Titel der Anwendung |
    | `VITE_APP_DESCRIPTION` | `KI-gestützte Kleinanzeigen Erstellung` | Beschreibung |
    | `VITE_APP_URL` | `https://deine-site.netlify.app` | URL der Live-Site |
    | `VITE_ENABLE_ANALYTICS` | `false` | Google Analytics aktivieren |
    | `VITE_ENABLE_DEBUG` | `false` | Debug-Modus aktivieren |
    | `NODE_VERSION` | `18` | Node.js Version für Build |

### Sicherheitshinweise zu API Keys

- **NIEMALS** die Keys im Source Code oder in öffentlichen Repositories speichern
- **NIEMALS** die Keys in Browser-Konsole oder Logs ausgeben
- **IMMER** die Keys nur über Environment Variables bereitstellen
- **REGELMÄSSIG** die Keys in den jeweiligen Diensten überprüfen und bei Verdacht auf Missbrauch erneuern
- **BUDGETS** in den API-Diensten einrichten, um unerwartete Kosten zu vermeiden
- **NETZWERK-ÜBERWACHUNG**: Überprüfe regelmäßig die API-Nutzung in den jeweiligen Dashboards
- **KEY-RESTRIKTIONEN**: Falls möglich, beschränke die Keys auf bestimmte Domains oder IPs

### Best Practices für API Key Management

1. **Trennung von Entwicklungs- und Produktions-Keys**
   - Verwende separate Keys für Development, Testing und Production
   - Entwicklungs-Keys sollten geringere Limits haben

2. **Automatisierte Überwachung**
   - Richte Alerts für ungewöhnliche Nutzung ein
   - Überwache tägliche/monatliche Kosten

3. **Key Rotation**
   - Plane regelmäßige Key-Rotation (alle 3-6 Monate)
   - Dokumentiere den Key-Update-Prozess

4. **Zugriffsbeschränkungen**
   - Nutze API-Whitelisting, wenn verfügbar
   - Beschränke die Anzahl gleichzeitiger Anfragen

### Troubleshooting API Keys

Wenn die API Keys nicht funktionieren:
1. Überprüfe die Key-Formatierung (müssen exakt so eingetragen werden wie vom Anbieter bereitgestellt)
2. Stelle sicher, dass die Keys in Netlify unter "Environment Variables" gesetzt sind (nicht "Build settings")
3. Prüfe, ob die Keys noch gültig sind und nicht abgelaufen
4. Überprüfe die API-Dienste auf eventuelle Limits oder Sperren
5. Teste die Keys lokal mit dem selben Format wie in Netlify

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
    - Überprüfe, ob alle Environment Variables korrekt gesetzt sind

2. **API Keys funktionieren nicht**
    - Überprüfe die Key-Formatierung (müssen exakt so eingetragen werden wie vom Anbieter bereitgestellt)
    - Stelle sicher, dass die Keys in Netlify unter "Environment variables" gesetzt sind (nicht "Build settings")
    - Teste die Keys in der lokalen Entwicklungsumgebung
    - Prüfe die API-Dienste auf eventuelle Limits oder Sperren
    - Überprüfe die Browser-Konsole auf Fehlermeldungen

3. **Environment Variables werden nicht erkannt**
    - Stelle sicher, dass die Variablen mit `VITE_` prefix beginnen
    - Überprüfe, ob die Anwendung nach dem Setzen der Variablen neu gebaut wurde
    - Prüfe die Build Logs auf Environment Variable Warnungen

4. **Routen funktionieren nicht**
    - Überprüfe die `netlify.toml` Redirect-Regeln
    - Stelle sicher, dass SPA-Routing korrekt konfiguriert ist

5. **Performance-Probleme**
    - Überprüfe die Asset-Größen im Build-Output
    - Aktiviere ggf. Bildoptimierung
    - Prüfe die Cache-Einstellungen

### API Key Fehlerbehebung

Wenn API Keys nicht funktionieren:

1. **OpenRouter Fehler**
   - Prüfe, ob das Konto verifiziert ist
   - Überprüfe das Guthaben/Limit
   - Teste den Key mit curl: `curl -H "Authorization: Bearer DEIN_KEY" https://openrouter.ai/api/v1/auth`
   - Stelle sicher, dass der Key mit `sk-or-v1-` beginnt

2. **Google Gemini Fehler**
   - Prüfe, ob das API in Google Cloud Console aktiviert ist
   - Überprüfe das API-Quoten-Limit
   - Teste den Key mit curl: `curl "https://generativelanguage.googleapis.com/v1/models?key=DEIN_KEY"`
   - Stelle sicher, dass der Key mit `AIza` beginnt

3. **Allgemeine API Probleme**
   - Überprüfe die Netzwerkverbindung
   - Prüfe die CORS-Einstellungen
   - Stelle sicher, dass die richtigen API-Endpunkte verwendet werden

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