import 'dotenv/config';
import { db } from '../src/services/supabaseClient';
import { hashPassword } from '../src/services/security/passwordService';

/**
 * PRODUCTION PASSWORD MIGRATION SCRIPT
 * Merged Version: Combines abstraction safety with detailed logging.
 */
async function migratePasswords() {
  console.log('--------------------------------------------------');
  console.log('🔐 Starting Secure Password Migration...');
  console.log('--------------------------------------------------\n');

  try {
    // 1. Fetch users using the abstracted db service
    const users = await db.users.getAll();
    console.log(`📊 Found ${users.length} total users in database.\n`);

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const user of users) {
      // Logic: check both password_hash and the legacy 'password' field
      const currentPassword = user.password_hash || user.password;

      // 2. SAFETY CHECK: Skip if already hashed
      // Bcrypt hashes start with $2a$, $2b$, or $2y$
      if (currentPassword && currentPassword.startsWith('$2')) {
        console.log(`[SKIP] ${user.email.padEnd(30)} | Already Hashed`);
        skippedCount++;
        continue;
      }

      // 3. VALIDATION: Check for empty passwords
      if (!currentPassword) {
        console.warn(`[WARN] ${user.email.padEnd(30)} | No password data found!`);
        skippedCount++;
        continue;
      }

      try {
        console.log(`[PROC] ${user.email.padEnd(30)} | Hashing...`);

        // 4. HASH: Use the centralized password service (Consistency is key!)
        const hashedPassword = await hashPassword(currentPassword);

        // 5. UPDATE: Save back to the database
        const { error } = await db.users.update(user.id, {
          password_hash: hashedPassword,
          // If you have a legacy 'password' field, null it out for security
          password: null 
        });

        if (error) throw error;

        migratedCount++;
      } catch (err) {
        console.error(`[ERR ] ${user.email.padEnd(30)} | Update failed: ${err.message}`);
        errorCount++;
      }
    }

    // Summary Report
    console.log('\n--------------------------------------------------');
    console.log('✅ MIGRATION COMPLETE');
    console.log(`   Migrated: ${migratedCount}`);
    console.log(`   Skipped:  ${skippedCount}`);
    console.log(`   Errors:   ${errorCount}`);
    console.log('--------------------------------------------------');
    console.log('⚠️  CRITICAL: Attempt to log in with an admin account');
    console.log('   to verify migration before closing this task.');
    console.log('--------------------------------------------------\n');

  } catch (error) {
    console.error('\n❌ FATAL ERROR during migration:', error.message);
    process.exit(1);
  }
}

// Execute
migratePasswords();