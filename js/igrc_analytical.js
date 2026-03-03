document.addEventListener("DOMContentLoaded", function() {
    const dpopSlider = document.getElementById('dpop-slider');
    const dpopInput = document.getElementById('dpop-input');
    
    const acSlider = document.getElementById('ac-slider');
    const acInput = document.getElementById('ac-input');
    
    const exactResult = document.getElementById('exact-result');
    const finalIgrc = document.getElementById('final-igrc');
    const calcSteps = document.getElementById('calc-steps');

    // Tillat desimaltall ved å sette step="any"
    dpopInput.step = "any";
    acInput.step = "any";

    // --- LOGIKK FOR Å HENTE DATA ---
    
    // 1. Befolkningstetthet: Hent sist brukte verdi, eller default 100
    if(localStorage.getItem('igrc_analytical_pop')) {
        dpopInput.value = localStorage.getItem('igrc_analytical_pop');
    }

    // 2. Critical Area: Prioriter beregnet verdi fra critical_area.html
    const calculatedAC = localStorage.getItem('sora_last_calculated_ac');
    const storedLocalAC = localStorage.getItem('igrc_analytical_ac');

    if (calculatedAC && parseFloat(calculatedAC) > 0) {
        // Hvis vi har en fersk beregning fra den andre siden, bruk den!
        acInput.value = parseFloat(calculatedAC).toFixed(2);
        // Lagre den også lokalt for denne siden med en gang
        localStorage.setItem('igrc_analytical_ac', acInput.value);
    } else if (storedLocalAC) {
        // Hvis ikke, bruk forrige verdi tastet inn på denne siden
        acInput.value = storedLocalAC;
    }
    // Hvis ingen av delene finnes, står default verdien fra HTML (50)

    function calculateIGRC() {
        const dpop = parseFloat(dpopInput.value) || 0;
        const ac = parseFloat(acInput.value) || 0;

        if (dpop > 0 && ac > 0) {
            const dpop_m2 = dpop / 1000000; 
            const raw_iGRC = 7 + Math.log10(dpop_m2 * ac);
            
            // SORA 2.5 Annex F Rounding: iGRC = ⌈raw - 0.5⌉
            const shifted = raw_iGRC - 0.5;
            let rounded = Math.ceil(shifted);
            
            if (rounded < 1) rounded = 1;
            if (rounded > 10) rounded = 10;

            exactResult.textContent = raw_iGRC.toFixed(4);
            finalIgrc.textContent = rounded;
            finalIgrc.className = "badge igrc-" + rounded;

            if(calcSteps) {
                calcSteps.innerHTML = `Rounding logic: &lceil;${raw_iGRC.toFixed(3)} - 0.5&rceil; = &lceil;${shifted.toFixed(3)}&rceil; = <strong>${rounded}</strong>`;
            }
        } else {
            exactResult.textContent = "N/A";
            finalIgrc.textContent = "N/A";
            finalIgrc.className = "badge igrc-na";
            if(calcSteps) calcSteps.innerHTML = "Population density and Critical Area must be strictly greater than 0.";
        }
    }

    // Hjelpefunksjon for logaritmisk skala (Log-Linear mapping)
    // Map slider (0-1000) -> value (min-max)
    function setupLogarithmicSlider(slider, input, minVal, maxVal, storageKey) {
        
        const minLog = Math.log(minVal);
        const maxLog = Math.log(maxVal);
        // Vi antar nå at slideren går fra 0 til 1000 i HTML
        const sliderRange = 1000; 
        const scale = (maxLog - minLog) / sliderRange;

        const updateFromSlider = (e) => {
            let pos = parseFloat(e.target.value);
            // Logaritmisk beregning: value = e^(minLog + scale * pos)
            let val = Math.exp(minLog + scale * pos);
            
            // Pen avrunding basert på størrelse
            if (val < 10) val = Math.round(val * 100) / 100; // 2 desimaler for små tall
            else if (val < 100) val = Math.round(val * 10) / 10;
            else val = Math.round(val);

            // Sørg for at vi holder oss innenfor grensene
            val = Math.max(minVal, Math.min(val, maxVal));
            
            input.value = val;
            localStorage.setItem(storageKey, val);
            calculateIGRC();
        };

        const updateFromInput = (e) => {
            let val = parseFloat(e.target.value) || minVal;
            val = Math.max(minVal, Math.min(val, maxVal)); // Clamp input

            // Revers formel: position = (log(val) - log(min)) / scale
            let pos = (Math.log(val) - minLog) / scale;
            
            slider.value = pos;
            localStorage.setItem(storageKey, val);
            calculateIGRC();
        };

        slider.addEventListener('input', updateFromSlider);
        input.addEventListener('input', updateFromInput);

        // Initialiser slider posisjon korrekt basert på verdien som ble lastet inn
        let initialVal = parseFloat(input.value) || minVal;
        initialVal = Math.max(minVal, initialVal); 
        let initialPos = (Math.log(initialVal) - minLog) / scale;
        slider.value = initialPos;
    }

    // Befolkningstetthet (1 - 200,000) - Logaritmisk
    setupLogarithmicSlider(dpopSlider, dpopInput, 1, 200000, 'igrc_analytical_pop');

    // Critical Area (0.1 - 10,000) - Logaritmisk
    setupLogarithmicSlider(acSlider, acInput, 0.1, 10000, 'igrc_analytical_ac');

    // Kjør en gang ved oppstart
    calculateIGRC();
});