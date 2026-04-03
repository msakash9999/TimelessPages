const books = document.querySelectorAll('.book-card');
const nextBtn = document.getElementById('nextBtn');
const prevBtn = document.getElementById('prevBtn');
const pageNum = document.getElementById('currentPage');
let index = 0;

function updateSlider(newIndex) {
    // Remove active class from current book
    books[index].classList.remove('active');
    // Update index
    index = newIndex;
    // Add active class to new book
    books[index].classList.add('active');
    // Update the 1/3 indicator
    pageNum.innerText = index + 1;
}

nextBtn.addEventListener('click', () => {
    let nextIndex = (index + 1) % books.length;
    updateSlider(nextIndex);
});

prevBtn.addEventListener('click', () => {
    let prevIndex = (index - 1 + books.length) % books.length;
    updateSlider(prevIndex);
});