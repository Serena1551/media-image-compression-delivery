import { InfraiClient } from "./infrai_client.ts";
import { objectKey, shouldCompress, type DeliveryRequest } from "./compression_decision.ts";
import { z } from "zod";

const deliveryRequestBody = z.object({
  image: z.string().min(1),
  filename: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive()
});

export function imageValue(image: string): string {
  const match = image.match(/^data:[^;,]+;base64,(.*)$/s);
  return match?.[1] ?? image;
}

const apiKey = process.env.INFRAI_API_KEY;
const bucket = process.env.INFRAI_BUCKET ?? "media-streaming-assets";
if (!apiKey) throw new Error("Set INFRAI_API_KEY before running the example");

const client = new InfraiClient(apiKey);
const request = deliveryRequestBody.parse({
  image: process.env.MEDIA_IMAGE ?? "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  filename: process.env.MEDIA_FILENAME ?? "creator-cover.jpg",
  width: Number(process.env.MEDIA_WIDTH ?? 2400),
  height: Number(process.env.MEDIA_HEIGHT ?? 1350)
}) as DeliveryRequest;

async function deliver(): Promise<void> {
  console.log(JSON.stringify({ bucket }));
  await client.request("POST", "/v1/storage/bucket/create", { name: bucket });
  const key = objectKey(request);
  const optimizedImage = shouldCompress(request)
    ? await client.request<{ url: string }>("POST", "/v1/image/compress", { image: { base64: imageValue(request.image) } })
    : { data_base64: imageValue(request.image) };
  const dataBase64 = "data_base64" in optimizedImage
    ? optimizedImage.data_base64
    : Buffer.from(await (await fetch(optimizedImage.url)).arrayBuffer()).toString("base64");
  await client.request("PUT", `/v1/storage/object/put/${encodeURIComponent(bucket)}/${encodeURIComponent(key)}`, {
    data_base64: dataBase64,
    content_type: "image/jpeg"
  });
  console.log(JSON.stringify({ bucket, key, compressed: shouldCompress(request) }));
}

if (import.meta.url === `file://${process.argv[1]}`) deliver().catch((error: Error) => { console.error(error.message); process.exitCode = 1; });
