import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut as firebaseSignOut
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  orderBy,
  deleteDoc,
  serverTimestamp,
  getDocFromServer
} from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";
import { BusinessProfile, SavedCalendar } from "./types";

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firestore (Critical: DatabaseID is specified in config)
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Provider with required calendar and identity scopes
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope("https://www.googleapis.com/auth/calendar.events");
googleProvider.addScope("https://www.googleapis.com/auth/userinfo.profile");
googleProvider.addScope("https://www.googleapis.com/auth/userinfo.email");

// Auth states & Caching (In-memory access token)
let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Firestore error handler conforming to requirements
export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
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

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test Connection on Boot (Required constraint)
export async function testConnection() {
  try {
    // Attempting a read to dummy connection path to verify client status
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error: any) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.error("Please check your Firebase configuration. Client is offline.");
    }
  }
}
testConnection();

// Set up Auth state listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // If we don't have token cached yet, sign-out or let dashboard trigger credentials popup
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Sign in via Popup (returns user and access token)
export const signInWithGoogle = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Gagal memperoleh access token dari Autentikasi Google.");
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error("Sign in error:", error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Log Out
export const logoutUser = async () => {
  try {
    await firebaseSignOut(auth);
    cachedAccessToken = null;
  } catch (error) {
    console.error("Logout error:", error);
  }
};

// Getter for in-memory token
export const getCachedAccessToken = (): string | null => {
  return cachedAccessToken;
};

// --- Firestore Business Profile Operations ---
const PATH_BUSINESSES = "businesses";

export const saveBusinessProfile = async (profile: Omit<BusinessProfile, "userId" | "createdAt">): Promise<void> => {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error("Akses ditolak. Pengguna tidak terautentikasi.");

  const docId = profile.id;
  try {
    await setDoc(doc(db, PATH_BUSINESSES, docId), {
      ...profile,
      userId,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${PATH_BUSINESSES}/${docId}`);
  }
};

export const loadBusinessProfiles = async (): Promise<BusinessProfile[]> => {
  const userId = auth.currentUser?.uid;
  if (!userId) return [];

  try {
    const q = query(
      collection(db, PATH_BUSINESSES),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        userId: data.userId,
        productName: data.productName,
        targetAudience: data.targetAudience,
        businessCategory: data.businessCategory,
        tone: data.tone,
        createdAt: data.createdAt?.toDate() || new Date()
      } as BusinessProfile;
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, PATH_BUSINESSES);
    return [];
  }
};

// --- Firestore Calendar Planners Operations ---
const PATH_CALENDARS = "calendars";

export const saveCalendar = async (calendar: Omit<SavedCalendar, "userId" | "createdAt">): Promise<void> => {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error("Akses ditolak. Pengguna tidak terautentikasi.");

  const docId = calendar.id;
  try {
    await setDoc(doc(db, PATH_CALENDARS, docId), {
      ...calendar,
      userId,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${PATH_CALENDARS}/${docId}`);
  }
};

export const loadSavedCalendars = async (): Promise<SavedCalendar[]> => {
  const userId = auth.currentUser?.uid;
  if (!userId) return [];

  try {
    const q = query(
      collection(db, PATH_CALENDARS),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        userId: data.userId,
        productName: data.productName,
        targetAudience: data.targetAudience,
        businessCategory: data.businessCategory,
        tone: data.tone,
        items: data.items,
        createdAt: data.createdAt?.toDate()?.toISOString() || new Date().toISOString()
      } as SavedCalendar;
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, PATH_CALENDARS);
    return [];
  }
};

export const deleteCalendarProfile = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, PATH_CALENDARS, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${PATH_CALENDARS}/${id}`);
  }
};
