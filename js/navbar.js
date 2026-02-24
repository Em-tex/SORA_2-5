document.addEventListener("DOMContentLoaded", function() {

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

            <div class="dropdown">
                <a href="tradeoff_tables.html" class="nav-button" id="nav-igrc-main">
                    <i class="fas fa-street-view nav-icon"></i>
                    <span>iGRC <i class="fas fa-caret-down" style="margin-left: 5px;"></i></span>
                </a>
                <div class="dropdown-content">
                    <a href="tradeoff_tables.html"><i class="fas fa-balance-scale" style="width: 20px;"></i> Trade-off Tables</a>
                    <a href="igrc_analytical.html"><i class="fas fa-calculator" style="width: 20px;"></i> Analytical Formula</a>
                    <a href="critical_area.html"><i class="fas fa-bullseye" style="width: 20px;"></i> Critical Area</a>
                </div>
            </div>

            <a href="containment.html" class="nav-button" id="nav-containment">
                <i class="fas fa-draw-polygon nav-icon"></i>
                <span>Containment</span>
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

    const placeholder = document.getElementById("navbar-placeholder");
    if (placeholder) {
        placeholder.innerHTML = navbarHTML;
    }

    const currentPage = window.location.pathname.split("/").pop(); 

    document.querySelectorAll(".nav-button").forEach(button => button.classList.remove("active"));

    // Logikk for å sette iGRC-knappen som aktiv for alle tre undersider
    const igrcPages = ["tradeoff_tables.html", "igrc_analytical.html", "critical_area.html"];

    if (currentPage === "index.html" || currentPage === "") {
        document.getElementById("nav-sail")?.classList.add("active");
    } else if (igrcPages.includes(currentPage)) {
        document.getElementById("nav-igrc-main")?.classList.add("active");
    } else if (currentPage === "containment.html") {
        document.getElementById("nav-containment")?.classList.add("active");
    } else if (currentPage === "contingency_volume.html") {
        document.getElementById("nav-contingency-volume")?.classList.add("active");
    } else if (currentPage === "vlos_calculator.html") {
        document.getElementById("nav-vlos")?.classList.add("active");
    }
});