import { getPrisma } from "../src/prisma.js";

async function main() {
  const prisma = getPrisma();

  const categories = ["Account and Access", "Hardware", "Software", "Network"];
  for (const name of categories) {
    await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
  }

  const activeRequesters = [
    { name: "Jennifer Anderson", email: "jennifer.anderson@example.com" },
    { name: "Michael Brown", email: "michael.brown@example.com" },
    { name: "Sarah Johnson", email: "sarah.johnson@example.com" },
    { name: "David Lee", email: "david.lee@example.com" },
  ];
  for (const r of activeRequesters) {
    await prisma.requesterUser.upsert({
      where: { email: r.email },
      update: {},
      create: { ...r, isActive: true },
    });
  }

  await prisma.requesterUser.upsert({
    where: { email: "former.employee@example.com" },
    update: {},
    create: { name: "Former Employee", email: "former.employee@example.com", isActive: false },
  });

  console.log("Categories and Requesters seeded.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });