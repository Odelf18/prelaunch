import { NextResponse } from "next/server";
import { z } from "zod";
import { signupUser, WaitlistError } from "@/lib/waitlist";

const bodySchema = z.object({
  email: z.string().email(),
  referralCode: z.string().optional().nullable(),
  simulate: z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const body = bodySchema.parse(json);
    const result = await signupUser({
      email: body.email,
      referralCode: body.referralCode,
      headers: req.headers,
      simulate: body.simulate,
    });
    return NextResponse.json(result, { status: 201 });
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
