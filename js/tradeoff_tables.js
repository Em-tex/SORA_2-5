document.addEventListener("DOMContentLoaded", function() {
    const velSlider = document.getElementById('vel-slider');
    const velInput = document.getElementById('vel-input');
    const velUnit = document.getElementById('vel-unit');
    
    const dimSlider = document.getElementById('dim-slider');
    const dimInput = document.getElementById('dim-input');
    
    const densSlider = document.getElementById('dens-slider');
    const densInput = document.getElementById('dens-input');
    const cgaHint = document.getElementById('cga-hint');
    
    const originalContainer = document.getElementById('original-table-container');
    const tablesContainer = document.getElementById('tradeoff-tables-container');

    // Tillat desimaltall
    velInput.step = "0.1";
    dimInput.step = "0.1";
    densInput.step = "any";

    const baseDimLimits = [1, 3, 8, 20, 40];
    const baseVelLimits = [25, 35, 75, 120, 200];
    const basePopLimits = [0, 5, 50, 500, 5000, 50000]; 

    const igrcMatrix = [
        [1, 1, 2, 3, 3],  // 0: Controlled Ground Area
        [2, 3, 4, 5, 6],  // 1: < 5
        [3, 4, 5, 6, 7],  // 2: < 50
        [4, 5, 6, 7, 8],  // 3: < 500
        [5, 6, 7, 8, 9],  // 4: < 5,000
        [6, 7, 8, 9, 10], // 5: < 50,000
        [7, 8, 'N/A', 'N/A', 'N/A'] // 6: > 50,000
    ];

    const tradeOffs = [
        { id: 'T1', name: 'T1: Reduce Population Density by 50% to Increase Velocity by 40%', popMod: 0.5, velMod: 1.4, dimMod: 1.0 },
        { id: 'T2', name: 'T2: Reduce Population Density by 50% to Increase Size by 100%', popMod: 0.5, velMod: 1.0, dimMod: 2.0 },
        { id: 'T3', name: 'T3: Reduce Size by 50% to Increase Population Density by 100%', popMod: 2.0, velMod: 1.0, dimMod: 0.5 },
        { id: 'T4', name: 'T4: Reduce Size by 50% to Increase Velocity by 40%', popMod: 1.0, velMod: 1.4, dimMod: 0.5 },
        { id: 'T5', name: 'T5: Reduce Velocity by 25% to Increase Population Density by 70%', popMod: 1.7, velMod: 0.75, dimMod: 1.0 },
        { id: 'T6', name: 'T6: Reduce Velocity by 25% to Increase Size by 70%', popMod: 1.0, velMod: 0.75, dimMod: 1.7 }
    ];

    if(velInput && localStorage.getItem('igrc_vel')) {
        velInput.value = localStorage.getItem('igrc_vel');
    }
    if(dimInput && localStorage.getItem('igrc_dim')) {
        dimInput.value = localStorage.getItem('igrc_dim');
    }
    if(densInput && localStorage.getItem('igrc_pop')) {
        densInput.value = localStorage.getItem('igrc_pop');
    }
    if(velUnit && localStorage.getItem('igrc_unit')) {
        velUnit.value = localStorage.getItem('igrc_unit');
    }

    // Helper for log scale sync
    function syncLogarithmic(slider, input, minVal, maxVal, storageKey) {
        const minLog = Math.log(minVal);
        const maxLog = Math.log(maxVal);
        const range = parseFloat(slider.max) - parseFloat(slider.min); 
        
        const updateFromSlider = (e) => {
            const pos = parseFloat(e.target.value);
            // Normalized position (0 to 1) 
            const pct = (pos - parseFloat(slider.min)) / range;
            
            let val = Math.exp(minLog + pct * (maxLog - minLog));
            
            // Nice rounding
            if (val < 10) val = Math.round(val * 100) / 100;
            else if (val < 100) val = Math.round(val * 10) / 10;
            else val = Math.round(val);
            
            // Clamp
            val = Math.max(minVal, Math.min(val, maxVal));

            input.value = val;
            localStorage.setItem(storageKey, val);
            
            // Special CGA logic for density (handling 0)
            if(storageKey === 'igrc_pop' && cgaHint) {
                 if (pos == slider.min) input.value = 0;
                 cgaHint.style.display = (parseFloat(input.value) === 0) ? 'block' : 'none';
            }

            renderAll();
        };

        const updateFromInput = (e) => {
            let val = parseFloat(e.target.value) || minVal;
            // Handle 0 for pop density separately
            if (storageKey === 'igrc_pop' && val <= 0) {
                slider.value = slider.min;
                localStorage.setItem(storageKey, 0);
                if(cgaHint) cgaHint.style.display = 'block';
                renderAll();
                return;
            }

            val = Math.max(minVal, Math.min(val, maxVal));
            const pct = (Math.log(val) - minLog) / (maxLog - minLog);
            const pos = parseFloat(slider.min) + (pct * range);
            
            slider.value = pos;
            localStorage.setItem(storageKey, val);
            if(storageKey === 'igrc_pop' && cgaHint) cgaHint.style.display = 'none';
            renderAll();
        };

        slider.addEventListener('input', updateFromSlider);
        input.addEventListener('input', updateFromInput);
        
        // Init slider position
        let initialVal = parseFloat(input.value);
        if (storageKey === 'igrc_pop' && initialVal <= 0) {
            slider.value = slider.min;
        } else {
            initialVal = Math.max(minVal, initialVal);
            const pct = (Math.log(initialVal) - minLog) / (maxLog - minLog);
            slider.value = parseFloat(slider.min) + (pct * range);
        }
    }

    // Velocity: Log scale 1 to 250
    syncLogarithmic(velSlider, velInput, 1, 250, 'igrc_vel');

    // Dimension: Log scale 0.1 to 50
    syncLogarithmic(dimSlider, dimInput, 0.1, 50, 'igrc_dim');

    // Population: Log scale 1 to 100,000 (handling 0 as CGA)
    syncLogarithmic(densSlider, densInput, 1, 100000, 'igrc_pop');
    

    if (velUnit) {
        velUnit.addEventListener('change', e => {
            localStorage.setItem('igrc_unit', e.target.value);
            renderAll();
        });
    }

    function getVelocityInMS(val, unit) {
        if(unit === 'kmh') return val / 3.6;
        if(unit === 'kt') return val / 1.94384;
        return val;
    }

    function formatNum(num) {
        if (isNaN(num)) return "0";
        return Math.round(num).toLocaleString('en-US');
    }

    function formatDim(num) {
        if (isNaN(num)) return "0";
        return num % 1 === 0 ? num : num.toFixed(1);
    }

    function generateTableHTML(title, popInput, velInput_ms, dimInput, mod) {
        const pLim = basePopLimits.map(v => (v * mod.popMod));
        const dLim = baseDimLimits.map(v => (v * mod.dimMod));
        const vLim = baseVelLimits.map(v => (v * mod.velMod));

        let colDim = dLim.findIndex(limit => dimInput <= limit);
        if (colDim === -1) colDim = 5;
        let colVel = vLim.findIndex(limit => velInput_ms <= limit);
        if (colVel === -1) colVel = 5;
        const col = Math.max(colDim, colVel);

        let row = 6;
        if (popInput === 0) {
            row = 0;
        } else {
            for (let i = 1; i < pLim.length; i++) {
                if (popInput < pLim[i]) {
                    row = i;
                    break;
                }
            }
        }

        let score = (row < 7 && col < 5) ? igrcMatrix[row][col] : 'N/A';
        if(score === 'N/A' && row === 6 && col < 2) score = igrcMatrix[6][col]; 
        let badgeClass = score === 'N/A' ? 'igrc-na' : 'igrc-' + score;

        let html = `
            <div class="tradeoff-card">
                <div class="tradeoff-header">
                    <h3 style="font-size: 0.95rem; margin-right: 10px;">${title}</h3>
                    <span class="badge ${badgeClass}" style="flex-shrink:0;">iGRC: ${score}</span>
                </div>
                <div class="table-responsive">
                    <table class="sora-style-table">
                        <thead>
                            <tr>
                                <th colspan="2" class="dim-header unselectable">Maximum UA characteristic dimension</th>
                                ${dLim.map((d) => `<th class="dim-header">${formatDim(d)} m</th>`).join('')}
                            </tr>
                            <tr>
                                <th colspan="2" class="vel-header unselectable">Maximum speed</th>
                                ${vLim.map((v) => `<th class="vel-header">${Math.round(v)} m/s</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${[0, 1, 2, 3, 4, 5, 6].map((r) => {
                                let rowLabel = "";
                                if (r === 0) rowLabel = "Controlled Ground Area";
                                else if (r === 6) rowLabel = "&gt; " + formatNum(pLim[5]);
                                else rowLabel = "&lt; " + formatNum(pLim[r]);

                                let popDensityCell = "";
                                if (r === 0) {
                                    popDensityCell = `<td rowspan="7" style="max-width: 150px; text-align: left;" class="pop-header">Maximum iGRC population density (people/km&sup2;)</td>`;
                                }

                                return `
                                <tr class="${row===r?'highlight-row':''}">
                                    ${popDensityCell}
                                    <td class="pop-header wide-col">${rowLabel}</td>
                                    ${[0, 1, 2, 3, 4].map(c => {
                                        let hClass = "";
                                        if (row === r && col === c) hClass = "highlight-cell";
                                        else if (col === c) hClass = "highlight-col";

                                        if (r === 6 && c === 2) {
                                            if (row === 6 && col >= 2) hClass = "highlight-cell";
                                            else if (col >= 2) hClass = "highlight-col";
                                            
                                            return `<td colspan="3" class="not-part ${hClass}">Not part of SORA</td>`;
                                        } else if (r === 6 && c > 2) {
                                            return ''; 
                                        } else {
                                            return `<td class="${hClass}">${igrcMatrix[r][c]}</td>`;
                                        }
                                    }).join('')}
                                </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        return html;
    }

    function renderAll() {
        if (!originalContainer || !tablesContainer) return;
        
        const velRaw = parseFloat(velInput?.value) || 0;
        const dim = parseFloat(dimInput?.value) || 0;
        const pop = parseFloat(densInput?.value) || 0;
        const unit = velUnit ? velUnit.value : 'ms';
        const vel_ms = getVelocityInMS(velRaw, unit);

        originalContainer.innerHTML = generateTableHTML(
            "Original Reference Table (T0)", pop, vel_ms, dim, 
            { popMod: 1.0, velMod: 1.0, dimMod: 1.0 }
        );

        let tHtml = '';
        tradeOffs.forEach(t => {
            tHtml += generateTableHTML(t.name, pop, vel_ms, dim, t);
        });
        tablesContainer.innerHTML = tHtml;
    }

    renderAll();
});