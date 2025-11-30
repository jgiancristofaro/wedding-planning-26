
import React, { useState, useEffect, useCallback } from 'react';
import { Header, SyncStatus } from './components/Header';
import { FileUpload } from './components/FileUpload';
import { VenueList } from './components/VenueList';
import { VendorList } from './components/VendorList';
import { Dashboard } from './components/Dashboard';
import { Settings } from './components/Settings';
import { RecentUpdates } from './components/RecentUpdates';
import { VenueModal } from './components/VenueModal';
import { Venue, Vendor, Tab, INITIAL_STATE, AppState, SyncConfig } from './types';
import { extractVenueData, extractVendorData } from './services/geminiService';
import { initSync, startAutoSync, saveDataToCloud, verifyConnection, fetchFromCloud } from './services/storageService';
import { LayoutDashboard, MapPin, Users, Download, Trash2, Settings as SettingsIcon, Plus, History } from 'lucide-react';
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
  
  // Modal State for Manual Add
  const [isAddVenueModalOpen, setIsAddVenueModalOpen] = useState(false);
  
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

  // --- VENUE HANDLERS ---

  const handleVenueComplete = (newVenuesData: Omit<Venue, 'id' | 'status'>[]) => {
    const newVenues: Venue[] = [...state.venues];
    const timestamp = Date.now();
    
    for (const extracted of newVenuesData) {
      const existingIndex = newVenues.findIndex(
        v => v.venue_name.toLowerCase() === extracted.venue_name.toLowerCase()
      );

      if (existingIndex >= 0) {
        const existing = newVenues[existingIndex];
        const changes: string[] = [];

        // Check for key field changes (New Schema)
        const existingTotalPP = existing.total_cost_pp || 0;
        if (extracted.total_cost_pp > 0 && extracted.total_cost_pp !== existingTotalPP) {
            changes.push(`Total PP Cost updated from $${existingTotalPP} to $${extracted.total_cost_pp}`);
        }
        
        const existingSiteFee = existing.site_fee || 0;
        if (extracted.site_fee > 0 && extracted.site_fee !== existingSiteFee) {
            changes.push(`Site Fee updated from $${existingSiteFee} to $${extracted.site_fee}`);
        }
        
        const existingCapacity = existing.capacity || 0;
        if (extracted.capacity > 0 && extracted.capacity !== existingCapacity) {
            changes.push(`Capacity changed from ${existingCapacity} to ${extracted.capacity}`);
        }
        
        if (extracted.notes && existing.notes && extracted.notes.length !== existing.notes.length) {
             changes.push("Rate card notes updated");
        }

        newVenues[existingIndex] = {
          ...existing,
          ...extracted,
          // Preserve existing text if new extraction is empty/poor, otherwise overwrite
          notes: extracted.notes || existing.notes,
          
          status: existing.status || "Haven't looked",
          // Update timestamp only if changes detected
          lastUpdated: changes.length > 0 ? timestamp : existing.lastUpdated,
          updateDescription: changes.length > 0 ? changes.join('. ') : existing.updateDescription
        };
      } else {
        newVenues.push({ 
          ...extracted, 
          id: crypto.randomUUID(),
          status: "Haven't looked",
          lastUpdated: timestamp,
          updateDescription: "Newly added via upload"
        });
      }
    }
    updateData({ ...state, venues: newVenues });
  };

  const handleAddVenue = (newVenueData: Omit<Venue, 'id'>) => {
    const newVenue: Venue = {
      ...newVenueData,
      id: crypto.randomUUID(),
      lastUpdated: Date.now(),
      updateDescription: "Manually added"
    };
    updateData({ ...state, venues: [...state.venues, newVenue] });
  };

  const handleVenueUpdate = (updatedVenue: Venue) => {
    const newVenues = state.venues.map(v => v.id === updatedVenue.id ? {
        ...updatedVenue,
        lastUpdated: Date.now(),
        updateDescription: "Manually updated"
    } : v);
    updateData({ ...state, venues: newVenues });
  };

  const handleDeleteVenue = (venueId: string) => {
    const newVenues = state.venues.filter(v => v.id !== venueId);
    updateData({ ...state, venues: newVenues });
  };

  // --- VENDOR HANDLERS ---

  const handleVendorComplete = (newVendorsData: Omit<Vendor, 'id' | 'status'>[]) => {
    const newVendors: Vendor[] = [...state.vendors];
    const timestamp = Date.now();
    
    for (const extracted of newVendorsData) {
      const existingIndex = newVendors.findIndex(
        v => v.vendor_name.toLowerCase() === extracted.vendor_name.toLowerCase() &&
             v.category.toLowerCase() === extracted.category.toLowerCase()
      );

      if (existingIndex >= 0) {
         const existing = newVendors[existingIndex];
         const changes: string[] = [];

         if (extracted.price > 0 && extracted.price !== existing.price) {
            changes.push(`Price updated from $${existing.price} to $${extracted.price}`);
         }

         newVendors[existingIndex] = { 
           ...existing, 
           ...extracted,
           status: existing.status || "Haven't looked",
           lastUpdated: changes.length > 0 ? timestamp : existing.lastUpdated,
           updateDescription: changes.length > 0 ? changes.join('. ') : existing.updateDescription
         };
      } else {
        newVendors.push({ 
          ...extracted, 
          id: crypto.randomUUID(),
          status: "Haven't looked",
          lastUpdated: timestamp,
          updateDescription: "Newly added via upload"
        });
      }
    }
    updateData({ ...state, vendors: newVendors });
  };

  const handleVendorUpdate = (updatedVendor: Vendor) => {
    const newVendors = state.vendors.map(v => v.id === updatedVendor.id ? {
        ...updatedVendor,
        lastUpdated: Date.now(),
        updateDescription: "Manually updated"
    } : v);
    updateData({ ...state, vendors: newVendors });
  };

  // --- EXPORT / CLEAR ---

  const downloadCSV = useCallback((type: 'venues' | 'vendors') => {
    const data = type === 'venues' ? state.venues : state.vendors;
    if (!data.length) return;

    let headers: string[] = [];
    let rows: string[] = [];

    const formatValue = (val: any) => `"${String(val || '').replace(/"/g, '""')}"`;

    if (type === 'venues') {
      headers = [
        'Venue Name', 'Status', 'Location', 'Capacity', 'Booking Cost', 
        'Site Fee', 'Site Fee Notes', 'F&B Minimum', 'Admin Fees',
        'Welcome Cost/pp', 'Reception Cost/pp', 'Brunch Cost/pp', 'Total Cost/pp',
        'Vibe', 'Notes'
      ];
      
      rows = (data as Venue[]).map(v => [
        v.venue_name, 
        v.status || "Haven't looked", 
        v.location, 
        v.capacity, 
        v.booking_cost,
        v.site_fee,
        v.site_fee_notes,
        v.food_bev_minimum,
        v.admin_fees,
        v.welcome_cost_pp,
        v.reception_cost_pp,
        v.brunch_cost_pp,
        v.total_cost_pp,
        v.vibe, 
        v.notes
      ].map(formatValue).join(','));

    } else {
      headers = [
        'Vendor Name', 'Status', 'Category', 'Price', 'Notes'
      ];
      
      rows = (data as Vendor[]).map(v => [
        v.vendor_name, v.status || "Haven't looked", v.category, v.price, v.notes
      ].map(formatValue).join(','));
    }

    const csvContent = [headers.join(','), ...rows].join('\n');
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
              onClick={() => setActiveTab(Tab.UPDATES)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 font-medium ${activeTab === Tab.UPDATES ? 'bg-wedding-500 text-white shadow-md' : 'bg-white text-wedding-900 hover:bg-wedding-100'}`}
            >
              <History className="w-5 h-5" />
              Recent Updates
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
                  disabled={activeTab === Tab.DASHBOARD || activeTab === Tab.SETTINGS || activeTab === Tab.UPDATES}
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
                  <p className="text-wedding-600 mt-1">Manage financial breakdowns and rate cards.</p>
                </div>
                <button 
                  onClick={() => setIsAddVenueModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-wedding-700 text-white text-sm font-bold rounded-lg hover:bg-wedding-900 transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add Venue Manually
                </button>
              </div>
              
              <FileUpload<Omit<Venue, 'id' | 'status'>>
                label="Venue" 
                onProcessFile={extractVenueData}
                onComplete={handleVenueComplete}
              />
              
              <VenueList 
                venues={state.venues} 
                onUpdateVenue={handleVenueUpdate} 
                onDeleteVenue={handleDeleteVenue}
              />
              
              <VenueModal
                venue={null}
                isOpen={isAddVenueModalOpen}
                onClose={() => setIsAddVenueModalOpen(false)}
                onSave={handleAddVenue}
              />
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

              <FileUpload<Omit<Vendor, 'id' | 'status'>>
                label="Vendor" 
                onProcessFile={extractVendorData}
                onComplete={handleVendorComplete}
              />
              
              <VendorList vendors={state.vendors} onUpdateVendor={handleVendorUpdate} />
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
          
          {activeTab === Tab.UPDATES && (
             <RecentUpdates venues={state.venues} vendors={state.vendors} />
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
