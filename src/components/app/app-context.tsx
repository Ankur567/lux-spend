"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { AllocationRunResult, MemberDTO, SettingsDTO, SpaceDTO, WishlistItemDTO } from "@/types/domain";

export interface AppData {
  me: MemberDTO;
  partner: MemberDTO | null;
  members: MemberDTO[];
  space: SpaceDTO;
  settings: SettingsDTO;
  currency: string;
  upi: { id: string; name: string } | null;
  onlinePayments: { enabled: boolean; provider: string };
  unreadNotifications: number;
}

export type SheetState =
  | { kind: "none" }
  | { kind: "quick-add" }
  | { kind: "contribution"; prefill?: { amount?: string; paymentMethod?: string } }
  | { kind: "expense" }
  | { kind: "allocation"; focusItemId?: string }
  | { kind: "allocation-result"; result: AllocationRunResult }
  | { kind: "purchase"; item: WishlistItemDTO }
  | { kind: "pay-to-fund" };

interface AppContextValue extends AppData {
  sheet: SheetState;
  /** Changes every time a sheet opens, so sheets remount with fresh form state. */
  sheetKey: number;
  openSheet: (sheet: SheetState) => void;
  closeSheet: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ data, children }: { data: AppData; children: ReactNode }) {
  const [sheet, setSheet] = useState<SheetState>({ kind: "none" });
  const [sheetKey, setSheetKey] = useState(0);
  const openSheet = useCallback((next: SheetState) => {
    setSheet(next);
    setSheetKey((k) => k + 1);
  }, []);
  const closeSheet = useCallback(() => setSheet({ kind: "none" }), []);
  const value = useMemo(() => ({ ...data, sheet, sheetKey, openSheet, closeSheet }), [data, sheet, sheetKey, openSheet, closeSheet]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
