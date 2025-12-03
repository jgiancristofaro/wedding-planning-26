
import React, { useState, useEffect } from 'react';
import { Venue, ConsiderationStatus } from '../types';
import { X, Save, MapPin, Users, DollarSign, Tag, FileText, Plus, Trash2, Calculator, Globe, Sparkles, Loader2, Building2 } from 'lucide-react';
import { enrichVenueDetails } from '../services/geminiService';

interface VenueModalProps {
  venue?: Venue | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (venueData: Omit<Venue, 'id'>) => void;
  onDelete?: () => void;
}

const DEFAULT_VENUE: Omit<Venue, 'id'> = {
  venue_name: '',
  location: '',
  city: '',
  state: '',
  vibe: [], // Initialized as array
  capacity: 0,
  status: "Haven't looked",
  booking_cost: 0,
  admin_fees: '',
  notes: '',
  site_fee: 0,
  site_fee_notes: '',
  food_bev_minimum: 0,
  welcome_cost_pp: 0,
  brunch_cost_pp: 0,
  reception_cost_pp: 0,
  cocktail_cost_pp: 0,
  total_cost_pp: 0,
  website_url: '',
};

export const VenueModal: React.FC<VenueModalProps> = ({ venue, isOpen, onClose, onSave, onDelete }) => {
  const [formData, setFormData] = useState<Omit<Venue, 'id'>>(DEFAULT_VENUE);
  const [vibeInput, setVibeInput] = useState(''); // Local state for text input of tags
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);

  useEffect(() => {
    if (venue) {
      const { id, ...rest } = venue;
      // Merge with default to ensure new fields like cocktail_cost_pp are present
      setFormData({
        ...DEFAULT_VENUE,
        ...rest,
        cocktail_cost_pp: rest.cocktail_cost_pp || 0,
        website_url: rest.website_url || '',
        city: rest.city || '',
        state: rest.state || ''
      });
      // Convert array to string for editing
      setVibeInput(Array.isArray(rest.vibe) ? rest.vibe.join(', ') : (rest.vibe || ''));
    } else {
      setFormData(DEFAULT_VENUE);
      setVibeInput('');
    }
    setShowDeleteConfirm(false);
  }, [venue, isOpen]);

  // Auto-calculate Total PP
  useEffect(() => {
    const total = 
      (Number(formData.welcome_cost_pp) || 0) + 
      (Number(formData.brunch_cost_pp) || 0) + 
      (Number(formData.reception_cost_pp) || 0) + 
      (Number(formData.cocktail_cost_pp) || 0);
    
    // Only update if value actually changed to prevent loops
    if (total !== (formData.total_cost_pp || 0)) {
      setFormData(prev => ({ ...prev, total_cost_pp: total }));
    }
  }, [formData.welcome_cost_pp, formData.brunch_cost_pp, formData.reception_cost_pp, formData.cocktail_cost_pp, formData.total_cost_pp]);

  if (!isOpen) return null;

  const handleChange = (field: keyof Omit<Venue, 'id'>, value: string | number | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAutoFill = async () => {
    if (!formData.venue_name) return;
    
    setIsEnriching(true);
    try {
      const enriched = await enrichVenueDetails(formData.venue_name, formData.location);
      if (enriched) {
        setFormData(prev => ({
          ...prev,
          // Prioritize new URL if current is empty
          website_url: prev.website_url || enriched.website_url || '',
          // Update location to full address if enriched is longer/better, otherwise keep existing
          location: (enriched.location && enriched.location.length > (prev.location || '').length) ? enriched.location : (prev.location || enriched.location || ''),
          city: enriched.city || prev.city || '',
          state: enriched.state || prev.state || '',
          // Fill capacity if missing
          capacity: prev.capacity || enriched.capacity || 0,
          // Fill vibe if missing, note: we update vibeInput below
          vibe: (prev.vibe && prev.vibe.length > 0) ? prev.vibe : (enriched.vibe || [])
        }));

        // Update the input field if the current input is empty and we found new tags
        if (!vibeInput && enriched.vibe && enriched.vibe.length > 0) {
           setVibeInput(enriched.vibe.join(', '));
        }
      }
    } catch (error) {
      console.error("Auto-fill failed", error);
    } finally {
      setIsEnriching(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Process vibeInput into array of capitalized strings
    const vibeArray = vibeInput
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .map(s => s.charAt(0).toUpperCase() + s.slice(1));

    onSave({ ...formData, vibe: vibeArray });
    onClose();
  };

  const isEditMode = !!venue;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      ></div>

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-fade-in border border-wedding-200">
        
        <div className="flex items-center justify-between p-6 border-b border-wedding-100 bg-wedding-50/50 rounded-t-2xl">
          <div>
            <h2 className="text-xl font-serif font-bold text-wedding-900">
              {isEditMode ? 'Edit Venue Details' : 'Add New Venue'}
            </h2>
            <p className="text-sm text-wedding-600">
              {isEditMode ? `Update financial breakdown for ${formData.venue_name}` : 'Enter venue details and rate card info'}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-wedding-100 rounded-full text-gray-400 hover:text-wedding-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 flex-1">
          <form id="venue-form" onSubmit={handleSubmit} className="space-y-8">
            
            {/* 1. General Info */}
            <section className="space-y-4">
              <div className="flex justify-between items-center border-b border-wedding-100 pb-2 mb-4">
                <h3 className="text-sm font-bold text-wedding-500 uppercase tracking-widest">General Information</h3>
                <button
                  type="button"
                  onClick={handleAutoFill}
                  disabled={!formData.venue_name || isEnriching}
                  className="text-xs font-bold text-wedding-600 hover:text-wedding-800 flex items-center gap-1.5 bg-wedding-50 px-3 py-1 rounded-full border border-wedding-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Search Google for address, capacity, and vibe"
                >
                  {isEnriching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-gold-500 fill-gold-400" />}
                  {isEnriching ? 'Searching...' : '✨ Auto-Fill Details'}
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-wedding-700">Venue Name</label>
                  <input
                    type="text"
                    value={formData.venue_name}
                    onChange={(e) => handleChange('venue_name', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-wedding-200 rounded-lg focus:ring-2 focus:ring-wedding-500 focus:outline-none"
                    placeholder="e.g. The Grand Hotel"
                    required
                  />
                </div>
                
                {/* City and State */}
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                    <label className="text-xs font-bold text-wedding-700">City</label>
                    <div className="relative">
                       <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                       <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => handleChange('city', e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-white border border-wedding-200 rounded-lg focus:ring-2 focus:ring-wedding-500 focus:outline-none"
                        placeholder="e.g. Napa"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-wedding-700">State</label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => handleChange('state', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-wedding-200 rounded-lg focus:ring-2 focus:ring-wedding-500 focus:outline-none uppercase"
                      placeholder="CA"
                      maxLength={2}
                    />
                  </div>
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-bold text-wedding-700">Full Address / Location</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => handleChange('location', e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-white border border-wedding-200 rounded-lg focus:ring-2 focus:ring-wedding-500 focus:outline-none"
                      placeholder="e.g. 123 Vine St, Napa Valley, CA 94558"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-wedding-700">Website URL</label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={formData.website_url || ''}
                      onChange={(e) => handleChange('website_url', e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-white border border-wedding-200 rounded-lg focus:ring-2 focus:ring-wedding-500 focus:outline-none"
                      placeholder="https://www.example.com"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-wedding-700">Vibe Tags (comma separated)</label>
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={vibeInput}
                      onChange={(e) => setVibeInput(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-white border border-wedding-200 rounded-lg focus:ring-2 focus:ring-wedding-500 focus:outline-none"
                      placeholder="e.g. Modern, Rustic, Outdoor"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-wedding-700">Max Capacity</label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="number"
                      value={formData.capacity}
                      onChange={(e) => handleChange('capacity', parseInt(e.target.value) || 0)}
                      className="w-full pl-9 pr-3 py-2 bg-white border border-wedding-200 rounded-lg focus:ring-2 focus:ring-wedding-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-wedding-700">Status</label>
                  <select
                      value={formData.status}
                      onChange={(e) => handleChange('status', e.target.value as ConsiderationStatus)}
                      className="w-full px-3 py-2 bg-white border border-wedding-200 rounded-lg focus:ring-2 focus:ring-wedding-500 focus:outline-none"
                  >
                      <option value="Haven't looked">Haven't looked</option>
                      <option value="Maybe">Maybe</option>
                      <option value="Priority">Priority</option>
                      <option value="No">No</option>
                  </select>
                </div>
                 <div className="space-y-1">
                  <label className="text-xs font-bold text-wedding-700">Est. Total Booking Cost</label>
                   <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="number"
                      value={formData.booking_cost}
                      onChange={(e) => handleChange('booking_cost', parseFloat(e.target.value) || 0)}
                      className="w-full pl-9 pr-3 py-2 bg-white border border-wedding-200 rounded-lg focus:ring-2 focus:ring-wedding-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* 2. Site Fees & Minimums */}
            <section className="space-y-4">
              <h3 className="text-sm font-bold text-wedding-500 uppercase tracking-widest border-b border-wedding-100 pb-2 mb-4">Site Fees & Minimums</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-wedding-700">Site Fee ($)</label>
                  <input
                    type="number"
                    value={formData.site_fee}
                    onChange={(e) => handleChange('site_fee', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-white border border-wedding-200 rounded-lg focus:ring-2 focus:ring-wedding-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-wedding-700">Site Fee Inclusions</label>
                  <input
                    type="text"
                    value={formData.site_fee_notes}
                    onChange={(e) => handleChange('site_fee_notes', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-wedding-200 rounded-lg focus:ring-2 focus:ring-wedding-500 focus:outline-none"
                    placeholder="e.g. Includes ceremony chairs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-wedding-700">F&B Minimum ($)</label>
                  <input
                    type="number"
                    value={formData.food_bev_minimum}
                    onChange={(e) => handleChange('food_bev_minimum', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-white border border-wedding-200 rounded-lg focus:ring-2 focus:ring-wedding-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-wedding-700">Admin Fees & Tax</label>
                  <input
                    type="text"
                    value={formData.admin_fees}
                    onChange={(e) => handleChange('admin_fees', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-wedding-200 rounded-lg focus:ring-2 focus:ring-wedding-500 focus:outline-none"
                    placeholder="e.g. 25% Admin + 8% Tax"
                  />
                </div>
              </div>
            </section>

            {/* 3. Per Person Costs */}
            <section className="space-y-4">
              <h3 className="text-sm font-bold text-wedding-500 uppercase tracking-widest border-b border-wedding-100 pb-2 mb-4">Per Person Costs</h3>
              <div className="bg-wedding-50/50 p-4 rounded-xl border border-wedding-100">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-wedding-700">Welcome ($/pp)</label>
                    <input
                      type="number"
                      value={formData.welcome_cost_pp}
                      onChange={(e) => handleChange('welcome_cost_pp', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white border border-wedding-200 rounded-lg focus:ring-2 focus:ring-wedding-500 focus:outline-none"
                    />
                  </div>
                   <div className="space-y-1">
                    <label className="text-xs font-bold text-wedding-700">Cocktail ($/pp)</label>
                    <input
                      type="number"
                      value={formData.cocktail_cost_pp}
                      onChange={(e) => handleChange('cocktail_cost_pp', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white border border-wedding-200 rounded-lg focus:ring-2 focus:ring-wedding-500 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-wedding-700">Reception ($/pp)</label>
                    <input
                      type="number"
                      value={formData.reception_cost_pp}
                      onChange={(e) => handleChange('reception_cost_pp', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white border border-wedding-200 rounded-lg focus:ring-2 focus:ring-wedding-500 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-wedding-700">Brunch ($/pp)</label>
                    <input
                      type="number"
                      value={formData.brunch_cost_pp}
                      onChange={(e) => handleChange('brunch_cost_pp', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white border border-wedding-200 rounded-lg focus:ring-2 focus:ring-wedding-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-wedding-200/50">
                   <div className="flex items-center gap-2 text-wedding-600 text-sm">
                      <Calculator className="w-4 h-4" />
                      <span>Total Calculated PP:</span>
                   </div>
                   <div className="text-2xl font-serif font-bold text-wedding-900">
                     ${(formData.total_cost_pp || 0).toFixed(2)}
                   </div>
                   {/* Hidden input to ensure it submits, though handled by state */}
                   <input type="hidden" value={formData.total_cost_pp || 0} />
                </div>
              </div>
            </section>

            {/* Notes */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-wedding-700 uppercase tracking-wider flex items-center gap-1">
                <FileText className="w-3 h-3" /> Rate Card Summary
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 bg-white border border-wedding-200 rounded-lg focus:ring-2 focus:ring-wedding-500 focus:outline-none text-sm leading-relaxed"
                placeholder="Paste rate card summaries, min guarantees, or other critical financial notes here."
              />
            </div>
          </form>
        </div>

        <div className="p-4 border-t border-wedding-100 bg-gray-50 rounded-b-2xl flex justify-between items-center">
          <div className="flex-1">
             {isEditMode && onDelete && (
               !showDeleteConfirm ? (
                 <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                 >
                   <Trash2 className="w-4 h-4" />
                   Delete
                 </button>
               ) : (
                 <div className="flex items-center gap-2 animate-fade-in">
                   <span className="text-xs font-bold text-red-600 uppercase tracking-wide mr-1">Confirm?</span>
                   <button
                    onClick={onDelete}
                    className="px-3 py-1 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
                   >
                     Yes
                   </button>
                   <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-3 py-1 text-xs font-bold text-gray-500 hover:bg-gray-200 rounded-md transition-colors"
                   >
                     Cancel
                   </button>
                 </div>
               )
             )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-bold text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="venue-form"
              className="flex items-center gap-2 px-6 py-2 text-sm font-bold text-white bg-wedding-700 hover:bg-wedding-900 rounded-lg shadow-sm transition-colors"
            >
              {isEditMode ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {isEditMode ? 'Save Changes' : 'Add Venue'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};