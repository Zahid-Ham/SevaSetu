export interface OnboardingSlide {
  id: string;
  title: string;
  description: string;
  image: any; // Using require() results
  hindiNarration: string;
}

export const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    id: '1',
    title: 'समाज की समस्याएं अक्सर अनसुनी रह जाती हैं',
    description: 'सामुदायिक मुद्दे कागजी फॉर्मों, व्हाट्सएप संदेशों और अलग-अलग रिपोर्टों में बिखरे हुए हैं।',
    image: require('../assets/images/ngo_data_problem.png'),
    hindiNarration: 'समाज की कई समस्याएं समय पर सामने नहीं आ पातीं।',
  },
  {
    id: '2',
    title: 'समुदाय रोज़ाना संघर्ष करते हैं',
    description: 'कई समुदायों को पानी की किल्लत, चिकित्सा आपात स्थिति और बुनियादी सेवाओं की कमी का सामना करना पड़ता है।',
    image: require('../assets/images/community_problem.png'),
    hindiNarration: 'कई गांव और बस्तियां आज भी बुनियादी सुविधाओं से जूझ रही हैं।',
  },
  {
    id: '3',
    title: 'स्वयंसेवक मदद करना चाहते हैं',
    description: 'स्वयंसेवक मदद के लिए तैयार हैं, लेकिन समन्वय और जानकारी की कमी इसे मुश्किल बना देती है।',
    image: require('../assets/images/volunteer_coordination.png'),
    hindiNarration: 'मदद करने वाले लोग हैं, लेकिन सही जगह तक पहुंचना मुश्किल है।',
  },
  {
    id: '4',
    title: 'सेवा सेतु सबको जोड़ता है',
    description: 'सेवा सेतु नागरिकों, स्वयंसेवकों और गैर सरकारी संगठनों को एक साथ लाकर समस्याओं का समाधान करता है।',
    image: require('../assets/images/sevasetu_solution.png'),
    hindiNarration: 'सेवा सेतु लोगों को जोड़ता है और मदद को सही जगह तक पहुंचाता है।',
  },
];
