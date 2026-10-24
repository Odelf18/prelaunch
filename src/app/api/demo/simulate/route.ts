import { NextResponse } from "next/server";
import { z } from "zod";
import { simulateFraud, simulateSignup } from "@/lib/demo";
import { getAdminStats, getReferralTree, getLedgerFeed } from "@/lib/waitlist";
import { recentEvents } from "@/lib/events";

const bodySchema = z.object({
  completeProfile: z.boolean().optional(),
  referrerCode: z.string().optional(),
  fraud: z.enum(["duplicate", "self"]).optional(),
});

export async function POST(req: Request) {
  try {
    const body = bodySchema.parse(await req.json().catch(() => ({})));

    if (body.fraud) {
      const fraud = await simulateFraud(body.fraud);
      const [stats, tree, ledger] = await Promise.all([
        getAdminStats(),
        getReferralTree(),
        getLedgerFeed(50),
      ]);
      return NextResponse.json({
        fraud,
        steps: fraud.steps,
        stats,
        tree,
        ledger,
        events: recentEvents(50),
      });
    }

    const result = await simulateSignup({
      completeProfile: body.completeProfile,
      referrerCode: body.referrerCode,
    });

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
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 },
    );
  }
}
