
// ============================================================================
// ⚠️ SECURITY WARNING
// ============================================================================
// Since this is a client-side application, values placed here are visible to
// anyone who views the source code of your deployed website.
//
// RECOMMENDED USE:
// - Local Development: Safe.
// - Private/Internal Hosting: Acceptable.
// - Public Hosting: NOT RECOMMENDED. Use the in-app Settings tab instead.
// ============================================================================

export const APP_CONFIG = {
  // We attempt to load the Project ID from the environment.
  // If not available, leave as empty string and use the in-app Settings tab.
  projectId: "gen-lang-client-0820339918", 
  
  // The API Key is automatically loaded from the secure environment variable.
  apiKey: process.env.API_KEY || ""
};