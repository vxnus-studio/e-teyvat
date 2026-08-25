import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

const PACKAGE_ID = "@vxnus/teyvat";
const PUBLISHER = "vxnuslabs";

export async function POST(request: Request) {
  const expected = process.env.E_PUBLISHER_API_KEY?.trim();
  const authorization = request.headers.get("authorization");
  const supplied = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();

  const matches = Boolean(expected && supplied && supplied.length === expected.length && timingSafeEqual(Buffer.from(supplied), Buffer.from(expected)));
  if (!matches) {
    return NextResponse.json({ error: "invalid_provider_key" }, { status: 401 });
  }

  return NextResponse.json({ id: PACKAGE_ID, publisher: PUBLISHER });
}
