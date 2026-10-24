import Link from "next/link";
import { APP_NAME } from "@/lib/constants";

export function SiteNav({ active }: { active?: "home" | "demo" | "proposal" }) {
  const link = (href: string, key: typeof active, label: string) => (
    <Link
      href={href}
      className={`text-sm tracking-wide transition-colors ${
        active === key ? "text-[var(--accent)]" : "text-[var(--muted)] hover:text-[var(--text)]"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <header className="relative z-20 flex items-center justify-between px-6 py-5 md:px-10">
      <Link href="/" className="flex items-baseline gap-2">
        <span className="text-lg font-semibold tracking-tight">{APP_NAME}</span>
        <span className="mono hidden text-[10px] uppercase tracking-[0.2em] text-[var(--muted)] sm:inline">
          waitlist infra
        </span>
      </Link>
      <nav className="flex items-center gap-6">
        {link("/", "home", "Home")}
        {link("/demo", "demo", "Live demo")}
        {link("/proposal", "proposal", "Proposal")}
      </nav>
    </header>
  );
}
