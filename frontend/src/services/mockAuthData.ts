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
  { id: 'vol_rahul_01', name: 'Rahul Gupta', email: 'rahul@volunteer.com', role: 'VOLUNTEER', ngo_id: 'ngo_helping_hands', ngo_name: 'Helping Hands Foundation' },
  { id: 'vol_zara_02', name: 'Zara Sheikh', email: 'zara@volunteer.com', role: 'VOLUNTEER', ngo_id: 'ngo_helping_hands', ngo_name: 'Helping Hands Foundation' },
  { id: 'vol_kavya_03', name: 'Kavya Iyer', email: 'kavya@volunteer.com', role: 'VOLUNTEER', ngo_id: 'ngo_helping_hands', ngo_name: 'Helping Hands Foundation' },
  { id: 'vol_mithali_04', name: 'Mithali Raj', email: 'mithali@volunteer.com', role: 'VOLUNTEER', ngo_id: 'ngo_helping_hands', ngo_name: 'Helping Hands Foundation' },
  { id: 'vol_sameer_05', name: 'Sameer Khan', email: 'sameer@volunteer.com', role: 'VOLUNTEER', ngo_id: 'ngo_sevabharti', ngo_name: 'Seva Bharti' },

  // --- SUPERVISORS ---
  { id: 'sup_deepak_1', name: 'Deepak Chawla', email: 'deepak@ngo.com', role: 'SUPERVISOR', ngo_id: 'ngo_helping_hands', ngo_name: 'Helping Hands Foundation' },
  { id: 'sup_arvinder_2', name: 'Dr. Arvinder Singh', email: 'arvinder@ngo.com', role: 'SUPERVISOR', ngo_id: 'ngo_sevabharti', ngo_name: 'Seva Bharti' },
];

export const MOCK_PASSWORD = 'password123';
