import { describe, expect, it } from 'vitest';
import { makePdf } from '../../test/fixtures.js';
import { detectFileType, sniffFile } from './upload.js';

describe('upload sniffing (H1)', () => {
  it('detects real types from bytes, not names', async () => {
    const pdf = await makePdf('hello');
    expect((await detectFileType(pdf))?.ext).toBe('pdf');
    await expect(sniffFile(Buffer.from('<html>not a pdf</html>'), ['pdf'])).rejects.toThrow(
      /Unsupported file type/,
    );
  });

  it('refuses ASF input before the vulnerable parser sees it (GHSA-5v7r-6r5c-r473)', async () => {
    // ASF header GUID followed by a zero-size sub-header: the shape that loops file-type < 22.
    const asf = Buffer.concat([
      Buffer.from('3026b2758e66cf11a6d900aa0062ce6c', 'hex'),
      Buffer.alloc(64),
    ]);
    const t0 = Date.now();
    expect(await detectFileType(asf)).toBeUndefined();
    await expect(sniffFile(asf, ['mp4', 'webm'])).rejects.toThrow(/Unsupported file type/);
    expect(Date.now() - t0).toBeLessThan(500);
  });
});
