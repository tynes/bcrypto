'use strict';

const assert = require('bsert');
const zlib = require('zlib');
const random = require('../lib/random');
const zero = Buffer.alloc(32, 0x00);
const bytes = Buffer.allocUnsafe(32);

for (let i = 0; i < 32; i++)
  bytes[i] = i;

function isRandom(data, d) {
  assert(Buffer.isBuffer(data));
  assert(isFinite(d));

  let sum = 0;

  for (let i = 0; i < data.length; i++) {
    for (let j = 0; j < 8; j++)
      sum += (data[i] >>> (7 - j)) & 1;
  }

  const avg = sum / (data.length * 8);

  return avg >= (0.5 - d) && avg <= (0.5 + d);
}

describe('Random', function() {
  it('should generate random bytes', () => {
    const rand = Buffer.from(bytes);
    random.randomFill(rand, 0, 32);
    assert.notBufferEqual(rand, bytes);
  });

  it('should fill random bytes', () => {
    const rand = Buffer.from(bytes);
    random.randomFill(rand, 0, 32);
    assert.notBufferEqual(rand, bytes);
  });

  it('should fill random bytes without args', () => {
    const rand = Buffer.from(bytes);
    random.randomFill(rand);
    assert.notBufferEqual(rand, bytes);
  });

  it('should get random bytes', () => {
    const rand = random.randomBytes(32);
    assert.notBufferEqual(rand, zero);
  });

  it('should get random int', () => {
    const rand = random.randomInt();
    assert((rand >>> 0) === rand);
  });

  it('should get random range', () => {
    for (let i = 0; i < 100; i++) {
      const rand = random.randomRange(1, 100);

      assert((rand >>> 0) === rand);
      assert(rand >= 1 && rand < 100);
    }
  });

  it('should get a large number of bytes', () => {
    // The browser limits us at 65,536 bytes per call.
    // Make sure our RNG wrapper can exceed that.
    assert.strictEqual(random.randomBytes(1 << 17).length, 1 << 17);
  });

  it('should not be able to compress random bytes', () => {
    // Idea taken from golang:
    //   https://github.com/golang/go/blob/master/src/crypto/rand/rand_test.go
    //
    // Compression involves reducing redundancy. Random
    // data shouldn't have any significant redundancy.
    const rand = random.randomBytes(4e6);
    const defl = zlib.deflateRawSync(rand, { level: 5 });
    const perc = defl.length / rand.length;

    assert(perc >= 0.99, `Deflated data was %${perc.toFixed(2)} of original.`);

    // We can also check randomness by summing the one
    // bits and ensuring that they make up roughly 50%
    // of the data (we'll use a 2% margin of error).
    //
    // See also:
    //   https://wiki.openssl.org/index.php/Random_Numbers
    //   https://csrc.nist.gov/projects/random-bit-generation/
    assert(isRandom(rand, 0.02));
  });

  it('should not be able to compress random fill', () => {
    const rand = Buffer.alloc(4e6);

    random.randomFill(rand, 0, 4e6);

    const defl = zlib.deflateRawSync(rand, { level: 5 });
    const perc = defl.length / rand.length;

    assert(perc >= 0.99, `Deflated data was %${perc.toFixed(2)} of original.`);
    assert(isRandom(rand, 0.02));
  });

  it('should test distribution of randomRange()', () => {
    const array = new Uint16Array(4e6 / 2);
    const rand = Buffer.from(array.buffer, array.byteOffset, array.byteLength);

    for (let i = 0; i < array.length; i++)
      array[i] = random.randomRange(0, 0x10000);

    const defl = zlib.deflateRawSync(rand, { level: 5 });
    const perc = defl.length / rand.length;

    assert(perc >= 0.99, `Deflated data was %${perc.toFixed(2)} of original.`);
    assert(isRandom(rand, 0.02));
  });
});
