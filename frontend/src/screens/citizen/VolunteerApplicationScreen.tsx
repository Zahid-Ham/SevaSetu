import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { colors, spacing, typography, globalStyles } from '../../theme';
import { AppHeader, PrimaryButton, GradientBackground } from '../../components';
import { useNgoStore } from '../../services/store/useNgoStore';
import { useAuthStore } from '../../services/store/useAuthStore';
import { LinearGradient } from 'expo-linear-gradient';

const ALL_SKILLS = [
  { id: 'first_aid', label: 'First Aid', icon: '🩺' },
  { id: 'medical', label: 'Medical', icon: '💊' },
  { id: 'logistics', label: 'Logistics', icon: '📦' },
  { id: 'driving', label: 'Driving', icon: '🚗' },
  { id: 'teaching', label: 'Teaching', icon: '📚' },
  { id: 'cooking', label: 'Cooking', icon: '🍳' },
  { id: 'documentation', label: 'Documentation', icon: '📝' },
];

export const VolunteerApplicationScreen = () => {
  const navigation = useNavigation<any>();
  const { ngos, loadNgos, submitRequest, loading, userRequest, loadUserRequest } = useNgoStore();
  const { role, user, setRole } = useAuthStore();

  const [selectedNgo, setSelectedNgo] = useState<any>(null);
  const [motivation, setMotivation] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [area, setArea] = useState('');
  const [gpsCoordinates, setGpsCoordinates] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [showNgoSelector, setShowNgoSelector] = useState(false);

  useEffect(() => {
    loadNgos();
    if (user?.id) {
      loadUserRequest(user.id);
    }
    handleGetLocation();
  }, []);

  const handleGetLocation = async () => {
    setIsLocating(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please enable location permissions to auto-detect your area.');
        setIsLocating(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      setGpsCoordinates(`${loc.coords.latitude.toFixed(4)}, ${loc.coords.longitude.toFixed(4)}`);

      const geocode = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      if (geocode && geocode.length > 0) {
        const address = geocode[0];
        const addressString = [
          address.district, 
          address.city, 
          address.region
        ].filter(Boolean).join(', ');
        setArea(addressString);
      }
    } catch (err) {
      console.log('Location detection failed', err);
    } finally {
      setIsLocating(false);
    }
  };

  const toggleSkill = (skillId: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skillId) ? prev.filter((s) => s !== skillId) : [...prev, skillId]
    );
  };

  const handleSubmit = async () => {
    if (!selectedNgo || !motivation || selectedSkills.length === 0 || !area) {
      Alert.alert('Incomplete Form', 'Please fill in all fields before submitting.');
      return;
    }

    try {
      await submitRequest({
        citizen_id: user?.id || 'temp_id',
        citizen_name: user?.name || 'Anonymous', 
        ngo_id: selectedNgo.id,
        ngo_name: selectedNgo.name,
        motivation,
        skills: selectedSkills,
        area,
        gps_coordinates: gpsCoordinates,
      });
      // Refresh the local request state
      if (user?.id) loadUserRequest(user.id);
      Alert.alert(
        'Application Submitted!',
        'Your request has been sent to the NGO Supervisor. You will be notified once they review it.',
        [{ text: 'Great' }]
      );
    } catch (err) {
      Alert.alert('Error', 'Failed to submit application. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Become a Volunteer" />
      <GradientBackground style={{ flex: 1 }}>
        {userRequest ? (
          <View style={styles.statusContainer}>
            <View style={[globalStyles.card, styles.statusCard]}>
              <View style={[styles.statusIconWrap, { backgroundColor: getStatusColor(userRequest.status) + '15' }]}>
                <Feather 
                  name={getStatusIcon(userRequest.status)} 
                  size={48} 
                  color={getStatusColor(userRequest.status)} 
                />
              </View>
              <Text style={styles.statusTitle}>Application {userRequest.status.toLowerCase()}</Text>
              <Text style={styles.statusNgo}>{userRequest.ngo_name}</Text>
              
              <View style={styles.statusDivider} />
              
              {userRequest.status === 'PENDING' && (
                <Text style={styles.statusDesc}>
                  Your application is currently being reviewed by the NGO supervisor. 
                  Typically this takes 24-48 hours.
                </Text>
              )}

              {userRequest.status === 'APPROVED' && (
                <>
                  <Text style={[styles.statusDesc, { color: colors.success }]}>
                    Congratulations! You are now a verified volunteer for {userRequest.ngo_name}. 
                    You can now access missions and coordinate with your supervisor.
                  </Text>
                  <PrimaryButton 
                    title="Start Volunteering" 
                    onPress={() => setRole('VOLUNTEER')} 
                    style={{ marginTop: spacing.lg }} 
                  />
                </>
              )}

              {userRequest.status === 'REJECTED' && (
                <>
                  <Text style={[styles.statusDesc, { color: colors.error }]}>
                    Unfortunately, your application was not accepted at this time. 
                    You can try applying to a different NGO.
                  </Text>
                  <PrimaryButton 
                    title="Apply Elsewhere" 
                    onPress={() => navigation.goBack()} 
                    style={{ marginTop: spacing.lg }} 
                  />
                </>
              )}
            </View>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Progress Header */}
          <View style={styles.progressHeader}>
            <View style={styles.stepContainer}>
              <View style={[styles.stepCircle, styles.activeStep]}>
                <Text style={styles.stepNumber}>1</Text>
              </View>
              <Text style={styles.stepText}>Choose NGO</Text>
            </View>
            <View style={styles.stepDivider} />
            <View style={styles.stepContainer}>
              <View style={styles.stepCircle}>
                <Text style={styles.stepNumber}>2</Text>
              </View>
              <Text style={styles.stepText}>Approval</Text>
            </View>
          </View>

          {/* Form Card */}
          <View style={[globalStyles.card, styles.formCard]}>
            <Text style={styles.sectionTitle}>Select NGO</Text>
            <TouchableOpacity
              style={styles.dropdownHeader}
              onPress={() => setShowNgoSelector(!showNgoSelector)}
            >
              <View style={styles.ngoInfo}>
                <Feather name="home" size={18} color={selectedNgo ? colors.primaryGreen : colors.textSecondary} />
                <Text style={[styles.dropdownText, !selectedNgo && { color: colors.textSecondary + '80' }]}>
                  {selectedNgo ? selectedNgo.name : 'Select the NGO you want to join'}
                </Text>
              </View>
              <Ionicons name={showNgoSelector ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            {showNgoSelector && (
              <View style={styles.ngoList}>
                {ngos.map((ngo) => (
                  <TouchableOpacity
                    key={ngo.id}
                    style={[styles.ngoOption, selectedNgo?.id === ngo.id && styles.ngoOptionSelected]}
                    onPress={() => {
                      setSelectedNgo(ngo);
                      setShowNgoSelector(false);
                    }}
                  >
                    <View>
                      <Text style={[styles.ngoName, selectedNgo?.id === ngo.id && styles.ngoTextSelected]}>
                        {ngo.name}
                      </Text>
                      <Text style={styles.ngoCity}>{ngo.city}</Text>
                    </View>
                    {selectedNgo?.id === ngo.id && <Ionicons name="checkmark-circle" size={20} color={colors.primaryGreen} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={styles.sectionTitle}>Why do you want to join?</Text>
            <View style={styles.textAreaContainer}>
              <TextInput
                style={styles.textArea}
                multiline
                numberOfLines={4}
                placeholder="Briefly describe your motivation and past experience..."
                placeholderTextColor={colors.textSecondary + '80'}
                value={motivation}
                onChangeText={setMotivation}
              />
            </View>

            <Text style={styles.sectionTitle}>Your Area</Text>
            <View style={styles.inputContainer}>
              <Feather name="map-pin" size={18} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder={isLocating ? "Detecting location..." : "e.g. South Delhi, Rohini"}
                placeholderTextColor={colors.textSecondary + '80'}
                value={area}
                onChangeText={setArea}
              />
              {isLocating ? (
                <ActivityIndicator size="small" color={colors.primaryGreen} />
              ) : (
                <TouchableOpacity onPress={handleGetLocation}>
                  <Feather name="refresh-cw" size={16} color={colors.primaryGreen} />
                </TouchableOpacity>
              )}
            </View>
            {gpsCoordinates ? (
              <Text style={styles.gpsText}>GPS: {gpsCoordinates}</Text>
            ) : null}

            <Text style={styles.sectionTitle}>Select Your Skills</Text>
            <View style={styles.skillsGrid}>
              {ALL_SKILLS.map((skill) => {
                const isSelected = selectedSkills.includes(skill.id);
                return (
                  <TouchableOpacity
                    key={skill.id}
                    style={[styles.skillChip, isSelected && styles.skillChipSelected]}
                    onPress={() => toggleSkill(skill.id)}
                  >
                    {isSelected ? (
                      <LinearGradient
                        colors={[colors.primaryGreen, colors.primaryGreen + 'CC']}
                        style={styles.skillGradient}
                      >
                        <Text style={styles.skillEmoji}>{skill.icon}</Text>
                        <Text style={styles.skillTextActive}>{skill.label}</Text>
                      </LinearGradient>
                    ) : (
                      <>
                        <Text style={styles.skillEmoji}>{skill.icon}</Text>
                        <Text style={styles.skillText}>{skill.label}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <PrimaryButton
              title={loading ? 'Submitting...' : 'Submit Application'}
              onPress={handleSubmit}
              style={styles.submitBtn}
              disabled={loading}
            />
          </View>
        </ScrollView>
        )}
      </GradientBackground>
    </View>
  );
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'APPROVED': return colors.success;
    case 'REJECTED': return colors.error;
    default: return colors.primarySaffron;
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'APPROVED': return 'check-circle';
    case 'REJECTED': return 'x-circle';
    default: return 'clock';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  stepContainer: {
    alignItems: 'center',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  activeStep: {
    borderColor: colors.cardBackground,
    backgroundColor: colors.cardBackground,
  },
  stepNumber: {
    ...typography.captionText,
    fontWeight: '700',
    color: colors.primarySaffron,
  },
  stepText: {
    ...typography.captionText,
    color: colors.cardBackground,
    marginTop: 4,
    fontWeight: '600',
  },
  stepDivider: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: spacing.md,
    marginTop: -16,
  },
  formCard: {
    padding: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  sectionTitle: {
    ...typography.headingSmall,
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.textSecondary + '20',
    borderRadius: 12,
    backgroundColor: '#F9F9F9',
  },
  ngoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dropdownText: {
    ...typography.bodyText,
    color: colors.textPrimary,
  },
  ngoList: {
    marginTop: spacing.xs,
    borderWidth: 1.5,
    borderColor: colors.textSecondary + '20',
    borderRadius: 12,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  ngoOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.textSecondary + '10',
  },
  ngoOptionSelected: {
    backgroundColor: colors.primaryGreen + '08',
  },
  ngoName: {
    ...typography.bodyText,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  ngoTextSelected: {
    color: colors.primaryGreen,
  },
  ngoCity: {
    ...typography.captionText,
    color: colors.textSecondary,
    marginTop: 2,
  },
  textAreaContainer: {
    borderWidth: 1.5,
    borderColor: colors.textSecondary + '20',
    borderRadius: 12,
    backgroundColor: '#F9F9F9',
    padding: spacing.sm,
  },
  textArea: {
    ...typography.bodyText,
    height: 100,
    textAlignVertical: 'top',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.textSecondary + '20',
    borderRadius: 12,
    backgroundColor: '#F9F9F9',
    paddingHorizontal: spacing.md,
    height: 52,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  textInput: {
    flex: 1,
    ...typography.bodyText,
  },
  skillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  skillChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.textSecondary + '30',
    backgroundColor: '#fff',
  },
  skillChipSelected: {
    borderColor: colors.primaryGreen,
    borderWidth: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
    overflow: 'hidden',
  },
  skillGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  skillEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  skillText: {
    ...typography.captionText,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  skillTextActive: {
    ...typography.captionText,
    color: '#fff',
    fontWeight: '700',
  },
  submitBtn: {
    marginTop: spacing.xxl,
    shadowColor: colors.primarySaffron,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  gpsText: {
    ...typography.captionText,
    color: colors.accentBlue,
    marginTop: spacing.xs,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  statusContainer: {
    flex: 1,
    padding: spacing.xl,
    justifyContent: 'center',
  },
  statusCard: {
    padding: spacing.xxl,
    alignItems: 'center',
    borderRadius: 24,
  },
  statusIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  statusTitle: {
    ...typography.headingMedium,
    color: colors.textPrimary,
    textTransform: 'capitalize',
  },
  statusNgo: {
    ...typography.bodyText,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: 4,
  },
  statusDivider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginVertical: spacing.xl,
  },
  statusDesc: {
    ...typography.bodyText,
    textAlign: 'center',
    color: colors.textSecondary,
    lineHeight: 22,
  },
});
