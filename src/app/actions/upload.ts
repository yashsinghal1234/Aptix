"use server";

import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { cookies } from "next/headers";

function isAuthorized() {
  const role = cookies().get("userRole")?.value;
  return role === "OWNER" || role === "SETTER";
}

export async function uploadImageAction(formData: FormData) {
  if (!isAuthorized()) return { error: "Unauthorized" };

  const file = formData.get("image") as File;
  if (!file) {
    return { error: "No file uploaded" };
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Use a unique name to avoid collisions
  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const filename = `${uniqueSuffix}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
  
  const uploadDir = join(process.cwd(), "public/uploads");

  try {
    // Ensure the directory exists
    await mkdir(uploadDir, { recursive: true });
    
    const filePath = join(uploadDir, filename);
    await writeFile(filePath, buffer);
    
    // Return the public URL path
    return { success: true, url: `/uploads/${filename}` };
  } catch (e) {
    console.error("Error uploading file:", e);
    return { error: "Failed to upload file" };
  }
}
