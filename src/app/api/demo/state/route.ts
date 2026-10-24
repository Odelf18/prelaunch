import { NextResponse } from "next/server";
import { getAdminStats, getReferralTree, getLedgerFeed } from "@/lib/waitlist";
import { recentEvents } from "@/lib/events";

export async function GET() {
  try {
    const [stats, tree, ledger] = await Promise.all([
      getAdminStats(),
      getReferralTree(),
      getLedgerFeed(50),
    ]);
    return NextResponse.json({
      stats,
      tree,
      ledger,
      events: recentEvents(50),
      empty: stats.totalSignups === 0,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load state" }, { status: 500 });
  }
}
