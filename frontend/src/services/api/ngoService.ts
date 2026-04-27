import axios from 'axios';
import { API_BASE_URL } from '../../config/apiConfig';

const API_URL = API_BASE_URL;

export interface NGO {
  id: string;
  name: string;
  city: string;
  supervisor_id: string;
}

export interface VolunteerRequest {
  id: string;
  citizen_id: string;
  citizen_name: string;
  ngo_id: string;
  ngo_name: string;
  motivation: string;
  skills: string[];
  area: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: string;
}

export const fetchNGOs = async (): Promise<NGO[]> => {
  const response = await axios.get(`${API_URL}/ngos`);
  return response.data;
};

export const fetchUserRequest = async (citizenId: string): Promise<VolunteerRequest | null> => {
  const response = await axios.get(`${API_URL}/volunteer-requests/user/${citizenId}`);
  // If the backend returns an empty object {} if no request is found
  if (response.data && response.data.id) {
    return response.data;
  }
  return null;
};

export const submitVolunteerRequest = async (request: Omit<VolunteerRequest, 'id' | 'status' | 'created_at'>): Promise<any> => {
  const response = await axios.post(`${API_URL}/volunteer-requests`, request);
  return response.data;
};

export const fetchPendingRequests = async (ngoId: string): Promise<VolunteerRequest[]> => {
  const response = await axios.get(`${API_URL}/volunteer-requests/${ngoId}`);
  return response.data;
};

export const reviewVolunteerRequest = async (requestId: string, status: 'APPROVED' | 'REJECTED', supervisorId: string): Promise<any> => {
  const response = await axios.post(`${API_URL}/volunteer-requests/${requestId}/review`, {
    status,
    supervisor_id: supervisorId
  });
  return response.data;
};
export const fetchVolunteersByNgo = async (ngoId: string): Promise<any[]> => {
  const response = await axios.get(`${API_URL}/ngos/${ngoId}/volunteers`);
  return response.data;
};
