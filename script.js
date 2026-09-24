// Intersection Observer & Scroll Trigger Setup
document.addEventListener("DOMContentLoaded", () => {
    const navbar = document.getElementById("main-navbar");
    const hero = document.getElementById("hero");

    if (!navbar || !hero) return;

    // Trigger point set to 80% scroll past Hero section
    const observerOptions = {
        root: null,
        threshold: 0.2 // Triggers when only 20% of the Hero remains visible (i.e. 80% scrolled)
    };

    const heroObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) {
                // User scrolled past 80% of Hero -> Show solid blurred navbar & brand logo
                navbar.classList.add("scrolled");
            } else {
                // User is in the top 80% of Hero -> Hide solid background & brand logo
                navbar.classList.remove("scrolled");
            }
        });
    }, observerOptions);

    heroObserver.observe(hero);
});