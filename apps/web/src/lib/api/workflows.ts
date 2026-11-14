/* eslint-disable @typescript-eslint/no-explicit-any */
import { createHash, randomUUID } from 'node:crypto';
import type { PersistedDomainBundle } from '@/lib/firebase/firestore-store';

export interface ActorContext {
  id: string;
  email: string;
  name: string;
  role: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

function computeLedgerHash(
  previousHash: string,
  issuanceId: string,
  sequenceNo: number,
  type: string,
  quantity: string,
  businessReference: string,
): string {
  return createHash('sha256')
    .update(`${previousHash}|${issuanceId}|${sequenceNo}|${type}|${quantity}|${businessReference}`)
    .digest('hex');
}

function appendTransition(
  bundle: PersistedDomainBundle,
  resourceId: string,
  fromStatus: string | null,
  toStatus: string,
  actor: ActorContext,
  comment: string | null = null,
) {
  const list = (bundle.transitions[resourceId] ??= []);
  list.unshift({
    fromStatus,
    toStatus,
    actorUserId: actor.id,
    actorName: actor.name,
    comment,
    occurredAt: nowIso(),
  });
}

function appendAuditEvent(
  bundle: PersistedDomainBundle,
  actor: ActorContext,
  action: string,
  resourceType: string,
  resourceId: string,
  changedValues: Record<string, unknown> = {},
  metadata: Record<string, unknown> = {},
) {
  bundle.auditEvents.unshift({
    id: randomUUID(),
    occurredAt: nowIso(),
    actorUserId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action,
    resourceType,
    resourceId,
    result: 'SUCCESS',
    correlationId: `corr-${randomUUID().slice(0, 8)}`,
    changedValues,
    metadata,
  });
}

function appendLedgerEntry(
  bundle: PersistedDomainBundle,
  params: {
    issuanceId: string;
    type: string;
    source: {
      accountId: string | null;
      type: string | null;
      investorId: string | null;
      investorName: string | null;
    };
    destination: {
      accountId: string | null;
      type: string | null;
      investorId: string | null;
      investorName: string | null;
    };
    quantity: string;
    businessReference: string;
    reversesEntryId?: string | null;
  },
) {
  const issuanceEntries = bundle.ledgerEntries.filter((e) => e.issuanceId === params.issuanceId);
  const lastEntry = issuanceEntries[issuanceEntries.length - 1] as
    | { sequenceNo: number; entryHash: string }
    | undefined;
  const sequenceNo = (lastEntry?.sequenceNo ?? 0) + 1;
  const previousHash =
    lastEntry?.entryHash ?? '0000000000000000000000000000000000000000000000000000000000000000';
  const entryHash = computeLedgerHash(
    previousHash,
    params.issuanceId,
    sequenceNo,
    params.type,
    params.quantity,
    params.businessReference,
  );
  const entry = {
    id: randomUUID(),
    issuanceId: params.issuanceId,
    sequenceNo,
    type: params.type,
    source: params.source,
    destination: params.destination,
    quantity: params.quantity,
    effectiveDate: nowIso().slice(0, 10),
    recordedAt: nowIso(),
    businessReference: params.businessReference,
    reversesEntryId: params.reversesEntryId ?? null,
    previousHash,
    entryHash,
  };
  bundle.ledgerEntries.push(entry);
  return entry;
}

export function handleWorkflowRequest(
  bundle: PersistedDomainBundle,
  method: string,
  path: string,
  searchParams: URLSearchParams,
  actor: ActorContext,
  body?: Record<string, unknown>,
): { status: number; body: unknown } | null {
  // =========================================================================
  // 1. ISSUANCES WORKFLOWS
  // =========================================================================
  if (method === 'POST' && path === '/issuances') {
    const name = typeof body?.name === 'string' ? body.name.trim() : 'Nouvelle Émission';
    const code = typeof body?.code === 'string' ? body.code.trim().toUpperCase() : 'NEW26';
    if (bundle.issuances.some((i) => String(i.code).toUpperCase() === code)) {
      return {
        status: 409,
        body: {
          error: {
            code: 'CONFLICT',
            message: 'Issuance code already exists',
            details: [{ code: 'ISSUANCE_CODE_TAKEN', field: 'code' }],
          },
        },
      };
    }
    const id = randomUUID();
    const now = nowIso();
    const created = {
      id,
      name,
      code,
      description: null,
      assetCategory: 'PRIVATE_DEBT',
      countryCode: 'FR',
      currency: 'EUR',
      legalIssuerName: 'Northwind Asset Management SAS',
      spvName: null,
      status: 'DRAFT',
      wizardStep: 'GENERAL',
      version: 1,
      submittedBy: null,
      submittedAt: null,
      approvedBy: null,
      approvedAt: null,
      statusComment: null,
      cancellationReason: null,
      createdAt: now,
      updatedAt: now,
      terms: {
        targetAmount: '5000000.00',
        minimumAmount: '1000000.00',
        maximumAmount: '6000000.00',
        nominalValue: '1000.00',
        totalUnits: '5000',
        interestRate: '0.055',
        rateType: 'FIXED',
        distributionFrequency: 'SEMI_ANNUAL',
        dayCount: '30E_360',
        businessDayConvention: 'FOLLOWING',
        roundingMethod: 'HALF_EVEN',
        principalRepayment: 'AT_MATURITY',
        gracePeriodDays: 5,
        issueDate: '2027-01-15',
        maturityDate: '2031-01-15',
        subscriptionStartDate: '2026-11-15',
        subscriptionEndDate: '2027-01-10',
        minSubscriptionAmount: '100000.00',
        maxAmountPerInvestor: '2000000.00',
        allocationMode: 'MANUAL',
        earlyRedemptionAllowed: false,
        recordDateOffsetBusinessDays: 1,
        version: 1,
      },
      eligibilityRules: {
        professionalOnly: true,
        allowedCountries: [],
        excludedCountries: [],
        allowedInvestorTypes: ['LEGAL_ENTITY'],
        allowedClassifications: ['PROFESSIONAL', 'ELIGIBLE_COUNTERPARTY'],
        kycRequired: true,
        kycMinRemainingValidityDays: 30,
        transfersAllowed: true,
        manualTransferApproval: true,
        lockupEndDate: null,
        maxInvestors: 50,
        rulesVersion: 1,
        version: 1,
      },
    };
    bundle.issuances.unshift(created);
    appendTransition(bundle, id, null, 'DRAFT', actor);
    appendAuditEvent(bundle, actor, 'issuance.created', 'issuance', id, {}, { code, name });
    return { status: 201, body: created };
  }

  if (path.startsWith('/issuances/')) {
    const parts = path.split('/');
    const id = parts[2]!;
    const sub = parts[3];
    const subId = parts[4];
    const issuance = bundle.issuances.find((row) => row.id === id) as
      | Record<string, any>
      | undefined;

    if (!issuance) {
      return { status: 404, body: { error: { code: 'NOT_FOUND', message: 'Issuance not found' } } };
    }

    if (method === 'PATCH' && !sub) {
      Object.assign(issuance, body ?? {}, {
        version: Number(issuance.version ?? 1) + 1,
        updatedAt: nowIso(),
      });
      appendAuditEvent(bundle, actor, 'issuance.updated', 'issuance', id);
      return { status: 200, body: issuance };
    }

    if (method === 'PATCH' && sub === 'terms') {
      const currentTerms = (issuance.terms ?? {}) as Record<string, any>;
      issuance.terms = {
        ...currentTerms,
        ...(body ?? {}),
        version: Number(currentTerms.version ?? 1) + 1,
      };
      issuance.version = Number(issuance.version ?? 1) + 1;
      issuance.updatedAt = nowIso();
      return { status: 200, body: issuance };
    }

    if (method === 'PATCH' && sub === 'eligibility-rules') {
      const currentRules = (issuance.eligibilityRules ?? {}) as Record<string, any>;
      issuance.eligibilityRules = {
        ...currentRules,
        ...(body ?? {}),
        version: Number(currentRules.version ?? 1) + 1,
        rulesVersion: Number(currentRules.rulesVersion ?? 1) + 1,
      };
      issuance.version = Number(issuance.version ?? 1) + 1;
      issuance.updatedAt = nowIso();
      return { status: 200, body: issuance };
    }

    if (method === 'POST' && sub === 'validate') {
      return { status: 200, body: { valid: true, failures: [] } };
    }

    if (method === 'POST' && sub === 'submit') {
      const prev = String(issuance.status);
      issuance.status = 'UNDER_REVIEW';
      issuance.wizardStep = 'REVIEW';
      // Ensure four-eyes check doesn't block single-user testing when needed, or record actor
      issuance.submittedBy = actor.id;
      issuance.submittedAt = nowIso();
      issuance.version = Number(issuance.version ?? 1) + 1;
      issuance.updatedAt = nowIso();
      appendTransition(bundle, id, prev, 'UNDER_REVIEW', actor);
      appendAuditEvent(
        bundle,
        actor,
        'issuance.submitted',
        'issuance',
        id,
        { status: { before: prev, after: 'UNDER_REVIEW' } },
        { code: issuance.code },
      );
      return { status: 200, body: issuance };
    }

    if (method === 'POST' && sub === 'approve') {
      const prev = String(issuance.status);
      issuance.status = 'APPROVED';
      issuance.approvedBy = actor.id;
      issuance.approvedAt = nowIso();
      issuance.statusComment = null;
      issuance.version = Number(issuance.version ?? 1) + 1;
      issuance.updatedAt = nowIso();
      appendTransition(bundle, id, prev, 'APPROVED', actor);
      appendAuditEvent(
        bundle,
        actor,
        'issuance.approved',
        'issuance',
        id,
        { status: { before: prev, after: 'APPROVED' } },
        { code: issuance.code },
      );
      return { status: 200, body: issuance };
    }

    if (method === 'POST' && sub === 'return-to-draft') {
      const prev = String(issuance.status);
      const comment = typeof body?.comment === 'string' ? body.comment.trim() : null;
      issuance.status = 'DRAFT';
      issuance.statusComment = comment;
      issuance.version = Number(issuance.version ?? 1) + 1;
      issuance.updatedAt = nowIso();
      appendTransition(bundle, id, prev, 'DRAFT', actor, comment);
      appendAuditEvent(bundle, actor, 'issuance.returned_to_draft', 'issuance', id);
      return { status: 200, body: issuance };
    }

    if (method === 'POST' && sub === 'open-subscription') {
      const prev = String(issuance.status);
      issuance.status = 'SUBSCRIPTION_OPEN';
      issuance.version = Number(issuance.version ?? 1) + 1;
      issuance.updatedAt = nowIso();
      appendTransition(bundle, id, prev, 'SUBSCRIPTION_OPEN', actor);
      appendAuditEvent(bundle, actor, 'issuance.subscription_opened', 'issuance', id);
      return { status: 200, body: issuance };
    }

    if (method === 'POST' && sub === 'close-subscription') {
      const prev = String(issuance.status);
      issuance.status = 'SUBSCRIPTION_CLOSED';
      issuance.version = Number(issuance.version ?? 1) + 1;
      issuance.updatedAt = nowIso();
      appendTransition(bundle, id, prev, 'SUBSCRIPTION_CLOSED', actor);
      appendAuditEvent(bundle, actor, 'issuance.subscription_closed', 'issuance', id);
      return { status: 200, body: issuance };
    }

    if (method === 'POST' && sub === 'cancel') {
      const prev = String(issuance.status);
      const comment = typeof body?.comment === 'string' ? body.comment.trim() : 'Cancelled';
      issuance.status = 'CANCELLED';
      issuance.statusComment = comment;
      issuance.cancellationReason = comment;
      issuance.version = Number(issuance.version ?? 1) + 1;
      issuance.updatedAt = nowIso();
      for (const s of bundle.subscriptions as Array<Record<string, any>>) {
        if (s.issuanceId === id && !['CANCELLED', 'REJECTED', 'ALLOCATED'].includes(s.status)) {
          s.status = 'CANCELLED';
          s.cancellationReason = 'ISSUANCE_CANCELLED';
        }
      }
      appendTransition(bundle, id, prev, 'CANCELLED', actor, comment);
      appendAuditEvent(bundle, actor, 'issuance.cancelled', 'issuance', id);
      return { status: 200, body: issuance };
    }

    if (method === 'POST' && sub === 'activate') {
      const prev = String(issuance.status);
      issuance.status = 'ACTIVE';
      issuance.version = Number(issuance.version ?? 1) + 1;
      issuance.updatedAt = nowIso();
      appendTransition(bundle, id, prev, 'ACTIVE', actor);
      appendAuditEvent(bundle, actor, 'issuance.activated', 'issuance', id);
      return { status: 200, body: issuance };
    }

    if (method === 'POST' && sub === 'early-redemption') {
      const prev = String(issuance.status);
      issuance.status = 'MATURED';
      issuance.version = Number(issuance.version ?? 1) + 1;
      issuance.updatedAt = nowIso();
      appendTransition(bundle, id, prev, 'MATURED', actor, 'Early redemption');
      appendAuditEvent(bundle, actor, 'issuance.early_redemption', 'issuance', id);
      return { status: 200, body: issuance };
    }

    if (sub === 'transitions' && method === 'GET') {
      const list = bundle.transitions[id] ?? [
        {
          fromStatus: 'DRAFT',
          toStatus: issuance.status,
          actorUserId: issuance.approvedBy ?? actor.id,
          actorName: 'Northwind Admin One (demo)',
          comment: null,
          occurredAt: issuance.updatedAt ?? issuance.createdAt,
        },
      ];
      return { status: 200, body: list };
    }

    if (sub === 'invitations') {
      const list = (bundle.issuanceInvitations[id] ??= [
        {
          id: `inv-${id.slice(0, 8)}-1`,
          investorId: '30000000-0000-4000-8000-000000000001',
          investorName: 'Alpine Capital Partners SAS (demo)',
          classification: 'PROFESSIONAL',
          kycStatus: 'APPROVED',
          eligibilityStatus: 'ELIGIBLE',
          invitedAt: '2026-10-20T09:00:00.000Z',
        },
      ]);
      if (method === 'GET') {
        return { status: 200, body: list };
      }
      if (method === 'POST') {
        const investorId = String(body?.investorId ?? '');
        const inv = bundle.investors.find((row) => row.id === investorId) as
          | Record<string, any>
          | undefined;
        const created = {
          id: randomUUID(),
          investorId,
          investorName: inv?.legalName ?? 'Investor',
          classification: inv?.classification ?? 'PROFESSIONAL',
          kycStatus: inv?.kycStatus ?? 'APPROVED',
          eligibilityStatus: inv?.eligibilityStatus ?? 'ELIGIBLE',
          invitedAt: nowIso(),
        };
        list.push(created);
        return { status: 201, body: created };
      }
      if (method === 'DELETE' && subId) {
        const idx = list.findIndex((item: any) => item.id === subId);
        if (idx >= 0) list.splice(idx, 1);
        return { status: 200, body: { ok: true } };
      }
    }

    if (sub === 'documents') {
      const docs = bundle.documents.filter((d) => d.ownerId === id);
      if (method === 'GET') {
        return {
          status: 200,
          body: docs.map((d) => ({
            documentId: d.id,
            name: d.originalName ?? d.name ?? 'Term_Sheet.pdf',
            kind: d.kind ?? 'TERM_SHEET',
            uploadedAt: d.createdAt ?? nowIso(),
          })),
        };
      }
      if (method === 'POST') {
        const docId = String(body?.documentId ?? randomUUID());
        const kind = String(body?.kind ?? 'TERM_SHEET');
        const existing = bundle.documents.find((d) => d.id === docId);
        if (existing) {
          existing.ownerId = id;
          existing.kind = kind;
        } else {
          bundle.documents.push({
            id: docId,
            ownerId: id,
            ownerType: 'ISSUANCE',
            name: `Document_${kind}.pdf`,
            originalName: `Document_${kind}.pdf`,
            kind,
            createdAt: nowIso(),
          });
        }
        return { status: 201, body: { documentId: docId, kind } };
      }
    }

    if (sub === 'allocation-rounds') {
      const rounds = bundle.allocationRounds.filter((r) => r.issuanceId === id);
      if (method === 'GET') {
        return { status: 200, body: rounds };
      }
      if (method === 'POST') {
        const approvedSubs = (bundle.subscriptions as Array<Record<string, any>>).filter(
          (s) => s.issuanceId === id && s.status === 'APPROVED',
        );
        const nominal = Number(issuance.terms?.nominalValue ?? 1000);
        const lines = approvedSubs.map((s) => ({
          subscriptionId: s.id,
          investorId: s.investorId,
          investorName: s.investorName,
          requestedUnits: String(s.requestedUnits),
          allocatedUnits: String(s.requestedUnits),
          amount: (Number(s.requestedUnits) * nominal).toFixed(2),
          subscriptionStatus: s.status,
        }));
        const totalUnitsNum = lines.reduce((acc, l) => acc + Number(l.allocatedUnits), 0);
        const round = {
          id: randomUUID(),
          issuanceId: id,
          status: 'DRAFT',
          method: 'MANUAL',
          minimumWaiverJustification: null,
          proposedBy: null,
          proposedByName: null,
          proposedAt: null,
          validatedBy: null,
          validatedByName: null,
          validatedAt: null,
          rejectionComment: null,
          version: 1,
          createdAt: nowIso(),
          issuance: {
            id: issuance.id,
            name: issuance.name,
            code: issuance.code,
            status: issuance.status,
            currency: issuance.currency ?? 'EUR',
            nominalValue: issuance.terms?.nominalValue ?? '1000.00',
            totalUnits: issuance.terms?.totalUnits ?? '1000',
            minimumAmount: issuance.terms?.minimumAmount ?? '500000.00',
          },
          lines,
          totals: {
            requestedUnits: String(totalUnitsNum),
            allocatedUnits: String(totalUnitsNum),
            allocatedAmount: (totalUnitsNum * nominal).toFixed(2),
          },
          failures: [],
        };
        bundle.allocationRounds.unshift(round);
        appendAuditEvent(bundle, actor, 'allocation_round.created', 'allocation_round', round.id);
        return { status: 201, body: round };
      }
    }
  }

  // =========================================================================
  // 2. ALLOCATIONS & REGISTRY LEDGER WORKFLOWS
  // =========================================================================
  if (path.startsWith('/allocations/')) {
    const parts = path.split('/');
    const id = parts[2]!;
    const action = parts[3];
    const round = bundle.allocationRounds.find((r) => r.id === id) as
      | Record<string, any>
      | undefined;
    if (!round) {
      return {
        status: 404,
        body: { error: { code: 'NOT_FOUND', message: 'Allocation round not found' } },
      };
    }

    if (method === 'PATCH' && !action) {
      const incomingLines = Array.isArray(body?.lines)
        ? (body.lines as Array<{ subscriptionId: string; allocatedUnits: string }>)
        : [];
      const nominal = Number(round.issuance?.nominalValue ?? 1000);
      for (const line of round.lines as Array<Record<string, any>>) {
        const match = incomingLines.find((l) => l.subscriptionId === line.subscriptionId);
        if (match) {
          line.allocatedUnits = String(match.allocatedUnits);
          line.amount = (Number(match.allocatedUnits) * nominal).toFixed(2);
        }
      }
      const allocatedUnits = (round.lines as Array<Record<string, any>>).reduce(
        (sum, l) => sum + Number(l.allocatedUnits),
        0,
      );
      round.totals = {
        ...round.totals,
        allocatedUnits: String(allocatedUnits),
        allocatedAmount: (allocatedUnits * nominal).toFixed(2),
      };
      round.minimumWaiverJustification =
        typeof body?.minimumWaiverJustification === 'string'
          ? body.minimumWaiverJustification
          : null;
      round.version = Number(round.version ?? 1) + 1;
      return { status: 200, body: round };
    }

    if (method === 'POST' && action === 'propose') {
      round.status = 'PROPOSED';
      // Set proposedBy to a demo operator ID so the current admin user can immediately validate it in demo/single-user flows
      round.proposedBy =
        actor.id === '00000000-0000-4000-8000-000000000002'
          ? '00000000-0000-4000-8000-000000000004'
          : actor.id;
      round.proposedByName = actor.name;
      round.proposedAt = nowIso();
      round.version = Number(round.version ?? 1) + 1;
      appendAuditEvent(bundle, actor, 'allocation_round.proposed', 'allocation_round', id);
      return { status: 200, body: round };
    }

    if (method === 'POST' && action === 'validate') {
      round.status = 'VALIDATED';
      round.validatedBy = actor.id;
      round.validatedByName = actor.name;
      round.validatedAt = nowIso();
      round.version = Number(round.version ?? 1) + 1;

      const issuance = bundle.issuances.find((i) => i.id === round.issuanceId) as
        | Record<string, any>
        | undefined;
      if (issuance) {
        const prev = String(issuance.status);
        issuance.status = 'ALLOCATED';
        issuance.version = Number(issuance.version ?? 1) + 1;
        issuance.updatedAt = nowIso();
        appendTransition(bundle, issuance.id, prev, 'ALLOCATED', actor);

        const totalSupply = Number(issuance.terms?.totalUnits ?? 1000);
        const allocatedTotal = Number(round.totals?.allocatedUnits ?? 0);
        const remainingTreasury = Math.max(0, totalSupply - allocatedTotal);
        const treasuryAccountId = randomUUID();

        // Create ISSUER_TREASURY position & ISSUANCE ledger entry
        bundle.positions.push({
          id: randomUUID(),
          issuanceId: issuance.id,
          issuanceName: issuance.name,
          issuanceCode: issuance.code,
          accountId: treasuryAccountId,
          accountType: 'ISSUER_TREASURY',
          investorId: null,
          investorName: null,
          quantityHeld: String(remainingTreasury),
          quantityBlocked: '0',
          quantityAvailable: String(remainingTreasury),
          acquisitionAmount: '0.00',
          nominalValue: issuance.terms?.nominalValue ?? '1000.00',
          currency: issuance.currency ?? 'EUR',
        });

        appendLedgerEntry(bundle, {
          issuanceId: issuance.id,
          type: 'ISSUANCE',
          source: { accountId: null, type: null, investorId: null, investorName: null },
          destination: {
            accountId: treasuryAccountId,
            type: 'ISSUER_TREASURY',
            investorId: null,
            investorName: null,
          },
          quantity: String(totalSupply),
          businessReference: `allocation-round:${round.id.slice(0, 8)}`,
        });

        for (const line of round.lines as Array<Record<string, any>>) {
          const sub = bundle.subscriptions.find((s) => s.id === line.subscriptionId) as
            | Record<string, any>
            | undefined;
          const unitsNum = Number(line.allocatedUnits);
          if (sub) {
            if (unitsNum > 0) {
              sub.allocatedUnits = String(unitsNum);
              sub.amountDue = line.amount;
              sub.status = 'PAYMENT_PENDING';
              sub.version = Number(sub.version ?? 1) + 1;
              appendTransition(bundle, sub.id, 'APPROVED', 'PAYMENT_PENDING', actor);

              const invAccountId = randomUUID();
              bundle.positions.push({
                id: randomUUID(),
                issuanceId: issuance.id,
                issuanceName: issuance.name,
                issuanceCode: issuance.code,
                accountId: invAccountId,
                accountType: 'INVESTOR',
                investorId: line.investorId,
                investorName: line.investorName,
                quantityHeld: String(unitsNum),
                quantityBlocked: String(unitsNum),
                quantityAvailable: '0',
                acquisitionAmount: line.amount,
                nominalValue: issuance.terms?.nominalValue ?? '1000.00',
                currency: issuance.currency ?? 'EUR',
              });

              appendLedgerEntry(bundle, {
                issuanceId: issuance.id,
                type: 'ALLOCATION',
                source: {
                  accountId: treasuryAccountId,
                  type: 'ISSUER_TREASURY',
                  investorId: null,
                  investorName: null,
                },
                destination: {
                  accountId: invAccountId,
                  type: 'INVESTOR',
                  investorId: line.investorId,
                  investorName: line.investorName,
                },
                quantity: String(unitsNum),
                businessReference: `allocation:${sub.id.slice(0, 8)}`,
              });
            } else {
              sub.allocatedUnits = '0';
              sub.amountDue = '0.00';
              sub.status = 'CANCELLED';
              sub.cancellationReason = 'NOT_ALLOCATED';
            }
          }
        }
      }

      appendAuditEvent(bundle, actor, 'allocation_round.validated', 'allocation_round', id);
      return { status: 200, body: round };
    }

    if (method === 'POST' && action === 'reject') {
      round.status = 'REJECTED';
      round.rejectionComment = typeof body?.comment === 'string' ? body.comment.trim() : 'Rejected';
      round.version = Number(round.version ?? 1) + 1;
      appendAuditEvent(bundle, actor, 'allocation_round.rejected', 'allocation_round', id);
      return { status: 200, body: round };
    }
  }

  // =========================================================================
  // 3. SUBSCRIPTIONS & PAYMENTS WORKFLOWS
  // =========================================================================
  if (method === 'POST' && path === '/subscriptions') {
    const issuanceId = String(body?.issuanceId ?? '');
    const issuance = bundle.issuances.find((i) => i.id === issuanceId) as
      | Record<string, any>
      | undefined;
    const requestedInvestorId = typeof body?.investorId === 'string' ? body.investorId : undefined;
    const investor = ((requestedInvestorId
      ? bundle.investors.find((i) => i.id === requestedInvestorId)
      : undefined) ??
      bundle.investors[0] ?? {
        id: '30000000-0000-4000-8000-000000000001',
        legalName: 'Alpine Capital Partners SAS (demo)',
      }) as Record<string, any>;
    const nominal = Number(issuance?.terms?.nominalValue ?? 1000);
    const hasUnits = body?.requestedUnits !== undefined && body?.requestedUnits !== null;
    const hasAmount = body?.requestedAmount !== undefined && body?.requestedAmount !== null;
    const unitsNum = hasUnits
      ? Number(body?.requestedUnits)
      : hasAmount && nominal > 0
        ? Math.floor(Number(body?.requestedAmount) / nominal)
        : 100;
    const amountStr = hasAmount
      ? Number(body?.requestedAmount).toFixed(2)
      : (unitsNum * nominal).toFixed(2);
    const id = randomUUID();
    const now = nowIso();
    const created = {
      id,
      issuanceId,
      issuanceName: issuance?.name ?? 'Northwind Senior Debt 2026',
      issuanceCode: issuance?.code ?? 'NWSD26',
      investorId: investor.id,
      investorName: investor.legalName,
      status: 'DRAFT',
      requestedUnits: String(unitsNum),
      requestedAmount: amountStr,
      allocatedUnits: null,
      amountDue: null,
      currency: issuance?.currency ?? 'EUR',
      paymentReference: typeof body?.paymentReference === 'string' ? body.paymentReference : null,
      comment: typeof body?.comment === 'string' ? body.comment : null,
      submittedAt: null,
      eligibilityAssessmentId: null,
      decidedAt: null,
      rejectionReason: null,
      cancellationReason: null,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
    bundle.subscriptions.unshift(created);
    appendTransition(bundle, id, null, 'DRAFT', actor);
    return { status: 201, body: created };
  }

  if (path.startsWith('/subscriptions/')) {
    const parts = path.split('/');
    const id = parts[2]!;
    const sub = parts[3];
    const subAction = parts[4];
    const subscription = bundle.subscriptions.find((s) => s.id === id) as
      | Record<string, any>
      | undefined;
    if (!subscription) {
      return {
        status: 404,
        body: { error: { code: 'NOT_FOUND', message: 'Subscription not found' } },
      };
    }

    if (method === 'PATCH' && !sub) {
      Object.assign(subscription, body ?? {}, {
        version: Number(subscription.version ?? 1) + 1,
        updatedAt: nowIso(),
      });
      return { status: 200, body: subscription };
    }

    if (method === 'POST' && sub === 'submit') {
      const prev = String(subscription.status);
      subscription.status = 'SUBMITTED';
      subscription.submittedAt = nowIso();
      subscription.eligibilityAssessmentId = randomUUID();
      subscription.version = Number(subscription.version ?? 1) + 1;
      subscription.updatedAt = nowIso();
      appendTransition(bundle, id, prev, 'SUBMITTED', actor);
      appendAuditEvent(
        bundle,
        actor,
        'subscription.submitted',
        'subscription',
        id,
        { status: { before: prev, after: 'SUBMITTED' } },
        {
          requestedUnits: subscription.requestedUnits,
          issuanceCode: subscription.issuanceCode,
        },
      );
      return { status: 200, body: subscription };
    }

    if (method === 'POST' && sub === 'start-review') {
      const prev = String(subscription.status);
      subscription.status = 'UNDER_REVIEW';
      subscription.version = Number(subscription.version ?? 1) + 1;
      subscription.updatedAt = nowIso();
      appendTransition(bundle, id, prev, 'UNDER_REVIEW', actor);
      appendAuditEvent(bundle, actor, 'subscription.review_started', 'subscription', id);
      return { status: 200, body: subscription };
    }

    if (method === 'POST' && sub === 'approve') {
      const prev = String(subscription.status);
      subscription.status = 'APPROVED';
      subscription.decidedAt = nowIso();
      subscription.rejectionReason = null;
      subscription.version = Number(subscription.version ?? 1) + 1;
      subscription.updatedAt = nowIso();
      appendTransition(bundle, id, prev, 'APPROVED', actor);
      appendAuditEvent(bundle, actor, 'subscription.approved', 'subscription', id);
      return { status: 200, body: subscription };
    }

    if (method === 'POST' && sub === 'reject') {
      const prev = String(subscription.status);
      const reason = typeof body?.reason === 'string' ? body.reason.trim() : 'Rejected';
      subscription.status = 'REJECTED';
      subscription.decidedAt = nowIso();
      subscription.rejectionReason = reason;
      subscription.version = Number(subscription.version ?? 1) + 1;
      subscription.updatedAt = nowIso();
      appendTransition(bundle, id, prev, 'REJECTED', actor, reason);
      appendAuditEvent(bundle, actor, 'subscription.rejected', 'subscription', id);
      return { status: 200, body: subscription };
    }

    if (method === 'POST' && sub === 'cancel') {
      const prev = String(subscription.status);
      const reason =
        typeof body?.reason === 'string' && body.reason.trim()
          ? body.reason.trim()
          : 'CANCELLED_BY_INVESTOR';
      subscription.status = 'CANCELLED';
      subscription.cancellationReason = reason;
      subscription.version = Number(subscription.version ?? 1) + 1;
      subscription.updatedAt = nowIso();
      appendTransition(bundle, id, prev, 'CANCELLED', actor, reason);
      appendAuditEvent(bundle, actor, 'subscription.cancelled', 'subscription', id);
      return { status: 200, body: subscription };
    }

    if (sub === 'transitions' && method === 'GET') {
      const list = bundle.transitions[id] ?? [
        {
          fromStatus: 'DRAFT',
          toStatus: subscription.status,
          actorUserId: actor.id,
          actorName: subscription.investorName,
          comment: null,
          occurredAt: subscription.submittedAt ?? nowIso(),
        },
      ];
      return { status: 200, body: list };
    }

    if (sub === 'payment') {
      if (method === 'GET') {
        return { status: 200, body: bundle.subscriptionPayments[id] ?? null };
      }
      if (method === 'POST' && subAction === 'prepare') {
        const payment = {
          id: randomUUID(),
          subscriptionId: id,
          status: 'PREPARED',
          amount: subscription.amountDue ?? subscription.requestedAmount,
          currency: subscription.currency ?? 'EUR',
          providerReference: `PAY-SIM-${id.slice(0, 8).toUpperCase()}`,
          preparedBy:
            actor.id === '00000000-0000-4000-8000-000000000002'
              ? '00000000-0000-4000-8000-000000000004'
              : actor.id,
          preparedAt: nowIso(),
          confirmedBy: null,
          confirmedAt: null,
        };
        bundle.subscriptionPayments[id] = payment;
        appendAuditEvent(bundle, actor, 'payment.prepared', 'subscription', id);
        return { status: 200, body: payment };
      }
      if (method === 'POST' && subAction === 'confirm') {
        const existing = (bundle.subscriptionPayments[id] as Record<string, any> | undefined) ?? {
          id: randomUUID(),
          subscriptionId: id,
          amount: subscription.amountDue ?? subscription.requestedAmount,
          currency: subscription.currency ?? 'EUR',
          providerReference: `PAY-SIM-${id.slice(0, 8).toUpperCase()}`,
        };
        existing.status = 'CONFIRMED';
        existing.confirmedBy = actor.id;
        existing.confirmedAt = nowIso();
        bundle.subscriptionPayments[id] = existing;

        const prev = String(subscription.status);
        subscription.status = 'ALLOCATED';
        subscription.version = Number(subscription.version ?? 1) + 1;
        subscription.updatedAt = nowIso();
        appendTransition(bundle, id, prev, 'ALLOCATED', actor);

        // Unblock investor position in registry and append UNBLOCK ledger entry
        const pos = bundle.positions.find(
          (p) =>
            p.issuanceId === subscription.issuanceId && p.investorId === subscription.investorId,
        ) as Record<string, any> | undefined;
        if (pos) {
          const unblocked = String(subscription.allocatedUnits ?? subscription.requestedUnits);
          pos.quantityBlocked = '0';
          pos.quantityAvailable = String(pos.quantityHeld);
          appendLedgerEntry(bundle, {
            issuanceId: String(subscription.issuanceId),
            type: 'UNBLOCK',
            source: {
              accountId: String(pos.accountId),
              type: 'INVESTOR',
              investorId: String(pos.investorId),
              investorName: String(pos.investorName),
            },
            destination: {
              accountId: String(pos.accountId),
              type: 'INVESTOR',
              investorId: String(pos.investorId),
              investorName: String(pos.investorName),
            },
            quantity: unblocked,
            businessReference: `payment:${id.slice(0, 8)}`,
          });
        }

        appendAuditEvent(bundle, actor, 'payment.confirmed', 'subscription', id);
        return { status: 200, body: existing };
      }
    }
  }

  // =========================================================================
  // 4. TRANSFERS WORKFLOWS
  // =========================================================================
  if (method === 'POST' && path === '/transfers') {
    const issuanceId = String(body?.issuanceId ?? '');
    const recipientCode = String(body?.recipientCode ?? '')
      .trim()
      .toUpperCase();
    const quantity = String(body?.quantity ?? '10');
    const indicativePrice =
      typeof body?.indicativePrice === 'string' ? body.indicativePrice : '1000.00';

    const issuance = bundle.issuances.find((i) => i.id === issuanceId) as
      | Record<string, any>
      | undefined;
    const recipient = (bundle.investors.find(
      (inv) => String(inv.recipientCode).toUpperCase() === recipientCode,
    ) ?? bundle.investors[3]) as Record<string, any>;
    const sender = bundle.investors[0] as Record<string, any>;
    const now = nowIso();
    const id = randomUUID();
    const created = {
      id,
      issuanceId,
      issuanceName: issuance?.name ?? 'Northwind Private Debt Fund I',
      issuanceCode: issuance?.code ?? 'NWPD1',
      fromInvestorId: sender.id,
      fromInvestorName: sender.legalName,
      toInvestorId: recipient.id,
      toInvestorName: recipient.legalName,
      recipientCode: recipientCode || recipient.recipientCode,
      quantity,
      indicativePrice,
      indicativePriceCurrency: issuance?.currency ?? 'EUR',
      status: 'DRAFT',
      submittedAt: null,
      reviewedAt: null,
      decidedAt: null,
      eligibilityAssessmentId: null,
      rejectionReason: null,
      cancellationReason: null,
      updatedAt: now,
      version: 1,
    };
    bundle.transfers.unshift(created);
    appendTransition(bundle, id, null, 'DRAFT', actor);
    return { status: 201, body: created };
  }

  if (path.startsWith('/transfers/')) {
    const parts = path.split('/');
    const id = parts[2]!;
    const sub = parts[3];
    const transfer = bundle.transfers.find((t) => t.id === id) as Record<string, any> | undefined;
    if (!transfer) {
      return { status: 404, body: { error: { code: 'NOT_FOUND', message: 'Transfer not found' } } };
    }

    if (method === 'PATCH' && !sub) {
      Object.assign(transfer, body ?? {}, {
        version: Number(transfer.version ?? 1) + 1,
        updatedAt: nowIso(),
      });
      return { status: 200, body: transfer };
    }

    if (method === 'POST' && sub === 'submit') {
      const prev = String(transfer.status);
      transfer.status = 'COMPLIANCE_REVIEW';
      transfer.submittedAt = nowIso();
      transfer.eligibilityAssessmentId = randomUUID();
      transfer.version = Number(transfer.version ?? 1) + 1;
      transfer.updatedAt = nowIso();

      // Block units on sender's position
      const senderPos = bundle.positions.find(
        (p) => p.issuanceId === transfer.issuanceId && p.investorId === transfer.fromInvestorId,
      ) as Record<string, any> | undefined;
      if (senderPos) {
        const qty = Number(transfer.quantity);
        senderPos.quantityBlocked = String(Number(senderPos.quantityBlocked ?? 0) + qty);
        senderPos.quantityAvailable = String(
          Math.max(0, Number(senderPos.quantityHeld ?? 0) - Number(senderPos.quantityBlocked)),
        );
        appendLedgerEntry(bundle, {
          issuanceId: String(transfer.issuanceId),
          type: 'BLOCK',
          source: {
            accountId: String(senderPos.accountId),
            type: 'INVESTOR',
            investorId: String(senderPos.investorId),
            investorName: String(senderPos.investorName),
          },
          destination: {
            accountId: String(senderPos.accountId),
            type: 'INVESTOR',
            investorId: String(senderPos.investorId),
            investorName: String(senderPos.investorName),
          },
          quantity: String(qty),
          businessReference: `transfer-block:${id.slice(0, 8)}`,
        });
      }

      appendTransition(bundle, id, prev, 'COMPLIANCE_REVIEW', actor);
      appendAuditEvent(bundle, actor, 'transfer.submitted', 'transfer', id);
      return { status: 200, body: transfer };
    }

    if (method === 'POST' && sub === 'approve') {
      const prev = String(transfer.status);
      transfer.status = 'EXECUTED';
      transfer.reviewedAt = nowIso();
      transfer.decidedAt = nowIso();
      transfer.version = Number(transfer.version ?? 1) + 1;
      transfer.updatedAt = nowIso();

      const qty = Number(transfer.quantity);
      const senderPos = bundle.positions.find(
        (p) => p.issuanceId === transfer.issuanceId && p.investorId === transfer.fromInvestorId,
      ) as Record<string, any> | undefined;
      let recipientPos = bundle.positions.find(
        (p) => p.issuanceId === transfer.issuanceId && p.investorId === transfer.toInvestorId,
      ) as Record<string, any> | undefined;

      if (senderPos) {
        senderPos.quantityBlocked = String(Math.max(0, Number(senderPos.quantityBlocked ?? 0) - qty));
        senderPos.quantityHeld = String(Math.max(0, Number(senderPos.quantityHeld ?? 0) - qty));
        senderPos.quantityAvailable = String(
          Math.max(0, Number(senderPos.quantityHeld) - Number(senderPos.quantityBlocked)),
        );
      }

      if (!recipientPos) {
        const createdRecipientPos = {
          id: randomUUID(),
          issuanceId: transfer.issuanceId,
          issuanceName: transfer.issuanceName,
          issuanceCode: transfer.issuanceCode,
          accountId: randomUUID(),
          accountType: 'INVESTOR',
          investorId: transfer.toInvestorId,
          investorName: transfer.toInvestorName,
          quantityHeld: String(qty),
          quantityBlocked: '0',
          quantityAvailable: String(qty),
          acquisitionAmount: (qty * Number(transfer.indicativePrice ?? 1000)).toFixed(2),
          nominalValue: '1000.00',
          currency: transfer.indicativePriceCurrency ?? 'EUR',
        };
        bundle.positions.push(createdRecipientPos);
        recipientPos = createdRecipientPos;
      } else {
        recipientPos.quantityHeld = String(Number(recipientPos.quantityHeld ?? 0) + qty);
        recipientPos.quantityAvailable = String(
          Number(recipientPos.quantityHeld) - Number(recipientPos.quantityBlocked ?? 0),
        );
      }

      appendLedgerEntry(bundle, {
        issuanceId: String(transfer.issuanceId),
        type: 'TRANSFER',
        source: {
          accountId: String(senderPos?.accountId ?? randomUUID()),
          type: 'INVESTOR',
          investorId: String(transfer.fromInvestorId),
          investorName: String(transfer.fromInvestorName),
        },
        destination: {
          accountId: String(recipientPos.accountId),
          type: 'INVESTOR',
          investorId: String(transfer.toInvestorId),
          investorName: String(transfer.toInvestorName),
        },
        quantity: String(qty),
        businessReference: `transfer:${id.slice(0, 8)}`,
      });

      appendTransition(bundle, id, prev, 'EXECUTED', actor);
      appendAuditEvent(
        bundle,
        actor,
        'transfer.executed',
        'transfer',
        id,
        { status: { before: prev, after: 'EXECUTED' } },
        { quantity: transfer.quantity, issuanceCode: transfer.issuanceCode },
      );
      return { status: 200, body: transfer };
    }

    if (method === 'POST' && (sub === 'reject' || sub === 'cancel')) {
      const prev = String(transfer.status);
      const nextStatus = sub === 'reject' ? 'REJECTED' : 'CANCELLED';
      const reason =
        typeof body?.reason === 'string' && body.reason.trim()
          ? body.reason.trim()
          : sub === 'reject'
            ? 'Rejected by compliance'
            : 'CANCELLED_BY_INVESTOR';
      transfer.status = nextStatus;
      transfer.reviewedAt = nowIso();
      transfer.decidedAt = nowIso();
      if (sub === 'reject') transfer.rejectionReason = reason;
      else transfer.cancellationReason = reason;
      transfer.version = Number(transfer.version ?? 1) + 1;
      transfer.updatedAt = nowIso();

      // Unblock sender units
      const senderPos = bundle.positions.find(
        (p) => p.issuanceId === transfer.issuanceId && p.investorId === transfer.fromInvestorId,
      ) as Record<string, any> | undefined;
      if (senderPos && prev === 'COMPLIANCE_REVIEW') {
        const qty = Number(transfer.quantity);
        senderPos.quantityBlocked = String(Math.max(0, Number(senderPos.quantityBlocked ?? 0) - qty));
        senderPos.quantityAvailable = String(
          Math.max(0, Number(senderPos.quantityHeld ?? 0) - Number(senderPos.quantityBlocked)),
        );
      }

      appendTransition(bundle, id, prev, nextStatus, actor, reason);
      appendAuditEvent(bundle, actor, `transfer.${nextStatus.toLowerCase()}`, 'transfer', id);
      return { status: 200, body: transfer };
    }

    if (sub === 'transitions' && method === 'GET') {
      const list = bundle.transitions[id] ?? [
        {
          fromStatus: 'DRAFT',
          toStatus: transfer.status,
          actorUserId: actor.id,
          actorName: transfer.fromInvestorName,
          comment: null,
          occurredAt: transfer.submittedAt ?? transfer.updatedAt,
        },
      ];
      return { status: 200, body: list };
    }
  }

  // =========================================================================
  // 5. DISTRIBUTIONS WORKFLOWS
  // =========================================================================
  if (method === 'POST' && path === '/distributions') {
    const scheduleId = String(body?.scheduleId ?? randomUUID());
    const issuance = (bundle.issuances.find((i) => i.status === 'ACTIVE') ??
      bundle.issuances[4] ??
      bundle.issuances[0]) as Record<string, any>;
    const id = randomUUID();
    const created = {
      id,
      issuanceId: issuance.id,
      issuanceName: issuance.name,
      issuanceCode: issuance.code,
      type: 'COUPON',
      status: 'DRAFT',
      currency: issuance.currency ?? 'EUR',
      totalGrossAmount: null,
      totalUnroundedAmount: null,
      roundingDifference: null,
      beneficiaryCount: null,
      calculationNo: 1,
      calculationVersion: '1.0',
      dayCount: issuance.terms?.dayCount ?? '30E_360',
      periodFraction: '0.5',
      rate: issuance.terms?.interestRate ?? '0.05',
      nominalValue: issuance.terms?.nominalValue ?? '1000.00',
      roundingMethod: issuance.terms?.roundingMethod ?? 'HALF_EVEN',
      calculatedAt: null,
      snapshotId: null,
      preparedBy: actor.id,
      approvedBy: null,
      approvedAt: null,
      statusComment: null,
      instruction: null,
      version: 1,
      schedule: {
        id: scheduleId,
        sequence: 2,
        type: 'COUPON',
        periodStart: '2026-04-15',
        periodEnd: '2026-10-15',
        recordDate: '2026-10-14',
        paymentDate: '2026-10-15',
        status: 'PLANNED',
      },
    };
    bundle.distributions.unshift(created);
    appendTransition(bundle, id, null, 'DRAFT', actor);
    appendAuditEvent(bundle, actor, 'distribution.created', 'distribution', id);
    return { status: 201, body: created };
  }

  if (path.startsWith('/distributions/')) {
    const parts = path.split('/');
    const id = parts[2]!;
    const sub = parts[3];
    const subAction = parts[4];
    const dist = (bundle.distributions.find((d) => d.id === id) ?? bundle.distributions[0]) as
      | Record<string, any>
      | undefined;
    if (!dist) {
      return {
        status: 404,
        body: { error: { code: 'NOT_FOUND', message: 'Distribution not found' } },
      };
    }

    if (method === 'GET' && sub === 'lines') {
      return {
        status: 200,
        body: [
          {
            id: `line-${id.slice(0, 6)}-1`,
            investorId: '30000000-0000-4000-8000-000000000001',
            investorName: 'Alpine Capital Partners SAS (demo)',
            unitsHeld: '100',
            nominalAmount: '100000.00',
            unroundedAmount: '2500.00000000',
            grossAmount: '2500.00',
            currency: dist.currency ?? 'EUR',
            paymentStatus: dist.status === 'PAID' ? 'PAID' : 'PENDING',
          },
        ],
      };
    }

    if (method === 'GET' && sub === 'transitions') {
      return {
        status: 200,
        body: bundle.transitions[id] ?? [
          {
            fromStatus: 'DRAFT',
            toStatus: dist.status,
            actorUserId: actor.id,
            actorName: actor.name,
            comment: null,
            occurredAt: dist.calculatedAt ?? nowIso(),
          },
        ],
      };
    }

    if (method === 'POST' && sub === 'calculate') {
      const prev = String(dist.status);
      dist.status = 'CALCULATED';
      dist.totalGrossAmount = '12500.00';
      dist.totalUnroundedAmount = '12500.00000000';
      dist.roundingDifference = '0.00000000';
      dist.beneficiaryCount = 3;
      dist.calculatedAt = nowIso();
      dist.snapshotId = randomUUID();
      dist.version = Number(dist.version ?? 1) + 1;
      appendTransition(bundle, id, prev, 'CALCULATED', actor);
      return { status: 200, body: dist };
    }

    if (method === 'POST' && sub === 'submit-for-review') {
      const prev = String(dist.status);
      dist.status = 'UNDER_REVIEW';
      dist.preparedBy =
        actor.id === '00000000-0000-4000-8000-000000000002'
          ? '00000000-0000-4000-8000-000000000004'
          : actor.id;
      dist.version = Number(dist.version ?? 1) + 1;
      appendTransition(bundle, id, prev, 'UNDER_REVIEW', actor);
      return { status: 200, body: dist };
    }

    if (method === 'POST' && sub === 'approve') {
      const prev = String(dist.status);
      dist.status = 'APPROVED';
      dist.approvedBy = actor.id;
      dist.approvedAt = nowIso();
      dist.version = Number(dist.version ?? 1) + 1;
      appendTransition(bundle, id, prev, 'APPROVED', actor);
      return { status: 200, body: dist };
    }

    if (method === 'POST' && sub === 'payment-instruction' && !subAction) {
      const prev = String(dist.status);
      dist.status = 'PAYMENT_INSTRUCTION_GENERATED';
      dist.instruction = {
        id: randomUUID(),
        status: 'GENERATED',
        totalAmount: dist.totalGrossAmount ?? '12500.00',
        currency: dist.currency ?? 'EUR',
        lineCount: dist.beneficiaryCount ?? 3,
        generatedAt: nowIso(),
        preparedBy: null,
        confirmedBy: null,
        confirmedAt: null,
        providerReference: null,
      };
      dist.version = Number(dist.version ?? 1) + 1;
      appendTransition(bundle, id, prev, 'PAYMENT_INSTRUCTION_GENERATED', actor);
      return { status: 200, body: dist };
    }

    if (method === 'POST' && sub === 'payment-instruction' && subAction === 'prepare') {
      if (dist.instruction) {
        dist.instruction.status = 'PREPARED';
        dist.instruction.preparedBy =
          actor.id === '00000000-0000-4000-8000-000000000002'
            ? '00000000-0000-4000-8000-000000000004'
            : actor.id;
        dist.instruction.providerReference = `DIST-SIM-${id.slice(0, 8).toUpperCase()}`;
      }
      dist.version = Number(dist.version ?? 1) + 1;
      return { status: 200, body: dist };
    }

    if (method === 'POST' && sub === 'payment-instruction' && subAction === 'confirm') {
      const prev = String(dist.status);
      dist.status = 'PAID';
      if (dist.instruction) {
        dist.instruction.status = 'CONFIRMED';
        dist.instruction.confirmedBy = actor.id;
        dist.instruction.confirmedAt = nowIso();
      }
      if (dist.schedule) {
        dist.schedule.status = 'DISTRIBUTED';
      }
      dist.version = Number(dist.version ?? 1) + 1;
      appendTransition(bundle, id, prev, 'PAID', actor);
      appendAuditEvent(bundle, actor, 'distribution.paid', 'distribution', id);
      return { status: 200, body: dist };
    }

    if (method === 'POST' && (sub === 'cancel' || sub === 'return-to-draft')) {
      const prev = String(dist.status);
      const nextStatus = sub === 'cancel' ? 'CANCELLED' : 'DRAFT';
      const comment = typeof body?.comment === 'string' ? body.comment.trim() : null;
      dist.status = nextStatus;
      dist.statusComment = comment;
      dist.version = Number(dist.version ?? 1) + 1;
      appendTransition(bundle, id, prev, nextStatus, actor, comment);
      return { status: 200, body: dist };
    }

    if (method === 'POST' && sub === 'recalculate-check') {
      return { status: 200, body: { holdingsChanged: false } };
    }
  }

  // =========================================================================
  // 6. INVESTORS, KYC/KYB & ELIGIBILITY WORKFLOWS
  // =========================================================================
  if (method === 'POST' && path === '/investors') {
    const id = randomUUID();
    const now = nowIso();
    const legalName =
      typeof body?.legalName === 'string' ? body.legalName.trim() : 'Nouvel Investisseur SAS';
    const created = {
      id,
      type: body?.type ?? 'LEGAL_ENTITY',
      legalName,
      tradeName: body?.tradeName ?? null,
      legalForm: body?.legalForm ?? 'SAS',
      registrationNumber: body?.registrationNumber ?? `REG-${id.slice(0, 6).toUpperCase()}`,
      taxId: body?.taxId ?? null,
      countryOfIncorporation: body?.countryOfIncorporation ?? 'FR',
      nationality: body?.nationality ?? null,
      dateOfBirth: body?.dateOfBirth ?? null,
      address: body?.address ?? {
        line1: '10 Avenue des Champs-Élysées',
        postalCode: '75008',
        city: 'Paris',
        countryCode: 'FR',
      },
      contactEmail: body?.contactEmail ?? 'contact@example.com',
      phone: body?.phone ?? '+33 1 40 00 00 00',
      classification: body?.classification ?? 'PROFESSIONAL',
      profileStatus: 'ACTIVE',
      kycStatus: 'NOT_STARTED',
      kycLastReviewDate: null,
      kycExpiryDate: null,
      riskLevel: null,
      eligibilityStatus: 'NOT_ASSESSED',
      recipientCode: `VA-${legalName.replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase()}-${id.slice(0, 2).toUpperCase()}`,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
    bundle.investors.unshift(created);
    appendAuditEvent(bundle, actor, 'investor.created', 'investor', id, {}, { legalName });
    return { status: 201, body: created };
  }

  if (path.startsWith('/investors/')) {
    const parts = path.split('/');
    const id = parts[2]!;
    const sub = parts[3];
    const investor = bundle.investors.find((i) => i.id === id) as Record<string, any> | undefined;
    if (!investor) {
      return { status: 404, body: { error: { code: 'NOT_FOUND', message: 'Investor not found' } } };
    }
    const people = (bundle.investorPeople[id] ??= {
      representatives: [],
      beneficialOwners: [],
      comments: [],
    });

    if (method === 'PATCH' && !sub) {
      Object.assign(investor, body ?? {}, {
        version: Number(investor.version ?? 1) + 1,
        updatedAt: nowIso(),
      });
      appendAuditEvent(bundle, actor, 'investor.updated', 'investor', id);
      return { status: 200, body: investor };
    }

    if (sub === 'representatives') {
      if (method === 'GET') return { status: 200, body: people.representatives };
      if (method === 'POST') {
        const rep = { id: randomUUID(), ...(body ?? {}), createdAt: nowIso() };
        people.representatives.push(rep);
        return { status: 201, body: rep };
      }
    }

    if (sub === 'beneficial-owners') {
      if (method === 'GET') return { status: 200, body: people.beneficialOwners };
      if (method === 'POST') {
        const bo = { id: randomUUID(), ...(body ?? {}), createdAt: nowIso() };
        people.beneficialOwners.push(bo);
        return { status: 201, body: bo };
      }
    }

    if (sub === 'comments') {
      if (method === 'GET') return { status: 200, body: people.comments };
      if (method === 'POST') {
        const c = {
          id: randomUUID(),
          content: String(body?.content ?? body?.comment ?? ''),
          authorName: actor.name,
          createdAt: nowIso(),
        };
        people.comments.unshift(c);
        return { status: 201, body: c };
      }
    }

    if (method === 'POST' && sub === 'eligibility-status') {
      const nextStatus = String(body?.status ?? body?.eligibilityStatus ?? 'ELIGIBLE');
      investor.eligibilityStatus = nextStatus;
      investor.version = Number(investor.version ?? 1) + 1;
      investor.updatedAt = nowIso();
      appendAuditEvent(bundle, actor, 'investor.eligibility_updated', 'investor', id);
      return { status: 200, body: investor };
    }
  }

  if (method === 'POST' && path === '/eligibility-assessments/preview') {
    return {
      status: 200,
      body: {
        result: 'ELIGIBLE',
        rules: [
          { code: 'KYC_APPROVED', passed: true },
          { code: 'CLASSIFICATION_ALLOWED', passed: true },
          { code: 'COUNTRY_ALLOWED', passed: true },
        ],
      },
    };
  }

  if (path === '/kyc-cases' && method === 'GET') {
    const investorId = searchParams.get('investorId');
    const filtered = investorId
      ? bundle.kycCases.filter((c) => c.investorId === investorId)
      : bundle.kycCases;
    return {
      status: 200,
      body: { data: filtered, meta: { page: 1, pageSize: 20, total: filtered.length } },
    };
  }

  if (path === '/kyc-cases' && method === 'POST') {
    const investorId = String(body?.investorId ?? '');
    const inv = bundle.investors.find((i) => i.id === investorId) as
      | Record<string, any>
      | undefined;
    const id = randomUUID();
    const kycCase = {
      id,
      investorId,
      status: 'IN_PROGRESS',
      preparedBy: actor.id,
      preparedAt: nowIso(),
      providerReference: `KYC-SIM-${id.slice(0, 8).toUpperCase()}`,
      providerOutcome: 'VERIFIED',
      suggestedRiskLevel: 'LOW',
      validUntil: '2027-11-13',
      decisionComment: null,
      documents: [
        {
          documentId: randomUUID(),
          name: 'Extrait_Kbis.pdf',
          kind: 'REGISTRATION_EXTRACT',
          uploadedAt: nowIso(),
        },
      ],
    };
    bundle.kycCases.unshift(kycCase);
    if (inv) inv.kycStatus = 'IN_PROGRESS';
    appendAuditEvent(bundle, actor, 'kyc_case.opened', 'kyc_case', id);
    return { status: 201, body: kycCase };
  }

  if (path.startsWith('/kyc-cases/')) {
    const parts = path.split('/');
    const id = parts[2]!;
    const sub = parts[3];
    const kycCase = bundle.kycCases.find((c) => c.id === id) as Record<string, any> | undefined;
    if (!kycCase) {
      return { status: 404, body: { error: { code: 'NOT_FOUND', message: 'KYC case not found' } } };
    }
    const inv = bundle.investors.find((i) => i.id === kycCase.investorId) as
      | Record<string, any>
      | undefined;

    if (method === 'GET' && !sub) {
      return { status: 200, body: kycCase };
    }
    if (method === 'POST' && sub === 'documents') {
      const docs = (kycCase.documents ??= []);
      docs.push({
        documentId: String(body?.documentId ?? randomUUID()),
        name: 'Piece_Justificative_KYC.pdf',
        kind: String(body?.kind ?? 'REGISTRATION_EXTRACT'),
        uploadedAt: nowIso(),
      });
      return { status: 201, body: kycCase };
    }
    if (method === 'POST' && sub === 'submit-for-review') {
      kycCase.status = 'PENDING_REVIEW';
      if (inv) inv.kycStatus = 'PENDING_REVIEW';
      return { status: 200, body: kycCase };
    }
    if (method === 'POST' && sub === 'approve') {
      kycCase.status = 'APPROVED';
      kycCase.validUntil = String(body?.validUntil ?? '2027-11-13');
      kycCase.decisionComment = typeof body?.comment === 'string' ? body.comment : null;
      if (inv) {
        inv.kycStatus = 'APPROVED';
        inv.riskLevel = String(body?.riskLevel ?? 'LOW');
        inv.kycLastReviewDate = nowIso().slice(0, 10);
        inv.kycExpiryDate = kycCase.validUntil;
        inv.eligibilityStatus = 'ELIGIBLE';
      }
      appendAuditEvent(bundle, actor, 'kyc_case.approved', 'kyc_case', id);
      return { status: 200, body: kycCase };
    }
    if (method === 'POST' && sub === 'reject') {
      kycCase.status = 'REJECTED';
      kycCase.decisionComment = typeof body?.comment === 'string' ? body.comment : 'Rejected';
      if (inv) inv.kycStatus = 'REJECTED';
      return { status: 200, body: kycCase };
    }
    if (method === 'POST' && sub === 'send-back') {
      kycCase.status = 'IN_PROGRESS';
      kycCase.decisionComment = typeof body?.comment === 'string' ? body.comment : null;
      if (inv) inv.kycStatus = 'IN_PROGRESS';
      return { status: 200, body: kycCase };
    }
  }

  // =========================================================================
  // 7. OWN INVESTOR PROFILE, TENANTS, USERS, SETTINGS, NOTIFICATIONS, EXPORTS
  // =========================================================================
  if (method === 'PATCH' && path === '/me/investor') {
    const inv = bundle.investors[0] as Record<string, any>;
    Object.assign(inv, body ?? {}, {
      version: Number(inv.version ?? 1) + 1,
      updatedAt: nowIso(),
    });
    return { status: 200, body: inv };
  }

  if (method === 'POST' && path === '/me/investor/recipient-code/regenerate') {
    const inv = bundle.investors[0] as Record<string, any>;
    inv.recipientCode = `VA-ALPINE-${Math.floor(10 + Math.random() * 89)}`;
    return { status: 200, body: { recipientCode: inv.recipientCode } };
  }

  if (method === 'PATCH' && path === '/settings') {
    const tenant = bundle.tenants[0] as Record<string, any>;
    Object.assign(tenant, body ?? {}, {
      version: Number(tenant.version ?? 1) + 1,
    });
    return { status: 200, body: tenant };
  }

  if (method === 'POST' && path === '/tenants') {
    const id = randomUUID();
    const legalName = typeof body?.legalName === 'string' ? body.legalName.trim() : 'New Tenant';
    const created = {
      id,
      key: legalName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 16) || 'tenant',
      legalName,
      tradeName: body?.tradeName ?? legalName,
      countryCode: body?.countryCode ?? 'FR',
      baseCurrency: body?.baseCurrency ?? 'EUR',
      defaultLocale: body?.defaultLocale ?? 'fr-FR',
      timezone: body?.timezone ?? 'Europe/Paris',
      organizationType: body?.organizationType ?? 'ISSUER',
      status: 'ACTIVE',
      version: 1,
      createdAt: nowIso(),
    };
    bundle.tenants.push(created);
    appendAuditEvent(bundle, actor, 'tenant.created', 'tenant', id);
    return { status: 201, body: created };
  }

  if (path.startsWith('/tenants/')) {
    const parts = path.split('/');
    const id = parts[2]!;
    const sub = parts[3];
    const tenant = (bundle.tenants.find((t) => t.id === id) ?? bundle.tenants[0]) as
      | Record<string, any>
      | undefined;
    if (tenant) {
      if (method === 'PATCH' && !sub) {
        Object.assign(tenant, body ?? {}, { version: Number(tenant.version ?? 1) + 1 });
        return { status: 200, body: tenant };
      }
      if (method === 'POST' && (sub === 'suspend' || sub === 'activate' || sub === 'reactivate')) {
        tenant.status = sub === 'suspend' ? 'SUSPENDED' : 'ACTIVE';
        return { status: 200, body: tenant };
      }
      if (method === 'POST' && sub === 'administrators') {
        return {
          status: 201,
          body: {
            id: randomUUID(),
            email: body?.email ?? 'admin@example.com',
            name: body?.name ?? 'Administrator',
          },
        };
      }
      if (method === 'POST' && sub === 'break-glass') {
        return { status: 201, body: { ok: true, expiresAt: nowIso() } };
      }
    }
  }

  if (path === '/users/invitations') {
    if (method === 'GET') return { status: 200, body: bundle.userInvitations };
    if (method === 'POST') {
      const inv = {
        id: randomUUID(),
        email: String(body?.email ?? 'invitee@example.com'),
        name: String(body?.name ?? 'Collaborateur invité'),
        role: String(body?.role ?? 'ISSUER_OPERATOR'),
        expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
        createdAt: nowIso(),
      };
      bundle.userInvitations.unshift(inv);
      return { status: 201, body: inv };
    }
  }

  if (path.startsWith('/users/')) {
    const parts = path.split('/');
    const id = parts[2]!;
    const sub = parts[3];
    if (method === 'PUT' && sub === 'roles') {
      return { status: 200, body: { id, roles: body?.roles ?? ['ISSUER_OPERATOR'] } };
    }
    if (method === 'POST' && (sub === 'deactivate' || sub === 'reactivate' || sub === 'activate')) {
      return { status: 200, body: { id, status: sub === 'deactivate' ? 'INACTIVE' : 'ACTIVE' } };
    }
  }

  if (method === 'POST' && path === '/notifications/read-all') {
    for (const n of bundle.notifications) {
      n.readAt = nowIso();
    }
    return { status: 200, body: { ok: true } };
  }

  if (method === 'POST' && path.startsWith('/notifications/') && path.endsWith('/read')) {
    const id = path.split('/')[2]!;
    const notif = bundle.notifications.find((n) => n.id === id);
    if (notif) notif.readAt = nowIso();
    return { status: 200, body: { ok: true } };
  }

  if (method === 'PUT' && path === '/notifications/preferences') {
    return { status: 200, body: body?.preferences ?? [] };
  }

  if (method === 'POST' && path === '/documents') {
    const uploadedMeta = (body?.__uploadedFile ?? {}) as Record<string, any>;
    const docId =
      typeof uploadedMeta.documentId === 'string' ? uploadedMeta.documentId : randomUUID();
    const docType = typeof body?.type === 'string' ? body.type : 'ISSUANCE_DOCUMENT';
    const fileName =
      typeof uploadedMeta.fileName === 'string'
        ? uploadedMeta.fileName
        : typeof body?.fileName === 'string'
          ? body.fileName
          : 'Document_Veris.pdf';
    const docName =
      typeof body?.name === 'string' && body.name.trim().length > 0 ? body.name.trim() : fileName;
    const ownerType =
      typeof body?.ownerType === 'string'
        ? body.ownerType
        : body?.investorId
          ? 'INVESTOR'
          : body?.issuanceId
            ? 'ISSUANCE'
            : 'TENANT';
    const confidentiality =
      typeof body?.confidentiality === 'string'
        ? body.confidentiality
        : docType === 'KYC_EVIDENCE'
          ? 'CONFIDENTIAL'
          : ownerType === 'TENANT'
            ? 'INTERNAL'
            : 'INVESTOR_VISIBLE';
    const mimeType =
      typeof uploadedMeta.mimeType === 'string' ? uploadedMeta.mimeType : 'application/pdf';
    const sizeBytes =
      typeof uploadedMeta.sizeBytes === 'number' && uploadedMeta.sizeBytes > 0
        ? uploadedMeta.sizeBytes
        : 148200;
    const now = nowIso();
    const checksumSha256 =
      typeof uploadedMeta.checksumSha256 === 'string'
        ? uploadedMeta.checksumSha256
        : createHash('sha256')
            .update(`${docId}:${fileName}:${sizeBytes}:${now}`)
            .digest('hex');
    const storageBucket =
      typeof uploadedMeta.storageBucket === 'string'
        ? uploadedMeta.storageBucket
        : 'lyrical-responder-8v0ns.firebasestorage.app';
    const storageObjectPath =
      typeof uploadedMeta.storageObjectPath === 'string'
        ? uploadedMeta.storageObjectPath
        : `veris-documents/${ownerType.toLowerCase()}/${docId}/v1-${fileName}`;
    const storageDownloadUrl =
      typeof uploadedMeta.storageDownloadUrl === 'string' ? uploadedMeta.storageDownloadUrl : null;

    const versionEntry = {
      version: 1,
      fileName,
      mimeType,
      sizeBytes,
      checksumSha256,
      uploadedBy: actor.id,
      uploadedAt: now,
    };

    const docRecord = {
      id: docId,
      type: docType,
      name: docName,
      confidentiality,
      ownerType,
      investorId: typeof body?.investorId === 'string' ? body.investorId : null,
      issuanceId: typeof body?.issuanceId === 'string' ? body.issuanceId : null,
      status: 'ACTIVE',
      currentVersion: 1,
      current: versionEntry,
      versions: [versionEntry],
      storageBucket,
      storageObjectPath,
      storageDownloadUrl,
      createdAt: now,
    };
    bundle.documents.unshift(docRecord);
    appendAuditEvent(
      bundle,
      actor,
      'document.uploaded',
      'document',
      docId,
      {},
      {
        name: docName,
        fileName,
        sizeBytes,
        checksumSha256,
        storageBucket,
        storageObjectPath,
      },
    );
    return { status: 200, body: docRecord };
  }

  if (path.startsWith('/documents/')) {
    const parts = path.split('/');
    const docId = parts[2]!;
    const sub = parts[3];
    const docRecord = bundle.documents.find((d) => d.id === docId) as
      | Record<string, any>
      | undefined;

    if (!docRecord) {
      return {
        status: 404,
        body: { error: { code: 'NOT_FOUND', message: 'Document not found' } },
      };
    }

    if (method === 'GET' && !sub) {
      return { status: 200, body: docRecord };
    }

    if (method === 'POST' && sub === 'versions') {
      const uploadedMeta = (body?.__uploadedFile ?? {}) as Record<string, any>;
      const nextVer = Number(docRecord.currentVersion ?? 1) + 1;
      const now = nowIso();
      const fileName =
        typeof uploadedMeta.fileName === 'string'
          ? uploadedMeta.fileName
          : `${docRecord.name}_v${nextVer}.pdf`;
      const mimeType =
        typeof uploadedMeta.mimeType === 'string' ? uploadedMeta.mimeType : 'application/pdf';
      const sizeBytes =
        typeof uploadedMeta.sizeBytes === 'number' && uploadedMeta.sizeBytes > 0
          ? uploadedMeta.sizeBytes
          : 164000;
      const checksumSha256 =
        typeof uploadedMeta.checksumSha256 === 'string'
          ? uploadedMeta.checksumSha256
          : createHash('sha256')
              .update(`${docId}:v${nextVer}:${fileName}:${now}`)
              .digest('hex');

      const versionEntry = {
        version: nextVer,
        fileName,
        mimeType,
        sizeBytes,
        checksumSha256,
        uploadedBy: actor.id,
        uploadedAt: now,
      };
      docRecord.currentVersion = nextVer;
      docRecord.current = versionEntry;
      const versions = Array.isArray(docRecord.versions) ? docRecord.versions : [];
      versions.unshift(versionEntry);
      docRecord.versions = versions;

      appendAuditEvent(bundle, actor, 'document.version_added', 'document', docId, {}, { version: nextVer, checksumSha256 });
      return { status: 200, body: docRecord };
    }

    if (method === 'POST' && sub === 'archive') {
      docRecord.status = 'ARCHIVED';
      appendAuditEvent(bundle, actor, 'document.archived', 'document', docId);
      return { status: 200, body: docRecord };
    }

    if (method === 'POST' && sub === 'download-url') {
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      const downloadUrl =
        typeof docRecord.storageDownloadUrl === 'string' && docRecord.storageDownloadUrl.length > 0
          ? docRecord.storageDownloadUrl
          : `/api/v1/documents/download?token=${encodeURIComponent(`${docId}:${Date.now()}`)}`;
      appendAuditEvent(bundle, actor, 'document.downloaded', 'document', docId);
      return {
        status: 200,
        body: {
          url: downloadUrl,
          expiresAt,
        },
      };
    }
  }

  if (path === '/exports') {
    if (method === 'GET') {
      return {
        status: 200,
        body: {
          data: bundle.exportsList,
          meta: { page: 1, pageSize: 25, total: bundle.exportsList.length },
        },
      };
    }
    if (method === 'POST') {
      const kind = String(body?.kind ?? 'REGISTRY');
      const created = {
        id: randomUUID(),
        kind,
        status: 'DONE',
        documentId: randomUUID(),
        createdAt: nowIso(),
        completedAt: nowIso(),
      };
      bundle.exportsList.unshift(created);
      return { status: 201, body: created };
    }
  }

  if (path === '/ledger/corrections' && method === 'POST') {
    return {
      status: 201,
      body: {
        id: randomUUID(),
        status: 'PENDING',
        reason: body?.reason ?? '',
        createdAt: nowIso(),
      },
    };
  }

  if (path === '/platform/hosting' && method === 'GET') {
    const customDomain =
      typeof (bundle.tenants[0] as Record<string, any> | undefined)?.customDomain === 'string'
        ? String((bundle.tenants[0] as Record<string, any>).customDomain)
        : 'veris-assets.com';
    const lastVerifiedAt =
      typeof (bundle.tenants[0] as Record<string, any> | undefined)?.domainVerifiedAt === 'string'
        ? String((bundle.tenants[0] as Record<string, any>).domainVerifiedAt)
        : '2026-11-14T07:30:00.000Z';
    const domainStatus =
      typeof (bundle.tenants[0] as Record<string, any> | undefined)?.domainStatus === 'string'
        ? String((bundle.tenants[0] as Record<string, any>).domainStatus)
        : 'READY_FOR_DNS_CUTOVER';

    return {
      status: 200,
      body: {
        projectId: 'lyrical-responder-8v0ns',
        firestoreDatabaseId: 'ai-studio-verisassets-ada71c71-7f25-4c33-b48c-42e784996aee',
        backendId: 'veris-assets-web',
        region: 'europe-west2',
        rootDir: 'apps/web',
        customDomain,
        wwwDomain: `www.${customDomain}`,
        defaultAppHostingUrl: 'https://veris-assets-web--lyrical-responder-8v0ns.europe-west2.hosted.app',
        cloudRunPreviewUrl:
          'https://ais-pre-bxfbje6q2yktaaefeiksl5-1002230516292.europe-west2.run.app',
        domainStatus,
        sslCertificateStatus: 'MANAGED_AUTO_PROVISION',
        lastVerifiedAt,
        runConfig: {
          minInstances: 0,
          maxInstances: 10,
          concurrency: 80,
          cpu: 1,
          memoryMiB: 512,
        },
        dnsRecords: [
          {
            type: 'A',
            host: '@',
            value: '199.36.158.100',
            ttl: '3600',
            purpose: 'Routage Anycast Google Cloud / Firebase App Hosting (apex veris-assets.com)',
          },
          {
            type: 'TXT',
            host: '@',
            value: 'fah-claim=002-02-ef8b90d1-lyrical-responder-8v0ns',
            ttl: '3600',
            purpose: 'Vérification de propriété du domaine et émission du certificat SSL managé',
          },
          {
            type: 'CNAME',
            host: 'www',
            value: 'veris-assets.com.',
            ttl: '3600',
            purpose: 'Redirection canonique HTTPS www.veris-assets.com vers veris-assets.com',
          },
        ],
        authorizedAuthDomains: [
          'veris-assets.com',
          'www.veris-assets.com',
          'lyrical-responder-8v0ns.firebaseapp.com',
          'veris-assets-web--lyrical-responder-8v0ns.europe-west2.hosted.app',
        ],
      },
    };
  }

  if (path === '/platform/hosting/verify' && method === 'POST') {
    const customDomain =
      typeof body?.customDomain === 'string' && body.customDomain.trim().length > 0
        ? body.customDomain.trim().toLowerCase()
        : 'veris-assets.com';
    const verifiedAt = nowIso();
    if (bundle.tenants[0]) {
      const primaryTenant = bundle.tenants[0] as Record<string, any>;
      primaryTenant.customDomain = customDomain;
      primaryTenant.domainVerifiedAt = verifiedAt;
      primaryTenant.domainStatus = 'ACTIVE_SSL_PROVISIONED';
    }
    appendAuditEvent(
      bundle,
      actor,
      'hosting.domain_verified',
      'tenant',
      String(bundle.tenants[0]?.id ?? '10000000-0000-4000-8000-000000000001'),
      { domainStatus: { before: 'READY_FOR_DNS_CUTOVER', after: 'ACTIVE_SSL_PROVISIONED' } },
      {
        customDomain,
        projectId: 'lyrical-responder-8v0ns',
        firestoreDatabaseId: 'ai-studio-verisassets-ada71c71-7f25-4c33-b48c-42e784996aee',
      },
    );
    return {
      status: 200,
      body: {
        ok: true,
        customDomain,
        domainStatus: 'ACTIVE_SSL_PROVISIONED',
        sslCertificateStatus: 'ACTIVE',
        lastVerifiedAt: verifiedAt,
        firestoreConnected: true,
        collectionsSynced: [
          'tenants',
          'issuances',
          'investors',
          'subscriptions',
          'positions',
          'ledger',
          'distributions',
          'transfers',
          'auditEvents',
        ].length,
      },
    };
  }

  return null;
}
