import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { assertSafeUploadFilename, detectImageKind } from './imageMagic.js';

describe('detectImageKind', () => {
  it('detects jpeg / png / gif / webp magic bytes', () => {
    assert.equal(detectImageKind(Buffer.from([0xff, 0xd8, 0xff, 0xe0])), 'jpeg');
    assert.equal(
      detectImageKind(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
      'png',
    );
    assert.equal(detectImageKind(Buffer.from(Buffer.from('GIF89a'))), 'gif');
    const webp = Buffer.alloc(12);
    webp.write('RIFF', 0);
    webp.write('WEBP', 8);
    assert.equal(detectImageKind(webp), 'webp');
  });

  it('rejects non-images', () => {
    assert.equal(detectImageKind(Buffer.from('<?php')), null);
  });
});

describe('assertSafeUploadFilename', () => {
  it('allows simple image names', () => {
    assert.doesNotThrow(() => assertSafeUploadFilename('lamp.jpg'));
  });

  it('rejects double extensions', () => {
    assert.throws(() => assertSafeUploadFilename('shell.php.jpg'));
  });
});
