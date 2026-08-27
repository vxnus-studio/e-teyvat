import { NextResponse } from "next/server";
import { getTeyvatLoreQueries } from "@/lib/teyvat/engine";
import { errorResponse } from "@/app/api/utils";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const loreQueries = await getTeyvatLoreQueries();
    const book = loreQueries.getBook(slug);

    if (!book) {
      return errorResponse("Book not found.", 404);
    }

    return NextResponse.json(book, {
      headers: {
        "cache-control": "public, max-age=60, s-maxage=300",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to retrieve book detail";
    return errorResponse(message, 500);
  }
}
