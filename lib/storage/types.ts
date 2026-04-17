import { Lead } from "@/types/lead";

export interface StorageAdapter {
  getLeads(): Promise<Lead[]>;
  saveLeads(leads: Lead[]): Promise<void>;
  getLead(id: string): Promise<Lead | null>;
  saveLead(lead: Lead): Promise<void>;
  deleteLead(id: string): Promise<void>;
  clearAll(): Promise<void>;
}
