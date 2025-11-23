import React from 'react';
import { Venue, Vendor } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

interface DashboardProps {
  venues: Venue[];
  vendors: Vendor[];
}

export const Dashboard: React.FC<DashboardProps> = ({ venues, vendors }) => {
  const venueData = venues.map(v => ({
    name: v.venue_name,
    cost: v.booking_price,
    capacity: v.capacity
  }));

  const vendorCostByCategory = vendors.reduce((acc, vendor) => {
    const existing = acc.find(i => i.name === vendor.category);
    if (existing) {
      existing.value += vendor.price;
    } else {
      acc.push({ name: vendor.category, value: vendor.price });
    }
    return acc;
  }, [] as { name: string; value: number }[]);

  const totalBudget = venues.reduce((acc, v) => acc + v.booking_price, 0) + vendors.reduce((acc, v) => acc + v.price, 0);
  const COLORS = ['#bfa094', '#a18072', '#e0cec7', '#d4af37', '#5e4b42'];

  return (
    <div className="space-y-8">
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-wedding-100">
            <p className="text-xs text-wedding-500 uppercase font-bold tracking-widest">Total Estimated Cost</p>
            <p className="text-3xl font-serif font-bold text-wedding-900 mt-2">${totalBudget.toLocaleString()}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-wedding-100">
            <p className="text-xs text-wedding-500 uppercase font-bold tracking-widest">Tracked Venues</p>
            <p className="text-3xl font-serif font-bold text-wedding-900 mt-2">{venues.length}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-wedding-100">
            <p className="text-xs text-wedding-500 uppercase font-bold tracking-widest">Tracked Vendors</p>
            <p className="text-3xl font-serif font-bold text-wedding-900 mt-2">{vendors.length}</p>
          </div>
       </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-wedding-100 h-96">
          <h3 className="text-lg font-serif font-bold text-wedding-900 mb-6">Venue Booking Costs</h3>
          <ResponsiveContainer width="100%" height="80%">
            <BarChart data={venueData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f2e8e5" />
              <XAxis dataKey="name" hide />
              <YAxis />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', borderColor: '#eaddd7', borderRadius: '8px' }} 
                itemStyle={{ color: '#5e4b42' }}
              />
              <Bar dataKey="cost" fill="#bfa094" radius={[4, 4, 0, 0]}>
                {venueData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-wedding-100 h-96">
          <h3 className="text-lg font-serif font-bold text-wedding-900 mb-6">Vendor Budget by Category</h3>
          <ResponsiveContainer width="100%" height="80%">
             <PieChart>
              <Pie
                data={vendorCostByCategory}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                fill="#8884d8"
                paddingAngle={5}
                dataKey="value"
              >
                {vendorCostByCategory.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            {vendorCostByCategory.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span className="text-xs text-gray-600">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};