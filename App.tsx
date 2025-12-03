
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
import { extractVenueData, extractVendorData, findVenueUrl } from './services/geminiService';
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
        const parsedState = JSON.parse(saved);
        
        // MIGRATION: 
        if (parsedState.venues) {
          parsedState.venues = parsedState.venues.map((v: any) => {
            // 1. Convert 'vibe' string to string[] if needed
            let newVibe = Array.isArray(v.vibe) ? v.vibe : (v.vibe && typeof v.vibe === 'string' ? v.vibe.split(',').map((s: string) => s.trim()).filter(Boolean) : []);
            
            return {
              ...v,
              vibe: newVibe,
              // Note: We leave city/state null here if missing, allowing the robust useEffect migration to handle it
              // consistently for both local and cloud data.
            };
          });
        }
        
        return parsedState;
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
        
        // Apply migration to remote data as well if needed
        const migratedData = {
           ...remoteData,
           venues: remoteData.venues.map((v: any) => ({
             ...v,
             vibe: Array.isArray(v.vibe) ? v.vibe : (v.vibe && typeof v.vibe === 'string' ? v.vibe.split(',').map((s: string) => s.trim()).filter(Boolean) : [])
           }))
        };

        setState(migratedData); 
        localStorage.setItem('wedding_planner_data', JSON.stringify(migratedData));
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
        const migratedData = {
           ...data,
           venues: data.venues.map((v: any) => ({
             ...v,
             vibe: Array.isArray(v.vibe) ? v.vibe : (v.vibe && typeof v.vibe === 'string' ? v.vibe.split(',').map((s: string) => s.trim()).filter(Boolean) : [])
           }))
        };
        setState(migratedData);
        localStorage.setItem('wedding_planner_data', JSON.stringify(migratedData));
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

  // --- MIGRATION EFFECT ---
  // Robust backfill of City/State from Location string
  useEffect(() => {
    const venues = state.venues;
    let hasUpdates = false;
    
    const migratedVenues = venues.map(venue => {
      // Condition: Check if missing city or state
      if ((!venue.city || !venue.state) && venue.location) {
        let newCity = venue.city;
        let newState = venue.state;

        const parts = venue.location.split(',');

        if (parts.length >= 2) {
          // Step 1: Parse State (Last segment)
          let rawState = parts[parts.length - 1];
          // Remove 5-digit zip codes
          rawState = rawState.replace(/\b\d{5}\b/g, '');
          // Remove text in parentheses
          rawState = rawState.replace(/\(.*\)/g, '');
          newState = rawState.trim();

          // Step 2: Parse City (Second to last segment)
          newCity = parts[parts.length - 2].trim();
        } else {
          // Fallback: No commas, assume location is city
          newCity = parts[0].trim();
          newState = "Unknown";
        }

        // Ensure we don't save empty strings
        if (!newCity) newCity = "Unknown";
        if (!newState) newState = "Unknown";

        // Only mark update if data actually changed
        if (newCity !== venue.city || newState !== venue.state) {
          hasUpdates = true;
          return { ...venue, city: newCity, state: newState };
        }
      }
      return venue;
    });

    if (hasUpdates) {
      console.log(`Migrated ${migratedVenues.filter((v, i) => v !== venues[i]).length} venues with new City/State data`);
      updateData({ ...state, venues: migratedVenues });
    }
  }, [state.venues]);

  // --- VENUE HANDLERS ---

  const handleVenueComplete = (newVenuesData: Omit<Venue, 'id' | 'status'>[]) => {
    const newVenues: Venue[] = [...state.venues];
    const timestamp = Date.now();
    
    for (const extracted of newVenuesData) {
      const existingIndex = newVenues.findIndex(
        v => v.venue_name.toLowerCase() === extracted.venue_name.toLowerCase()
      );

      // Ensure extracted vibe is array
      const normalizedVibe = Array.isArray(extracted.vibe) 
         ? extracted.vibe 
         : (typeof extracted.vibe === 'string' ? (extracted.vibe as string).split(',').map((s: string) => s.trim()) : []);

      const safeExtracted = { ...extracted, vibe: normalizedVibe };

      if (existingIndex >= 0) {
        const existing = newVenues[existingIndex];
        const changes: string[] = [];

        // Check for key field changes (New Schema)
        const existingTotalPP = existing.total_cost_pp || 0;
        if (safeExtracted.total_cost_pp > 0 && safeExtracted.total_cost_pp !== existingTotalPP) {
            changes.push(`Total PP Cost updated from $${existingTotalPP} to $${safeExtracted.total_cost_pp}`);
        }
        
        const existingCocktail = existing.cocktail_cost_pp || 0;
        if (safeExtracted.cocktail_cost_pp && safeExtracted.cocktail_cost_pp !== existingCocktail) {
            changes.push(`Cocktail Cost updated from $${existingCocktail} to $${safeExtracted.cocktail_cost_pp}`);
        }
        
        const existingSiteFee = existing.site_fee || 0;
        if (safeExtracted.site_fee > 0 && safeExtracted.site_fee !== existingSiteFee) {
            changes.push(`Site Fee updated from $${existingSiteFee} to $${safeExtracted.site_fee}`);
        }
        
        const existingCapacity = existing.capacity || 0;
        if (safeExtracted.capacity > 0 && safeExtracted.capacity !== existingCapacity) {
            changes.push(`Capacity changed from ${existingCapacity} to ${safeExtracted.capacity}`);
        }
        
        if (safeExtracted.notes && existing.notes && safeExtracted.notes.length !== existing.notes.length) {
             changes.push("Rate card notes updated");
        }

        newVenues[existingIndex] = {
          ...existing,
          ...safeExtracted,
          // Preserve city/state if extraction failed to get them but we have them locally
          city: safeExtracted.city || existing.city,
          state: safeExtracted.state || existing.state,
          // Preserve existing text if new extraction is empty/poor, otherwise overwrite
          notes: safeExtracted.notes || existing.notes,
          
          status: existing.status || "Haven't looked",
          // Update timestamp only if changes detected
          lastUpdated: changes.length > 0 ? timestamp : existing.lastUpdated,
          updateDescription: changes.length > 0 ? changes.join('. ') : existing.updateDescription
        };
      } else {
        newVenues.push({ 
          ...safeExtracted, 
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

  const handleEnrichVenue = async (venueId: string) => {
    const venue = state.venues.find(v => v.id === venueId);
    if (!venue) return;

    try {
      const url = await findVenueUrl(venue.venue_name, venue.location);
      if (url) {
        const updatedVenue = {
            ...venue,
            website_url: url,
            lastUpdated: Date.now(),
            updateDescription: 'Website URL added via Magic Search'
        };
        // Update state directly without trigger manual update timestamp if we handled it above
        const newVenues = state.venues.map(v => v.id === updatedVenue.id ? updatedVenue : v);
        updateData({ ...state, venues: newVenues });
      } else {
        alert("Could not find a definitive official website for this venue.");
      }
    } catch (error) {
      console.error("Magic search failed", error);
      alert("Magic search failed. Please try again later.");
    }
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
        'Venue Name', 'Status', 'Location', 'City', 'State', 'Capacity', 'Booking Cost', 
        'Site Fee', 'Site Fee Notes', 'F&B Minimum', 'Admin Fees',
        'Welcome Cost/pp', 'Cocktail Hour Cost/pp', 'Reception Cost/pp', 'Brunch Cost/pp', 'Total Cost/pp',
        'Vibe (Tags)', 'Notes', 'Website'
      ];
      
      rows = (data as Venue[]).map(v => [
        v.venue_name, 
        v.status || "Haven't looked", 
        v.location, 
        v.city,
        v.state,
        v.capacity, 
        v.booking_cost,
        v.site_fee,
        v.site_fee_notes,
        v.food_bev_minimum,
        v.admin_fees,
        v.welcome_cost_pp,
        v.cocktail_cost_pp,
        v.reception_cost_pp,
        v.brunch_cost_pp,
        v.total_cost_pp,
        Array.isArray(v.vibe) ? v.vibe.join(' | ') : v.vibe, // Joined with |
        v.notes,
        v.website_url
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
                onEnrichVenue={handleEnrichVenue}
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
