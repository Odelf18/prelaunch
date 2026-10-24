import { NextResponse } from "next/server";
import { resetDemo } from "@/lib/demo";
import { getAdminStats, getReferralTree, getLedgerFeed } from "@/lib/waitlist";

export async function POST() {
  try {
    await resetDemo();
    const [stats, tree, ledger] = await Promise.all([
      getAdminStats(),
      getReferralTree(),
      getLedgerFeed(30),
    ]);
    return NextResponse.json({ ok: true, stats, tree, ledger });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Reset failed" }, { status: 500 });
  }
}
