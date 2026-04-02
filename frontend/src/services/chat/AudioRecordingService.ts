import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

export class AudioRecordingService {
  private recording: Audio.Recording | null = null;
  private isRecording = false;

  async requestPermissions(): Promise<boolean> {
    const { status } = await Audio.requestPermissionsAsync();
    return status === 'granted';
  }

  async startRecording(): Promise<void> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) throw new Error('Audio recording permission not granted');

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      this.recording = recording;
      this.isRecording = true;
      console.log('Recording started');
    } catch (err) {
      console.error('Failed to start recording', err);
      throw err;
    }
  }

  async stopRecording(): Promise<{ uri: string; duration: number } | null> {
    if (!this.recording) return null;

    try {
      this.isRecording = false;
      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      
      // Get duration
      const status = await this.recording.getStatusAsync();
      const duration = (status as any).durationMillis || 0;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      this.recording = null;
      return uri ? { uri, duration } : null;
    } catch (err) {
      console.error('Failed to stop recording', err);
      return null;
    }
  }

  getStatus() {
    return { isRecording: this.isRecording };
  }
}

export const audioService = new AudioRecordingService();
