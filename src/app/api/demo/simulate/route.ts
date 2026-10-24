import { NextResponse } from "next/server";
import { z } from "zod";
import { simulateFraud, simulateReferredSignup } from "@/lib/demo";
import { getAdminStats, getReferralTree, getLedgerFeed } from "@/lib/waitlist";

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
        getLedgerFeed(30),
      ]);
      return NextResponse.json({ fraud, stats, tree, ledger });
    }

    const result = await simulateReferredSignup({
      completeProfile: body.completeProfile,
      referrerCode: body.referrerCode,
    });

    const [stats, tree, ledger] = await Promise.all([
      getAdminStats(),
      getReferralTree(),
      getLedgerFeed(30),
    ]);

    return NextResponse.json({ result, stats, tree, ledger });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 },
    );
  }
}
