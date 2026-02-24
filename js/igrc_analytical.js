document.addEventListener("DOMContentLoaded", function() {
    const dpopSlider = document.getElementById('dpop-slider');
    const dpopInput = document.getElementById('dpop-input');
    const acSlider = document.getElementById('ac-slider');
    const acInput = document.getElementById('ac-input');
    const exactResult = document.getElementById('exact-result');
    const finalIgrc = document.getElementById('final-igrc');
    const calcSteps = document.getElementById('calc-steps'); // Nytt felt i HTML

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

            // Oppdaterer synlig matte for brukeren
            if(calcSteps) {
                calcSteps.innerHTML = `Rounding logic: &lceil;${raw_iGRC.toFixed(3)} - 0.5&rceil; = &lceil;${shifted.toFixed(3)}&rceil; = <strong>${rounded}</strong>`;
            }
        }
    }

    function syncInputs(slider, input, callback) {
        slider.addEventListener('input', (e) => { input.value = e.target.value; callback(); });
        input.addEventListener('input', (e) => { slider.value = e.target.value; callback(); });
    }

    syncInputs(dpopSlider, dpopInput, calculateIGRC);
    syncInputs(acSlider, acInput, calculateIGRC);
    calculateIGRC();
});