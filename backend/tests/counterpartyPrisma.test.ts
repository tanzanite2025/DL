import test from 'node:test';
import assert from 'node:assert/strict';

import { prisma } from '../src/lib/prisma.js';

test('generated Prisma client exposes the counterparty delegate', () => {
  assert.equal(typeof (prisma as any).counterparty.findMany, 'function');
});
