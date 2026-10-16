"use server";

import { requireAuth } from "@/lib/auth";

async function isAuthorized() {
  const auth = await requireAuth(["OWNER", "SETTER"]);
  return !("error" in auth);
}

function detectImageMimeType(buffer: Buffer): string | null {
  // Check magic bytes for allowed raster formats
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return "image/png";
  }
  // JPEG: FF D8 FF
  if (buffer.length >= 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return "image/jpeg";
  }
  // WebP: RIFF ... WEBP
  if (buffer.length >= 12 &&
      buffer.toString("ascii", 0, 4) === "RIFF" &&
      buffer.toString("ascii", 8, 12) === "WEBP") {
    return "image/webp";
  }
  // GIF: GIF87a or GIF89a
  if (buffer.length >= 6 && buffer.toString("ascii", 0, 3) === "GIF") {
    return "image/gif";
  }
  return null;
}

export async function uploadImageAction(formData: FormData) {
  if (!(await isAuthorized())) return { error: "Unauthorized" };

  const file = formData.get("image") as File;
  if (!file || file.size === 0) {
    return { error: "No file uploaded" };
  }

  if (file.size > 5 * 1024 * 1024) {
    return { error: "Image file exceeds 5MB limit. Please upload a smaller image." };
  }

  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Verify true binary format via magic bytes — strictly reject SVG, HTML, or executable payloads
    const detectedMime = detectImageMimeType(buffer);
    if (!detectedMime) {
      return { error: "Invalid file type. Only standard raster images (PNG, JPEG, WebP, GIF) are allowed. SVGs and scripts are prohibited." };
    }

    const base64 = buffer.toString("base64");
    const dataUrl = `data:${detectedMime};base64,${base64}`;

    return { success: true, url: dataUrl };
  } catch (e) {
    console.error("Error processing image upload:", e);
    return { error: "Failed to process uploaded image" };
  }
}
