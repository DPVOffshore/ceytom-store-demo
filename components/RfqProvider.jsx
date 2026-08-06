"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

const RfqContext = createContext(null);
const KEY = "ceytom.rfq.v1";
const NOTE_KEY = "ceytom.rfq.note.v1";

/**
 * A line is either a catalogue part (id = product id) or a free-text line
 * (freeText: true) for something we do not list — an unmatched competitor
 * reference, or a contact block that is quoted rather than listed. Free lines
 * carry the same shape so every consumer can treat the basket uniformly.
 */
function lineFromProduct(product, qty) {
  return {
    id: product.id,
    partNumber: product.partNumber,
    name: product.name,
    image: product.image ?? null,
    brand: product.brand ?? null,
    qty,
  };
}

export function RfqProvider({ children }) {
  const [lines, setLines] = useState([]);
  const [note, setNoteState] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setLines(parsed);
      }
      const savedNote = window.localStorage.getItem(NOTE_KEY);
      if (savedNote) setNoteState(savedNote);
    } catch {
      /* first visit, or storage unavailable */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(lines));
      window.localStorage.setItem(NOTE_KEY, note);
    } catch {
      /* storage full or blocked — basket still works for this session */
    }
  }, [lines, note, ready]);

  const add = useCallback((product, qty = 1) => {
    setLines((prev) => {
      const i = prev.findIndex((l) => l.id === product.id);
      if (i > -1) {
        const next = [...prev];
        next[i] = { ...next[i], qty: next[i].qty + qty };
        return next;
      }
      return [...prev, lineFromProduct(product, qty)];
    });
  }, []);

  const addMany = useCallback(
    (entries) => {
      entries.forEach(({ product, qty }) => add(product, qty ?? 1));
    },
    [add]
  );

  /**
   * A line we cannot resolve to a catalogue part — an unmatched competitor
   * reference, or an accessory quoted rather than listed. Never a dead end:
   * it still travels with the request and sales identifies it.
   */
  const addFree = useCallback(({ id, partNumber, name, qty = 1 }) => {
    const lineId = id || `free:${String(partNumber || name).toLowerCase().replace(/[^a-z0-9]/g, "")}`;
    setLines((prev) => {
      const i = prev.findIndex((l) => l.id === lineId);
      if (i > -1) {
        const next = [...prev];
        next[i] = { ...next[i], qty: next[i].qty + qty };
        return next;
      }
      return [
        ...prev,
        {
          id: lineId,
          partNumber: partNumber || "—",
          name: name || "Sales will identify this line",
          image: null,
          brand: null,
          freeText: true,
          qty,
        },
      ];
    });
  }, []);

  /** Restore a shared or saved list. mode "replace" wipes, "merge" sums quantities. */
  const applyLines = useCallback((incoming, mode = "replace") => {
    setLines((prev) => {
      if (mode === "replace") return incoming.map((l) => ({ ...l }));
      const next = prev.map((l) => ({ ...l }));
      for (const line of incoming) {
        const i = next.findIndex((l) => l.id === line.id);
        if (i > -1) next[i] = { ...next[i], qty: next[i].qty + line.qty };
        else next.push({ ...line });
      }
      return next;
    });
  }, []);

  const setQty = useCallback((id, qty) => {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, qty: Math.max(1, qty) } : l)));
  }, []);

  const remove = useCallback((id) => {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const clear = useCallback(() => {
    setLines([]);
    setNoteState("");
  }, []);

  const setNote = useCallback((value) => setNoteState(String(value ?? "")), []);

  const has = useCallback((id) => lines.some((l) => l.id === id), [lines]);

  const count = lines.reduce((n, l) => n + l.qty, 0);

  return (
    <RfqContext.Provider
      value={{
        lines,
        note,
        setNote,
        add,
        addFree,
        addMany,
        applyLines,
        setQty,
        remove,
        clear,
        has,
        count,
        ready,
      }}
    >
      {children}
    </RfqContext.Provider>
  );
}

export function useRfq() {
  const ctx = useContext(RfqContext);
  if (!ctx) throw new Error("useRfq must be used inside RfqProvider");
  return ctx;
}
