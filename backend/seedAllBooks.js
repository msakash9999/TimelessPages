require("dotenv").config();
const mongoose = require("mongoose");
const Book = require("./models/Book");

const allBooks = [
  // ── Novels ────────────────────────────────────────────────────────────
  { title: "War and Peace",                  author: "Leo Tolstoy",           price: 399, category: "novels",     imageUrl: "https://covers.openlibrary.org/b/isbn/9780140447934-M.jpg",  description: "Literary Classic", featured: true },
  { title: "Jane Eyre",                      author: "Charlotte Bronte",       price: 239, category: "novels",     imageUrl: "https://covers.openlibrary.org/b/isbn/9780141441146-M.jpg",  description: "Classic Novel" },
  { title: "Crime and Punishment",           author: "Fyodor Dostoevsky",      price: 269, category: "novels",     imageUrl: "https://covers.openlibrary.org/b/isbn/9780143058144-M.jpg",  description: "Russian Classic" },
  { title: "Wuthering Heights",              author: "Emily Bronte",           price: 219, category: "novels",     imageUrl: "https://covers.openlibrary.org/b/isbn/9780141439556-M.jpg",  description: "Victorian Novel" },
  { title: "Anna Karenina",                  author: "Leo Tolstoy",           price: 289, category: "novels",     imageUrl: "https://covers.openlibrary.org/b/isbn/9780143035008-M.jpg",  description: "Russian Classic" },
  { title: "Don Quixote",                    author: "Miguel de Cervantes",    price: 299, category: "novels",     imageUrl: "https://covers.openlibrary.org/b/isbn/9780060934347-M.jpg",  description: "Spanish Classic" },
  { title: "Les Miserables",                 author: "Victor Hugo",           price: 329, category: "novels",     imageUrl: "https://covers.openlibrary.org/b/isbn/9780451419439-M.jpg",  description: "French Classic" },
  { title: "The Count of Monte Cristo",      author: "Alexandre Dumas",        price: 279, category: "novels",     imageUrl: "https://covers.openlibrary.org/b/isbn/9780140449266-M.jpg",  description: "Adventure Classic" },
  { title: "The Adventures of Huckleberry Finn", author: "Mark Twain",        price: 209, category: "novels",     imageUrl: "https://covers.openlibrary.org/b/isbn/9780142437179-M.jpg",  description: "American Classic" },
  { title: "To Kill a Mockingbird",          author: "Harper Lee",            price: 249, category: "novels",     imageUrl: "https://covers.openlibrary.org/b/isbn/9780061120084-M.jpg",  description: "American Classic" },
  { title: "Gone with the Wind",             author: "Margaret Mitchell",      price: 319, category: "novels",     imageUrl: "https://covers.openlibrary.org/b/isbn/9781451635621-M.jpg",  description: "Historical Novel" },
  { title: "Rebecca",                        author: "Daphne du Maurier",      price: 229, category: "novels",     imageUrl: "https://covers.openlibrary.org/b/isbn/9780380730407-M.jpg",  description: "Gothic Novel" },
  { title: "The Catcher in the Rye",         author: "J. D. Salinger",        price: 199, category: "novels",     imageUrl: "https://covers.openlibrary.org/b/isbn/9780316769488-M.jpg",  description: "Coming of Age" },
  { title: "1984",                           author: "George Orwell",          price: 189, category: "novels",     imageUrl: "https://covers.openlibrary.org/b/isbn/9780451524935-M.jpg",  description: "Dystopian Classic", featured: true },
  { title: "Brave New World",                author: "Aldous Huxley",         price: 199, category: "novels",     imageUrl: "https://covers.openlibrary.org/b/isbn/9780060850524-M.jpg",  description: "Dystopian Novel" },
  { title: "Ulysses",                        author: "James Joyce",           price: 339, category: "novels",     imageUrl: "https://covers.openlibrary.org/b/isbn/9780199535675-M.jpg",  description: "Modernist Novel" },
  { title: "Pride and Prejudice",            author: "Jane Austen",           price: 199, category: "novels",     imageUrl: "https://covers.openlibrary.org/b/isbn/9780141439518-M.jpg",  description: "Romance Classic", featured: true },
  { title: "Great Expectations",             author: "Charles Dickens",        price: 219, category: "novels",     imageUrl: "https://covers.openlibrary.org/b/isbn/9780141439563-M.jpg",  description: "Victorian Classic" },
  { title: "Moby Dick",                      author: "Herman Melville",        price: 259, category: "novels",     imageUrl: "https://covers.openlibrary.org/b/isbn/9780142437247-M.jpg",  description: "American Classic" },
  { title: "The Brothers Karamazov",         author: "Fyodor Dostoevsky",      price: 309, category: "novels",     imageUrl: "https://covers.openlibrary.org/b/isbn/9780374528379-M.jpg",  description: "Russian Classic" },

  // ── Story Books ───────────────────────────────────────────────────────
  { title: "The Alchemist",                  author: "Paulo Coelho",           price: 199, category: "story",      imageUrl: "https://covers.openlibrary.org/b/isbn/9780062315007-M.jpg",  description: "Inspirational Story", featured: true },
  { title: "The Little Prince",              author: "Antoine de Saint-Exupery",price: 149, category: "story",    imageUrl: "https://covers.openlibrary.org/b/isbn/9780156012195-M.jpg",  description: "Beloved Classic" },
  { title: "The Old Man and the Sea",        author: "Ernest Hemingway",       price: 179, category: "story",      imageUrl: "https://covers.openlibrary.org/b/isbn/9780684801223-M.jpg",  description: "Nobel Prize Story" },
  { title: "Animal Farm",                    author: "George Orwell",          price: 149, category: "story",      imageUrl: "https://covers.openlibrary.org/b/isbn/9780451526342-M.jpg",  description: "Political Allegory" },
  { title: "Of Mice and Men",                author: "John Steinbeck",         price: 159, category: "story",      imageUrl: "https://covers.openlibrary.org/b/isbn/9780140177398-M.jpg",  description: "American Classic" },
  { title: "The Pearl",                      author: "John Steinbeck",         price: 139, category: "story",      imageUrl: "https://covers.openlibrary.org/b/isbn/9780140177374-M.jpg",  description: "Short Novel" },
  { title: "A Farewell to Arms",             author: "Ernest Hemingway",       price: 189, category: "story",      imageUrl: "https://covers.openlibrary.org/b/isbn/9780684801469-M.jpg",  description: "War Story" },
  { title: "The Sun Also Rises",             author: "Ernest Hemingway",       price: 179, category: "story",      imageUrl: "https://covers.openlibrary.org/b/isbn/9780743297332-M.jpg",  description: "Lost Generation" },
  { title: "Siddhartha",                     author: "Hermann Hesse",          price: 169, category: "story",      imageUrl: "https://covers.openlibrary.org/b/isbn/9780553208849-M.jpg",  description: "Spiritual Journey" },
  { title: "The Stranger",                   author: "Albert Camus",           price: 159, category: "story",      imageUrl: "https://covers.openlibrary.org/b/isbn/9780679720201-M.jpg",  description: "Existentialist Classic" },
  { title: "The Metamorphosis",              author: "Franz Kafka",            price: 129, category: "story",      imageUrl: "https://covers.openlibrary.org/b/isbn/9780553213690-M.jpg",  description: "Surrealist Classic" },
  { title: "Lord of the Flies",              author: "William Golding",        price: 169, category: "story",      imageUrl: "https://covers.openlibrary.org/b/isbn/9780399501487-M.jpg",  description: "Survival Story" },
  { title: "The Great Gatsby",               author: "F. Scott Fitzgerald",    price: 179, category: "story",      imageUrl: "https://covers.openlibrary.org/b/isbn/9780743273565-M.jpg",  description: "Jazz Age Classic" },
  { title: "Heart of Darkness",              author: "Joseph Conrad",          price: 149, category: "story",      imageUrl: "https://covers.openlibrary.org/b/isbn/9780141441672-M.jpg",  description: "Colonial Classic" },
  { title: "The Road",                       author: "Cormac McCarthy",        price: 199, category: "story",      imageUrl: "https://covers.openlibrary.org/b/isbn/9780307387899-M.jpg",  description: "Post-Apocalyptic" },
  { title: "Slaughterhouse-Five",            author: "Kurt Vonnegut",          price: 179, category: "story",      imageUrl: "https://covers.openlibrary.org/b/isbn/9780385333849-M.jpg",  description: "Anti-War Novel" },
  { title: "The Kite Runner",                author: "Khaled Hosseini",        price: 219, category: "story",      imageUrl: "https://covers.openlibrary.org/b/isbn/9781594631931-M.jpg",  description: "Modern Fiction" },
  { title: "A Thousand Splendid Suns",       author: "Khaled Hosseini",        price: 229, category: "story",      imageUrl: "https://covers.openlibrary.org/b/isbn/9781594483073-M.jpg",  description: "Modern Fiction" },
  { title: "Life of Pi",                     author: "Yann Martel",            price: 209, category: "story",      imageUrl: "https://covers.openlibrary.org/b/isbn/9780156027328-M.jpg",  description: "Adventure Story" },
  { title: "The Book Thief",                 author: "Markus Zusak",           price: 219, category: "story",      imageUrl: "https://covers.openlibrary.org/b/isbn/9780375842207-M.jpg",  description: "WWII Fiction" },

  // ── Philosophy ────────────────────────────────────────────────────────
  { title: "Meditations",                    author: "Marcus Aurelius",        price: 179, category: "philosophy",  imageUrl: "https://covers.openlibrary.org/b/isbn/9780812968255-M.jpg",  description: "Stoic Philosophy", featured: true },
  { title: "The Republic",                   author: "Plato",                  price: 199, category: "philosophy",  imageUrl: "https://covers.openlibrary.org/b/isbn/9780872201361-M.jpg",  description: "Ancient Philosophy" },
  { title: "Nicomachean Ethics",             author: "Aristotle",              price: 219, category: "philosophy",  imageUrl: "https://covers.openlibrary.org/b/isbn/9780140449495-M.jpg",  description: "Greek Philosophy" },
  { title: "Beyond Good and Evil",           author: "Friedrich Nietzsche",    price: 189, category: "philosophy",  imageUrl: "https://covers.openlibrary.org/b/isbn/9780679724650-M.jpg",  description: "Nietzsche Classic" },
  { title: "Thus Spoke Zarathustra",         author: "Friedrich Nietzsche",    price: 199, category: "philosophy",  imageUrl: "https://covers.openlibrary.org/b/isbn/9780140441185-M.jpg",  description: "Nietzsche Classic" },
  { title: "Critique of Pure Reason",        author: "Immanuel Kant",          price: 249, category: "philosophy",  imageUrl: "https://covers.openlibrary.org/b/isbn/9780521657297-M.jpg",  description: "German Idealism" },
  { title: "Being and Time",                 author: "Martin Heidegger",       price: 279, category: "philosophy",  imageUrl: "https://covers.openlibrary.org/b/isbn/9780061575594-M.jpg",  description: "Existentialism" },
  { title: "The Phenomenology of Spirit",    author: "Georg W. F. Hegel",      price: 259, category: "philosophy",  imageUrl: "https://covers.openlibrary.org/b/isbn/9780198245971-M.jpg",  description: "German Idealism" },
  { title: "Discourse on Method",            author: "Rene Descartes",         price: 149, category: "philosophy",  imageUrl: "https://covers.openlibrary.org/b/isbn/9780140442069-M.jpg",  description: "Rationalism" },
  { title: "The Social Contract",            author: "Jean-Jacques Rousseau",  price: 169, category: "philosophy",  imageUrl: "https://covers.openlibrary.org/b/isbn/9780140442014-M.jpg",  description: "Political Philosophy" },
  { title: "Leviathan",                      author: "Thomas Hobbes",          price: 189, category: "philosophy",  imageUrl: "https://covers.openlibrary.org/b/isbn/9780140431957-M.jpg",  description: "Political Philosophy" },
  { title: "An Enquiry Concerning Human Understanding", author: "David Hume", price: 179, category: "philosophy",  imageUrl: "https://covers.openlibrary.org/b/isbn/9780199549900-M.jpg",  description: "Empiricism" },
  { title: "The Myth of Sisyphus",           author: "Albert Camus",           price: 159, category: "philosophy",  imageUrl: "https://covers.openlibrary.org/b/isbn/9780679733737-M.jpg",  description: "Absurdism" },
  { title: "Existentialism is a Humanism",   author: "Jean-Paul Sartre",       price: 149, category: "philosophy",  imageUrl: "https://covers.openlibrary.org/b/isbn/9780300115468-M.jpg",  description: "Existentialism" },
  { title: "The Philosophy of Freedom",      author: "Rudolf Steiner",         price: 199, category: "philosophy",  imageUrl: "https://covers.openlibrary.org/b/isbn/9781621481126-M.jpg",  description: "Anthroposophy" },
  { title: "Tao Te Ching",                   author: "Lao Tzu",                price: 139, category: "philosophy",  imageUrl: "https://covers.openlibrary.org/b/isbn/9780060812454-M.jpg",  description: "Taoist Classic" },
  { title: "The Art of War",                 author: "Sun Tzu",                price: 129, category: "philosophy",  imageUrl: "https://covers.openlibrary.org/b/isbn/9781590302255-M.jpg",  description: "Strategy Classic" },
  { title: "Man and His Symbols",            author: "Carl Jung",              price: 209, category: "philosophy",  imageUrl: "https://covers.openlibrary.org/b/isbn/9780440351832-M.jpg",  description: "Analytical Psychology" },
  { title: "The Consolation of Philosophy",  author: "Boethius",               price: 149, category: "philosophy",  imageUrl: "https://covers.openlibrary.org/b/isbn/9780140447804-M.jpg",  description: "Medieval Philosophy" },
  { title: "On Liberty",                     author: "John Stuart Mill",       price: 159, category: "philosophy",  imageUrl: "https://covers.openlibrary.org/b/isbn/9780140432077-M.jpg",  description: "Liberal Philosophy" },

  // ── Science ───────────────────────────────────────────────────────────
  { title: "Origin of Species",              author: "Charles Darwin",         price: 349, category: "science",     imageUrl: "https://covers.openlibrary.org/b/isbn/9780140432053-M.jpg",  description: "Evolution Classic", featured: true },
  { title: "The Blind Watchmaker",           author: "Richard Dawkins",        price: 329, category: "science",     imageUrl: "https://covers.openlibrary.org/b/isbn/9780393315707-M.jpg",  description: "Popular Science", featured: true },
  { title: "A Brief History of Time",        author: "Stephen Hawking",        price: 299, category: "science",     imageUrl: "https://covers.openlibrary.org/b/isbn/9780553380163-M.jpg",  description: "Cosmology", featured: true },

  // ── Religious ─────────────────────────────────────────────────────────
  { title: "Bhagavad Gita",                  author: "Vyasa",                  price: 149, category: "religious",   imageUrl: "https://covers.openlibrary.org/b/isbn/9780451528834-M.jpg",  description: "Hindu Scripture" },
  { title: "The Bible",                      author: "Various",                price: 199, category: "religious",   imageUrl: "https://covers.openlibrary.org/b/isbn/9780198283935-M.jpg",  description: "Christian Scripture" },
  { title: "The Quran",                      author: "Various",                price: 179, category: "religious",   imageUrl: "https://covers.openlibrary.org/b/isbn/9780199535958-M.jpg",  description: "Islamic Scripture" },
  { title: "Dhammapada",                     author: "Gautama Buddha",         price: 129, category: "religious",   imageUrl: "https://covers.openlibrary.org/b/isbn/9780195156225-M.jpg",  description: "Buddhist Teachings" },
  { title: "The Upanishads",                 author: "Various",                price: 169, category: "religious",   imageUrl: "https://covers.openlibrary.org/b/isbn/9780140441635-M.jpg",  description: "Vedic Wisdom" },
  { title: "Guru Granth Sahib",              author: "Sikh Gurus",             price: 249, category: "religious",   imageUrl: "https://covers.openlibrary.org/b/isbn/9788172052249-M.jpg",  description: "Sikh Scripture" },
  { title: "The Analects",                   author: "Confucius",              price: 159, category: "religious",   imageUrl: "https://covers.openlibrary.org/b/isbn/9780140443486-M.jpg",  description: "Confucian Teachings" },
  { title: "I Ching",                        author: "Various",                price: 179, category: "religious",   imageUrl: "https://covers.openlibrary.org/b/isbn/9780691099705-M.jpg",  description: "Chinese Classic" },
  { title: "Ramayana",                       author: "Valmiki",                price: 199, category: "religious",   imageUrl: "https://covers.openlibrary.org/b/isbn/9780140446814-M.jpg",  description: "Hindu Epic" },
  { title: "Mahabharata",                    author: "Vyasa",                  price: 299, category: "religious",   imageUrl: "https://covers.openlibrary.org/b/isbn/9780226846538-M.jpg",  description: "Hindu Epic" },
  { title: "The Talmud",                     author: "Various Rabbis",         price: 279, category: "religious",   imageUrl: "https://covers.openlibrary.org/b/isbn/9780826492210-M.jpg",  description: "Jewish Law" },
  { title: "The Divine Comedy",              author: "Dante Alighieri",        price: 229, category: "religious",   imageUrl: "https://covers.openlibrary.org/b/isbn/9780142437223-M.jpg",  description: "Medieval Epic" },
  { title: "Confessions",                    author: "Saint Augustine",        price: 169, category: "religious",   imageUrl: "https://covers.openlibrary.org/b/isbn/9780199537822-M.jpg",  description: "Christian Classic" },
  { title: "The Cloud of Unknowing",         author: "Anonymous",              price: 149, category: "religious",   imageUrl: "https://covers.openlibrary.org/b/isbn/9780060649784-M.jpg",  description: "Christian Mysticism" },
  { title: "The Yoga Sutras of Patanjali",   author: "Patanjali",              price: 159, category: "religious",   imageUrl: "https://covers.openlibrary.org/b/isbn/9780910261029-M.jpg",  description: "Yoga Philosophy" },
  { title: "Zhuangzi",                       author: "Zhuang Zhou",            price: 169, category: "religious",   imageUrl: "https://covers.openlibrary.org/b/isbn/9780231105972-M.jpg",  description: "Taoist Classic" },
  { title: "The Gospel of Thomas",           author: "Various",                price: 129, category: "religious",   imageUrl: "https://covers.openlibrary.org/b/isbn/9780062515650-M.jpg",  description: "Gnostic Gospel" },
  { title: "Rig Veda",                       author: "Various",                price: 219, category: "religious",   imageUrl: "https://covers.openlibrary.org/b/isbn/9780140449891-M.jpg",  description: "Vedic Hymns" },
  { title: "The Sufi Path of Love",          author: "Rumi",                   price: 189, category: "religious",   imageUrl: "https://covers.openlibrary.org/b/isbn/9780791410097-M.jpg",  description: "Sufi Mysticism" },
  { title: "Ashtavakra Gita",                author: "Ashtavakra",             price: 149, category: "religious",   imageUrl: "https://covers.openlibrary.org/b/isbn/9788120818521-M.jpg",  description: "Advaita Vedanta" },

  // ── Comics ────────────────────────────────────────────────────────────
  { title: "Watchmen",                       author: "Alan Moore",             price: 299, category: "comics",      imageUrl: "https://covers.openlibrary.org/b/isbn/9780930289232-M.jpg",  description: "Superhero Classic", featured: true },
  { title: "Maus",                           author: "Art Spiegelman",         price: 279, category: "comics",      imageUrl: "https://covers.openlibrary.org/b/isbn/9780679748403-M.jpg",  description: "WWII Graphic Novel" },
  { title: "The Dark Knight Returns",        author: "Frank Miller",           price: 299, category: "comics",      imageUrl: "https://covers.openlibrary.org/b/isbn/9781563893421-M.jpg",  description: "Batman Classic" },
  { title: "Persepolis",                     author: "Marjane Satrapi",        price: 249, category: "comics",      imageUrl: "https://covers.openlibrary.org/b/isbn/9780375422300-M.jpg",  description: "Autobiographical" },
  { title: "V for Vendetta",                 author: "Alan Moore",             price: 269, category: "comics",      imageUrl: "https://covers.openlibrary.org/b/isbn/9781401208417-M.jpg",  description: "Dystopian Comic" },
  { title: "Sandman Vol. 1",                 author: "Neil Gaiman",            price: 289, category: "comics",      imageUrl: "https://covers.openlibrary.org/b/isbn/9781401284770-M.jpg",  description: "Fantasy Comic" },
  { title: "Bone",                           author: "Jeff Smith",             price: 249, category: "comics",      imageUrl: "https://covers.openlibrary.org/b/isbn/9780439706407-M.jpg",  description: "All-Ages Comic" },
  { title: "Sin City",                       author: "Frank Miller",           price: 259, category: "comics",      imageUrl: "https://covers.openlibrary.org/b/isbn/9781593074920-M.jpg",  description: "Noir Comic" },
  { title: "From Hell",                      author: "Alan Moore",             price: 349, category: "comics",      imageUrl: "https://covers.openlibrary.org/b/isbn/9781603090148-M.jpg",  description: "Historical Horror" },
  { title: "X-Men: Days of Future Past",     author: "Chris Claremont",        price: 229, category: "comics",      imageUrl: "https://covers.openlibrary.org/b/isbn/9780785188216-M.jpg",  description: "Marvel Classic" },
  { title: "Batman: Year One",               author: "Frank Miller",           price: 219, category: "comics",      imageUrl: "https://covers.openlibrary.org/b/isbn/9781401207526-M.jpg",  description: "Batman Origin" },
  { title: "Asterix and the Golden Sickle",  author: "Goscinny & Uderzo",      price: 179, category: "comics",      imageUrl: "https://covers.openlibrary.org/b/isbn/9780752866321-M.jpg",  description: "Comedy Classic" },
  { title: "Tintin in Tibet",                author: "Herge",                  price: 199, category: "comics",      imageUrl: "https://covers.openlibrary.org/b/isbn/9780316359276-M.jpg",  description: "Adventure Classic" },
  { title: "Saga Vol. 1",                    author: "Brian K. Vaughan",       price: 239, category: "comics",      imageUrl: "https://covers.openlibrary.org/b/isbn/9781607066019-M.jpg",  description: "Sci-Fi Epic" },
  { title: "The Walking Dead Vol. 1",        author: "Robert Kirkman",         price: 219, category: "comics",      imageUrl: "https://covers.openlibrary.org/b/isbn/9781582406725-M.jpg",  description: "Zombie Horror" },
  { title: "Hellboy Vol. 1",                 author: "Mike Mignola",           price: 229, category: "comics",      imageUrl: "https://covers.openlibrary.org/b/isbn/9781593070946-M.jpg",  description: "Dark Fantasy" },
  { title: "Superman: Red Son",              author: "Mark Millar",            price: 229, category: "comics",      imageUrl: "https://covers.openlibrary.org/b/isbn/9781779524034-M.jpg",  description: "Elseworlds Story" },
  { title: "Kingdom Come",                   author: "Mark Waid",              price: 239, category: "comics",      imageUrl: "https://covers.openlibrary.org/b/isbn/9781563893322-M.jpg",  description: "DC Classic" },
  { title: "Preacher Vol. 1",                author: "Garth Ennis",            price: 249, category: "comics",      imageUrl: "https://covers.openlibrary.org/b/isbn/9781401240455-M.jpg",  description: "Mature Comic" },
  { title: "Y: The Last Man Vol. 1",         author: "Brian K. Vaughan",       price: 219, category: "comics",      imageUrl: "https://covers.openlibrary.org/b/isbn/9781401200220-M.jpg",  description: "Post-Apocalyptic" },

  // ── History ───────────────────────────────────────────────────────────
  { title: "Sapiens",                        author: "Yuval Noah Harari",      price: 399, category: "history",     imageUrl: "https://covers.openlibrary.org/b/isbn/9780062316110-M.jpg",  description: "Human History", featured: true },
  { title: "The Histories",                  author: "Herodotus",              price: 229, category: "history",     imageUrl: "https://covers.openlibrary.org/b/isbn/9780140449082-M.jpg",  description: "Ancient History" },
  { title: "The Art of War",                 author: "Sun Tzu",                price: 149, category: "history",     imageUrl: "https://covers.openlibrary.org/b/isbn/9780195014761-M.jpg",  description: "Military Strategy" },
  { title: "Guns, Germs and Steel",          author: "Jared Diamond",          price: 349, category: "history",     imageUrl: "https://covers.openlibrary.org/b/isbn/9780393317552-M.jpg",  description: "World History" },
  { title: "The Rise and Fall of the Third Reich", author: "William Shirer",   price: 499, category: "history",     imageUrl: "https://covers.openlibrary.org/b/isbn/9781451651683-M.jpg",  description: "WWII History" },
  { title: "A People's History of the United States", author: "Howard Zinn",   price: 399, category: "history",     imageUrl: "https://covers.openlibrary.org/b/isbn/9780062397348-M.jpg",  description: "American History" },
  { title: "The Second World War",           author: "Winston Churchill",       price: 549, category: "history",     imageUrl: "https://covers.openlibrary.org/b/isbn/9780395416853-M.jpg",  description: "Churchill Memoirs" },
  { title: "The Diary of a Young Girl",      author: "Anne Frank",             price: 199, category: "history",     imageUrl: "https://covers.openlibrary.org/b/isbn/9780553296983-M.jpg",  description: "Holocaust Memoir" },
  { title: "1776",                           author: "David McCullough",        price: 299, category: "history",     imageUrl: "https://covers.openlibrary.org/b/isbn/9780743226721-M.jpg",  description: "American Revolution" },
  { title: "The Silk Roads",                 author: "Peter Frankopan",        price: 349, category: "history",     imageUrl: "https://covers.openlibrary.org/b/isbn/9781101912379-M.jpg",  description: "World History" },
  { title: "SPQR: A History of Ancient Rome",author: "Mary Beard",             price: 329, category: "history",     imageUrl: "https://covers.openlibrary.org/b/isbn/9781631492228-M.jpg",  description: "Roman History" },
  { title: "The Conquest of Mexico",         author: "William Prescott",       price: 279, category: "history",     imageUrl: "https://covers.openlibrary.org/b/isbn/9780307946591-M.jpg",  description: "Latin American History" },
  { title: "The Penguin History of the World",author: "J. M. Roberts",         price: 449, category: "history",     imageUrl: "https://covers.openlibrary.org/b/isbn/9780141975093-M.jpg",  description: "World History" },
  { title: "Medieval Europe",                author: "Chris Wickham",           price: 299, category: "history",     imageUrl: "https://covers.openlibrary.org/b/isbn/9780300208986-M.jpg",  description: "Medieval History" },
  { title: "The Cold War",                   author: "John Lewis Gaddis",       price: 279, category: "history",     imageUrl: "https://covers.openlibrary.org/b/isbn/9780143038276-M.jpg",  description: "Modern History" },
  { title: "Empire",                         author: "Niall Ferguson",          price: 329, category: "history",     imageUrl: "https://covers.openlibrary.org/b/isbn/9780465023295-M.jpg",  description: "British Empire" },
  { title: "The Story of India",             author: "Michael Wood",            price: 299, category: "history",     imageUrl: "https://covers.openlibrary.org/b/isbn/9781845131036-M.jpg",  description: "Indian History" },
  { title: "India After Gandhi",             author: "Ramachandra Guha",        price: 449, category: "history",     imageUrl: "https://covers.openlibrary.org/b/isbn/9780060958589-M.jpg",  description: "Modern India" },
  { title: "The Fall of Rome",               author: "Bryan Ward-Perkins",      price: 249, category: "history",     imageUrl: "https://covers.openlibrary.org/b/isbn/9780192807281-M.jpg",  description: "Roman History" },
  { title: "The Ottoman Empire",             author: "Halil Inalcik",           price: 349, category: "history",     imageUrl: "https://covers.openlibrary.org/b/isbn/9780297834656-M.jpg",  description: "Ottoman History" },
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB");

  // Clear all existing books first
  await Book.deleteMany({});
  console.log("Cleared existing books");

  // Insert all books
  const inserted = await Book.insertMany(allBooks);
  console.log(`Inserted ${inserted.length} books`);

  // Show summary per category
  const cats = {};
  allBooks.forEach(b => { cats[b.category] = (cats[b.category] || 0) + 1; });
  console.log("Books per category:", cats);

  await mongoose.disconnect();
  console.log("Done!");
}

seed().catch(err => { console.error(err); process.exit(1); });
