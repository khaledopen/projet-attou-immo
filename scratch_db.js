const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const email = 'martindiego@gmail.com';
  const newPassword = 'Sory1234';
  
  console.log(`Réinitialisation du mot de passe pour ${email}...`);
  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const updatedUser = await prisma.user.update({
      where: { email },
      data: { motDePasse: hashedPassword }
    });
    console.log(`Mot de passe réinitialisé avec succès !`);
    console.log(`Email : ${email}`);
    console.log(`Nouveau Mot de passe : ${newPassword}`);
  } catch (error) {
    console.error("Erreur de mise à jour :", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
