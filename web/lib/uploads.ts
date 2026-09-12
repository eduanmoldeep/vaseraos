import { getEnv, uid } from "./cloudflare";

const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;

/** Stores a receipt in R2 under `receipts/{societyId}/...` and returns its key, or undefined if no file/binding. */
export async function storeReceipt(societyId: string, file: File | null): Promise<string | undefined> {
  if (!file || file.size === 0) return undefined;
  if (file.size > MAX_RECEIPT_BYTES) throw new Error("File too large (max 10MB).");
  const env = await getEnv();
  if (!env?.UPLOADS) return undefined;
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80) || "receipt";
  const key = `receipts/${societyId}/${uid("r")}-${safeName}`;
  await env.UPLOADS.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type || "application/octet-stream" },
  });
  return key;
}
