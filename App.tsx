
import React, { useState, useEffect, useCallback } from 'react';
import { Header, SyncStatus } from './components/Header';
import { FileUpload } from './components/FileUpload';
import { VenueList } from './components/VenueList';
import { VendorList } from './components/VendorList';
import { Dashboard } from './components/Dashboard';
import { Settings } from './components/Settings';
import { Venue, Vendor, Tab, INITIAL_STATE, AppState, SyncConfig } from './types';
import { extractVenueData, extractVendorData } from './services/geminiService';
import { initSync, startAutoSync, saveDataToCloud, verifyConnection, fetchFromCloud } from './services/storageService';
import { LayoutDashboard, MapPin, Users, Download, Trash2, Settings as SettingsIcon, Cloud } from 'lucide-react';
import { APP_CONFIG } from './config';

const App: React.FC = () => {
  // --- STATE ---
  
  // Lazy init from local storage for offline support / first load
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('wedding_planner_data');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved state", e);
      }
    }
    return INITIAL_STATE;
  });

  const [activeTab, setActiveTab] = useState<Tab>(Tab.VENUES);
  const [isLoading, setIsLoading] = useState(false);
  
  // Sync Config & Status
  const [syncConfig, setSyncConfig] = useState<SyncConfig | null>(() => {
    const isValidConfig = 
      APP_CONFIG.projectId && 
      APP_CONFIG.projectId !== "YOUR_PROJECT_ID_HERE" && 
      APP_CONFIG.apiKey;

    if (isValidConfig) {
      return { projectId: APP_CONFIG.projectId, apiKey: APP_CONFIG.apiKey };
    }
    const saved = localStorage.getItem('wedding_planner_sync_config');
    return saved ? JSON.parse(saved) : null;
  });

  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  
  // Settings UI State
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // --- EFFECTS ---

  // 1. Initialize Cloud Sync
  useEffect(() => {
    const checkConfig = async () => {
      if (!syncConfig) return;

      setIsConnecting(true);
      setConnectionError(null);
      
      initSync(syncConfig);

      try {
        const result = await verifyConnection(syncConfig);
        if (result.valid) {
          setIsCloudConnected(true);
          setConnectionError(null);
        } else {
          setIsCloudConnected(false);
          setConnectionError(result.error || "Invalid configuration");
        }
      } catch (e) {
        setIsCloudConnected(false);
      } finally {
        setIsConnecting(false);
      }
    };

    checkConfig();
  }, [syncConfig]);

  // 2. Start Auto-Sync Polling
  useEffect(() => {
    if (isCloudConnected) {
      const stopSync = startAutoSync((remoteData) => {
        console.log("Remote changes detected, updating local state...");
        setState(remoteData); 
        localStorage.setItem('wedding_planner_data', JSON.stringify(remoteData));
        setLastSynced(new Date());
        setSyncStatus('saved');
      });
      return () => stopSync();
    }
  }, [isCloudConnected]);

  // --- HELPERS ---

  // Central function to update data: Updates Local State, Local Storage, AND Cloud
  const updateData = (newData: AppState) => {
    setState(newData);
    localStorage.setItem('wedding_planner_data', JSON.stringify(newData));
    
    if (isCloudConnected) {
      setSyncStatus('saving');
      saveDataToCloud(newData)
        .then(() => {
          setLastSynced(new Date());
          setSyncStatus('saved');
          // Clear "Saved" badge after 3 seconds
          setTimeout(() => setSyncStatus('idle'), 3000);
        })
        .catch(err => {
          console.error("Failed to auto-save to cloud:", err);
          setSyncStatus('error');
        });
    }
  };

  const handleForceSync = async () => {
    if (!isCloudConnected) return;
    setIsConnecting(true); 
    try {
      const data = await fetchFromCloud();
      if (data) {
        setState(data);
        localStorage.setItem('wedding_planner_data', JSON.stringify(data));
        setLastSynced(new Date());
        setSyncStatus('saved');
        setTimeout(() => setSyncStatus('idle'), 3000);
      }
    } catch (e) {
      console.error("Manual sync failed", e);
      setSyncStatus('error');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleVenueUpload = async (files: FileList) => {
    setIsLoading(true);
    try {
      const newVenues: Venue[] = [...state.venues];
      
      for (let i = 0; i < files.length; i++) {
        const extractedList = await extractVenueData(files[i]);
        
        for (const extracted of extractedList) {
          const existingIndex = newVenues.findIndex(
            v => v.venue_name.toLowerCase() === extracted.venue_name.toLowerCase()
          );

          if (existingIndex >= 0) {
            newVenues[existingIndex] = {
              ...newVenues[existingIndex],
              ...extracted,
              notes: extracted.notes || newVenues[existingIndex].notes,
              booking_price: extracted.booking_price || newVenues[existingIndex].booking_price
            };
          } else {
            newVenues.push({ ...extracted, id: crypto.randomUUID() });
          }
        }
      }
      updateData({ ...state, venues: newVenues });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVendorUpload = async (files: FileList) => {
    setIsLoading(true);
    try {
      const newVendors: Vendor[] = [...state.vendors];
      
      for (let i = 0; i < files.length; i++) {
        const extractedList = await extractVendorData(files[i]);
        
        for (const extracted of extractedList) {
          const existingIndex = newVendors.findIndex(
            v => v.vendor_name.toLowerCase() === extracted.vendor_name.toLowerCase() &&
                 v.category.toLowerCase() === extracted.category.toLowerCase()
          );

          if (existingIndex >= 0) {
             newVendors[existingIndex] = { ...newVendors[existingIndex], ...extracted };
          } else {
            newVendors.push({ ...extracted, id: crypto.randomUUID() });
          }
        }
      }
      updateData({ ...state, vendors: newVendors });
    } finally {
      setIsLoading(false);
    }
  };

  const downloadCSV = useCallback((type: 'venues' | 'vendors') => {
    const data = type === 'venues' ? state.venues : state.vendors;
    if (!data.length) return;

    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(obj => Object.values(obj).map(val => `"${val}"`).join(','));
    const csvContent = [headers, ...rows].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wedding_${type}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }, [state]);

  const clearDatabase = () => {
    if (confirm("Are you sure you want to clear all data? This cannot be undone.")) {
      updateData(INITIAL_STATE);
    }
  };

  const handleConfigSave = async (config: SyncConfig) => {
    setIsConnecting(true);
    setConnectionError(null);
    
    initSync(config);
    
    try {
      const result = await verifyConnection(config);
      if (result.valid) {
        setSyncConfig(config);
        localStorage.setItem('wedding_planner_sync_config', JSON.stringify(config));
        setIsCloudConnected(true);
      } else {
        setConnectionError(result.error || "Could not connect. Please check your Project ID and API Key.");
        setIsCloudConnected(false);
      }
    } catch (e) {
      setConnectionError("An error occurred while verifying connection.");
      setIsCloudConnected(false);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans text-gray-800 bg-wedding-50">
      <Header syncStatus={syncStatus} />

      <main className="flex-1 max-w-7xl mx-auto w-full p-6 grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* Sidebar */}
        <aside className="md:col-span-3 space-y-8">
          <nav className="space-y-2 sticky top-24">
            <button
              onClick={() => setActiveTab(Tab.VENUES)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 font-medium ${activeTab === Tab.VENUES ? 'bg-wedding-500 text-white shadow-md' : 'bg-white text-wedding-900 hover:bg-wedding-100'}`}
            >
              <MapPin className="w-5 h-5" />
              Venue Manager
            </button>
            <button
              onClick={() => setActiveTab(Tab.VENDORS)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 font-medium ${activeTab === Tab.VENDORS ? 'bg-wedding-500 text-white shadow-md' : 'bg-white text-wedding-900 hover:bg-wedding-100'}`}
            >
              <Users className="w-5 h-5" />
              Vendor Manager
            </button>
            <button
              onClick={() => setActiveTab(Tab.DASHBOARD)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 font-medium ${activeTab === Tab.DASHBOARD ? 'bg-wedding-500 text-white shadow-md' : 'bg-white text-wedding-900 hover:bg-wedding-100'}`}
            >
              <LayoutDashboard className="w-5 h-5" />
              Analytics Dashboard
            </button>
            <button
              onClick={() => setActiveTab(Tab.SETTINGS)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 font-medium ${activeTab === Tab.SETTINGS ? 'bg-wedding-500 text-white shadow-md' : 'bg-white text-wedding-900 hover:bg-wedding-100'}`}
            >
              <div className="relative">
                <SettingsIcon className="w-5 h-5" />
                {isCloudConnected && !connectionError && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"></span>}
                {(connectionError || syncStatus === 'error') && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>}
              </div>
              Settings & Sync
            </button>

             <div className="pt-8 border-t border-wedding-200 mt-8 space-y-4">
                <p className="text-xs uppercase text-wedding-400 font-bold tracking-wider px-4">Actions</p>
                <button 
                  onClick={() => downloadCSV(activeTab === Tab.VENDORS ? 'vendors' : 'venues')}
                  disabled={activeTab === Tab.DASHBOARD || activeTab === Tab.SETTINGS}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-wedding-700 hover:bg-wedding-100 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-4 h-4" />
                  Download CSV
                </button>
                 <button 
                  onClick={clearDatabase}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear Database
                </button>
             </div>
          </nav>
        </aside>

        {/* Main Content */}
        <section className="md:col-span-9 space-y-6">
          {activeTab === Tab.VENUES && (
            <div className="animate-fade-in">
              <div className="flex justify-between items-end mb-6">
                <div>
                  <h2 className="text-2xl font-serif font-bold text-wedding-900">Venue Organizer</h2>
                  <p className="text-wedding-600 mt-1">Manage and compare your potential wedding locations.</p>
                </div>
              </div>
              
              <FileUpload 
                label="Venue" 
                onUpload={handleVenueUpload} 
                isLoading={isLoading}
              />
              
              <VenueList venues={state.venues} />
            </div>
          )}

          {activeTab === Tab.VENDORS && (
            <div className="animate-fade-in">
              <div className="flex justify-between items-end mb-6">
                <div>
                  <h2 className="text-2xl font-serif font-bold text-wedding-900">Vendor Team</h2>
                  <p className="text-wedding-600 mt-1">Keep track of photographers, florists, and entertainment.</p>
                </div>
              </div>

              <FileUpload 
                label="Vendor" 
                onUpload={handleVendorUpload} 
                isLoading={isLoading}
              />
              
              <VendorList vendors={state.vendors} />
            </div>
          )}

          {activeTab === Tab.DASHBOARD && (
            <div className="animate-fade-in">
               <div className="flex justify-between items-end mb-6">
                <div>
                  <h2 className="text-2xl font-serif font-bold text-wedding-900">Budget & Analytics</h2>
                  <p className="text-wedding-600 mt-1">Visualize costs and distribution.</p>
                </div>
              </div>
              <Dashboard venues={state.venues} vendors={state.vendors} />
            </div>
          )}

          {activeTab === Tab.SETTINGS && (
            <div className="animate-fade-in">
              <Settings 
                onSave={handleConfigSave} 
                currentConfig={syncConfig} 
                isConnected={isCloudConnected} 
                isConnecting={isConnecting}
                connectionError={connectionError}
                onForceSync={handleForceSync}
                lastSynced={lastSynced}
              />
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default App;
