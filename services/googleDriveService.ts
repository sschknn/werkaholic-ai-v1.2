import { AdData } from "../types";

declare global {
  interface Window {
    google?: any;
  }
}

const GOOGLE_CLIENT_ID_KEY = "GOOGLE_CLIENT_ID";
const SCOPES = "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email";
const ROOT_FOLDER_NAME = "Kleinanzeigen Genius Backups";
const CONFIG_FILE_NAME = "config.json";

// Stores the access token in memory for the session
let accessToken: string | null = null;
let tokenClient: any = null;

export const setGoogleClientId = (id: string) => {
  localStorage.setItem(GOOGLE_CLIENT_ID_KEY, id);
};

export const getGoogleClientId = () => {
  return localStorage.getItem(GOOGLE_CLIENT_ID_KEY) || "";
};

/**
 * Waits for the Google Identity Services script to load.
 */
const waitForGoogleScript = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (window.google && window.google.accounts) {
            resolve();
            return;
        }

        // Check every 100ms for up to 5 seconds
        let attempts = 0;
        const interval = setInterval(() => {
            attempts++;
            if (window.google && window.google.accounts) {
                clearInterval(interval);
                resolve();
            } else if (attempts > 50) {
                clearInterval(interval);
                reject(new Error("Google Identity Services script failed to load."));
            }
        }, 100);
    });
};

/**
 * Initializes the Google Identity Services Token Client.
 */
export const initGoogleClient = async (callback: (token: string) => void) => {
  const clientId = getGoogleClientId();
  if (!clientId) return;

  try {
      await waitForGoogleScript();
      
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPES,
        callback: (response: any) => {
          if (response.access_token) {
            accessToken = response.access_token;
            callback(accessToken);
          } else if (response.error) {
            console.error("Google Auth Error:", response);
            // Optional: Handle error callback
          }
        },
      });
  } catch (e) {
      console.error("Failed to init Google Client", e);
  }
};

export const requestLogin = async (): Promise<void> => {
  try {
      if (!tokenClient) {
        // Retry init if it wasn't done at start
        await initGoogleClient((token) => {
            console.log("Lazy init success");
        });
      }
      
      if (tokenClient) {
        // 'select_account' forces the account chooser, avoiding hidden auto-select failures
        tokenClient.requestAccessToken({ prompt: 'select_account' }); 
      } else {
        throw new Error("Google Client konnte nicht initialisiert werden. Bitte lade die Seite neu.");
      }
  } catch (e) {
      console.error(e);
      throw e;
  }
};

export const logout = () => {
  if (accessToken && window.google) {
    window.google.accounts.oauth2.revoke(accessToken, () => {
      console.log("Access token revoked");
    });
  }
  accessToken = null;
};

export const getUserInfo = async (token: string) => {
  const res = await fetch("https://www.googleapis.com/oauth2/v1/userinfo?alt=json", {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Failed to fetch user info");
  return await res.json();
};

// --- Drive Operations ---

const searchFile = async (query: string) => {
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  const data = await res.json();
  return data.files && data.files.length > 0 ? data.files[0] : null;
};

const createFolder = async (name: string, parents: string[] = []) => {
  const metadata = {
    name,
    mimeType: "application/vnd.google-apps.folder",
    parents: parents.length > 0 ? parents : undefined
  };

  const res = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(metadata)
  });
  return await res.json();
};

const uploadFile = async (name: string, content: string | Blob, mimeType: string, parentId: string) => {
  const metadata = {
    name,
    parents: [parentId]
  };

  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  
  if (typeof content === 'string') {
    form.append("file", new Blob([content], { type: mimeType }));
  } else {
    form.append("file", content);
  }

  const res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form
  });
  
  return await res.json();
};

/**
 * Finds or creates the root backup folder.
 */
const getRootFolderId = async () => {
  const existing = await searchFile(`mimeType='application/vnd.google-apps.folder' and name='${ROOT_FOLDER_NAME}' and trashed=false`);
  if (existing) return existing.id;
  
  const newFolder = await createFolder(ROOT_FOLDER_NAME);
  return newFolder.id;
};

/**
 * Main Backup Function
 */
export const backupAdToDrive = async (adData: AdData, imageDataBase64: string) => {
  if (!accessToken) return;

  try {
    const rootId = await getRootFolderId();
    
    // Create folder for specific item (Title + Timestamp to be unique)
    const folderName = `${adData.title.substring(0, 30)}_${Date.now()}`;
    const itemFolder = await createFolder(folderName, [rootId]);
    
    // 1. Upload Image
    const byteCharacters = atob(imageDataBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const imageBlob = new Blob([byteArray], { type: "image/jpeg" });
    
    await uploadFile("image.jpg", imageBlob, "image/jpeg", itemFolder.id);

    // 2. Upload Info Text
    const textContent = `
TITEL: ${adData.title}
PREIS: ${adData.suggestedPrice} €
KATEGORIE: ${adData.category}
ZUSTAND: ${adData.condition}

BESCHREIBUNG:
${adData.description}

TAGS:
${adData.keywords.map(k => '#' + k).join(' ')}
    `.trim();
    await uploadFile("inserat.txt", textContent, "text/plain", itemFolder.id);

    // 3. Upload Full JSON Data
    await uploadFile("data.json", JSON.stringify(adData, null, 2), "application/json", itemFolder.id);

    return true;
  } catch (error) {
    console.error("Backup failed", error);
    throw error;
  }
};

/**
 * Uploads the OpenRouter API key to the config file in Drive.
 */
export const backupApiKeyToDrive = async (apiKey: string) => {
  if (!accessToken) return;
  try {
    const rootId = await getRootFolderId();
    
    // Check if config exists, if so delete it (simple update strategy)
    const existingConfig = await searchFile(`name='${CONFIG_FILE_NAME}' and '${rootId}' in parents and trashed=false`);
    if (existingConfig) {
       await fetch(`https://www.googleapis.com/drive/v3/files/${existingConfig.id}`, {
         method: 'DELETE',
         headers: { Authorization: `Bearer ${accessToken}` }
       });
    }

    const config = { openRouterApiKey: apiKey };
    await uploadFile(CONFIG_FILE_NAME, JSON.stringify(config), "application/json", rootId);
    console.log("API Key backed up to Drive");
  } catch (e) {
    console.error("Failed to backup API key", e);
  }
};

/**
 * Tries to load the OpenRouter API key from Drive.
 */
export const restoreApiKeyFromDrive = async (): Promise<string | null> => {
  if (!accessToken) return null;
  try {
    const rootId = await getRootFolderId();
    const configFile = await searchFile(`name='${CONFIG_FILE_NAME}' and '${rootId}' in parents and trashed=false`);
    
    if (configFile) {
       const res = await fetch(`https://www.googleapis.com/drive/v3/files/${configFile.id}?alt=media`, {
         headers: { Authorization: `Bearer ${accessToken}` }
       });
       const data = await res.json();
       if (data && data.openRouterApiKey) {
         return data.openRouterApiKey;
       }
    }
  } catch (e) {
    console.warn("Could not restore API key from Drive", e);
  }
  return null;
};