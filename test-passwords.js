const bcrypt = require('bcrypt');

// Test users with their hashes from your database
const users = [
  { email: 'lahareesh@dmhca.in', hash: '$2b$10$GKqJ7H8X5qK9wL2mN3pR6sT7uV8wX9yZ0aB1cD2eF3gH4iJ5k6L7m' },
  { email: 'chandan@delhimedical.net', hash: '$2b$10$NMtEG2a6eFcApljvrzjsqeGvRZcTxyciEBg5akyLJdqKRg2l7JEta' },
  { email: 'surya@gmail.com', hash: '$2b$10$UvK8X5L2mN9pQ4rS6tU7vW8yZ1aB3cD5eF7gH0iI2jJ4kK6lL8mM9' },
  { email: 'nikhil@ibmpractitioner.us', hash: '$2b$10$VeGNSTpr/fWgfm1iIMfDrOmYOrUxHabUujaRhLpnVijPm8eV5st/e' }
];

const passwordsToTry = [
  'password', 'admin123', 'Password123', 'lahareesh@123', 'Lahareesh@123', 
  'chandan@123', 'Chandan@123', 'surya@123', 'Surya@123', 'nikhil@123', 
  'Nikhil@123', '123456', 'admin', 'dmhca123', 'test123', 'Welcome@123'
];

console.log('🔍 Testing password combinations...\n');

users.forEach(user => {
  console.log(`Testing ${user.email}:`);
  let found = false;
  
  passwordsToTry.forEach(pwd => {
    try {
      const match = bcrypt.compareSync(pwd, user.hash);
      if (match) {
        console.log(`  ✅ PASSWORD FOUND: '${pwd}'`);
        found = true;
      }
    } catch (e) {
      console.log(`  ❌ Invalid hash format for ${user.email}`);
    }
  });
  
  if (!found) {
    console.log('  ❌ No matching password found');
  }
  console.log('');
});

// Also create a working user with known password
console.log('🔧 Creating working super admin user...\n');
const workingPassword = 'password';
const workingHash = bcrypt.hashSync(workingPassword, 10);
console.log(`Working credentials:`);
console.log(`Email: admin@crm.com`);
console.log(`Password: ${workingPassword}`);
console.log(`Hash: ${workingHash}`);