import { describe, expect, it } from 'vitest';
import { safeReturnPath } from './safePath';

describe('safeReturnPath (H1 open-redirect guard)', () => {
  it('keeps normal app paths with query strings', () => {
    expect(safeReturnPath('/topics/abc?tab=quiz')).toBe('/topics/abc?tab=quiz');
    expect(safeReturnPath('/learn')).toBe('/learn');
  });

  it.each([
    '//evil.com',
    '/\\evil.com',
    '/%5C%5Cevil.com',
    '/%255C%255Cevil.com',
    '/%2F%2Fevil.com',
    'https://evil.com',
    'javascript:alert(1)',
    '/\tevil',
    '',
    null,
    undefined,
    42,
  ])('rejects %j', (p) => {
    expect(safeReturnPath(p)).toBeNull();
  });
});
