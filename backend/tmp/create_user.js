const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const UserSchema = new mongoose.Schema({
  email: String,
  name: String,
  password: { type: String, alias: 'passwordHash' },
  isVerified: Boolean,
  phone: String,
  age: Number
}, { collection: 'users' });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const User = mongoose.models.User || mongoose.model('User', UserSchema);
  const hashedPassword = await bcrypt.hash('password123', 10);
  await User.updateOne(
    { email: 'liveuser@example.com' },
    { $set: { 
        name: 'Live User', 
        password: hashedPassword, 
        isVerified: true, 
        phone: '1234567890', 
        age: 25 
      } 
    },
    { upsert: true }
  );
  console.log('CREATED_USER');
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
