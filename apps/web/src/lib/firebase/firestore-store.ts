import { getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore, type Firestore } from 'firebase-admin/firestore';
import firebaseConfig from './firebase-applet-config.json';

let cachedDb: Firestore | null | undefined;

export function getAdminFirestore(): Firestore | null {
  if (cachedDb !== undefined) return cachedDb;
  if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
    cachedDb = null;
    return null;
  }
  try {
    const app =
      getApps().length > 0
        ? getApps()[0]!
        : initializeApp({
            projectId: firebaseConfig.projectId,
          });
    cachedDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    return cachedDb;
  } catch {
    cachedDb = null;
    return null;
  }
}

export interface PersistedDomainBundle {
  tenants: Array<{ id: string; [key: string]: unknown }>;
  issuances: Array<{ id: string; [key: string]: unknown }>;
  investors: Array<{ id: string; [key: string]: unknown }>;
  subscriptions: Array<{ id: string; [key: string]: unknown }>;
  positions: Array<{ id: string; [key: string]: unknown }>;
  ledgerEntries: Array<{ id: string; [key: string]: unknown }>;
  distributions: Array<{ id: string; [key: string]: unknown }>;
  transfers: Array<{ id: string; [key: string]: unknown }>;
  auditEvents: Array<{ id: string; [key: string]: unknown }>;
  allocationRounds: Array<{ id: string; [key: string]: unknown }>;
  kycCases: Array<{ id: string; [key: string]: unknown }>;
  notifications: Array<{ id: string; [key: string]: unknown }>;
  documents: Array<{ id: string; [key: string]: unknown }>;
  exportsList: Array<{ id: string; [key: string]: unknown }>;
  transitions: Record<string, unknown[]>;
  subscriptionPayments: Record<string, unknown>;
  issuanceInvitations: Record<string, unknown[]>;
  investorPeople: Record<string, { representatives: unknown[]; beneficialOwners: unknown[]; comments: unknown[] }>;
  customUsers: Array<{
    id: string;
    email: string;
    name: string;
    role: string;
    tenant: 'northwind' | 'contoso' | null;
    locale: 'en-GB' | 'fr-FR';
    status?: 'ACTIVE' | 'INACTIVE';
  }>;
  userInvitations: Array<{ id: string; [key: string]: unknown }>;
}

let seededInProcess = false;

function replaceArrayInPlace<T>(target: T[], source: unknown): void {
  if (Array.isArray(source) && source.length > 0) {
    target.splice(0, target.length, ...(source as T[]));
  }
}

function mergeRecordInPlace(target: Record<string, unknown>, source: unknown): void {
  if (source && typeof source === 'object' && !Array.isArray(source)) {
    Object.assign(target, source);
  }
}

/**
 * Synchronizes the initial Veris Assets dataset and any runtime mutations
 * with the provisioned Cloud Firestore database (`domainSnapshots` and entity collections).
 */
export async function ensureFirestoreSeeded(seedBundle: PersistedDomainBundle): Promise<void> {
  if (seededInProcess) return;
  const db = getAdminFirestore();
  if (!db) return;
  seededInProcess = true;

  try {
    const snapshotRef = db.collection('domainSnapshots').doc('veris-core-state');
    const docSnap = await snapshotRef.get();
    if (!docSnap.exists) {
      await persistDomainStateToFirestore(seedBundle);
    } else {
      const data = docSnap.data();
      if (data && typeof data.payloadJson === 'string') {
        try {
          const parsed = JSON.parse(data.payloadJson) as Partial<PersistedDomainBundle>;
          replaceArrayInPlace(seedBundle.tenants, parsed.tenants);
          replaceArrayInPlace(seedBundle.issuances, parsed.issuances);
          replaceArrayInPlace(seedBundle.investors, parsed.investors);
          replaceArrayInPlace(seedBundle.subscriptions, parsed.subscriptions);
          replaceArrayInPlace(seedBundle.positions, parsed.positions);
          replaceArrayInPlace(seedBundle.ledgerEntries, parsed.ledgerEntries);
          replaceArrayInPlace(seedBundle.distributions, parsed.distributions);
          replaceArrayInPlace(seedBundle.transfers, parsed.transfers);
          replaceArrayInPlace(seedBundle.auditEvents, parsed.auditEvents);
          replaceArrayInPlace(seedBundle.allocationRounds, parsed.allocationRounds);
          replaceArrayInPlace(seedBundle.kycCases, parsed.kycCases);
          replaceArrayInPlace(seedBundle.notifications, parsed.notifications);
          replaceArrayInPlace(seedBundle.documents, parsed.documents);
          replaceArrayInPlace(seedBundle.exportsList, parsed.exportsList);
          replaceArrayInPlace(seedBundle.userInvitations, parsed.userInvitations);
          mergeRecordInPlace(seedBundle.transitions, parsed.transitions);
          mergeRecordInPlace(seedBundle.subscriptionPayments, parsed.subscriptionPayments);
          mergeRecordInPlace(seedBundle.issuanceInvitations, parsed.issuanceInvitations);
          mergeRecordInPlace(seedBundle.investorPeople, parsed.investorPeople);

          if (Array.isArray(parsed.customUsers)) {
            for (const customUser of parsed.customUsers) {
              if (!seedBundle.customUsers.some((u) => u.email === customUser.email)) {
                seedBundle.customUsers.push(customUser);
              }
            }
          }
        } catch {
          // Keep in-memory seed if JSON parsing fails
        }
      }
    }
  } catch {
    // Gracefully continue with in-memory state if Firestore Admin RPC is unreachable
  }
}

export async function persistDomainStateToFirestore(bundle: PersistedDomainBundle): Promise<void> {
  const db = getAdminFirestore();
  if (!db) return;
  try {
    await db
      .collection('domainSnapshots')
      .doc('veris-core-state')
      .set({
        id: 'veris-core-state',
        collection: 'issuances',
        payloadJson: JSON.stringify(bundle),
        updatedAt: FieldValue.serverTimestamp(),
      });

    // Also mirror primary domain collections as individual Firestore documents
    const batch = db.batch();
    let opCount = 0;
    const collectionsToMirror: Array<[string, Array<{ id: string; [key: string]: unknown }>]> = [
      ['tenants', bundle.tenants],
      ['issuances', bundle.issuances],
      ['investors', bundle.investors],
      ['subscriptions', bundle.subscriptions],
      ['positions', bundle.positions],
      ['ledger', bundle.ledgerEntries],
      ['distributions', bundle.distributions],
      ['transfers', bundle.transfers],
      ['documents', bundle.documents],
      ['auditEvents', bundle.auditEvents.slice(0, 50)],
    ];

    for (const [colName, items] of collectionsToMirror) {
      for (const item of items) {
        if (item.id && opCount < 450) {
          batch.set(db.collection(colName).doc(item.id), {
            ...item,
            syncedAt: FieldValue.serverTimestamp(),
          });
          opCount += 1;
        }
      }
    }
    if (opCount > 0) {
      await batch.commit();
    }
  } catch {
    // Non-blocking persistence fallback
  }
}
