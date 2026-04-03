const books = document.querySelectorAll('.book-card');
const nextBtn = document.getElementById('nextBtn');
const prevBtn = document.getElementById('prevBtn');
let currentIndex = 0;

function showBook(index) {
    // Remove active class from all
    books.forEach(book => book.classList.remove('active'));
    
    // Add to current
    books[index].classList.add('active');
}

nextBtn.addEventListener('click', () => {
    currentIndex = (currentIndex + 1) % books.length; // Loop back to start
    showBook(currentIndex);
});

prevBtn.addEventListener('click', () => {
    currentIndex = (currentIndex - 1 + books.length) % books.length; // Loop to end
    showBook(currentIndex);
});

document.querySelector('a[href="#"]').addEventListener('click', function(e) {
    e.preventDefault();
    document.getElementById('homeGallery').scrollIntoView({ 
        behavior: 'smooth' 
    });
});