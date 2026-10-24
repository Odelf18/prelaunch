import { NextResponse } from "next/server";
import { ensureSeeded } from "@/lib/demo";
import { getAdminStats } from "@/lib/waitlist";

export async function GET() {
  try {
    await ensureSeeded();
    const stats = await getAdminStats();
    return NextResponse.json(stats);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
