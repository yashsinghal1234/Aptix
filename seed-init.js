const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function generatePin() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(crypto.randomInt(0, chars.length));
  }
  return `APT-${code}`;
}

async function main() {
  const bootstrapEmails = process.env.OWNER_BOOTSTRAP_EMAILS;
  if (!bootstrapEmails) {
    console.error("FATAL ERROR: OWNER_BOOTSTRAP_EMAILS environment variable is required to run seed-init.js.");
    process.exit(1);
  }

  const defaultPassword = process.env.OWNER_INITIAL_PASSWORD || crypto.randomBytes(16).toString("hex");
  const passwordHash = hashPassword(defaultPassword);

  const envEmails = bootstrapEmails
    .split(",")
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);

  console.log(`Seeding owner accounts for: ${envEmails.join(", ")}`);
  if (!process.env.OWNER_INITIAL_PASSWORD) {
    console.log(`[BOOTSTRAP] Generated random initial owner password: ${defaultPassword}`);
  }

  for (const email of envEmails) {
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        role: "OWNER",
        passwordHash: passwordHash
      },
      create: {
        name: email.split("@")[0].toUpperCase(),
        email: email,
        role: "OWNER",
        passwordHash: passwordHash
      }
    });
    console.log(`Seeded Owner: ${user.email} (ID: ${user.id})`);
  }

  // Ensure all existing sessions have unique pins
  const sessions = await prisma.examSession.findMany();
  for (let i = 0; i < sessions.length; i++) {
    const s = sessions[i];
    if (!s.pin) {
      const pin = generatePin(i + 1);
      await prisma.examSession.update({
        where: { id: s.id },
        data: { pin }
      });
      console.log(`Assigned PIN ${pin} to session ${s.id}`);
    }
  }

  console.log("Database seed & PIN initialization complete.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
