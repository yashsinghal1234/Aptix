const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 
async function main() { 
  const count = await prisma.examSession.count(); 
  console.log({ count }); 
} 
main().catch(console.error).finally(() => prisma.$disconnect());
