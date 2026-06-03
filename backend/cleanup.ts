import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanup() {
  try {
    const deleted = await prisma.item.deleteMany({
      where: {
        name: {
          contains: '方法'
        }
      }
    });
    console.log(`Successfully deleted ${deleted.count} orphaned items.`);
  } catch (err) {
    console.error('Error deleting items:', err);
  } finally {
    await prisma.$disconnect();
  }
}

cleanup();
