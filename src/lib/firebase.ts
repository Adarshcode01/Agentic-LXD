import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  getDocs,
  collection,
  query,
  where,
  getDocFromServer
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Course } from '../types/lms';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error: any) {
    // Non-blocking background health check
    console.debug('Firestore connection status:', error?.code || error?.message || error);
  }
}

// Call on startup
testFirestoreConnection();

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
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// User Profile sync helper
export async function syncUserProfile(user: User) {
  if (!user) return;
  try {
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      userId: user.uid,
      email: user.email || 'anonymous@user.app',
      displayName: user.displayName || (user.isAnonymous ? 'Guest Instructional Designer' : 'Instructor'),
      photoURL: user.photoURL || '',
      createdAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.warn('Could not sync user profile to Firestore:', err);
  }
}

// Course persistence helpers
export async function saveCourseToFirestore(course: Course, userId: string): Promise<boolean> {
  if (!userId || !course?.id) return false;
  try {
    const safeId = course.id.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 120);
    const courseRef = doc(db, 'courses', safeId);
    await setDoc(courseRef, {
      ...course,
      id: safeId,
      ownerId: userId,
      title: (course.title || 'Untitled Course').slice(0, 255),
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (err) {
    console.warn('Could not save course to Firestore:', err);
    return false;
  }
}

export async function loadCoursesFromFirestore(userId: string): Promise<Course[]> {
  if (!userId) return [];
  try {
    const coursesRef = collection(db, 'courses');
    const q = query(coursesRef, where('ownerId', '==', userId));
    const snapshot = await getDocs(q);
    const results: Course[] = [];
    snapshot.forEach(docSnap => {
      results.push(docSnap.data() as Course);
    });
    return results;
  } catch (err) {
    console.warn('Could not load courses from Firestore:', err);
    return [];
  }
}

// Auth helpers
export async function loginWithGoogle(): Promise<User | null> {
  try {
    const res = await signInWithPopup(auth, googleProvider);
    if (res.user) {
      await syncUserProfile(res.user);
    }
    return res.user;
  } catch (err: any) {
    console.error('Google Sign In failed:', err);
    throw err;
  }
}

export async function loginAnonymously(): Promise<User | null> {
  try {
    const res = await signInAnonymously(auth);
    if (res.user) {
      await syncUserProfile(res.user);
    }
    return res.user;
  } catch (err: any) {
    // If anonymous auth is disabled on the Firebase project, return null without throwing
    console.warn('Anonymous sign-in unavailable or restricted (auth/admin-restricted-operation); continuing in guest mode.');
    return null;
  }
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}
