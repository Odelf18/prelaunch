import { NextResponse } from "next/server";
import { z } from "zod";
import { completeProfile, WaitlistError } from "@/lib/waitlist";

const bodySchema = z.object({
  userId: z.string().optional(),
  dashboardToken: z.string().optional(),
  fullName: z.string().min(1),
  phone: z.string().min(3),
});

export async function POST(req: Request) {
  try {
    const body = bodySchema.parse(await req.json());
    if (!body.userId && !body.dashboardToken) {
      return NextResponse.json(
        { error: "userId or dashboardToken required" },
        { status: 400 },
      );
    }
    const user = await completeProfile(body);
    return NextResponse.json({
      id: user.id,
      fullName: user.fullName,
      phone: user.phone,
      coinsBalance: user.coinsBalance,
      profileCompletedAt: user.profileCompletedAt,
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
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
