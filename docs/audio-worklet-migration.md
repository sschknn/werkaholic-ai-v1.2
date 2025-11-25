# AudioWorklet Migration Guide

## Übersicht

Diese Dokumentation beschreibt die Migration von der veralteten ScriptProcessorNode-API zur modernen AudioWorklet-API im LiveService.

## Gründe für die Migration

### Probleme mit ScriptProcessorNode
- **Veraltet**: Wurde von den Browser-Herstellern als deprecated markiert
- **Performance**: Blockiert den Main-Thread und kann zu Audio-Verzögerungen führen
- **Zukunftssicherheit**: Wird in zukünftigen Browser-Versionen entfernt werden

### Vorteile von AudioWorklet
- **Nicht-blockierend**: Läuft in einem separaten Thread
- **Bessere Performance**: Optimiert für Echtzeit-Audioverarbeitung
- **Zukunftssicher**: Moderner Standard mit langfristiger Unterstützung
- **Flexibler**: Erlaubt komplexe Audio-Verarbeitungspipelines

## Implementierungsdetails

### AudioWorklet-Processor

Die neue Audio-Verarbeitung erfolgt im [`assets/audio-processor.js`](assets/audio-processor.js) File:

```javascript
class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // Initialisierung und Setup
  }
  
  process(inputs, outputs, parameters) {
    // Echtzeit-Audioverarbeitung
  }
}
```

#### Key Features:
- **Adaptive Buffer-Größen**: Dynamische Anpassung basierend auf Audio-Aktivität
- **Noise Gate**: Unterdrückung von Hintergrundgeräuschen
- **Performance-Monitoring**: Echtzeit-Überwachung der Verarbeitungszeiten
- **Sample-Raten-Optimierung**: Anpassung an Audio-Qualität und Bandbreite

### Browser-Kompatibilität

#### Moderne Browser (AudioWorklet-Unterstützung)
- Chrome 66+
- Firefox 65+
- Safari 14.1+
- Edge 79+

#### Fallback für ältere Browser
Das System prüft automatisch die AudioWorklet-Unterstützung und fällt bei Bedarf auf ScriptProcessor zurück:

```typescript
private async initializeAudioProcessing() {
  const useAudioWorklet = await this.initializeAudioWorklet();
  
  if (!useAudioWorklet) {
    await this.initializeScriptProcessor();
  }
}
```

### Performance-Optimierungen

#### Adaptive Processing
- **Low Audio Activity**: Größere Buffer für effizientere Verarbeitung
- **High Audio Activity**: Kleinere Buffer für geringere Latenz
- **Performance Monitoring**: Automatische Optimierung basierend auf Verarbeitungszeiten

#### Memory Management
- **Buffer-Limitierung**: Verhindert Speicherprobleme durch zu große Audio-Puffer
- **Effiziente Kodierung**: Optimierte Base64-Konvertierung für große Audio-Daten
- **Noise Reduction**: Entfernt unnötige stille Abschnitte

### Audio-Qualitätsverbesserungen

#### Sample-Raten-Adaptivität
- **48kHz**: Hohe Audio-Qualität bei starker Aktivität
- **32kHz**: Standard-Qualität bei mittlerer Aktivität  
- **16kHz**: Reduzierte Qualität bei geringer Aktivität (Bandbreitenoptimierung)

#### Audio-Filterung
- **Noise Gate**: Unterdrückt Hintergrundgeräusche unter einem Schwellwert
- **Dithering**: Verbessert die Audio-Qualität bei der 16-Bit-Konvertierung
- **Clipping Prevention**: Verhindert Verzerrungen durch zu hohe Signalpegel

## Migration-Schritte

### 1. AudioWorklet-Datei erstellen
```bash
# AudioWorklet-Processor im assets-Ordner ablegen
assets/audio-processor.js
```

### 2. LiveService aktualisieren
- ScriptProcessorNode durch AudioWorkletNode ersetzen
- Message-Passing zwischen Main-Thread und AudioWorklet implementieren
- Fallback-Mechanismus für ältere Browser hinzufügen

### 3. Performance-Monitoring integrieren
- Echtzeit-Performance-Metriken im AudioWorklet
- Adaptive Optimierung basierend auf Verarbeitungszeiten
- Memory-Usage-Überwachung

### 4. Testing
- Browser-Kompatibilitätstests
- Performance-Benchmarks
- Audio-Qualitätsprüfungen

## API-Änderungen

### Nachrichten zwischen Main-Thread und AudioWorklet

#### Von AudioWorklet zum Main-Thread
```typescript
// Audio-Level-Updates
{ type: 'audioLevel', level: number, timestamp: number }

// Audio-Chunks für die Verarbeitung
{ type: 'audioChunk', audioData: Int16Array, sampleRate: number, timestamp: number }

// Performance-Metriken
{ type: 'performance', averageProcessingTime: number, optimizationNeeded: boolean, timestamp: number }

// Fehlermeldungen
{ type: 'error', error: string, timestamp: number }
```

#### Vom Main-Thread zum AudioWorklet
```typescript
// Processing-Steuerung
{ type: 'setProcessing', enabled: boolean }

// Parameter-Updates
{ type: 'updateParameters', parameters: object }
```

## Fehlerbehandlung

### AudioWorklet-Errors
- Automatischer Fallback auf ScriptProcessor bei AudioWorklet-Fehlern
- Detaillierte Fehlerprotokollierung für Debugging
- Benutzerfreundliche Fehlermeldungen

### Browser-Compatibility
- Proaktive Prüfung der Audio-API-Unterstützung
- Graceful Degradation bei fehlender Unterstützung
- Hinweise zur Browser-Aktualisierung

## Best Practices

### Für Entwickler
1. **Performance-Monitoring**: Regelmäßige Überprüfung der Audio-Verarbeitungszeiten
2. **Memory-Management**: Vermeidung von Speicherlecks durch große Audio-Puffer
3. **Error Handling**: Robuste Fehlerbehandlung für verschiedene Browser-Umgebungen
4. **Testing**: Gründliches Testing auf verschiedenen Browsern und Geräten

### Für Benutzer
1. **Browser-Aktualisierung**: Verwendung moderner Browser für beste Performance
2. **Mikrofon-Zugriff**: Sicherstellung, dass Mikrofon-Zugriff erlaubt ist
3. **Internet-Verbindung**: Stabile Verbindung für zuverlässige Audio-Übertragung

## Zukunftsentwicklung

### Geplante Verbesserungen
- **WebRTC Integration**: Direkte Audio-Streaming ohne Server-Umweg
- **Machine Learning**: Echtzeit-Noise-Cancellation mit KI
- **Multi-Channel Support**: Unterstützung für Stereo- und Surround-Audio
- **Advanced Effects**: Echtzeit-Audio-Effekte und Filter

### Performance-Ziele
- **Latency**: Unter 10ms Audio-Verarbeitungs-Latenz
- **CPU Usage**: Unter 5% CPU-Nutzung bei kontinuierlicher Verarbeitung
- **Memory Usage**: Unter 50MB Speicherverbrauch bei normaler Nutzung

## Zusammenfassung

Die Migration von ScriptProcessorNode zu AudioWorklet bietet erhebliche Vorteile in Bezug auf Performance, Zukunftssicherheit und Audio-Qualität. Das implementierte Fallback-System stellt sicher, dass die Anwendung auch auf älteren Browsern weiterhin funktioniert, während moderne Browser von den verbesserten Audio-Funktionen profitieren.

Die adaptive Verarbeitung und Performance-Optimierung sorgen für eine effiziente Audio-Verarbeitung, die sich automatisch an die jeweiligen Bedingungen anpasst, und das umfassende Testing stellt die Zuverlässigkeit und Kompatibilität sicher.