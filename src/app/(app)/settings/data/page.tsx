import { FileJson, FileSpreadsheet } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { requireMemberPage } from "@/lib/auth/guard";

export const metadata = { title: "Export data" };

const EXPORTS = [
  { href: "/api/export/transactions", icon: FileSpreadsheet, title: "Transactions (CSV)", text: "Every ledger entry, including reversals." },
  { href: "/api/export/wishlist", icon: FileSpreadsheet, title: "Wishlist (CSV)", text: "All wishes with their funding progress." },
  { href: "/api/export/backup", icon: FileJson, title: "Full backup (JSON)", text: "Space, settings, wishes, transactions and allocations." },
];

export default async function DataSettingsPage() {
  await requireMemberPage();
  return (
    <div className="pt-4 md:pt-8">
      <PageHeader title="Export data" subtitle="Your data belongs to you. Download it any time." backHref="/settings" />
      <ul className="space-y-2">
        {EXPORTS.map(({ href, icon: Icon, title, text }) => (
          <li key={href}>
            <a href={href} className="surface flex items-center gap-4 p-4" download>
              <span className="flex size-11 items-center justify-center rounded-2xl bg-gold-soft text-gold">
                <Icon className="size-5" aria-hidden />
              </span>
              <span>
                <span className="block font-medium">{title}</span>
                <span className="block text-sm text-muted-foreground">{text}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
