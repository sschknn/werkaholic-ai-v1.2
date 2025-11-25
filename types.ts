
export interface AdData {
  title: string;
  description: string;
  category: string;
  priceMin: number;
  priceMax: number;
  suggestedPrice: number;
  keywords: string[];
  condition: string;
  reasoning: string;
}

export interface GroundingSource {
  uri: string;
  title: string;
}

export interface AnalysisResult {
  adData: AdData;
  sources: GroundingSource[];
}

export interface SavedItem {
  id: string;
  timestamp: number;
  adData: AdData;
  sources: GroundingSource[];
  imageData: string; // Base64
}

export interface Question {
  id: string;
  text: string;
}

export interface LiveLogItem {
  id: string;
  timestamp: number;
  text: string;
  imageSnapshot: string; // Base64 snapshot of the moment
}

export enum AppState {
  IDLE = 'IDLE',
  LIVESCAN = 'LIVESCAN',
  ANALYZING = 'ANALYZING',
  EDITING = 'EDITING',
  BOOKMARKS = 'BOOKMARKS',
  MARKET = 'MARKET',
  ERROR = 'ERROR'
}
