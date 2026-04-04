export interface User {
  id: string;
  name: string;
  email: string;
  role: 'CITIZEN' | 'VOLUNTEER' | 'SUPERVISOR';
  ngo_id?: string;
  ngo_name?: string;
  avatar?: string;
}

export const MOCK_USERS: User[] = [
  // --- CITIZENS ---
  { id: 'cit_001', name: 'Zahid Khan', email: 'zahid@example.com', role: 'CITIZEN' },
  { id: 'cit_002', name: 'Priya Sharma', email: 'priya@example.com', role: 'CITIZEN' },
  { id: 'cit_003', name: 'Ajay Verma', email: 'ajay@example.com', role: 'CITIZEN' },
  { id: 'cit_004', name: 'Sneha Reddy', email: 'sneha@example.com', role: 'CITIZEN' },
  { id: 'cit_005', name: 'Rohan Malhotra', email: 'rohan@example.com', role: 'CITIZEN' },

  // --- VOLUNTEERS ---
  { id: 'vol_001', name: 'Anita Sharma', email: 'anita@volunteer.com', role: 'VOLUNTEER', ngo_id: 'ngo_helping_hands', ngo_name: 'Helping Hands Foundation' },
  { id: 'vol_002', name: 'Rahul Gupta', email: 'rahul@volunteer.com', role: 'VOLUNTEER', ngo_id: 'ngo_helping_hands', ngo_name: 'Helping Hands Foundation' },
  { id: 'vol_003', name: 'Sameer Khan', email: 'sameer@volunteer.com', role: 'VOLUNTEER', ngo_id: 'ngo_sevabharti', ngo_name: 'Seva Bharti' },
  { id: 'vol_004', name: 'Meera Jain', email: 'meera@volunteer.com', role: 'VOLUNTEER', ngo_id: 'ngo_goonj', ngo_name: 'Goonj Disaster Relief' },
  { id: 'vol_005', name: 'Vikram Singh', email: 'vikram@volunteer.com', role: 'VOLUNTEER', ngo_id: 'ngo_sevabharti', ngo_name: 'Seva Bharti' },

  // --- SUPERVISORS ---
  { id: 'sup_deepak_1', name: 'Deepak Chawla', email: 'deepak@ngo.com', role: 'SUPERVISOR', ngo_id: 'ngo_helping_hands', ngo_name: 'Helping Hands Foundation' },
  { id: 'sup_002', name: 'Dr. Arvinder Singh', email: 'arvinder@ngo.com', role: 'SUPERVISOR', ngo_id: 'ngo_sevabharti', ngo_name: 'Seva Bharti' },
  { id: 'sup_003', name: 'Meenakshi Iyer', email: 'meenakshi@ngo.com', role: 'SUPERVISOR', ngo_id: 'ngo_goonj', ngo_name: 'Goonj Disaster Relief' },
  { id: 'sup_004', name: 'Sanjay Dutt', email: 'sanjay@ngo.com', role: 'SUPERVISOR', ngo_id: 'ngo_helping_hands', ngo_name: 'Helping Hands Foundation' },
  { id: 'sup_005', name: 'Rita Pereira', email: 'rita@ngo.com', role: 'SUPERVISOR', ngo_id: 'ngo_sevabharti', ngo_name: 'Seva Bharti' }
];

export const MOCK_PASSWORD = 'password123';
