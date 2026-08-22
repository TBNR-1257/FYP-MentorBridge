require("dotenv").config();
const bcrypt = require("bcryptjs");
const prisma = require("../src/config/prisma");

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@mail.com";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "admin_1234";

// Fixed catalog of achievement badges — same set for every mentor, like a game's
// achievement list. `metric`/`threshold` are what the app checks automatically;
// `criteria` is the human-readable version shown to mentors chasing it.
const BADGES = [
  {
    name: "Novice Mentor",
    description: "Has received 10 good ratings from other students.",
    criteria: "Receive 10 ratings of 4 stars or higher.",
    iconUrl: "/badges/novice-mentor.svg",
    metric: "RATING_COUNT",
    threshold: 10,
  },
  {
    name: "Trusted Mentor",
    description: "Has received 25 good ratings from other students.",
    criteria: "Receive 25 ratings of 4 stars or higher.",
    iconUrl: "/badges/trusted-mentor.svg",
    metric: "RATING_COUNT",
    threshold: 25,
  },
  {
    name: "Veteran Mentor",
    description: "Has received 50 good ratings from other students.",
    criteria: "Receive 50 ratings of 4 stars or higher.",
    iconUrl: "/badges/veteran-mentor.svg",
    metric: "RATING_COUNT",
    threshold: 50,
  },
  {
    name: "First Steps",
    description: "Logged their first hour of volunteer service.",
    criteria: "Complete sessions totalling 1 verified service hour.",
    iconUrl: "/badges/first-steps.svg",
    metric: "SERVICE_HOURS",
    threshold: 1,
  },
  {
    name: "Dedicated Volunteer",
    description: "Logged 10 hours of volunteer service.",
    criteria: "Complete sessions totalling 10 verified service hours.",
    iconUrl: "/badges/dedicated-volunteer.svg",
    metric: "SERVICE_HOURS",
    threshold: 10,
  },
  {
    name: "Community Pillar",
    description: "Logged 50 hours of volunteer service.",
    criteria: "Complete sessions totalling 50 verified service hours.",
    iconUrl: "/badges/community-pillar.svg",
    metric: "SERVICE_HOURS",
    threshold: 50,
  },
  {
    name: "Getting Started",
    description: "Completed their first mentoring session.",
    criteria: "Complete 1 mentoring session.",
    iconUrl: "/badges/getting-started.svg",
    metric: "SESSION_COUNT",
    threshold: 1,
  },
  {
    name: "Regular Mentor",
    description: "Completed 25 mentoring sessions.",
    criteria: "Complete 25 mentoring sessions.",
    iconUrl: "/badges/regular-mentor.svg",
    metric: "SESSION_COUNT",
    threshold: 25,
  },
];

async function seedAdmin() {
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

async function seedBadges() {
  for (const badge of BADGES) {
    await prisma.badge.upsert({
      where: { name: badge.name },
      update: badge,
      create: badge,
    });
  }
  console.log(`Seeded ${BADGES.length} badges.`);
}

async function main() {
  await seedAdmin();
  await seedBadges();
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
