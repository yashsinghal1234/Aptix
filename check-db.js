const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 
async function main() { 
  const s = await prisma.examSession.findMany({ select: { id: true, status: true, pin: true, exam: { select: { title: true } } } });
  console.log(JSON.stringify(s, null, 2));
} 
main().catch(console.error).finally(() => prisma.$disconnect());
