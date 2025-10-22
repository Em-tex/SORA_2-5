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

        <a href="critical_area.html" class="nav-button" id="nav-critical-area">
             <svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
               <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0 0 13 3.06V1h-2v2.06A8.994 8.994 0 0 0 3.06 11H1v2h2.06A8.994 8.994 0 0 0 11 20.94V23h2v-2.06A8.994 8.994 0 0 0 20.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"></path>
            </svg>
            <span>Critical Area</span>
        </a>

        </nav>
    `;

    // 2. Sett inn HTML-koden i placeholder-elementet
    document.getElementById("navbar-placeholder").innerHTML = navbarHTML;

    // 3. Finn ut hvilken side vi er på og sett riktig knapp til "active"
    const currentPage = window.location.pathname.split("/").pop(); // F.eks. "index.html"

    if (currentPage === "index.html" || currentPage === "") {
        document.getElementById("nav-sail")?.classList.add("active");
    } else if (currentPage === "critical_area.html") {
        document.getElementById("nav-critical-area")?.classList.add("active");
    } else if (currentPage === "containment.html") {
        document.getElementById("nav-containment")?.classList.add("active");
    }

});