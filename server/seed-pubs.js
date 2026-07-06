const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  await prisma.publication.createMany({
    data: [
      { name: 'Nilansu Publication', slug: 'nilansu-publication' },
      { name: 'NIL Publication', slug: 'nil-publication' }
    ],
    skipDuplicates: true
  });
  console.log('Successfully re-added base Publications!');
}
main().catch(console.error).finally(() => prisma.$disconnect());
