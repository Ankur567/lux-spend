"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** A browser-only value that renders `serverValue` during SSR and hydration. */
export function useClientValue<T>(getValue: () => T, serverValue: T): T {
  return useSyncExternalStore(subscribe, getValue, () => serverValue);
}

export function useOrigin(): string {
  return useClientValue(() => window.location.origin, "");
}
