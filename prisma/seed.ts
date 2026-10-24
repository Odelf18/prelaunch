import "dotenv/config";
import { PrismaClient } from "@prisma/client";

/**
 * Demo starts empty - this seed only wipes tables so demo-seed.db
 * ships as a clean schema for Vercel /tmp bootstrap.
 */
const prisma = new PrismaClient();

async function main() {
  await prisma.integrityNode.deleteMany();
  await prisma.emailOutbox.deleteMany();
  await prisma.rewardLedger.deleteMany();
  await prisma.referral.deleteMany();
  await prisma.user.deleteMany();
  console.log("Seed complete: empty database (0 users).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
