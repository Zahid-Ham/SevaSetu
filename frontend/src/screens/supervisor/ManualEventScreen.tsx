/**
 * ManualEventScreen.tsx
 * Supervisor form to create a new event from scratch.
 */

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEventStore } from '../../services/store/useEventStore';
import { colors, spacing, typography, globalStyles } from '../../theme';
import { AppHeader, LocationPickerModal } from '../../components';

const CATEGORIES = ['Water', 'Health', 'Sanitation', 'Education', 'Infrastructure', 'Safety', 'Environment'];
const SKILLS = [
  { id: 'first_aid', label: 'First Aid' },
  { id: 'logistics', label: 'Logistics' },
  { id: 'teaching', label: 'Teaching' },
  { id: 'construction', label: 'Construction' },
  { id: 'medical', label: 'Medical' },
  { id: 'crowd_management', label: 'Crowd Mgmt' },
  { id: 'documentation', label: 'Documentation' },
  { id: 'cooking', label: 'Cooking' },
  { id: 'driving', label: 'Driving' },
  { id: 'counseling', label: 'Counseling' },
];

export const ManualEventScreen = ({ navigation }: any) => {
  const [eventType, setEventType] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [area, setArea] = useState('Maharashtra');
  const [latitude, setLatitude] = useState<number | undefined>();
  const [longitude, setLongitude] = useState<number | undefined>();
  const [geofenceRadius, setGeofenceRadius] = useState(150);
  const [locationPickerVisible, setLocationPickerVisible] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [headcount, setHeadcount] = useState('10');
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set());

  const { addManualEvent, loadingAction } = useEventStore();

  const toggleSkill = (skillId: string) => {
    Haptics.selectionAsync();
    setSelectedSkills((prev) => {
      const next = new Set(prev);
      if (next.has(skillId)) next.delete(skillId);
      else next.add(skillId);
      return next;
    });
  };

  const handleCreate = async () => {
    if (!eventType || !description || !startDate || !endDate) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    const payload = {
      event_type: eventType,
      category,
      description,
      area,
      latitude,
      longitude,
      geofence_radius: geofenceRadius,
      predicted_date_start: startDate,
      predicted_date_end: endDate,
      estimated_headcount: parseInt(headcount, 10) || 10,
      required_skills: Array.from(selectedSkills),
    };

    try {
      await addManualEvent(payload);
      Alert.alert('Success!', 'Manual event created and volunteers assigned.');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', 'Failed to create event.');
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Create Manual Event" showBack onBackPress={() => navigation.goBack()} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <View style={[globalStyles.card, styles.formCard]}>
            <Text style={styles.sectionTitle}>Event Basics</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Event Name</Text>
              <TextInput 
                style={styles.input} 
                value={eventType} 
                onChangeText={setEventType} 
                placeholder="e.g. Village Sanitation Drive"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Category</Text>
              <View style={styles.categoryRow}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity 
                    key={cat} 
                    style={[styles.catBtn, category === cat && styles.catBtnActive]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text style={[styles.catBtnTxt, category === cat && styles.catBtnTxtActive]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Location</Text>
              <TouchableOpacity 
                style={[styles.input, styles.locationBtn]} 
                onPress={() => setLocationPickerVisible(true)}
              >
                <Feather name="map-pin" size={16} color={colors.primaryGreen} />
                <Text style={styles.locationBtnTxt} numberOfLines={1}>
                  {latitude ? area : "📍 Set Mission Location on Map"}
                </Text>
              </TouchableOpacity>
              {latitude && (
                <Text style={styles.coordinatesHint}>
                  Coordinates: {latitude.toFixed(4)}, {longitude?.toFixed(4)} • Radius: {geofenceRadius}m
                </Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput 
                style={[styles.input, styles.textArea]} 
                value={description} 
                onChangeText={setDescription} 
                placeholder="Describe the objective and activities..."
                multiline
                numberOfLines={4}
              />
            </View>
          </View>

          <LocationPickerModal
            visible={locationPickerVisible}
            onClose={() => setLocationPickerVisible(false)}
            onConfirm={(loc) => {
              setArea(loc.address);
              setLatitude(loc.latitude);
              setLongitude(loc.longitude);
              setGeofenceRadius(loc.geofence_radius);
            }}
            initialLocation={latitude && longitude ? { latitude, longitude, address: area } : undefined}
          />

          <View style={[globalStyles.card, styles.formCard]}>
            <Text style={styles.sectionTitle}>Logistics & Skills</Text>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Start Date</Text>
                <TextInput 
                  style={styles.input} 
                  value={startDate} 
                  onChangeText={setStartDate} 
                  placeholder="YYYY-MM-DD"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: spacing.sm }]}>
                <Text style={styles.label}>End Date</Text>
                <TextInput 
                  style={styles.input} 
                  value={endDate} 
                  onChangeText={setEndDate} 
                  placeholder="YYYY-MM-DD"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Volunteers Needed</Text>
              <TextInput 
                style={styles.input} 
                value={headcount} 
                onChangeText={setHeadcount} 
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Required Skills</Text>
              <View style={styles.skillsRow}>
                {SKILLS.map((s) => (
                  <TouchableOpacity 
                    key={s.id} 
                    style={[styles.skillChip, selectedSkills.has(s.id) && styles.skillChipActive]}
                    onPress={() => toggleSkill(s.id)}
                  >
                    <Text style={[styles.skillChipTxt, selectedSkills.has(s.id) && styles.skillChipTxtActive]}>{s.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.submitBtn} 
            onPress={handleCreate}
            disabled={loadingAction}
          >
            <LinearGradient
              colors={['#1B5E20', '#2E7D32']}
              style={styles.submitGradient}
            >
              {loadingAction 
                ? <ActivityIndicator color="#fff" />
                : <><Feather name="plus-circle" size={20} color="#fff" /><Text style={styles.submitTxt}>Create & Dispatch Volunteers</Text></>
              }
            </LinearGradient>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: spacing.md },
  formCard: { marginBottom: spacing.md, padding: spacing.lg },
  sectionTitle: { ...typography.headingSmall, fontSize: 16, marginBottom: spacing.lg, color: colors.primaryGreen },
  inputGroup: { marginBottom: spacing.lg },
  label: { fontSize: 13, fontWeight: '600' as const, color: colors.textPrimary, marginBottom: 8 },
  input: { backgroundColor: colors.cardBackground, borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12, paddingHorizontal: spacing.md, height: 48, fontSize: 15 },
  textArea: { height: 100, textAlignVertical: 'top', paddingTop: spacing.sm },
  locationBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'flex-start' },
  locationBtnTxt: { fontSize: 14, color: colors.textPrimary, flex: 1 },
  coordinatesHint: { fontSize: 11, color: colors.textSecondary, marginTop: 6, fontStyle: 'italic' },
  row: { flexDirection: 'row' },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F0F0F0', borderWidth: 1, borderColor: '#E0E0E0' },
  catBtnActive: { backgroundColor: colors.primaryGreen, borderColor: colors.primaryGreen },
  catBtnTxt: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' as const },
  catBtnTxtActive: { color: '#fff', fontWeight: '700' as const },
  skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skillChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.accentBlue + '08', borderWidth: 1, borderColor: colors.accentBlue + '20' },
  skillChipActive: { backgroundColor: colors.accentBlue, borderColor: colors.accentBlue },
  skillChipTxt: { fontSize: 12, color: colors.accentBlue, fontWeight: '500' as const },
  skillChipTxtActive: { color: '#fff', fontWeight: '700' as const },
  submitBtn: { borderRadius: 16, overflow: 'hidden', marginTop: spacing.sm },
  submitGradient: { height: 56, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 },
  submitTxt: { color: '#fff', fontSize: 16, fontWeight: '700' as const },
});
