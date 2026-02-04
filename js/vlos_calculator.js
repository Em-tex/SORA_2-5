document.addEventListener('DOMContentLoaded', function() {
    
    // Inputs
    const cdInput = document.getElementById('cdInput');
    const gvSlider = document.getElementById('gvSlider');
    const aircraftRadios = document.getElementsByName('aircraftType');
    const unitRadios = document.getElementsByName('unitSystem');

    // Stepper Buttons
    const btnCdPlus = document.getElementById('btnCdPlus');
    const btnCdMinus = document.getElementById('btnCdMinus');

    // Display Elements
    const cdUnitLabel = document.getElementById('cdUnitLabel');
    const gvDisplayValue = document.getElementById('gvDisplayValue');
    const gvDisplayUnit = document.getElementById('gvDisplayUnit');
    
    // Results
    const alosDisplay = document.getElementById('alosResult');
    const dlosDisplay = document.getElementById('dlosResult');
    const finalDisplay = document.getElementById('finalResult');
    const limitingBox = document.getElementById('limitingFactorBox');
    const limitingText = document.getElementById('limitingFactorText');

    // Landscape Markers
    const markerALOS = document.getElementById('markerALOS');
    const markerDLOS = document.getElementById('markerDLOS');

    // Constants
    const M_TO_FT = 3.28084;
    const KM_TO_MI = 0.621371;
    
    // Max scale for the landscape chart (in meters)
    const MAX_VISUAL_DISTANCE_M = 2000; 

    // Hent referanser til de nye elementene
    const aircraftMarker = document.getElementById('aircraftMarker');
    const aircraftIcon = document.getElementById('aircraftIcon');

    function getUnitSystem() {
        return document.querySelector('input[name="unitSystem"]:checked').value;
    }

    function formatNumber(num) {
        return Math.round(num).toLocaleString();
    }

    // --- STEPPER LOGIC ---
    function adjustCD(delta) {
        let currentVal = parseFloat(cdInput.value) || 0;
        let newVal = currentVal + delta;
        if (newVal < 0) newVal = 0;
        
        // Round to avoid float errors (e.g. 0.30000004)
        cdInput.value = Math.round(newVal * 10) / 10;
        calculate();
    }

    btnCdPlus.addEventListener('click', () => adjustCD(0.1));
    btnCdMinus.addEventListener('click', () => adjustCD(-0.1));


    // --- CALCULATION LOGIC ---
    function calculate() {
        const unitSystem = getUnitSystem();
        let cdRaw = parseFloat(cdInput.value);
        let gvRawMeters = parseFloat(gvSlider.value); // Slider is always 0-5000 m

        // Update Text Displays
        if (unitSystem === 'metric') {
            if (gvRawMeters >= 1000) {
                gvDisplayValue.textContent = (gvRawMeters / 1000).toFixed(1);
                gvDisplayUnit.textContent = "km";
            } else {
                gvDisplayValue.textContent = gvRawMeters;
                gvDisplayUnit.textContent = "m";
            }
            cdUnitLabel.textContent = "m";
        } else {
            // Imperial
            const miles = (gvRawMeters / 1000) * KM_TO_MI;
            gvDisplayValue.textContent = miles.toFixed(2);
            gvDisplayUnit.textContent = "mi";
            cdUnitLabel.textContent = "ft";
        }

        // Validation
        if (isNaN(cdRaw) || cdRaw < 0) {
            resetResults();
            return;
        }

        // 1. Prepare CD in meters
        let cdMeters = cdRaw;
        if (unitSystem === 'imperial') {
            cdMeters = cdRaw / M_TO_FT; 
        }

        // 2. Prepare GV in meters
        const effectiveGVMeters = Math.min(gvRawMeters, 5000);

        // 3. Calculate ALOS
        let alosMeters = 0;
        const isRotorcraft = document.getElementById('rotorcraft').checked;
        
        if (isRotorcraft) {
            alosMeters = (327 * cdMeters) + 20;
        } else {
            alosMeters = (490 * cdMeters) + 30;
        }

        // 4. Calculate DLOS
        const dlosMeters = 0.3 * effectiveGVMeters;

        // 5. Final VLOS
        const vlosMeters = Math.min(alosMeters, dlosMeters);

        // --- DISPLAY RESULTS ---
        let alosDisplayVal = alosMeters;
        let dlosDisplayVal = dlosMeters;
        let vlosDisplayVal = vlosMeters;
        let suffix = " m";

        if (unitSystem === 'imperial') {
            alosDisplayVal = alosMeters * M_TO_FT;
            dlosDisplayVal = dlosMeters * M_TO_FT;
            vlosDisplayVal = vlosMeters * M_TO_FT;
            suffix = " ft";
        }

        alosDisplay.textContent = formatNumber(alosDisplayVal) + suffix;
        dlosDisplay.textContent = formatNumber(dlosDisplayVal) + suffix;
        finalDisplay.textContent = formatNumber(vlosDisplayVal) + suffix;

        if (isRotorcraft) {
            aircraftIcon.className = "fas fa-helicopter";
            // Juster evt rotasjon hvis flyikonet trenger det
            aircraftIcon.style.transform = "rotate(0deg)"; 
        } else {
            aircraftIcon.className = "fas fa-plane";
            // Ofte ser fly-ikonet bedre ut hvis det peker litt opp/frem
            aircraftIcon.style.transform = "rotate(-10deg)"; 
        }

        // Determine Limiting Factor
        let limiter = '';
        if (alosMeters < dlosMeters) {
            limitingText.innerHTML = "Limited by <strong>Aircraft Size (ALOS)</strong>";
            limitingBox.className = "limiting-box is-alos";
            limiter = 'alos';
        } else {
            limitingText.innerHTML = "Limited by <strong>Visibility (DLOS)</strong>";
            limitingBox.className = "limiting-box is-dlos";
            limiter = 'dlos';
        }

        

        updateLandscape(alosMeters, dlosMeters, vlosMeters);
    }

    function updateLandscape(alos, dlos, vlos) {
        // Calculate percentages based on fixed scale (e.g., 2000m)
        // Clamp at 100% if it exceeds scale
        let alosPct = (alos / MAX_VISUAL_DISTANCE_M) * 100;
        let dlosPct = (dlos / MAX_VISUAL_DISTANCE_M) * 100;
        let vlosPct = (vlos / MAX_VISUAL_DISTANCE_M) * 100;

        if (alosPct > 100) alosPct = 100;
        if (dlosPct > 100) dlosPct = 100;
        if (vlosPct > 100) vlosPct = 100;

        markerALOS.style.left = alosPct + "%";
        markerDLOS.style.left = dlosPct + "%";
        aircraftMarker.style.left = vlosPct + "%";

        // Bring the "limiting" marker to front so it's clearly visible
        if (alos < dlos) {
            markerALOS.style.zIndex = 10;
            markerDLOS.style.zIndex = 5;
            markerALOS.style.opacity = 1;
            markerDLOS.style.opacity = 0.5; // Fade the non-limiting one slightly?
        } else {
            markerDLOS.style.zIndex = 10;
            markerALOS.style.zIndex = 5;
            markerDLOS.style.opacity = 1;
            markerALOS.style.opacity = 0.5;
        }
    }

    function resetResults() {
        alosDisplay.textContent = "-";
        dlosDisplay.textContent = "-";
        finalDisplay.textContent = "-";
        limitingText.textContent = "Enter values above";
        limitingBox.className = "limiting-box";
        markerALOS.style.left = "0%";
        markerDLOS.style.left = "0%";
    }

    // Event Listeners
    [cdInput, gvSlider].forEach(el => el.addEventListener('input', calculate));
    aircraftRadios.forEach(el => el.addEventListener('change', calculate));
    unitRadios.forEach(el => el.addEventListener('change', calculate));

    // Initialize
    calculate();
});