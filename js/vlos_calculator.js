document.addEventListener('DOMContentLoaded', function() {
    
    // Inputs
    const cdInput = document.getElementById('cdInput');
    const gvSlider = document.getElementById('gvSlider');
    const aircraftRadios = document.getElementsByName('aircraftType');
    const unitRadios = document.getElementsByName('unitSystem');

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

    // Bars
    const alosBar = document.getElementById('alosBar');
    const dlosBar = document.getElementById('dlosBar');

    // Constants
    const M_TO_FT = 3.28084;
    const KM_TO_MI = 0.621371;

    function getUnitSystem() {
        return document.querySelector('input[name="unitSystem"]:checked').value;
    }

    function formatNumber(num) {
        return Math.round(num).toLocaleString();
    }

    function calculate() {
        const unitSystem = getUnitSystem();
        let cdRaw = parseFloat(cdInput.value);
        let gvRawMeters = parseFloat(gvSlider.value); // Slider is always 0-5000 (meters representation)

        // Update GV Slider Display Text
        if (unitSystem === 'metric') {
            // Display as km if > 1000, else m
            if (gvRawMeters >= 1000) {
                gvDisplayValue.textContent = (gvRawMeters / 1000).toFixed(1);
                gvDisplayUnit.textContent = "km";
            } else {
                gvDisplayValue.textContent = gvRawMeters;
                gvDisplayUnit.textContent = "m";
            }
            cdUnitLabel.textContent = "meters";
        } else {
            // Imperial: Convert GV slider (m) to Miles/Feet for display
            const miles = (gvRawMeters / 1000) * KM_TO_MI;
            gvDisplayValue.textContent = miles.toFixed(2);
            gvDisplayUnit.textContent = "miles";
            cdUnitLabel.textContent = "feet";
        }

        // Validation
        if (isNaN(cdRaw) || cdRaw < 0) {
            resetResults();
            return;
        }

        // --- CORE CALCULATION (Always in Meters) ---
        
        // 1. Prepare CD in meters
        let cdMeters = cdRaw;
        if (unitSystem === 'imperial') {
            cdMeters = cdRaw / M_TO_FT; // Convert input feet to meters for formula
        }

        // 2. Prepare GV in meters (max 5000m logic is handled by slider max, but safe to clamp)
        const effectiveGVMeters = Math.min(gvRawMeters, 5000);

        // 3. Calculate ALOS (Attitude Line of Sight)
        let alosMeters = 0;
        const isRotorcraft = document.getElementById('rotorcraft').checked;
        
        if (isRotorcraft) {
            alosMeters = (327 * cdMeters) + 20;
        } else {
            alosMeters = (490 * cdMeters) + 30;
        }

        // 4. Calculate DLOS (Detection Line of Sight) -> 30% of GV
        const dlosMeters = 0.3 * effectiveGVMeters;

        // 5. Final VLOS
        const vlosMeters = Math.min(alosMeters, dlosMeters);

        // --- DISPLAY RESULTS (Convert back if needed) ---
        
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

        // Determine Limiting Factor styling
        if (alosMeters < dlosMeters) {
            limitingText.innerHTML = "Limited by <strong>Aircraft Size (ALOS)</strong>";
            limitingBox.className = "limiting-box is-alos";
            updateBars(alosMeters, dlosMeters, 'alos');
        } else {
            limitingText.innerHTML = "Limited by <strong>Visibility (DLOS)</strong>";
            limitingBox.className = "limiting-box is-dlos";
            updateBars(alosMeters, dlosMeters, 'dlos');
        }
    }

    function updateBars(alos, dlos, limiter) {
        // Max scale for bar chart (use slightly more than the max value)
        const maxVal = Math.max(alos, dlos) * 1.2; 
        if (maxVal === 0) return;

        const alosPct = (alos / maxVal) * 100;
        const dlosPct = (dlos / maxVal) * 100;

        alosBar.style.width = alosPct + "%";
        dlosBar.style.width = dlosPct + "%";

        // Colors
        alosBar.style.backgroundColor = (limiter === 'alos') ? "#F06C00" : "#ccc"; // Orange if limiting
        dlosBar.style.backgroundColor = (limiter === 'dlos') ? "#03477F" : "#ccc"; // Blue if limiting
    }

    function resetResults() {
        alosDisplay.textContent = "-";
        dlosDisplay.textContent = "-";
        finalDisplay.textContent = "-";
        limitingText.textContent = "Enter values above";
        limitingBox.className = "limiting-box";
        alosBar.style.width = "0%";
        dlosBar.style.width = "0%";
    }

    // Event Listeners
    [cdInput, gvSlider].forEach(el => el.addEventListener('input', calculate));
    aircraftRadios.forEach(el => el.addEventListener('change', calculate));
    unitRadios.forEach(el => el.addEventListener('change', calculate));

    // Initialize
    calculate();
});