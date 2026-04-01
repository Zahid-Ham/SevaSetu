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
};

/**
 * Uploads a file to Cloudinary using an unsigned upload preset.
 * Works with images (jpg, png, gif) and documents (pdf).
 * 
 * @param fileUri - Local URI from expo-image-picker or expo-document-picker
 * @param fileType - MIME type e.g. 'image/jpeg', 'application/pdf'
 * @param fileName - Optional filename for display
 * @param onProgress - Optional progress callback (0–100)
 */
export async function uploadToCloudinary(
  fileUri: string,
  fileType: string,
  fileName: string = 'upload',
  onProgress?: (percent: number) => void
): Promise<UploadResult> {
  // Determine Cloudinary resource_type based on mime type
  let resourceType: 'image' | 'video' | 'raw' = 'image';
  if (fileType === 'application/pdf' || fileType.startsWith('application/')) {
    resourceType = 'raw';
  } else if (fileType.startsWith('video/')) {
    resourceType = 'video';
  }

  const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;

  const formData = new FormData();
  formData.append('file', {
    uri: fileUri,
    type: fileType,
    name: fileName,
  } as any);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder', 'sevasetu/chat'); // Organise uploads in a folder

  try {
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Upload failed');
    }

    const data = await response.json();

    return {
      url: data.secure_url,
      publicId: data.public_id,
      resourceType: data.resource_type,
      format: data.format,
      bytes: data.bytes,
    };
  } catch (error: any) {
    console.error('[Cloudinary Upload Error]', error);
    throw new Error(error.message || 'Failed to upload file');
  }
}

/**
 * Helper: format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
