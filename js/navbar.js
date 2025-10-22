// Innhold for: js/navbar.js

document.addEventListener("DOMContentLoaded", function() {
    
    // 1. Definer HTML-koden for navigasjonsbåndet
    const navbarHTML = `
    <nav class="navbar">
        <a href="https://www.luftfartstilsynet.no/droner/" target="_blank" rel="noopener noreferrer" class="nav-logo-link">
            <img src="assets/CAA_Norway_liggende_hvit.png" alt="CAA Norway Logo" class="nav-logo">
        </a>
        
        <a href="index.html" class="nav-button" id="nav-sail">
            <svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8h5z"></path>
            </svg>
            <span>SAIL</span>
        </a>
        
        <a href="containment.html" class="nav-button" id="nav-containment">
            <svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z"></path>
            </svg>
            <span>Containment</span>
        </a>
        
        </nav>
    `;

    // 2. Sett inn HTML-koden i placeholder-elementet
    document.getElementById("navbar-placeholder").innerHTML = navbarHTML;

    // 3. Finn ut hvilken side vi er på og sett riktig knapp til "active"
    const currentPage = window.location.pathname.split("/").pop(); // F.eks. "index.html"

    if (currentPage === "index.html" || currentPage === "") {
        document.getElementById("nav-sail").classList.add("active");
    } else if (currentPage === "containment.html") {
        document.getElementById("nav-containment").classList.add("active");
    }
    
});