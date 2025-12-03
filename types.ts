

export interface Venue {
  id: string;
  venue_name: string;
  location: string;
  city?: string; // New structured field
  state?: string; // New structured field (2-letter code)
  vibe: string[]; // Changed to Array of Tags
  capacity: number;
  status: ConsiderationStatus;
  
  // New Financial Schema
  booking_cost: number; // General estimate or Base cost
  admin_fees: string; // e.g. "25% admin + 8% tax"
  notes: string; // Rate card details
  
  site_fee: number;
  site_fee_notes: string;
  food_bev_minimum: number;
  
  welcome_cost_pp: number;
  brunch_cost_pp: number;
  reception_cost_pp: number;
  cocktail_cost_pp?: number; // New field for Cocktail Hour
  total_cost_pp: number; // Calculated sum

  website_url?: string; // New Magic Search field

  // Tracking
  lastUpdated?: number;
  updateDescription?: string;
}

export type ConsiderationStatus = "Haven't looked" | "No" | "Maybe" | "Interested" | "Priority";

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