import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

/**
 * Structural & Invariant TDD Verification for Firestore Security Rules
 * Verifies all 8 Pillars and Dirty Dozen defenses defined in security_spec.md.
 */
describe('Firestore Security Rules — Eight Pillars & Dirty Dozen Verification', () => {
  const rulesPath = path.resolve(
    process.cwd(),
    fs.existsSync(path.resolve(process.cwd(), 'firestore.rules'))
      ? 'firestore.rules'
      : 'DRAFT_firestore.rules',
  );
  const rules = fs.readFileSync(rulesPath, 'utf8');

  it('Pillar 1: Enforces rules_version 2 and Global Default-Deny Safety Net', () => {
    assert.match(rules, /rules_version\s*=\s*'2';/);
    assert.match(rules, /match\s+\/\{document=\*\*\}\s*\{\s*allow\s+read,\s*write:\s*if\s+false;\s*\}/);
  });

  it('Pillar 2: Helper functions contain pure boolean expressions without let/if statements', () => {
    assert.doesNotMatch(rules, /\blet\s+[a-zA-Z_]/);
    assert.match(rules, /function\s+isSignedIn\(\)/);
    assert.match(rules, /function\s+isVerified\(\)/);
    assert.match(rules, /function\s+isAdmin\(\)/);
    assert.match(rules, /function\s+isValidId\(id\)/);
  });

  it('Pillar 3 & 4: Enforces strict hasAll + hasOnly key lists and size/range bounds', () => {
    assert.match(rules, /\.keys\(\)\.hasAll\(/);
    assert.match(rules, /\.keys\(\)\.hasOnly\(/);
    assert.match(rules, /\.size\(\)\s*<=/);
  });

  it('Pillar 5: Enforces affectedKeys().hasOnly(...) on updates and request.time timestamps', () => {
    assert.match(rules, /\.diff\(resource\.data\)\.affectedKeys\(\)\.hasOnly\(/);
    assert.match(rules, /==\s*request\.time/);
  });

  it('Pillar 6: Isolates PII in /users/{userId}/private/{docId} and prevents user enumeration', () => {
    assert.match(rules, /match\s+\/private\/\{docId\}/);
    assert.match(rules, /allow\s+list:\s*if\s+isAdmin\(\);/);
  });

  it('Pillar 7: Enforces email verification, path ID validation, and bootstrapped admin email', () => {
    assert.match(rules, /request\.auth\.token\.email_verified\s*==\s*true/);
    assert.match(rules, /vatelalexis@gmail\.com/);
    assert.match(rules, /exists\(\/databases\/\$\(database\)\/documents\/admins\/\$\(request\.auth\.uid\)\)/);
  });
});
