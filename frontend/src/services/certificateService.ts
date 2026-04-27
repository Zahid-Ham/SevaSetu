import axios from 'axios';
import { API_BASE_URL } from '../config/apiConfig';
import { Linking, Platform, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export interface Badge {
  id: string;
  label: { en: string; hi: string };
  icon: string;
  description: { en: string; hi: string };
  is_earned: boolean;
}

export interface Certificate {
  id: string;
  volunteer_id: string;
  volunteer_name: string;
  ngo_name: string;
  tier: string;
  tier_label: { en: string; hi: string };
  issue_date: string;
  description: { en: string; hi: string };
  pdf_url: string;
  pdf_url_en: string;
  pdf_url_hi: string;
  volunteer_name_hi?: string;
}

export interface RecognitionResponse {
  success: boolean;
  certificates: Certificate[];
  badges: Badge[];
  next_tier: {
    tier: string;
    label: { en: string; hi: string };
    current: number;
    threshold: number;
    remaining: number;
  } | null;
  stats: {
    total_reports: number;
  };
}

export const certificateService = {
  getRecognition: async (volunteerId: string): Promise<RecognitionResponse> => {
    const response = await axios.get(`${API_BASE_URL}/certificates/volunteer/${volunteerId}`);
    return response.data;
  },

  viewCertificate: (url: string) => {
    const fullUrl = url.startsWith('/') ? `${API_BASE_URL}${url}` : url;
    Linking.openURL(fullUrl);
  },

  downloadCertificate: async (url: string, filename: string) => {
    const fullUrl = url.startsWith('/') ? `${API_BASE_URL}${url}` : url;
    
    try {
      const fileUri = `${FileSystem.documentDirectory}${filename}.pdf`;
      
      const downloadRes = await FileSystem.downloadAsync(fullUrl, fileUri);
      
      if (downloadRes.status === 200) {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(downloadRes.uri);
        } else {
          Alert.alert("Success", "Certificate downloaded to app storage.");
        }
      } else {
        throw new Error("Download failed");
      }
    } catch (err) {
      console.error("Download Error:", err);
      Alert.alert("Error", "Failed to download certificate.");
    }
  },

  checkEligibility: async (volunteerId: string) => {
    const response = await axios.post(`${API_BASE_URL}/certificates/check-eligibility/${volunteerId}`);
    return response.data;
  },

  verifyCertificate: async (certificateId: string) => {
    const response = await axios.get(`${API_BASE_URL}/certificates/verify/${certificateId}`);
    return response.data;
  },

  regenerateCertificate: async (certificateId: string) => {
    const response = await axios.post(`${API_BASE_URL}/certificates/regenerate/${certificateId}`);
    return response.data;
  }
};

