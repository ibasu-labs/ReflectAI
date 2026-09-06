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
  getDocFromServer,
  deleteDoc,
  query,
  orderBy,
  where,
  onSnapshot,
  Firestore,
  Unsubscribe,
} from 'firebase/firestore';
import appletConfig from '../../firebase-applet-config.json';
import { JournalInteraction, UserProfile, UserMemory, AskJournalResponse } from '../types';
import { stripUndefined } from './sanitizer';

// Standard Firestore Error Diagnostic Interfaces per Firebase Skill Specification
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
      tenantId: auth?.currentUser?.tenantId || null,
      providerInfo:
        auth?.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Credentials from applet config with environment variable fallbacks
const firebaseConfig = {
  apiKey: appletConfig.apiKey || import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: appletConfig.authDomain || import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: appletConfig.projectId || import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: appletConfig.storageBucket || import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: appletConfig.messagingSenderId || import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: appletConfig.appId || import.meta.env.VITE_FIREBASE_APP_ID || '',
  firestoreDatabaseId: appletConfig.firestoreDatabaseId || '(default)',
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
    // Explicitly bind databaseId per Firebase Skill
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');
  } catch (err) {
    console.warn('Firebase initialization warning:', err);
  }
}

export { auth, db };

// Local cache keys (used only as secondary client cache, never to replace Firestore)
const LOCAL_STORAGE_KEY_PREFIX = 'reflectai_user_data_';
const LOCAL_STORAGE_MEMORIES_PREFIX = 'reflectai_user_memories_';
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
  if (!auth || !isFirebaseConfigured) {
    throw new Error('Firebase configuration is missing or incomplete.');
  }

  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    localStorage.removeItem(LOCAL_USER_SESSION_KEY);
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
    if (
      firebaseErr?.code === 'auth/popup-closed-by-user' ||
      firebaseErr?.code === 'auth/cancelled-popup-request'
    ) {
      throw new Error('Sign-in was cancelled. Please try again.');
    }

    // If popup was blocked by browser iframe / security policy
    if (
      firebaseErr?.code === 'auth/popup-blocked' ||
      firebaseErr?.message?.includes('popup-blocked')
    ) {
      const err: any = new Error(
        'The Google Sign-In popup was blocked by your browser or the preview iframe. Please allow popups or open the app in a new tab to authenticate.'
      );
      err.authCode = 'popup-blocked';
      throw err;
    }

    // If unauthorized domain
    if (firebaseErr?.code === 'auth/unauthorized-domain') {
      const currentHost =
        typeof window !== 'undefined' ? window.location.hostname : 'current domain';
      const err: any = new Error(
        `Domain not authorized: "${currentHost}" is not added to Firebase Authorized Domains. Add it in Firebase Console > Authentication > Settings > Authorized domains.`
      );
      err.authCode = 'unauthorized-domain';
      err.domain = currentHost;
      throw err;
    }

    if (firebaseErr?.code === 'auth/configuration-not-found') {
      const err: any = new Error(
        'Google Sign-In provider is not enabled in Firebase Console. Please enable Google in Firebase Console > Authentication > Sign-in method.'
      );
      err.authCode = 'configuration-not-found';
      throw err;
    }

    throw new Error(
      firebaseErr?.message || 'Failed to authenticate with Google Firebase Authentication.'
    );
  }
}

export function loginAsGuest(): UserProfile {
  const guestUser: UserProfile = {
    uid: 'local_guest_' + Math.random().toString(36).substring(2, 8),
    email: 'guest@reflectai.local',
    displayName: 'Guest Writer (Local Only)',
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
        // Clear any stale local guest session once real Firebase user signs in
        localStorage.removeItem(LOCAL_USER_SESSION_KEY);
        callback({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || 'Reflective Writer',
          photoURL: user.photoURL,
          isAnonymous: user.isAnonymous,
        });
      } else {
        // Check if an explicit local guest session is active
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

  // Fallback if Firebase is not configured
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
 * Requires active Firebase Authentication session matching the target userId.
 * Strips all undefined fields to enforce Zero-Crash Payload Hygiene.
 */
export async function saveJournalInteraction(
  userId: string,
  interaction: JournalInteraction
): Promise<{ success: boolean; error?: string; errorCode?: string }> {
  if (!userId) {
    return { success: false, error: 'User must be authenticated to save reflections.' };
  }

  const cleanPayload = stripUndefined(interaction);

  // Guarantee Firebase Auth is fully initialized before verifying credentials
  if (auth) {
    await auth.authStateReady();
  }

  // Verify Firebase Auth state
  if (!auth || !auth.currentUser) {
    // Keep local backup so user input is never lost in editor
    const existing = getLocalUserInteractions(userId);
    const filtered = existing.filter((item) => item.id !== cleanPayload.id);
    saveLocalUserInteractions(userId, [cleanPayload, ...filtered]);

    return {
      success: false,
      error: 'Firebase Authentication required: Sign In with Google to sync documents to Cloud Firestore.',
      errorCode: 'unauthenticated',
    };
  }

  // Security check: Active Firebase UID must match the target document path
  if (auth.currentUser.uid !== userId) {
    return {
      success: false,
      error: 'Security Error: Active Firebase UID does not match document owner.',
      errorCode: 'permission-denied',
    };
  }

  if (db && isFirebaseConfigured) {
    try {
      const interactionRef = doc(db, 'users', userId, 'interactions', cleanPayload.id);
      await setDoc(interactionRef, cleanPayload, { merge: true });

      // Keep local cache in sync with confirmed Firestore write
      const existing = getLocalUserInteractions(userId);
      const filtered = existing.filter((item) => item.id !== cleanPayload.id);
      saveLocalUserInteractions(userId, [cleanPayload, ...filtered]);

      return { success: true };
    } catch (err: any) {
      console.error('[Firestore write error /users/' + userId + '/interactions/' + cleanPayload.id + ']:', err);

      // Cache locally so active work in workspace is preserved
      const existing = getLocalUserInteractions(userId);
      const filtered = existing.filter((item) => item.id !== cleanPayload.id);
      saveLocalUserInteractions(userId, [cleanPayload, ...filtered]);

      const code = err?.code || 'error';
      const msg = err?.message || 'Database write error';
      try {
        handleFirestoreError(err, OperationType.WRITE, `users/${userId}/interactions/${cleanPayload.id}`);
      } catch {
        // Logged conforming to FirestoreErrorInfo
      }
      return {
        success: false,
        error: `Cloud Firestore error (${code}): ${msg}. Ensure firestore.rules are deployed in Firebase Console.`,
        errorCode: code,
      };
    }
  }

  return {
    success: false,
    error: 'Cloud Firestore is not configured or unavailable.',
    errorCode: 'not-configured',
  };
}

/**
 * Retrieves all reflections for a given authenticated user from Firestore.
 */
export async function fetchUserInteractions(userId: string): Promise<JournalInteraction[]> {
  if (!userId) return [];

  if (auth) {
    await auth.authStateReady();
  }

  // If authenticated with Firebase, read directly from Cloud Firestore
  if (auth && auth.currentUser && auth.currentUser.uid === userId && db && isFirebaseConfigured) {
    try {
      const collRef = collection(db, 'users', userId, 'interactions');
      const snapshot = await getDocs(collRef);
      const list: JournalInteraction[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as JournalInteraction);
      });
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      // Update local cache with source of truth from Firestore
      saveLocalUserInteractions(userId, list);
      return list;
    } catch (err: any) {
      console.error('[Firestore fetchUserInteractions error]:', err);
      throw err;
    }
  }

  return getLocalUserInteractions(userId);
}

/**
 * Subscribes to real-time interaction updates for the active user from Firestore.
 */
export function subscribeToUserInteractions(
  userId: string,
  onUpdate: (interactions: JournalInteraction[]) => void,
  onError?: (err: any) => void
): () => void {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  let active = true;
  let unsubFirestore: (() => void) | null = null;

  // Immediately surface local cache so UI is populated without delay
  onUpdate(getLocalUserInteractions(userId));

  // If Firebase is configured, verify auth state is fully initialized before attaching listener
  if (auth && db && isFirebaseConfigured) {
    auth.authStateReady().then(() => {
      if (!active) return;
      if (!auth.currentUser || auth.currentUser.uid !== userId) {
        // Unauthenticated or UID mismatch: do not query Cloud Firestore (fail closed)
        return;
      }

      try {
        const collRef = collection(db, 'users', userId, 'interactions');
        unsubFirestore = onSnapshot(
          collRef,
          (snapshot) => {
            if (!active) return;
            const list: JournalInteraction[] = [];
            snapshot.forEach((docSnap) => {
              list.push(docSnap.data() as JournalInteraction);
            });
            list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
            saveLocalUserInteractions(userId, list);
            onUpdate(list);
          },
          (error) => {
            console.error('[Firestore onSnapshot error on /users/' + userId + '/interactions]:', error);
            if (onError) {
              onError(error);
            }
            // Surface cached data on error so UI remains operable
            if (active) {
              onUpdate(getLocalUserInteractions(userId));
            }
            try {
              handleFirestoreError(error, OperationType.GET, `users/${userId}/interactions`);
            } catch (diagnosticErr) {
              // Error formatted and logged as FirestoreErrorInfo
            }
          }
        );
      } catch (err) {
        console.error('Could not establish Firestore subscription:', err);
        if (onError) {
          onError(err);
        }
      }
    });
  }

  const handler = () => {
    if (active) {
      onUpdate(getLocalUserInteractions(userId));
    }
  };
  window.addEventListener('storage', handler);

  return () => {
    active = false;
    if (unsubFirestore) {
      unsubFirestore();
    }
    window.removeEventListener('storage', handler);
  };
}

/**
 * Deletes an interaction from user's isolated document collection in Firestore.
 */
export async function deleteJournalInteraction(
  userId: string,
  interactionId: string
): Promise<{ success: boolean; error?: string }> {
  if (!userId || !interactionId) {
    return { success: false, error: 'Invalid parameters for deletion' };
  }

  if (auth) {
    await auth.authStateReady();
  }

  if (auth && auth.currentUser && auth.currentUser.uid === userId && db && isFirebaseConfigured) {
    try {
      const docRef = doc(db, 'users', userId, 'interactions', interactionId);
      await deleteDoc(docRef);
      const existing = getLocalUserInteractions(userId);
      const filtered = existing.filter((item) => item.id !== interactionId);
      saveLocalUserInteractions(userId, filtered);
      return { success: true };
    } catch (err: any) {
      console.error('[Firestore delete error]:', err);
      return {
        success: false,
        error: `Firestore delete error: ${err?.message || 'Failed to delete from Firestore'}`,
      };
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

  if (auth) {
    await auth.authStateReady();
  }

  // If authenticated with Firebase, read directly from Cloud Firestore
  if (auth && auth.currentUser && auth.currentUser.uid === userId && db && isFirebaseConfigured) {
    try {
      const collRef = collection(db, 'users', userId, 'memories');
      const snapshot = await getDocs(collRef);
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
  onUpdate: (memories: UserMemory[]) => void,
  onError?: (err: any) => void
): () => void {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  let active = true;
  let unsubFirestore: (() => void) | null = null;

  // 1. Immediately emit cached memories so memories survive page refresh without flicker
  const initialLocal = getLocalUserMemories(userId);
  onUpdate(initialLocal);

  // 2. Fetch and reconcile cloud documents if authenticated with Firebase
  if (auth && db && isFirebaseConfigured) {
    auth.authStateReady().then(() => {
      if (!active) return;
      if (!auth.currentUser || auth.currentUser.uid !== userId) {
        return;
      }

      fetchUserMemories(userId).then((list) => {
        if (active && list && list.length > 0) {
          onUpdate(list);
        }
      }).catch((err) => {
        console.warn('Initial fetchUserMemories error:', err);
        if (onError) onError(err);
      });

      // 3. Attach real-time onSnapshot listener
      try {
        const collRef = collection(db, 'users', userId, 'memories');
        unsubFirestore = onSnapshot(
          collRef,
          (snapshot) => {
            if (!active) return;
            const cloudList: UserMemory[] = [];
            snapshot.forEach((docSnap) => {
              cloudList.push(docSnap.data() as UserMemory);
            });
            cloudList.sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );

            saveLocalUserMemories(userId, cloudList);
            onUpdate(cloudList);
          },
          (error) => {
            console.error('[Firestore memories listener error on /users/' + userId + '/memories]:', error);
            if (onError) {
              onError(error);
            }
            if (active) {
              onUpdate(getLocalUserMemories(userId));
            }
            try {
              handleFirestoreError(error, OperationType.GET, `users/${userId}/memories`);
            } catch (diagnosticErr) {
              // Error formatted and logged as FirestoreErrorInfo
            }
          }
        );
      } catch (err) {
        console.error('Could not establish Firestore memories subscription:', err);
        if (onError) onError(err);
      }
    });
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
    if (unsubFirestore) {
      unsubFirestore();
    }
    window.removeEventListener('storage', handler);
  };
}

/**
 * Saves a personal memory strictly under /users/{userId}/memories/{memoryId}
 * Validates text length <= 1000 characters, schema compliance, and Firebase Auth session.
 */
export async function saveUserMemory(
  userId: string,
  memory: UserMemory
): Promise<{ success: boolean; error?: string; errorCode?: string }> {
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

  if (auth) {
    await auth.authStateReady();
  }

  // Verify Firebase Auth state
  if (!auth || !auth.currentUser) {
    // Keep local backup
    const existing = getLocalUserMemories(userId);
    const filtered = existing.filter((m) => m.id !== cleanPayload.id);
    saveLocalUserMemories(userId, [cleanPayload, ...filtered]);

    return {
      success: false,
      error: 'Firebase Authentication required: Sign In with Google to persist memories to Cloud Firestore.',
      errorCode: 'unauthenticated',
    };
  }

  if (auth.currentUser.uid !== userId) {
    return {
      success: false,
      error: 'Security Error: Active Firebase UID does not match memory owner.',
      errorCode: 'permission-denied',
    };
  }

  if (db && isFirebaseConfigured) {
    try {
      const memoryRef = doc(db, 'users', userId, 'memories', cleanPayload.id);
      await setDoc(memoryRef, cleanPayload, { merge: true });

      // Keep local cache in sync
      const existing = getLocalUserMemories(userId);
      const filtered = existing.filter((m) => m.id !== cleanPayload.id);
      saveLocalUserMemories(userId, [cleanPayload, ...filtered]);

      return { success: true };
    } catch (err: any) {
      console.error('[Firestore saveUserMemory error]:', err);
      const existing = getLocalUserMemories(userId);
      const filtered = existing.filter((m) => m.id !== cleanPayload.id);
      saveLocalUserMemories(userId, [cleanPayload, ...filtered]);

      const code = err?.code || 'error';
      const msg = err?.message || 'Failed to save memory to Cloud Firestore';
      try {
        handleFirestoreError(err, OperationType.WRITE, `users/${userId}/memories/${cleanPayload.id}`);
      } catch {
        // Logged conforming to FirestoreErrorInfo
      }
      return {
        success: false,
        error: `Cloud Firestore error (${code}): ${msg}. Ensure firestore.rules are deployed in Firebase Console.`,
        errorCode: code,
      };
    }
  }

  return {
    success: false,
    error: 'Cloud Firestore is not configured or unavailable.',
    errorCode: 'not-configured',
  };
}

/**
 * Updates an existing memory's text or category in Firestore.
 * Preserves the full document schema (provenance, confidence, timestamps) for strict rule compliance.
 */
export async function updateUserMemory(
  userId: string,
  memoryId: string,
  updates: { text?: string; category?: UserMemory['category'] }
): Promise<{ success: boolean; error?: string; errorCode?: string }> {
  if (!userId || !memoryId) {
    return { success: false, error: 'User ID and Memory ID are required.' };
  }

  if (updates.text && updates.text.length > 1000) {
    return { success: false, error: 'Memory text exceeds maximum length of 1000 characters.' };
  }

  if (auth) {
    await auth.authStateReady();
  }

  if (!auth || !auth.currentUser || auth.currentUser.uid !== userId) {
    return {
      success: false,
      error: 'Firebase Authentication required: Sign In with Google to modify Cloud Firestore memories.',
      errorCode: 'unauthenticated',
    };
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

  if (db && isFirebaseConfigured) {
    try {
      const memoryRef = doc(db, 'users', userId, 'memories', memoryId);
      await setDoc(memoryRef, cleanPayload, { merge: true });

      const updated = existing.map((m) => (m.id === memoryId ? cleanPayload : m));
      saveLocalUserMemories(userId, updated);

      return { success: true };
    } catch (err: any) {
      console.error('[Firestore updateUserMemory error]:', err);
      const code = err?.code || 'error';
      const msg = err?.message || 'Database write error';
      try {
        handleFirestoreError(err, OperationType.UPDATE, `users/${userId}/memories/${memoryId}`);
      } catch {
        // Logged conforming to FirestoreErrorInfo
      }
      return {
        success: false,
        error: `Firestore error (${code}): ${msg}`,
        errorCode: code,
      };
    }
  }

  return { success: false, error: 'Firestore is not configured.' };
}

/**
 * Deletes a memory from the user's isolated collection in Firestore.
 */
export async function deleteUserMemory(
  userId: string,
  memoryId: string
): Promise<{ success: boolean; error?: string; errorCode?: string }> {
  if (!userId || !memoryId) {
    return { success: false, error: 'Invalid parameters for deletion' };
  }

  if (auth) {
    await auth.authStateReady();
  }

  if (!auth || !auth.currentUser || auth.currentUser.uid !== userId) {
    return {
      success: false,
      error: 'Firebase Authentication required: Sign In with Google to delete memories from Cloud Firestore.',
      errorCode: 'unauthenticated',
    };
  }

  if (db && isFirebaseConfigured) {
    try {
      const memoryRef = doc(db, 'users', userId, 'memories', memoryId);
      await deleteDoc(memoryRef);

      const existing = getLocalUserMemories(userId);
      const filtered = existing.filter((m) => m.id !== memoryId);
      saveLocalUserMemories(userId, filtered);

      return { success: true };
    } catch (err: any) {
      console.error('[Firestore deleteUserMemory error]:', err);
      const code = err?.code || 'error';
      const msg = err?.message || 'Failed to delete from Firestore';
      try {
        handleFirestoreError(err, OperationType.DELETE, `users/${userId}/memories/${memoryId}`);
      } catch {
        // Logged conforming to FirestoreErrorInfo
      }
      return {
        success: false,
        error: `Firestore error (${code}): ${msg}`,
        errorCode: code,
      };
    }
  }

  return { success: false, error: 'Firestore is not configured.' };
}

/**
 * Diagnostic utility to verify active Firestore connectivity, authentication, and rules.
 * Writes a probe document to /users/{userId}/interactions/_connectivity_probe, reads it back, and cleans it up.
 */
export async function verifyFirestorePersistence(userId: string): Promise<{
  success: boolean;
  message: string;
  latencyMs?: number;
  errorCode?: string;
  details?: Record<string, any>;
}> {
  if (!isFirebaseConfigured) {
    return {
      success: false,
      message: 'Firebase configuration is missing in environment variables (VITE_FIREBASE_*).',
      errorCode: 'missing_config',
    };
  }

  if (auth) {
    await auth.authStateReady();
  }

  if (!auth || !auth.currentUser) {
    return {
      success: false,
      message: 'User is not signed in to Firebase. Sign in with Google to test Cloud Firestore persistence.',
      errorCode: 'unauthenticated',
    };
  }

  if (auth.currentUser.uid !== userId) {
    return {
      success: false,
      message: 'Client UID mismatch: Authenticated UID does not match test target.',
      errorCode: 'uid_mismatch',
    };
  }

  if (!db) {
    return {
      success: false,
      message: 'Firestore database client is not initialized.',
      errorCode: 'no_db',
    };
  }

  const startTime = Date.now();
  const probeId = `_probe_${Date.now()}`;
  const probeRef = doc(db, 'users', userId, 'interactions', probeId);
  const probeData = {
    id: probeId,
    timestamp: new Date().toISOString(),
    userInput: 'Diagnostic probe testing Firestore connectivity',
    geminiResponse: 'Connectivity check passed.',
    perspective: 'First-Person',
    depth: 'Diagnostic',
    createdAt: new Date().toISOString(),
    isProbe: true,
  };

  try {
    // 1. Test Write
    await setDoc(probeRef, probeData);

    // 2. Test Read Back
    const readBack = await getDoc(probeRef);
    if (!readBack.exists()) {
      return {
        success: false,
        message: 'Write appeared to succeed, but document was not found on read-back.',
        errorCode: 'read_back_failed',
      };
    }

    // 3. Clean up probe
    await deleteDoc(probeRef);

    const latencyMs = Date.now() - startTime;
    return {
      success: true,
      message: `Firestore round-trip verified successfully in ${latencyMs}ms at /users/${userId}/interactions/${probeId}.`,
      latencyMs,
      details: {
        projectId: firebaseConfig.projectId,
        uid: userId,
        path: `users/${userId}/interactions/${probeId}`,
      },
    };
  } catch (err: any) {
    console.error('[Firestore Diagnostic Error]:', err);
    return {
      success: false,
      message: `Firestore persistence check failed: [${err?.code || 'error'}] ${err?.message || 'Unknown database error'}.`,
      errorCode: err?.code || 'error',
      details: {
        projectId: firebaseConfig.projectId,
        uid: userId,
      },
    };
  }
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
    location: e.location
      ? {
          displayName: e.location.displayName,
          address: e.location.address,
          latitude: e.location.latitude,
          longitude: e.location.longitude,
        }
      : undefined,
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
