import { NextResponse } from "next/server";
import { buildMockTree } from "@/lib/demo";
import { getAdminStats, getReferralTree, getLedgerFeed } from "@/lib/waitlist";
import { recentEvents } from "@/lib/events";

export async function POST() {
  try {
    const result = await buildMockTree();
    const [stats, tree, ledger] = await Promise.all([
      getAdminStats(),
      getReferralTree(),
      getLedgerFeed(50),
    ]);
    return NextResponse.json({
      result,
      steps: result.steps,
      stats,
      tree,
      ledger,
      events: recentEvents(50),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Mock tree failed" },
      { status: 500 },
    );
  }
}
