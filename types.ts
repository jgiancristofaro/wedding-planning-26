
export interface Venue {
  id: string;
  venue_name: string;
  location: string;
  capacity: number;
  booking_price: number; // Normalized to number for charts
  per_person_cost: number;
  food_bev_cost: string;
  admin_fees: string;
  vibe: string;
  notes: string;
  status: ConsiderationStatus;
  lastUpdated?: number;
  updateDescription?: string;
}

export type ConsiderationStatus = "Haven't looked" | "No" | "Maybe" | "Priority";

export interface Vendor {
  id: string;
  vendor_name: string;
  category: string;
  price: number; // Normalized
  notes: string;
  status: ConsiderationStatus;
  lastUpdated?: number;
  updateDescription?: string;
}

export enum Tab {
  VENUES = 'VENUES',
  VENDORS = 'VENDORS',
  DASHBOARD = 'DASHBOARD',
  SETTINGS = 'SETTINGS',
  UPDATES = 'UPDATES',
}

export interface AppState {
  venues: Venue[];
  vendors: Vendor[];
}

export const INITIAL_STATE: AppState = {
  venues: [],
  vendors: [],
};

export interface SyncConfig {
  projectId: string;
  apiKey: string;
}
