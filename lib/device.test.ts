import { describe, it, expect } from 'vitest';
import { NextResponse } from 'next/server';
import {
  DEVICE_COOKIE,
  attachDeviceCookie,
  isDeviceId,
  newDeviceId,
  readDeviceId,
  resolveDeviceId,
} from './device';

// This module is the whole of the consumer app's identity: if readDeviceId
// returns the wrong thing, every scoped query in app/api is wrong with it.
// Two failure directions matter and they pull opposite ways — returning null
// for a cookie that IS there loses someone's training history, and returning a
// value that is not a uuid we minted is what would let a crafted cookie reach
// SQL. Both are covered below.

const VALID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

function withCookie(cookie: string): Request {
  return new Request('http://x', { headers: { cookie } });
}

describe('isDeviceId', () => {
  it('accepts a uuid and rejects everything else', () => {
    expect(isDeviceId(VALID)).toBe(true);
    expect(isDeviceId(VALID.toUpperCase())).toBe(true);
    expect(isDeviceId('')).toBe(false);
    expect(isDeviceId('not-a-uuid')).toBe(false);
    expect(isDeviceId(`${VALID} or 1=1`)).toBe(false);
    expect(isDeviceId(`'${VALID}'`)).toBe(false);
    expect(isDeviceId(null)).toBe(false);
    expect(isDeviceId(42)).toBe(false);
  });
});

describe('newDeviceId', () => {
  it('mints a fresh, valid id each time', () => {
    const a = newDeviceId();
    const b = newDeviceId();
    expect(isDeviceId(a)).toBe(true);
    expect(isDeviceId(b)).toBe(true);
    expect(a).not.toBe(b);
  });
});

describe('readDeviceId', () => {
  it('returns null when there is no Cookie header at all', () => {
    expect(readDeviceId(new Request('http://x'))).toBeNull();
  });

  it('reads the device cookie when it is the only one', () => {
    expect(readDeviceId(withCookie(`${DEVICE_COOKIE}=${VALID}`))).toBe(VALID);
  });

  it('finds it among other cookies, in any position', () => {
    expect(readDeviceId(withCookie(`a=1; ${DEVICE_COOKIE}=${VALID}; __session=xyz`))).toBe(VALID);
    expect(readDeviceId(withCookie(`${DEVICE_COOKIE}=${VALID}; a=1`))).toBe(VALID);
    expect(readDeviceId(withCookie(`a=1; ${DEVICE_COOKIE}=${VALID}`))).toBe(VALID);
  });

  it('is not fooled by a cookie whose name merely ends with the device name', () => {
    expect(readDeviceId(withCookie(`not_${DEVICE_COOKIE}=${VALID}`))).toBeNull();
  });

  it('rejects a value that is not a well-formed uuid, so it never reaches SQL', () => {
    expect(readDeviceId(withCookie(`${DEVICE_COOKIE}=' or 1=1 --`))).toBeNull();
    expect(readDeviceId(withCookie(`${DEVICE_COOKIE}=`))).toBeNull();
    expect(readDeviceId(withCookie(`${DEVICE_COOKIE}=${VALID}x`))).toBeNull();
  });

  it('url-decodes the value, and survives a value that cannot be decoded', () => {
    expect(readDeviceId(withCookie(`${DEVICE_COOKIE}=${encodeURIComponent(VALID)}`))).toBe(VALID);
    expect(readDeviceId(withCookie(`${DEVICE_COOKIE}=%E0%A4%A`))).toBeNull();
  });
});

describe('resolveDeviceId', () => {
  it('reuses an existing identity without minting', () => {
    expect(resolveDeviceId(withCookie(`${DEVICE_COOKIE}=${VALID}`))).toEqual({
      deviceId: VALID,
      minted: false,
    });
  });

  it('mints a new identity when there is none, and says so', () => {
    const { deviceId, minted } = resolveDeviceId(new Request('http://x'));
    expect(minted).toBe(true);
    expect(isDeviceId(deviceId)).toBe(true);
  });

  it('mints rather than trusting a malformed cookie', () => {
    const { deviceId, minted } = resolveDeviceId(withCookie(`${DEVICE_COOKIE}=garbage`));
    expect(minted).toBe(true);
    expect(deviceId).not.toBe('garbage');
  });
});

describe('attachDeviceCookie', () => {
  it('sets an httpOnly, lax, site-wide cookie that outlives the session', () => {
    const res = attachDeviceCookie(NextResponse.json({ ok: true }), VALID);
    const c = res.cookies.get(DEVICE_COOKIE);
    expect(c?.value).toBe(VALID);
    expect(c?.httpOnly).toBe(true);
    expect(c?.sameSite).toBe('lax');
    expect(c?.path).toBe('/');
    // Long-lived: a phone kept on the Home Screen must not lose its history.
    expect(c?.maxAge).toBeGreaterThan(60 * 60 * 24 * 365);
  });
});
