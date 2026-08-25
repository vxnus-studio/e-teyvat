import { NextResponse } from "next/server";
import { createTeyvatProvider } from "../../../../lib/teyvat/e-provider";

export async function POST(request: Request) {
  try {
    const { provider } = await createTeyvatProvider();
    const result = provider.handlers.verify(request.headers.get("authorization") || undefined);
    return NextResponse.json(result.body, { status: result.status });
  } catch {
    return NextResponse.json({ error: "knowledge_provider_unavailable" }, { status: 503 });
  }
}
