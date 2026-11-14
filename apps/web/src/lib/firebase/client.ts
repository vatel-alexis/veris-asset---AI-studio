import { getApps, initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  getAuth,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import {
  doc,
  getDocFromServer,
  getFirestore,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

const app = getApps().length > 0 ? getApps()[0]! : initializeApp(firebaseConfig);

export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

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
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData.map((provider) => ({
          providerId: provider.providerId,
          displayName: provider.displayName,
          email: provider.email,
          photoUrl: provider.photoURL,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

let connectionTested = false;

export async function testFirestoreConnection(): Promise<void> {
  if (typeof window === 'undefined' || connectionTested) return;
  connectionTested = true;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

if (typeof window !== 'undefined') {
  void testFirestoreConnection();
}

/**
 * Persists the authenticated user's public profile (/users/{uid}) and isolated PII
 * (/users/{uid}/private/contact) in Firestore adhering to the Eight Pillars rules.
 */
export async function syncFirebaseUserProfile(
  user: User,
  locale: 'en-GB' | 'fr-FR' = 'fr-FR',
): Promise<void> {
  if (!user.emailVerified) return;
  const userPath = `users/${user.uid}`;
  const privatePath = `users/${user.uid}/private/contact`;
  const isBootstrappedAdmin = user.email === 'vatelalexis@gmail.com';
  const role = isBootstrappedAdmin ? 'ISSUER_ADMIN' : 'INVESTOR';

  try {
    await setDoc(
      doc(db, 'users', user.uid),
      {
        uid: user.uid,
        displayName: (user.displayName || user.email?.split('@')[0] || 'Veris User').slice(0, 120),
        role,
        tenant: 'northwind',
        locale,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: false },
    );
  } catch {
    // Profile may already exist; attempt allowed update fields only
    try {
      await setDoc(
        doc(db, 'users', user.uid),
        {
          displayName: (user.displayName || user.email?.split('@')[0] || 'Veris User').slice(0, 120),
          locale,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    } catch {
      void userPath;
    }
  }

  if (user.email) {
    try {
      await setDoc(
        doc(db, 'users', user.uid, 'private', 'contact'),
        {
          ownerId: user.uid,
          email: user.email.slice(0, 254),
          phone: (user.phoneNumber || '').slice(0, 40),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: false },
      );
    } catch {
      try {
        await setDoc(
          doc(db, 'users', user.uid, 'private', 'contact'),
          {
            email: user.email.slice(0, 254),
            phone: (user.phoneNumber || '').slice(0, 40),
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      } catch {
        void privatePath;
      }
    }
  }

  void errorReference;
}

function errorReference() {
  return handleFirestoreError;
}

export async function signInWithGooglePopup(locale: 'en-GB' | 'fr-FR' = 'fr-FR'): Promise<User> {
  const credential = await signInWithPopup(auth, googleProvider);
  await syncFirebaseUserProfile(credential.user, locale);
  return credential.user;
}

export async function signOutFromFirebase(): Promise<void> {
  try {
    await firebaseSignOut(auth);
  } catch {
    // Ignore client sign-out errors if no Firebase session is active
  }
}
