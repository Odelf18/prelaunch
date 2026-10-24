import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { APP_NAME } from "@/lib/constants";

export default function HomePage() {
  return (
    <>
      <SiteNav active="home" />
      <main className="relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-5xl flex-col justify-center px-6 pb-20 md:px-10">
        <p className="mono text-xs uppercase tracking-[0.28em] text-[var(--accent)]">
          {APP_NAME}
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
          Fintech waitlist backend — referral, rewards, integrity — demonstrated
          live.
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-[var(--muted)]">
          Built as a working proof for the waitlist + referral + coin/cash
          rewards system. One click simulates a referred signup and streams
          every database write.
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link href="/demo" className="glow-btn rounded-xl px-6 py-3.5 text-sm">
            Open live system demo
          </Link>
          <Link
            href="/proposal"
            className="ghost-btn rounded-xl px-6 py-3.5 text-sm"
          >
            Read proposal answers
          </Link>
        </div>
      </main>
    </>
  );
}
