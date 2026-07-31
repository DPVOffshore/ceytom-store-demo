"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

const RfqContext = createContext(null);
const KEY = "ceytom.rfq.v1";

export function RfqProvider({ children }) {
  const [lines, setLines] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(KEY);
      if (saved) setLines(JSON.parse(saved));
    } catch {
      /* first visit, or storage unavailable */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(lines));
    } catch {
      /* storage full or blocked — basket still works for this session */
    }
  }, [lines, ready]);

  const add = useCallback((product, qty = 1) => {
    setLines((prev) => {
      const i = prev.findIndex((l) => l.id === product.id);
      if (i > -1) {
        const next = [...prev];
        next[i] = { ...next[i], qty: next[i].qty + qty };
        return next;
      }
      return [
        ...prev,
        {
          id: product.id,
          partNumber: product.partNumber,
          name: product.name,
          image: product.image,
          brand: product.brand,
          qty,
        },
      ];
    });
  }, []);

  const addMany = useCallback((entries) => {
    entries.forEach(({ product, qty }) => add(product, qty));
  }, [add]);

  const setQty = useCallback((id, qty) => {
    setLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, qty: Math.max(1, qty) } : l))
    );
  }, []);

  const remove = useCallback((id) => {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const count = lines.reduce((n, l) => n + l.qty, 0);

  return (
    <RfqContext.Provider
      value={{ lines, add, addMany, setQty, remove, clear, count, ready }}
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
