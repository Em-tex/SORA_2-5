document.addEventListener("DOMContentLoaded", function() {
    // Elements
    const velSlider = document.getElementById('vel-slider');
    const velInput = document.getElementById('vel-input');
    const velUnit = document.getElementById('vel-unit');
    
    const dimSlider = document.getElementById('dim-slider');
    const dimInput = document.getElementById('dim-input');
    
    const densSlider = document.getElementById('dens-slider');
    const densInput = document.getElementById('dens-input');
    
    const originalContainer = document.getElementById('original-table-container');
    const tablesContainer = document.getElementById('tradeoff-tables-container');

    // Constants
    const baseDimLimits = [1, 3, 8, 20, 40];
    const baseVelLimits = [25, 35, 75, 120, 200];
    const basePopLimits = [5, 50, 500, 5000, 50000]; 
    const igrcMatrix = [
        [2, 3, 4, 5, 6],  // < 5
        [3, 4, 5, 6, 7],  // < 50
        [4, 5, 6, 7, 8],  // < 500
        [5, 6, 7, 8, 9],  // < 5000
        [6, 7, 8, 9, 10], // < 50000
        [7, 8, 'N/A', 'N/A', 'N/A'] // > 50000
    ];

    const tradeOffs = [
        { id: 'T1', name: 'T1: Reduce Pop 50% OR Increase Vel 40%', popMod: 0.5, velMod: 1.4, dimMod: 1.0 },
        { id: 'T2', name: 'T2: Reduce Pop 50% OR Increase Size 100%', popMod: 0.5, velMod: 1.0, dimMod: 2.0 },
        { id: 'T3', name: 'T3: Reduce Size 50% OR Increase Pop 100%', popMod: 2.0, velMod: 1.0, dimMod: 0.5 },
        { id: 'T4', name: 'T4: Reduce Size 50% OR Increase Vel 40%', popMod: 1.0, velMod: 1.4, dimMod: 0.5 },
        { id: 'T5', name: 'T5: Reduce Vel 25% OR Increase Pop 70%', popMod: 1.7, velMod: 0.75, dimMod: 1.0 },
        { id: 'T6', name: 'T6: Reduce Vel 25% OR Increase Size 70%', popMod: 1.0, velMod: 0.75, dimMod: 1.7 }
    ];

    // Load saved settings
    if(localStorage.getItem('igrc_vel')) velInput.value = velSlider.value = localStorage.getItem('igrc_vel');
    if(localStorage.getItem('igrc_dim')) dimInput.value = dimSlider.value = localStorage.getItem('igrc_dim');
    if(localStorage.getItem('igrc_pop')) densInput.value = densSlider.value = localStorage.getItem('igrc_pop');
    if(localStorage.getItem('igrc_unit')) velUnit.value = localStorage.getItem('igrc_unit');

    function sync(slider, input, type) {
        const update = (val) => {
            slider.value = val;
            input.value = val;
            localStorage.setItem('igrc_' + type, val);
            renderAll();
        };
        slider.addEventListener('input', e => update(e.target.value));
        input.addEventListener('input', e => update(e.target.value));
    }

    sync(velSlider, velInput, 'vel');
    sync(dimSlider, dimInput, 'dim');
    sync(densSlider, densInput, 'pop');
    
    velUnit.addEventListener('change', e => {
        localStorage.setItem('igrc_unit', e.target.value);
        renderAll();
    });

    function getVelocityInMS(val, unit) {
        if(unit === 'kmh') return val / 3.6;
        if(unit === 'kt') return val / 1.94384;
        return val;
    }

    function generateTableHTML(title, popInput, velInput_ms, dimInput, mod) {
        // Calculate shifted limits for display
        const pLim = basePopLimits.map(v => (v * mod.popMod));
        const dLim = baseDimLimits.map(v => (v * mod.dimMod));
        const vLim = baseVelLimits.map(v => (v * mod.velMod));

        // Find cell matching the input
        let colDim = dLim.findIndex(limit => dimInput <= limit);
        if (colDim === -1) colDim = 5;
        let colVel = vLim.findIndex(limit => velInput_ms <= limit);
        if (colVel === -1) colVel = 5;
        const col = Math.max(colDim, colVel);

        let row = pLim.findIndex(limit => popInput < limit);
        if (row === -1) row = 5;

        let score = (row < 6 && col < 5) ? igrcMatrix[row][col] : 'N/A';
        let badgeClass = score === 'N/A' ? 'igrc-na' : 'igrc-' + score;

        let html = `
            <div class="tradeoff-card">
                <div class="tradeoff-header">
                    <h3>${title}</h3>
                    <span class="badge ${badgeClass}">iGRC: ${score}</span>
                </div>
                <div class="table-responsive">
                    <table class="sora-style-table">
                        <thead>
                            <tr>
                                <th rowspan="2" class="wide-col">Max Pop. Density (per km&sup2;)</th>
                                <th colspan="5" class="dim-header">Max Characteristic Dimension</th>
                            </tr>
                            <tr>
                                ${dLim.map((d, i) => `<th class="dim-header ${col===i?'highlight-col':''}">&le; ${d.toFixed(1)}m</th>`).join('')}
                            </tr>
                            <tr>
                                <th class="vel-header">Maximum Speed</th>
                                ${vLim.map((v, i) => `<th class="vel-header ${col===i?'highlight-col':''}">&le; ${Math.round(v)} m/s</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${[0,1,2,3,4,5].map(r => `
                            <tr class="${row===r?'highlight-row':''}">
                                <td class="wide-col">${r===5 ? '&gt; '+Math.round(pLim[4]) : '&lt; '+Math.round(pLim[r])}</td>
                                ${[0,1,2,3,4].map(c => `
                                    <td class="${row===r && col===c ? 'highlight-cell' : ''}">${igrcMatrix[r][c]}</td>
                                `).join('')}
                            </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        return html;
    }

    function renderAll() {
        const velRaw = parseFloat(velInput.value) || 0;
        const dim = parseFloat(dimInput.value) || 0;
        const pop = parseFloat(densInput.value) || 0;
        const vel_ms = getVelocityInMS(velRaw, velUnit.value);

        // Render Original (Modifiers = 1.0)
        originalContainer.innerHTML = generateTableHTML(
            "Original Reference Table (T0)", pop, vel_ms, dim, 
            { popMod: 1.0, velMod: 1.0, dimMod: 1.0 }
        );

        // Render T1-T6
        let tHtml = '';
        tradeOffs.forEach(t => {
            tHtml += generateTableHTML(t.name, pop, vel_ms, dim, t);
        });
        tablesContainer.innerHTML = tHtml;
    }

    renderAll();
});