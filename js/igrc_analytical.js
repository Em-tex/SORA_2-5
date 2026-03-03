document.addEventListener("DOMContentLoaded", function() {
    const dpopSlider = document.getElementById('dpop-slider');
    const dpopInput = document.getElementById('dpop-input');
    const cgaHint = document.getElementById('cga-hint');
    
    const acSlider = document.getElementById('ac-slider');
    const acInput = document.getElementById('ac-input');
    
    const exactResult = document.getElementById('exact-result');
    const finalIgrc = document.getElementById('final-igrc');
    const calcSteps = document.getElementById('calc-steps');

    dpopInput.step = "any";
    acInput.step = "any";

    // Hent lagrede verdier
    const calculatedAC = localStorage.getItem('sora_last_calculated_ac');
    if (calculatedAC && parseFloat(calculatedAC) > 0) {
        acInput.value = parseFloat(calculatedAC).toFixed(2);
    } else if (localStorage.getItem('igrc_analytical_ac')) {
        acInput.value = localStorage.getItem('igrc_analytical_ac');
    }

    if(localStorage.getItem('igrc_analytical_pop')) {
        dpopInput.value = localStorage.getItem('igrc_analytical_pop');
    }

    function calculateIGRC() {
        const dpop = parseFloat(dpopInput.value); // Kan være 0
        const ac = parseFloat(acInput.value) || 0;

        // Vis/skjul CGA hint
        if (cgaHint) {
            cgaHint.style.display = (dpop === 0) ? 'block' : 'none';
        }

        if (dpop === 0 && ac > 0) {
            // Spesialtilfelle: Controlled Ground Area (CGA)
            // Formelen fungerer ikke for 0 (log(0) er udefinert).
            // SORA Annex F Tabell 2 og 30 angir faste verdier for CGA basert på størrelse:
            // Ac <= 65 m²  -> iGRC 1
            // Ac <= 650 m² -> iGRC 2
            // Ac > 650 m²  -> iGRC 3
            
            let cgaScore = 1;
            if (ac > 650) {
                cgaScore = 3;
            } else if (ac > 65) {
                cgaScore = 2;
            }
            
            exactResult.textContent = "N/A (CGA)";
            finalIgrc.textContent = cgaScore;
            finalIgrc.className = "badge igrc-" + cgaScore;
            
            if(calcSteps) {
                calcSteps.innerHTML = "<strong>Controlled Ground Area</strong> (Density = 0)<br>" + 
                                      "Analytical formula implies -∞. SORA Annex F Table 2 assigns fixed values:<br>" +
                                      "&bull; A<sub>c</sub> &le; 65 m&sup2;: <strong>iGRC 1</strong><br>" +
                                      "&bull; A<sub>c</sub> &le; 650 m&sup2;: <strong>iGRC 2</strong><br>" +
                                      "&bull; A<sub>c</sub> &gt; 650 m&sup2;: <strong>iGRC 3</strong>";
            }

        } else if (dpop > 0 && ac > 0) {
            const dpop_m2 = dpop / 1000000; 
            const raw_iGRC = 7 + Math.log10(dpop_m2 * ac);
            
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
            if(calcSteps) calcSteps.innerHTML = "Population density and Critical Area must be valid.";
        }
    }

    // Log-slider som håndterer 0 korrekt
    function setupLogSlider(slider, input, minVal, maxVal, storageKey) {
        const minLog = Math.log(minVal); 
        const maxLog = Math.log(maxVal);
        const scale = (maxLog - minLog) / 1000;

        slider.addEventListener('input', function() {
            const pos = parseFloat(slider.value);
            
            if (pos === 0) {
                input.value = 0;
            } else {
                let val = Math.exp(minLog + scale * pos);
                if (val < 10) val = Math.round(val * 100) / 100;
                else if (val < 100) val = Math.round(val * 10) / 10;
                else val = Math.round(val);
                val = Math.max(minVal, Math.min(val, maxVal));
                input.value = val;
            }
            
            localStorage.setItem(storageKey, input.value);
            calculateIGRC();
        });

        input.addEventListener('input', function() {
            let val = parseFloat(input.value);
            
            if (val === 0) {
                slider.value = 0;
            } else if (val > 0) {
                val = Math.max(minVal, Math.min(val, maxVal));
                const pos = (Math.log(val) - minLog) / scale;
                slider.value = pos;
            }
            
            localStorage.setItem(storageKey, input.value);
            calculateIGRC();
        });

        let startVal = parseFloat(input.value);
        if (startVal === 0) {
            slider.value = 0;
        } else {
            startVal = Math.max(minVal, startVal || minVal);
            slider.value = (Math.log(startVal) - minLog) / scale;
        }
    }

    setupLogSlider(dpopSlider, dpopInput, 1, 200000, 'igrc_analytical_pop');
    setupLogSlider(acSlider, acInput, 0.1, 200000, 'igrc_analytical_ac');

    calculateIGRC();
});