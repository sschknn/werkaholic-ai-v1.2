
import { SavedItem } from "../types";

/**
 * Trigger a download of the current saved items as a JSON file.
 */
export const downloadBackup = (items: SavedItem[]) => {
  try {
    const dataStr = JSON.stringify(items, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `kleinanzeigen_genius_backup_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    return true;
  } catch (e) {
    console.error("Backup download failed", e);
    throw e;
  }
};

/**
 * Parse a JSON file and return the SavedItem array.
 * Validates the structure roughly.
 */
export const importBackupFromFile = (file: File): Promise<SavedItem[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const result = event.target?.result as string;
        const parsed = JSON.parse(result);
        
        if (!Array.isArray(parsed)) {
            throw new Error("Ungültiges Format: Datei muss eine Liste von Items sein.");
        }
        
        // Basic validation check on first item if exists
        if (parsed.length > 0 && (!parsed[0].id || !parsed[0].adData)) {
            throw new Error("Ungültiges Format: Datenstruktur stimmt nicht überein.");
        }

        resolve(parsed as SavedItem[]);
      } catch (e) {
        reject(e);
      }
    };
    
    reader.onerror = () => reject(new Error("Fehler beim Lesen der Datei"));
    reader.readAsText(file);
  });
};
