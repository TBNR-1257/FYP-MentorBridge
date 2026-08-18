require("dotenv").config();
const bcrypt = require("bcryptjs");
const prisma = require("../src/config/prisma");

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@mentorbridge.local";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "admin12345";

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (existing) {
    console.log(`Admin user already exists: ${ADMIN_EMAIL}`);
    return;
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await prisma.user.create({
    data: {
      email: ADMIN_EMAIL,
      passwordHash,
      name: "MentorBridge Admin",
      role: "ADMIN",
    },
  });

  console.log(`Created admin user: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log("Change this password before deploying anywhere real.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
