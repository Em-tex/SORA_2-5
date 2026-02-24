document.addEventListener("DOMContentLoaded", function() {
    const velSlider = document.getElementById('vel-slider');
    const dimSlider = document.getElementById('dim-slider');
    const densSlider = document.getElementById('dens-slider');
    
    const velVal = document.getElementById('vel-val');
    const dimVal = document.getElementById('dim-val');
    const densVal = document.getElementById('dens-val');
    const tablesContainer = document.getElementById('tables-container');

    // Definisjoner fra SORA 2.5 Annex F
    const tradeOffs = [
        { id: 'T1', name: 'T1: Reduce Pop 50% OR Increase Vel 40%', popMod: 0.5, velMod: 1.4, dimMod: 1.0 },
        { id: 'T2', name: 'T2: Reduce Pop 50% OR Increase Size 100%', popMod: 0.5, velMod: 1.0, dimMod: 2.0 },
        { id: 'T3', name: 'T3: Reduce Size 50% OR Increase Pop 100%', popMod: 2.0, velMod: 1.0, dimMod: 0.5 },
        { id: 'T4', name: 'T4: Reduce Size 50% OR Increase Vel 40%', popMod: 1.0, velMod: 1.4, dimMod: 0.5 },
        { id: 'T5', name: 'T5: Reduce Vel 25% OR Increase Pop 70%', popMod: 1.7, velMod: 0.75, dimMod: 1.0 },
        { id: 'T6', name: 'T6: Reduce Vel 25% OR Increase Size 70%', popMod: 1.0, velMod: 0.75, dimMod: 1.7 }
    ];

    // Grenser basert på SORA 2.5 iGRC Table (fra din index.html)
    const dimLimits = [1, 3, 8, 20, 40];
    const velLimits = [25, 35, 75, 120, 200];
    const popLimits = [5, 50, 500, 5000, 50000]; 

    // Matrix basert på SORA 2.5 tabell (Ekskluderer Controlled Ground Area)
    const igrcMatrix = [
        [2, 3, 4, 5, 6], // < 5
        [3, 4, 5, 6, 7], // < 50
        [4, 5, 6, 7, 8], // < 500
        [5, 6, 7, 8, 9], // < 5,000
        [6, 7, 8, 9, 10], // < 50,000
        [7, 8, 'N/A', 'N/A', 'N/A'] // > 50,000
    ];

    function getIgrcScore(pop, vel, dim, t) {
        // Appliker tradeoff justering
        const effPop = pop / t.popMod;
        const effDim = dim / t.dimMod;
        const effVel = vel / t.velMod;

        // Finn riktig kolonne (Kombinasjon av Dim og Vel)
        let colDim = dimLimits.findIndex(limit => effDim <= limit);
        if (colDim === -1) colDim = 5; // Out of bounds (>40)

        let colVel = velLimits.findIndex(limit => effVel <= limit);
        if (colVel === -1) colVel = 5; // Out of bounds (>200)

        const col = Math.max(colDim, colVel);

        // Finn riktig rad (Pop Density)
        let row = popLimits.findIndex(limit => effPop < limit);
        if (row === -1) row = 5; // Out of bounds (>50000)

        let score = 'N/A';
        if (row < 6 && col < 5) {
            score = igrcMatrix[row][col];
        }

        return { score: score, row: row, col: col };
    }

    function renderTables() {
        const pop = parseFloat(densSlider.value);
        const vel = parseFloat(velSlider.value);
        const dim = parseFloat(dimSlider.value);

        velVal.textContent = vel;
        dimVal.textContent = dim;
        densVal.textContent = pop;

        tablesContainer.innerHTML = '';

        tradeOffs.forEach(t => {
            const result = getIgrcScore(pop, vel, dim, t);
            let badgeHtml = result.score === 'N/A' 
                ? `<span class="badge" style="background-color:#333;">Out of Bounds</span>`
                : `<span class="badge igrc-${result.score}">iGRC: ${result.score}</span>`;
            
            const tableDiv = document.createElement('div');
            tableDiv.className = 'tradeoff-card';
            tableDiv.innerHTML = `
                <h3>${t.name}</h3>
                <div class="result-display">${badgeHtml}</div>
                <div style="overflow-x:auto;">
                    <table class="mini-igrc-table">
                        <tr>
                            <th>Pop / Dim</th>
                            <th class="${result.col===0?'highlight-col':''}">&le; 1m</th>
                            <th class="${result.col===1?'highlight-col':''}">&le; 3m</th>
                            <th class="${result.col===2?'highlight-col':''}">&le; 8m</th>
                            <th class="${result.col===3?'highlight-col':''}">&le; 20m</th>
                            <th class="${result.col===4?'highlight-col':''}">&le; 40m</th>
                        </tr>
                        ${[0,1,2,3,4,5].map(r => `
                        <tr class="${result.row===r?'highlight-row':''}">
                            <td>${r===5 ? '>50k' : '&lt; '+popLimits[r]}</td>
                            ${[0,1,2,3,4].map(c => `
                                <td class="${result.row===r && result.col===c ? 'highlight-cell' : ''}">${igrcMatrix[r][c]}</td>
                            `).join('')}
                        </tr>
                        `).join('')}
                    </table>
                </div>
            `;
            tablesContainer.appendChild(tableDiv);
        });
    }

    velSlider.addEventListener('input', renderTables);
    dimSlider.addEventListener('input', renderTables);
    densSlider.addEventListener('input', renderTables);

    renderTables();
});