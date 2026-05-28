/**
 * Database Seed Script
 * Creates initial company and agent configuration for testing
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create default company (chatarra business in Montevideo)
  const company = await prisma.company.upsert({
    where: { whatsappNumber: process.env.KAPSO_PHONE_NUMBER_ID || '597907523413541' },
    update: {},
    create: {
      name: 'Sinergia Faro',
      whatsappNumber: process.env.KAPSO_PHONE_NUMBER_ID || '597907523413541',
      businessType: 'junk_removal',
    },
  });

  console.log(`✅ Company created: ${company.name} (${company.id})`);

  // Create agent configuration for this company
  const agentConfig = await prisma.agentConfig.upsert({
    where: { companyId: company.id },
    update: {},
    create: {
      companyId: company.id,
      language: 'es-UY',
      businessDescription: 'una empresa de retiro de residuos voluminosos y chatarra',
      serviceArea: 'Montevideo y área metropolitana',
      requiredFields: ['what', 'where', 'when'],
      customInstructions: 'Si preguntan por precios, decí que depende del volumen y se coordina cuando pasen.',
    },
  });

  console.log(`✅ Agent config created for ${company.name}`);

  // Create a test user (business owner)
  const user = await prisma.user.upsert({
    where: { email: 'admin@sinergiafaro.com' },
    update: {},
    create: {
      email: 'admin@sinergiafaro.com',
      name: 'Admin Sinergia',
      role: 'business_owner',
      companyId: company.id,
    },
  });

  console.log(`✅ User created: ${user.email}`);

  console.log('\n🎉 Seed completed successfully!');
  console.log(`\nCompany ID: ${company.id}`);
  console.log(`WhatsApp Number: ${company.whatsappNumber}`);
  console.log(`Business Type: ${company.businessType}`);
  console.log(`Language: ${agentConfig.language}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
