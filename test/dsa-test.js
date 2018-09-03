/* eslint-env mocha */
/* eslint prefer-arrow-callback: "off" */
/* eslint no-unused-vars: "off" */

'use strict';

const assert = require('./util/assert');
const fs = require('fs');
const Path = require('path');
const dsa = require('../lib/dsa');
const x509 = require('../lib/encoding/x509');
const params = require('./data/dsa-params.json');

const DSA_PATH = Path.resolve(__dirname, 'data', 'testdsa.pem');
const DSA_PUB_PATH = Path.resolve(__dirname, 'data', 'testdsapub.pem');

const dsaPem = fs.readFileSync(DSA_PATH, 'utf8');
const dsaPubPem = fs.readFileSync(DSA_PUB_PATH, 'utf8');

const {
  P1024_160,
  P2048_244,
  P2048_256,
  P3072_256
} = params;

function createParams(json) {
  const p = Buffer.from(json.p, 'hex');
  const q = Buffer.from(json.q, 'hex');
  const g = Buffer.from(json.g, 'hex');
  return new dsa.DSAParams(p, q, g);
}

describe('DSA', function() {
  this.timeout(10000);

  const SIZE = dsa.native < 2 ? 1024 : 2048;

  it('should sign and verify', () => {
    // const priv = dsa.privateKeyGenerate(1024);
    const params = createParams(P2048_256);
    const priv = dsa.privateKeyCreate(params);
    const pub = priv.toPublic();

    assert(priv.toJSON());
    assert(priv.toPEM());
    assert(pub.toPEM());

    const msg = Buffer.alloc(priv.q.length, 0x01);
    const sig = dsa.sign(msg, priv);
    assert(sig);

    const result = dsa.verify(msg, sig, pub);
    assert(result);

    sig.s[(Math.random() * sig.s.length) | 0] ^= 1;

    const result2 = dsa.verify(msg, sig, pub);
    assert(!result2);
  });

  it('should sign and verify (async)', async () => {
    const params = await dsa.paramsGenerateAsync(SIZE);
    const priv = dsa.privateKeyCreate(params);
    const pub = priv.toPublic();

    assert(priv.toJSON());
    assert(priv.toPEM());
    assert(pub.toPEM());

    const msg = Buffer.alloc(priv.q.length, 0x01);
    const sig = dsa.sign(msg, priv);
    assert(sig);

    const result = dsa.verify(msg, sig, pub);
    assert(result);

    sig.s[(Math.random() * sig.s.length) | 0] ^= 1;

    const result2 = dsa.verify(msg, sig, pub);
    assert(!result2);
  });

  it('should sign and verify', () => {
    const priv = dsa.DSAPrivateKey.generate(SIZE);
    const pub = priv.toPublic();

    assert(priv.toJSON());
    assert(priv.toPEM());
    assert(pub.toPEM());

    const msg = Buffer.alloc(priv.size(), 0x01);
    const sig = priv.sign(msg);
    assert(sig);

    const result = pub.verify(msg, sig);
    assert(result);

    sig.s[(Math.random() * sig.s.length) | 0] ^= 1;

    const result2 = pub.verify(msg, sig);
    assert(!result2);
  });

  it('should sign and verify (async)', async () => {
    const priv = await dsa.DSAPrivateKey.generateAsync(SIZE);
    const pub = priv.toPublic();

    assert(priv.toJSON());
    assert(priv.toPEM());
    assert(pub.toPEM());

    const msg = Buffer.alloc(priv.size(), 0x01);
    const sig = priv.sign(msg);
    assert(sig);

    const result = pub.verify(msg, sig);
    assert(result);

    sig.s[(Math.random() * sig.s.length) | 0] ^= 1;

    const result2 = pub.verify(msg, sig);
    assert(!result2);
  });

  it('should parse SPKI', () => {
    const info = x509.SubjectPublicKeyInfo.fromPEM(dsaPubPem);
    assert(info.algorithm.algorithm.getKey() === 'dsa');
  });
});