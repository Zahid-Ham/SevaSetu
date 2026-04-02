/**
 * Cloudinary Upload Service for SevaSetu Chat
 * Uses Unsigned Upload Preset — no API secret needed in the app.
 * 
 * Cloud Name: db6yazxck
 * Upload Preset: sevasetu_chat (Unsigned)
 */

const CLOUDINARY_CLOUD_NAME = 'db6yazxck';
const CLOUDINARY_UPLOAD_PRESET = 'sevasetu_chat';
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`;

export type UploadResult = {
  url: string;
  publicId: string;
  resourceType: 'image' | 'video' | 'raw'; // raw = PDFs and other documents
  format: string;
  bytes: number;
  version?: string;  // Added
};

/**
 * Uploads a file to Cloudinary using an unsigned upload preset.
 * Works with images (jpg, png, gif) and documents (pdf).
 * 
 * @param fileUri - Local URI from expo-image-picker or expo-document-picker
 * @param fileType - MIME type e.g. 'image/jpeg', 'application/pdf'
 * @param fileName - Optional filename for display
 */
export async function uploadToCloudinary(
  fileUri: string,
  fileType: string,
  fileName: string = 'upload',
): Promise<UploadResult> {
  // Use 'auto' for images/videos — direct unsigned upload works fine.
  // PDFs must go through the backend (signed upload) — use uploadPdfViaBackend() instead.
  const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`;

  const formData = new FormData();
  formData.append('file', {
    uri: fileUri,
    type: fileType,
    name: fileName,
  } as any);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder', 'sevasetu/chat');
  // NOTE: Do NOT add access_mode here — it's NOT allowed for unsigned uploads.
  // access_mode is set on the backend for signed (PDF) uploads.

  const response = await fetch(uploadUrl, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('[Cloudinary Direct Upload Error]', data);
    throw new Error(data.error?.message || `Upload failed (${response.status})`);
  }

  console.log('[Cloudinary Upload Success]', data.secure_url);

  return {
    url: data.secure_url,
    publicId: data.public_id,
    resourceType: data.resource_type,
    format: data.format,
    bytes: data.bytes,
    version: data.version ? String(data.version) : undefined,
  };
}

/**
 * Upload a PDF via the SevaSetu backend.
 * The backend uses a SIGNED Cloudinary upload with access_mode=public,
 * bypassing the unsigned upload restriction on free Cloudinary accounts.
 */
export async function uploadPdfViaBackend(
  fileUri: string,
  fileName: string,
  fileType: string,
  apiBaseUrl: string,
): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('file', {
    uri: fileUri,
    type: fileType,
    name: fileName,
  } as any);

  const response = await fetch(`${apiBaseUrl}/chat/upload-file`, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('[Backend PDF Upload Error]', data);
    throw new Error(data.detail || `Upload failed (${response.status})`);
  }

  console.log('[Backend PDF Upload Success]', data.url);

  return {
    url: data.url,
    publicId: data.public_id,
    resourceType: 'raw',
    format: data.format || 'pdf',
    bytes: data.bytes || 0,
    version: data.version ? String(data.version) : undefined,
  };
}

/**
 * Helper: format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
