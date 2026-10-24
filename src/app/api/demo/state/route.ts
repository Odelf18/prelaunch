import { NextResponse } from "next/server";
import { ensureSeeded } from "@/lib/demo";
import { getAdminStats, getReferralTree, getLedgerFeed } from "@/lib/waitlist";
import { recentEvents } from "@/lib/events";

export async function GET() {
  try {
    await ensureSeeded();
    const [stats, tree, ledger] = await Promise.all([
      getAdminStats(),
      getReferralTree(),
      getLedgerFeed(40),
    ]);
    return NextResponse.json({
      stats,
      tree,
      ledger,
      events: recentEvents(40),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load state" }, { status: 500 });
  }
}
