export type DeliveryRequest = { image: string; filename: string; width: number; height: number };

export function shouldCompress(input: DeliveryRequest): boolean {
  return input.width > 1600 || input.height > 1600 || input.filename.toLowerCase().endsWith(".png");
}

export function objectKey(input: DeliveryRequest): string {
  return `optimized/${input.filename.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
}
