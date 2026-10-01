"use client";

import { useApp } from "@/components/app/app-context";
import { AllocationSheet } from "./allocation-sheet";
import { BottomSheet } from "./bottom-sheet";
import { ContributionSheet } from "./contribution-sheet";
import { ExpenseSheet } from "./expense-sheet";
import { PayToFundSheetBody } from "./pay-to-fund-sheet";
import { PurchaseSheet } from "./purchase-sheet";
import { QuickAddSheet } from "./quick-add-sheet";

/** Renders whichever global bottom sheet is currently open. */
export function SheetHost() {
  const { sheet, sheetKey, closeSheet, upi } = useApp();
  return (
    <>
      <QuickAddSheet key={`q${sheetKey}`} open={sheet.kind === "quick-add"} />
      <ContributionSheet key={`c${sheetKey}`} open={sheet.kind === "contribution"} prefill={sheet.kind === "contribution" ? sheet.prefill : undefined} />
      <ExpenseSheet key={`e${sheetKey}`} open={sheet.kind === "expense"} />
      <AllocationSheet
        key={`a${sheetKey}`}
        open={sheet.kind === "allocation" || sheet.kind === "allocation-result"}
        focusItemId={sheet.kind === "allocation" ? sheet.focusItemId : undefined}
        initialResult={sheet.kind === "allocation-result" ? sheet.result : undefined}
      />
      {sheet.kind === "purchase" ? <PurchaseSheet key={`p${sheetKey}`} open item={sheet.item} /> : null}
      {upi ? (
        <BottomSheet key={`u${sheetKey}`} open={sheet.kind === "pay-to-fund"} onOpenChange={(o) => !o && closeSheet()} title="Pay to fund" description="Send money to the shared fund account via UPI.">
          <PayToFundSheetBody />
        </BottomSheet>
      ) : null}
    </>
  );
}
