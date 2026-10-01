"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function BottomSheet({ open, onOpenChange, title, description, children, footer, className }: BottomSheetProps) {
  return (
    <Drawer open={open} onOpenChange={(next) => onOpenChange(next)} showSwipeHandle>
      <DrawerContent className={cn("mx-auto max-w-lg rounded-t-[28px] border-0 bg-background", className)}>
        <DrawerHeader className="relative px-5 pt-2 pb-1 text-left group-data-[swipe-axis=y]/drawer-popup:text-left">
          <DrawerTitle className="font-display text-[1.7rem] font-normal leading-tight">{title}</DrawerTitle>
          {description ? <DrawerDescription className="text-left">{description}</DrawerDescription> : null}
          <DrawerClose
            className="absolute right-3 top-0 flex size-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
            aria-label="Close"
          >
            <X className="size-5" />
          </DrawerClose>
        </DrawerHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-3 pb-4">{children}</div>
        {footer ? <div className="border-t border-border/60 bg-background px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div> : null}
      </DrawerContent>
    </Drawer>
  );
}
