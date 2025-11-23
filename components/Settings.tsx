
import React, { useState, useEffect } from 'react';
import { SyncConfig } from '../types';
import { Cloud, Save, CheckCircle2, Info, AlertTriangle, Loader2, RefreshCw, ExternalLink } from 'lucide-react';

interface SettingsProps {
  onSave: (config: SyncConfig) => void;
  currentConfig: SyncConfig | null;
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  onForceSync?: () => void;
  lastSynced?: Date | null;
}

export const Settings: React.FC<SettingsProps> = ({ 
  onSave, 
  currentConfig, 
  isConnected, 
  isConnecting, 
  connectionError,
  onForceSync,
  lastSynced
}) => {
  const [projectId, setProjectId] = useState('');
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    if (currentConfig) {
      setProjectId(currentConfig.projectId);
      setApiKey(currentConfig.apiKey);
    }
  }, [currentConfig]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (projectId && apiKey) {
      onSave({ projectId: projectId.trim(), apiKey: apiKey.trim() });
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-wedding-200 overflow-hidden max-w-2xl mx-auto">
      <div className="bg-wedding-50 p-6 border-b border-wedding-100">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-lg shadow-sm">
            <Cloud className="w-6 h-6 text-wedding-600" />
          </div>
          <div>
            <h2 className="text-xl font-serif font-bold text-wedding-900">Simple Cloud Sync</h2>
            <p className="text-sm text-wedding-600">Sync your planner across devices using Google Cloud.</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {isConnected && !connectionError && (
          <div className="bg-green-50 text-green-800 p-4 rounded-lg border border-green-200 animate-fade-in">
            <div className="flex items-start justify-between">
               <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-green-600" />
                  <div>
                    <p className="font-bold">Sync is Active</p>
                    <p className="text-sm mt-1">Project: <span className="font-mono">{currentConfig?.projectId}</span></p>
                  </div>
               </div>
               <div className="text-right">
                 <button 
                  onClick={onForceSync}
                  disabled={isConnecting}
                  className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-green-700 hover:text-green-900 bg-green-100 hover:bg-green-200 px-3 py-1.5 rounded-md transition-colors mb-1"
                 >
                   <RefreshCw className={`w-3 h-3 ${isConnecting ? 'animate-spin' : ''}`} />
                   Force Sync
                 </button>
                 {lastSynced && (
                   <p className="text-xs text-green-600">Last synced: {lastSynced.toLocaleTimeString()}</p>
                 )}
               </div>
            </div>
          </div>
        )}

        {!isConnected && !connectionError && (
           <div className="bg-blue-50 text-blue-800 p-4 rounded-lg border border-blue-200 text-sm">
              <p className="font-bold flex items-center gap-2 mb-2">
                <Info className="w-4 h-4" /> Setup Instructions
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>This feature uses your <strong>Google Cloud Project</strong> to store data.</li>
                <li>Ensure the <strong>Cloud Firestore API</strong> is enabled in your project.</li>
                <li>Create a database in Firestore (Native Mode or Datastore Mode).</li>
                <li>Ensure your Firestore Security Rules allow read/write (Test Mode is easiest for personal use).</li>
              </ul>
          </div>
        )}

        {connectionError && (
          <div className="bg-red-50 text-red-800 p-4 rounded-lg flex items-start gap-3 border border-red-200 animate-fade-in">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="overflow-hidden w-full">
              <p className="font-bold">Connection Failed</p>
              <p className="text-sm mt-1 break-words whitespace-pre-wrap font-mono text-xs">{connectionError}</p>
              
              {/* Specific help for 403 Permission Errors */}
              {(connectionError.includes("403") || connectionError.includes("PERMISSION DENIED")) && (
                <div className="mt-3 pt-3 border-t border-red-200/50">
                  <p className="font-bold text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Info className="w-3 h-3" /> How to fix this:
                  </p>
                  <div className="bg-white/60 p-3 rounded text-sm">
                    <ol className="list-decimal pl-4 space-y-2">
                      <li>
                        Go to the <a href={`https://console.firebase.google.com/project/${projectId || currentConfig?.projectId}/firestore/rules`} target="_blank" rel="noopener noreferrer" className="underline font-bold inline-flex items-center gap-1 hover:text-red-600">
                          Firestore Rules Console <ExternalLink className="w-3 h-3" />
                        </a>
                      </li>
                      <li>
                        Replace the existing code with this (Test Mode):
                        <pre className="bg-gray-800 text-green-400 p-2 rounded mt-1 text-xs font-mono overflow-x-auto">
                          allow read, write: if true;
                        </pre>
                      </li>
                      <li>Click <strong>Publish</strong> at the top.</li>
                      <li>Come back here and click <strong>Save & Connect</strong> again.</li>
                    </ol>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-wedding-700 mb-2">
              Google Cloud Project ID
            </label>
            <input
              type="text"
              className="w-full px-4 py-2 border border-wedding-200 rounded-lg focus:ring-2 focus:ring-wedding-500 focus:outline-none"
              placeholder="e.g. wedding-planner-123"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              required
              disabled={isConnecting}
            />
            <p className="text-xs text-gray-500 mt-1">Found in your Google Cloud Console dashboard.</p>
          </div>

          <div>
            <label className="block text-sm font-bold text-wedding-700 mb-2">
              API Key
            </label>
            <input
              type="text"
              className="w-full px-4 py-2 border border-wedding-200 rounded-lg focus:ring-2 focus:ring-wedding-500 focus:outline-none font-mono text-sm"
              placeholder="AIzaSy..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              required
              disabled={isConnecting}
            />
             <p className="text-xs text-gray-500 mt-1">
               You can typically use the same API Key you use for Gemini.
             </p>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isConnecting}
                className={`
                  flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium shadow-sm transition-all
                  ${isConnecting 
                    ? 'bg-wedding-200 text-wedding-500 cursor-wait' 
                    : 'bg-wedding-600 text-white hover:bg-wedding-700'}
                `}
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save & Connect
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-400 text-center italic">
              Note: For security, these credentials are stored locally. You must enter them on every device you wish to connect.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
