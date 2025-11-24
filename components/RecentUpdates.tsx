
import React from 'react';
import { Venue, Vendor } from '../types';
import { Clock, MapPin, Users, Activity } from 'lucide-react';

interface RecentUpdatesProps {
  venues: Venue[];
  vendors: Vendor[];
}

export const RecentUpdates: React.FC<RecentUpdatesProps> = ({ venues, vendors }) => {
  // Combine and sort items that have update history
  const items = [
    ...venues.map(v => ({ ...v, type: 'Venue' as const })),
    ...vendors.map(v => ({ ...v, type: 'Vendor' as const }))
  ]
  .filter(item => item.lastUpdated)
  .sort((a, b) => (b.lastUpdated || 0) - (a.lastUpdated || 0));

  if (items.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-wedding-100 animate-fade-in">
        <div className="bg-wedding-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Activity className="w-10 h-10 text-wedding-300" />
        </div>
        <h3 className="text-xl font-serif font-bold text-wedding-900">No Recent Updates</h3>
        <p className="text-wedding-500 max-w-md mx-auto mt-2 leading-relaxed">
          Your planning timeline is empty. Upload brochures or edit your items to start tracking changes and updates here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-serif font-bold text-wedding-900">Recent Updates</h2>
          <p className="text-wedding-600 mt-1">Timeline of changes to your wedding plans.</p>
        </div>
      </div>

      <div className="relative border-l-2 border-wedding-200 ml-4 md:ml-6 space-y-8 py-2">
        {items.map((item) => {
           const date = new Date(item.lastUpdated!);
           const isVenue = item.type === 'Venue';
           // Generate a color based on type
           const iconBg = isVenue ? 'bg-wedding-500' : 'bg-gold-500';
           const iconText = isVenue ? 'text-wedding-500' : 'text-gold-500';

           return (
             <div key={`${item.type}-${item.id}`} className="relative pl-8 md:pl-12 group">
               {/* Timeline Dot */}
               <div className={`absolute -left-[9px] top-6 w-5 h-5 rounded-full border-4 border-white ${iconBg} shadow-sm group-hover:scale-110 transition-transform`}></div>
               
               <div className="bg-white p-5 rounded-xl shadow-sm border border-wedding-100 hover:shadow-md hover:border-wedding-200 transition-all duration-300">
                 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                   <div className="flex items-center gap-2">
                     <span className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${iconText} bg-opacity-10 px-2 py-0.5 rounded-full bg-gray-50`}>
                        {isVenue ? <MapPin className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                        {item.type}
                     </span>
                     <span className="text-gray-300 text-xs hidden sm:inline">•</span>
                     <div className="flex items-center gap-1 text-xs text-gray-400 font-mono">
                        <Clock className="w-3 h-3" />
                        {date.toLocaleDateString()} at {date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                     </div>
                   </div>
                 </div>
                 
                 <h3 className="text-lg font-bold text-wedding-900 mb-2">
                   {isVenue ? (item as Venue).venue_name : (item as Vendor).vendor_name}
                 </h3>
                 
                 <div className="text-sm text-gray-700 bg-wedding-50/50 p-3 rounded-lg border border-wedding-100">
                   {item.updateDescription || 'Details updated'}
                 </div>
               </div>
             </div>
           );
        })}
      </div>
    </div>
  );
};
