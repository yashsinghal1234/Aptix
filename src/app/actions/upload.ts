"use server";

import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

async function isAuthorized() {
  const token = cookies().get("token")?.value;
  if (!token) return false;
  const payload = await verifyToken(token);
  return payload?.role === "OWNER" || payload?.role === "SETTER";
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
    const mimeType = file.type || "image/png";
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${mimeType};base64,${base64}`;

    return { success: true, url: dataUrl };
  } catch (e) {
    console.error("Error processing image upload:", e);
    return { error: "Failed to process uploaded image" };
  }
}
