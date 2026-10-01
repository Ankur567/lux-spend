import { NextResponse } from "next/server";
import { getMemberContext } from "@/lib/auth/guard";
import { jsonBackup, transactionsCsv, wishlistCsv } from "@/lib/services/export-service";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: RouteContext<"/api/export/[kind]">) {
  const member = await getMemberContext();
  if (!member) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { kind } = await ctx.params;
  const stamp = new Date().toISOString().slice(0, 10);
  const headers = { "Cache-Control": "no-store" };

  switch (kind) {
    case "transactions":
      return new NextResponse(await transactionsCsv(member), {
        headers: { ...headers, "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="transactions-${stamp}.csv"` },
      });
    case "wishlist":
      return new NextResponse(await wishlistCsv(member), {
        headers: { ...headers, "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="wishlist-${stamp}.csv"` },
      });
    case "backup":
      return new NextResponse(JSON.stringify(await jsonBackup(member), null, 2), {
        headers: { ...headers, "Content-Type": "application/json", "Content-Disposition": `attachment; filename="luxe-fund-backup-${stamp}.json"` },
      });
    default:
      return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
