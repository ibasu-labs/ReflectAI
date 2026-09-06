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
import { JournalInteraction, UserProfile, UserMemory, AskJournalResponse } from '../types';
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
      if (firebaseErr?.code === 'auth/popup-blocked' || firebaseErr?.message?.includes('popup-blocked')) {
        const err: any = new Error('The Google Sign-In popup was blocked by your browser. Please allow popups or open the app in a new tab.');
        err.authCode = 'popup-blocked';
        throw err;
      }

      // If configuration or authorization domain is missing, throw specific error with domain
      if (firebaseErr?.code === 'auth/unauthorized-domain') {
        const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'current domain';
        const err: any = new Error(`Domain not authorized: "${currentHost}" is not added to Firebase Authorized Domains. Add it in Firebase Console > Authentication > Settings > Authorized domains.`);
        err.authCode = 'unauthorized-domain';
        err.domain = currentHost;
        throw err;
      }

      if (firebaseErr?.code === 'auth/configuration-not-found') {
        const err: any = new Error('Google Sign-In provider is not enabled in Firebase Console. Please enable Google in Firebase Console > Authentication > Sign-in method.');
        err.authCode = 'configuration-not-found';
        throw err;
      }
      
      // Automatic fallback for unexpected errors in offline/preview environments
      console.info('Switching to local authenticated session for preview mode.');
      const fallbackUser: UserProfile = {
        uid: 'user_' + Math.random().toString(36).substring(2, 9),
        email: 'guest@reflectai.app',
        displayName: 'Guest Writer',
        photoURL: undefined,
        isAnonymous: true,
      };
      localStorage.setItem(LOCAL_USER_SESSION_KEY, JSON.stringify(fallbackUser));
      return fallbackUser;
    }
  }

  return loginAsGuest();
}

export function loginAsGuest(): UserProfile {
  const guestUser: UserProfile = {
    uid: 'guest_' + Math.random().toString(36).substring(2, 8),
    email: 'guest@reflectai.app',
    displayName: 'Guest Writer',
    photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    isAnonymous: true,
  };
  localStorage.setItem(LOCAL_USER_SESSION_KEY, JSON.stringify(guestUser));
  return guestUser;
}

export async function logoutUser(): Promise<void> {
  if (auth && isFirebaseConfigured) {
    try {
      await firebaseSignOut(auth);
    } catch {
      // ignore
    }
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
        // Check if a local guest session is active
        try {
          const saved = localStorage.getItem(LOCAL_USER_SESSION_KEY);
          if (saved) {
            callback(JSON.parse(saved));
            return;
          }
        } catch {
          // ignore
        }
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

// ---------------------------------------------------------------------------
// Personal Memory Operations (Path: /users/{userId}/memories/{memoryId})
// ---------------------------------------------------------------------------
const LOCAL_STORAGE_MEMORIES_PREFIX = 'reflectai_user_memories_';

function getLocalUserMemories(userId: string): UserMemory[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_MEMORIES_PREFIX}${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Error reading local user memories', e);
    return [];
  }
}

function saveLocalUserMemories(userId: string, data: UserMemory[]): void {
  try {
    localStorage.setItem(`${LOCAL_STORAGE_MEMORIES_PREFIX}${userId}`, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving local user memories', e);
  }
}

/**
 * Retrieves the current Firebase Authentication ID token for backend authorization.
 */
export async function getAuthToken(): Promise<string | null> {
  if (auth && auth.currentUser) {
    try {
      return await auth.currentUser.getIdToken(false);
    } catch (e) {
      console.warn('Failed to retrieve Firebase ID token', e);
      return null;
    }
  }

  // In development / preview mode, allow session token derived from authenticated local session
  try {
    const saved = localStorage.getItem(LOCAL_USER_SESSION_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed?.uid) {
        return `preview_${parsed.uid}`;
      }
    }
  } catch {}

  return null;
}

/**
 * Explicitly queries /users/{userId}/memories collection from Firestore.
 * Reconstructs memory list on initial load or browser refresh and reconciles with local storage.
 */
export async function fetchUserMemories(userId: string): Promise<UserMemory[]> {
  if (!userId) return [];

  const localList = getLocalUserMemories(userId);

  if (db && isFirebaseConfigured) {
    try {
      const collRef = collection(db, 'users', userId, 'memories');
      const q = query(collRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const cloudList: UserMemory[] = [];
      snapshot.forEach((d) => {
        cloudList.push(d.data() as UserMemory);
      });

      if (cloudList.length > 0) {
        const mergedMap = new Map<string, UserMemory>();
        localList.forEach((m) => mergedMap.set(m.id, m));
        cloudList.forEach((m) => mergedMap.set(m.id, m));
        const merged = Array.from(mergedMap.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        saveLocalUserMemories(userId, merged);
        return merged;
      }
    } catch (err) {
      console.warn('Failed to fetch memories from Firestore, using local cache:', err);
    }
  }

  return localList;
}

/**
 * Subscribes to real-time personal memory updates for the active user.
 * Reconstructs data immediately from Firestore/cache and maintains resilient real-time sync.
 */
export function subscribeToUserMemories(
  userId: string,
  onUpdate: (memories: UserMemory[]) => void
): () => void {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  let active = true;

  // 1. Immediately emit cached memories so memories survive page refresh without flicker
  const initialLocal = getLocalUserMemories(userId);
  onUpdate(initialLocal);

  // 2. Fetch and reconcile cloud documents
  fetchUserMemories(userId).then((list) => {
    if (active && list && list.length > 0) {
      onUpdate(list);
    }
  });

  // 3. Attach real-time onSnapshot listener
  if (db && isFirebaseConfigured) {
    try {
      const collRef = collection(db, 'users', userId, 'memories');
      const q = query(collRef, orderBy('createdAt', 'desc'));
      const unsub = onSnapshot(
        q,
        (snapshot) => {
          if (!active) return;
          const cloudList: UserMemory[] = [];
          snapshot.forEach((docSnap) => {
            cloudList.push(docSnap.data() as UserMemory);
          });

          if (cloudList.length > 0) {
            // Merge cloud documents with local cache
            const currentLocal = getLocalUserMemories(userId);
            const mergedMap = new Map<string, UserMemory>();
            currentLocal.forEach((m) => mergedMap.set(m.id, m));
            cloudList.forEach((m) => mergedMap.set(m.id, m));
            const merged = Array.from(mergedMap.values()).sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            saveLocalUserMemories(userId, merged);
            onUpdate(merged);
          } else {
            // Cloud has 0 documents (e.g. backend sync pending or offline)
            // DO NOT wipe local cache! Keep local memories alive and emit them
            const currentLocal = getLocalUserMemories(userId);
            onUpdate(currentLocal);
          }
        },
        (error) => {
          console.warn('Firestore memories listener notice, using local cache:', error);
          if (active) {
            onUpdate(getLocalUserMemories(userId));
          }
        }
      );
      return () => {
        active = false;
        unsub();
      };
    } catch (err) {
      console.warn('Could not establish Firestore memories subscription:', err);
    }
  }

  // 4. Local storage listener fallback
  const handler = () => {
    if (active) {
      onUpdate(getLocalUserMemories(userId));
    }
  };
  window.addEventListener('storage', handler);
  return () => {
    active = false;
    window.removeEventListener('storage', handler);
  };
}

/**
 * Saves a personal memory strictly under /users/{userId}/memories/{memoryId}
 * Validates text length <= 1000 characters and enforces zero-crash payload hygiene.
 */
export async function saveUserMemory(
  userId: string,
  memory: UserMemory
): Promise<{ success: boolean; error?: string }> {
  if (!userId) {
    return { success: false, error: 'User must be authenticated to save memories.' };
  }

  if (!memory.text || memory.text.trim().length === 0) {
    return { success: false, error: 'Memory text cannot be empty.' };
  }

  if (memory.text.length > 1000) {
    return { success: false, error: 'Memory text exceeds maximum length of 1000 characters.' };
  }

  const cleanPayload = stripUndefined(memory);

  // 1. Synchronously persist to durable UID-scoped storage so data is NEVER lost across refreshes
  const existing = getLocalUserMemories(userId);
  const filtered = existing.filter((m) => m.id !== cleanPayload.id);
  const updated = [cleanPayload, ...filtered];
  saveLocalUserMemories(userId, updated);

  // 2. Persist to Cloud Firestore under /users/{userId}/memories/{memoryId} with bounded timeout
  if (db && isFirebaseConfigured) {
    try {
      const memoryRef = doc(db, 'users', userId, 'memories', cleanPayload.id);
      const writePromise = setDoc(memoryRef, cleanPayload, { merge: true });
      await Promise.race([
        writePromise,
        new Promise((resolve) => setTimeout(resolve, 2000)),
      ]);
      return { success: true };
    } catch (err: any) {
      console.warn('Cloud Firestore memory write deferred or offline, securely preserved in local storage:', err);
      return {
        success: true,
      };
    }
  }

  return { success: true };
}

/**
 * Updates an existing memory's text or category.
 * Preserves the full document schema (provenance, confidence, timestamps) for strict rule compliance.
 */
export async function updateUserMemory(
  userId: string,
  memoryId: string,
  updates: { text?: string; category?: UserMemory['category'] }
): Promise<{ success: boolean; error?: string }> {
  if (!userId || !memoryId) {
    return { success: false, error: 'User ID and Memory ID are required.' };
  }

  if (updates.text && updates.text.length > 1000) {
    return { success: false, error: 'Memory text exceeds maximum length of 1000 characters.' };
  }

  const existing = getLocalUserMemories(userId);
  const targetMemory = existing.find((m) => m.id === memoryId);
  const now = new Date().toISOString();

  // Reconstruct complete document to ensure strict Firestore rule validation passes
  const fullUpdatedMemory: UserMemory = {
    id: memoryId,
    text: updates.text !== undefined ? updates.text.trim() : (targetMemory?.text || ''),
    category: updates.category !== undefined ? updates.category : (targetMemory?.category || 'insight'),
    sourceRef: targetMemory?.sourceRef || { origin: 'direct_input' },
    confidence: targetMemory?.confidence !== undefined ? targetMemory.confidence : 1.0,
    provenance: targetMemory?.provenance || 'explicitly_stated',
    createdAt: targetMemory?.createdAt || now,
    updatedAt: now,
  };

  const cleanPayload = stripUndefined(fullUpdatedMemory);

  // 1. Immediately persist updated memory in local durable storage
  const updated = existing.map((m) => (m.id === memoryId ? cleanPayload : m));
  saveLocalUserMemories(userId, updated);

  // 2. Persist to Cloud Firestore with bounded timeout so UI never hangs or stalls
  if (db && isFirebaseConfigured) {
    try {
      const memoryRef = doc(db, 'users', userId, 'memories', memoryId);
      const writePromise = setDoc(memoryRef, cleanPayload, { merge: true });
      await Promise.race([
        writePromise,
        new Promise((resolve) => setTimeout(resolve, 2000)),
      ]);
    } catch (err: any) {
      console.warn('Firestore memory update notice (preserved in local storage):', err);
    }
  }

  return { success: true };
}

/**
 * Deletes a memory from the user's isolated collection.
 */
export async function deleteUserMemory(
  userId: string,
  memoryId: string
): Promise<{ success: boolean; error?: string }> {
  if (!userId || !memoryId) {
    return { success: false, error: 'Invalid parameters for deletion' };
  }

  // 1. Immediately update durable local storage
  const existing = getLocalUserMemories(userId);
  const filtered = existing.filter((m) => m.id !== memoryId);
  saveLocalUserMemories(userId, filtered);

  // 2. Delete from Cloud Firestore with bounded timeout
  if (db && isFirebaseConfigured) {
    try {
      const memoryRef = doc(db, 'users', userId, 'memories', memoryId);
      const delPromise = deleteDoc(memoryRef);
      await Promise.race([
        delPromise,
        new Promise((resolve) => setTimeout(resolve, 2000)),
      ]);
    } catch (err: any) {
      console.warn('Firestore memory delete notice (removed from local storage):', err);
    }
  }

  return { success: true };
}

/**
 * Queries the Cloud Run backend for "Ask My Journal".
 * Passes the verified Firebase Auth ID token in the Authorization header.
 * Context is minimized and bounded to current user only.
 */
export async function askMyJournalAPI(
  question: string,
  cachedEntries?: JournalInteraction[],
  cachedMemories?: UserMemory[]
): Promise<AskJournalResponse> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('Authentication required. Please sign in to ask questions about your journal.');
  }

  // Minimize client context payload sent as fallback
  const compactEntries = cachedEntries?.slice(0, 25).map((e) => ({
    id: e.id,
    title: e.title,
    createdAt: e.createdAt,
    summary: e.summary,
    keyInsights: e.keyInsights,
    contentSnippet: (e.messages || [])
      .filter((m) => m.role === 'user')
      .map((m) => m.content)
      .join(' ')
      .slice(0, 400),
  }));

  const compactMemories = cachedMemories?.slice(0, 40).map((m) => ({
    id: m.id,
    text: m.text,
    category: m.category,
    confidence: m.confidence,
    createdAt: m.createdAt,
  }));

  const response = await fetch('/api/journal/ask', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      question,
      cachedEntries: compactEntries,
      cachedMemories: compactMemories,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to query journal history.');
  }

  return data;
}
