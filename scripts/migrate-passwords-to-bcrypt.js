require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;

async function migratePasswords() {
  // Safety confirmation
  if (process.argv[2] !== '--confirm') {
    console.error('⚠️  IMPORTANT: This will migrate all plain-text passwords to bcrypt hashes');
    console.log('\nIf you are sure you want to proceed, run:');
    console.log('   node scripts/migrate-passwords-to-bcrypt.js --confirm');
    process.exit(1);
  }

  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    console.log('🔗 Connecting to MongoDB...');
    await client.connect();
    const db = client.db('elva-agents');
    
    console.log('📝 Fetching users with plain-text passwords...');
    const users = await db.collection('users').find({
      provider: 'credentials', // Only credentials users have passwords
      password: { $exists: true }
    }).toArray();

    console.log(`Found ${users.length} users to migrate`);

    let migrated = 0;
    let skipped = 0;
    let failed = 0;

    for (const user of users) {
      try {
        // Check if already hashed (bcrypt hashes start with $2a$ or $2b$)
        if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
          console.log(`⏭️  Skipping ${user.email} - already hashed`);
          skipped++;
          continue;
        }

        // Hash the plain-text password
        const hashedPassword = await bcrypt.hash(user.password, SALT_ROUNDS);

        // Update in database
        await db.collection('users').updateOne(
          { _id: user._id },
          { 
            $set: { 
              password: hashedPassword,
              passwordMigratedAt: new Date()
            } 
          }
        );

        console.log(`✅ Migrated ${user.email}`);
        migrated++;

      } catch (error) {
        console.error(`❌ Failed to migrate ${user.email}:`, error.message);
        failed++;
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   Migrated: ${migrated}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   Total: ${users.length}`);

    if (failed === 0) {
      console.log('\n✅ Migration completed successfully!');
    } else {
      console.log('\n⚠️  Migration completed with errors. Please review failed users.');
    }

  } catch (error) {
    console.error('❌ Migration error:', error);
  } finally {
    await client.close();
  }
}

if (require.main === module) {
  migratePasswords();
}

module.exports = { migratePasswords };

