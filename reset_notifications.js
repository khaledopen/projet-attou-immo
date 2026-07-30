const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- RÉINITIALISATION DES NOTIFICATIONS ET MESSAGES ---');
  try {
    // 1. Marquer toutes les notifications comme lues
    const notificationsResult = await prisma.notification.updateMany({
      where: { lu: false },
      data: { lu: true }
    });
    console.log(`✅ ${notificationsResult.count} notification(s) marquée(s) comme lue(s).`);

    // 2. Marquer tous les messages comme lus
    const messagesResult = await prisma.message.updateMany({
      where: { lu: false },
      data: { lu: true }
    });
    console.log(`✅ ${messagesResult.count} message(s) marqué(s) comme lu(s).`);

    console.log('------------------------------------------------------');
    console.log('Félicitations ! Tous les badges de notification sont réinitialisés.');
  } catch (error) {
    console.error('Erreur lors de la réinitialisation :', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
