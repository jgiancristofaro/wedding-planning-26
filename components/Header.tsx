
import React from 'react';
import { Heart, Cloud, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';

export type SyncStatus = 'idle' | 'saving' | 'saved' | 'error';

interface HeaderProps {
  syncStatus: SyncStatus;
}

export const Header: React.FC<HeaderProps> = ({ syncStatus }) => {
  
  const getStatusBadge = () => {
    switch (syncStatus) {
      case 'saving':
        return (
          <div className="flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
            <RefreshCw className="w-3 h-3 text-blue-600 animate-spin" />
            <span className="text-xs font-bold text-blue-700">Saving...</span>
          </div>
        );
      case 'saved':
        return (
          <div className="flex items-center gap-2 bg-green-50 px-3 py-1 rounded-full border border-green-100">
            <CheckCircle2 className="w-3 h-3 text-green-600" />
            <span className="text-xs font-bold text-green-700">Saved</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center gap-2 bg-red-50 px-3 py-1 rounded-full border border-red-100">
            <AlertTriangle className="w-3 h-3 text-red-600" />
            <span className="text-xs font-bold text-red-700">Sync Error</span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-wedding-200 px-8 py-6 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <div className="bg-wedding-100 p-2 rounded-full">
          <Heart className="w-6 h-6 text-wedding-700 fill-current" />
        </div>
        <div>
          <h1 className="text-2xl font-serif font-bold text-wedding-900 tracking-wide">Wedding Planner AI</h1>
          <p className="text-xs text-wedding-500 uppercase tracking-widest font-sans">Venue & Vendor Organizer</p>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        {/* Mobile/Compact Status */}
        {getStatusBadge()}
        
        <div className="text-right hidden md:block">
          <p className="text-sm text-wedding-700 font-serif italic">"Happily Ever After begins with a plan"</p>
        </div>
      </div>
    </header>
  );
};
