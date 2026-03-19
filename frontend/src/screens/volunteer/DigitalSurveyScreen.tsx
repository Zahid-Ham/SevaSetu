import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Alert, KeyboardAvoidingView, Platform,
  Modal, TouchableWithoutFeedback, ActivityIndicator
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import Animated, { FadeInDown, FadeInUp, withSpring, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { AppHeader, PrimaryButton, GradientBackground } from '../../components';
import { colors, spacing, typography } from '../../theme';
import { API_BASE_URL } from '../../config/apiConfig';

const PRIMARY_CATEGORIES = ['Water', 'Sanitation', 'Infrastructure', 'Health', 'Education', 'Safety', 'Other'];
const SUB_CATEGORIES: Record<string, string[]> = {
  'Water': ['Piped Water Supply', 'Handpump/Borewell', 'Water Quality', 'Water Logging', 'Other'],
  'Sanitation': ['Public Toilets', 'Garbage Collection', 'Drainage', 'Sewerage', 'Other'],
  'Infrastructure': ['Roads', 'Streetlights', 'Community Hall', 'Bridges/Culverts', 'Other'],
  'Health': ['Primary Health Centre', 'Medicine Availability', 'Ambulance', 'Medical Camp', 'Other'],
  'Education': ['School Building', 'Teachers', 'Mid-day Meal', 'Toilets in School', 'Other'],
  'Safety': ['Police Patrolling', 'Eve Teasing', 'Theft', 'Other'],
  'Other': ['General Inquiry', 'Miscellaneous']
};
const PROBLEM_STATUSES = ['Active/Persistent', 'Resolved', 'Recurring'];
const URGENCY_LEVELS = ['Immediate', 'Critical', 'Moderate', 'Low'];
const SENTIMENTS = ['Hopeful', 'Angry', 'Desperate', 'Frustrated', 'Neutral'];

export const DigitalSurveyScreen = () => {
  const navigation = useNavigation<any>();
  const [mode, setMode] = useState<'idle' | 'success'>('idle');
  const [submittedReportId, setSubmittedReportId] = useState<string | null>(null);

  // Form State
  const [citizenName, setCitizenName] = useState('');
  const [phone, setPhone] = useState('');
  const [locationText, setLocationText] = useState('');
  const [gpsCoordinates, setGpsCoordinates] = useState('');
  const [demographicTally, setDemographicTally] = useState('');
  
  const [primaryCategory, setPrimaryCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [problemStatus, setProblemStatus] = useState('');
  const [duration, setDuration] = useState('');
  const [urgencyLevel, setUrgencyLevel] = useState('');
  const [serviceStatus, setServiceStatus] = useState(false);
  
  const [populationAffected, setPopulationAffected] = useState('');
  const [vulnerabilityFlag, setVulnerabilityFlag] = useState('');
  const [secondaryImpact, setSecondaryImpact] = useState('');
  const [safetyRating, setSafetyRating] = useState(0); // 1-5
  
  const [keyComplaints, setKeyComplaints] = useState<string[]>([]);
  const [complaintInput, setComplaintInput] = useState('');
  const [sentiment, setSentiment] = useState('');
  const [quote, setQuote] = useState('');
  const [description, setDescription] = useState('');

  const [loading, setLoading] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  // Auto GPS & Reverse Geocoding
  const handleGetLocation = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission to access location was denied');
      return;
    }
    const loc = await Location.getCurrentPositionAsync({});
    setGpsCoordinates(`${loc.coords.latitude.toFixed(4)}° N, ${loc.coords.longitude.toFixed(4)}° E`);

    try {
      const geocode = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      if (geocode && geocode.length > 0) {
        const address = geocode[0];
        const addressString = [address.name, address.street, address.district, address.city, address.region].filter(Boolean).join(', ');
        setLocationText(addressString);
      }
    } catch (err) {
      console.log('Reverse geocoding failed', err);
    }
  };

  const handleAddComplaint = () => {
    if (complaintInput.trim() && !keyComplaints.includes(complaintInput.trim())) {
      setKeyComplaints([...keyComplaints, complaintInput.trim()]);
      setComplaintInput('');
    }
  };
  
  const removeComplaint = (index: number) => {
    setKeyComplaints(keyComplaints.filter((_, i) => i !== index));
  };
  
  const resetForm = () => {
    setCitizenName(''); setPhone(''); setLocationText(''); setGpsCoordinates('');
    setDemographicTally(''); setPrimaryCategory(''); setSubCategory(''); setProblemStatus('');
    setDuration(''); setUrgencyLevel(''); setServiceStatus(false); setPopulationAffected('');
    setVulnerabilityFlag(''); setSecondaryImpact(''); setSafetyRating(0); setKeyComplaints([]);
    setComplaintInput(''); setSentiment(''); setQuote(''); setDescription('');
    setPhotoUri(null); setAudioUri(null);
  };
  
   const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') return;
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(recording);
      setIsRecording(true);
    } catch (err) { }
  };

  const stopRecording = async () => {
    if (!recording) return;
    setIsRecording(false);
    await recording.stopAndUnloadAsync();
    setAudioUri(recording.getURI());
    setRecording(null);
  };
  const handleSubmit = async () => {
    if (!citizenName || !locationText || !primaryCategory || !problemStatus || !urgencyLevel) {
      Alert.alert('Missing Fields', 'Please fill all mandatory fields marked with *');
      return;
    }

    setLoading(true);
    try {
      let uploadedPhotoUrl = undefined;
      let uploadedAudioUrl = undefined;

      // Uniquely upload photo if exists
      if (photoUri) {
        console.log('Uploading photo...');
        const photoForm = new FormData();
        const fname = photoUri.split('/').pop() || 'photo.jpg';
        const type = fname.endsWith('.png') ? 'image/png' : 'image/jpeg';
        // @ts-ignore
        photoForm.append('file', { uri: photoUri, type, name: fname });
        
        try {
          const pRes = await fetch(`${API_BASE_URL}/upload-media`, { method: 'POST', body: photoForm });
          const pData = await pRes.json();
          if (pData.success) uploadedPhotoUrl = pData.url;
        } catch (e) {
            console.error('Photo upload failed:', e);
        }
      }

      // Uniquely upload audio if exists
      if (audioUri) {
        console.log('Uploading audio...');
        const audioForm = new FormData();
        const aname = audioUri.split('/').pop() || 'audio.m4a';
        // @ts-ignore
        audioForm.append('file', { uri: audioUri, type: 'audio/m4a', name: aname });
        
        try {
          const aRes = await fetch(`${API_BASE_URL}/upload-media`, { method: 'POST', body: audioForm });
          const aData = await aRes.json();
          if (aData.success) uploadedAudioUrl = aData.url;
        } catch (e) {
            console.error('Audio upload failed:', e);
        }
      }

      // Fallback to local URIs if upload skipped or failed
      uploadedPhotoUrl = uploadedPhotoUrl || (photoUri ? photoUri : undefined);
      uploadedAudioUrl = uploadedAudioUrl || (audioUri ? audioUri : undefined);

      const payload = {
        citizen_name: citizenName,
        phone: phone || undefined,
        precise_location: locationText,
        gps_coordinates: gpsCoordinates || undefined,
        demographic_tally: demographicTally ? parseInt(demographicTally, 10) : undefined,
        primary_category: primaryCategory,
        sub_category: subCategory || undefined,
        problem_status: problemStatus,
        duration_of_problem: duration || undefined,
        urgency_level: urgencyLevel,
        service_status: serviceStatus ? 'Active' : 'Inactive',
        population_affected: populationAffected ? parseInt(populationAffected, 10) : undefined,
        vulnerability_flag: vulnerabilityFlag || undefined,
        secondary_impact: secondaryImpact || undefined,
        severity_score: safetyRating > 0 ? (6 - safetyRating) * 2 : undefined, // simple inverse mapping
        key_complaints: keyComplaints.length > 0 ? keyComplaints : undefined,
        sentiment: sentiment || undefined,
        key_quote: quote || undefined,
        description: description || undefined,
        volunteer_id: 'vol_123',
        report_source: 'digital_form',
        photo_url: uploadedPhotoUrl,
        audio_url: uploadedAudioUrl
      };

      const response = await fetch(`${API_BASE_URL}/submit-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (result.success) {
        setSubmittedReportId(result.report_id);
        resetForm();
        setMode('success');
      } else {
        throw new Error(result.detail || 'Submission failed');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'success') {
    return (
      <View style={styles.container}>
        <AppHeader title="Survey Completed" />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl }}>
          <Feather name="check-circle" size={100} color={colors.success} />
          <Text style={{ ...typography.headingLarge, marginTop: spacing.xl, textAlign: 'center' }}>Successfully Submitted!</Text>
          <Text style={{ ...typography.bodyText, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.md, marginBottom: spacing.xxl }}>
            Your digital survey has been securely logged into the SevaSetu database and is ready for analysis.
          </Text>
          <PrimaryButton 
            title="View Report Details" 
            onPress={() => {
              setMode('idle');
              navigation.navigate('Scan Survey', { autoOpenReportId: submittedReportId });
            }}
            style={{ width: '100%', marginBottom: spacing.lg }}
          />
          <TouchableOpacity onPress={() => setMode('idle')} style={{ padding: spacing.md }}>
            <Text style={{ ...typography.bodyText, color: colors.primaryGreen, fontWeight: '700' }}>Submit Another Form</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <AppHeader title="Digital Survey Form" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Section 1: Who & Where */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.section}>
          <Text style={styles.sectionTitle}>1. Who & Where</Text>
          <FormField label="Citizen Name *" value={citizenName} onChangeText={setCitizenName} placeholder="Enter name" />
          <FormField label="Phone Number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="e.g. 9876543210" />
          <View style={styles.rowField}>
            <View style={{ flex: 1 }}>
              <FormField label="Precise Location *" value={locationText} onChangeText={setLocationText} placeholder="e.g. Block A, Near Well" />
            </View>
            <TouchableOpacity style={styles.gpsBtn} onPress={handleGetLocation}>
              <Feather name="map-pin" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
          {gpsCoordinates ? <Text style={styles.gpsText}>GPS: {gpsCoordinates}</Text> : null}
          <FormField label="Demographic Tally (Household Size)" value={demographicTally} onChangeText={setDemographicTally} keyboardType="numeric" placeholder="e.g. 5" />
        </Animated.View>

        {/* Section 2: Problem Details */}
        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.section}>
          <Text style={styles.sectionTitle}>2. The Problem</Text>
          <DropdownField 
            label="Primary Category *" 
            options={PRIMARY_CATEGORIES} 
            selected={primaryCategory} 
            onSelect={(val: string) => { setPrimaryCategory(val); setSubCategory(''); }} 
          />
          {primaryCategory ? (
            <DropdownField 
              label="Sub-Category" 
              options={SUB_CATEGORIES[primaryCategory] || ['Other']} 
              selected={subCategory} 
              onSelect={setSubCategory} 
            />
          ) : null}
          <RadioGroup label="Problem Status *" options={PROBLEM_STATUSES} selected={problemStatus} onSelect={setProblemStatus} />
          <RadioGroup label="Urgency Level *" options={URGENCY_LEVELS} selected={urgencyLevel} onSelect={setUrgencyLevel} />
          <FormField label="Duration of Problem" value={duration} onChangeText={setDuration} placeholder="e.g. 3 Weeks" />
          
          <View style={styles.switchRow}>
            <Text style={styles.label}>Service Currently Active?</Text>
            <TouchableOpacity style={[styles.switch, serviceStatus && styles.switchActive]} onPress={() => setServiceStatus(!serviceStatus)}>
              <View style={[styles.switchKnob, serviceStatus && styles.switchKnobActive]} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Section 3: Impact */}
        <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.section}>
          <Text style={styles.sectionTitle}>3. Impact Assessment</Text>
          <FormField label="Affected Population Size" value={populationAffected} onChangeText={setPopulationAffected} keyboardType="numeric" placeholder="e.g. 50" />
          <RadioGroup label="Vulnerability Flag" options={['High', 'Medium', 'Low']} selected={vulnerabilityFlag} onSelect={setVulnerabilityFlag} />
          <FormField label="Secondary Impact" value={secondaryImpact} onChangeText={setSecondaryImpact} placeholder="e.g. Health - Illness" />
          
          <Text style={styles.label}>Safety Rating (1 = Very Unsafe, 5 = Very Safe)</Text>
          <View style={styles.likertRow}>
            {[1, 2, 3, 4, 5].map(num => (
              <TouchableOpacity key={num} style={[styles.likertBtn, safetyRating === num && styles.likertActive]} onPress={() => setSafetyRating(num)}>
                <Text style={[styles.likertText, safetyRating === num && styles.likertTextActive]}>{num}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* Section 4: Qualitative */}
        <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.section}>
          <Text style={styles.sectionTitle}>4. Community Voice</Text>
          <Text style={styles.label}>Key Complaints / Keywords</Text>
          <View style={styles.tagInputRow}>
            <TextInput style={styles.tagInput} value={complaintInput} onChangeText={setComplaintInput} placeholder="Add a complaint keyword..." onSubmitEditing={handleAddComplaint} />
            <TouchableOpacity style={styles.addTagBtn} onPress={handleAddComplaint}>
              <Feather name="plus" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={styles.tagsContainer}>
            {keyComplaints.map((tag, i) => (
              <View key={i} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
                <TouchableOpacity onPress={() => removeComplaint(i)}>
                  <Feather name="x" size={14} color={colors.primaryGreen} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
          
          <RadioGroup label="Community Sentiment" options={SENTIMENTS} selected={sentiment} onSelect={setSentiment} />
          <FormField label="Notable Quote" value={quote} onChangeText={setQuote} multiline placeholder="Direct quote from resident..." />
          <FormField label="Detailed Description" value={description} onChangeText={setDescription} multiline placeholder="Elaborate details..." />
        </Animated.View>

        {/* Section 5: Media */}
        <Animated.View entering={FadeInDown.delay(500).springify()} style={styles.section}>
          <Text style={styles.sectionTitle}>5. Attachments</Text>
          <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md }}>
            <TouchableOpacity style={[styles.mediaBtn, { flex: 1 }]} onPress={handlePickImage}>
              <Feather name="camera" size={24} color={photoUri ? colors.success : colors.primaryGreen} />
              <Text style={[styles.mediaBtnText, photoUri && { color: colors.success }]}>
                {photoUri ? 'Photo Attached' : 'Attach Photo'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.mediaBtn, { flex: 1 }, isRecording && { borderColor: colors.error, backgroundColor: colors.error + '15' }]} 
              onPress={isRecording ? stopRecording : (!audioUri ? startRecording : undefined)}
              onLongPress={() => setAudioUri(null)}
            >
              <Feather 
                name={isRecording ? 'square' : 'mic'} 
                size={24} 
                color={isRecording ? colors.error : (audioUri ? colors.success : colors.primaryGreen)} 
              />
              <Text style={[
                styles.mediaBtnText, 
                isRecording && { color: colors.error },
                audioUri && { color: colors.success }
              ]}>
                {isRecording ? 'Stop Recording' : (audioUri ? 'Audio Attached' : 'Voice Note')}
              </Text>
            </TouchableOpacity>
          </View>
          {audioUri && <Text style={{ ...typography.captionText, color: colors.success, textAlign: 'center' }}>Long-press Voice Note to clear</Text>}
        </Animated.View>

        <PrimaryButton
          title={loading ? "Submitting..." : "Submit Survey"}
          onPress={handleSubmit}
          style={styles.submitBtn}
          disabled={loading}
        />
        
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// ─── Subcomponents ───
const FormField = ({ label, value, onChangeText, placeholder, keyboardType = 'default', multiline = false }: any) => (
  <View style={styles.fieldContainer}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      style={[styles.input, multiline && styles.textArea]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      keyboardType={keyboardType}
      multiline={multiline}
      placeholderTextColor={colors.textSecondary + '80'}
    />
  </View>
);

const RadioGroup = ({ label, options, selected, onSelect }: any) => (
  <View style={styles.fieldContainer}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.radioGroup}>
      {options.map((opt: string) => (
        <TouchableOpacity
          key={opt}
          style={[styles.radioBtn, selected === opt && styles.radioBtnActive]}
          onPress={() => onSelect(opt)}
        >
          <Text style={[styles.radioText, selected === opt && styles.radioTextActive]}>{opt}</Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

const DropdownField = ({ label, options, selected, onSelect, placeholder = 'Select an option' }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity 
        style={[styles.input, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]} 
        onPress={() => setIsOpen(true)}
        activeOpacity={0.8}
      >
        <Text numberOfLines={1} style={{ ...typography.bodyText, flex: 1, color: selected ? colors.textPrimary : colors.textSecondary + '80' }}>
          {selected || placeholder}
        </Text>
        <Feather name="chevron-down" size={20} color={colors.textSecondary} />
      </TouchableOpacity>
      
      <Modal visible={isOpen} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setIsOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>{label || placeholder}</Text>
                <ScrollView style={{ maxHeight: 300 }}>
                  {options.map((opt: string) => (
                    <TouchableOpacity 
                      key={opt} 
                      style={[styles.dropdownItem, selected === opt && styles.dropdownItemActive]}
                      onPress={() => { onSelect(opt); setIsOpen(false); }}
                    >
                      <Text style={{ ...typography.bodyText, fontSize: 15, color: selected === opt ? colors.primaryGreen : colors.textPrimary, fontWeight: selected === opt ? '700' : '400' }}>
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxl * 3 },
  section: {
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  sectionTitle: {
    ...typography.headingMedium,
    color: colors.primaryGreen,
    marginBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.textSecondary + '20',
    paddingBottom: spacing.sm,
  },
  fieldContainer: { marginBottom: spacing.lg },
  label: { ...typography.captionText, color: colors.textSecondary, marginBottom: spacing.xs, fontWeight: '700' },
  input: {
    backgroundColor: colors.background,
    borderRadius: 12, borderWidth: 1, borderColor: colors.textSecondary + '30',
    padding: spacing.md, ...typography.bodyText,
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  rowField: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, marginBottom: spacing.lg },
  gpsBtn: {
    backgroundColor: colors.primaryGreen,
    width: 48, height: 48, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  gpsText: { ...typography.captionText, color: colors.accentBlue, marginTop: -spacing.md, marginBottom: spacing.lg },
  
  radioGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  radioBtn: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: colors.textSecondary + '40',
    backgroundColor: colors.background,
  },
  radioBtnActive: {
    backgroundColor: colors.primaryGreen + '15',
    borderColor: colors.primaryGreen,
  },
  radioText: { ...typography.bodyText, fontSize: 13, color: colors.textSecondary },
  radioTextActive: { color: colors.primaryGreen, fontWeight: '700' },

  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: spacing.sm },
  switch: { width: 50, height: 28, borderRadius: 14, backgroundColor: colors.textSecondary + '40', padding: 2 },
  switchActive: { backgroundColor: colors.primaryGreen },
  switchKnob: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff', elevation: 2 },
  switchKnobActive: { transform: [{ translateX: 22 }] },

  likertRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs },
  likertBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.background, borderWidth: 1, borderColor: colors.textSecondary + '30',
    justifyContent: 'center', alignItems: 'center',
  },
  likertActive: { backgroundColor: colors.primarySaffron, borderColor: colors.primarySaffron },
  likertText: { ...typography.headingSmall, color: colors.textSecondary },
  likertTextActive: { color: '#fff' },

  tagInputRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  tagInput: { flex: 1, backgroundColor: colors.background, borderRadius: 12, borderWidth: 1, borderColor: colors.textSecondary + '30', padding: spacing.sm, paddingHorizontal: spacing.md },
  addTagBtn: { backgroundColor: colors.primaryGreen, width: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primaryGreen + '15', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, gap: 6 },
  tagText: { ...typography.bodyText, fontSize: 13, color: colors.primaryGreen, fontWeight: '600' },

  mediaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    padding: spacing.md, borderRadius: 12, borderWidth: 1, borderStyle: 'solid', borderColor: colors.primaryGreen + '40',
    backgroundColor: colors.primaryGreen + '05',
  },
  mediaBtnText: { ...typography.bodyText, color: colors.primaryGreen, fontWeight: '600', fontSize: 13, textAlign: 'center' },

  submitBtn: { marginTop: spacing.md, marginBottom: spacing.xxl },

  dropdownList: {
    marginTop: spacing.xs, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: colors.textSecondary + '30',
    overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
  },
  dropdownItem: { padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.textSecondary + '10' },
  dropdownItemActive: { backgroundColor: colors.primaryGreen + '10' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, width: '100%', paddingVertical: spacing.md, elevation: 5 },
  modalTitle: { ...typography.headingSmall, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.textSecondary + '20', marginBottom: spacing.sm },
});
