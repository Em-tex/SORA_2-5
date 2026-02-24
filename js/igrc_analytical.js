document.addEventListener("DOMContentLoaded", function() {
    const dpopSlider = document.getElementById('dpop-slider');
    const dpopInput = document.getElementById('dpop-input');
    const dpopVal = document.getElementById('dpop-val');

    const acSlider = document.getElementById('ac-slider');
    const acInput = document.getElementById('ac-input');
    const acVal = document.getElementById('ac-val');

    const exactResult = document.getElementById('exact-result');
    const finalIgrc = document.getElementById('final-igrc');

    function calculateIGRC() {
        const dpop = parseFloat(dpopInput.value);
        const ac = parseFloat(acInput.value);

        if (dpop > 0 && ac > 0) {
            // Dpop konverteres til personer per m^2 for at enhetene stemmer matematisk
            const dpop_m2 = dpop / 1000000; 
            
            // raw iGRC = 7 + log10(Dpop * Ac)
            const raw_iGRC = 7 + Math.log10(dpop_m2 * ac);
            
            // Korrekt avrundingspolicy fra SORA 2.5 Annex F: iGRC = ⌈“raw” iGRC − 0.5⌉
            let rounded = Math.ceil(raw_iGRC - 0.5);
            
            // Sett gulv og tak
            if (rounded < 1) rounded = 1;
            if (rounded > 10) rounded = 10;

            exactResult.textContent = raw_iGRC.toFixed(3);
            finalIgrc.textContent = rounded;
            finalIgrc.className = "badge igrc-" + rounded;
        }
    }

    function syncInputs(slider, input, display, callback) {
        slider.addEventListener('input', (e) => {
            input.value = e.target.value;
            display.textContent = e.target.value;
            callback();
        });
        input.addEventListener('input', (e) => {
            slider.value = e.target.value;
            display.textContent = e.target.value;
            callback();
        });
    }

    syncInputs(dpopSlider, dpopInput, dpopVal, calculateIGRC);
    syncInputs(acSlider, acInput, acVal, calculateIGRC);

    calculateIGRC();
});