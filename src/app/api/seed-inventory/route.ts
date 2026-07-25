import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Variant = [pack: string, mrp: number];

interface ProductFamily {
  brand: string;
  line: string;
  category: string;
  subcategory: string;
  unit: string;
  supplier: string;
  shelfLifeDays: number;
  leadTimeDays: number;
  variants: Variant[];
}

interface InventorySeedRow {
  store_id: string;
  product_name: string;
  sku: string;
  category: string;
  current_stock: number;
  price: number;
  unit: string;
  brand: string;
  expiry_date: string;
  supplier: string;
  purchase_price: number;
  reorder_level: number;
}

const SEED_SUPPLIER_PREFIX = "Forecastify Curated Grocery Catalog";
const TARGET_PRODUCT_COUNT = 500;

const PRODUCT_FAMILIES: ProductFamily[] = [
  { brand: "Aashirvaad", line: "Shudh Chakki Atta", category: "Staples & Grains", subcategory: "Wheat Flour", unit: "pack", supplier: "ITC Foods Distributor", shelfLifeDays: 120, leadTimeDays: 3, variants: [["1 kg", 65], ["2 kg", 126], ["5 kg", 310], ["10 kg", 595]] },
  { brand: "Aashirvaad", line: "Multigrain Atta", category: "Staples & Grains", subcategory: "Wheat Flour", unit: "pack", supplier: "ITC Foods Distributor", shelfLifeDays: 120, leadTimeDays: 3, variants: [["500 g", 42], ["1 kg", 75], ["5 kg", 390], ["10 kg", 760]] },
  { brand: "Fortune", line: "Chakki Fresh Atta", category: "Staples & Grains", subcategory: "Wheat Flour", unit: "pack", supplier: "Adani Wilmar Distributor", shelfLifeDays: 120, leadTimeDays: 3, variants: [["1 kg", 62], ["2 kg", 120], ["5 kg", 290], ["10 kg", 560]] },
  { brand: "Pillsbury", line: "Chakki Fresh Atta", category: "Staples & Grains", subcategory: "Wheat Flour", unit: "pack", supplier: "General Mills Distributor", shelfLifeDays: 120, leadTimeDays: 3, variants: [["1 kg", 64], ["2 kg", 124], ["5 kg", 305], ["10 kg", 585]] },
  { brand: "India Gate", line: "Basmati Rice", category: "Staples & Grains", subcategory: "Rice", unit: "bag", supplier: "KRBL Rice Distributor", shelfLifeDays: 365, leadTimeDays: 5, variants: [["Classic 1 kg", 245], ["Dubar 1 kg", 185], ["Super 1 kg", 210], ["Feast Rozzana 1 kg", 115]] },
  { brand: "Daawat", line: "Basmati Rice", category: "Staples & Grains", subcategory: "Rice", unit: "bag", supplier: "LT Foods Distributor", shelfLifeDays: 365, leadTimeDays: 5, variants: [["Rozana Gold 1 kg", 145], ["Traditional 1 kg", 220], ["Dubar 1 kg", 170], ["Super 1 kg", 195]] },
  { brand: "Kohinoor", line: "Basmati Rice", category: "Staples & Grains", subcategory: "Rice", unit: "bag", supplier: "Kohinoor Foods Distributor", shelfLifeDays: 365, leadTimeDays: 5, variants: [["Charminar 1 kg", 135], ["Dubar 1 kg", 170], ["Platinum 1 kg", 225], ["Extra Long 1 kg", 245]] },
  { brand: "Loose", line: "Kolam Rice", category: "Staples & Grains", subcategory: "Rice", unit: "kg", supplier: "Local Grain Wholesaler", shelfLifeDays: 240, leadTimeDays: 2, variants: [["1 kg", 72], ["5 kg", 350], ["10 kg", 690], ["25 kg", 1700]] },
  { brand: "Loose", line: "Sona Masoori Rice", category: "Staples & Grains", subcategory: "Rice", unit: "kg", supplier: "Local Grain Wholesaler", shelfLifeDays: 240, leadTimeDays: 2, variants: [["1 kg", 68], ["5 kg", 330], ["10 kg", 650], ["25 kg", 1600]] },
  { brand: "Tata Sampann", line: "Poha", category: "Staples & Grains", subcategory: "Flattened Rice", unit: "pack", supplier: "Tata Consumer Distributor", shelfLifeDays: 180, leadTimeDays: 3, variants: [["Thin 500 g", 58], ["Thick 500 g", 60], ["1 kg", 112], ["Red Poha 500 g", 70]] },
  { brand: "Rajdhani", line: "Flour Essentials", category: "Staples & Grains", subcategory: "Flour", unit: "pack", supplier: "Rajdhani Foods Distributor", shelfLifeDays: 120, leadTimeDays: 3, variants: [["Besan 500 g", 70], ["Besan 1 kg", 135], ["Sooji 500 g", 45], ["Maida 500 g", 42]] },
  { brand: "Loose", line: "Wheat Grain", category: "Staples & Grains", subcategory: "Whole Grain", unit: "kg", supplier: "Local Grain Wholesaler", shelfLifeDays: 240, leadTimeDays: 2, variants: [["1 kg", 38], ["5 kg", 185], ["10 kg", 365], ["25 kg", 900]] },
  { brand: "Loose", line: "Millet Flour", category: "Staples & Grains", subcategory: "Millet Flour", unit: "kg", supplier: "Local Grain Wholesaler", shelfLifeDays: 90, leadTimeDays: 2, variants: [["Jowar 1 kg", 85], ["Bajra 1 kg", 70], ["Ragi 1 kg", 90], ["Nachni 500 g", 48]] },
  { brand: "24 Mantra Organic", line: "Daily Staples", category: "Staples & Grains", subcategory: "Organic Staples", unit: "pack", supplier: "Organic Staples Distributor", shelfLifeDays: 180, leadTimeDays: 5, variants: [["Atta 1 kg", 85], ["Brown Rice 1 kg", 145], ["Ragi Flour 500 g", 72], ["Poha 500 g", 75]] },
  { brand: "Organic Tattva", line: "Organic Staples", category: "Staples & Grains", subcategory: "Organic Staples", unit: "pack", supplier: "Organic Staples Distributor", shelfLifeDays: 180, leadTimeDays: 5, variants: [["Wheat Atta 1 kg", 88], ["Besan 500 g", 95], ["Poha 500 g", 80], ["Daliya 500 g", 70]] },
  { brand: "Tata Sampann", line: "Kitchen Staples", category: "Staples & Grains", subcategory: "Semolina & Flour", unit: "pack", supplier: "Tata Consumer Distributor", shelfLifeDays: 180, leadTimeDays: 3, variants: [["Daliya 500 g", 55], ["Rava 500 g", 48], ["Besan 500 g", 86], ["Poha 500 g", 65]] },

  { brand: "Tata Sampann", line: "Unpolished Dal", category: "Pulses & Dals", subcategory: "Dal", unit: "pack", supplier: "Tata Consumer Distributor", shelfLifeDays: 240, leadTimeDays: 4, variants: [["Toor Dal 1 kg", 210], ["Chana Dal 1 kg", 125], ["Moong Dal 1 kg", 175], ["Masoor Dal 1 kg", 145]] },
  { brand: "Organic Tattva", line: "Organic Dal", category: "Pulses & Dals", subcategory: "Organic Dal", unit: "pack", supplier: "Organic Staples Distributor", shelfLifeDays: 240, leadTimeDays: 5, variants: [["Toor Dal 1 kg", 235], ["Moong Dal 1 kg", 210], ["Masoor Dal 1 kg", 175], ["Chana Dal 1 kg", 155]] },
  { brand: "24 Mantra Organic", line: "Organic Dal", category: "Pulses & Dals", subcategory: "Organic Dal", unit: "pack", supplier: "Organic Staples Distributor", shelfLifeDays: 240, leadTimeDays: 5, variants: [["Toor Dal 1 kg", 240], ["Moong Dal 1 kg", 215], ["Masoor Dal 1 kg", 180], ["Urad Dal 1 kg", 210]] },
  { brand: "Loose", line: "Toor Dal", category: "Pulses & Dals", subcategory: "Dal", unit: "kg", supplier: "Local Pulses Wholesaler", shelfLifeDays: 240, leadTimeDays: 2, variants: [["500 g", 105], ["1 kg", 205], ["5 kg", 1000], ["Premium 1 kg", 230]] },
  { brand: "Loose", line: "Chana Dal", category: "Pulses & Dals", subcategory: "Dal", unit: "kg", supplier: "Local Pulses Wholesaler", shelfLifeDays: 240, leadTimeDays: 2, variants: [["500 g", 65], ["1 kg", 125], ["5 kg", 610], ["Premium 1 kg", 145]] },
  { brand: "Loose", line: "Moong Dal", category: "Pulses & Dals", subcategory: "Dal", unit: "kg", supplier: "Local Pulses Wholesaler", shelfLifeDays: 240, leadTimeDays: 2, variants: [["500 g", 90], ["1 kg", 175], ["5 kg", 860], ["Premium 1 kg", 195]] },
  { brand: "Loose", line: "Masoor Dal", category: "Pulses & Dals", subcategory: "Dal", unit: "kg", supplier: "Local Pulses Wholesaler", shelfLifeDays: 240, leadTimeDays: 2, variants: [["500 g", 75], ["1 kg", 145], ["5 kg", 710], ["Premium 1 kg", 165]] },
  { brand: "Loose", line: "Urad Dal", category: "Pulses & Dals", subcategory: "Dal", unit: "kg", supplier: "Local Pulses Wholesaler", shelfLifeDays: 240, leadTimeDays: 2, variants: [["500 g", 92], ["1 kg", 180], ["5 kg", 885], ["Premium 1 kg", 205]] },
  { brand: "Rajdhani", line: "Packaged Dal", category: "Pulses & Dals", subcategory: "Dal", unit: "pack", supplier: "Rajdhani Foods Distributor", shelfLifeDays: 240, leadTimeDays: 3, variants: [["Chana Dal 1 kg", 135], ["Toor Dal 1 kg", 220], ["Moong Dal 1 kg", 185], ["Masoor Dal 1 kg", 155]] },
  { brand: "Pro Nature", line: "Organic Pulses", category: "Pulses & Dals", subcategory: "Organic Dal", unit: "pack", supplier: "Organic Staples Distributor", shelfLifeDays: 240, leadTimeDays: 5, variants: [["Toor Dal 500 g", 130], ["Moong Dal 500 g", 120], ["Masoor Dal 500 g", 95], ["Chana Dal 500 g", 82]] },
  { brand: "Loose", line: "Whole Pulses", category: "Pulses & Dals", subcategory: "Whole Pulses", unit: "kg", supplier: "Local Pulses Wholesaler", shelfLifeDays: 240, leadTimeDays: 2, variants: [["Kabuli Chana 500 g", 95], ["Kabuli Chana 1 kg", 185], ["Kala Chana 1 kg", 110], ["Rajma 1 kg", 190]] },
  { brand: "Tata Sampann", line: "Beans & Chana", category: "Pulses & Dals", subcategory: "Whole Pulses", unit: "pack", supplier: "Tata Consumer Distributor", shelfLifeDays: 240, leadTimeDays: 4, variants: [["Rajma 500 g", 115], ["Kabuli Chana 500 g", 120], ["Kala Chana 500 g", 70], ["Lobia 500 g", 90]] },

  { brand: "Fortune", line: "Refined Edible Oil", category: "Oils & Ghee", subcategory: "Cooking Oil", unit: "bottle", supplier: "Adani Wilmar Distributor", shelfLifeDays: 270, leadTimeDays: 4, variants: [["Sunflower Oil 1 L", 160], ["Sunflower Oil 5 L", 780], ["Soyabean Oil 1 L", 145], ["Rice Bran Oil 1 L", 175]] },
  { brand: "Saffola", line: "Healthy Cooking Oil", category: "Oils & Ghee", subcategory: "Cooking Oil", unit: "bottle", supplier: "Marico Distributor", shelfLifeDays: 270, leadTimeDays: 4, variants: [["Gold Oil 1 L", 210], ["Active Oil 1 L", 190], ["Tasty Oil 1 L", 180], ["Gold Oil 5 L", 1040]] },
  { brand: "Gemini", line: "Refined Oil", category: "Oils & Ghee", subcategory: "Cooking Oil", unit: "bottle", supplier: "Cargill Distributor", shelfLifeDays: 270, leadTimeDays: 4, variants: [["Sunflower Oil 1 L", 155], ["Sunflower Oil 5 L", 755], ["Soyabean Oil 1 L", 145], ["Rice Bran Oil 1 L", 168]] },
  { brand: "Dhara", line: "Cooking Oil", category: "Oils & Ghee", subcategory: "Cooking Oil", unit: "bottle", supplier: "Mother Dairy Distributor", shelfLifeDays: 270, leadTimeDays: 4, variants: [["Kachi Ghani Mustard Oil 1 L", 180], ["Mustard Oil 500 ml", 95], ["Groundnut Oil 1 L", 210], ["Soyabean Oil 1 L", 150]] },
  { brand: "Figaro", line: "Olive Oil", category: "Oils & Ghee", subcategory: "Olive Oil", unit: "bottle", supplier: "Imported Foods Distributor", shelfLifeDays: 365, leadTimeDays: 7, variants: [["Pure Olive Oil 200 ml", 290], ["Pure Olive Oil 500 ml", 650], ["Pure Olive Oil 1 L", 1250], ["Extra Virgin Olive Oil 500 ml", 780]] },
  { brand: "Amul", line: "Pure Ghee", category: "Oils & Ghee", subcategory: "Ghee", unit: "jar", supplier: "Amul Dairy Distributor", shelfLifeDays: 270, leadTimeDays: 3, variants: [["200 ml", 150], ["500 ml", 360], ["1 L", 710], ["5 L Tin", 3450]] },
  { brand: "Gowardhan", line: "Ghee", category: "Oils & Ghee", subcategory: "Ghee", unit: "jar", supplier: "Parag Milk Foods Distributor", shelfLifeDays: 270, leadTimeDays: 3, variants: [["200 ml", 150], ["500 ml", 360], ["1 L", 710], ["5 L Tin", 3400]] },
  { brand: "Patanjali", line: "Cow Ghee", category: "Oils & Ghee", subcategory: "Ghee", unit: "jar", supplier: "Patanjali Distributor", shelfLifeDays: 270, leadTimeDays: 4, variants: [["200 ml", 150], ["500 ml", 365], ["1 L", 720], ["5 L Tin", 3500]] },

  { brand: "Everest", line: "Basic Powder Masala", category: "Masala & Spices", subcategory: "Powder Spices", unit: "pack", supplier: "Everest Distributor", shelfLifeDays: 365, leadTimeDays: 4, variants: [["Turmeric Powder 100 g", 32], ["Turmeric Powder 200 g", 62], ["Red Chilli Powder 100 g", 45], ["Coriander Powder 100 g", 38]] },
  { brand: "Everest", line: "Blended Masala", category: "Masala & Spices", subcategory: "Blended Spices", unit: "pack", supplier: "Everest Distributor", shelfLifeDays: 365, leadTimeDays: 4, variants: [["Garam Masala 100 g", 85], ["Pav Bhaji Masala 100 g", 78], ["Chole Masala 100 g", 80], ["Kitchen King Masala 100 g", 82]] },
  { brand: "MDH", line: "Classic Masala", category: "Masala & Spices", subcategory: "Blended Spices", unit: "pack", supplier: "MDH Distributor", shelfLifeDays: 365, leadTimeDays: 4, variants: [["Haldi Powder 100 g", 30], ["Deggi Mirch 100 g", 80], ["Chana Masala 100 g", 85], ["Garam Masala 100 g", 88]] },
  { brand: "Catch", line: "Powder Spice", category: "Masala & Spices", subcategory: "Powder Spices", unit: "pack", supplier: "DS Group Distributor", shelfLifeDays: 365, leadTimeDays: 4, variants: [["Turmeric Powder 100 g", 35], ["Red Chilli Powder 100 g", 48], ["Jeera Powder 100 g", 74], ["Black Pepper Powder 50 g", 95]] },
  { brand: "Tata Sampann", line: "Masala Powder", category: "Masala & Spices", subcategory: "Powder Spices", unit: "pack", supplier: "Tata Consumer Distributor", shelfLifeDays: 365, leadTimeDays: 4, variants: [["Turmeric Powder 100 g", 34], ["Chilli Powder 100 g", 48], ["Coriander Powder 100 g", 42], ["Garam Masala 100 g", 86]] },
  { brand: "Badshah", line: "Blended Masala", category: "Masala & Spices", subcategory: "Blended Spices", unit: "pack", supplier: "Badshah Distributor", shelfLifeDays: 365, leadTimeDays: 4, variants: [["Pav Bhaji Masala 100 g", 78], ["Chole Masala 100 g", 76], ["Kitchen King Masala 100 g", 84], ["Garam Masala 100 g", 86]] },
  { brand: "Suhana", line: "Recipe Masala", category: "Masala & Spices", subcategory: "Recipe Mix", unit: "pack", supplier: "Suhana Distributor", shelfLifeDays: 270, leadTimeDays: 4, variants: [["Paneer Butter Masala 50 g", 45], ["Chole Masala 50 g", 42], ["Misal Masala 50 g", 45], ["Chicken Masala 50 g", 48]] },
  { brand: "Aachi", line: "South Indian Masala", category: "Masala & Spices", subcategory: "Blended Spices", unit: "pack", supplier: "Aachi Distributor", shelfLifeDays: 365, leadTimeDays: 5, variants: [["Sambar Powder 100 g", 60], ["Rasam Powder 100 g", 58], ["Chicken Masala 100 g", 72], ["Chilli Powder 100 g", 48]] },
  { brand: "MTR", line: "South Indian Masala", category: "Masala & Spices", subcategory: "Blended Spices", unit: "pack", supplier: "MTR Foods Distributor", shelfLifeDays: 365, leadTimeDays: 5, variants: [["Sambar Powder 100 g", 62], ["Rasam Powder 100 g", 60], ["Bisibele Bath Powder 100 g", 70], ["Puliyogare Powder 100 g", 68]] },
  { brand: "Eastern", line: "Masala Powder", category: "Masala & Spices", subcategory: "Blended Spices", unit: "pack", supplier: "Eastern Distributor", shelfLifeDays: 365, leadTimeDays: 5, variants: [["Sambar Powder 100 g", 58], ["Rasam Powder 100 g", 56], ["Chicken Masala 100 g", 70], ["Meat Masala 100 g", 74]] },
  { brand: "Maggi", line: "Masala-ae-Magic", category: "Masala & Spices", subcategory: "Taste Maker", unit: "pack", supplier: "Nestle Distributor", shelfLifeDays: 270, leadTimeDays: 3, variants: [["6 g", 5], ["12 g", 10], ["50 g", 35], ["72 g", 48]] },
  { brand: "Loose", line: "Whole Spice Basics", category: "Masala & Spices", subcategory: "Whole Spices", unit: "pack", supplier: "Local Spice Wholesaler", shelfLifeDays: 365, leadTimeDays: 2, variants: [["Jeera 100 g", 46], ["Rai 100 g", 28], ["Methi 100 g", 22], ["Ajwain 100 g", 45]] },
  { brand: "Loose", line: "Premium Whole Spices", category: "Masala & Spices", subcategory: "Whole Spices", unit: "pack", supplier: "Local Spice Wholesaler", shelfLifeDays: 365, leadTimeDays: 2, variants: [["Black Pepper 100 g", 165], ["Clove 50 g", 120], ["Cinnamon 50 g", 55], ["Green Cardamom 50 g", 210]] },
  { brand: "Vandevi", line: "Hing", category: "Masala & Spices", subcategory: "Asafoetida", unit: "pack", supplier: "Vandevi Distributor", shelfLifeDays: 365, leadTimeDays: 5, variants: [["Yellow Hing 10 g", 55], ["Yellow Hing 25 g", 130], ["Compounded Hing 50 g", 240], ["Strong Hing 10 g", 65]] },
  { brand: "Tata Salt", line: "Salt", category: "Masala & Spices", subcategory: "Salt", unit: "pack", supplier: "Tata Consumer Distributor", shelfLifeDays: 730, leadTimeDays: 3, variants: [["Iodized Salt 1 kg", 28], ["Lite Salt 1 kg", 42], ["Crystal Salt 1 kg", 32], ["Rock Salt 1 kg", 55]] },
  { brand: "Keya", line: "Seasoning", category: "Masala & Spices", subcategory: "Seasoning", unit: "bottle", supplier: "Keya Foods Distributor", shelfLifeDays: 365, leadTimeDays: 5, variants: [["Oregano 20 g", 95], ["Chilli Flakes 30 g", 99], ["Mixed Herbs 20 g", 95], ["Garlic Bread Seasoning 50 g", 110]] },

  { brand: "Tata Tea", line: "Premium Tea", category: "Tea, Coffee & Breakfast", subcategory: "Tea", unit: "pack", supplier: "Tata Consumer Distributor", shelfLifeDays: 365, leadTimeDays: 3, variants: [["100 g", 35], ["250 g", 145], ["500 g", 290], ["1 kg", 560]] },
  { brand: "Tata Tea", line: "Gold Tea", category: "Tea, Coffee & Breakfast", subcategory: "Tea", unit: "pack", supplier: "Tata Consumer Distributor", shelfLifeDays: 365, leadTimeDays: 3, variants: [["100 g", 50], ["250 g", 165], ["500 g", 330], ["1 kg", 640]] },
  { brand: "Red Label", line: "Tea", category: "Tea, Coffee & Breakfast", subcategory: "Tea", unit: "pack", supplier: "HUL Distributor", shelfLifeDays: 365, leadTimeDays: 3, variants: [["100 g", 42], ["250 g", 155], ["500 g", 310], ["1 kg", 605]] },
  { brand: "Wagh Bakri", line: "Tea", category: "Tea, Coffee & Breakfast", subcategory: "Tea", unit: "pack", supplier: "Wagh Bakri Distributor", shelfLifeDays: 365, leadTimeDays: 3, variants: [["100 g", 42], ["250 g", 145], ["500 g", 290], ["1 kg", 565]] },
  { brand: "Society", line: "Tea", category: "Tea, Coffee & Breakfast", subcategory: "Tea", unit: "pack", supplier: "Society Tea Distributor", shelfLifeDays: 365, leadTimeDays: 3, variants: [["100 g", 45], ["250 g", 150], ["500 g", 300], ["1 kg", 585]] },
  { brand: "Nescafe", line: "Classic Coffee", category: "Tea, Coffee & Breakfast", subcategory: "Coffee", unit: "jar", supplier: "Nestle Distributor", shelfLifeDays: 365, leadTimeDays: 3, variants: [["25 g", 90], ["50 g", 170], ["100 g", 330], ["200 g", 640]] },
  { brand: "Bru", line: "Instant Coffee", category: "Tea, Coffee & Breakfast", subcategory: "Coffee", unit: "jar", supplier: "HUL Distributor", shelfLifeDays: 365, leadTimeDays: 3, variants: [["50 g", 165], ["100 g", 310], ["200 g", 590], ["500 g", 1420]] },
  { brand: "Continental", line: "Instant Coffee", category: "Tea, Coffee & Breakfast", subcategory: "Coffee", unit: "jar", supplier: "Continental Coffee Distributor", shelfLifeDays: 365, leadTimeDays: 5, variants: [["50 g", 150], ["100 g", 285], ["200 g", 540], ["400 g", 1050]] },
  { brand: "Loose", line: "Sugar", category: "Tea, Coffee & Breakfast", subcategory: "Sugar", unit: "kg", supplier: "Local Sugar Wholesaler", shelfLifeDays: 365, leadTimeDays: 2, variants: [["500 g", 24], ["1 kg", 48], ["5 kg", 235], ["10 kg", 460]] },
  { brand: "Tata Salt", line: "Salt Range", category: "Tea, Coffee & Breakfast", subcategory: "Salt", unit: "pack", supplier: "Tata Consumer Distributor", shelfLifeDays: 730, leadTimeDays: 3, variants: [["Iodized 1 kg", 28], ["Lite 1 kg", 42], ["Rock Salt 1 kg", 55], ["Black Salt 200 g", 38]] },
  { brand: "Madhur", line: "Sugar", category: "Tea, Coffee & Breakfast", subcategory: "Sugar", unit: "pack", supplier: "Madhur Sugar Distributor", shelfLifeDays: 365, leadTimeDays: 3, variants: [["Sugar 1 kg", 52], ["Sugar 5 kg", 255], ["Sulphurless Sugar 1 kg", 58], ["Sulphurless Sugar 5 kg", 285]] },
  { brand: "Kellogg's", line: "Breakfast Cereal", category: "Tea, Coffee & Breakfast", subcategory: "Cereal", unit: "box", supplier: "Kellogg Distributor", shelfLifeDays: 270, leadTimeDays: 5, variants: [["Corn Flakes 250 g", 135], ["Corn Flakes 475 g", 240], ["Corn Flakes 875 g", 430], ["Chocos 375 g", 220]] },
  { brand: "Saffola", line: "Oats", category: "Tea, Coffee & Breakfast", subcategory: "Oats", unit: "pack", supplier: "Marico Distributor", shelfLifeDays: 270, leadTimeDays: 4, variants: [["Plain Oats 400 g", 78], ["Plain Oats 1 kg", 190], ["Masala Oats 500 g", 205], ["Masala Oats 38 g", 20]] },
  { brand: "Quaker", line: "Oats", category: "Tea, Coffee & Breakfast", subcategory: "Oats", unit: "pack", supplier: "PepsiCo Distributor", shelfLifeDays: 270, leadTimeDays: 4, variants: [["Oats 400 g", 82], ["Oats 1 kg", 205], ["Masala Oats 40 g", 20], ["Oats Plus 700 g", 175]] },

  { brand: "Parle-G", line: "Glucose Biscuit", category: "Biscuits & Snacks", subcategory: "Biscuits", unit: "pack", supplier: "Parle Distributor", shelfLifeDays: 180, leadTimeDays: 3, variants: [["70 g", 10], ["250 g", 30], ["800 g", 100], ["1 kg", 125]] },
  { brand: "Britannia", line: "Good Day Biscuit", category: "Biscuits & Snacks", subcategory: "Biscuits", unit: "pack", supplier: "Britannia Distributor", shelfLifeDays: 180, leadTimeDays: 3, variants: [["Butter 60 g", 10], ["Butter 200 g", 40], ["Butter 600 g", 120], ["Cashew 200 g", 50]] },
  { brand: "Britannia", line: "Family Biscuit", category: "Biscuits & Snacks", subcategory: "Biscuits", unit: "pack", supplier: "Britannia Distributor", shelfLifeDays: 180, leadTimeDays: 3, variants: [["Marie Gold 120 g", 15], ["Marie Gold 250 g", 35], ["NutriChoice Digestive 100 g", 30], ["Milk Bikis 200 g", 35]] },
  { brand: "Sunfeast", line: "Sweet Biscuit", category: "Biscuits & Snacks", subcategory: "Biscuits", unit: "pack", supplier: "ITC Foods Distributor", shelfLifeDays: 180, leadTimeDays: 3, variants: [["Dark Fantasy Choco Fills 75 g", 40], ["Dark Fantasy Choco Fills 300 g", 160], ["Bounce 120 g", 20], ["Marie Light 250 g", 35]] },
  { brand: "Oreo", line: "Creme Biscuit", category: "Biscuits & Snacks", subcategory: "Biscuits", unit: "pack", supplier: "Mondelez Distributor", shelfLifeDays: 180, leadTimeDays: 4, variants: [["Vanilla 120 g", 35], ["Chocolate 120 g", 35], ["Strawberry 120 g", 35], ["Original 300 g", 90]] },
  { brand: "Hide & Seek", line: "Choco Chip Biscuit", category: "Biscuits & Snacks", subcategory: "Biscuits", unit: "pack", supplier: "Parle Distributor", shelfLifeDays: 180, leadTimeDays: 3, variants: [["100 g", 30], ["200 g", 60], ["Fab Chocolate 112 g", 35], ["Fab Orange 112 g", 35]] },
  { brand: "Haldiram's", line: "Bhujia Namkeen", category: "Biscuits & Snacks", subcategory: "Namkeen", unit: "pack", supplier: "Haldiram Distributor", shelfLifeDays: 150, leadTimeDays: 4, variants: [["Aloo Bhujia 200 g", 55], ["Aloo Bhujia 400 g", 110], ["Aloo Bhujia 1 kg", 260], ["Bhujia Sev 200 g", 55]] },
  { brand: "Haldiram's", line: "Namkeen Mix", category: "Biscuits & Snacks", subcategory: "Namkeen", unit: "pack", supplier: "Haldiram Distributor", shelfLifeDays: 150, leadTimeDays: 4, variants: [["Navrattan 200 g", 55], ["Boondi 200 g", 50], ["Khatta Meetha 200 g", 55], ["Punjabi Tadka 200 g", 55]] },
  { brand: "Balaji", line: "Wafers", category: "Biscuits & Snacks", subcategory: "Chips", unit: "pack", supplier: "Balaji Distributor", shelfLifeDays: 120, leadTimeDays: 3, variants: [["Simply Salted 52 g", 20], ["Masala Masti 52 g", 20], ["Cream Onion 52 g", 20], ["Tomato Twist 52 g", 20]] },
  { brand: "Lay's", line: "Potato Chips", category: "Biscuits & Snacks", subcategory: "Chips", unit: "pack", supplier: "PepsiCo Distributor", shelfLifeDays: 120, leadTimeDays: 3, variants: [["Classic Salted 52 g", 20], ["Magic Masala 52 g", 20], ["Spanish Tomato 52 g", 20], ["Cream & Onion 52 g", 20]] },
  { brand: "Kurkure", line: "Namkeen Snack", category: "Biscuits & Snacks", subcategory: "Extruded Snacks", unit: "pack", supplier: "PepsiCo Distributor", shelfLifeDays: 120, leadTimeDays: 3, variants: [["Masala Munch 75 g", 20], ["Chilli Chatka 75 g", 20], ["Green Chutney 75 g", 20], ["Solid Masti 75 g", 20]] },
  { brand: "Bingo", line: "Snack Range", category: "Biscuits & Snacks", subcategory: "Snacks", unit: "pack", supplier: "ITC Foods Distributor", shelfLifeDays: 120, leadTimeDays: 3, variants: [["Mad Angles 66 g", 20], ["Achaari Masti 66 g", 20], ["Tedhe Medhe 80 g", 20], ["Tangles 75 g", 20]] },
  { brand: "Pringles", line: "Potato Crisps", category: "Biscuits & Snacks", subcategory: "Chips", unit: "can", supplier: "Imported Foods Distributor", shelfLifeDays: 270, leadTimeDays: 7, variants: [["Original 107 g", 115], ["Sour Cream 107 g", 115], ["Hot & Spicy 107 g", 115], ["Pizza 107 g", 115]] },
  { brand: "Bikaji", line: "Namkeen", category: "Biscuits & Snacks", subcategory: "Namkeen", unit: "pack", supplier: "Bikaji Distributor", shelfLifeDays: 150, leadTimeDays: 4, variants: [["Bikaneri Bhujia 200 g", 55], ["Aloo Bhujia 200 g", 55], ["Khatta Meetha 200 g", 50], ["Moong Dal 200 g", 60]] },
  { brand: "Too Yumm", line: "Baked Snacks", category: "Biscuits & Snacks", subcategory: "Snacks", unit: "pack", supplier: "Guiltfree Industries Distributor", shelfLifeDays: 120, leadTimeDays: 4, variants: [["Karare 75 g", 20], ["Rings 60 g", 20], ["Chilli Achari 75 g", 20], ["Veggie Stix 60 g", 20]] },
  { brand: "Act II", line: "Popcorn", category: "Biscuits & Snacks", subcategory: "Popcorn", unit: "pack", supplier: "Conagra Distributor", shelfLifeDays: 180, leadTimeDays: 4, variants: [["Classic Salted 30 g", 10], ["Butter Delite 30 g", 10], ["Movie Theater Butter 70 g", 35], ["Cheese 59 g", 35]] },
  { brand: "Haldiram's", line: "Indian Sweets", category: "Biscuits & Snacks", subcategory: "Sweets", unit: "box", supplier: "Haldiram Distributor", shelfLifeDays: 90, leadTimeDays: 4, variants: [["Soan Papdi 250 g", 75], ["Soan Papdi 500 g", 145], ["Rasgulla 1 kg Tin", 230], ["Gulab Jamun 1 kg Tin", 240]] },
  { brand: "Balaji", line: "Namkeen", category: "Biscuits & Snacks", subcategory: "Namkeen", unit: "pack", supplier: "Balaji Distributor", shelfLifeDays: 150, leadTimeDays: 3, variants: [["Sev Murmura 200 g", 45], ["Moong Dal 200 g", 55], ["Chana Dal 200 g", 50], ["Farali Chivda 200 g", 60]] },

  { brand: "Amul", line: "Milk", category: "Dairy & Beverages", subcategory: "Milk", unit: "pouch", supplier: "Amul Dairy Distributor", shelfLifeDays: 3, leadTimeDays: 1, variants: [["Taaza 500 ml", 30], ["Taaza 1 L", 60], ["Gold 500 ml", 36], ["Gold 1 L", 72]] },
  { brand: "Amul", line: "Butter & Cheese", category: "Dairy & Beverages", subcategory: "Dairy", unit: "pack", supplier: "Amul Dairy Distributor", shelfLifeDays: 90, leadTimeDays: 2, variants: [["Butter 100 g", 56], ["Butter 500 g", 275], ["Cheese Slices 200 g", 140], ["Cheese Cubes 200 g", 135]] },
  { brand: "Amul", line: "Fresh Dairy", category: "Dairy & Beverages", subcategory: "Dairy", unit: "pack", supplier: "Amul Dairy Distributor", shelfLifeDays: 7, leadTimeDays: 1, variants: [["Masti Dahi 200 g", 20], ["Masti Dahi 400 g", 35], ["Lassi 200 ml", 20], ["Buttermilk 200 ml", 15]] },
  { brand: "Mother Dairy", line: "Fresh Dairy", category: "Dairy & Beverages", subcategory: "Dairy", unit: "pack", supplier: "Mother Dairy Distributor", shelfLifeDays: 7, leadTimeDays: 2, variants: [["Toned Milk 500 ml", 30], ["Full Cream Milk 500 ml", 36], ["Curd 400 g", 35], ["Paneer 200 g", 90]] },
  { brand: "Gowardhan", line: "Paneer & Curd", category: "Dairy & Beverages", subcategory: "Dairy", unit: "pack", supplier: "Parag Milk Foods Distributor", shelfLifeDays: 15, leadTimeDays: 2, variants: [["Paneer 200 g", 90], ["Paneer 500 g", 220], ["Curd 400 g", 35], ["Cheese 200 g", 130]] },
  { brand: "Epigamia", line: "Greek Yogurt", category: "Dairy & Beverages", subcategory: "Yogurt", unit: "cup", supplier: "Epigamia Distributor", shelfLifeDays: 20, leadTimeDays: 4, variants: [["Natural 90 g", 45], ["Strawberry 90 g", 50], ["Blueberry 90 g", 55], ["Curd 400 g", 70]] },
  { brand: "Bisleri", line: "Packaged Drinking Water", category: "Dairy & Beverages", subcategory: "Water", unit: "bottle", supplier: "Bisleri Distributor", shelfLifeDays: 365, leadTimeDays: 2, variants: [["500 ml", 10], ["1 L", 20], ["2 L", 35], ["5 L", 70]] },
  { brand: "Kinley", line: "Packaged Drinking Water", category: "Dairy & Beverages", subcategory: "Water", unit: "bottle", supplier: "Coca-Cola Distributor", shelfLifeDays: 365, leadTimeDays: 2, variants: [["500 ml", 10], ["1 L", 20], ["2 L", 35], ["5 L", 70]] },
  { brand: "Coca-Cola", line: "Soft Drink", category: "Dairy & Beverages", subcategory: "Soft Drinks", unit: "bottle", supplier: "Coca-Cola Distributor", shelfLifeDays: 180, leadTimeDays: 3, variants: [["250 ml", 20], ["500 ml", 40], ["750 ml", 45], ["1.25 L", 70]] },
  { brand: "Thums Up", line: "Soft Drink", category: "Dairy & Beverages", subcategory: "Soft Drinks", unit: "bottle", supplier: "Coca-Cola Distributor", shelfLifeDays: 180, leadTimeDays: 3, variants: [["250 ml", 20], ["500 ml", 40], ["750 ml", 45], ["1.25 L", 70]] },
  { brand: "Sprite", line: "Soft Drink", category: "Dairy & Beverages", subcategory: "Soft Drinks", unit: "bottle", supplier: "Coca-Cola Distributor", shelfLifeDays: 180, leadTimeDays: 3, variants: [["250 ml", 20], ["500 ml", 40], ["750 ml", 45], ["1.25 L", 70]] },
  { brand: "Pepsi", line: "Soft Drink", category: "Dairy & Beverages", subcategory: "Soft Drinks", unit: "bottle", supplier: "PepsiCo Distributor", shelfLifeDays: 180, leadTimeDays: 3, variants: [["250 ml", 20], ["500 ml", 40], ["750 ml", 45], ["1.25 L", 70]] },
  { brand: "Maaza", line: "Mango Drink", category: "Dairy & Beverages", subcategory: "Juice Drink", unit: "bottle", supplier: "Coca-Cola Distributor", shelfLifeDays: 180, leadTimeDays: 3, variants: [["150 ml Tetra", 10], ["250 ml", 20], ["600 ml", 45], ["1.2 L", 80]] },
  { brand: "Frooti", line: "Mango Drink", category: "Dairy & Beverages", subcategory: "Juice Drink", unit: "pack", supplier: "Parle Agro Distributor", shelfLifeDays: 180, leadTimeDays: 3, variants: [["125 ml", 10], ["200 ml", 15], ["600 ml", 40], ["1 L", 70]] },
  { brand: "Real Fruit Power", line: "Fruit Juice", category: "Dairy & Beverages", subcategory: "Juice", unit: "carton", supplier: "Dabur Distributor", shelfLifeDays: 180, leadTimeDays: 4, variants: [["Mango 1 L", 125], ["Orange 1 L", 125], ["Mixed Fruit 1 L", 125], ["Apple 1 L", 135]] },
  { brand: "Tropicana", line: "Fruit Juice", category: "Dairy & Beverages", subcategory: "Juice", unit: "carton", supplier: "PepsiCo Distributor", shelfLifeDays: 180, leadTimeDays: 4, variants: [["Guava 1 L", 125], ["Orange 1 L", 130], ["Mixed Fruit 1 L", 125], ["Apple 1 L", 135]] },
  { brand: "Paper Boat", line: "Traditional Drink", category: "Dairy & Beverages", subcategory: "Beverage", unit: "pack", supplier: "Hector Beverages Distributor", shelfLifeDays: 180, leadTimeDays: 5, variants: [["Aam Panna 200 ml", 30], ["Jaljeera 200 ml", 30], ["Aamras 200 ml", 35], ["Anar 200 ml", 35]] },
  { brand: "Red Bull", line: "Energy Drink", category: "Dairy & Beverages", subcategory: "Energy Drink", unit: "can", supplier: "Premium Beverage Distributor", shelfLifeDays: 270, leadTimeDays: 5, variants: [["Classic 250 ml", 125], ["Sugarfree 250 ml", 125], ["Classic 350 ml", 165], ["Pack of 4 250 ml", 500]] },

  { brand: "Maggi", line: "2-Minute Noodles Masala", category: "Instant Food & Condiments", subcategory: "Noodles", unit: "pack", supplier: "Nestle Distributor", shelfLifeDays: 270, leadTimeDays: 3, variants: [["70 g", 14], ["140 g", 28], ["280 g", 56], ["420 g", 84]] },
  { brand: "Sunfeast YiPPee!", line: "Instant Noodles", category: "Instant Food & Condiments", subcategory: "Noodles", unit: "pack", supplier: "ITC Foods Distributor", shelfLifeDays: 270, leadTimeDays: 3, variants: [["Magic Masala 70 g", 15], ["Magic Masala 280 g", 60], ["Mood Masala 70 g", 15], ["Tricolor 70 g", 15]] },
  { brand: "Top Ramen", line: "Instant Noodles", category: "Instant Food & Condiments", subcategory: "Noodles", unit: "pack", supplier: "Nissin Distributor", shelfLifeDays: 270, leadTimeDays: 4, variants: [["Curry 70 g", 15], ["Masala 70 g", 15], ["Fiery Chilli 70 g", 15], ["Curry 280 g", 60]] },
  { brand: "MTR", line: "Breakfast Mix", category: "Instant Food & Condiments", subcategory: "Ready Mix", unit: "pack", supplier: "MTR Foods Distributor", shelfLifeDays: 270, leadTimeDays: 4, variants: [["Dosa Mix 500 g", 130], ["Idli Mix 500 g", 130], ["Upma Mix 500 g", 120], ["Poha Mix 180 g", 65]] },
  { brand: "Gits", line: "Instant Mix", category: "Instant Food & Condiments", subcategory: "Ready Mix", unit: "pack", supplier: "Gits Distributor", shelfLifeDays: 270, leadTimeDays: 4, variants: [["Gulab Jamun Mix 200 g", 120], ["Dhokla Mix 200 g", 70], ["Khaman Mix 200 g", 70], ["Idli Mix 500 g", 125]] },
  { brand: "Knorr", line: "Soup", category: "Instant Food & Condiments", subcategory: "Soup", unit: "pack", supplier: "HUL Distributor", shelfLifeDays: 270, leadTimeDays: 4, variants: [["Tomato Soup 43 g", 60], ["Sweet Corn Soup 42 g", 60], ["Manchow Soup 42 g", 60], ["Hot & Sour Soup 43 g", 60]] },
  { brand: "Kissan", line: "Tomato Ketchup", category: "Instant Food & Condiments", subcategory: "Sauce", unit: "bottle", supplier: "HUL Distributor", shelfLifeDays: 270, leadTimeDays: 4, variants: [["200 g", 65], ["500 g", 130], ["950 g", 185], ["Fresh Tomato 1 kg", 195]] },
  { brand: "Maggi", line: "Sauce", category: "Instant Food & Condiments", subcategory: "Sauce", unit: "bottle", supplier: "Nestle Distributor", shelfLifeDays: 270, leadTimeDays: 3, variants: [["Hot & Sweet 200 g", 75], ["Hot & Sweet 500 g", 145], ["Pichkoo 90 g", 20], ["Rich Tomato 500 g", 135]] },
  { brand: "FunFoods", line: "Spreads", category: "Instant Food & Condiments", subcategory: "Spread", unit: "jar", supplier: "Dr. Oetker Distributor", shelfLifeDays: 180, leadTimeDays: 5, variants: [["Mayonnaise 250 g", 85], ["Mayonnaise 500 g", 165], ["Sandwich Spread 250 g", 99], ["Pizza Topping 325 g", 110]] },
  { brand: "Mother's Recipe", line: "Pickle", category: "Instant Food & Condiments", subcategory: "Pickle", unit: "jar", supplier: "Mother's Recipe Distributor", shelfLifeDays: 365, leadTimeDays: 5, variants: [["Mango Pickle 200 g", 85], ["Mixed Pickle 200 g", 85], ["Lime Pickle 200 g", 80], ["Green Chilli Pickle 200 g", 80]] },
  { brand: "Priya", line: "Pickle", category: "Instant Food & Condiments", subcategory: "Pickle", unit: "jar", supplier: "Priya Foods Distributor", shelfLifeDays: 365, leadTimeDays: 5, variants: [["Mango Pickle 300 g", 95], ["Gongura Pickle 300 g", 110], ["Mixed Pickle 300 g", 95], ["Lime Pickle 300 g", 90]] },
  { brand: "Ching's Secret", line: "Chinese Kitchen", category: "Instant Food & Condiments", subcategory: "Chinese Mix", unit: "pack", supplier: "Capital Foods Distributor", shelfLifeDays: 270, leadTimeDays: 4, variants: [["Hakka Noodles 150 g", 30], ["Schezwan Chutney 250 g", 90], ["Manchurian Masala 50 g", 15], ["Hot Garlic Soup 55 g", 60]] },
  { brand: "Bambino", line: "Pasta & Vermicelli", category: "Instant Food & Condiments", subcategory: "Pasta", unit: "pack", supplier: "Bambino Distributor", shelfLifeDays: 270, leadTimeDays: 4, variants: [["Vermicelli 200 g", 28], ["Vermicelli 500 g", 70], ["Roasted Vermicelli 400 g", 65], ["Macaroni 400 g", 75]] },

  { brand: "Colgate", line: "Toothpaste", category: "Personal Care & Household", subcategory: "Oral Care", unit: "tube", supplier: "Colgate Distributor", shelfLifeDays: 730, leadTimeDays: 4, variants: [["Strong Teeth 100 g", 65], ["MaxFresh 80 g", 60], ["Active Salt 100 g", 68], ["Visible White 100 g", 125]] },
  { brand: "Pepsodent", line: "Toothpaste", category: "Personal Care & Household", subcategory: "Oral Care", unit: "tube", supplier: "HUL Distributor", shelfLifeDays: 730, leadTimeDays: 4, variants: [["Germicheck 100 g", 60], ["Expert Protection 80 g", 95], ["Clove Salt 100 g", 65], ["Kids 80 g", 70]] },
  { brand: "Dettol", line: "Hygiene Care", category: "Personal Care & Household", subcategory: "Soap & Handwash", unit: "pack", supplier: "Reckitt Distributor", shelfLifeDays: 730, leadTimeDays: 4, variants: [["Soap Original 75 g", 35], ["Soap Skincare 75 g", 35], ["Soap Cool 75 g", 35], ["Handwash 200 ml", 90]] },
  { brand: "Lifebuoy", line: "Hygiene Care", category: "Personal Care & Household", subcategory: "Soap & Handwash", unit: "pack", supplier: "HUL Distributor", shelfLifeDays: 730, leadTimeDays: 4, variants: [["Total10 Soap 75 g", 35], ["Lemon Fresh Soap 75 g", 35], ["Handwash 200 ml", 85], ["Sanitizer 50 ml", 25]] },
  { brand: "Dove", line: "Personal Care", category: "Personal Care & Household", subcategory: "Bath & Hair", unit: "pack", supplier: "HUL Distributor", shelfLifeDays: 730, leadTimeDays: 4, variants: [["Cream Beauty Bar 100 g", 65], ["Shampoo Daily Shine 180 ml", 170], ["Conditioner 175 ml", 180], ["Body Wash 250 ml", 230]] },
  { brand: "Clinic Plus", line: "Shampoo", category: "Personal Care & Household", subcategory: "Hair Care", unit: "bottle", supplier: "HUL Distributor", shelfLifeDays: 730, leadTimeDays: 4, variants: [["80 ml", 70], ["175 ml", 145], ["340 ml", 260], ["Sachet Pack of 16", 32]] },
  { brand: "Surf Excel", line: "Detergent", category: "Personal Care & Household", subcategory: "Laundry", unit: "pack", supplier: "HUL Distributor", shelfLifeDays: 730, leadTimeDays: 4, variants: [["Easy Wash 500 g", 68], ["Easy Wash 1 kg", 135], ["Matic Top Load 1 kg", 245], ["Liquid 1 L", 240]] },
  { brand: "Ariel", line: "Laundry Care", category: "Personal Care & Household", subcategory: "Laundry", unit: "pack", supplier: "P&G Distributor", shelfLifeDays: 730, leadTimeDays: 4, variants: [["Matic 1 kg", 255], ["Matic 2 kg", 510], ["Liquid 1 L", 260], ["Detergent Bar 250 g", 35]] },
  { brand: "Vim", line: "Dishwash", category: "Personal Care & Household", subcategory: "Dishwash", unit: "pack", supplier: "HUL Distributor", shelfLifeDays: 730, leadTimeDays: 4, variants: [["Bar 155 g", 10], ["Bar 300 g", 20], ["Liquid 250 ml", 55], ["Liquid 750 ml", 145]] },
  { brand: "Harpic", line: "Cleaner", category: "Personal Care & Household", subcategory: "Cleaning", unit: "bottle", supplier: "Reckitt Distributor", shelfLifeDays: 730, leadTimeDays: 4, variants: [["Toilet Cleaner 200 ml", 45], ["Toilet Cleaner 500 ml", 99], ["Toilet Cleaner 1 L", 198], ["Bathroom Cleaner 500 ml", 110]] },
];

function addDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}

function baseDailyDemand(category: string, mrp: number): number {
  if (category === "Dairy & Beverages") return mrp <= 50 ? 16 : 8;
  if (category === "Biscuits & Snacks") return mrp <= 25 ? 18 : 9;
  if (category === "Tea, Coffee & Breakfast") return mrp <= 80 ? 10 : 5;
  if (category === "Staples & Grains") return mrp >= 500 ? 3 : 7;
  if (category === "Pulses & Dals") return mrp >= 200 ? 4 : 6;
  if (category === "Masala & Spices") return mrp <= 50 ? 7 : 4;
  if (category === "Instant Food & Condiments") return mrp <= 30 ? 13 : 6;
  if (category === "Personal Care & Household") return mrp <= 50 ? 8 : 4;
  return 5;
}

function purchasePrice(mrp: number, category: string): number {
  const factor =
    category === "Dairy & Beverages" ? 0.86 :
    category === "Biscuits & Snacks" ? 0.82 :
    category === "Personal Care & Household" ? 0.78 :
    category === "Masala & Spices" ? 0.76 :
    category === "Instant Food & Condiments" ? 0.8 :
    0.88;
  return Math.round(mrp * factor * 100) / 100;
}

function stockFor(index: number, reorderLevel: number): number {
  const bucket = index % 20;
  if (bucket === 0 || bucket === 1) return 0;
  if (bucket >= 2 && bucket <= 4) return Math.max(1, Math.floor(reorderLevel * 0.45));
  if (bucket >= 5 && bucket <= 7) return Math.max(2, reorderLevel - 1);
  if (bucket >= 8 && bucket <= 11) return reorderLevel * 7 + (bucket * 3);
  return reorderLevel * 2 + (bucket % 5) * 4;
}

function expiryFor(index: number, shelfLifeDays: number): string {
  if (shelfLifeDays <= 7) {
    return addDays(index % 5 === 0 ? 1 : 2 + (index % 4));
  }
  if (index % 17 === 0) return addDays(3 + (index % 4));
  if (index % 13 === 0) return addDays(8 + (index % 8));
  return addDays(Math.max(30, Math.floor(shelfLifeDays * 0.65)) + (index % 45));
}

function buildInventoryRows(userId: string): InventorySeedRow[] {
  const expanded = PRODUCT_FAMILIES.flatMap((family) =>
    family.variants.map(([pack, mrp]) => ({ family, pack, mrp }))
  );

  if (expanded.length < TARGET_PRODUCT_COUNT) {
    throw new Error(`Curated catalog has only ${expanded.length} products`);
  }

  return expanded.slice(0, TARGET_PRODUCT_COUNT).map(({ family, pack, mrp }, index) => {
    const dailyDemand = baseDailyDemand(family.category, mrp);
    const reorderLevel = Math.max(3, Math.round(dailyDemand * family.leadTimeDays * 1.3));

    return {
      store_id: userId,
      product_name: `${family.brand} ${family.line} ${pack}`,
      sku: `GROVY-${String(index + 1).padStart(4, "0")}`,
      category: family.category,
      current_stock: stockFor(index, reorderLevel),
      price: mrp,
      unit: family.unit,
      brand: family.brand,
      expiry_date: expiryFor(index, family.shelfLifeDays),
      supplier: `${SEED_SUPPLIER_PREFIX} - ${family.supplier}`,
      purchase_price: purchasePrice(mrp, family.category),
      reorder_level: reorderLevel,
    };
  });
}

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

    const rows = buildInventoryRows(userId);

    await supabase
      .from("profiles")
      .update({
        store_name: "Grovy Grocery Store",
        store_category: "Grocery & Supermarket",
        store_size: "Medium (6-25 employees)",
        store_address: "FC Road, Shivajinagar, Pune, Maharashtra 411005",
        city: "Pune",
        state: "Maharashtra",
      })
      .eq("id", userId);

    const { error: deleteError } = await supabase
      .from("inventory")
      .delete()
      .eq("store_id", userId)
      .like("supplier", `${SEED_SUPPLIER_PREFIX}%`);

    if (deleteError) {
      return NextResponse.json({ error: `Could not replace previous seed data: ${deleteError.message}` }, { status: 500 });
    }

    let insertedCount = 0;
    for (let i = 0; i < rows.length; i += 100) {
      const batch = rows.slice(i, i + 100);
      const { error } = await supabase.from("inventory").insert(batch);
      if (error) {
        return NextResponse.json({ error: `Failed to insert batch ${Math.floor(i / 100) + 1}: ${error.message}` }, { status: 500 });
      }
      insertedCount += batch.length;
    }

    const stockMix = rows.reduce(
      (acc, row) => {
        if (row.current_stock === 0) acc.outOfStock += 1;
        else if (row.current_stock < row.reorder_level) acc.aboutToEnd += 1;
        else if (row.current_stock > row.reorder_level * 5) acc.overstock += 1;
        else acc.optimal += 1;
        return acc;
      },
      { optimal: 0, outOfStock: 0, aboutToEnd: 0, overstock: 0 }
    );

    return NextResponse.json({
      success: true,
      count: insertedCount,
      stockMix,
      message: `Seeded ${insertedCount} curated grocery products into Grovy Grocery Store.`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
