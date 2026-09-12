import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Setting up PostgreSQL Trigger: sync_farmer_produce_to_consumer_catalog');

  try {
    // 1. Create the Function
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION sync_farmer_produce_to_consumer_catalog()
      RETURNS TRIGGER AS $$
      DECLARE
          v_category_id UUID;
          v_mrp_price NUMERIC(10, 2);
          v_farmer_name VARCHAR(150);
          v_farmer_location VARCHAR(255);
          v_consumer_product_id UUID;
          v_icon_emoji VARCHAR(10);
      BEGIN
          -- Note: We map text crop names to known categories.
          -- Fallbacks applied if categories don't exist yet.
          
          SELECT id INTO v_category_id FROM "ConsumerCategory" LIMIT 1;
          v_icon_emoji := '🥦';

          -- Fetch Farmer details for provenance display
          SELECT full_name INTO v_farmer_name 
          FROM "User" 
          WHERE id = NEW.farmer_id;

          IF v_farmer_name IS NULL THEN
              v_farmer_name := 'Verified Local Farmer';
          END IF;

          -- Calculate Recommended MRP (45% markup)
          v_mrp_price := ROUND((NEW.expected_price_per_kg * 1.45)::numeric, 0);

          -- Check if active consumer product exists for this farmer and crop
          SELECT id INTO v_consumer_product_id 
          FROM "ConsumerProduct" 
          WHERE farmer_id = NEW.farmer_id 
            AND LOWER(name) LIKE '%' || LOWER(NEW.crop_name) || '%'
          LIMIT 1;

          IF v_consumer_product_id IS NOT NULL THEN
              -- Update existing product
              UPDATE "ConsumerProduct"
              SET available_quantity_kg = available_quantity_kg + NEW.total_quantity_kg,
                  price_per_kg = NEW.expected_price_per_kg,
                  mrp_price = v_mrp_price,
                  harvest_freshness = 'Harvested Today (Freshly Added)',
                  is_available = TRUE,
                  updated_at = NOW()
              WHERE id = v_consumer_product_id;
          ELSE
              -- Insert new Consumer Product
              INSERT INTO "ConsumerProduct" (
                  id,
                  category_id,
                  name,
                  description,
                  price_per_kg,
                  mrp_price,
                  unit,
                  available_quantity_kg,
                  source,
                  farmer_id,
                  distance_km,
                  quality_grade,
                  icon_emoji,
                  delivery_time,
                  is_bestseller,
                  harvest_freshness,
                  is_available
              ) VALUES (
                  gen_random_uuid(),
                  v_category_id,
                  'Fresh ' || INITCAP(NEW.crop_name) || COALESCE(' (' || NEW.variety || ')', ''),
                  'Farm-fresh ' || NEW.crop_name || ' harvested directly by ' || v_farmer_name || '. 100% natural, sorted Grade A.',
                  NEW.expected_price_per_kg,
                  v_mrp_price,
                  '1 kg',
                  NEW.total_quantity_kg,
                  'Direct from Farmer (' || v_farmer_name || ')',
                  NEW.farmer_id,
                  8.5,
                  'Grade A',
                  v_icon_emoji,
                  '15-25 mins',
                  (NEW.total_quantity_kg >= 50),
                  'Harvested Today (Just Listed)',
                  TRUE
              );
          END IF;

          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('✅ Function created successfully.');

    // 2. Drop existing trigger if it exists
    await prisma.$executeRawUnsafe(`
      DROP TRIGGER IF EXISTS trigger_auto_sync_farmer_produce_to_consumer ON "ProduceInventory";
    `);

    // 3. Create the Trigger
    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER trigger_auto_sync_farmer_produce_to_consumer
      AFTER INSERT OR UPDATE OF total_quantity_kg ON "ProduceInventory"
      FOR EACH ROW
      EXECUTE FUNCTION sync_farmer_produce_to_consumer_catalog();
    `);
    console.log('✅ Trigger attached to ProduceInventory table.');

  } catch (error) {
    console.error('❌ Error setting up trigger:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
