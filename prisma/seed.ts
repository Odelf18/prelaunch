import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { signupUser, completeProfile } from "../src/lib/waitlist";

const prisma = new PrismaClient();

async function main() {
  await prisma.integrityNode.deleteMany();
  await prisma.emailOutbox.deleteMany();
  await prisma.rewardLedger.deleteMany();
  await prisma.referral.deleteMany();
  await prisma.user.deleteMany();

  const root = await signupUser({
    email: "alex@founder.demo",
    simulate: true,
    simulateGeo: {
      city: "San Francisco",
      region: "California",
      country: "United States",
    },
  });

  await completeProfile({
    userId: root.user.id,
    fullName: "Alex Founder",
    phone: "+1-415-555-0100",
  });

  const chain = [
    {
      email: "jordan@early.demo",
      name: "Jordan Early",
      phone: "+1-512-555-0101",
      geo: { city: "Austin", region: "Texas", country: "United States" },
      code: root.user.referralCode,
    },
    {
      email: "sam@growth.demo",
      name: "Sam Growth",
      phone: "+44-20-5555-0102",
      geo: { city: "London", region: "England", country: "United Kingdom" },
    },
    {
      email: "riley@network.demo",
      name: "Riley Network",
      phone: "+49-30-5555-0103",
      geo: { city: "Berlin", region: "Berlin", country: "Germany" },
    },
  ];

  let parentCode = root.user.referralCode;
  for (const person of chain) {
    const created = await signupUser({
      email: person.email,
      referralCode: person.code ?? parentCode,
      simulate: true,
      simulateGeo: person.geo,
    });
    await completeProfile({
      userId: created.user.id,
      fullName: person.name,
      phone: person.phone,
    });
    parentCode = created.user.referralCode;
  }

  // Sibling referral from Jordan
  const jordan = await prisma.user.findUniqueOrThrow({
    where: { email: "jordan@early.demo" },
  });
  await signupUser({
    email: "casey@friend.demo",
    referralCode: jordan.referralCode,
    simulate: true,
    simulateGeo: {
      city: "Toronto",
      region: "Ontario",
      country: "Canada",
    },
  });

  console.log("Seed complete.");
  console.log(`Root referral code: ${root.user.referralCode}`);
  console.log(`Root dashboard: /dashboard/${root.user.dashboardToken}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
