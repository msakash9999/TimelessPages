const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const BookSchema = new mongoose.Schema({
  title: String,
  author: String,
  price: Number,
  imageUrl: String,
  category: String,
  description: String,
  featured: { type: Boolean, default: false },
  inStock: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

const Book = mongoose.model('Book', BookSchema);

const varietyBooks = [
  {
    title: "Philosophy of Life",
    author: "Various Authors",
    price: 499,
    imageUrl: "https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=500&auto=format&fit=crop",
    category: "Philosophy",
    description: "A deep dive into existence."
  },
  {
    title: "The Great Gatsby",
    author: "F. Scott Fitzgerald",
    price: 399,
    imageUrl: "https://images.unsplash.com/photo-1543004218-ee141104308a?q=80&w=500&auto=format&fit=crop",
    category: "Novels",
    description: "The classic American novel."
  },
  {
    title: "Brief History of Time",
    author: "Stephen Hawking",
    price: 599,
    imageUrl: "https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=500&auto=format&fit=crop",
    category: "Science",
    description: "Exploring the cosmos."
  },
  {
    title: "Medieval History",
    author: "Oxford Press",
    price: 799,
    imageUrl: "https://images.unsplash.com/photo-1516979187457-637abb4f9353?q=80&w=500&auto=format&fit=crop",
    category: "History",
    description: "The ages of the past."
  },
  {
    title: "Calculus Early Transcendentals",
    author: "James Stewart",
    price: 1200,
    imageUrl: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=500&auto=format&fit=crop",
    category: "Academic Books",
    description: "Master of mathematics."
  },
  {
    title: "The Ramayana",
    author: "Valmiki",
    price: 350,
    imageUrl: "https://images.unsplash.com/photo-1589718539308-111166605221?q=80&w=500&auto=format&fit=crop",
    category: "Religious Books",
    description: "The sacred epic."
  },
  {
    title: "Spider-Man Vol 1",
    author: "Stan Lee",
    price: 299,
    imageUrl: "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=500&auto=format&fit=crop",
    category: "Comics",
    description: "Amazing adventures."
  },
  {
    title: "Aesop's Fables",
    author: "Aesop",
    price: 199,
    imageUrl: "https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=500&auto=format&fit=crop",
    category: "Story Books",
    description: "Timeless moral tales."
  }
];

async function seed() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) throw new Error("MONGODB_URI not defined");

    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB...");

    // Clean up older hobbit entries that might be broken
    await Book.deleteMany({ title: "The Hobbit" });

    // Seed variety
    await Book.insertMany(varietyBooks);

    // Re-seed the Hobbit with a WORKING URL
    await Book.create({
      title: "The Hobbit",
      author: "J.R.R. Tolkien",
      price: 450,
      category: "Novels",
      imageUrl: "https://images.unsplash.com/photo-1621351123062-b9ae69a7c396?q=80&w=500&auto=format&fit=crop",
      description: "A legendary fantasy adventure."
    });

    console.log("Seeding variety complete! Added books from various categories with reliable images.");
    process.exit(0);
  } catch (err) {
    console.error("Seeding failed:", err);
    process.exit(1);
  }
}

seed();
