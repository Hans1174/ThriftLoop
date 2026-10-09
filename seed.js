import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'thriftloop_db',
  waitForConnections: true,
  connectionLimit: 5,
});

const categories = [
  { id: 1, name: 'Tops', description: 'Vintage graphic tees, crewnecks, and button-downs' },
  { id: 2, name: 'Outerwear', description: 'Workwear jackets, track tops, and denim coats' },
  { id: 3, name: 'Bottoms', description: 'Washed denim, work trousers, and cargo pants' },
  { id: 4, name: 'Dresses', description: 'Curated 70s-90s vintage skirts and dresses' },
  { id: 5, name: 'Accessories', description: 'Caps, belts, and vintage leather goods' },
];

const sampleGarments = [
  {
    category_id: 1,
    name: '1994 Harley-Davidson Eagle Graphic Tee',
    price: 850.00,
    size: 'L',
    chest_width: '21.5',
    length: '28.0',
    condition_grade: 'Grade A',
    description: 'Authentic 3D Emblem single-stitch tee. Heavy sun-fade with cracked chest graphic and zero pinholes.',
    image_url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=600&auto=format&fit=crop',
    status: 'active',
  },
  {
    category_id: 2,
    name: '1989 Carhartt Detroit Duck Canvas Jacket',
    price: 2450.00,
    size: 'XL',
    chest_width: '24.0',
    length: '26.5',
    condition_grade: 'Grade B',
    description: 'Made in USA. Blanket-lined interior with authentic work patina, corduroy collar, and brass zipper.',
    image_url: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=600&auto=format&fit=crop',
    status: 'active',
  },
  {
    category_id: 3,
    name: "1996 Levi's 501 Raw Indigo Denim",
    price: 1350.00,
    size: '32',
    chest_width: '16.0',
    length: '40.5',
    condition_grade: 'Grade A',
    description: 'Classic straight cut button-fly denim. Light whiskers across thighs, red tab intact, no heel drag.',
    image_url: 'https://images.unsplash.com/photo-1542272604-780c96856592?q=80&w=600&auto=format&fit=crop',
    status: 'active',
  },
  {
    category_id: 2,
    name: 'Vintage Washed Sherpa Trucker Jacket',
    price: 1100.00,
    size: 'L',
    chest_width: '22.5',
    length: '26.0',
    condition_grade: 'Grade A',
    description: 'Medium wash denim exterior lined with warm cream sherpa fleece. Features dual flap chest pockets.',
    image_url: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?q=80&w=600&auto=format&fit=crop',
    status: 'active',
  },
  {
    category_id: 4,
    name: '90s Rayon Floral Tea Midi Dress',
    price: 680.00,
    size: 'M',
    chest_width: '18.0',
    length: '44.0',
    condition_grade: 'Deadstock',
    description: 'Unworn with original 1994 department store hangtags. Fluid drape rayon with daisy botanical pattern.',
    image_url: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?q=80&w=600&auto=format&fit=crop',
    status: 'active',
  },
  {
    category_id: 1,
    name: '1998 Stüssy Tribe International Crewneck',
    price: 1250.00,
    size: 'M',
    chest_width: '21.0',
    length: '27.0',
    condition_grade: 'Grade A',
    description: 'Heavyweight fleece with rib-knit cuffs and hem. Subtle center chest logo embroidery in cream.',
    image_url: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?q=80&w=600&auto=format&fit=crop',
    status: 'active',
  },
  {
    category_id: 3,
    name: 'Vintage Olive Ripstop Utility Cargo Pants',
    price: 890.00,
    size: '34',
    chest_width: '17.0',
    length: '41.0',
    condition_grade: 'Grade A',
    description: 'Military-spec 100% cotton ripstop weave. Drawstring ankle adjusters and deep bellows side cargo pockets.',
    image_url: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=600&auto=format&fit=crop',
    status: 'active',
  },
  {
    category_id: 5,
    name: '80s Hand-Tooled Floral Leather Belt',
    price: 480.00,
    size: 'OS',
    chest_width: '1.5',
    length: '38.0',
    condition_grade: 'Grade A',
    description: 'Solid brass horseshoe buckle with intricately embossed full-grain cowhide leather.',
    image_url: 'https://images.unsplash.com/photo-1624222247344-550fb60583dc?q=80&w=600&auto=format&fit=crop',
    status: 'active',
  }
];

async function seedDatabase() {
  const conn = await pool.getConnection();
  try {
    console.log('🌱 Starting ThriftLoop catalog seeding...');

    // 1. Ensure Categories exist
    await conn.query(`
      CREATE TABLE IF NOT EXISTS Categories (
        category_id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT NULL
      )
    `);

    for (const cat of categories) {
      await conn.query(`
        INSERT INTO Categories (category_id, name, description)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description)
      `, [cat.id, cat.name, cat.description]);
    }
    console.log('✅ Categories synchronized');

    // 2. Clear old demo test products and insert curated vintage garments
    await conn.query('DELETE FROM Order_Items');
    await conn.query('DELETE FROM Products');

    for (const g of sampleGarments) {
      await conn.query(`
        INSERT INTO Products 
        (category_id, name, price, size, chest_width, length, condition_grade, description, image_url, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        g.category_id,
        g.name,
        g.price,
        g.size,
        g.chest_width,
        g.length,
        g.condition_grade,
        g.description,
        g.image_url,
        g.status,
      ]);
    }

    console.log(`✅ Successfully seeded ${sampleGarments.length} 1-of-1 vintage garments with flat-lay specs!`);
  } catch (err) {
    console.error('❌ Seeding error:', err);
  } finally {
    conn.release();
    process.exit(0);
  }
}

seedDatabase();