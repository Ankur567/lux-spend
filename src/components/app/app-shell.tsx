"use client";

import type { ReactNode } from "react";
import { AppProvider, type AppData } from "@/components/app/app-context";
import { BottomNavigation, SideNavigation } from "@/components/app/navigation";
import { SheetHost } from "@/components/sheets/sheet-host";

export function AppShell({ data, children }: { data: AppData; children: ReactNode }) {
  return (
    <AppProvider data={data}>
      <div className="flex min-h-dvh">
        <SideNavigation />
        <main id="main" className="min-w-0 flex-1 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-10">
          <div className="pt-safe mx-auto w-full max-w-3xl px-4 md:px-8">{children}</div>
        </main>
      </div>
      <BottomNavigation />
      <SheetHost />
    </AppProvider>
  );
}
