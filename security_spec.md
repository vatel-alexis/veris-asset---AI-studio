# Firestore Security Specification — Veris Assets

## 1. Data Invariants by Collection

### 1.1 `/users/{userId}` (`UserProfile`)
- **Exact Allowed Fields (`hasOnly`)**: `['uid', 'displayName', 'role', 'tenant', 'locale', 'createdAt', 'updatedAt']`
- **Required Fields (`hasAll`)**: `['uid', 'displayName', 'role', 'tenant', 'locale', 'createdAt', 'updatedAt']`
- **Field Types & Bounds**:
  - `uid`: `string`, `uid == userId`, `size >= 1 && size <= 128`
  - `displayName`: `string`, `size >= 1 && size <= 120`
  - `role`: `string` in `['PLATFORM_ADMIN', 'ISSUER_ADMIN', 'ISSUER_OPERATOR', 'COMPLIANCE_OFFICER', 'AUDITOR', 'INVESTOR']` (Non-admins can only self-assign `'INVESTOR'`)
  - `tenant`: `string`, `size >= 1 && size <= 64`
  - `locale`: `string` in `['en-GB', 'fr-FR']`
  - `createdAt`: `timestamp` (`request.time` on create)
  - `updatedAt`: `timestamp` (`request.time` on create and update)
- **Immutable Fields on Update**: `uid`, `role` (unless admin), `tenant` (unless admin), `createdAt`
- **Access Control**:
  - `get`: `isOwner(userId) || isAdmin()`
  - `list`: `isAdmin()` (prevents user enumeration)
  - `create`: `isVerified() && isOwner(userId)`
  - `update`: `isVerified() && (isOwner(userId) || isAdmin())`
  - `delete`: `isAdmin()`

### 1.2 `/users/{userId}/private/{docId}` (`UserPrivate`)
- **Exact Allowed Fields (`hasOnly`)**: `['ownerId', 'email', 'phone', 'createdAt', 'updatedAt']`
- **Required Fields (`hasAll`)**: `['ownerId', 'email', 'phone', 'createdAt', 'updatedAt']`
- **Field Types & Bounds**:
  - `ownerId`: `string`, `ownerId == userId`, `size >= 1 && size <= 128`
  - `email`: `string`, `size >= 3 && size <= 254`, matches email regex
  - `phone`: `string`, `size >= 0 && size <= 40`
  - `createdAt`: `timestamp` (`request.time` on create)
  - `updatedAt`: `timestamp` (`request.time` on create and update)
- **Immutable Fields on Update**: `ownerId`, `createdAt`
- **Access Control**:
  - `get`: `isOwner(userId)`
  - `list`: `false`
  - `create`, `update`: `isVerified() && isOwner(userId)`
  - `delete`: `isVerified() && isOwner(userId)`

### 1.3 `/admins/{userId}` (`AdminRole`)
- **Exact Allowed Fields (`hasOnly`)**: `['ownerId', 'role', 'createdAt']`
- **Required Fields (`hasAll`)**: `['ownerId', 'role', 'createdAt']`
- **Field Types & Bounds**:
  - `ownerId`: `string`, `ownerId == userId`, `size >= 1 && size <= 128`
  - `role`: `string` in `['PLATFORM_ADMIN', 'ISSUER_ADMIN']`
  - `createdAt`: `timestamp` (`request.time`)
- **Access Control**:
  - `get`: `isOwner(userId) || isAdmin()`
  - `list`: `isAdmin()`
  - `create`, `update`, `delete`: `isAdmin()`

### 1.4 `/issuances/{issuanceId}` (`Issuance`)
- **Exact Allowed Fields (`hasOnly`)**:
  `['id', 'ownerId', 'name', 'code', 'description', 'assetCategory', 'countryCode', 'currency', 'legalIssuerName', 'status', 'targetAmount', 'version', 'createdAt', 'updatedAt']`
- **Required Fields (`hasAll`)**:
  `['id', 'ownerId', 'name', 'code', 'description', 'assetCategory', 'countryCode', 'currency', 'legalIssuerName', 'status', 'targetAmount', 'version', 'createdAt', 'updatedAt']`
- **Field Types & Bounds**:
  - `id`: `string`, `id == issuanceId`, `size >= 1 && size <= 128`
  - `ownerId`: `string`, `ownerId == request.auth.uid`, `size >= 1 && size <= 128`
  - `name`: `string`, `size >= 1 && size <= 200`
  - `code`: `string`, `size >= 1 && size <= 32`
  - `description`: `string`, `size >= 1 && size <= 2000`
  - `assetCategory`: `string` in `['PRIVATE_DEBT', 'RENEWABLE_ENERGY', 'INFRASTRUCTURE', 'REAL_ESTATE', 'CORPORATE_BOND']`
  - `countryCode`: `string`, `size == 2`
  - `currency`: `string`, `size == 3`
  - `legalIssuerName`: `string`, `size >= 1 && size <= 200`
  - `status`: `string` in `['DRAFT', 'UNDER_REVIEW', 'APPROVED', 'SUBSCRIPTION_OPEN', 'SUBSCRIPTION_CLOSED', 'ALLOCATED', 'ACTIVE', 'MATURED', 'CANCELLED']`
  - `targetAmount`: `number`, `>= 0 && <= 100000000000`
  - `version`: `int`, `>= 1 && <= 1000000`
  - `createdAt`, `updatedAt`: `timestamp` (`request.time`)
- **Immutable Fields on Update**: `id`, `ownerId`, `code`, `currency`, `createdAt`
- **Access Control**:
  - `get`, `list`: `isSignedIn()`
  - `create`: `isAdmin()`
  - `update`: `isAdmin()`
  - `delete`: `isAdmin()`

### 1.5 `/subscriptions/{subscriptionId}` (`Subscription`)
- **Exact Allowed Fields (`hasOnly`)**:
  `['id', 'ownerId', 'issuanceId', 'issuanceCode', 'investorId', 'investorName', 'status', 'requestedUnits', 'requestedAmount', 'currency', 'createdAt', 'updatedAt']`
- **Required Fields (`hasAll`)**:
  `['id', 'ownerId', 'issuanceId', 'issuanceCode', 'investorId', 'investorName', 'status', 'requestedUnits', 'requestedAmount', 'currency', 'createdAt', 'updatedAt']`
- **Field Types & Bounds**:
  - `id`: `string`, `id == subscriptionId`, `size >= 1 && size <= 128`
  - `ownerId`: `string`, `ownerId == request.auth.uid`, `size >= 1 && size <= 128`
  - `issuanceId`: `string`, `size >= 1 && size <= 128`
  - `issuanceCode`: `string`, `size >= 1 && size <= 32`
  - `investorId`: `string`, `size >= 1 && size <= 128`
  - `investorName`: `string`, `size >= 1 && size <= 200`
  - `status`: `string` in `['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'PAYMENT_PENDING', 'PAYMENT_CONFIRMED', 'ALLOCATED', 'CANCELLED']`
  - `requestedUnits`: `int`, `>= 1 && <= 100000000`
  - `requestedAmount`: `number`, `>= 1 && <= 100000000000`
  - `currency`: `string`, `size == 3`
  - `createdAt`, `updatedAt`: `timestamp` (`request.time`)
- **Immutable Fields on Update**: `id`, `ownerId`, `issuanceId`, `issuanceCode`, `investorId`, `currency`, `createdAt`
- **Access Control**:
  - `get`: `isSignedIn() && (resource.data.ownerId == request.auth.uid || isAdmin())`
  - `list`: `isAdmin()`
  - `create`: `isVerified() && request.resource.data.ownerId == request.auth.uid && request.resource.data.status in ['DRAFT', 'SUBMITTED']`
  - `update`: `isVerified() && ((resource.data.ownerId == request.auth.uid && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status', 'updatedAt']) && request.resource.data.status == 'CANCELLED') || isAdmin())`
  - `delete`: `isAdmin()`

### 1.6 `/domainSnapshots/{snapshotId}` (`DomainSnapshot`)
- **Exact Allowed Fields (`hasOnly`)**: `['id', 'collection', 'payloadJson', 'updatedAt']`
- **Required Fields (`hasAll`)**: `['id', 'collection', 'payloadJson', 'updatedAt']`
- **Field Types & Bounds**:
  - `id`: `string`, `id == snapshotId`, `size >= 1 && size <= 128`
  - `collection`: `string` in `['tenants', 'issuances', 'investors', 'subscriptions', 'positions', 'ledger', 'distributions', 'transfers', 'auditEvents', 'notifications']`
  - `payloadJson`: `string`, `size >= 2 && size <= 500000`
  - `updatedAt`: `timestamp` (`request.time`)
- **Access Control**:
  - `get`, `list`: `isSignedIn()`
  - `create`, `update`, `delete`: `isAdmin()`

---

## 2. The "Dirty Dozen" Attack Payloads (Negative Test Cases)

1. **Missing Required Field**: Creating a `UserProfile` without `locale` or `Subscription` without `requestedUnits` -> **DENIED**.
2. **Extra Undocumented Field**: Injecting `{"isAdmin": true}` into `/users/{userId}` or `/subscriptions/{subscriptionId}` -> **DENIED** by `keys().hasOnly(...)`.
3. **Type Mismatch**: Sending `requestedUnits: "500"` (string instead of int) or `targetAmount: "1000"` -> **DENIED**.
4. **Length Overflow**: Sending `displayName` > 120 chars or `description` > 2000 chars -> **DENIED**.
5. **Negative Value**: Sending `requestedUnits: -10` or `requestedAmount: 0` -> **DENIED**.
6. **Unauthorized Create**: Unauthenticated user or `ownerId != request.auth.uid` creating `/subscriptions/{id}` -> **DENIED**.
7. **Unauthorized Update**: User A updating User B's `/users/{userB}` or `/subscriptions/{subB}` -> **DENIED**.
8. **Immutable Field Tampering**: Updating `ownerId`, `createdAt`, or `issuanceId` on `/subscriptions/{id}` -> **DENIED**.
9. **Timestamp Forgery**: Setting `createdAt` or `updatedAt` to a past/future timestamp (`!= request.time`) -> **DENIED**.
10. **Path/Body Mismatch**: Creating `/users/userA` with `uid: "userB"` or `/issuances/iss1` with `id: "iss2"` -> **DENIED**.
11. **Unverified Email Bypass**: Authenticated user with `email_verified: false` attempting any write -> **DENIED** by `isVerified()`.
12. **Role Escalation**: Non-admin user creating `/users/{userId}` with `role: "PLATFORM_ADMIN"` or writing to `/admins/{userId}` -> **DENIED**.
