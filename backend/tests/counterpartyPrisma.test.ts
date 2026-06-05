import test from 'node:test';
import assert from 'node:assert/strict';

import { prisma } from '../src/lib/prisma.js';

test('Prisma can persist a counterparty roleType value', async (t) => {
  const stamp = Date.now();
  const created = await prisma.counterparty.create({
    data: {
      code: `CP-T${stamp}`,
      name: `RoleType Smoke ${stamp}`,
      normalizedName: `ROLETYPE SMOKE ${stamp}`,
      roleType: 'BOTH',
      isActive: true,
    } as any,
  });

  t.after(async () => {
    await prisma.counterparty.delete({ where: { id: created.id } }).catch(() => undefined);
  });

  assert.equal((created as any).roleType, 'BOTH');
});
