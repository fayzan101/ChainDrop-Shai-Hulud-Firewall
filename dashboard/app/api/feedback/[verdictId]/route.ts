import { NextRequest, NextResponse } from "next/server";
import { submitFeedback } from "@/lib/api";

export async function POST(
  request: NextRequest,
  context: { params: { verdictId: string } },
) {
  try {
    const body = await request.json();
    const result = await submitFeedback(context.params.verdictId, body);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Feedback failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
