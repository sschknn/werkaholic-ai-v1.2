# Netlify CLI Deployment Anleitung für Kleinanzeigen Genius AI

Diese umfassende Anleitung erklärt Schritt für Schritt, wie du die Kleinanzeigen Genius AI Anwendung mithilfe des Netlify CLI (Command Line Interface) bereitstellst. Im Gegensatz zur Web-Oberfläche ermöglicht der CLI eine vollständig automatisierte und skriptbare Bereitstellung.

## 📋 Voraussetzungen

Bevor du beginnst, stelle sicher, dass du folgende Voraussetzungen erfüllst:

- [ ] Node.js (v16 oder höher) installiert
- [ ] npm oder yarn als Package Manager
- [ ] Git installiert und konfiguriert
- [ ] GitHub Account
- [ ] Netlify Account
- [ ] API Keys für OpenRouter und Google Gemini bereit

## 🔧 1. Netlify CLI Installation

### 1.1 Installation via npm

Der einfachste Weg, den Netlify CLI zu installieren, ist über npm:

```bash
# Globale Installation des Netlify CLI
npm install -g netlify-cli

# Alternative: Installation mit yarn
yarn global add netlify-cli
```

### 1.2 Installation über Homebrew (macOS)

Für macOS-Nutzer mit Homebrew:

```bash
# Homebrew installieren (falls noch nicht vorhanden)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Netlify CLI via Homebrew installieren
brew install netlify-cli
```

### 1.3 Installation über Snap (Linux)

Für Linux-Nutzer mit Snap:

```bash
# Netlify CLI via Snap installieren
snap install netlify
```

### 1.4 Installation über Docker

Falls du Docker verwendest:

```bash
# Netlify CLI im Container ausführen
docker run --rm -it -v $(pwd):/usr/src/app -w /usr/src/app netlify/cli:latest
```

### 1.5 Installation prüfen

Überprüfe die erfolgreiche Installation:

```bash
# CLI-Version prüfen
netlify --version

# Erwartete Ausgabe (Versionsnummer kann abweichen)
# netlify-cli/13.3.0 darwin-arm64 node-v18.18.0
```

## 🔐 2. Netlify Authentication Setup

### 2.1 Login via Browser

Der einfachste Weg ist die Browser-Anmeldung:

```bash
# Öffnet automatisch den Browser für die Anmeldung
netlify login

# Erwartete Ausgabe:
# Opening https://app.netlify.com/cli?hostname=...
# Successfully logged in!
```

### 2.2 Manual Token Authentication

Falls der Browser-Zugriff nicht möglich ist:

1. **Personal Access Token erstellen:**
   - Gehe zu [Netlify App](https://app.netlify.com/user/applications)
   - Klicke auf "New access token"
   - Gib dem Token einen Namen (z.B. "CLI Deployment")
   - Kopiere den generierten Token

2. **Token im CLI setzen:**

```bash
# Token manuell setzen
netlify auth:login --token DEIN_PERSONAL_ACCESS_TOKEN

# Alternative: Token als Umgebungsvariable setzen
export NETLIFY_AUTH_TOKEN=DEIN_PERSONAL_ACCESS_TOKEN
```

### 2.3 Authentifizierung prüfen

```bash
# Aktuellen Benutzer prüfen
netlify status

# Erwartete Ausgabe:
# ────────────────
# Current user
# ────────────────
# Name: Dein Name
# Email: deine@email.com
# ID: user_xxxxxxxxxxxxxxxx
```

## 🚀 3. Schritt-für-Schritt CLI Deployment

### 3.1 Projekt vorbereiten

Stelle sicher, dass dein Projekt bereit für die Bereitstellung ist:

```bash
# In das Projektverzeichnis wechseln
cd /pfad/zum/kleinanzeigen-genius-ai

# Abhängigkeiten installieren
npm install

# Lokalen Build testen
npm run build

# Preview des Builds starten
npm run preview
```

### 3.2 Neues Netlify Site erstellen

```bash
# Neue Site im Interaktiven Modus erstellen
netlify init

# Oder mit vorgegebenen Optionen
netlify init --manual
```

**Interaktive Befragung (bei `netlify init`):**

```
? What would you like to do? › - Use arrow-keys. Return to submit.
  ◦ Configure this site
  └ Create & configure a new site
```

Wähle "Create & configure a new site" und folge den Anweisungen:

```
? Team: › Dein Team (oder "Personal")
? Site name: › kleinanzeigen-genius-ai (oder automatisch generiert)
? Repository: › GitHub-Repository auswählen
? Branch to deploy: › main
? Build command: › npm run build
? Publish directory: › dist
```

### 3.3 Bestehende Site konfigurieren

Falls du bereits eine Site hast:

```bash
# Zu existierender Site verbinden
netlify link --id DEINE_SITE_ID

# Oder interaktiv
netlify link
```

**Site ID finden:**
- Gehe zu deiner Site in Netlify
- URL: `https://app.netlify.com/sites/SITE_ID`
- Die Site ID ist die alphanumerische Zeichenkette nach `/sites/`

### 3.4 Build-Einstellungen konfigurieren

```bash
# Build-Befehl setzen
netlify configure --build-command "npm run build"

# Publish-Verzeichnis setzen
netlify configure --publish-dir "dist"

# Node.js Version setzen
netlify env:set NODE_VERSION "18"
```

### 3.5 API Keys via CLI konfigurieren

```bash
# OpenRouter API Key setzen
netlify env:set VITE_OPENROUTER_KEY "sk-or-v1-deine-api-key"

# Google Gemini API Key setzen
netlify env:set VITE_GEMINI_KEY "AIzaSy-deine-api-key"

# App-Konfiguration setzen
netlify env:set VITE_APP_TITLE "Kleinanzeigen Genius AI"
netlify env:set VITE_APP_DESCRIPTION "KI-gestützte Kleinanzeigen Erstellung mit Fotoanalyse"
netlify env:set VITE_APP_URL "https://deine-site.netlify.app"
netlify env:set VITE_ENABLE_ANALYTICS "false"
netlify env:set VITE_ENABLE_DEBUG "false"
netlify env:set VITE_ENABLE_SERVICE_WORKER "true"
```

**Umgebungsvariablen prüfen:**

```bash
# Alle gesetzten Umgebungsvariablen anzeigen
netlify env:list
```

### 3.6 Ersten Deploy durchführen

```bash
# Build und Deploy in einem Schritt
netlify deploy

# Oder nur Deploy (ohne erneuten Build)
netlify deploy --prod

# Für Production-Deploy mit Build
netlify deploy --prod --build
```

**Deploy-Optionen:**

- `netlify deploy` - Erstellt einen Draft-Deploy (für Tests)
- `netlify deploy --prod` - Erstellt einen Production-Deploy
- `netlify deploy --prod --build` - Erzwingt Neubuild und Production-Deploy

### 3.7 Git-Integration einrichten

```bash
# Git-Remote für Netlify hinzufügen
git remote add netlify https://api.netlify.com/api/v1/deploys.git/DEINE_SITE_ID

# Ersten Commit für Netlify vorbereiten
git add .
git commit -m "Initial Netlify deployment setup"

# Zu Netlify pushen
git push netlify main
```

## ⚙️ 4. Environment Variables via CLI

### 4.1 Einzelne Variablen setzen

```bash
# API Keys
netlify env:set VITE_OPENROUTER_KEY "sk-or-v1-deine-api-key"
netlify env:set VITE_GEMINI_KEY "AIzaSy-deine-api-key"

# App-Konfiguration
netlify env:set VITE_APP_TITLE "Kleinanzeigen Genius AI"
netlify env:set VITE_APP_DESCRIPTION "KI-gestützte Kleinanzeigen Erstellung"
netlify env:set VITE_APP_URL "https://deine-site.netlify.app"

# Feature Flags
netlify env:set VITE_ENABLE_ANALYTICS "false"
netlify env:set VITE_ENABLE_DEBUG "false"
netlify env:set VITE_ENABLE_SERVICE_WORKER "true"

# Build-Konfiguration
netlify env:set NODE_VERSION "18"
netlify env:set NPM_FLAGS "--production=false"
```

### 4.2 Mehrere Variablen gleichzeitig setzen

```bash
# Batch-Einrichtung von Umgebungsvariablen
cat <<EOF | netlify env:set
VITE_OPENROUTER_KEY=sk-or-v1-deine-api-key
VITE_GEMINI_KEY=AIzaSy-deine-api-key
VITE_APP_TITLE=Kleinanzeigen Genius AI
VITE_APP_DESCRIPTION=KI-gestützte Kleinanzeigen Erstellung
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_DEBUG=false
EOF
```

### 4.2 Variablen aus Datei importieren

```bash
# Erstelle eine .env-Datei
cat > .env.netlify << EOF
VITE_OPENROUTER_KEY=sk-or-v1-deine-api-key
VITE_GEMINI_KEY=AIzaSy-deine-api-key
VITE_APP_TITLE=Kleinanzeigen Genius AI
VITE_APP_DESCRIPTION=KI-gestützte Kleinanzeigen Erstellung
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_DEBUG=false
VITE_ENABLE_SERVICE_WORKER=true
NODE_VERSION=18
NPM_FLAGS=--production=false
EOF

# Variablen aus Datei importieren
netlify env:import .env.netlify
```

### 4.3 Variablen verwalten

```bash
# Alle Umgebungsvariablen anzeigen
netlify env:list

# Einzelne Variable anzeigen
netlify env:get VITE_APP_TITLE

# Variable löschen
netlify env:unset VITE_ENABLE_DEBUG

# Variable aktualisieren
netlify env:set VITE_APP_TITLE "Neuer App Titel"
```

### 4.4 Kontext-spezifische Variablen

```bash
# Production-spezifische Variablen
netlify env:set VITE_ENABLE_ANALYTICS "true" --context production
netlify env:set VITE_APP_URL "https://production-url.netlify.app" --context production

# Deploy-preview Variablen
netlify env:set VITE_ENABLE_DEBUG "true" --context deploy-preview
```

## ✅ 5. Build und Deployment Verification

### 5.1 Build-Prozess überwachen

```bash
# Live-Build-Logs anzeigen
netlify build --dry-run

# Build mit detaillierten Logs
netlify build --verbose
```

### 5.2 Deploy-Status prüfen

```bash
# Letzten Deploy-Status anzeigen
netlify status

# Alle Deploys anzeigen
netlify deploy:list

# Details zu einem bestimmten Deploy
netlify deploy:info DEPLOY_ID
```

### 5.3 Site-URLs prüfen

```bash
# Production-URL anzeigen
netlify status

# Alle verfügbaren URLs anzeigen
netlify deploy:list --json

# Custom Domain prüfen
netlify dns:list
```

### 5.4 Build-Logs analysieren

```bash
# Letzten Build-Logs anzeigen
netlify logs:build

# Live-Logs während des Builds
netlify build --stream-logs

# Spezifische Log-Level
netlify build --verbose --debug
```

### 5.5 Funktionstest nach Deploy

```bash
# Production-URL testen
curl -I https://deine-site.netlify.app

# API-Endpunkte testen
curl https://deine-site.netlify.app/api/health

# Service Worker testen
curl https://deine-site.netlify.app/sw.js
```

### 5.6 Performance-Check

```bash
# Lighthouse-Bewertung (manuell)
# Gehe zu: https://web.dev/measure/
# Trage deine URL ein: https://deine-site.netlify.app

# PageSpeed Insights (manuell)
# Gehe zu: https://pagespeed.web.dev/
# Trage deine URL ein
```

## 📚 6. Häufige CLI Befehle

### 6.1 Grundlegende Befehle

```bash
# Hilfe zu allen Befehlen
netlify --help

# Version prüfen
netlify --version

# Status anzeigen
netlify status

# Login/Logout
netlify login
netlify logout
```

### 6.2 Site-Verwaltung

```bash
# Neue Site erstellen
netlify init

# Bestehende Site verbinden
netlify link

# Site konfigurieren
netlify configure

# Site öffnen
netlify open

# Site löschen
netlify delete
```

### 6.3 Deployment-Befehle

```bash
# Draft-Deploy erstellen
netlify deploy

# Production-Deploy
netlify deploy --prod

# Force Deploy (Cache leeren)
netlify deploy --prod --clearCache

# Deploy mit Build erzwingen
netlify deploy --prod --build

# Deploys auflisten
netlify deploy:list

# Deploy stoppen
netlify deploy:cancel DEPLOY_ID

# Deploy löschen
netlify deploy:delete DEPLOY_ID
```

### 6.4 Environment-Management

```bash
# Umgebungsvariablen verwalten
netlify env:list
netlify env:set KEY VALUE
netlify env:get KEY
netlify env:unset KEY
netlify env:import FILE_PATH
netlify env:clear

# Kontext-spezifische Variablen
netlify env:set KEY VALUE --context production
netlify env:set KEY VALUE --context deploy-preview
```

### 6.5 Build-Management

```bash
# Build ausführen
netlify build

# Build mit Logs
netlify build --stream-logs

# Build im Trockenlauf
netlify build --dry-run

# Build-Logs anzeigen
netlify logs:build

# Clear Cache
netlify clear:cache
```

### 6.6 Funktionen und Edge

```bash
# Functions verwalten
netlify functions:list
netlify functions:create NAME
netlify functions:invoke NAME

# Edge Functions
netlify edge:handlers:list
netlify edge:handlers:create NAME

# Redirects verwalten
netlify redirects:list
netlify redirects:create
```

### 6.7 Formulare und Identity

```bash
# Forms verwalten
netlify forms:list

# Identity verwalten
netlify identity:list
netlify identity:invite EMAIL

# Large Media
netlify media:list
netlify media:enable
```

## 🔧 7. fortgeschrittene CLI-Workflows

### 7.1 CI/CD Integration

```bash
# GitHub Actions Workflow (Beispiel)
cat > .github/workflows/deploy.yml << 'EOF'
name: Deploy to Netlify
on:
  push:
    branches: [ main ]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm install
      - run: npm run build
      - uses: netlify/actions/cli@master
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
        with:
          args: deploy --prod --dir=dist
EOF
```

### 7.2 Multi-Environment Setup

```bash
# Development Environment
netlify env:set VITE_APP_URL "https://dev-deine-site.netlify.app" --context development
netlify env:set VITE_ENABLE_DEBUG "true" --context development

# Staging Environment
netlify env:set VITE_APP_URL "https://staging-deine-site.netlify.app" --context branch:staging
netlify env:set VITE_ENABLE_DEBUG "true" --context deploy-preview

# Production Environment
netlify env:set VITE_APP_URL "https://deine-site.netlify.app" --context production
netlify env:set VITE_ENABLE_ANALYTICS "true" --context production
```

### 7.3 Bulk Operations

```bash
# Massenweise Umgebungsvariablen setzen
cat > env_vars.txt << 'EOF'
VITE_OPENROUTER_KEY=sk-or-v1-key1
VITE_GEMINI_KEY=AIza-key2
VITE_APP_TITLE=Kleinanzeigen Genius AI
EOF

# Import mit einem Befehl
netlify env:import env_vars.txt

# Oder per Skript
while IFS= read -r line; do
  if [[ $line == *=* ]]; then
    key="${line%%=*}"
    value="${line#*=}"
    netlify env:set "$key" "$value"
  fi
done < env_vars.txt
```

### 7.4 Automatisierte Deploy-Skripte

```bash
# deploy.sh - Automatisierter Deploy-Script
cat > deploy.sh << 'EOF'
#!/bin/bash
set -e

echo "🚀 Starting Netlify deployment..."

# Prüfe ob im richtigen Verzeichnis
if [ ! -f "package.json" ]; then
    echo "❌ package.json nicht gefunden. Bist du im richtigen Verzeichnis?"
    exit 1
fi

# Abhängigkeiten installieren
echo "📦 Installing dependencies..."
npm install

# Build durchführen
echo "🔨 Building application..."
npm run build

# Deploy durchführen
echo "🚀 Deploying to Netlify..."
netlify deploy --prod --build

echo "✅ Deployment completed successfully!"
echo "🌐 Your app is live at: $(netlify status | grep "Current site" | awk '{print $4}')"
EOF

# Skript ausführbar machen
chmod +x deploy.sh

# Skript ausführen
./deploy.sh
```

## 🛠️ 8. Troubleshooting CLI Probleme

### 8.1 Authentifizierungsprobleme

**Problem:** `netlify login` öffnet keinen Browser oder schlägt fehl

```bash
# Lösung 1: Manueller Token
netlify auth:login --token DEIN_PERSONAL_ACCESS_TOKEN

# Lösung 2: Token als Umgebungsvariable
export NETLIFY_AUTH_TOKEN=DEIN_PERSONAL_ACCESS_TOKEN

# Lösung 3: Konfigurationsdatei prüfen
cat ~/.netlify/config.json
rm ~/.netlify/config.json  # Löschen und neu anmelden
```

**Problem:** "Not logged in" Fehler

```bash
# Login erzwingen
netlify logout
netlify login

# Token prüfen
echo $NETLIFY_AUTH_TOKEN

# Berechtigungen prüfen
netlify status
```

### 8.2 Build-Fehler

**Problem:** Build schlägt fehl

```bash
# Detaillierte Build-Logs anzeigen
netlify build --verbose --debug

# Lokalen Build testen
npm run build

# Abhängigkeiten prüfen
npm ls --depth=0

# Node.js Version prüfen
node --version
netlify env:get NODE_VERSION
```

**Problem:** "Module not found" Fehler

```bash
# package.json prüfen
cat package.json

# Abhängigkeiten neu installieren
rm -rf node_modules package-lock.json
npm install

# Build-Umgebung simulieren
netlify build --dry-run
```

### 8.3 Deploy-Fehler

**Problem:** Deploy hängt oder ist langsam

```bash
# Deploy-Status prüfen
netlify deploy:list

# Deploy abbrechen
netlify deploy:cancel LATEST_DEPLOY_ID

# Deploy neu starten
netlify deploy --prod --clearCache
```

**Problem:** "Site not found" Fehler

```bash
# Site-ID prüfen
netlify status

# Site neu verbinden
netlify link

# Site-ID manuell setzen
netlify link --id DEINE_SITE_ID
```

### 8.4 Environment Variables Probleme

**Problem:** Umgebungsvariablen werden nicht erkannt

```bash
# Gesetzte Variablen prüfen
netlify env:list

# Variable neu setzen
netlify env:set VITE_API_KEY "neuer-wert"

# Deploy nach Variablenänderung
netlify deploy --prod
```

**Problem:** "Invalid key format" Fehler

```bash
# Key-Format prüfen
# VITE_ Präfix erforderlich für Frontend-Zugriff
netlify env:set VITE_API_KEY "wert"

# Sonderzeichen escapen
netlify env:set VITE_API_KEY "wert-mit-\\$-zeichen"
```

### 8.5 Netzwerkprobleme

**Problem:** "Connection timeout" oder "Network error"

```bash
# Internetverbindung prüfen
ping api.netlify.com

# Proxy-Einstellungen prüfen
echo $HTTP_PROXY
echo $HTTPS_PROXY

# Netlify API direkt testen
curl -H "User-Agent: netlify-cli" https://api.netlify.com/api/v1/sites
```

**Problem:** "SSL certificate" Fehler

```bash
# SSL-Zertifikat prüfen
openssl s_client -connect api.netlify.com:443

# Node.js SSL-Überprüfung deaktivieren (nur für Tests)
export NODE_TLS_REJECT_UNAUTHORIZED=0
```

### 8.6 Cache-Probleme

**Problem:** Alter Code wird weiterhin ausgeliefert

```bash
# Build-Cache leeren
netlify clear:cache

# Deploy mit leerem Cache
netlify deploy --prod --clearCache

# Browser-Cache leeren (manuell)
# Öffne Entwicklertools > Network > "Disable cache" anhaken
```

### 8.7 Git-Integration Probleme

**Problem:** "Repository not found" bei `netlify init`

```bash
# Git-Remote prüfen
git remote -v

# GitHub Repository verbinden
netlify init --manual

# Repository-Zugriff prüfen
git ls-remote origin
```

### 8.8 Debugging-Tools

```bash
# Debug-Modus aktivieren
export DEBUG=netlify:*
netlify deploy

# Detaillierte Logs speichern
netlify deploy --verbose > deploy.log 2>&1

# API-Aufrufe debuggen
curl -v https://api.netlify.com/api/v1/sites \
  -H "Authorization: Bearer $NETLIFY_AUTH_TOKEN"
```

## 📋 9. Best Practices für CLI Deployment

### 9.1 Sicherheit

```bash
# API Keys niemals im Code committen
echo ".env*" >> .gitignore
echo "VITE_*" >> .gitignore  # Falsch! Nur lokale .env-Dateien

# Tokens in CI/CD als Secrets speichern
# GitHub Secrets: NETLIFY_AUTH_TOKEN, NETLIFY_SITE_ID
```

### 9.2 Automatisierung

```bash
# Deploy-Skript für konsistente Deployments
cat > scripts/deploy.sh << 'EOF'
#!/bin/bash
set -euo pipefail

echo "Starting deployment..."
npm run build
netlify deploy --prod --build
echo "Deployment completed!"
EOF

# Package.json Skript hinzufügen
npm pkg set scripts.deploy="./scripts/deploy.sh"
```

### 9.3 Monitoring

```bash
# Deploy-Benachrichtigungen einrichten
netlify status --json | jq '.site_url'

# Health-Check Endpoint einrichten
cat > functions/health.js << 'EOF'
export handler = async (event, context) => {
  return {
    statusCode: 200,
    body: JSON.stringify({ status: "ok", timestamp: new Date().toISOString() })
  }
}
EOF
```

### 9.4 Backup & Recovery

```bash
# Konfiguration sichern
netlify status --json > netlify-backup.json
netlify env:list --json > env-backup.json

# Site-Einstellungen exportieren
netlify configure --json > netlify-config.json
```

## 🎯 10. Zusammenfassung der wichtigsten Befehle

```bash
# Installation und Setup
npm install -g netlify-cli
netlify login
netlify init

# Entwicklung
netlify dev                    # Lokale Entwicklungsumgebung
netlify build                  # Build durchführen
netlify deploy                 # Draft-Deploy
netlify deploy --prod          # Production-Deploy

# Environment Management
netlify env:list               # Alle Variablen anzeigen
netlify env:set KEY VALUE      # Variable setzen
netlify env:unset KEY          # Variable löschen

# Monitoring
netlify status                 # Site-Status anzeigen
netlify deploy:list            # Alle Deploys anzeigen
netlify logs:build             # Build-Logs anzeigen

# Troubleshooting
netlify clear:cache            # Cache leeren
netlify logout                 # Logout
netlify auth:login --token     # Token-basiertes Login
```

## 📞 Support & Ressourcen

### Offizielle Dokumentation
- [Netlify CLI Documentation](https://docs.netlify.com/cli/)
- [Netlify API Documentation](https://open-api.netlify.com/)

### Community & Support
- [Netlify Community Forum](https://community.netlify.com/)
- [Netlify Status](https://status.netlify.com/)
- [GitHub Issues](https://github.com/netlify/cli/issues)

### Hilfreiche Tools
- [Netlify CLI Reference](https://cli.netlify.com/)
- [Netlify Functions Playground](https://functions.netlify.com/)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)

---

**💡 Tipp:** Für eine optimale Erfahrung mit dem Netlify CLI, speichere deine häufig verwendeten Befehle in einem Shell-Skript oder als npm-Skripte in deiner `package.json`.

**⚠️ Wichtig:** Vergiss nicht, deine API Keys regelmäßig zu überprüfen und bei Verdacht auf Missbrauch zu erneuern. Nutze die Monitoring-Funktionen von Netlify, um die Performance und Verfügbarkeit deiner Anwendung zu überwachen.

Viel Erfolg mit deiner CLI-basierten Netlify-Bereitstellung! 🚀