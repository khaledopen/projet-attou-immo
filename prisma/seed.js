const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('Sory1234', 10);

  // 1. Création de l'Administrateur
  const admin = await prisma.user.upsert({
    where: { email: 'admin@attounest.com' },
    update: {},
    create: {
      email: 'admin@attounest.com',
      motDePasse: hashedPassword,
      nom: 'Admin',
      prenom: 'Super',
      role: 'ADMIN',
      statut: 'ACTIF',
      niveauAcces: 1,
    },
  });

  // 2. Création du Propriétaire
  const proprietaire = await prisma.user.upsert({
    where: { email: 'owner@attounest.com' },
    update: {},
    create: {
      email: 'owner@attounest.com',
      motDePasse: hashedPassword,
      nom: 'Touré',
      prenom: 'Mamadou',
      role: 'PROPRIETAIRE',
      statut: 'ACTIF',
      raisonSociale: 'Touré Immobilier SARL',
      typeBailleur: 'PARTICULIER',
    },
  });

  // 3. Création d'une Adresse
  const adresse = await prisma.adresse.create({
    data: {
      rue: 'Boulevard de France',
      ville: 'Abidjan',
      codePostal: '00225',
      pays: "Côte d'Ivoire",
      latitude: 5.3484,
      longitude: -3.9733,
    }
  });

  // 4. Création d'un Bien
  const bien = await prisma.bien.create({
    data: {
      typeBien: 'APPARTEMENT',
      surface: 120.5,
      etage: 2,
      nombreChambres: 3,
      equipements: ['Wifi', 'Climatisation', 'Parking Sécurisé'],
      anneeConstruction: 2022,
      adresseId: adresse.id,
    }
  });

  // 5. Création d'une Annonce pour ce bien
  await prisma.annonce.create({
    data: {
      titre: 'Magnifique F4 à la Riviera 3',
      description: 'Superbe appartement spacieux avec vue dégagée, idéal pour famille.',
      prix: 750000,
      surface: 120.5,
      nombrePieces: 4,
      typeBien: 'APPARTEMENT',
      statut: 'PUBLIEE',
      proprietaireId: proprietaire.id,
      bienId: bien.id,
    }
  });

  console.log('✅ Base de données réinitialisée avec succès !');
  console.log('Admin: admin@attounest.com / Sory1234');
  console.log('Propriétaire: owner@attounest.com / Sory1234');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
