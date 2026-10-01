import "server-only";
import { revalidatePath } from "next/cache";

/** Every screen derives from the same ledger, so refresh the whole app tree. */
export function revalidateApp() {
  revalidatePath("/", "layout");
}
