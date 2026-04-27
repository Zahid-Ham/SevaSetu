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

export interface LearningResource {
  id: string;
  title: string | { en: string; hi: string };
  category: string | { en: string; hi: string };
  duration: string | { en: string; hi: string };
  type: 'Article' | 'Video' | 'Tutorial';
  link: string;
  thumbnail?: string;
  isRequired?: boolean;
}

export const MOCK_LEARNING_RESOURCES: LearningResource[] = [
  {
    id: 'lr-1',
    title: { 
      en: 'Volunteer Code of Conduct', 
      hi: 'स्वयंसेवक आचार संहिता' 
    },
    category: { en: 'Module 1', hi: 'मॉड्यूल 1' },
    duration: { en: '15 mins read', hi: '15 मिनट का पाठ' },
    type: 'Article',
    link: 'https://www.unv.org/volunteer-code-conduct',
    isRequired: true
  },
  {
    id: 'lr-2',
    title: { 
      en: 'Privacy & Data Guidelines', 
      hi: 'गोपनीयता और डेटा दिशानिर्देश' 
    },
    category: { en: 'Module 2', hi: 'मॉड्यूल 2' },
    duration: { en: '20 mins read', hi: '20 मिनट का पाठ' },
    type: 'Article',
    link: 'https://www.privacy.gov.ph/wp-content/uploads/2018/11/Data-Privacy-for-NGOs-compressed.pdf',
    isRequired: true
  },
  {
    id: 'lr-3',
    title: { 
      en: 'Handling Emergency Situations', 
      hi: 'आपातकालीन स्थितियों को संभालना' 
    },
    category: { en: 'Video Guide', hi: 'वीडियो गाइड' },
    duration: { en: '10 mins video', hi: '10 मिनट का वीडियो' },
    type: 'Video',
    link: 'https://www.youtube.com/watch?v=0aVPHMG5I9U',
    isRequired: false
  },
  {
    id: 'lr-4',
    title: { 
      en: 'Using the SevaSetu App', 
      hi: 'सेवासेतु ऐप का उपयोग करना' 
    },
    category: { en: 'Interactive Tutorial', hi: 'इंटरएक्टिव ट्यूटोरियल' },
    duration: { en: '5 mins read', hi: '5 मिनट का पाठ' },
    type: 'Article',
    link: 'https://docs.expo.dev/',
    isRequired: false
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
