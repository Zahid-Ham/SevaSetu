import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  signInWithPhoneNumber,
  PhoneAuthProvider,
  GoogleAuthProvider,
  signInWithCredential,
  sendPasswordResetEmail,
  User as FirebaseUser,
  ConfirmationResult
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../../config/firebaseConfig';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone: string;
  role: 'CITIZEN' | 'VOLUNTEER' | 'SUPERVISOR';
  ngo_id?: string | null;
  ngo_name?: string | null;
  createdAt?: any;
  avatar?: string | null;
}

/**
 * Service to handle all Firebase Auth logic
 */
export const firebaseAuthService = {
  
  /**
   * Log in a user with Email and Password
   */
  async loginWithEmail(email: string, pass: string) {
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    const user = userCredential.user;
    const profile = await this.getUserProfile(user.uid);
    const token = await user.getIdToken();
    return { user, profile, token };
  },

  /**
   * Register a new user with Email and Password
   */
  async registerWithEmail(email: string, pass: string, name: string, phone: string, role: 'CITIZEN' | 'VOLUNTEER' | 'SUPERVISOR', ngoName?: string) {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    const user = userCredential.user;
    
    // 1. Check if NGO already exists (by name)
    let finalNgoId = ngoName ? `ngo_${user.uid.substring(0, 8)}` : null;
    let finalNgoName = ngoName || null;

    if (role === 'SUPERVISOR' && ngoName) {
      const ngosRef = collection(db, 'ngos');
      const q = query(ngosRef, where('name', '==', ngoName));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        // Use existing NGO ID
        finalNgoId = querySnapshot.docs[0].id;
        finalNgoName = querySnapshot.docs[0].data().name;
      } else {
        // Create new NGO
        await setDoc(doc(db, 'ngos', finalNgoId!), {
          id: finalNgoId,
          name: ngoName,
          supervisor_id: user.uid,
          city: 'Local',
          createdAt: serverTimestamp(),
        });
      }
    }

    // 2. Create profile in Firestore
    const profile: UserProfile = {
      uid: user.uid,
      name,
      email,
      phone: phone.startsWith('+91') ? phone : `+91${phone}`,
      role,
      ngo_id: finalNgoId,
      ngo_name: finalNgoName,
      avatar: null,
    };

    await this.createUserProfile(user.uid, profile);
    const token = await user.getIdToken();
    return { user, profile, token };
  },

  /**
   * Send Phone OTP using the Recaptcha Verifier
   */
  async sendPhoneOtp(phoneNumber: string, recaptchaVerifier: any): Promise<ConfirmationResult> {
    const formattedPhone = phoneNumber.startsWith('+91') ? phoneNumber : `+91${phoneNumber}`;
    console.log('[FirebaseAuthService] Sending OTP to:', formattedPhone);
    try {
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifier);
      console.log('[FirebaseAuthService] Confirmation received successfully');
      return confirmation;
    } catch (error: any) {
      console.error('[FirebaseAuthService] signInWithPhoneNumber FAILED:');
      console.error('[FirebaseAuthService] Code:', error.code);
      console.error('[FirebaseAuthService] Message:', error.message);
      throw error;
    }
  },

  /**
   * Verify the OTP 6-digit code
   */
  async verifyOtp(confirmation: ConfirmationResult, otp: string) {
    const result = await confirmation.confirm(otp);
    const user = result.user;
    
    // 1. Check if profile exists for this exact UID
    let profile = await this.getUserProfile(user.uid);
    
    // 2. If no profile for UID, check if a profile exists with this PHONE NUMBER
    if (!profile && user.phoneNumber) {
      console.log(`[Auth] New Phone UID ${user.uid}, searching for existing profile...`);
      profile = await this.getProfileByPhone(user.phoneNumber);
      
      if (profile) {
        console.log(`[Auth] Existing profile found for phone! Syncing to new UID...`);
        profile.uid = user.uid; // Update UID mapping
        await this.createUserProfile(user.uid, profile);
      }
    }

    // 3. Still no profile? Create a default citizen profile
    if (!profile) {
      profile = {
        uid: user.uid,
        name: user.displayName || 'New User',
        email: user.email || '',
        phone: user.phoneNumber || '',
        role: 'CITIZEN',
        ngo_id: null,
        ngo_name: null,
        avatar: null
      };
      await this.createUserProfile(user.uid, profile);
    }
    
    const token = await user.getIdToken();
    return { user, profile, token };
  },

  /**
   * Sign out the current user
   */
  async signOut() {
    await firebaseSignOut(auth);
  },

  /**
   * Send a password reset email to the given address
   */
  async sendForgotPasswordEmail(email: string): Promise<{ success: boolean; message: string }> {
    try {
      await sendPasswordResetEmail(auth, email);
      return { 
        success: true, 
        message: 'Password reset link sent! Please check your Inbox and Spam folder.' 
      };
    } catch (error: any) {
      console.error('Forgot Password Error:', error);
      let message = 'Failed to send reset email. Please try again.';
      if (error.code === 'auth/user-not-found') {
        message = 'No account found with this email address.';
      } else if (error.code === 'auth/invalid-email') {
        message = 'Please enter a valid email address.';
      }
      return { success: false, message };
    }
  },

  /**
   * Log in a user with Google Credential
   */
  async loginWithGoogle(idToken: string, intendedRole: 'CITIZEN' | 'VOLUNTEER' | 'SUPERVISOR', accessToken?: string) {
    const credential = GoogleAuthProvider.credential(idToken, accessToken);
    const userCredential = await signInWithCredential(auth, credential);
    const user = userCredential.user;
    
    let profile = await this.getUserProfile(user.uid);
    
    // Create default profile if not exists
    if (!profile) {
      profile = {
        uid: user.uid,
        name: user.displayName || 'Google User',
        email: user.email || '',
        phone: user.phoneNumber || '',
        role: intendedRole,
        ngo_id: null,
        ngo_name: null,
        avatar: user.photoURL || null
      };
      await this.createUserProfile(user.uid, profile);
    }
    
    const token = await user.getIdToken();
    return { user, profile, token };
  },

  /**
   * Find a user profile by phone number (used for account linking)
   */
  async getProfileByPhone(phone: string): Promise<UserProfile | null> {
    const q = query(collection(db, 'users'), where('phone', '==', phone));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].data() as UserProfile;
    }
    return null;
  },

  /**
   * Get Firestore user profile
   */
  async getUserProfile(uid: string): Promise<UserProfile | null> {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      const data = userDoc.data();
      return {
        ...data,
        name: data.name || data.fullName || 'User',
      } as UserProfile;
    }
    return null;
  },

  /**
   * Create/Update user profile in Firestore
   */
  async createUserProfile(uid: string, profile: UserProfile) {
    await setDoc(doc(db, 'users', uid), {
      ...profile,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
  },

  /**
   * Auth state listener for session persistence
   */
  onAuthChange(callback: (user: FirebaseUser | null) => void) {
    return onAuthStateChanged(auth, callback);
  },

  /**
   * Get current auth token for API calls
   */
  async getIdToken() {
    const user = auth.currentUser;
    if (!user) return null;
    return await user.getIdToken(true);
  }
};
