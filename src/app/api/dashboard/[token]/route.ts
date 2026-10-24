import { NextResponse } from "next/server";
import { getDashboardByToken } from "@/lib/waitlist";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const data = await getDashboardByToken(token);
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(data);
}
