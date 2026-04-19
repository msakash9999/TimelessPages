const mongoose = require("mongoose");
const Book = require("./models/Book");
require("dotenv").config();

const scienceBooks = [
  {
    title: "A Brief History of Time",
    author: "Stephen Hawking",
    price: 399,
    imageUrl: "https://covers.openlibrary.org/b/isbn/9780140137426-M.jpg",
    category: "science",
    description: "Classic exploration of the origin and nature of the universe."
  },
  {
    title: "The Selfish Gene",
    author: "Richard Dawkins",
    price: 349,
    imageUrl: "https://covers.openlibrary.org/b/isbn/9780199291151-M.jpg",
    category: "science",
    description: "Foundation of modern evolutionary biology."
  },
  {
    title: "Cosmos",
    author: "Carl Sagan",
    price: 499,
    imageUrl: "https://covers.openlibrary.org/b/isbn/9780345331359-M.jpg",
    category: "science",
    description: "The masterpiece of space and time exploration."
  },
  {
    title: "Sapiens: A Brief History of Humankind",
    author: "Yuval Noah Harari",
    price: 449,
    imageUrl: "https://covers.openlibrary.org/b/isbn/9780062316097-M.jpg",
    category: "science",
    description: "Tracing human history from the Stone Age to the modern era."
  },
  {
    title: "The Immortal Life of Henrietta Lacks",
    author: "Rebecca Skloot",
    price: 299,
    imageUrl: "https://covers.openlibrary.org/b/isbn/9781400052189-M.jpg",
    category: "science",
    description: "The true story of the HeLa cells that changed science."
  },
  {
    title: "Thinking, Fast and Slow",
    author: "Daniel Kahneman",
    price: 459,
    imageUrl: "https://covers.openlibrary.org/b/isbn/9780374275631-M.jpg",
    category: "science",
    description: "Deep dive into the dual systems that drive how we think."
  },
  {
    title: "The Gene: An Intimate History",
    author: "Siddhartha Mukherjee",
    price: 429,
    imageUrl: "https://covers.openlibrary.org/b/isbn/9781476733500-M.jpg",
    category: "science",
    description: "Comprehensive history of the master blueprint of life."
  },
  {
    title: "Astrophysics for People in a Hurry",
    author: "Neil deGrasse Tyson",
    price: 279,
    imageUrl: "https://covers.openlibrary.org/b/isbn/9780393609394-M.jpg",
    category: "science",
    description: "Essential cosmic wisdom delivered in short segments."
  },
  {
    title: "Silent Spring",
    author: "Rachel Carson",
    price: 319,
    imageUrl: "https://covers.openlibrary.org/b/isbn/9780618249060-M.jpg",
    category: "science",
    description: "The book that launched the environmental movement."
  },
  {
    title: "The Double Helix",
    author: "James Watson",
    price: 289,
    imageUrl: "https://covers.openlibrary.org/b/isbn/9780743231626-L.jpg",
    category: "science",
    description: "Historical account of the discovery of DNA's structure."
  },
  {
    title: "The Structure of Scientific Revolutions",
    author: "Thomas Kuhn",
    price: 359,
    imageUrl: "https://covers.openlibrary.org/b/isbn/9780226458120-M.jpg",
    category: "science",
    description: "Challenging the concept of linear scientific progress."
  },
  {
    title: "Wonderful Life",
    author: "Stephen Jay Gould",
    price: 339,
    imageUrl: "https://covers.openlibrary.org/b/isbn/9780393307008-M.jpg",
    category: "science",
    description: "The Burgess Shale and the nature of history."
  },
  {
    title: "Guns, Germs, and Steel",
    author: "Jared Diamond",
    price: 419,
    imageUrl: "https://covers.openlibrary.org/b/isbn/9780393038910-M.jpg",
    category: "science",
    description: "Explaining why some societies progressed faster than others."
  },
  {
    title: "The Man Who Mistook His Wife for a Hat",
    author: "Oliver Sacks",
    price: 309,
    imageUrl: "https://covers.openlibrary.org/b/isbn/9780684853949-M.jpg",
    category: "science",
    description: "Classic clinical tales of neurological disorders."
  },
  {
    title: "The Elegant Universe",
    author: "Brian Greene",
    price: 439,
    imageUrl: "https://covers.openlibrary.org/b/isbn/9780375708114-M.jpg",
    category: "science",
    description: "Superstrings, hidden dimensions, and the quest for the ultimate theory."
  },
  {
    title: "The Sixth Extinction",
    author: "Elizabeth Kolbert",
    price: 369,
    imageUrl: "https://covers.openlibrary.org/b/isbn/9780805092998-M.jpg",
    category: "science",
    description: "Modern mass extinction caused by human impact."
  },
  {
    title: "When Breath Becomes Air",
    author: "Paul Kalanithi",
    price: 299,
    imageUrl: "https://covers.openlibrary.org/b/isbn/9780812988406-M.jpg",
    category: "science",
    description: "Profound memoir on life, death, and mortality."
  },
  {
    title: "Being Mortal",
    author: "Atul Gawande",
    price: 329,
    imageUrl: "https://covers.openlibrary.org/b/isbn/9780805095159-M.jpg",
    category: "science",
    description: "Medicine and what matters in the end."
  },
  {
    title: "Lab Girl",
    author: "Hope Jahren",
    price: 349,
    imageUrl: "https://covers.openlibrary.org/b/isbn/9781101874271-M.jpg",
    category: "science",
    description: "Memoir of plants, dirt, and one scientist's journey."
  },
  {
    title: "I Contain Multitudes",
    author: "Ed Yong",
    price: 379,
    imageUrl: "https://covers.openlibrary.org/b/isbn/9780062368591-M.jpg",
    category: "science",
    description: "Exploring the microbes within us and around us."
  },
  {
    title: "Spillover: Animal Infections",
    author: "David Quammen",
    price: 409,
    imageUrl: "https://covers.openlibrary.org/b/isbn/9780393066807-M.jpg",
    category: "science",
    description: "Tracking the next human pandemic from animal diseases."
  },
  {
    title: "The Order of Time",
    author: "Carlo Rovelli",
    price: 259,
    imageUrl: "https://covers.openlibrary.org/b/isbn/9780735216105-M.jpg",
    category: "science",
    description: "Poetic exploration of physics and the nature of time."
  },
  {
    title: "Seven Brief Lessons on Physics",
    author: "Carlo Rovelli",
    price: 199,
    imageUrl: "https://covers.openlibrary.org/b/isbn/9780399184413-M.jpg",
    category: "science",
    description: "Concise intro to relativity and quantum mechanics."
  },
  {
    title: "Entangled Life",
    author: "Merlin Sheldrake",
    price: 389,
    imageUrl: "https://covers.openlibrary.org/b/isbn/9780525510314-M.jpg",
    category: "science",
    description: "How fungi make our worlds, change our minds and shape our futures."
  },
  {
    title: "The Greatest Show on Earth",
    author: "Richard Dawkins",
    price: 379,
    imageUrl: "https://covers.openlibrary.org/b/isbn/9781416594789-M.jpg",
    category: "science",
    description: "The undeniable evidence for evolution."
  },
  {
    title: "Why We Sleep",
    author: "Matthew Walker",
    price: 359,
    imageUrl: "https://covers.openlibrary.org/b/isbn/9781501144318-M.jpg",
    category: "science",
    description: "Unlocking the power of sleep and dreams."
  },
  {
    title: "The Extended Phenotype",
    author: "Richard Dawkins",
    price: 369,
    imageUrl: "https://covers.openlibrary.org/b/isbn/9780192860880-M.jpg",
    category: "science",
    description: "The long reach of the gene beyond its physical body."
  },
  {
    title: "Phantoms in the Brain",
    author: "V.S. Ramachandran",
    price: 319,
    imageUrl: "https://covers.openlibrary.org/b/isbn/9780688172176-M.jpg",
    category: "science",
    description: "Probing mysteries of human nature through brain science."
  },
  {
    title: "Gödel, Escher, Bach",
    author: "Douglas Hofstadter",
    price: 549,
    imageUrl: "https://covers.openlibrary.org/b/isbn/9780465026562-M.jpg",
    category: "science",
    description: "Golden braid logic and computer science masterpiece."
  },
  {
    title: "The Lives of a Cell",
    author: "Lewis Thomas",
    price: 249,
    imageUrl: "https://covers.openlibrary.org/b/isbn/9780140047431-M.jpg",
    category: "science",
    description: "Notes of a biology watcher on the interconnected world."
  }
];

async function seedScience() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected for seeding...");

    // Batch insertion (ignore if exists by checking title)
    for (const book of scienceBooks) {
      await Book.findOneAndUpdate(
        { title: book.title, author: book.author },
        { ...book },
        { upsert: true, returnDocument: 'after' }
      );
    }

    console.log("30 Science books seeded successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Seeding failed:", err);
    process.exit(1);
  }
}

seedScience();
