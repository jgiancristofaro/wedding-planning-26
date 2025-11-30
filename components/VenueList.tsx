
import React, { useState, useMemo } from 'react';
import { Venue, ConsiderationStatus } from '../types';
import { MapPin, Users, DollarSign, Info, Search, SlidersHorizontal, ArrowUpDown, ChevronDown, Edit2, Utensils } from 'lucide-react';
import { VenueModal } from './VenueModal';

interface VenueListProps {
  venues: Venue[];
  onUpdateVenue: (venue: Venue) => void;
  onDeleteVenue: (venueId: string) => void;
}

type SortOption = 'total_pp-asc' | 'total_pp-desc' | 'capacity-desc' | 'name-asc' | 'status';

export const VenueList: React.FC<VenueListProps> = ({ venues, onUpdateVenue, onDeleteVenue }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVibe, setSelectedVibe] = useState<string>('All');
  const [selectedLocation, setSelectedLocation] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [minCapacity, setMinCapacity] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [sortOption, setSortOption] = useState<SortOption>('total_pp-desc');
  const [showFilters, setShowFilters] = useState(false);
  
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null);

  const uniqueVibes = useMemo(() => {
    const vibes = new Set(venues.map(v => v.vibe || 'Uncategorized'));
    return ['All', ...Array.from(vibes).sort()];
  }, [venues]);

  const uniqueLocations = useMemo(() => {
    const locs = new Set(venues.map(v => v.location?.trim() || 'Unknown'));
    return ['All', ...Array.from(locs).sort()];
  }, [venues]);

  const filteredAndSortedVenues = useMemo(() => {
    return venues
      .filter((venue) => {
        const matchesSearch = 
          (venue.venue_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (venue.notes || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (venue.location || '').toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesVibe = selectedVibe === 'All' || (venue.vibe || 'Uncategorized') === selectedVibe;
        const matchesLocation = selectedLocation === 'All' || (venue.location?.trim() || 'Unknown') === selectedLocation;
        const matchesStatus = selectedStatus === 'All' || (venue.status || "Haven't looked") === selectedStatus;
        
        const venueCapacity = venue.capacity || 0;
        const venueCostPP = venue.total_cost_pp || 0;

        const matchesCapacity = minCapacity === '' || venueCapacity >= parseInt(minCapacity);
        const matchesPrice = maxPrice === '' || venueCostPP <= parseInt(maxPrice);

        return matchesSearch && matchesVibe && matchesLocation && matchesStatus && matchesCapacity && matchesPrice;
      })
      .sort((a, b) => {
        const costA = a.total_cost_pp || 0;
        const costB = b.total_cost_pp || 0;
        const capA = a.capacity || 0;
        const capB = b.capacity || 0;

        switch (sortOption) {
          case 'total_pp-asc': return costA - costB;
          case 'total_pp-desc': return costB - costA;
          case 'capacity-desc': return capB - capA;
          case 'name-asc': return (a.venue_name || '').localeCompare(b.venue_name || '');
          case 'status': {
             const order: Record<ConsiderationStatus, number> = { 'Priority': 0, 'Maybe': 1, "Haven't looked": 2, 'No': 3 };
             const statusA = a.status || "Haven't looked";
             const statusB = b.status || "Haven't looked";
             return order[statusA] - order[statusB];
          }
          default: return 0;
        }
      });
  }, [venues, searchTerm, selectedVibe, selectedLocation, selectedStatus, minCapacity, maxPrice, sortOption]);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedVibe('All');
    setSelectedLocation('All');
    setSelectedStatus('All');
    setMinCapacity('');
    setMaxPrice('');
    setSortOption('total_pp-desc');
  };

  const getStatusStyle = (status: ConsiderationStatus) => {
    switch (status) {
      case 'Priority': return 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200';
      case 'Maybe': return 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200';
      case 'No': return 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200';
    }
  };

  const handleSaveEdit = (updatedData: Omit<Venue, 'id'>) => {
    if (editingVenue) {
      onUpdateVenue({ ...updatedData, id: editingVenue.id });
      setEditingVenue(null);
    }
  };

  if (venues.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-wedding-100">
        <p className="text-wedding-400 font-serif italic">No venues added yet. Upload a brochure to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-wedding-200">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-4">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-wedding-400" />
            <input 
              type="text" 
              placeholder="Search venues, notes, or locations..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-wedding-50 border border-wedding-200 rounded-lg focus:ring-2 focus:ring-wedding-500 focus:outline-none text-sm transition-all"
            />
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
             <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${showFilters ? 'bg-wedding-100 border-wedding-300 text-wedding-800' : 'bg-white border-wedding-200 text-gray-600 hover:bg-wedding-50'}`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
            </button>
            <div className="relative flex-1 md:flex-none">
               <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-wedding-400" />
               <select 
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as SortOption)}
                  className="w-full pl-9 pr-8 py-2 bg-white border border-wedding-200 rounded-lg focus:ring-2 focus:ring-wedding-500 focus:outline-none text-sm appearance-none cursor-pointer text-gray-700"
                >
                  <option value="total_pp-desc">Sort: PP Cost (High)</option>
                  <option value="total_pp-asc">Sort: PP Cost (Low)</option>
                  <option value="name-asc">Sort: A-Z</option>
                  <option value="capacity-desc">Sort: Capacity</option>
                  <option value="status">Sort: Status</option>
                </select>
            </div>
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pt-4 border-t border-wedding-100 animate-fade-in">
            <div className="space-y-1">
              <label className="text-xs font-bold text-wedding-500 uppercase tracking-wider">Status</label>
              <select 
                value={selectedStatus} 
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full p-2 bg-wedding-50 border border-wedding-200 rounded-md text-sm focus:outline-none focus:border-wedding-400"
              >
                <option value="All">All Statuses</option>
                <option value="Priority">Priority</option>
                <option value="Maybe">Maybe</option>
                <option value="Haven't looked">New / Unseen</option>
                <option value="No">No</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-wedding-500 uppercase tracking-wider">Vibe</label>
              <select 
                value={selectedVibe} 
                onChange={(e) => setSelectedVibe(e.target.value)}
                className="w-full p-2 bg-wedding-50 border border-wedding-200 rounded-md text-sm focus:outline-none focus:border-wedding-400"
              >
                {uniqueVibes.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-wedding-500 uppercase tracking-wider">Location</label>
              <select 
                value={selectedLocation} 
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full p-2 bg-wedding-50 border border-wedding-200 rounded-md text-sm focus:outline-none focus:border-wedding-400"
              >
                {uniqueLocations.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-wedding-500 uppercase tracking-wider">Min Capacity</label>
              <input 
                type="number" 
                placeholder="e.g. 150"
                value={minCapacity}
                onChange={(e) => setMinCapacity(e.target.value)}
                className="w-full p-2 bg-wedding-50 border border-wedding-200 rounded-md text-sm focus:outline-none focus:border-wedding-400"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-wedding-500 uppercase tracking-wider">Max Total PP ($)</label>
              <input 
                type="number" 
                placeholder="e.g. 500"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="w-full p-2 bg-wedding-50 border border-wedding-200 rounded-md text-sm focus:outline-none focus:border-wedding-400"
              />
            </div>
            <div className="col-span-1 sm:col-span-2 lg:col-span-5 flex justify-end">
              <button onClick={clearFilters} className="text-xs text-wedding-600 hover:text-wedding-800 underline">
                Reset all filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="flex justify-between items-center px-2">
        <p className="text-sm text-gray-500 italic">
          Showing {filteredAndSortedVenues.length} result{filteredAndSortedVenues.length !== 1 && 's'}
        </p>
      </div>

      {filteredAndSortedVenues.length === 0 ? (
        <div className="text-center py-20 bg-white/50 rounded-xl border border-dashed border-wedding-300">
           <Search className="w-8 h-8 text-wedding-300 mx-auto mb-2" />
           <p className="text-wedding-600 font-medium">No venues match your filters.</p>
           <button onClick={clearFilters} className="text-sm text-wedding-800 underline mt-1">Clear filters</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredAndSortedVenues.map((venue) => (
            <div 
              key={venue.id} 
              onClick={() => setEditingVenue(venue)}
              className="group bg-white rounded-xl shadow-sm border border-wedding-100 overflow-hidden hover:shadow-lg hover:border-wedding-300 transition-all duration-300 flex flex-col relative cursor-pointer"
            >
              {/* Header */}
              <div className="bg-wedding-50 p-4 border-b border-wedding-100 flex justify-between items-start group-hover:bg-wedding-100/50 transition-colors">
                <div className="flex-1 pr-4">
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif text-xl font-bold text-wedding-900 group-hover:text-wedding-700 transition-colors">{venue.venue_name}</h3>
                    <Edit2 className="w-3 h-3 text-wedding-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="flex items-center text-wedding-600 text-sm mt-1">
                    <MapPin className="w-3 h-3 mr-1" />
                    {venue.location}
                    <span className="mx-2 text-wedding-300">|</span>
                    <span className="bg-white px-2 py-0.5 rounded text-[10px] font-bold text-wedding-500 border border-wedding-200 uppercase tracking-wide">
                        {venue.vibe || 'Venue'}
                    </span>
                  </div>
                </div>
                <div className="relative group/status" onClick={(e) => e.stopPropagation()}>
                  <select 
                      value={venue.status || "Haven't looked"}
                      onChange={(e) => onUpdateVenue({...venue, status: e.target.value as ConsiderationStatus})}
                      className={`appearance-none pr-8 pl-3 py-1.5 rounded-full text-xs font-bold border shadow-sm outline-none cursor-pointer transition-colors uppercase tracking-wider ${getStatusStyle(venue.status || "Haven't looked")}`}
                    >
                      <option value="Haven't looked">New</option>
                      <option value="Maybe">Maybe</option>
                      <option value="Priority">Priority</option>
                      <option value="No">No</option>
                    </select>
                    <ChevronDown className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
                </div>
              </div>
              
              <div className="p-5 space-y-5 flex-1 flex flex-col">
                
                {/* Financial Hero */}
                <div className="bg-wedding-50/30 rounded-lg p-4 border border-wedding-100">
                    <div className="flex justify-between items-baseline mb-3">
                        <span className="text-xs font-bold text-wedding-500 uppercase tracking-widest">Total Cost / Person</span>
                        <div className="text-3xl font-serif font-bold text-wedding-900">
                            ${(venue.total_cost_pp || 0).toFixed(0)}
                        </div>
                    </div>
                    {/* Breakdown */}
                    <div className="grid grid-cols-4 gap-1 text-center text-xs border-t border-wedding-100 pt-3">
                        <div>
                            <span className="block text-gray-500 mb-0.5">Welcome</span>
                            <span className="font-bold text-gray-800">${venue.welcome_cost_pp || 0}</span>
                        </div>
                        <div className="border-l border-wedding-100">
                            <span className="block text-gray-500 mb-0.5">Cocktail</span>
                            <span className="font-bold text-gray-800">${venue.cocktail_cost_pp || 0}</span>
                        </div>
                        <div className="border-l border-wedding-100">
                            <span className="block text-gray-500 mb-0.5">Reception</span>
                            <span className="font-bold text-gray-800">${venue.reception_cost_pp || 0}</span>
                        </div>
                        <div className="border-l border-wedding-100">
                            <span className="block text-gray-500 mb-0.5">Brunch</span>
                            <span className="font-bold text-gray-800">${venue.brunch_cost_pp || 0}</span>
                        </div>
                    </div>
                </div>

                {/* Secondary Stats */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                   <div className="flex items-center gap-3 text-gray-700">
                      <Users className="w-4 h-4 text-wedding-400" />
                      <div className="flex flex-col">
                          <span className="text-[10px] uppercase text-gray-400 font-bold">Capacity</span>
                          <span className="font-medium">{venue.capacity || 0} Guests</span>
                      </div>
                   </div>
                   <div className="flex items-center gap-3 text-gray-700">
                      <DollarSign className="w-4 h-4 text-wedding-400" />
                      <div className="flex flex-col">
                          <span className="text-[10px] uppercase text-gray-400 font-bold">Site Fee</span>
                          <span className="font-medium">${(venue.site_fee || 0).toLocaleString()}</span>
                      </div>
                   </div>
                   <div className="flex items-center gap-3 text-gray-700">
                      <Utensils className="w-4 h-4 text-wedding-400" />
                      <div className="flex flex-col">
                          <span className="text-[10px] uppercase text-gray-400 font-bold">F&B Minimum</span>
                          <span className="font-medium">${(venue.food_bev_minimum || 0).toLocaleString()}</span>
                      </div>
                   </div>
                </div>

                {/* Notes Teaser */}
                <div className="pt-4 border-t border-wedding-50 mt-auto">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-wedding-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-gray-600 italic leading-relaxed line-clamp-2" title={venue.notes}>
                      {venue.notes || "No rate card notes available."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingVenue && (
        <VenueModal
          venue={editingVenue}
          isOpen={!!editingVenue}
          onClose={() => setEditingVenue(null)}
          onSave={handleSaveEdit}
          onDelete={() => {
            onDeleteVenue(editingVenue.id);
            setEditingVenue(null);
          }}
        />
      )}
    </div>
  );
};
