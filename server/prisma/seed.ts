import { getPrisma } from "../src/prisma.js";
import { hashPassword } from "../src/services/password.js";

async function main() {
  const prisma = getPrisma();

  const categories = ["Account and Access", "Hardware", "Software", "Network"];
  for (const name of categories) {
    await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
  }

  const relatedSystems = [
    "Email", "Campus Wi-Fi", "VPN", "LEB2 App",
    "Grade Submission App", "Printer", "Corporate Laptop",
  ];
  for (const name of relatedSystems) {
    await prisma.relatedSystem.upsert({
      where: { name },
      update: {},
      create: { name, isActive: true },
    });
  }

  // Requesters: 4 active + 1 inactive
  const requesterPasswordHash = await hashPassword("Requester123!");
  const activeRequesters = [
    { name: "Jennifer Anderson", email: "jennifer.anderson@example.com" },
    { name: "Michael Brown", email: "michael.brown@example.com" },
    { name: "Sarah Johnson", email: "sarah.johnson@example.com" },
    { name: "David Lee", email: "david.lee@example.com" },
  ];
  for (const r of activeRequesters) {
    await prisma.user.upsert({
      where: { email: r.email },
      update: {},
      create: {
        ...r,
        role: "REQUESTER",
        isActive: true,
        passwordHash: requesterPasswordHash,
        mustChangePassword: false,
      },
    });
  }
  await prisma.user.upsert({
    where: { email: "former.employee@example.com" },
    update: {},
    create: {
      name: "Former Employee",
      email: "former.employee@example.com",
      role: "REQUESTER",
      isActive: false,
      passwordHash: requesterPasswordHash,
      mustChangePassword: false,
    },
  });

  // IT Staff: 3 active + 1 inactive
  const staffPasswordHash = await hashPassword("Staff123!");
  const activeStaff = [
    { name: "Alex Thompson", email: "alex.thompson@tiktockit.com" },
    { name: "Priya Patel", email: "priya.patel@tiktockit.com" },
    { name: "Chris Nguyen", email: "chris.nguyen@tiktockit.com" },
  ];
  for (const s of activeStaff) {
    await prisma.user.upsert({
      where: { email: s.email },
      update: {},
      create: {
        ...s,
        role: "IT_STAFF",
        isActive: true,
        passwordHash: staffPasswordHash,
        mustChangePassword: false,
      },
    });
  }
  await prisma.user.upsert({
    where: { email: "inactive.staff@tiktockit.com" },
    update: {},
    create: {
      name: "Inactive Staff",
      email: "inactive.staff@tiktockit.com",
      role: "IT_STAFF",
      isActive: false,
      passwordHash: staffPasswordHash,
      mustChangePassword: false,
    },
  });

  // Administrator: 1 active
  const adminPasswordHash = await hashPassword("Admin123!");
  await prisma.user.upsert({
    where: { email: "admin@tiktockit.com" },
    update: {},
    create: {
      name: "System Administrator",
      email: "admin@tiktockit.com",
      role: "ADMIN",
      isActive: true,
      passwordHash: adminPasswordHash,
      mustChangePassword: false,
    },
  });

  console.log("Seed complete. Local dev credentials (DO NOT use in production):");
  console.log("  Requester: jennifer.anderson@example.com / Requester123!");
  console.log("  IT Staff:  alex.thompson@tiktockit.com / Staff123!");
  console.log("  Admin:     admin@tiktockit.com / Admin123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });