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
      capacity: { type: Type.INTEGER },
      booking_price: { type: Type.NUMBER, description: "Base rental cost normalized to a number" },
      per_person_cost: { type: Type.NUMBER, description: "Cost per person normalized to a number" },
      food_bev_cost: { type: Type.STRING },
      admin_fees: { type: Type.STRING },
      vibe: { type: Type.STRING },
      notes: { type: Type.STRING },
    },
    required: ["venue_name", "location", "booking_price"],
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

export const extractVenueData = async (file: File): Promise<Omit<Venue, 'id'>[]> => {
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
      { text: "You are a wedding planner assistant. Extract details for ALL venues found in this data. Return a JSON array of venues. If specific numeric values are missing, estimate or use 0. Normalize prices to numbers." }
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
        text: "You are a wedding planner assistant. Extract details for ALL venues found in this document. Return a JSON array of venues. If specific numeric values are missing, estimate or use 0. Normalize prices to numbers.",
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

export const extractVendorData = async (file: File): Promise<Omit<Vendor, 'id'>[]> => {
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