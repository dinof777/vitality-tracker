import { describe, it, expect } from 'vitest';
import { isAdminEmail, adminAllowlist } from './is-admin';

// The permission boundary behind the /admin/* link and pages. The property that
// matters: a trainer whose email isn't on the allowlist is NOT an admin — so the
// admin link never shows for them. These pin exactly that.

const OWNER = 'dinof777@gmail.com';

describe('isAdminEmail — the admin gate', () => {
  it('admits the configured owner', () => {
    expect(isAdminEmail(OWNER)).toBe(true);
  });

  it('rejects any other trainer', () => {
    // The whole point of the check the user asked to verify.
    expect(isAdminEmail('trainer@othergym.com')).toBe(false);
    expect(isAdminEmail('coach.jane@example.com')).toBe(false);
    expect(isAdminEmail('dinof777@gmail.com.evil.com')).toBe(false); // no substring/suffix match
  });

  it('never admits a missing or empty email', () => {
    expect(isAdminEmail(null)).toBe(false);
    expect(isAdminEmail(undefined)).toBe(false);
    expect(isAdminEmail('')).toBe(false);
    expect(isAdminEmail('   ')).toBe(false);
  });

  it('is case- and whitespace-insensitive on the owner', () => {
    expect(isAdminEmail('  DinoF777@Gmail.COM  ')).toBe(true);
  });

  it('honors a multi-admin ADMIN_EMAILS list', () => {
    const csv = 'dinof777@gmail.com, coach@studio.com';
    expect(isAdminEmail('coach@studio.com', csv)).toBe(true);
    expect(isAdminEmail('DINOF777@gmail.com', csv)).toBe(true);
    expect(isAdminEmail('someone@else.com', csv)).toBe(false);
  });

  it('a trainer is not an admin just by being on a gym — only by email match', () => {
    // isAdminEmail is the sole gate; there is no "owner ⇒ admin" backdoor.
    for (const e of ['owner@gymA.com', 'owner@gymB.com', 'admin@notus.com']) {
      expect(isAdminEmail(e, OWNER)).toBe(false);
    }
  });
});

describe('adminAllowlist', () => {
  it('parses, trims, lowercases, and drops blanks', () => {
    expect(adminAllowlist(' A@x.com , , B@Y.com ')).toEqual(['a@x.com', 'b@y.com']);
  });
});
