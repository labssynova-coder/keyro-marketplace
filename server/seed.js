require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { hashPassword } = require('./utils/hash');

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  multipleStatements: true
};

const DB_NAME = process.env.DB_NAME || 'keyro_db';

const PLATFORMS = [
  { name: 'Steam', slug: 'steam', sort_order: 1 },
  { name: 'Xbox', slug: 'xbox', sort_order: 2 },
  { name: 'PlayStation', slug: 'playstation', sort_order: 3 },
  { name: 'Nintendo', slug: 'nintendo', sort_order: 4 },
  { name: 'Carte Cadeau', slug: 'giftcard', sort_order: 5 },
  { name: 'Logiciel', slug: 'software', sort_order: 6 }
];

const GENRES = [
  { name: 'Action', slug: 'action' },
  { name: 'RPG', slug: 'rpg' },
  { name: 'Course', slug: 'course' },
  { name: 'Sport', slug: 'sport' },
  { name: 'Horreur', slug: 'horreur' },
  { name: 'Aventure', slug: 'aventure' },
  { name: 'Carte Cadeau', slug: 'carte' },
  { name: 'Logiciel', slug: 'logiciel' },
  { name: 'Abonnement', slug: 'abonnement' }
];

const PRODUCTS = [
  { name:'Cyberpunk 2077', platformSlug:'steam', region:'Global', activation:'Steam Client', orig:79.99, sale:23.99, disc:70, genreSlugs:['action'], os:'Windows 10 64-bit', cpu:'Intel Core i7-6700 / AMD Ryzen 5 1600', ram:'16 Go', gpu:'NVIDIA GTX 1060 6 Go / AMD RX 590', desc:'Cyberpunk 2077 est un RPG en monde ouvert situé à Night City, une mégalopole obsédée par le pouvoir, le glamour et les modifications corporelles. Incarnez V, un hors-la-loi à la recherche d\'un implant unique qui confère l\'immortalité.' },
  { name:'Elden Ring', platformSlug:'steam', region:'Global', activation:'Steam Client', orig:59.99, sale:49.99, disc:17, genreSlugs:['rpg'], os:'Windows 10', cpu:'Intel Core i5-8400 / AMD Ryzen 3 3300X', ram:'12 Go', gpu:'NVIDIA GTX 1060 3 Go / AMD RX 580', desc:'Un vaste monde ouvert créé par Hidetaka Miyazaki et George R.R. Martin. Explorez les Terres Intermédiaires, affrontez des ennemis redoutables et forgez votre destin.' },
  { name:'GTA V', platformSlug:'steam', region:'Global', activation:'Steam Client', orig:29.99, sale:14.99, disc:50, genreSlugs:['action'], os:'Windows 8.1 64-bit', cpu:'Intel Core 2 Quad Q6600', ram:'8 Go', gpu:'NVIDIA GTX 660 2 Go / AMD HD 7870', desc:'Los Santos, une vaste métropole remplie de vies en tout genre. Trois protagonistes aux trajectoires entremêlées naviguent dans un monde de crime et de liberté absolue.' },
  { name:'Red Dead Redemption 2', platformSlug:'steam', region:'Global', activation:'Steam Client', orig:59.99, sale:29.99, disc:50, genreSlugs:['action'], os:'Windows 7 SP1', cpu:'Intel Core i5-2500K / AMD FX-6300', ram:'8 Go', gpu:'NVIDIA GTX 770 2 Go / AMD Radeon R9 280', desc:'Arthur Morgan et la bande de Van der Linde fuient la loi à travers l\'Amérique naissante. Un monde ouvert épique qui redéfinit le genre western.' },
  { name:'Hogwarts Legacy', platformSlug:'steam', region:'EU', activation:'Steam Client', orig:59.99, sale:39.99, disc:33, genreSlugs:['rpg'], os:'Windows 10', cpu:'Intel Core i5-6600 / AMD Ryzen 5 1400', ram:'16 Go', gpu:'NVIDIA GTX 960 4 Go / AMD RX 470', desc:'Vivez votre propre aventure à Poudlard au XIXe siècle. Maîtrisez la magie et découvrez les secrets de la magie ancienne dans ce RPG épique.' },
  { name:'God of War Ragnarök', platformSlug:'playstation', region:'EU', activation:'PSN', orig:69.99, sale:49.99, disc:29, genreSlugs:['action'], os:'PlayStation 5', cpu:null, ram:null, gpu:null, desc:'Kratos et Atreus affrontent le Ragnarök dans cette suite épique. Traversez les Neuf Royaumes et découvrez le destin d\'Atreus.' },
  { name:'Starfield', platformSlug:'xbox', region:'Global', activation:'Xbox / PC Game Pass', orig:69.99, sale:49.99, disc:29, genreSlugs:['rpg'], os:'Windows 10', cpu:'Intel Core i7-6800K / AMD Ryzen 5 2600X', ram:'16 Go', gpu:'NVIDIA RTX 2080 / AMD RX 5700 XT', desc:'De Bethesda Game Studios, Starfield est le premier nouvel univers IP en 25 ans. Explorez plus de 1000 planètes dans ce RPG spatial.' },
  { name:'Zelda: Tears of the Kingdom', platformSlug:'nintendo', region:'Europe', activation:'Nintendo eShop', orig:69.99, sale:59.99, disc:14, genreSlugs:['aventure'], os:'Nintendo Switch', cpu:null, ram:null, gpu:null, desc:'Une aventure épique dans les cieux et les profondeurs d\'Hyrule. Link doit sauver la princesse Zelda et affronter une menace qui dépasse l\'entendement.' },
  { name:'Forza Horizon 5', platformSlug:'xbox', region:'Global', activation:'Xbox / PC', orig:59.99, sale:29.99, disc:50, genreSlugs:['course'], os:'Windows 10', cpu:'Intel Core i5-4460 / AMD Ryzen 3 1200', ram:'8 Go', gpu:'NVIDIA GTX 970 / AMD RX 470', desc:'Explorez les paysages vibrants du Mexique dans le jeu de course open world le plus acclamé. Plus de 500 véhicules et des conditions météo dynamiques.' },
  { name:"Baldur's Gate 3", platformSlug:'steam', region:'Global', activation:'Steam Client', orig:59.99, sale:47.99, disc:20, genreSlugs:['rpg'], os:'Windows 10 64-bit', cpu:'Intel Core i5-4690 / AMD FX 8350', ram:'8 Go', gpu:'NVIDIA GTX 970 / AMD RX 480', desc:'Rassemblez votre bande et repoussez les ténèbres dans ce RPG épique basé sur Donjons & Dragons. Choix et conséquences définissent chaque partie.' },
  { name:'EA SPORTS FC 25', platformSlug:'steam', region:'Global', activation:'EA App', orig:69.99, sale:44.99, disc:36, genreSlugs:['sport'], os:'Windows 10', cpu:'Intel Core i5-10600K / AMD Ryzen 7 2700X', ram:'8 Go', gpu:'NVIDIA GTX 1660 / AMD RX 5700', desc:'Vivez le football comme jamais avec EA SPORTS FC 25. HypermotionV et la licence complète des compétitions mondiales.' },
  { name:'Carte Steam 50€', platformSlug:'steam', region:'EU', activation:'Steam Wallet', orig:50.00, sale:47.49, disc:5, genreSlugs:['carte'], os:null, cpu:null, ram:null, gpu:null, desc:'Carte cadeau Steam de 50€. Créditez votre portefeuille Steam et achetez n\'importe quel jeu ou logiciel sur la plateforme.' },
  { name:'Windows 11 Pro', platformSlug:'software', region:'Global', activation:'Clé numérique', orig:259.00, sale:29.99, disc:88, genreSlugs:['logiciel'], os:null, cpu:null, ram:null, gpu:null, desc:'Clé Windows 11 Professionnel. Activation instantanée, mise à jour automatique et sécurité renforcée.' },
  { name:'PS Plus Essential 12 mois', platformSlug:'playstation', region:'EU', activation:'PSN', orig:99.99, sale:74.99, disc:25, genreSlugs:['abonnement'], os:'PlayStation 4/5', cpu:null, ram:null, gpu:null, desc:'Abonnement PlayStation Plus Essential 12 mois. Jeux mensuels, remises exclusives et multijoueur en ligne.' },
  { name:'Resident Evil 4 Remake', platformSlug:'steam', region:'Global', activation:'Steam Client', orig:59.99, sale:29.99, disc:50, genreSlugs:['horreur'], os:'Windows 10 64-bit', cpu:'Intel Core i5-7500 / AMD Ryzen 3 1200', ram:'8 Go', gpu:'NVIDIA GTX 1050 Ti / AMD RX 560', desc:'Le remake du classique de la survie. Leon S. Kennedy est envoyé en Espagne pour sauver la fille du président.' },
  { name:'Xbox Game Pass Ultimate 3 mois', platformSlug:'xbox', region:'EU', activation:'Xbox / PC', orig:44.99, sale:34.99, disc:22, genreSlugs:['abonnement'], os:'Xbox / PC', cpu:null, ram:null, gpu:null, desc:'Accès à des centaines de jeux sur console et PC, jeux EA Play et avantages Xbox Live Gold pendant 3 mois.' }
];

async function seed() {
  let conn;
  try {
    conn = await mysql.createConnection(DB_CONFIG);
    console.log('Connected to MySQL');

    // Create database and tables
    const schemaPath = path.join(__dirname, 'migrations', '001_initial_schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await conn.query(schema);
    console.log('Schema created');

    await conn.query(`USE ${DB_NAME}`);

    // Check if already seeded
    const [rows] = await conn.query('SELECT COUNT(*) as cnt FROM platforms');
    if (rows[0].cnt > 0) {
      console.log('Database already seeded, skipping...');
      await conn.end();
      return;
    }

    // Insert platforms
    for (const p of PLATFORMS) {
      await conn.query('INSERT INTO platforms (name, slug, sort_order) VALUES (?, ?, ?)', [p.name, p.slug, p.sort_order]);
    }
    console.log('Platforms seeded');

    // Insert genres
    for (const g of GENRES) {
      await conn.query('INSERT INTO genres (name, slug) VALUES (?, ?)', [g.name, g.slug]);
    }
    console.log('Genres seeded');

    // Get platform and genre ID maps
    const [platRows] = await conn.query('SELECT id, slug FROM platforms');
    const platformMap = {};
    platRows.forEach(r => platformMap[r.slug] = r.id);

    const [genreRows] = await conn.query('SELECT id, slug FROM genres');
    const genreMap = {};
    genreRows.forEach(r => genreMap[r.slug] = r.id);

    // Insert products
    for (const p of PRODUCTS) {
      const [result] = await conn.query(
        `INSERT INTO products (name, platform_id, region, activation, original_price, sale_price, discount_percent, description, os_req, cpu_req, ram_req, gpu_req)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [p.name, platformMap[p.platformSlug], p.region, p.activation, p.orig, p.sale, p.disc, p.desc, p.os, p.cpu, p.ram, p.gpu]
      );
      const productId = result.insertId;

      // Insert product-genre relationships
      for (const gs of p.genreSlugs) {
        if (genreMap[gs]) {
          await conn.query('INSERT INTO product_genres (product_id, genre_id) VALUES (?, ?)', [productId, genreMap[gs]]);
        }
      }
    }
    console.log('Products seeded');

    // Create admin user
    const adminHash = await hashPassword('admin123');
    const [adminResult] = await conn.query(
      'INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES (?, ?, ?, ?, ?)',
      ['admin@keyro.com', adminHash, 'Admin', 'Keyro', 'admin']
    );
    const adminId = adminResult.insertId;

    // Create customer user
    const custHash = await hashPassword('password123');
    const [custResult] = await conn.query(
      'INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES (?, ?, ?, ?, ?)',
      ['jean.dupont@email.com', custHash, 'Jean', 'Dupont', 'customer']
    );
    const custId = custResult.insertId;
    console.log('Users seeded');

    // Insert reviews (assign to Cyberpunk 2077, product id will be 1)
    const [productRows] = await conn.query('SELECT id FROM products WHERE name = ? LIMIT 1', ['Cyberpunk 2077']);
    const cyberpunkId = productRows[0].id;

    const reviewsData = [
      { name: 'Marc D.', stars: 5, text: 'Livraison instantanée, clé fonctionnelle. Keyro est devenu mon site de référence pour les jeux Steam.' },
      { name: 'Sophie L.', stars: 4, text: 'Bon prix et activation rapide. Petit bémol : j\'aurais aimé plus d\'options de paiement.' },
      { name: 'Thomas R.', stars: 5, text: 'Acheté Elden Ring à moitié prix, clé reçue en 30 secondes. Impossible de faire mieux.' },
      { name: 'Émilie B.', stars: 5, text: 'Interface propre et professionnelle. On sent que c\'est un site sérieux. Je recommande.' }
    ];

    // Create reviewer users
    for (const r of reviewsData) {
      const [nameParts] = r.name.split(' ');
      const revHash = await hashPassword('review123');
      const [revResult] = await conn.query(
        'INSERT INTO users (email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?)',
        [`${r.name.toLowerCase().replace(/[^a-z]/g, '')}@keyro.com`, revHash, nameParts, r.name.split(' ')[1] || '']
      );
      await conn.query(
        'INSERT INTO reviews (product_id, user_id, rating, text) VALUES (?, ?, ?, ?)',
        [cyberpunkId, revResult.insertId, r.stars, r.text]
      );
    }
    console.log('Reviews seeded');

    // Insert orders for Jean Dupont
    const orderData = [
      { num: 'KEY-2025-0847', product: 'Elden Ring', price: 49.99, origPrice: 59.99, date: '2025-01-14' },
      { num: 'KEY-2025-0812', product: 'Cyberpunk 2077', price: 23.99, origPrice: 79.99, date: '2025-01-08' },
      { num: 'KEY-2025-0799', product: 'Carte Steam 50€', price: 47.49, origPrice: 50.00, date: '2025-01-02' }
    ];

    for (const o of orderData) {
      const [prodRow] = await conn.query('SELECT id FROM products WHERE name = ? LIMIT 1', [o.product]);
      const prodId = prodRow[0].id;
      const discount = orig => Math.round((orig - o.price) * 100) / 100;
      const [orderResult] = await conn.query(
        'INSERT INTO orders (user_id, order_number, status, subtotal, discount, total, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [custId, o.num, 'delivered', o.price, discount(o.origPrice), o.price, o.date]
      );
      await conn.query(
        'INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, original_price) VALUES (?, ?, ?, 1, ?, ?)',
        [orderResult.insertId, prodId, o.product, o.price, o.origPrice]
      );
    }
    console.log('Orders seeded');

    // Insert wishlist for Jean Dupont (Elden Ring, Hogwarts Legacy, Baldur's Gate 3)
    const wishlistProducts = ['Elden Ring', 'Hogwarts Legacy', "Baldur's Gate 3"];
    for (const wp of wishlistProducts) {
      const [prodRow] = await conn.query('SELECT id FROM products WHERE name = ? LIMIT 1', [wp]);
      if (prodRow.length) {
        await conn.query('INSERT INTO wishlist_items (user_id, product_id) VALUES (?, ?)', [custId, prodRow[0].id]);
      }
    }
    console.log('Wishlist seeded');

    console.log('\n=== Seed complete ===');
    console.log(`Admin: admin@keyro.com / admin123`);
    console.log(`Client: jean.dupont@email.com / password123`);
    console.log(`Products: ${PRODUCTS.length}`);
    console.log(`Platforms: ${PLATFORMS.length}`);
    console.log(`Genres: ${GENRES.length}`);

    await conn.end();
  } catch (err) {
    console.error('Seed error:', err.message);
    if (conn) await conn.end();
    process.exit(1);
  }
}

seed();