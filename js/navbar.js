// Innhold for: js/navbar.js

document.addEventListener("DOMContentLoaded", function() {

    // 1. Definer HTML-koden for navigasjonsbåndet
    const navbarHTML = `
    <nav class="navbar">
        <div class="navbar-wrapper"> 
            <a href="https://www.luftfartstilsynet.no/droner/" target="_blank" rel="noopener noreferrer" class="nav-logo-link">
                 <img src="assets/CAA_Norway_liggende_hvit.png" alt="CAA Norway Logo" class="nav-logo">
            </a>

            <a href="index.html" class="nav-button" id="nav-sail">
                <i class="fas fa-home nav-icon"></i>
                <span>SAIL</span>
            </a>

            <a href="containment.html" class="nav-button" id="nav-containment">
                <i class="fas fa-draw-polygon nav-icon"></i>
                <span>Containment</span>
            </a>

            <a href="critical_area.html" class="nav-button" id="nav-critical-area">
                 <i class="fas fa-bullseye nav-icon"></i>
                <span>Critical Area</span>
            </a>

            <a href="contingency_volume.html" class="nav-button" id="nav-contingency-volume">
                <i class="fas fa-exclamation-triangle nav-icon"></i>
                <span>Operational Volume</span>
            </a>

            <a href="vlos_calculator.html" class="nav-button" id="nav-vlos">
                <i class="fas fa-eye nav-icon"></i>
                <span>Max VLOS</span>
            </a>
        </div> 
    </nav>
    `;

    // 2. Sett inn HTML-koden i placeholder-elementet
    const placeholder = document.getElementById("navbar-placeholder");
     if (placeholder) {
        placeholder.innerHTML = navbarHTML;
    } else {
        console.error("Navbar placeholder element not found!");
        return; 
    }

    // 3. Finn ut hvilken side vi er på og sett riktig knapp til "active"
    const currentPage = window.location.pathname.split("/").pop(); 

    // Nullstill 'active' klassen for alle knapper først
    document.querySelectorAll(".nav-button").forEach(button => button.classList.remove("active"));

    // Sett 'active' på riktig knapp
    if (currentPage === "index.html" || currentPage === "") {
        document.getElementById("nav-sail")?.classList.add("active");
    } else if (currentPage === "contingency_volume.html") {
        document.getElementById("nav-contingency-volume")?.classList.add("active");
    } else if (currentPage === "critical_area.html") {
        document.getElementById("nav-critical-area")?.classList.add("active");
    } else if (currentPage === "containment.html") {
        document.getElementById("nav-containment")?.classList.add("active");
    } else if (currentPage === "vlos_calculator.html") {
        document.getElementById("nav-vlos")?.classList.add("active");
    }
});