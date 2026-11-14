import { getApps, initializeApp } from 'firebase/app';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import firebaseConfig from './firebase-applet-config.json';

const app = getApps().length > 0 ? getApps()[0]! : initializeApp(firebaseConfig);
export const storage = getStorage(app, `gs://${firebaseConfig.storageBucket}`);

export interface StorageUploadInput {
  documentId: string;
  version: number;
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
  checksumSha256: string;
  ownerType: string;
  confidentiality: string;
}

export interface StorageUploadResult {
  storageBucket: string;
  storageObjectPath: string;
  storageDownloadUrl: string | null;
  uploadedToCloudStorage: boolean;
}

/**
 * Uploads a document binary buffer to Firebase Cloud Storage (`lyrical-responder-8v0ns.firebasestorage.app`)
 * with SHA-256 custom metadata. Gracefully falls back to deterministic object coordinates if the
 * bucket requires interactive client token or is not yet initialized in the GCP console.
 */
export async function uploadBufferToFirebaseStorage(
  input: StorageUploadInput,
): Promise<StorageUploadResult> {
  const safeFileName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
  const storageObjectPath = `veris-documents/${input.ownerType.toLowerCase()}/${input.documentId}/v${input.version}-${safeFileName}`;
  const storageBucket = firebaseConfig.storageBucket;

  try {
    const objectRef = ref(storage, storageObjectPath);
    const snapshot = await uploadBytes(objectRef, input.bytes, {
      contentType: input.mimeType,
      customMetadata: {
        documentId: input.documentId,
        version: String(input.version),
        checksumSha256: input.checksumSha256,
        ownerType: input.ownerType,
        confidentiality: input.confidentiality,
      },
    });
    const downloadUrl = await getDownloadURL(snapshot.ref);
    return {
      storageBucket,
      storageObjectPath,
      storageDownloadUrl: downloadUrl,
      uploadedToCloudStorage: true,
    };
  } catch {
    return {
      storageBucket,
      storageObjectPath,
      storageDownloadUrl: null,
      uploadedToCloudStorage: false,
    };
  }
}
