document.addEventListener("DOMContentLoaded", function() {
    const dpopSlider = document.getElementById('dpop-slider');
    const dpopInput = document.getElementById('dpop-input');
    
    const acSlider = document.getElementById('ac-slider');
    const acInput = document.getElementById('ac-input');
    
    const exactResult = document.getElementById('exact-result');
    const finalIgrc = document.getElementById('final-igrc');
    const calcSteps = document.getElementById('calc-steps');

    // Last inn lagrede verdier
    if(localStorage.getItem('igrc_analytical_pop')) {
        dpopInput.value = localStorage.getItem('igrc_analytical_pop');
    }
    if(localStorage.getItem('igrc_analytical_ac')) {
        acInput.value = localStorage.getItem('igrc_analytical_ac');
        acSlider.value = acInput.value;
    }

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

    // Logaritmisk synkronisering for befolkningstetthet
    function syncDpop() {
        const updateFromSlider = (e) => {
            let val = parseFloat(e.target.value);
            
            // Logaritmisk oversettelse: slider (1-1000) -> population (1-200000)
            let rawVal = Math.exp((val / 1000) * Math.log(200000));
            
            // Snapper til runde, pene tall
            if (rawVal < 10) val = Math.round(rawVal);
            else if (rawVal < 100) val = Math.round(rawVal / 5) * 5;
            else if (rawVal < 1000) val = Math.round(rawVal / 10) * 10;
            else if (rawVal < 10000) val = Math.round(rawVal / 100) * 100;
            else val = Math.round(rawVal / 1000) * 1000;
            
            val = Math.max(1, val); // Sørg for at den aldri blir under 1
            
            dpopInput.value = val;
            localStorage.setItem('igrc_analytical_pop', val);
            calculateIGRC();
        };

        const updateFromInput = (e) => {
            let val = parseFloat(e.target.value) || 1;
            
            // Konverterer tallet tilbake til en posisjon på slideren
            let cappedVal = Math.min(Math.max(1, val), 200000); 
            let sliderVal = 1000 * Math.log(cappedVal) / Math.log(200000);
            
            dpopSlider.value = sliderVal;
            localStorage.setItem('igrc_analytical_pop', val);
            calculateIGRC();
        };

        dpopSlider.addEventListener('input', updateFromSlider);
        dpopInput.addEventListener('input', updateFromInput);
        
        // Kjør én gang ved oppstart for å posisjonere slideren riktig
        let initialVal = parseFloat(dpopInput.value) || 1;
        let cappedVal = Math.min(Math.max(1, initialVal), 200000);
        dpopSlider.value = 1000 * Math.log(cappedVal) / Math.log(200000);
    }

    // Lineær synkronisering for Critical Area
    function syncAc() {
        const update = (e) => {
            let val = e.target.value;
            acSlider.value = val;
            acInput.value = val;
            localStorage.setItem('igrc_analytical_ac', val);
            calculateIGRC();
        };
        acSlider.addEventListener('input', update);
        acInput.addEventListener('input', update);
    }

    syncDpop();
    syncAc();
    calculateIGRC();
});