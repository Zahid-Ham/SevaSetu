import { Issue } from '../../components/maps/CrisisMap';

export interface Mission {
  id: string;
  title: string;
  description: string;
  location: string;
  urgency: 'Low' | 'Medium' | 'High';
  latitude: number;
  longitude: number;
}

export const MOCK_ISSUES: Issue[] = [
  {
    id: 'iss-1',
    title: 'Water Pipeline Burst',
    description: 'Main pipeline burst causing water shortage and acute flooding on Sector 14 road.',
    priority: 'urgent',
    latitude: 28.6250,
    longitude: 77.2050,
  },
  {
    id: 'iss-2',
    title: 'Food Supply Shortage',
    description: 'Local shelter in Block C is running critically low on grain supplies.',
    priority: 'medium',
    latitude: 28.6120,
    longitude: 77.2180,
  },
  {
    id: 'iss-3',
    title: 'Medical Assistance Required',
    description: 'Elderly resident needs urgent prescribed medication delivery.',
    priority: 'urgent',
    latitude: 28.6180,
    longitude: 77.2110,
  },
  {
    id: 'iss-4',
    title: 'Pothole Fixed',
    description: 'The large pothole near the central market has been patched.',
    priority: 'resolved',
    latitude: 28.6150,
    longitude: 77.2000,
  },
  {
    id: 'iss-5',
    title: 'School Stationary Drive',
    description: 'Need volunteers to help distribute books at the primary school.',
    priority: 'medium',
    latitude: 28.6300,
    longitude: 77.2200,
  }
];

export const MOCK_MISSIONS: Mission[] = [
  {
    id: 'mis-1',
    title: 'Emergency: Water Logging Clearance',
    description: 'Assist municipal workers in clearing clogged drains on MG Road.',
    location: 'MG Road, near Metro',
    urgency: 'High',
    latitude: 28.6250,
    longitude: 77.2050,
  },
  {
    id: 'mis-2',
    title: 'Food Distribution Drive',
    description: 'Help distribute 500 meal packets to the displaced families at the shelter.',
    location: 'Sector 15 Community Hall',
    urgency: 'High',
    latitude: 28.6120,
    longitude: 77.2180,
  },
  {
    id: 'mis-3',
    title: 'Elderly Assistance Check',
    description: 'Weekly check-in for registered elderly citizens.',
    location: 'Ashok Vihar Phase 2',
    urgency: 'Medium',
    latitude: 28.6180,
    longitude: 77.2110,
  },
  {
    id: 'mis-4',
    title: 'Completed: Evening School Tutoring',
    description: 'Volunteer to teach basic mathematics to underprivileged children.',
    location: 'Block B Slum Area',
    urgency: 'Low',
    latitude: 28.6150,
    longitude: 77.2000,
  }
];

export const MOCK_STATS = {
  activeVolunteers: 124,
  openMissions: 28,
  issuesReported: 312,
  totalImpactHours: '12.4k',
};

export const MOCK_CITIZEN_STATS = {
  issuesReported: 4,
  helpRequests: 1,
};

export const MOCK_VOLUNTEER_STATS = {
  hoursLogged: 42,
  tasksCompleted: 15,
};
