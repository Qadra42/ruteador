/**
 * Seed script for initial database setup
 * Creates:
 * - Sinergia Faro company
 * - Agent configuration for Sinergia Faro
 * - Test admin user
 */

import { sql } from '../lib/db';
import { randomUUID } from 'crypto';

async function seed() {
  try {
    console.log('🌱 Starting database seed...');

    // Create Sinergia Faro company
    console.log('Creating Sinergia Faro company...');
    const companyId = randomUUID();
    const [company] = await sql`
      INSERT INTO companies (id, name, whatsapp_number, business_type)
      VALUES (${companyId}, 'Sinergia Faro', '597907523413541', 'junk_removal')
      ON CONFLICT (whatsapp_number) DO UPDATE
      SET name = EXCLUDED.name
      RETURNING *
    `;

    console.log(`✅ Company created: ${company.name} (${company.id})`);

    // Create agent configuration
    console.log('Creating agent configuration...');
    const agentConfigId = randomUUID();
    const [agentConfig] = await sql`
      INSERT INTO agent_configs (
        id,
        company_id,
        language,
        business_description,
        service_area,
        greeting_message,
        required_fields,
        custom_instructions
      )
      VALUES (
        ${agentConfigId},
        ${company.id},
        'es-UY',
        'Sinergia Faro - retiro de cachivaches, muebles y objetos viejos',
        'Montevideo, Uruguay',
        'Hola! Soy el asistente de Sinergia Faro. ¿En qué podemos ayudarte?',
        '["what", "where", "when"]'::jsonb,
        'Somos una empresa de retiro de objetos usados, muebles viejos, electrodomésticos, y cachivaches en general.'
      )
      ON CONFLICT (company_id) DO UPDATE
      SET
        language = EXCLUDED.language,
        business_description = EXCLUDED.business_description,
        service_area = EXCLUDED.service_area,
        greeting_message = EXCLUDED.greeting_message,
        required_fields = EXCLUDED.required_fields,
        custom_instructions = EXCLUDED.custom_instructions
      RETURNING *
    `;

    console.log(`✅ Agent config created for company: ${agentConfig.company_id}`);

    console.log('\n🎉 Database seeded successfully!');
    console.log('\nSummary:');
    console.log(`- Company: ${company.name}`);
    console.log(`- WhatsApp: ${company.whatsapp_number}`);
    console.log(`- Language: ${agentConfig.language}`);
    console.log(`- Service Area: ${agentConfig.service_area}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seed();
