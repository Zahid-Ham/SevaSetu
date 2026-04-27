import * as FileSystem from 'expo-file-system';
import { BASE_URL } from './eventPredictionService';

/**
 * UploadService.ts
 * Utility to handle file uploads (images, videos, documents) to the backend.
 */

export const uploadMediaFile = async (fileUri: string, fileName: string, mimeType: string): Promise<string | null> => {
  try {
    console.log(`[UploadService] Uploading ${fileName} (${mimeType}) from ${fileUri}`);

    console.log(`[UploadService] Uploading ${fileName} (${mimeType}) from ${fileUri}`);
    const uploadResult = await FileSystem.uploadAsync(`${BASE_URL}/field-report/process-item`, fileUri, {
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: 'file',
      parameters: {
        type: mimeType.startsWith('image/') ? 'image' : 
              mimeType.startsWith('video/') ? 'video' : 
              mimeType.startsWith('audio/') ? 'audio' : 
              mimeType === 'application/pdf' ? 'pdf' : 'note',
        note: `Volunteer Proof: ${fileName}`,
      },
    });

    if (uploadResult.status === 200) {
      const data = JSON.parse(uploadResult.body);
      if (data.success && data.url) {
        console.log(`[UploadService] ✅ Upload successful: ${data.url}`);
        return data.url;
      }
    }

    console.error(`[UploadService] ❌ Upload failed with status ${uploadResult.status}:`, uploadResult.body);
    return null;
  } catch (error) {
    console.error('[UploadService] ❌ Upload error:', error);
    return null;
  }
};

export const uploadGenericFile = async (fileUri: string, fileName: string, mimeType: string): Promise<string | null> => {
  try {
     const response = await FileSystem.uploadAsync(`${BASE_URL}/upload-media`, fileUri, {
       httpMethod: 'POST',
       uploadType: FileSystem.FileSystemUploadType.MULTIPART,
       fieldName: 'file',
     });

     if (response.status === 200) {
       const data = JSON.parse(response.body);
       return data.url;
     }
     return null;
  } catch (error) {
    console.error('[UploadService] uploadGenericFile error:', error);
    return null;
  }
};
