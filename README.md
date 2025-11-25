# 📱 Live-Scanner mit Voice-Chat

<div align="center">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=FFFFFF" />
  <img src="https://img.shields.io/badge/Capacitor-1B56B9?style=for-the-badge&logo=capacitor&logoColor=FFFFFF" />
  <img src="https://img.shields.io/badge/Gemini%20AI-Green?style=for-the-badge&logo=google&logoColor=FFFFFF" />
</div>

Ein modernes Mobile- und Web-Anwendung für das Scannen von Artikeln mit integriertem Voice-Chat zur Produktbewertung und Preisvergleich.

## 🌟 Features

### 📸 Live-Scanner
- **Echtzeit-Video-Stream**: Direktes Scannen von Artikeln durch die Kamera
- **Bildverarbeitung**: Automatische Erkennung und Analyse von Produkten
- **Speicherung**: Möglichkeit, gescannte Artikel zu speichern und zu verwalten

### 💬 Voice-Chat
- **Sprachinteraktion**: Natürliche Kommunikation mit KI über Sprache
- **Produktbewertung**: KI-gestützte Analyse und Bewertung von Artikeln
- **Preisvergleich**: Automatischer Vergleich mit ähnlichen Produkten
- **Empfehlungen**: Personalisierte Vorschläge basierend auf Scan-Ergebnissen

### 🎯 Weitere Funktionen
- **Responsive Design**: Optimiert für Mobile und Desktop
- **Offline-Funktionen**: Teilweise Nutzung ohne Internetverbindung
- **Cloud-Speicherung**: Sichere Ablage von Scan-Ergebnissen
- **Echtzeit-Updates**: Aktuelle Preise und Bewertungen

## 🚀 Technologie-Stack

- **Frontend**: React 18 + TypeScript
- **Mobile**: Capacitor für native Mobile-Integration
- **State-Management**: Modernes React State-Management
- **Styling**: CSS3 mit modernen Layout-Techniken
- **API**: Google Gemini AI Integration
- **Build-Tool**: Vite für schnelles Development

## 📦 Installation & Einrichtung

### Voraussetzungen
- Node.js (v16 oder höher)
- npm oder pnpm
- Google Gemini API Key

### 1. Repository klonen
```bash
git clone <DEIN_REPOSITORY_LINK>
cd live-scanner-voice-chat
```

### 2. Abhängigkeiten installieren
```bash
npm install
# ODER
pnpm install
```

### 3. API-Schlüssel konfigurieren

1. **Google Gemini API Key besorgen**:
   - Gehe zu [Google AI Studio](https://makersuite.google.com/)
   - Erstelle ein neues Projekt oder wähle ein bestehendes aus
   - Generiere einen API-Key unter "Settings" → "API Keys"

2. **Umgebungsvariablen konfigurieren**:
   ```bash
   cp .env.example .env.local
   ```

3. **API-Key eintragen**:
   ```bash
   # .env.local
   VITE_GEMINI_API_KEY=dein_api_key_hier
   ```

### 4. App starten
```bash
# Development-Modus
npm run dev

# Production-Build
npm run build

# Preview des Production-Builds
npm run preview
```

## 📱 Mobile-Installation

### Android
```bash
# Android-Plattform hinzufügen
npx cap add android

# Native IDE öffnen
npx cap open android

# In Android Studio: Build → Run
```

### iOS
```bash
# iOS-Plattform hinzufügen
npx cap add ios

# Native IDE öffnen
npx cap open ios

# In Xcode: Build → Run
```

## 🔧 Konfiguration

### Umgebungsvariablen
| Variable | Beschreibung | Erforderlich |
|----------|-------------|-------------|
| `VITE_GEMINI_API_KEY` | Google Gemini API Key | Ja |
| `VITE_API_ENDPOINT` | Backend-API-Endpoint | Nein |

### Capacitor-Konfiguration
Die `capacitor.config.ts` enthält alle notwendigen Einstellungen für die native Integration.

## 📸 Screenshots

> [Füge hier Screenshots deiner Anwendung ein]
>
> Beispiel:
> ![App Screenshot](https://via.placeholder.com/800x450.png)

## 🎥 Demo

> [Füge hier ein Demo-Video oder GIF ein]
>
> Beispiel:
> [![Demo Video](https://img.youtube.com/vi/VIDEO_ID/maxresdefault.jpg)](https://youtu.be/VIDEO_ID)

## 🤝 Mitwirken

1. Fork das Projekt
2. Erstelle einen neuen Branch (`git checkout -b feature/AmazingFeature`)
3. Committe deine Änderungen (`git commit -m 'Add some AmazingFeature'`)
4. Push zum Branch (`git push origin feature/AmazingFeature`)
5. Öffne einen Pull Request

## 📄 Lizenz

Dieses Projekt ist unter der MIT-Lizenz lizenziert - siehe die [LICENSE](LICENSE) Datei für Details.

## 🙏 Dank

- [Google Gemini AI](https://ai.google/gemini/) für die KI-Integration
- [React](https://reactjs.org/) für das Frontend-Framework
- [Capacitor](https://capacitorjs.com/) für die Mobile-Integration
- [Vite](https://vitejs.dev/) für das Build-Tool

## 📞 Support

Für Fragen, Probleme oder Feature-Requests:

- Erstelle ein [Issue](../../issues)
- Nutze die [Discussions](../../discussions)
- Kontaktiere das Team per E-Mail

---

**💡 Tipp**: Lies die [`API_KEY_UPDATE.md`](API_KEY_UPDATE.md) für detaillierte Anweisungen zur API-Key-Konfiguration.
