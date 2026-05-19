const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Tentative de connexion à la base de données...");
  try {
    const user = await prisma.user.findFirst();
    console.log("Connexion réussie ! Premier utilisateur trouvé :", user);
  } catch (error) {
    console.error("Erreur de connexion à la base de données :", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
