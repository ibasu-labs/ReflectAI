import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  signInWithCredential,
  User,
  Auth,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  onSnapshot,
  Firestore,
  Unsubscribe,
} from 'firebase/firestore';
import { JournalInteraction, UserProfile } from '../types';
import { stripUndefined } from './sanitizer';

// Environment variable credentials
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (err) {
    console.warn('Firebase initialization warning:', err);
  }
}

// Local mock storage for offline / quick demo preview mode
const LOCAL_STORAGE_KEY_PREFIX = 'reflectai_user_data_';
const LOCAL_USER_SESSION_KEY = 'reflectai_active_user';

function getLocalUserInteractions(userId: string): JournalInteraction[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}${userId}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error reading local interactions', e);
  }
  return [];
}

function saveLocalUserInteractions(userId: string, data: JournalInteraction[]): void {
  try {
    localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving local interactions', e);
  }
}

export async function loginWithGoogle(): Promise<UserProfile> {
  if (auth && isFirebaseConfigured) {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || 'Reflective Writer',
        photoURL: user.photoURL,
      };
    } catch (firebaseErr: any) {
      console.warn(
        'Firebase popup sign-in encountered an issue:',
        firebaseErr?.code || firebaseErr?.message || firebaseErr
      );
      
      // If user closed the popup intentionally
      if (firebaseErr?.code === 'auth/popup-closed-by-user' || firebaseErr?.code === 'auth/cancelled-popup-request') {
        throw new Error('Sign-in was cancelled. Please try again.');
      }
      
      // If popup was blocked by browser iframe / security policy
      if (firebaseErr?.code === 'auth/popup-blocked') {
        throw new Error('The Google Sign-In popup was blocked by your browser. Please allow popups or open the app in a new tab.');
      }

      // If configuration or authorization domain is missing
      if (firebaseErr?.code === 'auth/configuration-not-found' || firebaseErr?.code === 'auth/unauthorized-domain') {
        console.info('Switching to local authenticated session for preview mode.');
      }
      
      // Fallback session
      const fallbackUser: UserProfile = {
        uid: 'user_' + Math.random().toString(36).substring(2, 9),
        email: 'writer@reflectai.app',
        displayName: 'Reflective Writer (Demo Session)',
        photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        isAnonymous: true,
      };
      localStorage.setItem(LOCAL_USER_SESSION_KEY, JSON.stringify(fallbackUser));
      return fallbackUser;
    }
  }

  // Fallback demo user when Firebase config is pending
  const demoUser: UserProfile = {
    uid: 'demo_user_' + Math.random().toString(36).substring(2, 8),
    email: 'writer@reflectai.app',
    displayName: 'Reflective Writer',
    photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    isAnonymous: true,
  };
  localStorage.setItem(LOCAL_USER_SESSION_KEY, JSON.stringify(demoUser));
  return demoUser;
}

export async function logoutUser(): Promise<void> {
  if (auth && isFirebaseConfigured) {
    await firebaseSignOut(auth);
  }
  localStorage.removeItem(LOCAL_USER_SESSION_KEY);
}

export function subscribeToAuth(callback: (user: UserProfile | null) => void): () => void {
  if (auth && isFirebaseConfigured) {
    return firebaseOnAuthStateChanged(auth, (user: User | null) => {
      if (user) {
        callback({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || 'Reflective Writer',
          photoURL: user.photoURL,
        });
      } else {
        callback(null);
      }
    });
  }

  // Local state check
  try {
    const saved = localStorage.getItem(LOCAL_USER_SESSION_KEY);
    if (saved) {
      callback(JSON.parse(saved));
    } else {
      callback(null);
    }
  } catch {
    callback(null);
  }
  return () => {};
}

/**
 * Saves a journal interaction strictly under /users/{userId}/interactions/{interactionId}
 * Strips all undefined fields to enforce Zero-Crash Payload Hygiene.
 */
export async function saveJournalInteraction(
  userId: string,
  interaction: JournalInteraction
): Promise<{ success: boolean; error?: string }> {
  if (!userId) {
    return { success: false, error: 'User must be authenticated to save reflections.' };
  }

  const cleanPayload = stripUndefined(interaction);

  if (db && isFirebaseConfigured) {
    try {
      const interactionRef = doc(db, 'users', userId, 'interactions', cleanPayload.id);
      await setDoc(interactionRef, cleanPayload, { merge: true });
      return { success: true };
    } catch (err: any) {
      console.error('Firestore save failed:', err);
      // Save locally as fallback so user work is NEVER lost
      const existing = getLocalUserInteractions(userId);
      const filtered = existing.filter((item) => item.id !== cleanPayload.id);
      saveLocalUserInteractions(userId, [cleanPayload, ...filtered]);
      return {
        success: false,
        error: `Cloud Firestore sync notice: ${err?.message || 'Database write error'}. Your work is safely cached locally!`,
      };
    }
  }

  // Local storage persistence
  const existing = getLocalUserInteractions(userId);
  const filtered = existing.filter((item) => item.id !== cleanPayload.id);
  saveLocalUserInteractions(userId, [cleanPayload, ...filtered]);
  return { success: true };
}

/**
 * Retrieves all reflections for a given user.
 */
export async function fetchUserInteractions(userId: string): Promise<JournalInteraction[]> {
  if (!userId) return [];

  if (db && isFirebaseConfigured) {
    try {
      const collRef = collection(db, 'users', userId, 'interactions');
      const q = query(collRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const list: JournalInteraction[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as JournalInteraction);
      });
      return list;
    } catch (err) {
      console.warn('Firestore fetch error, reading local cache:', err);
      return getLocalUserInteractions(userId);
    }
  }

  return getLocalUserInteractions(userId);
}

/**
 * Subscribes to real-time interaction updates for the active user.
 */
export function subscribeToUserInteractions(
  userId: string,
  onUpdate: (interactions: JournalInteraction[]) => void
): () => void {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  if (db && isFirebaseConfigured) {
    try {
      const collRef = collection(db, 'users', userId, 'interactions');
      const q = query(collRef, orderBy('createdAt', 'desc'));
      const unsub = onSnapshot(
        q,
        (snapshot) => {
          const list: JournalInteraction[] = [];
          snapshot.forEach((docSnap) => {
            list.push(docSnap.data() as JournalInteraction);
          });
          onUpdate(list);
        },
        (error) => {
          console.warn('Firestore listener error, using local fallback:', error);
          onUpdate(getLocalUserInteractions(userId));
        }
      );
      return unsub;
    } catch (err) {
      console.warn('Could not establish Firestore subscription:', err);
    }
  }

  // Local polling listener
  onUpdate(getLocalUserInteractions(userId));
  const handler = () => {
    onUpdate(getLocalUserInteractions(userId));
  };
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener('storage', handler);
  };
}

/**
 * Deletes an interaction from user's isolated document collection.
 */
export async function deleteJournalInteraction(
  userId: string,
  interactionId: string
): Promise<{ success: boolean; error?: string }> {
  if (!userId || !interactionId) {
    return { success: false, error: 'Invalid parameters for deletion' };
  }

  if (db && isFirebaseConfigured) {
    try {
      const docRef = doc(db, 'users', userId, 'interactions', interactionId);
      await deleteDoc(docRef);
    } catch (err: any) {
      console.warn('Firestore delete error, cleaning local cache:', err);
    }
  }

  const existing = getLocalUserInteractions(userId);
  const filtered = existing.filter((item) => item.id !== interactionId);
  saveLocalUserInteractions(userId, filtered);
  return { success: true };
}
