document.addEventListener("DOMContentLoaded", () => {
    const navbar = document.getElementById("main-navbar");
    const hero = document.getElementById("hero");
    const dropdownBtn = document.getElementById("dropdown-btn");
    const dropdownContent = document.getElementById("dropdown-content");
    const mobileToggle = document.getElementById("mobile-toggle");
    const navMenu = document.getElementById("nav-menu");

    // 1. Dropdown Toggle on Click
    if (dropdownBtn && dropdownContent) {
        dropdownBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            dropdownContent.classList.toggle("show");
            dropdownBtn.classList.toggle("active");
        });

        // Close dropdown when clicking anywhere outside
        document.addEventListener("click", (e) => {
            if (!dropdownBtn.contains(e.target) && !dropdownContent.contains(e.target)) {
                dropdownContent.classList.remove("show");
                dropdownBtn.classList.remove("active");
            }
        });
    }

    // 2. Mobile Drawer Menu Toggle
    if (mobileToggle && navMenu) {
        mobileToggle.addEventListener("click", () => {
            navMenu.classList.toggle("open");
        });
    }

    // 3. Navbar Background & Logo Fade-In past 80% Hero
    if (navbar && hero) {
        const observerOptions = {
            root: null,
            threshold: 0.2
        };

        const heroObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) {
                    navbar.classList.add("scrolled");
                } else {
                    navbar.classList.remove("scrolled");
                }
            });
        }, observerOptions);

        heroObserver.observe(hero);
    }
});