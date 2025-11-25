# GitHub Repository Setup Anleitung

Diese Anleitung erklärt Schritt für Schritt, wie du das Live-Scanner mit Voice-Chat Repository auf GitHub einrichtest.

## 1. GitHub Repository erstellen

### 1.1 Repository auf GitHub anlegen
1. Gehe zu [github.com](https://github.com) und melde dich an
2. Klicke auf das "+" Symbol in der rechten oberen Ecke
3. Wähle "New repository" aus dem Dropdown-Menü

### 1.2 Repository-Details ausfüllen
- **Repository name**: `live-scanner-voice-chat` (oder ein Name deiner Wahl)
- **Description**: "📱 Live-Scanner mit Voice-Chat - Mobile App für das Scannen von Artikeln mit integriertem Voice-Chat zur Produktbewertung und Preisvergleich"
- **Visibility**: Wähle zwischen "Public" (öffentlich) oder "Private" (privat)
- **Initialize this repository with a README**: ✅ Deaktivieren (wir haben bereits eine README.md)
- **Add .gitignore**: ✅ Deaktivieren (wir haben bereits ein .gitignore)
- **Add a license**: ✅ Deaktivieren (wir werden die Lizenz manuell hinzufügen)

4. Klicke auf "Create repository"

## 2. Lokales Repository mit GitHub verbinden

### 2.1 Remote-Repository hinzufügen
Ersetze `DEIN_GITHUB_BENUTZERNAME` mit deinem GitHub-Benutzernamen:

```bash
git remote add origin https://github.com/DEIN_GITHUB_BENUTZERNAME/live-scanner-voice-chat.git
```

### 2.2 Ersten Push durchführen
```bash
git branch -M main
git push -u origin main
```

### 2.3 Authentifizierung
GitHub wird dich zur Authentifizierung auffordern:
- **Option 1**: Benutze deine GitHub-Benutzername und Passwort (wenn nicht bereits eingeloggt)
- **Option 2**: Erstelle einen Personal Access Token (empfohlen)
  1. Gehe zu [github.com/settings/tokens](https://github.com/settings/tokens)
  2. Klicke auf "Generate new token"
  3. Wähle "Fine-grained tokens"
  4. Gib dem Token einen Namen (z.B. "Git Push")
  5. Setze die Ablaufzeit
  6. Unter "Repository access" wähle "Only this repository" und gib den Repository-Namen ein
  7. Unter "Repository permissions" aktiviere:
     - Contents: Read and write
     - Pull requests: Read and write
  8. Klicke auf "Generate token"
  9. Kopiere den Token und verwende ihn als Passwort beim Push

## 3. Optional: GitHub Pages einrichten

### 3.1 GitHub Pages aktivieren
1. Gehe zu deinem Repository auf GitHub
2. Klicke auf den Reiter "Settings"
3. Scrolle nach unten zum Abschnitt "Pages"
4. Unter "Source" wähle "Deploy from a branch"
5. Wähle "main" als Branch und "/" als Folder
6. Klicke auf "Save"

### 3.2 Warte auf die Bereitstellung
- GitHub Pages benötigt einige Minuten zur ersten Aktivierung
- Die Website wird unter `https://DEIN_GITHUB_BENUTZERNAME.github.io/live-scanner-voice-chat/` erreichbar sein
- Du erhältst eine Benachrichtigung, sobald die Seite live ist

### 3.3 Custom Domain (optional)
Wenn du eine eigene Domain verwenden möchtest:
1. Gehe zu den GitHub Pages Einstellungen
2. Trage deine Domain unter "Custom domain" ein
3. Konfiguriere die DNS-Einträge bei deinem Domain-Provider

## 4. Weitere Einrichtungsoptionen

### 4.1 Branch Protection Rules
Schütze deinen main Branch:
1. Gehe zu "Settings" → "Branches"
2. Klicke auf "Add rule"
3. Setze "main" als Branch name pattern
4. Aktiviere:
   - Require a pull request before merging
   - Require approvals
   - Dismiss stale PR approvals when new commits are pushed
   - Require review from code owners

### 4.2 Secrets für CI/CD
Falls du Continuous Integration einrichten möchtest:
1. Gehe zu "Settings" → "Secrets and variables" → "Actions"
2. Füge Geheimnisse hinzu (z.B. API-Keys für Deploy-Prozesse)

### 4.3 Issue Templates
Erstelle Vorlagen für Issues:
1. Erstelle einen Ordner `.github/ISSUE_TEMPLATE/`
2. Füge Vorlagendateien hinzu (Bug Report, Feature Request, etc.)

## 5. Sicherheitshinweise

### 5.1 API-Schlüssel schützen
- **NIEMALS** API-Schlüssel im Code committen
- Verwende immer Environment Variables
- Das `.env*` wird bereits im `.gitignore` ausgeschlossen

### 5.2 Sensitive Daten
Stelle sicher, dass folgende Dateien im `.gitignore` enthalten sind:
- `.env`
- `.env.local`
- `.env.*.local`
- `node_modules/`
- `dist/`
- `build/`

## 6. Nächste Schritte

1. **Teammitglieder einladen** (falls relevant)
2. **Wiki einrichten** für ausführliche Dokumentation
3. **Projects** für Projektmanagement nutzen
4. **Issues** für Bug-Tracking und Feature-Requests verwenden
5. **Release** für Versionierung erstellen

## 7. Troubleshooting

### Push-Fehler
```bash
# Falls du einen Fehler "Updates were rejected" erhältst:
git pull origin main --rebase
git push -u origin main
```

### Authentication-Fehler
```bash
# Cache leeren und neu authentifizieren:
git credential-cache exit
# ODER
git config --global --unset credential.helper
```

### Falsche Remote-URL
```bash
# Remote-URL überprüfen:
git remote -v
# Remote-URL ändern:
git remote set-url origin https://github.com/DEIN_BENUTZERNAME/REPO_NAME.git
```

## 8. Erfolg!

Deine Live-Scanner mit Voice-Chat Anwendung ist nun erfolgreich auf GitHub veröffentlicht! 

Die Anwendung ist unter folgenden URLs erreichbar:
- **Repository**: `https://github.com/DEIN_GITHUB_BENUTZERNAME/live-scanner-voice-chat`
- **GitHub Pages** (falls aktiviert): `https://DEIN_GITHUB_BENUTZERNAME.github.io/live-scanner-voice-chat/`

Vergiss nicht, die README.md mit echten Screenshots und Demo-Videos zu aktualisieren, sobald du diese zur Verfügung hast.