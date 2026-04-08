const mongoose = require('mongoose');
require('dotenv').config();
const Book = require('./models/Book');

const categoryPricing = {
    'story': { min: 79, max: 149 },
    'novels': { min: 99, max: 179 },
    'philosophy': { min: 129, max: 219 },
    'religious': { min: 99, max: 189 },
    'comics': { min: 129, max: 249 },
    'science': { min: 149, max: 299 },
    'history': { min: 119, max: 229 },
    'academic': { min: 199, max: 349 }
};

mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        const books = await Book.find({});
        console.log(`Fixing ${books.length} books...`);
        
        for (let book of books) {
            const range = categoryPricing[book.category] || { min: 99, max: 199 };
            // Simple logic: reset to a "suitable" price if it's currently 8377 or anomalous
            if (book.price === 8377 || book.price > 1000) {
                const newPrice = Math.floor(Math.random() * (range.max - range.min + 1) + range.min);
                book.price = newPrice;
                await book.save();
                console.log(`Updated "${book.title}" [${book.category}] price to ₹${newPrice}`);
            }
        }
        
        console.log("Database price fix complete.");
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
