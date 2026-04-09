const mongoose = require('mongoose');
const Book = require('./backend/models/Book');
require('dotenv').config({ path: './backend/.env' });

async function checkCategories() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/timeless-pages');
    const categories = await Book.distinct('category');
    console.log('Unique categories in DB:', categories);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkCategories();
