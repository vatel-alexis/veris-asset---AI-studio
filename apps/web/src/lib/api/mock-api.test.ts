import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCurrentUserFromEmail,
  getDomainBundleForFirestore,
  handleMockApiRequest,
} from './mock-api';

test('demo-accounts endpoint returns all 12 demo accounts and demo password', () => {
  const res = handleMockApiRequest(
    'GET',
    '/api/v1/auth/demo-accounts',
    new URLSearchParams(),
    undefined,
  );
  assert.equal(res.status, 200);
  const body = res.body as { password: string; accounts: { email: string }[] };
  assert.equal(body.password, 'DemoPassword!2026');
  assert.equal(body.accounts.length, 12);
});

test('sign-in sets demo cookie and /auth/me resolves user permissions and portal', () => {
  const signIn = handleMockApiRequest(
    'POST',
    '/api/v1/auth/sign-in',
    new URLSearchParams(),
    undefined,
    { email: 'northwind.admin1@example.com', password: 'DemoPassword!2026' },
  );
  assert.equal(signIn.status, 200);
  assert.ok(signIn.setCookie?.includes('northwind.admin1%40example.com'));

  const user = buildCurrentUserFromEmail('northwind.admin1@example.com');
  assert.ok(user);
  assert.equal(user.homePortal, 'issuer');
  assert.equal(user.permissions['issuance:read'], 'all');
  assert.equal(user.permissions['report:read'], 'all');
});

test('firebase-sign-in registers Google user and grants multi-portal access to bootstrapped admin', () => {
  const signIn = handleMockApiRequest(
    'POST',
    '/api/v1/auth/firebase-sign-in',
    new URLSearchParams(),
    undefined,
    {
      email: 'vatelalexis@gmail.com',
      name: 'Alexis Vatel',
      uid: 'firebase-uid-alexis-001',
    },
  );
  assert.equal(signIn.status, 200);
  assert.ok(signIn.setCookie?.includes('vatelalexis%40gmail.com'));

  const user = buildCurrentUserFromEmail('vatelalexis@gmail.com');
  assert.ok(user);
  assert.equal(user.user.name, 'Alexis Vatel');
  assert.deepEqual(user.portals, ['issuer', 'platform', 'investor']);

  const bundle = getDomainBundleForFirestore();
  assert.ok(bundle.customUsers.some((u) => u.email === 'vatelalexis@gmail.com'));
});

test('issuances and dashboard endpoints return seeded demo data', () => {
  const issuances = handleMockApiRequest(
    'GET',
    '/api/v1/issuances',
    new URLSearchParams(),
    'northwind.admin1@example.com',
  );
  assert.equal(issuances.status, 200);
  const list = issuances.body as { data: { code: string }[]; meta: { total: number } };
  assert.equal(list.meta.total, 5);
  assert.equal(list.data[0]?.code, 'NWSD26');

  const dashboard = handleMockApiRequest(
    'GET',
    '/api/v1/dashboard',
    new URLSearchParams(),
    'northwind.admin1@example.com',
  );
  assert.equal(dashboard.status, 200);
  const d = dashboard.body as { administered: Record<string, string> };
  assert.equal(d.administered.EUR, '2300000.00');
});

test('end-to-end issuance, subscription, allocation, ledger SHA-256 chain, payment & OTC transfer workflow', () => {
  const actorEmail = 'northwind.admin1@example.com';

  // 1. Create a new draft issuance
  const createRes = handleMockApiRequest(
    'POST',
    '/api/v1/issuances',
    new URLSearchParams(),
    actorEmail,
    { name: 'Obligations Vertes 2027', code: 'OBV27' },
  );
  assert.equal(createRes.status, 201);
  const issuance = createRes.body as { id: string; status: string; code: string };
  assert.equal(issuance.status, 'DRAFT');
  assert.equal(issuance.code, 'OBV27');

  // 2. Patch terms and submit -> approve -> open-subscription
  const patchTerms = handleMockApiRequest(
    'PATCH',
    `/api/v1/issuances/${issuance.id}/terms`,
    new URLSearchParams(),
    actorEmail,
    { nominalValue: '1000.00', targetAmount: '1000000.00', totalUnits: '1000' },
  );
  assert.equal(patchTerms.status, 200);

  assert.equal(
    handleMockApiRequest(
      'POST',
      `/api/v1/issuances/${issuance.id}/submit`,
      new URLSearchParams(),
      actorEmail,
    ).status,
    200,
  );
  assert.equal(
    handleMockApiRequest(
      'POST',
      `/api/v1/issuances/${issuance.id}/approve`,
      new URLSearchParams(),
      actorEmail,
      { comment: 'Approved by committee' },
    ).status,
    200,
  );
  const openSubRes = handleMockApiRequest(
    'POST',
    `/api/v1/issuances/${issuance.id}/open-subscription`,
    new URLSearchParams(),
    actorEmail,
  );
  assert.equal(openSubRes.status, 200);
  assert.equal((openSubRes.body as { status: string }).status, 'SUBSCRIPTION_OPEN');

  // 3. Create subscription -> submit -> start-review -> approve
  const subRes = handleMockApiRequest(
    'POST',
    '/api/v1/subscriptions',
    new URLSearchParams(),
    actorEmail,
    {
      issuanceId: issuance.id,
      investorId: '30000000-0000-4000-8000-000000000001',
      requestedAmount: '300000.00',
    },
  );
  assert.equal(subRes.status, 201);
  const sub = subRes.body as { id: string; requestedUnits: string };
  assert.equal(sub.requestedUnits, '300');

  assert.equal(
    handleMockApiRequest(
      'POST',
      `/api/v1/subscriptions/${sub.id}/submit`,
      new URLSearchParams(),
      actorEmail,
      { acknowledgements: { riskWarningAccepted: true } },
    ).status,
    200,
  );
  assert.equal(
    handleMockApiRequest(
      'POST',
      `/api/v1/subscriptions/${sub.id}/start-review`,
      new URLSearchParams(),
      actorEmail,
    ).status,
    200,
  );
  const approveSub = handleMockApiRequest(
    'POST',
    `/api/v1/subscriptions/${sub.id}/approve`,
    new URLSearchParams(),
    actorEmail,
    { comment: 'Dossier complet' },
  );
  assert.equal(approveSub.status, 200);
  assert.equal((approveSub.body as { status: string }).status, 'APPROVED');

  // 4. Close subscriptions -> Create allocation round -> Propose -> Validate (mints position & SHA-256 ledger)
  assert.equal(
    handleMockApiRequest(
      'POST',
      `/api/v1/issuances/${issuance.id}/close-subscription`,
      new URLSearchParams(),
      actorEmail,
    ).status,
    200,
  );
  const allocRoundRes = handleMockApiRequest(
    'POST',
    `/api/v1/issuances/${issuance.id}/allocation-rounds`,
    new URLSearchParams(),
    actorEmail,
    { mode: 'PRO_RATA' },
  );
  assert.equal(allocRoundRes.status, 201);
  const round = allocRoundRes.body as { id: string; lines: { allocatedUnits: string }[] };
  assert.equal(round.lines.length, 1);
  assert.equal(round.lines[0]?.allocatedUnits, '300');

  assert.equal(
    handleMockApiRequest(
      'POST',
      `/api/v1/allocations/${round.id}/propose`,
      new URLSearchParams(),
      actorEmail,
    ).status,
    200,
  );
  const validateRes = handleMockApiRequest(
    'POST',
    `/api/v1/allocations/${round.id}/validate`,
    new URLSearchParams(),
    actorEmail,
  );
  assert.equal(validateRes.status, 200);
  assert.equal((validateRes.body as { status: string }).status, 'VALIDATED');

  // Verify ledger entries (ISSUANCE + ALLOCATION) and blocked position before payment confirmation
  const ledgerRes = handleMockApiRequest(
    'GET',
    `/api/v1/ledger`,
    new URLSearchParams({ issuanceId: issuance.id }),
    actorEmail,
  );
  assert.equal(ledgerRes.status, 200);
  const ledgerList = (
    ledgerRes.body as {
      data: { type: string; entryHash: string; previousHash: string; quantity: string }[];
    }
  ).data;
  assert.equal(ledgerList.length, 2);
  assert.equal(ledgerList[0]?.type, 'ISSUANCE');
  assert.equal(ledgerList[0]?.quantity, '1000');
  assert.equal(ledgerList[1]?.type, 'ALLOCATION');
  assert.equal(ledgerList[1]?.quantity, '300');
  assert.equal(ledgerList[1]?.previousHash, ledgerList[0]?.entryHash);
  assert.equal(ledgerList[1]?.entryHash.length, 64);

  // 5. Prepare & confirm payment -> unblocks units in position
  assert.equal(
    handleMockApiRequest(
      'POST',
      `/api/v1/subscriptions/${sub.id}/payment/prepare`,
      new URLSearchParams(),
      actorEmail,
      {
        status: 'RECEIVED',
        receivedAmount: '300000.00',
        receivedAt: '2026-11-14',
        bankReference: 'VIR-SEPA-2026-999',
      },
    ).status,
    200,
  );
  const confirmPay = handleMockApiRequest(
    'POST',
    `/api/v1/subscriptions/${sub.id}/payment/confirm`,
    new URLSearchParams(),
    actorEmail,
  );
  assert.equal(confirmPay.status, 200);
  assert.equal((confirmPay.body as { status: string }).status, 'CONFIRMED');

  // Verify position is now unblocked (300 available, 0 blocked)
  const positionsRes = handleMockApiRequest(
    'GET',
    `/api/v1/issuances/${issuance.id}/positions`,
    new URLSearchParams(),
    actorEmail,
  );
  const positions = (
    positionsRes.body as { data: { quantityAvailable: string; quantityBlocked: string }[] }
  ).data;
  assert.equal(positions[0]?.quantityAvailable, '300');
  assert.equal(positions[0]?.quantityBlocked, '0');

  // 6. Create OTC transfer -> Submit (blocks units) -> Approve transfer (transfers units & records SHA-256 ledger entry)
  const transferRes = handleMockApiRequest(
    'POST',
    '/api/v1/transfers',
    new URLSearchParams(),
    actorEmail,
    {
      issuanceId: issuance.id,
      recipientCode: 'INV-LUMEN01',
      quantity: '100',
      indicativePrice: '1015.00',
    },
  );
  assert.equal(transferRes.status, 201);
  const transfer = transferRes.body as { id: string; status: string };
  assert.equal(transfer.status, 'DRAFT');

  const submitTransfer = handleMockApiRequest(
    'POST',
    `/api/v1/transfers/${transfer.id}/submit`,
    new URLSearchParams(),
    actorEmail,
  );
  assert.equal(submitTransfer.status, 200);
  assert.equal((submitTransfer.body as { status: string }).status, 'COMPLIANCE_REVIEW');

  const execTransfer = handleMockApiRequest(
    'POST',
    `/api/v1/transfers/${transfer.id}/approve`,
    new URLSearchParams(),
    actorEmail,
    { comment: 'Compliance cleared' },
  );
  assert.equal(execTransfer.status, 200);
  assert.equal((execTransfer.body as { status: string }).status, 'EXECUTED');

  // Verify ledger now has 5 entries (ISSUANCE -> ALLOCATION -> UNBLOCK -> BLOCK -> TRANSFER) chained by SHA-256 hash
  const ledgerAfterTransfer = (
    handleMockApiRequest(
      'GET',
      `/api/v1/ledger`,
      new URLSearchParams({ issuanceId: issuance.id }),
      actorEmail,
    ).body as {
      data: { sequenceNo: number; previousHash: string; entryHash: string; type: string }[];
    }
  ).data;
  assert.equal(ledgerAfterTransfer.length, 5);
  assert.equal(ledgerAfterTransfer[4]?.type, 'TRANSFER');
  for (let i = 1; i < ledgerAfterTransfer.length; i++) {
    assert.equal(ledgerAfterTransfer[i]?.previousHash, ledgerAfterTransfer[i - 1]?.entryHash);
  }
});

test('Firebase App Hosting and veris-assets.com custom domain configuration & verification workflow', () => {
  const actorEmail = 'northwind.admin1@example.com';

  const getHosting = handleMockApiRequest(
    'GET',
    '/api/v1/platform/hosting',
    new URLSearchParams(),
    actorEmail,
  );
  assert.equal(getHosting.status, 200);
  const hosting = getHosting.body as {
    projectId: string;
    firestoreDatabaseId: string;
    customDomain: string;
    dnsRecords: { type: string; host: string; value: string }[];
  };
  assert.equal(hosting.projectId, 'lyrical-responder-8v0ns');
  assert.equal(
    hosting.firestoreDatabaseId,
    'ai-studio-verisassets-ada71c71-7f25-4c33-b48c-42e784996aee',
  );
  assert.equal(hosting.customDomain, 'veris-assets.com');
  assert.equal(hosting.dnsRecords.length, 3);
  assert.equal(hosting.dnsRecords[0]?.type, 'A');

  const verifyRes = handleMockApiRequest(
    'POST',
    '/api/v1/platform/hosting/verify',
    new URLSearchParams(),
    actorEmail,
    { customDomain: 'veris-assets.com' },
  );
  assert.equal(verifyRes.status, 200);
  const verified = verifyRes.body as {
    ok: boolean;
    domainStatus: string;
    sslCertificateStatus: string;
    firestoreConnected: boolean;
  };
  assert.equal(verified.ok, true);
  assert.equal(verified.domainStatus, 'ACTIVE_SSL_PROVISIONED');
  assert.equal(verified.sslCertificateStatus, 'ACTIVE');
  assert.equal(verified.firestoreConnected, true);
});

test('Firebase Cloud Storage document vault upload, SHA-256 checksum, versioning & download workflow', () => {
  const actorEmail = 'northwind.admin1@example.com';

  // 1. Seeded documents list includes institutional PDFs with SHA-256 checksums
  const listRes = handleMockApiRequest(
    'GET',
    '/api/v1/documents',
    new URLSearchParams(),
    actorEmail,
  );
  assert.equal(listRes.status, 200);
  const initialDocs = (
    listRes.body as {
      data: { id: string; name: string; current: { checksumSha256: string; fileName: string } }[];
      meta: { total: number };
    }
  ).data;
  assert.ok(initialDocs.length >= 3);
  assert.equal(initialDocs[0]?.current.checksumSha256.length, 64);

  // 2. Upload a new document with Firebase Storage metadata and SHA-256 hash
  const uploadRes = handleMockApiRequest(
    'POST',
    '/api/v1/documents',
    new URLSearchParams(),
    actorEmail,
    {
      name: 'Prospectus Obligataire — Northwind Euro Bond 2027',
      type: 'ISSUANCE_DOCUMENT',
      confidentiality: 'INVESTOR_VISIBLE',
      ownerType: 'ISSUANCE',
      issuanceId: '20000000-0000-4000-8000-000000000001',
      __uploadedFile: {
        documentId: '91000000-0000-4000-8000-000000000099',
        fileName: 'NWEB27_Prospectus_2027.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 420800,
        checksumSha256: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        storageBucket: 'lyrical-responder-8v0ns.firebasestorage.app',
        storageObjectPath:
          'veris-documents/issuance/91000000-0000-4000-8000-000000000099/v1-NWEB27_Prospectus_2027.pdf',
      },
    },
  );
  assert.equal(uploadRes.status, 200);
  const createdDoc = uploadRes.body as {
    id: string;
    currentVersion: number;
    storageBucket: string;
    current: { fileName: string; sizeBytes: number; checksumSha256: string };
  };
  assert.equal(createdDoc.id, '91000000-0000-4000-8000-000000000099');
  assert.equal(createdDoc.currentVersion, 1);
  assert.equal(createdDoc.storageBucket, 'lyrical-responder-8v0ns.firebasestorage.app');
  assert.equal(createdDoc.current.fileName, 'NWEB27_Prospectus_2027.pdf');
  assert.equal(createdDoc.current.sizeBytes, 420800);
  assert.equal(
    createdDoc.current.checksumSha256,
    '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
  );

  // 3. Add version 2 and generate signed download URL
  const v2Res = handleMockApiRequest(
    'POST',
    `/api/v1/documents/${createdDoc.id}/versions`,
    new URLSearchParams(),
    actorEmail,
    {
      __uploadedFile: {
        fileName: 'NWEB27_Prospectus_2027_v2.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 451200,
        checksumSha256: 'fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
      },
    },
  );
  assert.equal(v2Res.status, 200);
  assert.equal((v2Res.body as { currentVersion: number }).currentVersion, 2);

  const dlRes = handleMockApiRequest(
    'POST',
    `/api/v1/documents/${createdDoc.id}/download-url`,
    new URLSearchParams(),
    actorEmail,
    {},
  );
  assert.equal(dlRes.status, 200);
  assert.ok((dlRes.body as { url: string }).url.includes('/api/v1/documents/download'));
});



