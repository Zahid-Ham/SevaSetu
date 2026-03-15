# SevaSetu 🇮🇳

**SevaSetu** is a premium community empowerment platform designed to connect **Citizens**, **Volunteers**, and **NGO Supervisors** to solve local problems efficiently. Built with React Native and Expo, it features a modern, accessible interface with deep cultural integration through an Indian tricolor theme and localized Hindi support.

## 🚀 Key Features

- **Interactive Presentation Onboarding**: A "story-telling" introduction with automatic Hindi voice narration and tricolor slide transitions.
- **Role-Based Workflows**: Tailored experiences for three distinct user types:
  - **Citizen**: Report issues, track progress, and request help.
  - **Volunteer**: Discover local missions and contribute to community welfare.
  - **NGO Supervisor**: Manage missions, track impact, and coordinate resources.
- **Premium Aesthetics**: High-quality visual design inspired by national themes, featuring smooth animations and glassmorphism.
- **Voice Accessibility**: Natural-sounding Hindi speech assistance (`hi-IN`) to guide users through the journey.
- **Smart Navigation**: Persistent onboarding state and intuitive role-selection flow.

## 🛠️ Tech Stack

- **Framework**: React Native with Expo (SDK 54)
- **State Management**: Zustand
- **Navigation**: React Navigation (Stack & Tabs)
- **Styling**: Vanilla CSS-in-JS (StyleSheet)
- **Icons**: Expo Vector Icons (Ionicons)
- **Narration**: Expo Speech
- **Visuals**: Expo Linear Gradient

## 📦 Installation

To get started with SevaSetu locally, follow these steps:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/SevaSetu.git
   cd SevaSetu
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npx expo start
   ```

## 📱 Running the App

- **Android**: Press `a` in the terminal or use the Expo Go app.
- **iOS**: Press `i` in the terminal or use the Expo Go app.
- **Web**: Press `w` in the terminal.

## 📁 Project Structure

```text
src/
├── assets/       # Images, Logos, and Local Resources
├── components/   # Reusable UI components (Common, Cards, etc.)
├── constants/    # App constants and Slide data
├── navigation/   # Root, Auth, and Role-specific navigators
├── screens/      # Feature screens (Auth, Onboarding, Dashboard, etc.)
├── services/     # API, Mock data, and Zustand store
├── theme/        # Global styles and Color tokens
└── utils/        # Helper functions
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

Made with ❤️ in India. **SevaSetu** — *Connecting Communities. Empowering Change.*
