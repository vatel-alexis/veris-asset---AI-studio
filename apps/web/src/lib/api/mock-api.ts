import { PERMISSIONS, ROLE_PERMISSIONS, type Permission, type RoleCode } from '@veris/shared';
import { handleWorkflowRequest } from './workflows';

export const DEMO_COOKIE = 'veris_demo_user';
const DEMO_PASSWORD = 'DemoPassword!2026';

interface DemoAccountRecord {
  id: string;
  email: string;
  name: string;
  role: RoleCode;
  tenant: 'northwind' | 'contoso' | null;
  locale: 'en-GB' | 'fr-FR';
}

const DEMO_ACCOUNTS: readonly DemoAccountRecord[] = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    email: 'platform.admin@example.com',
    name: 'Platform Admin (demo)',
    role: 'PLATFORM_ADMIN',
    tenant: null,
    locale: 'en-GB',
  },
  {
    id: '00000000-0000-4000-8000-000000000002',
    email: 'northwind.admin1@example.com',
    name: 'Northwind Admin One (demo)',
    role: 'ISSUER_ADMIN',
    tenant: 'northwind',
    locale: 'fr-FR',
  },
  {
    id: '00000000-0000-4000-8000-000000000003',
    email: 'northwind.admin2@example.com',
    name: 'Northwind Admin Two (demo)',
    role: 'ISSUER_ADMIN',
    tenant: 'northwind',
    locale: 'en-GB',
  },
  {
    id: '00000000-0000-4000-8000-000000000004',
    email: 'northwind.operator@example.com',
    name: 'Northwind Operator (demo)',
    role: 'ISSUER_OPERATOR',
    tenant: 'northwind',
    locale: 'fr-FR',
  },
  {
    id: '00000000-0000-4000-8000-000000000005',
    email: 'northwind.compliance@example.com',
    name: 'Northwind Compliance (demo)',
    role: 'COMPLIANCE_OFFICER',
    tenant: 'northwind',
    locale: 'en-GB',
  },
  {
    id: '00000000-0000-4000-8000-000000000006',
    email: 'northwind.auditor@example.com',
    name: 'Northwind Auditor (demo)',
    role: 'AUDITOR',
    tenant: 'northwind',
    locale: 'en-GB',
  },
  {
    id: '00000000-0000-4000-8000-000000000007',
    email: 'investor.a@example.com',
    name: 'Investor A (demo)',
    role: 'INVESTOR',
    tenant: 'northwind',
    locale: 'en-GB',
  },
  {
    id: '00000000-0000-4000-8000-000000000008',
    email: 'investor.b@example.com',
    name: 'Investor B (demo)',
    role: 'INVESTOR',
    tenant: 'northwind',
    locale: 'fr-FR',
  },
  {
    id: '00000000-0000-4000-8000-000000000009',
    email: 'investor.c@example.com',
    name: 'Investor C (demo)',
    role: 'INVESTOR',
    tenant: 'northwind',
    locale: 'en-GB',
  },
  {
    id: '00000000-0000-4000-8000-000000000010',
    email: 'investor.d@example.com',
    name: 'Investor D (demo)',
    role: 'INVESTOR',
    tenant: 'northwind',
    locale: 'fr-FR',
  },
  {
    id: '00000000-0000-4000-8000-000000000011',
    email: 'contoso.admin@example.com',
    name: 'Contoso Admin (demo)',
    role: 'ISSUER_ADMIN',
    tenant: 'contoso',
    locale: 'en-GB',
  },
  {
    id: '00000000-0000-4000-8000-000000000012',
    email: 'contoso.operator@example.com',
    name: 'Contoso Operator (demo)',
    role: 'ISSUER_OPERATOR',
    tenant: 'contoso',
    locale: 'en-GB',
  },
];

const TENANTS = [
  {
    id: '10000000-0000-4000-8000-000000000001',
    key: 'northwind',
    legalName: 'Northwind Asset Management SAS (demo)',
    tradeName: 'Northwind AM',
    countryCode: 'FR',
    baseCurrency: 'EUR',
    defaultLocale: 'en-GB' as const,
    timezone: 'Europe/Paris',
    organizationType: 'ASSET_MANAGER' as const,
    status: 'ACTIVE' as const,
    version: 1,
    createdAt: '2026-01-15T09:00:00.000Z',
  },
  {
    id: '10000000-0000-4000-8000-000000000002',
    key: 'contoso',
    legalName: 'Contoso Private Markets S.à r.l. (demo)',
    tradeName: 'Contoso PM',
    countryCode: 'LU',
    baseCurrency: 'EUR',
    defaultLocale: 'en-GB' as const,
    timezone: 'Europe/Luxembourg',
    organizationType: 'ISSUER' as const,
    status: 'ACTIVE' as const,
    version: 1,
    createdAt: '2026-02-01T09:00:00.000Z',
  },
];

const ISSUANCES = [
  {
    id: '20000000-0000-4000-8000-000000000001',
    name: 'Northwind Senior Debt 2026',
    code: 'NWSD26',
    description: 'Senior secured loans to European mid-market companies (demo).',
    assetCategory: 'PRIVATE_DEBT',
    countryCode: 'FR',
    currency: 'EUR',
    legalIssuerName: 'Northwind Senior Debt SCSp (demo)',
    spvName: null,
    status: 'SUBSCRIPTION_OPEN',
    wizardStep: 'REVIEW',
    version: 4,
    submittedBy: '00000000-0000-4000-8000-000000000004',
    submittedAt: '2026-10-13T10:00:00.000Z',
    approvedBy: '00000000-0000-4000-8000-000000000002',
    approvedAt: '2026-10-15T10:00:00.000Z',
    cancellationReason: null,
    createdAt: '2026-10-08T09:00:00.000Z',
    updatedAt: '2026-10-23T10:00:00.000Z',
    terms: {
      targetAmount: '10000000.00',
      minimumAmount: '5000000.00',
      maximumAmount: '12000000.00',
      nominalValue: '1000.00',
      totalUnits: '10000',
      interestRate: '0.06',
      rateType: 'FIXED',
      distributionFrequency: 'QUARTERLY',
      dayCount: 'ACT_365F',
      businessDayConvention: 'FOLLOWING',
      roundingMethod: 'HALF_EVEN',
      issueDate: '2027-01-01',
      maturityDate: '2032-01-01',
      subscriptionStartDate: '2026-10-23',
      subscriptionEndDate: '2026-12-22',
      minSubscriptionAmount: '100000.00',
      maxAmountPerInvestor: '2000000.00',
      allocationMode: 'MANUAL',
      earlyRedemptionAllowed: false,
      recordDateOffsetBusinessDays: 1,
    },
    eligibilityRules: {
      allowedCountries: [],
      excludedCountries: [],
      allowedInvestorTypes: [],
      allowedClassifications: ['PROFESSIONAL', 'ELIGIBLE_COUNTERPARTY'],
      kycMinRemainingValidityDays: 30,
      transfersAllowed: true,
      lockupEndDate: null,
      maxInvestors: 50,
    },
  },
  {
    id: '20000000-0000-4000-8000-000000000002',
    name: 'Aurora Solar Park 2027',
    code: 'AURORA27',
    description: 'Construction and operation of a 40 MW solar park (demo).',
    assetCategory: 'RENEWABLE_ENERGY',
    countryCode: 'ES',
    currency: 'EUR',
    legalIssuerName: 'Aurora Solar SPV SL (demo)',
    spvName: 'Aurora Solar SPV SL (demo)',
    status: 'APPROVED',
    wizardStep: 'REVIEW',
    version: 3,
    submittedBy: '00000000-0000-4000-8000-000000000004',
    submittedAt: '2026-11-07T10:00:00.000Z',
    approvedBy: '00000000-0000-4000-8000-000000000002',
    approvedAt: '2026-11-09T10:00:00.000Z',
    cancellationReason: null,
    createdAt: '2026-11-03T09:00:00.000Z',
    updatedAt: '2026-11-09T10:00:00.000Z',
    terms: {
      targetAmount: '5000000.00',
      minimumAmount: '2000000.00',
      maximumAmount: '6000000.00',
      nominalValue: '1000.00',
      totalUnits: '5000',
      interestRate: '0.05',
      rateType: 'FIXED',
      distributionFrequency: 'SEMI_ANNUAL',
      dayCount: '30E_360',
      businessDayConvention: 'FOLLOWING',
      roundingMethod: 'HALF_EVEN',
      issueDate: '2027-02-05',
      maturityDate: '2034-02-05',
      subscriptionStartDate: '2026-11-22',
      subscriptionEndDate: '2027-01-21',
      minSubscriptionAmount: '50000.00',
      maxAmountPerInvestor: '1000000.00',
      allocationMode: 'MANUAL',
      earlyRedemptionAllowed: false,
      recordDateOffsetBusinessDays: 1,
    },
    eligibilityRules: {
      allowedCountries: [],
      excludedCountries: ['US'],
      allowedInvestorTypes: ['LEGAL_ENTITY'],
      allowedClassifications: ['PROFESSIONAL', 'ELIGIBLE_COUNTERPARTY'],
      kycMinRemainingValidityDays: 90,
      transfersAllowed: true,
      lockupEndDate: '2027-08-05',
      maxInvestors: 30,
    },
  },
  {
    id: '20000000-0000-4000-8000-000000000003',
    name: 'Northwind Infrastructure Notes 2026',
    code: 'NWIN26',
    description: 'Notes financing fibre networks in rural France (demo).',
    assetCategory: 'INFRASTRUCTURE',
    countryCode: 'FR',
    currency: 'EUR',
    legalIssuerName: 'Northwind Infrastructure Notes SAS (demo)',
    spvName: null,
    status: 'SUBSCRIPTION_CLOSED',
    wizardStep: 'REVIEW',
    version: 5,
    submittedBy: '00000000-0000-4000-8000-000000000004',
    submittedAt: '2026-09-13T10:00:00.000Z',
    approvedBy: '00000000-0000-4000-8000-000000000002',
    approvedAt: '2026-09-15T10:00:00.000Z',
    cancellationReason: null,
    createdAt: '2026-09-08T09:00:00.000Z',
    updatedAt: '2026-11-10T10:00:00.000Z',
    terms: {
      targetAmount: '1000000.00',
      minimumAmount: '500000.00',
      maximumAmount: '1000000.00',
      nominalValue: '1000.00',
      totalUnits: '1000',
      interestRate: '0.045',
      rateType: 'FIXED',
      distributionFrequency: 'SEMI_ANNUAL',
      dayCount: '30E_360',
      businessDayConvention: 'FOLLOWING',
      roundingMethod: 'HALF_EVEN',
      issueDate: '2026-12-02',
      maturityDate: '2029-12-02',
      subscriptionStartDate: '2026-09-28',
      subscriptionEndDate: '2026-11-09',
      minSubscriptionAmount: '100000.00',
      maxAmountPerInvestor: '600000.00',
      allocationMode: 'MANUAL',
      earlyRedemptionAllowed: false,
      recordDateOffsetBusinessDays: 1,
    },
    eligibilityRules: {
      allowedCountries: [],
      excludedCountries: [],
      allowedInvestorTypes: [],
      allowedClassifications: ['PROFESSIONAL', 'ELIGIBLE_COUNTERPARTY'],
      kycMinRemainingValidityDays: 30,
      transfersAllowed: true,
      lockupEndDate: null,
      maxInvestors: 20,
    },
  },
  {
    id: '20000000-0000-4000-8000-000000000004',
    name: 'Northwind Private Debt Fund I',
    code: 'NWPD1',
    description: 'Unitranche loans to European mid-market companies (demo).',
    assetCategory: 'PRIVATE_DEBT',
    countryCode: 'LU',
    currency: 'EUR',
    legalIssuerName: 'Northwind Private Debt Fund I SCSp (demo)',
    spvName: null,
    status: 'ALLOCATED',
    wizardStep: 'REVIEW',
    version: 6,
    submittedBy: '00000000-0000-4000-8000-000000000004',
    submittedAt: '2026-08-14T09:00:00.000Z',
    approvedBy: '00000000-0000-4000-8000-000000000002',
    approvedAt: '2026-08-16T09:00:00.000Z',
    cancellationReason: null,
    createdAt: '2026-08-09T09:00:00.000Z',
    updatedAt: '2026-10-06T10:00:00.000Z',
    terms: {
      targetAmount: '2000000.00',
      minimumAmount: '1000000.00',
      maximumAmount: '2000000.00',
      nominalValue: '1000.00',
      totalUnits: '2000',
      interestRate: '0.055',
      rateType: 'FIXED',
      distributionFrequency: 'QUARTERLY',
      dayCount: '30E_360',
      businessDayConvention: 'FOLLOWING',
      roundingMethod: 'HALF_EVEN',
      issueDate: '2026-11-02',
      maturityDate: '2030-11-02',
      subscriptionStartDate: '2026-08-24',
      subscriptionEndDate: '2026-10-03',
      minSubscriptionAmount: '100000.00',
      maxAmountPerInvestor: '1000000.00',
      allocationMode: 'MANUAL',
      earlyRedemptionAllowed: false,
      recordDateOffsetBusinessDays: 1,
    },
    eligibilityRules: {
      allowedCountries: [],
      excludedCountries: [],
      allowedInvestorTypes: [],
      allowedClassifications: ['PROFESSIONAL', 'ELIGIBLE_COUNTERPARTY'],
      kycMinRemainingValidityDays: 30,
      transfersAllowed: true,
      lockupEndDate: null,
      maxInvestors: 50,
    },
  },
  {
    id: '20000000-0000-4000-8000-000000000005',
    name: 'Northwind Green Notes',
    code: 'NWGN',
    description: 'Notes financing energy renovation of French schools (demo).',
    assetCategory: 'RENEWABLE_ENERGY',
    countryCode: 'FR',
    currency: 'EUR',
    legalIssuerName: 'Northwind Green Notes SAS (demo)',
    spvName: null,
    status: 'ACTIVE',
    wizardStep: 'REVIEW',
    version: 7,
    submittedBy: '00000000-0000-4000-8000-000000000004',
    submittedAt: '2025-09-01T09:00:00.000Z',
    approvedBy: '00000000-0000-4000-8000-000000000002',
    approvedAt: '2025-09-03T09:00:00.000Z',
    cancellationReason: null,
    createdAt: '2025-08-25T09:00:00.000Z',
    updatedAt: '2025-10-20T10:00:00.000Z',
    terms: {
      targetAmount: '1000000.00',
      minimumAmount: '500000.00',
      maximumAmount: '1000000.00',
      nominalValue: '1000.00',
      totalUnits: '1000',
      interestRate: '0.05',
      rateType: 'FIXED',
      distributionFrequency: 'SEMI_ANNUAL',
      dayCount: '30E_360',
      businessDayConvention: 'FOLLOWING',
      roundingMethod: 'HALF_EVEN',
      issueDate: '2025-10-15',
      maturityDate: '2028-10-15',
      subscriptionStartDate: '2025-09-10',
      subscriptionEndDate: '2025-10-10',
      minSubscriptionAmount: '100000.00',
      maxAmountPerInvestor: '1000000.00',
      allocationMode: 'MANUAL',
      earlyRedemptionAllowed: false,
      recordDateOffsetBusinessDays: 1,
    },
    eligibilityRules: {
      allowedCountries: [],
      excludedCountries: [],
      allowedInvestorTypes: [],
      allowedClassifications: ['PROFESSIONAL', 'ELIGIBLE_COUNTERPARTY'],
      kycMinRemainingValidityDays: 30,
      transfersAllowed: true,
      lockupEndDate: null,
      maxInvestors: 50,
    },
  },
];

const INVESTORS = [
  {
    id: '30000000-0000-4000-8000-000000000001',
    type: 'LEGAL_ENTITY',
    legalName: 'Alpine Capital Partners SAS (demo)',
    tradeName: null,
    legalForm: 'SAS',
    registrationNumber: 'DEMO-FR-100000',
    taxId: 'FRDEMO000001',
    countryOfIncorporation: 'FR',
    address: { line1: '1 Demo Street', postalCode: '69001', city: 'Lyon', countryCode: 'FR' },
    contactEmail: 'contact.alpine@example.com',
    phone: '+352 20 00 10 00',
    classification: 'PROFESSIONAL',
    profileStatus: 'ACTIVE',
    kycStatus: 'APPROVED',
    kycLastReviewDate: '2026-10-12',
    kycExpiryDate: '2027-10-12',
    riskLevel: 'LOW',
    eligibilityStatus: 'ELIGIBLE',
    recipientCode: 'VA-ALPINE-01',
    version: 2,
    createdAt: '2026-09-01T09:00:00.000Z',
    updatedAt: '2026-10-13T10:00:00.000Z',
  },
  {
    id: '30000000-0000-4000-8000-000000000002',
    type: 'LEGAL_ENTITY',
    legalName: 'Baltic Pension Fund SICAV (demo)',
    tradeName: null,
    legalForm: 'SICAV',
    registrationNumber: 'DEMO-LU-107919',
    taxId: 'LUDEMO000002',
    countryOfIncorporation: 'LU',
    address: { line1: '2 Demo Street', postalCode: '1001', city: 'Luxembourg', countryCode: 'LU' },
    contactEmail: 'contact.baltic@example.com',
    phone: '+352 20 00 11 00',
    classification: 'ELIGIBLE_COUNTERPARTY',
    profileStatus: 'ACTIVE',
    kycStatus: 'APPROVED',
    kycLastReviewDate: '2026-10-03',
    kycExpiryDate: '2027-10-03',
    riskLevel: 'LOW',
    eligibilityStatus: 'ELIGIBLE',
    recipientCode: 'VA-BALTIC-02',
    version: 2,
    createdAt: '2026-09-02T09:00:00.000Z',
    updatedAt: '2026-10-04T10:00:00.000Z',
  },
  {
    id: '30000000-0000-4000-8000-000000000003',
    type: 'LEGAL_ENTITY',
    legalName: 'Cedar Family Office SA (demo)',
    tradeName: null,
    legalForm: 'SA',
    registrationNumber: 'DEMO-CH-115838',
    taxId: 'CHDEMO000003',
    countryOfIncorporation: 'CH',
    address: { line1: '3 Demo Street', postalCode: '1201', city: 'Geneva', countryCode: 'CH' },
    contactEmail: 'contact.cedar@example.com',
    phone: '+352 20 00 12 00',
    classification: 'PROFESSIONAL',
    profileStatus: 'ACTIVE',
    kycStatus: 'APPROVED',
    kycLastReviewDate: '2026-09-24',
    kycExpiryDate: '2027-09-24',
    riskLevel: 'LOW',
    eligibilityStatus: 'ELIGIBLE',
    recipientCode: 'VA-CEDAR-03',
    version: 2,
    createdAt: '2026-09-03T09:00:00.000Z',
    updatedAt: '2026-09-25T10:00:00.000Z',
  },
  {
    id: '30000000-0000-4000-8000-000000000004',
    type: 'LEGAL_ENTITY',
    legalName: 'Danube Versicherung AG (demo)',
    tradeName: null,
    legalForm: 'AG',
    registrationNumber: 'DEMO-DE-123757',
    taxId: 'DEDEMO000004',
    countryOfIncorporation: 'DE',
    address: { line1: '4 Demo Street', postalCode: '80331', city: 'Munich', countryCode: 'DE' },
    contactEmail: 'contact.danube@example.com',
    phone: '+352 20 00 13 00',
    classification: 'ELIGIBLE_COUNTERPARTY',
    profileStatus: 'ACTIVE',
    kycStatus: 'APPROVED',
    kycLastReviewDate: '2026-09-15',
    kycExpiryDate: '2027-09-15',
    riskLevel: 'LOW',
    eligibilityStatus: 'ELIGIBLE',
    recipientCode: 'VA-DANUBE-04',
    version: 2,
    createdAt: '2026-09-04T09:00:00.000Z',
    updatedAt: '2026-09-16T10:00:00.000Z',
  },
  {
    id: '30000000-0000-4000-8000-000000000005',
    type: 'LEGAL_ENTITY',
    legalName: 'Harbour Insurance Group plc (demo)',
    tradeName: null,
    legalForm: 'plc',
    registrationNumber: 'DEMO-IE-195028',
    taxId: 'IEDEMO000005',
    countryOfIncorporation: 'IE',
    address: { line1: '5 Demo Street', postalCode: 'T12', city: 'Cork', countryCode: 'IE' },
    contactEmail: 'contact.harbour@example.com',
    phone: '+352 20 00 22 00',
    classification: 'PROFESSIONAL',
    profileStatus: 'ACTIVE',
    kycStatus: 'APPROVED',
    kycLastReviewDate: '2025-12-02',
    kycExpiryDate: '2026-12-02',
    riskLevel: 'LOW',
    eligibilityStatus: 'ELIGIBLE',
    recipientCode: 'VA-HARBOUR-05',
    version: 2,
    createdAt: '2025-11-28T09:00:00.000Z',
    updatedAt: '2025-12-03T10:00:00.000Z',
  },
  {
    id: '30000000-0000-4000-8000-000000000006',
    type: 'LEGAL_ENTITY',
    legalName: 'Iris Asset Holdings GmbH (demo)',
    tradeName: null,
    legalForm: 'GmbH',
    registrationNumber: 'DEMO-DE-202947',
    taxId: 'DEDEMO000006',
    countryOfIncorporation: 'DE',
    address: { line1: '6 Demo Street', postalCode: '60311', city: 'Frankfurt', countryCode: 'DE' },
    contactEmail: 'contact.iris@example.com',
    phone: '+352 20 00 23 00',
    classification: 'PROFESSIONAL',
    profileStatus: 'ACTIVE',
    kycStatus: 'EXPIRED',
    kycLastReviewDate: '2025-11-02',
    kycExpiryDate: '2026-11-02',
    riskLevel: 'LOW',
    eligibilityStatus: 'ELIGIBLE',
    recipientCode: 'VA-IRIS-06',
    version: 2,
    createdAt: '2025-10-25T09:00:00.000Z',
    updatedAt: '2026-11-03T10:00:00.000Z',
  },
  {
    id: '30000000-0000-4000-8000-000000000007',
    type: 'LEGAL_ENTITY',
    legalName: 'Kestrel Treasury BV (demo)',
    tradeName: null,
    legalForm: 'BV',
    registrationNumber: 'DEMO-NL-218785',
    taxId: 'NLDEMO000007',
    countryOfIncorporation: 'NL',
    address: { line1: '7 Demo Street', postalCode: '1012', city: 'Amsterdam', countryCode: 'NL' },
    contactEmail: 'contact.kestrel@example.com',
    phone: '+352 20 00 25 00',
    classification: 'PROFESSIONAL',
    profileStatus: 'ACTIVE',
    kycStatus: 'PENDING_REVIEW',
    kycLastReviewDate: null,
    kycExpiryDate: null,
    riskLevel: null,
    eligibilityStatus: 'NOT_ASSESSED',
    recipientCode: 'VA-KESTREL-07',
    version: 1,
    createdAt: '2026-11-05T09:00:00.000Z',
    updatedAt: '2026-11-06T09:00:00.000Z',
  },
];

const SUBSCRIPTIONS = [
  {
    id: '40000000-0000-4000-8000-000000000001',
    issuanceId: '20000000-0000-4000-8000-000000000003',
    issuanceName: 'Northwind Infrastructure Notes 2026',
    issuanceCode: 'NWIN26',
    investorId: '30000000-0000-4000-8000-000000000001',
    investorName: 'Alpine Capital Partners SAS (demo)',
    status: 'APPROVED',
    requestedUnits: '500',
    requestedAmount: '500000.00',
    allocatedUnits: null,
    amountDue: null,
    currency: 'EUR',
    paymentReference: 'FR76 0000 0000 0000 (demo)',
    submittedAt: '2026-10-13T09:00:00.000Z',
    decidedAt: '2026-10-14T11:00:00.000Z',
    rejectionReason: null,
    cancellationReason: null,
    version: 4,
  },
  {
    id: '40000000-0000-4000-8000-000000000002',
    issuanceId: '20000000-0000-4000-8000-000000000003',
    issuanceName: 'Northwind Infrastructure Notes 2026',
    issuanceCode: 'NWIN26',
    investorId: '30000000-0000-4000-8000-000000000002',
    investorName: 'Baltic Pension Fund SICAV (demo)',
    status: 'APPROVED',
    requestedUnits: '400',
    requestedAmount: '400000.00',
    allocatedUnits: null,
    amountDue: null,
    currency: 'EUR',
    paymentReference: 'FR76 0000 0000 0000 (demo)',
    submittedAt: '2026-10-23T09:00:00.000Z',
    decidedAt: '2026-10-24T11:00:00.000Z',
    rejectionReason: null,
    cancellationReason: null,
    version: 4,
  },
  {
    id: '40000000-0000-4000-8000-000000000003',
    issuanceId: '20000000-0000-4000-8000-000000000003',
    issuanceName: 'Northwind Infrastructure Notes 2026',
    issuanceCode: 'NWIN26',
    investorId: '30000000-0000-4000-8000-000000000003',
    investorName: 'Cedar Family Office SA (demo)',
    status: 'APPROVED',
    requestedUnits: '300',
    requestedAmount: '300000.00',
    allocatedUnits: null,
    amountDue: null,
    currency: 'EUR',
    paymentReference: 'FR76 0000 0000 0000 (demo)',
    submittedAt: '2026-11-02T09:00:00.000Z',
    decidedAt: '2026-11-03T11:00:00.000Z',
    rejectionReason: null,
    cancellationReason: null,
    version: 4,
  },
  {
    id: '40000000-0000-4000-8000-000000000004',
    issuanceId: '20000000-0000-4000-8000-000000000001',
    issuanceName: 'Northwind Senior Debt 2026',
    issuanceCode: 'NWSD26',
    investorId: '30000000-0000-4000-8000-000000000001',
    investorName: 'Alpine Capital Partners SAS (demo)',
    status: 'SUBMITTED',
    requestedUnits: '200',
    requestedAmount: '200000.00',
    allocatedUnits: null,
    amountDue: null,
    currency: 'EUR',
    paymentReference: 'FR76 0000 0000 0000 (demo)',
    submittedAt: '2026-11-10T09:00:00.000Z',
    decidedAt: null,
    rejectionReason: null,
    cancellationReason: null,
    version: 2,
  },
];

const POSITIONS = [
  {
    id: '50000000-0000-4000-8000-000000000001',
    issuanceId: '20000000-0000-4000-8000-000000000004',
    issuanceName: 'Northwind Private Debt Fund I',
    issuanceCode: 'NWPD1',
    accountId: '51000000-0000-4000-8000-000000000001',
    accountType: 'ISSUER_TREASURY',
    investorId: null,
    investorName: null,
    quantityHeld: '200',
    quantityBlocked: '0',
    quantityAvailable: '200',
    acquisitionAmount: '0.00',
    nominalValue: '1000.00',
    currency: 'EUR',
  },
  {
    id: '50000000-0000-4000-8000-000000000002',
    issuanceId: '20000000-0000-4000-8000-000000000004',
    issuanceName: 'Northwind Private Debt Fund I',
    issuanceCode: 'NWPD1',
    accountId: '51000000-0000-4000-8000-000000000002',
    accountType: 'INVESTOR',
    investorId: '30000000-0000-4000-8000-000000000001',
    investorName: 'Alpine Capital Partners SAS (demo)',
    quantityHeld: '800',
    quantityBlocked: '100',
    quantityAvailable: '700',
    acquisitionAmount: '800000.00',
    nominalValue: '1000.00',
    currency: 'EUR',
  },
  {
    id: '50000000-0000-4000-8000-000000000003',
    issuanceId: '20000000-0000-4000-8000-000000000004',
    issuanceName: 'Northwind Private Debt Fund I',
    issuanceCode: 'NWPD1',
    accountId: '51000000-0000-4000-8000-000000000003',
    accountType: 'INVESTOR',
    investorId: '30000000-0000-4000-8000-000000000002',
    investorName: 'Baltic Pension Fund SICAV (demo)',
    quantityHeld: '600',
    quantityBlocked: '0',
    quantityAvailable: '600',
    acquisitionAmount: '600000.00',
    nominalValue: '1000.00',
    currency: 'EUR',
  },
  {
    id: '50000000-0000-4000-8000-000000000004',
    issuanceId: '20000000-0000-4000-8000-000000000004',
    issuanceName: 'Northwind Private Debt Fund I',
    issuanceCode: 'NWPD1',
    accountId: '51000000-0000-4000-8000-000000000004',
    accountType: 'INVESTOR',
    investorId: '30000000-0000-4000-8000-000000000003',
    investorName: 'Cedar Family Office SA (demo)',
    quantityHeld: '400',
    quantityBlocked: '0',
    quantityAvailable: '400',
    acquisitionAmount: '400000.00',
    nominalValue: '1000.00',
    currency: 'EUR',
  },
  {
    id: '50000000-0000-4000-8000-000000000005',
    issuanceId: '20000000-0000-4000-8000-000000000005',
    issuanceName: 'Northwind Green Notes',
    issuanceCode: 'NWGN',
    accountId: '51000000-0000-4000-8000-000000000005',
    accountType: 'ISSUER_TREASURY',
    investorId: null,
    investorName: null,
    quantityHeld: '500',
    quantityBlocked: '0',
    quantityAvailable: '500',
    acquisitionAmount: '0.00',
    nominalValue: '1000.00',
    currency: 'EUR',
  },
  {
    id: '50000000-0000-4000-8000-000000000006',
    issuanceId: '20000000-0000-4000-8000-000000000005',
    issuanceName: 'Northwind Green Notes',
    issuanceCode: 'NWGN',
    accountId: '51000000-0000-4000-8000-000000000006',
    accountType: 'INVESTOR',
    investorId: '30000000-0000-4000-8000-000000000001',
    investorName: 'Alpine Capital Partners SAS (demo)',
    quantityHeld: '100',
    quantityBlocked: '0',
    quantityAvailable: '100',
    acquisitionAmount: '100000.00',
    nominalValue: '1000.00',
    currency: 'EUR',
  },
];

const LEDGER_ENTRIES = [
  {
    id: '52000000-0000-4000-8000-000000000001',
    issuanceId: '20000000-0000-4000-8000-000000000004',
    sequenceNo: 1,
    type: 'ISSUANCE',
    source: { accountId: null, type: null, investorId: null, investorName: null },
    destination: {
      accountId: '51000000-0000-4000-8000-000000000001',
      type: 'ISSUER_TREASURY',
      investorId: null,
      investorName: null,
    },
    quantity: '2000',
    effectiveDate: '2026-10-06',
    recordedAt: '2026-10-06T10:00:00.000Z',
    businessReference: 'allocation-round:nwpd1',
    reversesEntryId: null,
    previousHash: '0000000000000000000000000000000000000000000000000000000000000000',
    entryHash: '9f3ca41e8b2d4019a7c65f321098fedcba9876543210fedcba9876543210a41e',
  },
  {
    id: '52000000-0000-4000-8000-000000000002',
    issuanceId: '20000000-0000-4000-8000-000000000004',
    sequenceNo: 2,
    type: 'ALLOCATION',
    source: {
      accountId: '51000000-0000-4000-8000-000000000001',
      type: 'ISSUER_TREASURY',
      investorId: null,
      investorName: null,
    },
    destination: {
      accountId: '51000000-0000-4000-8000-000000000002',
      type: 'INVESTOR',
      investorId: '30000000-0000-4000-8000-000000000001',
      investorName: 'Alpine Capital Partners SAS (demo)',
    },
    quantity: '800',
    effectiveDate: '2026-10-06',
    recordedAt: '2026-10-06T10:01:00.000Z',
    businessReference: 'allocation-round:nwpd1',
    reversesEntryId: null,
    previousHash: '9f3ca41e8b2d4019a7c65f321098fedcba9876543210fedcba9876543210a41e',
    entryHash: '4b7d0c92e1a53908f6b4123456789abcdef0123456789abcdef0123456780c92',
  },
  {
    id: '52000000-0000-4000-8000-000000000003',
    issuanceId: '20000000-0000-4000-8000-000000000004',
    sequenceNo: 3,
    type: 'UNBLOCK',
    source: {
      accountId: '51000000-0000-4000-8000-000000000002',
      type: 'INVESTOR',
      investorId: '30000000-0000-4000-8000-000000000001',
      investorName: 'Alpine Capital Partners SAS (demo)',
    },
    destination: {
      accountId: '51000000-0000-4000-8000-000000000002',
      type: 'INVESTOR',
      investorId: '30000000-0000-4000-8000-000000000001',
      investorName: 'Alpine Capital Partners SAS (demo)',
    },
    quantity: '800',
    effectiveDate: '2026-10-08',
    recordedAt: '2026-10-08T15:00:00.000Z',
    businessReference: 'payment:nwpd1:alpine',
    reversesEntryId: null,
    previousHash: '4b7d0c92e1a53908f6b4123456789abcdef0123456789abcdef0123456780c92',
    entryHash: 'e21a7f58c90123456789abcdef0123456789abcdef0123456789abcdef017f58',
  },
];

const DISTRIBUTIONS = [
  {
    id: '60000000-0000-4000-8000-000000000001',
    issuanceId: '20000000-0000-4000-8000-000000000005',
    issuanceName: 'Northwind Green Notes',
    issuanceCode: 'NWGN',
    type: 'COUPON',
    status: 'PAID',
    currency: 'EUR',
    totalGrossAmount: '12500.00',
    totalUnroundedAmount: '12500.00000000',
    roundingDifference: '0.00000000',
    beneficiaryCount: 3,
    calculationNo: 1,
    dayCount: '30E_360',
    periodFraction: '0.5',
    rate: '0.05',
    nominalValue: '1000.00',
    roundingMethod: 'HALF_EVEN',
    calculatedAt: '2026-04-16T09:00:00.000Z',
    preparedBy: '00000000-0000-4000-8000-000000000002',
    approvedBy: '00000000-0000-4000-8000-000000000003',
    approvedAt: '2026-04-17T10:00:00.000Z',
    version: 6,
    schedule: {
      id: '61000000-0000-4000-8000-000000000001',
      sequence: 1,
      type: 'COUPON',
      periodStart: '2025-10-15',
      periodEnd: '2026-04-15',
      recordDate: '2026-04-14',
      paymentDate: '2026-04-15',
      status: 'DISTRIBUTED',
    },
  },
];

const TRANSFERS = [
  {
    id: '70000000-0000-4000-8000-000000000001',
    issuanceId: '20000000-0000-4000-8000-000000000004',
    issuanceName: 'Northwind Private Debt Fund I',
    issuanceCode: 'NWPD1',
    fromInvestorId: '30000000-0000-4000-8000-000000000001',
    fromInvestorName: 'Alpine Capital Partners SAS (demo)',
    toInvestorId: '30000000-0000-4000-8000-000000000004',
    toInvestorName: 'Danube Versicherung AG (demo)',
    recipientCode: 'VA-DANUBE-04',
    quantity: '100',
    indicativePrice: '1010.00',
    indicativePriceCurrency: 'EUR',
    status: 'COMPLIANCE_REVIEW',
    submittedAt: '2026-11-11T10:00:00.000Z',
    decidedAt: null,
    rejectionReason: null,
    cancellationReason: null,
    updatedAt: '2026-11-11T10:00:00.000Z',
    version: 3,
  },
];

const AUDIT_EVENTS = [
  {
    id: '80000000-0000-4000-8000-000000000001',
    occurredAt: '2026-11-11T10:00:00.000Z',
    actorUserId: '00000000-0000-4000-8000-000000000007',
    actorName: 'Investor A (demo)',
    actorRole: 'INVESTOR',
    action: 'transfer.submitted',
    resourceType: 'transfer',
    resourceId: '70000000-0000-4000-8000-000000000001',
    result: 'SUCCESS' as const,
    correlationId: 'corr-demo-001',
    changedValues: { status: { before: 'DRAFT', after: 'COMPLIANCE_REVIEW' } },
    metadata: { quantity: '100', issuanceCode: 'NWPD1' },
  },
  {
    id: '80000000-0000-4000-8000-000000000002',
    occurredAt: '2026-11-10T09:00:00.000Z',
    actorUserId: '00000000-0000-4000-8000-000000000007',
    actorName: 'Investor A (demo)',
    actorRole: 'INVESTOR',
    action: 'subscription.submitted',
    resourceType: 'subscription',
    resourceId: '40000000-0000-4000-8000-000000000004',
    result: 'SUCCESS' as const,
    correlationId: 'corr-demo-002',
    changedValues: { status: { before: 'DRAFT', after: 'SUBMITTED' } },
    metadata: { requestedUnits: '200', issuanceCode: 'NWSD26' },
  },
  {
    id: '80000000-0000-4000-8000-000000000003',
    occurredAt: '2026-11-09T10:00:00.000Z',
    actorUserId: '00000000-0000-4000-8000-000000000002',
    actorName: 'Northwind Admin One (demo)',
    actorRole: 'ISSUER_ADMIN',
    action: 'issuance.approved',
    resourceType: 'issuance',
    resourceId: '20000000-0000-4000-8000-000000000002',
    result: 'SUCCESS' as const,
    correlationId: 'corr-demo-003',
    changedValues: { status: { before: 'UNDER_REVIEW', after: 'APPROVED' } },
    metadata: { code: 'AURORA27' },
  },
];

const CUSTOM_USERS: DemoAccountRecord[] = [];
const ALLOCATION_ROUNDS: Array<{ id: string; [key: string]: unknown }> = [];
const KYC_CASES: Array<{ id: string; [key: string]: unknown }> = [];
const NOTIFICATIONS: Array<{ id: string; [key: string]: unknown }> = [
  {
    id: '90000000-0000-4000-8000-000000000001',
    type: 'SUBSCRIPTION_SUBMITTED',
    payload: { issuanceCode: 'NWSD26', investorName: 'Alpine Capital Partners SAS (demo)' },
    readAt: null,
    createdAt: '2026-11-10T09:00:00.000Z',
  },
  {
    id: '90000000-0000-4000-8000-000000000002',
    type: 'TRANSFER_SUBMITTED',
    payload: { issuanceCode: 'NWPD1', quantity: '100' },
    readAt: null,
    createdAt: '2026-11-11T10:00:00.000Z',
  },
];
const DOCUMENTS: Array<{ id: string; [key: string]: unknown }> = [
  {
    id: '91000000-0000-4000-8000-000000000001',
    type: 'ISSUANCE_DOCUMENT',
    name: 'Term Sheet — Northwind Senior Debt 2026',
    confidentiality: 'INVESTOR_VISIBLE',
    ownerType: 'ISSUANCE',
    investorId: null,
    issuanceId: '20000000-0000-4000-8000-000000000001',
    status: 'ACTIVE',
    currentVersion: 1,
    storageBucket: 'lyrical-responder-8v0ns.firebasestorage.app',
    storageObjectPath:
      'veris-documents/issuance/91000000-0000-4000-8000-000000000001/v1-NWSD26_Term_Sheet_2026.pdf',
    current: {
      version: 1,
      fileName: 'NWSD26_Term_Sheet_2026.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 348160,
      checksumSha256: 'a9f4b28e1c7305d64892ab4f0e1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c',
      uploadedBy: '00000000-0000-4000-8000-000000000002',
      uploadedAt: '2026-10-12T09:15:00.000Z',
    },
    versions: [
      {
        version: 1,
        fileName: 'NWSD26_Term_Sheet_2026.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 348160,
        checksumSha256: 'a9f4b28e1c7305d64892ab4f0e1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c',
        uploadedBy: '00000000-0000-4000-8000-000000000002',
        uploadedAt: '2026-10-12T09:15:00.000Z',
      },
    ],
    createdAt: '2026-10-12T09:15:00.000Z',
  },
  {
    id: '91000000-0000-4000-8000-000000000002',
    type: 'REPORT',
    name: 'Rapport périodique T3 2026 — Northwind Green Notes',
    confidentiality: 'INTERNAL',
    ownerType: 'TENANT',
    investorId: null,
    issuanceId: '20000000-0000-4000-8000-000000000005',
    status: 'ACTIVE',
    currentVersion: 1,
    storageBucket: 'lyrical-responder-8v0ns.firebasestorage.app',
    storageObjectPath:
      'veris-documents/tenant/91000000-0000-4000-8000-000000000002/v1-NWGN_Rapport_T3_2026.pdf',
    current: {
      version: 1,
      fileName: 'NWGN_Rapport_T3_2026.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 512000,
      checksumSha256: '7e3c91d40b8a2f56e120987654321fedcba0987654321fedcba0987654321fed',
      uploadedBy: '00000000-0000-4000-8000-000000000002',
      uploadedAt: '2026-10-28T14:30:00.000Z',
    },
    versions: [
      {
        version: 1,
        fileName: 'NWGN_Rapport_T3_2026.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 512000,
        checksumSha256: '7e3c91d40b8a2f56e120987654321fedcba0987654321fedcba0987654321fed',
        uploadedBy: '00000000-0000-4000-8000-000000000002',
        uploadedAt: '2026-10-28T14:30:00.000Z',
      },
    ],
    createdAt: '2026-10-28T14:30:00.000Z',
  },
  {
    id: '91000000-0000-4000-8000-000000000003',
    type: 'KYC_EVIDENCE',
    name: 'Dossier KYB & Statuts — Alpine Capital Partners SAS',
    confidentiality: 'CONFIDENTIAL',
    ownerType: 'INVESTOR',
    investorId: '30000000-0000-4000-8000-000000000001',
    issuanceId: null,
    status: 'ACTIVE',
    currentVersion: 1,
    storageBucket: 'lyrical-responder-8v0ns.firebasestorage.app',
    storageObjectPath:
      'veris-documents/investor/91000000-0000-4000-8000-000000000003/v1-Alpine_KYB_Statuts_2026.pdf',
    current: {
      version: 1,
      fileName: 'Alpine_KYB_Statuts_2026.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 284600,
      checksumSha256: '3c8f10a94d72e5b19087654321abcdef0123456789abcdef0123456789abcdef',
      uploadedBy: '00000000-0000-4000-8000-000000000005',
      uploadedAt: '2026-10-05T11:00:00.000Z',
    },
    versions: [
      {
        version: 1,
        fileName: 'Alpine_KYB_Statuts_2026.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 284600,
        checksumSha256: '3c8f10a94d72e5b19087654321abcdef0123456789abcdef0123456789abcdef',
        uploadedBy: '00000000-0000-4000-8000-000000000005',
        uploadedAt: '2026-10-05T11:00:00.000Z',
      },
    ],
    createdAt: '2026-10-05T11:00:00.000Z',
  },
];
const EXPORTS_LIST: Array<{ id: string; [key: string]: unknown }> = [];
const TRANSITIONS: Record<string, unknown[]> = {};
const SUBSCRIPTION_PAYMENTS: Record<string, unknown> = {};
const ISSUANCE_INVITATIONS: Record<string, unknown[]> = {};
const INVESTOR_PEOPLE: Record<
  string,
  { representatives: unknown[]; beneficialOwners: unknown[]; comments: unknown[] }
> = {};
const USER_INVITATIONS: Array<{ id: string; [key: string]: unknown }> = [];

type AnyEntity = Record<string, unknown>;

function normalizeSeedEntities() {
  for (const iss of ISSUANCES as Array<AnyEntity>) {
    if (iss.statusComment === undefined) iss.statusComment = null;
    const terms = iss.terms as AnyEntity | undefined;
    if (terms) {
      terms.gracePeriodDays ??= 5;
      terms.principalRepayment ??= 'AT_MATURITY';
      terms.version ??= 1;
    }
    const rules = iss.eligibilityRules as AnyEntity | undefined;
    if (rules) {
      rules.professionalOnly ??= true;
      rules.kycRequired ??= true;
      rules.manualTransferApproval ??= true;
      rules.rulesVersion ??= 1;
      rules.version ??= 1;
    }
  }
  for (const sub of SUBSCRIPTIONS as Array<AnyEntity>) {
    sub.comment ??= null;
    sub.eligibilityAssessmentId ??= '95000000-0000-4000-8000-000000000001';
    sub.createdAt ??= sub.submittedAt ?? '2026-10-13T09:00:00.000Z';
    sub.updatedAt ??= sub.decidedAt ?? sub.submittedAt ?? '2026-10-14T11:00:00.000Z';
  }
  for (const tr of TRANSFERS as Array<AnyEntity>) {
    tr.reviewedAt ??= tr.decidedAt ?? null;
    tr.eligibilityAssessmentId ??= '95000000-0000-4000-8000-000000000002';
  }
  for (const dist of DISTRIBUTIONS as Array<AnyEntity>) {
    dist.calculationVersion ??= '1.0';
    dist.snapshotId ??= '96000000-0000-4000-8000-000000000001';
    dist.statusComment ??= null;
    dist.instruction ??= {
      id: '97000000-0000-4000-8000-000000000001',
      status: 'CONFIRMED',
      totalAmount: dist.totalGrossAmount ?? '12500.00',
      currency: dist.currency ?? 'EUR',
      lineCount: dist.beneficiaryCount ?? 3,
      generatedAt: dist.approvedAt ?? '2026-04-17T10:00:00.000Z',
      preparedBy: dist.preparedBy,
      confirmedBy: dist.approvedBy,
      confirmedAt: dist.approvedAt ?? '2026-04-17T11:00:00.000Z',
      providerReference: 'DIST-NWGN-001',
    };
  }
  if (DOCUMENTS.length === 0) {
    DOCUMENTS.push({
      id: '91000000-0000-4000-8000-000000000001',
      type: 'ISSUANCE_DOCUMENT',
      name: 'Term Sheet — Northwind Senior Debt 2026',
      confidentiality: 'INVESTOR_VISIBLE',
      ownerType: 'ISSUANCE',
      investorId: null,
      issuanceId: '20000000-0000-4000-8000-000000000001',
      status: 'ACTIVE',
      currentVersion: 1,
      storageBucket: 'lyrical-responder-8v0ns.firebasestorage.app',
      storageObjectPath:
        'veris-documents/issuance/91000000-0000-4000-8000-000000000001/v1-NWSD26_Term_Sheet_2026.pdf',
      current: {
        version: 1,
        fileName: 'NWSD26_Term_Sheet_2026.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 348160,
        checksumSha256: 'a9f4b28e1c7305d64892ab4f0e1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c',
        uploadedBy: '00000000-0000-4000-8000-000000000002',
        uploadedAt: '2026-10-12T09:15:00.000Z',
      },
      versions: [
        {
          version: 1,
          fileName: 'NWSD26_Term_Sheet_2026.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 348160,
          checksumSha256: 'a9f4b28e1c7305d64892ab4f0e1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c',
          uploadedBy: '00000000-0000-4000-8000-000000000002',
          uploadedAt: '2026-10-12T09:15:00.000Z',
        },
      ],
      createdAt: '2026-10-12T09:15:00.000Z',
    });
  }
  for (const docItem of DOCUMENTS as Array<AnyEntity>) {
    docItem.type ??= 'ISSUANCE_DOCUMENT';
    docItem.confidentiality ??= 'INTERNAL';
    docItem.ownerType ??= 'TENANT';
    docItem.investorId ??= null;
    docItem.issuanceId ??= null;
    docItem.status ??= 'ACTIVE';
    docItem.currentVersion ??= 1;
    docItem.createdAt ??= '2026-10-12T09:15:00.000Z';
    docItem.storageBucket ??= 'lyrical-responder-8v0ns.firebasestorage.app';
    if (!docItem.current) {
      const fallbackVersion = {
        version: Number(docItem.currentVersion ?? 1),
        fileName: String(docItem.originalName ?? docItem.name ?? 'Document_Veris.pdf'),
        mimeType: String(docItem.mimeType ?? 'application/pdf'),
        sizeBytes: Number(docItem.sizeBytes ?? 124800),
        checksumSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        uploadedBy: '00000000-0000-4000-8000-000000000002',
        uploadedAt: String(docItem.createdAt),
      };
      docItem.current = fallbackVersion;
      docItem.versions = [fallbackVersion];
    }
  }
}

normalizeSeedEntities();

export function getDomainBundleForFirestore() {
  return {
    tenants: TENANTS as Array<{ id: string; [key: string]: unknown }>,
    issuances: ISSUANCES as Array<{ id: string; [key: string]: unknown }>,
    investors: INVESTORS as Array<{ id: string; [key: string]: unknown }>,
    subscriptions: SUBSCRIPTIONS as Array<{ id: string; [key: string]: unknown }>,
    positions: POSITIONS as Array<{ id: string; [key: string]: unknown }>,
    ledgerEntries: LEDGER_ENTRIES as Array<{ id: string; [key: string]: unknown }>,
    distributions: DISTRIBUTIONS as Array<{ id: string; [key: string]: unknown }>,
    transfers: TRANSFERS as Array<{ id: string; [key: string]: unknown }>,
    auditEvents: AUDIT_EVENTS as Array<{ id: string; [key: string]: unknown }>,
    allocationRounds: ALLOCATION_ROUNDS,
    kycCases: KYC_CASES,
    notifications: NOTIFICATIONS,
    documents: DOCUMENTS,
    exportsList: EXPORTS_LIST,
    transitions: TRANSITIONS,
    subscriptionPayments: SUBSCRIPTION_PAYMENTS,
    issuanceInvitations: ISSUANCE_INVITATIONS,
    investorPeople: INVESTOR_PEOPLE,
    customUsers: CUSTOM_USERS,
    userInvitations: USER_INVITATIONS,
  };
}

export function buildCurrentUserFromEmail(email: string | undefined) {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();
  let account =
    DEMO_ACCOUNTS.find((candidate) => candidate.email.toLowerCase() === normalized) ??
    CUSTOM_USERS.find((candidate) => candidate.email.toLowerCase() === normalized);

  if (!account && normalized.includes('@')) {
    account = {
      id: '00000000-0000-4000-8000-000000000099',
      email: normalized,
      name: normalized.split('@')[0] ?? 'Firebase User',
      role: 'ISSUER_ADMIN',
      tenant: 'northwind',
      locale: 'fr-FR',
    };
  }
  if (!account) return null;

  const tenant = account.tenant
    ? (TENANTS.find((row) => row.key === account.tenant) ?? null)
    : null;
  const permissions = { ...ROLE_PERMISSIONS[account.role] } as Record<Permission, 'all' | 'own'>;
  const homePortal =
    account.role === 'PLATFORM_ADMIN'
      ? ('platform' as const)
      : account.role === 'INVESTOR'
        ? ('investor' as const)
        : ('issuer' as const);
  const portals: Array<'issuer' | 'investor' | 'platform'> =
    normalized === 'vatelalexis@gmail.com'
      ? ['issuer', 'platform', 'investor']
      : [homePortal];
  return {
    user: {
      id: account.id,
      email: account.email,
      name: account.name,
      locale: account.locale,
    },
    tenant: tenant
      ? {
          id: tenant.id,
          legalName: tenant.legalName,
          tradeName: tenant.tradeName,
          baseCurrency: tenant.baseCurrency,
          defaultLocale: tenant.defaultLocale,
          timezone: tenant.timezone,
        }
      : null,
    roles: [account.role],
    permissions,
    homePortal,
    portals,
    mfa: { required: false, enabled: true },
    breakGlass: null,
  };
}

function paginate<T>(rows: T[], page = 1, pageSize = 25) {
  const start = (page - 1) * pageSize;
  return {
    data: rows.slice(start, start + pageSize),
    meta: { page, pageSize, total: rows.length },
  };
}

export function handleMockApiRequest(
  method: string,
  pathname: string,
  searchParams: URLSearchParams,
  cookieEmail: string | undefined,
  body?: Record<string, unknown>,
): { status: number; body: unknown; setCookie?: string } {
  normalizeSeedEntities();
  const path = pathname.replace(/^\/api\/v1/, '');

  if (method === 'GET' && path === '/auth/demo-accounts') {
    return {
      status: 200,
      body: {
        password: DEMO_PASSWORD,
        accounts: DEMO_ACCOUNTS.map((account) => ({
          email: account.email,
          name: account.name,
          role: account.role,
          tenant: account.tenant,
          totpCode: null,
        })),
      },
    };
  }

  if (method === 'POST' && (path === '/auth/sign-in' || path === '/auth/firebase-sign-in')) {
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const displayName = typeof body?.name === 'string' ? body.name.trim() : '';
    const firebaseUid = typeof body?.uid === 'string' ? body.uid.trim() : '';
    const demoMatch = DEMO_ACCOUNTS.find((candidate) => candidate.email.toLowerCase() === email);
    let targetEmail = demoMatch?.email;

    if (!targetEmail && email.includes('@')) {
      const existingCustom = CUSTOM_USERS.find((u) => u.email.toLowerCase() === email);
      if (!existingCustom) {
        CUSTOM_USERS.push({
          id: firebaseUid || '00000000-0000-4000-8000-000000000099',
          email,
          name: displayName || email.split('@')[0] || 'Utilisateur Firebase',
          role: 'ISSUER_ADMIN',
          tenant: 'northwind',
          locale: 'fr-FR',
        });
      }
      targetEmail = email;
    }

    const resolvedEmail = targetEmail ?? DEMO_ACCOUNTS[1]!.email;
    return {
      status: 200,
      body: { status: 'SIGNED_IN' },
      setCookie: `${DEMO_COOKIE}=${encodeURIComponent(resolvedEmail)}; Path=/; HttpOnly; SameSite=Lax`,
    };
  }

  if (method === 'POST' && path === '/auth/sign-out') {
    return {
      status: 200,
      body: { ok: true },
      setCookie: `${DEMO_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`,
    };
  }

  if (method === 'GET' && path === '/auth/me') {
    const user = buildCurrentUserFromEmail(cookieEmail);
    if (!user) {
      return {
        status: 401,
        body: { error: { code: 'AUTHENTICATION_REQUIRED', message: 'Not signed in' } },
      };
    }
    return { status: 200, body: user };
  }

  if (method === 'POST' && path === '/public/contact') {
    return { status: 201, body: { ok: true } };
  }

  const currentUser = buildCurrentUserFromEmail(cookieEmail);
  const actor = {
    id: currentUser?.user.id ?? '00000000-0000-4000-8000-000000000002',
    email: currentUser?.user.email ?? 'northwind.admin1@example.com',
    name: currentUser?.user.name ?? 'Northwind Admin One (demo)',
    role: currentUser?.roles[0] ?? 'ISSUER_ADMIN',
  };

  // Delegate all business workflows and sub-resource endpoints to workflows.ts
  const workflowResult = handleWorkflowRequest(
    getDomainBundleForFirestore(),
    method,
    path,
    searchParams,
    actor,
    body,
  );
  if (workflowResult) {
    return workflowResult;
  }

  if (method === 'GET' && path === '/reference/countries') {
    return {
      status: 200,
      body: [
        { code: 'FR', nameEn: 'France', nameFr: 'France' },
        { code: 'LU', nameEn: 'Luxembourg', nameFr: 'Luxembourg' },
        { code: 'DE', nameEn: 'Germany', nameFr: 'Allemagne' },
        { code: 'ES', nameEn: 'Spain', nameFr: 'Espagne' },
        { code: 'NL', nameEn: 'Netherlands', nameFr: 'Pays-Bas' },
        { code: 'CH', nameEn: 'Switzerland', nameFr: 'Suisse' },
        { code: 'IE', nameEn: 'Ireland', nameFr: 'Irlande' },
        { code: 'GB', nameEn: 'United Kingdom', nameFr: 'Royaume-Uni' },
        { code: 'US', nameEn: 'United States', nameFr: 'États-Unis' },
      ],
    };
  }

  if (method === 'GET' && path === '/reference/currencies') {
    return {
      status: 200,
      body: [
        { code: 'EUR', minorUnits: 2 },
        { code: 'USD', minorUnits: 2 },
        { code: 'GBP', minorUnits: 2 },
        { code: 'CHF', minorUnits: 2 },
      ],
    };
  }

  if (method === 'GET' && path === '/notifications/unread-count') {
    const unread = NOTIFICATIONS.filter((n) => !n.readAt).length;
    return { status: 200, body: { count: unread } };
  }

  if (method === 'GET' && path === '/notifications') {
    return {
      status: 200,
      body: paginate(NOTIFICATIONS),
    };
  }

  if (method === 'GET' && path === '/notifications/preferences') {
    return { status: 200, body: [] };
  }

  if (method === 'GET' && path === '/dashboard') {
    const pendingSubs = SUBSCRIPTIONS.filter((s) =>
      ['SUBMITTED', 'UNDER_REVIEW'].includes(s.status),
    ).length;
    const pendingTransfers = TRANSFERS.filter((t) =>
      ['SUBMITTED', 'COMPLIANCE_REVIEW'].includes(t.status),
    ).length;
    const pendingPayments = SUBSCRIPTIONS.filter((s) => s.status === 'PAYMENT_PENDING').length;

    return {
      status: 200,
      body: {
        administered: { EUR: '2300000.00' },
        issuances: ISSUANCES.length,
        activeIssuances: ISSUANCES.filter((i) => ['ACTIVE', 'ALLOCATED'].includes(i.status)).length,
        subscribed: { EUR: '1400000.00' },
        subscriptionRate: '0.78',
        allocated: { EUR: '2300000.00' },
        investors: INVESTORS.length,
        holders: 3,
        eligibleInvestors: INVESTORS.filter((i) => i.eligibilityStatus === 'ELIGIBLE').length,
        investorValidationRate: '0.85',
        averageTicket: { EUR: '466666.67' },
        distributed: { EUR: '12500.00' },
        pendingOperations: pendingSubs + pendingTransfers + pendingPayments + 1,
        pendingSubscriptions: pendingSubs,
        pendingPayments,
        pendingTransfers,
        kycExpiring: 1,
        upcomingPayments: [
          {
            scheduleId: '61000000-0000-4000-8000-000000000002',
            issuanceId: '20000000-0000-4000-8000-000000000005',
            name: 'Northwind Green Notes',
            code: 'NWGN',
            type: 'COUPON',
            sequence: 2,
            paymentDate: '2026-10-15',
            overdue: true,
          },
        ],
        recentActivity: AUDIT_EVENTS.slice(0, 8).map((event) => ({
          id: event.id,
          action: event.action,
          actorName: event.actorName,
          occurredAt: event.occurredAt,
        })),
        issuanceRows: ISSUANCES.slice(0, 6).map((iss) => ({
          issuanceId: iss.id,
          name: iss.name,
          code: iss.code,
          status: iss.status,
          currency: iss.currency ?? 'EUR',
          target: iss.terms?.targetAmount ?? '1000000.00',
          subscribed: '500000.00',
          progress: '0.50',
          holders: POSITIONS.filter(
            (p) => p.issuanceId === iss.id && p.accountType === 'INVESTOR',
          ).length,
          maturityDate: iss.terms?.maturityDate ?? '2030-01-01',
        })),
      },
    };
  }

  if (method === 'GET' && path === '/platform/metrics') {
    return {
      status: 200,
      body: {
        organisations: TENANTS.length,
        activeUsers: DEMO_ACCOUNTS.length + CUSTOM_USERS.length,
        issuances: ISSUANCES.length,
        activeIssuances: ISSUANCES.filter((i) => ['ACTIVE', 'ALLOCATED'].includes(i.status)).length,
        investors: INVESTORS.length,
        nominalAdministered: '2300000.00',
        ledgerOperations: LEDGER_ENTRIES.length,
        failures30Days: 0,
        averageDecisionHours: '4.5',
      },
    };
  }

  if (method === 'GET' && path === '/tenants') {
    return { status: 200, body: paginate(TENANTS) };
  }

  if (method === 'GET' && path.startsWith('/tenants/')) {
    const id = path.split('/')[2];
    const tenant = TENANTS.find((row) => row.id === id) ?? TENANTS[0]!;
    return { status: 200, body: tenant };
  }

  if (method === 'GET' && path === '/issuances') {
    const status = searchParams.get('status');
    const category = searchParams.get('assetCategory');
    const q = (searchParams.get('q') ?? '').toLowerCase();
    const filtered = ISSUANCES.filter(
      (row) =>
        (!status || row.status === status) &&
        (!category || row.assetCategory === category) &&
        (!q || row.name.toLowerCase().includes(q) || row.code.toLowerCase().includes(q)),
    );
    return { status: 200, body: paginate(filtered) };
  }

  if (method === 'GET' && path.startsWith('/issuances/')) {
    const parts = path.split('/');
    const id = parts[2];
    const sub = parts[3];
    const issuance = ISSUANCES.find((row) => row.id === id) ?? ISSUANCES[0]!;
    if (!sub) return { status: 200, body: issuance };
    if (sub === 'coupon-schedule') return { status: 200, body: DISTRIBUTIONS.map((d) => d.schedule) };
    if (sub === 'ledger') {
      return {
        status: 200,
        body: paginate(LEDGER_ENTRIES.filter((row) => row.issuanceId === id)),
      };
    }
    if (sub === 'positions') {
      return {
        status: 200,
        body: paginate(
          POSITIONS.filter((row) => row.issuanceId === id && row.accountType === 'INVESTOR'),
        ),
      };
    }
  }

  if (method === 'GET' && path === '/investors') {
    const kycStatus = searchParams.get('kycStatus');
    const q = (searchParams.get('q') ?? '').toLowerCase();
    const filtered = INVESTORS.filter(
      (row) =>
        (!kycStatus || row.kycStatus === kycStatus) &&
        (!q || row.legalName.toLowerCase().includes(q)),
    );
    return { status: 200, body: paginate(filtered) };
  }

  if (method === 'GET' && path.startsWith('/investors/')) {
    const parts = path.split('/');
    const id = parts[2];
    const investor = INVESTORS.find((row) => row.id === id) ?? INVESTORS[0]!;
    return { status: 200, body: investor };
  }

  if (method === 'GET' && path === '/subscriptions') {
    const status = searchParams.get('status');
    const issuanceId = searchParams.get('issuanceId');
    const filtered = SUBSCRIPTIONS.filter(
      (row) => (!status || row.status === status) && (!issuanceId || row.issuanceId === issuanceId),
    );
    return { status: 200, body: paginate(filtered) };
  }

  if (method === 'GET' && path.startsWith('/subscriptions/')) {
    const parts = path.split('/');
    const id = parts[2];
    const subscription = SUBSCRIPTIONS.find((row) => row.id === id) ?? SUBSCRIPTIONS[0]!;
    return { status: 200, body: subscription };
  }

  if (method === 'GET' && path === '/positions') {
    const issuanceId = searchParams.get('issuanceId');
    const filtered = issuanceId
      ? POSITIONS.filter((row) => row.issuanceId === issuanceId)
      : POSITIONS.filter((row) => row.accountType === 'INVESTOR');
    return { status: 200, body: paginate(filtered) };
  }

  if (method === 'GET' && path === '/ledger') {
    const issuanceId = searchParams.get('issuanceId');
    const filtered = issuanceId
      ? LEDGER_ENTRIES.filter((row) => row.issuanceId === issuanceId)
      : LEDGER_ENTRIES;
    return { status: 200, body: paginate(filtered) };
  }

  if (method === 'GET' && path === '/ledger/reconciliation') {
    return {
      status: 200,
      body: {
        consistent: true,
        entryCount: LEDGER_ENTRIES.length,
        lastSequence: LEDGER_ENTRIES.length,
        checkedAt: new Date().toISOString(),
        anomalies: [],
      },
    };
  }

  if (method === 'GET' && path === '/ledger/corrections') {
    return { status: 200, body: [] };
  }

  if (method === 'GET' && path === '/distributions') {
    const status = searchParams.get('status');
    const filtered = status
      ? DISTRIBUTIONS.filter((row) => row.status === status)
      : DISTRIBUTIONS;
    return { status: 200, body: paginate(filtered) };
  }

  if (method === 'GET' && path.startsWith('/distributions/')) {
    const parts = path.split('/');
    const id = parts[2];
    const dist = DISTRIBUTIONS.find((d) => d.id === id) ?? DISTRIBUTIONS[0]!;
    return { status: 200, body: dist };
  }

  if (method === 'GET' && path === '/transfers') {
    const status = searchParams.get('status');
    const filtered = status ? TRANSFERS.filter((row) => row.status === status) : TRANSFERS;
    return { status: 200, body: paginate(filtered) };
  }

  if (method === 'GET' && path.startsWith('/transfers/')) {
    const parts = path.split('/');
    const id = parts[2];
    const tr = TRANSFERS.find((t) => t.id === id) ?? TRANSFERS[0]!;
    return { status: 200, body: tr };
  }

  if (method === 'GET' && path === '/tasks') {
    return {
      status: 200,
      body: [
        ...SUBSCRIPTIONS.filter((s) => ['SUBMITTED', 'UNDER_REVIEW'].includes(s.status)).map(
          (s) => ({
            kind: 'SUBSCRIPTION_REVIEW',
            resourceType: 'subscription',
            resourceId: s.id,
            reference: `${s.issuanceCode} · ${s.investorName}`,
            dueDate: null,
            waitingSince: s.submittedAt ?? '2026-11-10T09:00:00.000Z',
          }),
        ),
        ...TRANSFERS.filter((t) => t.status === 'COMPLIANCE_REVIEW').map((t) => ({
          kind: 'TRANSFER_APPROVAL',
          resourceType: 'transfer',
          resourceId: t.id,
          reference: `${t.issuanceCode} · ${t.quantity} units`,
          dueDate: null,
          waitingSince: t.submittedAt ?? '2026-11-11T10:00:00.000Z',
        })),
        ...ISSUANCES.filter((i) => i.status === 'SUBSCRIPTION_CLOSED').map((i) => ({
          kind: 'ALLOCATION_PREPARE',
          resourceType: 'issuance',
          resourceId: i.id,
          reference: `${i.code} · ${i.name}`,
          dueDate: '2026-12-02',
          waitingSince: i.updatedAt ?? '2026-11-10T10:00:00.000Z',
        })),
      ],
    };
  }

  if (method === 'GET' && path === '/audit-events/actions') {
    const uniqueActions = Array.from(new Set(AUDIT_EVENTS.map((e) => e.action)));
    return {
      status: 200,
      body: uniqueActions,
    };
  }

  if (method === 'GET' && path === '/audit-events') {
    return { status: 200, body: paginate(AUDIT_EVENTS) };
  }

  if (method === 'GET' && path.startsWith('/audit-events/')) {
    const id = path.split('/')[2];
    return {
      status: 200,
      body: AUDIT_EVENTS.find((row) => row.id === id) ?? AUDIT_EVENTS[0]!,
    };
  }

  if (method === 'GET' && path === '/documents') {
    const investorId = searchParams.get('investorId');
    const issuanceId = searchParams.get('issuanceId');
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const filtered = DOCUMENTS.filter(
      (doc) =>
        (!investorId || doc.investorId === investorId) &&
        (!issuanceId || doc.issuanceId === issuanceId) &&
        (!type || doc.type === type) &&
        (!status || doc.status === status),
    );
    return { status: 200, body: paginate(filtered) };
  }

  if (method === 'GET' && path === '/settings') {
    return { status: 200, body: TENANTS[0]! };
  }

  if (method === 'GET' && path === '/users') {
    const allNorthwind = [
      ...DEMO_ACCOUNTS.filter((row) => row.tenant === 'northwind' && row.role !== 'INVESTOR'),
      ...CUSTOM_USERS.filter((row) => row.tenant === 'northwind'),
    ];
    return {
      status: 200,
      body: allNorthwind.map((row) => ({
        id: row.id,
        email: row.email,
        name: row.name,
        locale: row.locale,
        status: 'ACTIVE',
        roles: [row.role],
        mfaEnabled: true,
        lastLoginAt: '2026-11-12T08:30:00.000Z',
        createdAt: '2026-01-15T09:00:00.000Z',
        version: 1,
      })),
    };
  }

  if (method === 'GET' && path === '/me/portfolio') {
    return {
      status: 200,
      body: {
        nominalHeld: { EUR: '900000.00' },
        positions: POSITIONS.filter(
          (p) => p.investorId === '30000000-0000-4000-8000-000000000001',
        ).length,
        distributionsReceived: { EUR: '2500.00' },
        nextPayment: { date: '2027-04-15', code: 'NWGN' },
        pendingRequests: [
          ...SUBSCRIPTIONS.filter((s) =>
            ['SUBMITTED', 'UNDER_REVIEW', 'PAYMENT_PENDING'].includes(s.status),
          )
            .slice(0, 3)
            .map((s) => ({
              kind: 'SUBSCRIPTION',
              resourceId: s.id,
              reference: s.issuanceCode,
              status: s.status,
              updatedAt:
                (s as { updatedAt?: string }).updatedAt ??
                s.submittedAt ??
                '2026-11-10T09:00:00.000Z',
            })),
          ...TRANSFERS.filter((t) => ['SUBMITTED', 'COMPLIANCE_REVIEW'].includes(t.status))
            .slice(0, 3)
            .map((t) => ({
              kind: 'TRANSFER',
              resourceId: t.id,
              reference: t.issuanceCode,
              status: t.status,
              updatedAt: t.updatedAt ?? t.submittedAt ?? '2026-11-11T10:00:00.000Z',
            })),
        ],
      },
    };
  }

  if (method === 'GET' && path === '/me/investor') {
    return { status: 200, body: INVESTORS[0]! };
  }

  if (method === 'GET' && path === '/eligibility-assessments') {
    return { status: 200, body: paginate([]) };
  }

  void PERMISSIONS;
  return { status: 200, body: { data: [], meta: { page: 1, pageSize: 25, total: 0 } } };
}

