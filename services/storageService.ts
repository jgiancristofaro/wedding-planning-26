
import { AppState, SyncConfig } from "../types";

let currentConfig: SyncConfig | null = null;
let pollingInterval: number | null = null;

// The document path: projects/{projectId}/databases/(default)/documents/{collection}/{docId}
const COLLECTION = "wedding_planner";
const DOC_ID = "main_db";

export const initSync = (config: SyncConfig): boolean => {
  if (!config.projectId || !config.apiKey) return false;
  currentConfig = config;
  return true;
};

// Helper to construct the REST URL
const getUrl = (docId: string = DOC_ID, config: SyncConfig | null = currentConfig) => {
  if (!config) return null;
  return `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents/${COLLECTION}/${docId}?key=${config.apiKey}`;
};

export const verifyConnection = async (config: SyncConfig): Promise<{ valid: boolean; error?: string }> => {
  // 1. TRY TO READ (Check if project exists/is enabled)
  const readUrl = getUrl(DOC_ID, config);
  if (!readUrl) return { valid: false, error: "Invalid Configuration" };

  try {
    const readResponse = await fetch(readUrl, { cache: 'no-store' });
    
    // 403/400/401 = Permission denied or invalid config (API not enabled)
    if (!readResponse.ok && readResponse.status !== 404) {
      const errJson = await readResponse.json().catch(() => ({}));
      const msg = errJson.error?.message || readResponse.statusText;
      
      let helpfulTip = "";
      if (readResponse.status === 403) {
        helpfulTip = " (PERMISSION DENIED)";
      }

      return { valid: false, error: `Read Error (${readResponse.status}): ${msg}${helpfulTip}` };
    }

    // 2. TRY TO WRITE (Check permissions)
    // We try to patch a dummy document to ensure we have write access.
    const TEST_DOC_ID = "_connectivity_test";
    const writeUrl = getUrl(TEST_DOC_ID, config);
    
    if (!writeUrl) return { valid: false };

    const testBody = {
      fields: {
        lastVerified: { timestampValue: new Date().toISOString() }
      }
    };

    const writeResponse = await fetch(writeUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testBody)
    });

    if (!writeResponse.ok) {
      const errJson = await writeResponse.json().catch(() => ({}));
      const msg = errJson.error?.message || writeResponse.statusText;
      return { valid: false, error: `Write Permission Error (${writeResponse.status}): ${msg}. Check your Firestore Security Rules.` };
    }

    return { valid: true };

  } catch (error) {
    console.error("Verification failed", error);
    return { valid: false, error: error instanceof Error ? error.message : "Network Error" };
  }
};

export const saveDataToCloud = async (data: AppState) => {
  const url = getUrl();
  if (!url || !currentConfig) return;

  const docPath = `projects/${currentConfig.projectId}/databases/(default)/documents/${COLLECTION}/${DOC_ID}`;

  // We store the entire state as a string in a field named 'payload'
  const body = {
    name: docPath, // Explicitly naming the document helps with strict API validation
    fields: {
      payload: {
        stringValue: JSON.stringify(data)
      },
      lastUpdated: {
        timestampValue: new Date().toISOString()
      }
    }
  };

  try {
    // We use PATCH to upsert the document
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      const msg = errJson.error?.message || response.statusText;
      throw new Error(`Cloud Save Error (${response.status}): ${msg}`);
    }
  } catch (error) {
    console.error("Cloud Save Error:", error);
    throw error;
  }
};

export const fetchFromCloud = async (): Promise<AppState | null> => {
  const url = getUrl();
  if (!url) return null;

  try {
    // CRITICAL: cache: 'no-store' ensures we always get the latest data from the server
    const response = await fetch(url, { cache: 'no-store' });
    
    if (!response.ok) {
      if (response.status === 404) return null; // Doc doesn't exist yet
      
      const errJson = await response.json().catch(() => ({}));
      const msg = errJson.error?.message || response.statusText;
      throw new Error(`API Error (${response.status}): ${msg}`);
    }

    const json = await response.json();
    const payloadString = json.fields?.payload?.stringValue;

    if (payloadString) {
      return JSON.parse(payloadString) as AppState;
    }
    return null;
  } catch (error) {
    console.error("Cloud Fetch Error:", error);
    throw error; // Throw so we can handle UI state in App.tsx
  }
};

export const startAutoSync = (onNewData: (data: AppState) => void) => {
  if (pollingInterval) clearInterval(pollingInterval);

  let lastKnownStringStr = "";

  // Immediate check
  const check = async () => {
    if (!currentConfig) return;
    try {
      const data = await fetchFromCloud();
      if (data) {
        const str = JSON.stringify(data);
        if (str !== lastKnownStringStr) {
          lastKnownStringStr = str;
          onNewData(data);
        }
      }
    } catch (e) {
      // Silent fail on polling errors to avoid spamming console
    }
  };

  check();
  // Poll every 10 seconds
  pollingInterval = window.setInterval(check, 10000);

  return () => {
    if (pollingInterval) clearInterval(pollingInterval);
  };
};
