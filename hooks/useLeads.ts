"use client";

import { useState, useEffect, useCallback } from "react";
import { Lead } from "@/types/lead";
import { storage } from "@/lib/storage";

interface UseLeadsReturn {
  leads: Lead[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  saveLead: (lead: Lead) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
  saveLeads: (leads: Lead[]) => Promise<void>;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Could not load leads. Check your connection and refresh.";
}

export function useLeads(): UseLeadsReturn {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (showLoading: boolean) => {
    if (showLoading) setLoading(true);
    try {
      const data = await storage.getLeads();
      setLeads(data);
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  const reload = useCallback(async () => {
    await load(true);
  }, [load]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    const onFocus = () => {
      void load(false);
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  const saveLead = useCallback(
    async (lead: Lead) => {
      setError(null);
      setLeads((prev) => {
        const idx = prev.findIndex((item) => item.id === lead.id);
        if (idx < 0) {
          return [lead, ...prev];
        }
        const next = [...prev];
        next[idx] = lead;
        return next;
      });

      try {
        await storage.saveLead(lead);
        await load(false);
      } catch (err) {
        setError(getErrorMessage(err));
        await load(true);
        throw err;
      }
    },
    [load]
  );

  const deleteLead = useCallback(
    async (id: string) => {
      setError(null);
      setLeads((prev) => prev.filter((lead) => lead.id !== id));

      try {
        await storage.deleteLead(id);
        await load(false);
      } catch (err) {
        setError(getErrorMessage(err));
        await load(true);
        throw err;
      }
    },
    [load]
  );

  const saveLeads = useCallback(
    async (newLeads: Lead[]) => {
      setError(null);
      setLeads(newLeads);

      try {
        await storage.saveLeads(newLeads);
        await load(false);
      } catch (err) {
        setError(getErrorMessage(err));
        await load(true);
        throw err;
      }
    },
    [load]
  );

  return { leads, loading, error, reload, saveLead, deleteLead, saveLeads };
}
