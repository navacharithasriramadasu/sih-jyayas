import { PrismaClient, Role, QualityGrade } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Seed Demo Users
  const farmer = await prisma.user.upsert({
    where: { phone_number: '+919999999991' },
    update: {},
    create: {
      phone_number: '+919999999991',
      full_name: 'Ramesh (Farmer)',
      role: Role.farmer,
      is_verified: true,
      address: 'Hyderabad, Telangana',
      latitude: 17.3850,
      longitude: 78.4867,
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
      address: 'Secunderabad, Telangana',
      latitude: 17.4399,
      longitude: 78.4983,
    },
  });

  // 2. Seed Produce Inventory (From Farmer)
  const produce = await prisma.produceInventory.create({
    data: {
      farmer_id: farmer.id,
      crop_name: 'Tomato',
      variety: 'Hybrid',
      total_quantity_kg: 500,
      available_quantity_kg: 500,
      expected_price_per_kg: 25.5,
      harvest_date: new Date(),
      quality_grade: QualityGrade.A,
      location_lat: 17.3850,
      location_lng: 78.4867,
      ai_pricing: {
        price_corridor: { lower_bound: 20, upper_bound: 30, recommended_price_per_kg: 26 },
        explainability: { demand_trend: 'high', confidence_score: 0.95 }
      }
    }
  });

  // 3. Seed Buyer Requirements
  const requirement = await prisma.buyerRequirement.create({
    data: {
      buyer_id: buyer.id,
      crop_name: 'Tomato',
      required_quantity_kg: 200,
      max_price_per_kg: 28.0,
      delivery_required: true,
      quality_grade_required: QualityGrade.A,
      status: 'open',
      location_lat: 17.4399,
      location_lng: 78.4983,
    }
  });

  console.log('✅ Seeding completed!');
  console.log({ farmer, buyer, produce, requirement });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
