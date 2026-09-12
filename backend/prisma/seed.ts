import { PrismaClient, Role, QualityGrade } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed for Hackathon Demo...');

  // 1. Clean existing records (Optional, uncomment if needed)
  // await prisma.buyerRequirement.deleteMany();
  // await prisma.produceInventory.deleteMany();
  // await prisma.user.deleteMany();

  // 2. Seed Demo Users
  const farmer = await prisma.user.upsert({
    where: { phone_number: '+919999999991' },
    update: {},
    create: {
      phone_number: '+919999999991',
      full_name: 'Ramesh (Farmer)',
      role: Role.farmer,
      is_verified: true,
    },
  });

  const buyer = await prisma.user.upsert({
    where: { phone_number: '+919999999992' },
    update: {},
    create: {
      phone_number: '+919999999992',
      full_name: 'Metro Bulk Buyers',
      role: Role.bulk_buyer,
      is_verified: true,
    },
  });
  
  const buyer2 = await prisma.user.upsert({
    where: { phone_number: '+919999999993' },
    update: {},
    create: {
      phone_number: '+919999999993',
      full_name: 'Taj Hotels Procurement',
      role: Role.bulk_buyer,
      is_verified: true,
    },
  });

  // 3. Seed Produce Inventory (From Farmer)
  const produce1 = await prisma.produceInventory.create({
    data: {
      farmer_id: farmer.id,
      crop_name: 'tomato',
      variety: 'Hybrid',
      total_quantity_kg: 500,
      available_quantity_kg: 500,
      expected_price_per_kg: 25.5,
      harvest_date: new Date(),
      quality_grade: QualityGrade.gradeA,
      pickup_latitude: 17.3850,
      pickup_longitude: 78.4867,
      pickup_address: 'Hyderabad, Telangana',
    }
  });

  const produce2 = await prisma.produceInventory.create({
    data: {
      farmer_id: farmer.id,
      crop_name: 'onion',
      variety: 'Red',
      total_quantity_kg: 1000,
      available_quantity_kg: 1000,
      expected_price_per_kg: 30.0,
      harvest_date: new Date(),
      quality_grade: QualityGrade.gradeA,
      pickup_latitude: 17.3850,
      pickup_longitude: 78.4867,
      pickup_address: 'Hyderabad, Telangana',
    }
  });

  // 4. Seed Buyer Requirements (Generating Search Volume Demand)
  // Seed 15 searches over the last 30 days to populate the AI Demand Forecasting graphs
  for (let i = 0; i < 15; i++) {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - Math.floor(Math.random() * 30));
    
    await prisma.buyerRequirement.create({
      data: {
        buyer_id: buyer.id,
        crop_name: i % 2 === 0 ? 'tomato' : 'onion',
        required_quantity_kg: 200 + (Math.random() * 500),
        target_price_min: 20.0,
        target_price_max: 28.0,
        required_by_date: new Date(),
        quality_grade_required: QualityGrade.gradeA,
        status: 'open',
        delivery_city: 'Secunderabad',
        delivery_state: 'Telangana',
        delivery_latitude: 17.4399,
        delivery_longitude: 78.4983,
        delivery_address: 'Secunderabad Market',
        created_at: pastDate
      }
    });
  }

  console.log('✅ Seeding completed! Database is loaded with Users, Produce, and AI Demand Data.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
