
import React, { useState, useEffect } from 'react';
import { Venue, ConsiderationStatus } from '../types';
import { X, Save, MapPin, Users, DollarSign, Tag, FileText, Plus } from 'lucide-react';

interface VenueModalProps {
  venue?: Venue | null; // If null/undefined, we are in "Add Mode"
  isOpen: boolean;
  onClose: () => void;
  onSave: (venueData: Omit<Venue, 'id'>) => void;
}

const DEFAULT_VENUE: Omit<Venue, 'id'> = {
  venue_name: '',
  location: '',
  capacity: 0,
  booking_price: 0,
  per_person_cost: 0,
  food_bev_cost: '',
  admin_fees: '',
  vibe: '',
  notes: '',
  status: "Haven't looked"
};

export const VenueModal: React.FC<VenueModalProps> = ({ venue, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState<Omit<Venue, 'id'>>(DEFAULT_VENUE);

  // Initialize form based on mode (Edit vs Add)
  useEffect(() => {
    if (venue) {
      const { id, ...rest } = venue;
      setFormData(rest);
    } else {
      setFormData(DEFAULT_VENUE);
    }
  }, [venue, isOpen]);

  if (!isOpen) return null;

  const handleChange = (field: keyof Omit<Venue, 'id'>, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  const isEditMode = !!venue;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-fade-in border border-wedding-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-wedding-100 bg-wedding-50/50 rounded-t-2xl">
          <div>
            <h2 className="text-xl font-serif font-bold text-wedding-900">
              {isEditMode ? 'Edit Venue Details' : 'Add New Venue'}
            </h2>
            <p className="text-sm text-wedding-600">
              {isEditMode ? `Update information for ${formData.venue_name}` : 'Manually enter venue information'}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-wedding-100 rounded-full text-gray-400 hover:text-wedding-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="overflow-y-auto p-6 flex-1">
          <form id="venue-form" onSubmit={handleSubmit} className="space-y-6">
            
            {/* Name & Location */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-wedding-700 uppercase tracking-wider">Venue Name</label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.venue_name}
                    onChange={(e) => handleChange('venue_name', e.target.value)}
                    className="w-full pl-3 pr-3 py-2 bg-white border border-wedding-200 rounded-lg focus:ring-2 focus:ring-wedding-500 focus:outline-none"
                    placeholder="e.g. The Grand Hotel"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-wedding-700 uppercase tracking-wider">Location</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => handleChange('location', e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-wedding-200 rounded-lg focus:ring-2 focus:ring-wedding-500 focus:outline-none"
                    placeholder="City, State"
                  />
                </div>
              </div>
            </div>

            {/* Vibe & Capacity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-wedding-700 uppercase tracking-wider">Vibe / Style</label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={formData.vibe}
                    onChange={(e) => handleChange('vibe', e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-wedding-200 rounded-lg focus:ring-2 focus:ring-wedding-500 focus:outline-none"
                    placeholder="e.g. Modern, Rustic"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-wedding-700 uppercase tracking-wider">Capacity (Guests)</label>
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
            </div>

            <hr className="border-wedding-100" />

            {/* Financials */}
            <h3 className="text-sm font-bold text-wedding-900 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-wedding-500" />
              Financial Details
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-wedding-700 uppercase tracking-wider">Booking Cost ($)</label>
                <input
                  type="number"
                  value={formData.booking_price}
                  onChange={(e) => handleChange('booking_price', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white border border-wedding-200 rounded-lg focus:ring-2 focus:ring-wedding-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-wedding-700 uppercase tracking-wider">Per Person Cost ($)</label>
                <input
                  type="number"
                  value={formData.per_person_cost}
                  onChange={(e) => handleChange('per_person_cost', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white border border-wedding-200 rounded-lg focus:ring-2 focus:ring-wedding-500 focus:outline-none"
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-xs font-bold text-wedding-700 uppercase tracking-wider">Food & Bev Info</label>
                <input
                  type="text"
                  value={formData.food_bev_cost}
                  onChange={(e) => handleChange('food_bev_cost', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-wedding-200 rounded-lg focus:ring-2 focus:ring-wedding-500 focus:outline-none"
                  placeholder="e.g. Included, External Catering"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-wedding-700 uppercase tracking-wider">Admin Fees / Taxes</label>
                <input
                  type="text"
                  value={formData.admin_fees}
                  onChange={(e) => handleChange('admin_fees', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-wedding-200 rounded-lg focus:ring-2 focus:ring-wedding-500 focus:outline-none"
                  placeholder="e.g. 20% Service Charge"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-wedding-700 uppercase tracking-wider">Status</label>
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

            <hr className="border-wedding-100" />

            {/* Notes */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-wedding-700 uppercase tracking-wider flex items-center gap-1">
                <FileText className="w-3 h-3" /> Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 bg-white border border-wedding-200 rounded-lg focus:ring-2 focus:ring-wedding-500 focus:outline-none text-sm leading-relaxed"
                placeholder="Add specific details about the package, parking, restrictions, etc."
              />
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-wedding-100 bg-gray-50 rounded-b-2xl flex justify-end gap-3">
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
  );
};
