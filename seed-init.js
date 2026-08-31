const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function generatePin(index = 1) {
  return `APT-${1000 + index}`;
}

async function main() {
  const defaultPassword = "282007@aA";
  const passwordHash = hashPassword(defaultPassword);

  const adminEmails = ["admin@aptix.com", "singhalyash307@gmail.com"];

  for (const email of adminEmails) {
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
