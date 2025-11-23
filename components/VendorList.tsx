
import React, { useState, useMemo } from 'react';
import { Vendor, ConsiderationStatus } from '../types';
import { DollarSign, Tag, Search, SlidersHorizontal, ArrowUpDown, ChevronDown } from 'lucide-react';

interface VendorListProps {
  vendors: Vendor[];
  onUpdateVendor: (vendor: Vendor) => void;
}

type SortOption = 'price-asc' | 'price-desc' | 'name-asc' | 'status';

export const VendorList: React.FC<VendorListProps> = ({ vendors, onUpdateVendor }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('name-asc');
  const [showFilters, setShowFilters] = useState(false);

  // Derived Data
  const uniqueCategories = useMemo(() => {
    const cats = new Set(vendors.map(v => v.category || 'Uncategorized'));
    return ['All', ...Array.from(cats).sort()];
  }, [vendors]);

  const filteredAndSortedVendors = useMemo(() => {
    return vendors
      .filter(vendor => {
        const matchesSearch = 
          vendor.vendor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          vendor.notes.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'All' || vendor.category === selectedCategory;
        const matchesPrice = maxPrice === '' || vendor.price <= parseInt(maxPrice);
        
        return matchesSearch && matchesCategory && matchesPrice;
      })
      .sort((a, b) => {
        switch(sortOption) {
          case 'price-asc': return a.price - b.price;
          case 'price-desc': return b.price - a.price;
          case 'name-asc': return a.vendor_name.localeCompare(b.vendor_name);
          case 'status': {
             // Custom sort order for status
             const order: Record<ConsiderationStatus, number> = { 'Priority': 0, 'Maybe': 1, "Haven't looked": 2, 'No': 3 };
             const statusA = a.status || "Haven't looked";
             const statusB = b.status || "Haven't looked";
             return order[statusA] - order[statusB];
          }
          default: return 0;
        }
      });
  }, [vendors, searchTerm, selectedCategory, maxPrice, sortOption]);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('All');
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

  if (vendors.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-wedding-100">
        <p className="text-wedding-400 font-serif italic">No vendors added yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* --- Toolbar --- */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-wedding-200">
         <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-4">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-wedding-400" />
            <input 
              type="text" 
              placeholder="Search vendors..." 
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
                  <option value="status">Status: Priority First</option>
                </select>
            </div>
          </div>
        </div>

        {/* Filter Drawer */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-wedding-100 animate-fade-in">
             <div className="space-y-1">
              <label className="text-xs font-bold text-wedding-500 uppercase tracking-wider">Category</label>
              <select 
                value={selectedCategory} 
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full p-2 bg-wedding-50 border border-wedding-200 rounded-md text-sm focus:outline-none focus:border-wedding-400"
              >
                {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-wedding-500 uppercase tracking-wider">Max Price</label>
              <input 
                type="number" 
                placeholder="e.g. 5000"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="w-full p-2 bg-wedding-50 border border-wedding-200 rounded-md text-sm focus:outline-none focus:border-wedding-400"
              />
            </div>
             <div className="md:col-span-2 flex justify-end">
              <button onClick={clearFilters} className="text-xs text-wedding-600 hover:text-wedding-800 underline">
                Reset filters
              </button>
            </div>
          </div>
        )}
      </div>

       <div className="flex justify-between items-center px-2">
        <p className="text-sm text-gray-500 italic">
          Showing {filteredAndSortedVendors.length} result{filteredAndSortedVendors.length !== 1 && 's'}
        </p>
      </div>

      {/* --- Table Results --- */}
      {filteredAndSortedVendors.length === 0 ? (
         <div className="text-center py-20 bg-white/50 rounded-xl border border-dashed border-wedding-300">
           <Search className="w-8 h-8 text-wedding-300 mx-auto mb-2" />
           <p className="text-wedding-600 font-medium">No vendors match your filters.</p>
           <button onClick={clearFilters} className="text-sm text-wedding-800 underline mt-1">Clear filters</button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-wedding-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-wedding-50 border-b border-wedding-200">
                  <th className="p-4 text-xs font-bold text-wedding-700 uppercase tracking-wider w-1/4">Vendor Name</th>
                  <th className="p-4 text-xs font-bold text-wedding-700 uppercase tracking-wider w-1/6">Status</th>
                  <th className="p-4 text-xs font-bold text-wedding-700 uppercase tracking-wider w-1/6">Category</th>
                  <th className="p-4 text-xs font-bold text-wedding-700 uppercase tracking-wider w-1/6">Est. Price</th>
                  <th className="p-4 text-xs font-bold text-wedding-700 uppercase tracking-wider w-1/4">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-wedding-100">
                {filteredAndSortedVendors.map((vendor) => (
                  <tr key={vendor.id} className="hover:bg-wedding-50/50 transition-colors">
                    <td className="p-4 font-medium text-gray-900">{vendor.vendor_name}</td>
                    <td className="p-4">
                        <div className="relative inline-block">
                           <select 
                            value={vendor.status || "Haven't looked"}
                            onChange={(e) => onUpdateVendor({...vendor, status: e.target.value as ConsiderationStatus})}
                            className={`appearance-none text-xs font-bold uppercase tracking-wider rounded-full py-1.5 pl-3 pr-8 border outline-none cursor-pointer transition-colors shadow-sm ${getStatusStyle(vendor.status || "Haven't looked")}`}
                           >
                             <option value="Haven't looked">New</option>
                             <option value="Maybe">Maybe</option>
                             <option value="Priority">Priority</option>
                             <option value="No">No</option>
                           </select>
                           <ChevronDown className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
                        </div>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-wedding-100 text-wedding-800 border border-wedding-200">
                        <Tag className="w-3 h-3 mr-1" />
                        {vendor.category}
                      </span>
                    </td>
                    <td className="p-4 text-gray-700 font-mono">
                      <span className="flex items-center">
                        <DollarSign className="w-3 h-3 text-gray-400 mr-1" />
                        {vendor.price.toLocaleString()}
                      </span>
                    </td>
                    <td className="p-4 text-gray-500 text-sm italic max-w-xs truncate" title={vendor.notes}>
                      {vendor.notes}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
