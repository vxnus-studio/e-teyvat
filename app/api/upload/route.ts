import { type NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";

const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

export async function POST(request: NextRequest) {
  const session = request.cookies.get("eteyvat_admin_session")?.value;
  if (!session || session !== "authenticated") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const filename = searchParams.get("filename");
  const kind = searchParams.get("kind") || "misc";
  const slug = searchParams.get("slug") || "unknown";

  if (!filename) {
    return NextResponse.json({ error: "Filename is required" }, { status: 400 });
  }

  try {
    const arrayBuffer = await request.arrayBuffer();
    const originalBuffer = Buffer.from(arrayBuffer);
    
    // Compress and convert to AVIF
    const avifBuffer = await sharp(originalBuffer)
      .avif({ quality: 80, effort: 4 })
      .toBuffer();

    const key = `${kind}/${slug}.avif`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: "eteyvat",
        Key: key,
        Body: avifBuffer,
        ContentType: "image/avif",
      })
    );

    return NextResponse.json({ url: key });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
