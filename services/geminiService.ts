
import { GoogleGenAI, Type } from "@google/genai";
import { Venue, Vendor } from "../types";
import * as XLSX from "xlsx";

// Helper to convert file to base64
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove Data URL prefix (e.g., "data:application/pdf;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

// Helper to convert Excel file to CSV text
const excelToCsv = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        // Use the first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        // Convert to CSV
        const csv = XLSX.utils.sheet_to_csv(worksheet);
        resolve(csv);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};

// Check if file is Excel
const isExcelFile = (file: File) => {
  return file.name.endsWith('.xlsx') || 
         file.name.endsWith('.xls') || 
         file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
         file.type === 'application/vnd.ms-excel';
};

// Schema for Venue Extraction (Array of Venues)
const venueSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      venue_name: { type: Type.STRING },
      location: { type: Type.STRING },
      vibe: { type: Type.STRING },
      capacity: { type: Type.INTEGER, description: "If multiple options, use MAXIMUM capacity." },
      booking_cost: { type: Type.NUMBER, description: "Total estimated booking cost if available, else 0" },
      admin_fees: { type: Type.STRING, description: "e.g., '25% admin + 8% tax'" },
      notes: { type: Type.STRING, description: "Rate Card summary (e.g. 'Site fee: $50k, Min guarantee: $60k')" },
      site_fee: { type: Type.NUMBER },
      site_fee_notes: { type: Type.STRING, description: "1 sentence on inclusions" },
      food_bev_minimum: { type: Type.NUMBER },
      welcome_cost_pp: { type: Type.NUMBER, description: "Cost for 4-hour premium open bar/food" },
      cocktail_cost_pp: { type: Type.NUMBER, description: "Cost for 1-hour premium open bar" },
      brunch_cost_pp: { type: Type.NUMBER, description: "Cost per person for brunch" },
      reception_cost_pp: { type: Type.NUMBER, description: "Dinner + 4-hour premium open bar" },
      total_cost_pp: { type: Type.NUMBER, description: "Sum of welcome, cocktail, brunch, and reception costs" },
    },
    required: ["venue_name", "location", "total_cost_pp"],
  }
};

// Schema for Vendor Extraction (Array of Vendors)
const vendorSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      vendor_name: { type: Type.STRING },
      category: { type: Type.STRING, description: "e.g., Photographer, Florist, Band" },
      price: { type: Type.NUMBER, description: "Estimated cost normalized to a number" },
      notes: { type: Type.STRING },
    },
    required: ["vendor_name", "category", "price"],
  }
};

export const extractVenueData = async (file: File): Promise<Omit<Venue, 'id' | 'status'>[]> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API Key is missing. Please check your environment configuration.");
  }

  const ai = new GoogleGenAI({ apiKey });
  let parts = [];

  const promptText = `
    You are a wedding planner assistant. Extract details for ALL venues found in this document. 
    Return a JSON array of venues. Normalize all prices to numbers.
    
    CRITICAL INSTRUCTIONS:
    1. For Capacity: If multiple options exist, use the MAXIMUM capacity available.
    2. For Costs: If prices vary by date, assume the wedding is in DECEMBER.
    3. For Notes: Create a 'Rate Card' summary (e.g., 'Site fee: $50k, Min guarantee: $60k').
    4. For Welcome Dinner: Look for costs associated with a 4-hour premium open bar.
    5. For Cocktail Hour: Look for costs associated with a 1-hour premium open bar. If listed separately from the reception package, extract it here.
    6. For Reception: Look for costs associated with dinner + 4-hour premium open bar.
    7. Calculate 'total_cost_pp' as the sum of reception, brunch, welcome, AND cocktail costs. Calculate this based on your extracted values.
  `;

  if (isExcelFile(file)) {
    const csvData = await excelToCsv(file);
    parts = [
      { text: "Here is data from an uploaded Excel file (converted to CSV):" },
      { text: csvData },
      { text: promptText }
    ];
  } else {
    const base64Data = await fileToBase64(file);
    const mimeType = file.type || 'application/pdf';
    parts = [
      {
        inlineData: {
          mimeType: mimeType,
          data: base64Data,
        },
      },
      {
        text: promptText,
      },
    ];
  }

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts },
    config: {
      responseMimeType: "application/json",
      responseSchema: venueSchema,
    },
  });

  if (!response.text) throw new Error("No data extracted from the Gemini API.");
  return JSON.parse(response.text);
};

export const extractVendorData = async (file: File): Promise<Omit<Vendor, 'id' | 'status'>[]> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API Key is missing. Please check your environment configuration.");
  }

  const ai = new GoogleGenAI({ apiKey });
  let parts = [];

  if (isExcelFile(file)) {
    const csvData = await excelToCsv(file);
    parts = [
      { text: "Here is data from an uploaded Excel file (converted to CSV):" },
      { text: csvData },
      { text: "You are a wedding planner assistant. Extract details for ALL vendors found in this data. Return a JSON array of vendors. Normalize prices to numbers." }
    ];
  } else {
    const base64Data = await fileToBase64(file);
    const mimeType = file.type || 'application/pdf';
    parts = [
      {
        inlineData: {
          mimeType: mimeType,
          data: base64Data,
        },
      },
      {
        text: "You are a wedding planner assistant. Extract details for ALL vendors found in this document. Return a JSON array of vendors. Normalize prices to numbers.",
      },
    ];
  }

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts },
    config: {
      responseMimeType: "application/json",
      responseSchema: vendorSchema,
    },
  });

  if (!response.text) throw new Error("No data extracted from the Gemini API.");
  return JSON.parse(response.text);
};

// Magic Search Feature
export const findVenueUrl = async (venueName: string, location: string): Promise<string | null> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    // Fail gracefully if no key is present in client
    console.error("Gemini API Key is missing.");
    return null;
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `Find the official website URL for the wedding venue '${venueName}' located in '${location}'. Return ONLY a JSON object with the key 'url'. If you cannot find a definitive official website, return { "url": null }. Example output: { "url": "https://www.example.com" }`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      }
    });

    const text = response.text || "";
    
    // Attempt to extract JSON from the text response
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    
    if (start !== -1 && end !== -1) {
      const jsonStr = text.substring(start, end + 1);
      const json = JSON.parse(jsonStr);
      return json.url || null;
    }
    
    return null;
  } catch (error) {
    console.error("Magic Search Error:", error);
    return null;
  }
};

// Auto-Fill Venue Details Feature
export const enrichVenueDetails = async (venueName: string, location: string): Promise<{
  website_url?: string;
  location?: string;
  capacity?: number;
  vibe?: string;
} | null> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return null;

  const ai = new GoogleGenAI({ apiKey });

  const locationContext = location ? `in '${location}'` : '';
  const prompt = `Search for the wedding venue '${venueName}' ${locationContext}. 
Find the following details:
1. Official Website URL
2. Full Street Address
3. Maximum Guest Capacity
4. Vibe/Style (e.g. Modern, Rustic, Garden, etc.)

Return the result as a VALID JSON object with the keys: "website_url", "location" (full address), "capacity" (number), and "vibe".
Do not include Markdown formatting.
If a value is not found, set it to null.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      }
    });

    const text = response.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const jsonStr = jsonMatch[0];
      const json = JSON.parse(jsonStr);
      return {
        website_url: json.website_url || undefined,
        location: json.location || undefined,
        capacity: typeof json.capacity === 'number' ? json.capacity : (parseInt(json.capacity) || undefined),
        vibe: json.vibe || undefined
      };
    }
    
    return null;
  } catch (error) {
    console.error("Enrichment Error:", error);
    return null;
  }
};
