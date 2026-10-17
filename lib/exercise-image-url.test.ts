import { describe, it, expect } from 'vitest';
import { resolveImageUrl, IMAGE_URL_MAX } from './exercise-image-url';

describe('resolveImageUrl', () => {
  it('treats blank as "clear the image", not as an error', () => {
    for (const blank of ['', '   ', null, undefined]) {
      expect(resolveImageUrl(blank)).toEqual({ url: null });
    }
  });

  it('accepts an absolute https URL', () => {
    expect(resolveImageUrl('https://cdn.example.com/goblet-squat.jpg')).toEqual({
      url: 'https://cdn.example.com/goblet-squat.jpg',
    });
  });

  it('keeps a signed storage URL intact, query string and all', () => {
    const signed = 'https://files.example.com/a.png?token=abc123&expires=999';
    expect(resolveImageUrl(signed)).toEqual({ url: signed });
  });

  it('accepts a site-relative path, the shape the bundled library uses', () => {
    expect(resolveImageUrl('/exercises/goblet-squat.jpg')).toEqual({ url: '/exercises/goblet-squat.jpg' });
  });

  it('trims surrounding whitespace from a pasted link', () => {
    expect(resolveImageUrl('  https://cdn.example.com/a.jpg  ')).toEqual({ url: 'https://cdn.example.com/a.jpg' });
  });

  // The whole point of the validation: SyncroFit's codec drops anything it
  // can't make https, so these must fail loudly at write time instead of
  // becoming an image that silently never arrives.
  it('refuses plain http rather than storing a link SyncroFit will drop', () => {
    expect(resolveImageUrl('http://cdn.example.com/a.jpg')).toHaveProperty('error');
  });

  it('refuses data:, javascript: and protocol-relative values', () => {
    for (const bad of [
      'data:image/png;base64,iVBORw0KGgo=',
      'javascript:alert(1)',
      '//evil.example.com/a.jpg',
      'exercises/a.jpg',
      'not a url at all',
    ]) {
      expect(resolveImageUrl(bad), bad).toHaveProperty('error');
    }
  });

  it('refuses a link past the length cap', () => {
    const long = `https://cdn.example.com/${'a'.repeat(IMAGE_URL_MAX)}.jpg`;
    expect(resolveImageUrl(long)).toHaveProperty('error');
  });
});
