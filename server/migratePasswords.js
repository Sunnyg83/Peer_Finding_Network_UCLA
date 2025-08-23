// script to hash existing plain text passwords for existing users


const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/peer-finding-network')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Import User model
const User = require('./models/User');
 
async function migratePasswords() {
  try {
    console.log('Starting password migration...');
    
    // Find all users
    const users = await User.find({});
    console.log(`Found ${users.length} users to migrate`);
    
    let migratedCount = 0;
    let skippedCount = 0;
    
    for (const user of users) {
      // Check if password is already hashed (bcrypt hashes start with $2b$)
      if (user.password.startsWith('$2b$')) {
        console.log(`User ${user.email} already has hashed password, skipping...`);
        skippedCount++;
        continue;
      }
      
      // Hash the plain text password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(user.password, saltRounds);
      
      // Update the user with hashed password
      await User.findByIdAndUpdate(user._id, { password: hashedPassword });
      
      console.log(`Migrated password for user: ${user.email}`);
      migratedCount++;
    }
    
    console.log(`\nMigration complete!`);
    console.log(`Migrated: ${migratedCount} users`);
    console.log(`Skipped (already hashed): ${skippedCount} users`);
    
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migratePasswords();
}

module.exports = migratePasswords;
