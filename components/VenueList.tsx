
import React, { useState, useMemo } from 'react';
import { Venue, ConsiderationStatus } from '../types';
import { MapPin, Users, DollarSign, Info, Search, SlidersHorizontal, ArrowUpDown, ChevronDown, Edit2 } from 'lucide-react';
import { VenueModal } from './VenueModal';

interface VenueListProps {
  venues: Venue[];
  onUpdateVenue: (venue: Venue) => void;
  onDeleteVenue: (venueId: string) => void;
}

type SortOption = 'price-asc' | 'price-desc' | 'capacity-desc' | 'name-asc' | 'status';

export const VenueList: React.FC<VenueListProps> = ({ venues, onUpdateVenue, onDeleteVenue }) => {
  // --- State ---
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVibe, setSelectedVibe] = useState<string>('All');
  const [selectedLocation, setSelectedLocation] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All'); // New Status Filter State
  const [minCapacity, setMinCapacity] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [sortOption, setSortOption] = useState<SortOption>('name-asc');
  const [showFilters, setShowFilters] = useState(false);
  
  // Modal State
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null);

  // --- Derived Data for Dropdowns ---
  const uniqueVibes = useMemo(() => {
    const vibes = new Set(venues.map(v => v.vibe || 'Uncategorized'));
    return ['All', ...Array.from(vibes).sort()];
  }, [venues]);

  const uniqueLocations = useMemo(() => {
    // Simple normalization to avoid duplicates like "New York" vs "New York "
    const locs = new Set(venues.map(v => v.location?.trim() || 'Unknown'));
    return ['All', ...Array.from(locs).sort()];
  }, [venues]);

  // --- Filtering & Sorting Logic ---
  const filteredAndSortedVenues = useMemo(() => {
    return venues
      .filter((venue) => {
        const matchesSearch = 
          venue.venue_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          venue.notes.toLowerCase().includes(searchTerm.toLowerCase()) ||
          venue.location.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesVibe = selectedVibe === 'All' || (venue.vibe || 'Uncategorized') === selectedVibe;
        const matchesLocation = selectedLocation === 'All' || (venue.location?.trim() || 'Unknown') === selectedLocation;
        const matchesStatus = selectedStatus === 'All' || (venue.status || "Haven't looked") === selectedStatus;
        
        const matchesCapacity = minCapacity === '' || venue.capacity >= parseInt(minCapacity);
        const matchesPrice = maxPrice === '' || venue.booking_price <= parseInt(maxPrice);

        return matchesSearch && matchesVibe && matchesLocation && matchesStatus && matchesCapacity && matchesPrice;
      })
      .sort((a, b) => {
        switch (sortOption) {
          case 'price-asc': return a.booking_price - b.booking_price;
          case 'price-desc': return b.booking_price - a.booking_price;
          case 'capacity-desc': return b.capacity - a.capacity;
          case 'name-asc': return a.venue_name.localeCompare(b.venue_name);
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
    setSortOption('name-asc');
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
      {/* --- Search & Filter Toolbar --- */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-wedding-200">
        
        {/* Top Row: Search & Toggle */}
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
                  <option value="name-asc">Sort: A-Z</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="capacity-desc">Capacity: Highest First</option>
                  <option value="status">Status: Priority First</option>
                </select>
            </div>
          </div>
        </div>

        {/* Filter Drawer */}
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
              <label className="text-xs font-bold text-wedding-500 uppercase tracking-wider">Max Price</label>
              <input 
                type="number" 
                placeholder="e.g. 10000"
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

      {/* --- Results Count --- */}
      <div className="flex justify-between items-center px-2">
        <p className="text-sm text-gray-500 italic">
          Showing {filteredAndSortedVenues.length} result{filteredAndSortedVenues.length !== 1 && 's'}
        </p>
      </div>

      {/* --- Grid Results --- */}
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
                  </div>
                </div>
                {/* STATUS DROPDOWN - TOP RIGHT */}
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
              
              <div className="p-5 space-y-4 flex-1">
                {/* Vibe Tag */}
                <div className="mb-2">
                   <span className="inline-block bg-white px-2 py-0.5 rounded-md text-[10px] font-bold text-wedding-500 border border-wedding-200 uppercase tracking-wide">
                    {venue.vibe || 'Venue'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-wedding-400 uppercase tracking-wider font-bold">Capacity</p>
                    <div className="flex items-center text-gray-700 font-medium">
                      <Users className="w-4 h-4 mr-2 text-wedding-500" />
                      {venue.capacity} Guests
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-wedding-400 uppercase tracking-wider font-bold">Booking Cost</p>
                    <div className="flex items-center text-gray-700 font-medium">
                      <DollarSign className="w-4 h-4 mr-2 text-wedding-500" />
                      ${venue.booking_price.toLocaleString()}
                    </div>
                  </div>
                   <div className="space-y-1">
                    <p className="text-xs text-wedding-400 uppercase tracking-wider font-bold">PP Cost</p>
                    <div className="text-sm text-gray-700">
                      ${venue.per_person_cost} / person
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-wedding-400 uppercase tracking-wider font-bold">Food & Bev</p>
                    <div className="text-sm text-gray-700 truncate" title={venue.food_bev_cost}>
                      {venue.food_bev_cost}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-wedding-50 mt-auto">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-wedding-400 mt-1 flex-shrink-0" />
                    <p className="text-sm text-gray-600 italic leading-relaxed line-clamp-3" title={venue.notes}>
                      {venue.notes}
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
