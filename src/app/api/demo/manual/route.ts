import { NextResponse } from "next/server";
import { z } from "zod";
import { manualSignup } from "@/lib/demo";
import { WaitlistError } from "@/lib/waitlist";
import { getAdminStats, getReferralTree, getLedgerFeed } from "@/lib/waitlist";
import { recentEvents } from "@/lib/events";

const bodySchema = z.object({
  email: z.string().email(),
  referralCode: z.string().optional().nullable(),
  fullName: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  try {
    const body = bodySchema.parse(await req.json());
    const result = await manualSignup({
      email: body.email,
      referralCode: body.referralCode,
      fullName: body.fullName ?? undefined,
      phone: body.phone ?? undefined,
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
    if (err instanceof WaitlistError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: 400 },
      );
    }
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid payload", details: err.flatten() },
        { status: 400 },
      );
    }
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Manual signup failed" },
      { status: 500 },
    );
  }
}
