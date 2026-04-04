document.addEventListener('DOMContentLoaded', () => {
    const carouselItems = document.querySelectorAll('.carousel-item');
    if (carouselItems.length === 0) return;

    let rotationIndex = 0;
    const positions = ['pos-1', 'pos-2', 'pos-3'];

    function rotate() {
        rotationIndex++;
        
        carouselItems.forEach((item, i) => {
            // Remove all current position classes
            item.classList.remove(...positions);
            
            // Calculate new position index for each item
            const newPosIndex = (i + rotationIndex) % positions.length;
            item.classList.add(positions[newPosIndex]);
        });
    }

    // Run the circulation every 3.5 seconds for a smoother feel
    setInterval(rotate, 3500);

});
