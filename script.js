document.addEventListener("DOMContentLoaded", () => {
    const navbar = document.getElementById("main-navbar");
    const hero = document.getElementById("hero");
    const dropdownBtn = document.getElementById("dropdown-btn");
    const dropdownContent = document.getElementById("dropdown-content");
    const mobileToggle = document.getElementById("mobile-toggle");
    const mobileClose = document.getElementById("mobile-close");
    const navMenuWrapper = document.getElementById("nav-menu");
    const menuOverlay = document.getElementById("menu-overlay");

    // Helper functions to open/close mobile drawer safely
    const openMenu = () => {
        navMenuWrapper.classList.add("open");
        menuOverlay.classList.add("active");
        document.body.style.overflow = "hidden"; // Prevent background scrolling
    };

    const closeMenu = () => {
        navMenuWrapper.classList.remove("open");
        menuOverlay.classList.remove("active");
        document.body.style.overflow = "auto";
    };

    // 1. Mobile Drawer Triggers
    if (mobileToggle) mobileToggle.addEventListener("click", openMenu);
    if (mobileClose) mobileClose.addEventListener("click", closeMenu);
    if (menuOverlay) menuOverlay.addEventListener("click", closeMenu);

    // 2. Dynamic Dropdown Toggle
    if (dropdownBtn && dropdownContent) {
        dropdownBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            dropdownContent.classList.toggle("show");
            dropdownBtn.classList.toggle("active");
        });

        document.addEventListener("click", (e) => {
            if (!dropdownBtn.contains(e.target) && !dropdownContent.contains(e.target)) {
                dropdownContent.classList.remove("show");
                dropdownBtn.classList.remove("active");
            }
        });
    }

    // 3. Navbar Blurred Emerald Background past 80% Hero
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