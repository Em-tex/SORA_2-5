// Constants
const G = 9.81; // Gravity

const definitions = {
    cd: "Characteristic Dimension (CD). The maximum dimension of the drone (e.g., wingspan or rotor-to-rotor diagonal in meters). SORA adds 1/2 CD to GRB calculations.",
    v0: "Max Ground Speed (V0). Include wind speed! Example: If max airspeed is 10 m/s and max wind is 5 m/s, enter 15 m/s.",
    tr: "Pilot Reaction Time. Time from failure detection to action. Default 1-2s.",
    theta: "Max Pitch/Bank Angle. Used for braking/turning. Lower angle = longer distance (safer buffer).",
    hfg: "Flight Geography Height. Your planned operational ceiling (AGL).",
    altSource: "Altitude Source determines error margin. Barometric is relative (precise), GNSS is absolute (less precise).",
    ham: "Altimetry Error. SORA defaults: 1m for Barometric, 4m for GNSS.",
    sgnss: "GNSS Accuracy. Horizontal position error. Default often 5-10m.",
    spos: "Position Hold Error. Drift while hovering. Often 0-3m.",
    smap: "Map Error. Accuracy of the map data. Often 0-1m.",
    grbMethod: "SORA 2.5 defines different ways to calculate the Ground Risk Buffer depending on aircraft behavior after a failure.",
    glideRatio: "Glide Ratio (E). The distance the fixed-wing drone moves horizontally for every 1 m of vertical descent.\n\nTypical examples:\n- Commercial airliner: ~15-20\n- Cessna: ~9\n- Sailplane: ~30-50\n- Typical Fixed-Wing Drone: ~10-15",
    windSpeed: "Max wind speed during operations. Used to calculate how far the parachute will drift.",
    fallSpeed: "The descent rate of the drone while under the parachute."
};

document.addEventListener('DOMContentLoaded', function() {
    loadFromLocalStorage();

    setupSliderSync('v0', 'v0-slider');
    setupSliderSync('tr', 'tr-slider');
    setupSliderSync('thetaMax', 'thetaMax-slider');

    const inputs = document.querySelectorAll('input, select');
    inputs.forEach(input => {
        if (input.type !== 'radio') {
            input.addEventListener('input', calculateAndDisplay);
            input.addEventListener('change', calculateAndDisplay);
        }
    });

    const radios = document.querySelectorAll('input[type="radio"]');
    radios.forEach(radio => {
        radio.addEventListener('change', function() {
            updateVisibility();
            calculateAndDisplay();
        });
    });

    const altSourceSelect = document.getElementById('altSource');
    if (altSourceSelect) {
        altSourceSelect.addEventListener('change', function() {
            const altInput = document.getElementById('altitudeMeasurement');
            if(this.value === 'baro') {
                altInput.value = 1.0; 
            } else {
                altInput.value = 4.0; 
            }
            calculateAndDisplay();
        });
    }

    const bubble = document.getElementById('speechBubble');
    const bubbleTitle = document.getElementById('bubbleTitle');
    const bubbleText = document.getElementById('bubbleText');

    document.querySelectorAll('.info-icon').forEach(icon => {
        icon.addEventListener('click', function(e) {
            e.stopPropagation(); 
            const term = this.getAttribute('data-term');
            bubbleTitle.innerText = getTitle(term);
            bubbleText.innerText = definitions[term] || "Info";
            
            const rect = this.getBoundingClientRect();
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

            bubble.style.display = "block";
            bubble.style.top = (rect.top + scrollTop - bubble.offsetHeight - 10) + 'px';
            let leftPos = rect.left + scrollLeft - 20;
            if (leftPos + 280 > window.innerWidth) {
                leftPos = window.innerWidth - 300; 
            }
            bubble.style.left = Math.max(10, leftPos) + 'px';
        });
    });

    window.addEventListener('click', function(e) {
        if (!bubble.contains(e.target)) {
            bubble.style.display = "none";
        }
    });

    window.addEventListener('resize', () => {
        resizeCanvas();
        calculateAndDisplay();
    });

    updateVisibility();
    
    setTimeout(() => {
        resizeCanvas();
        calculateAndDisplay();
    }, 100);
});

// --- LOCAL STORAGE LOGIC ---

function saveToLocalStorage() {
    const data = {
        charDim: document.getElementById('charDim') ? document.getElementById('charDim').value : '1.0',
        v0: document.getElementById('v0').value,
        tr: document.getElementById('tr').value,
        thetaMax: document.getElementById('thetaMax').value,
        hfg: document.getElementById('hfg').value,
        altitudeMeasurement: document.getElementById('altitudeMeasurement').value,
        sGnss: document.getElementById('sGnss').value,
        sPos: document.getElementById('sPos').value,
        sK: document.getElementById('sK').value,
        tp: document.getElementById('tp') ? document.getElementById('tp').value : '3.0',
        glideRatio: document.getElementById('glideRatio') ? document.getElementById('glideRatio').value : '15',
        windSpeed: document.getElementById('windSpeed') ? document.getElementById('windSpeed').value : '10',
        fallSpeed: document.getElementById('fallSpeed') ? document.getElementById('fallSpeed').value : '3.5',
        altSource: document.getElementById('altSource').value,
        
        aircraftType: document.querySelector('input[name="aircraftType"]:checked').value,
        contingencyMethod: document.querySelector('input[name="contingencyMethod"]:checked').value,
        grbToggle: document.querySelector('input[name="grbToggle"]:checked').value,
        grbMethod: document.querySelector('input[name="grbMethod"]:checked').value
    };
    localStorage.setItem('sora25_cv_data', JSON.stringify(data));
}

function loadFromLocalStorage() {
    const savedData = localStorage.getItem('sora25_cv_data');
    if (savedData) {
        try {
            const data = JSON.parse(savedData);
            
            const textFields = ['charDim', 'v0', 'tr', 'thetaMax', 'hfg', 'altitudeMeasurement', 'sGnss', 'sPos', 'sK', 'tp', 'glideRatio', 'windSpeed', 'fallSpeed', 'altSource'];
            textFields.forEach(id => {
                const el = document.getElementById(id);
                if (el && data[id] !== undefined) {
                    el.value = data[id];
                }
            });

            if(document.getElementById('v0-slider')) document.getElementById('v0-slider').value = data['v0'] || 15;
            if(document.getElementById('tr-slider')) document.getElementById('tr-slider').value = data['tr'] || 1.5;
            if(document.getElementById('thetaMax-slider')) document.getElementById('thetaMax-slider').value = data['thetaMax'] || 30;

            const radioGroups = ['aircraftType', 'contingencyMethod', 'grbToggle', 'grbMethod'];
            radioGroups.forEach(name => {
                if (data[name]) {
                    const radio = document.querySelector(`input[name="${name}"][value="${data[name]}"]`);
                    if (radio) radio.checked = true;
                }
            });
        } catch (e) {
            console.error("Could not parse LocalStorage data", e);
        }
    }
}

// --- VISIBILITY & UI ---

function updateVisibility() {
    const aircraftType = document.querySelector('input[name="aircraftType"]:checked').value;
    updateAircraftUI(aircraftType);

    const contingencyMethod = document.querySelector('input[name="contingencyMethod"]:checked').value;
    document.getElementById('tpGroup').style.display = (contingencyMethod === 'parachute') ? 'block' : 'none';

    const isGrbOn = document.querySelector('input[name="grbToggle"]:checked').value === 'on';
    document.getElementById('grbSection').style.display = isGrbOn ? 'block' : 'none';
    document.getElementById('legendGrb').style.display = isGrbOn ? 'flex' : 'none';
    document.getElementById('grbResultBox').style.display = isGrbOn ? 'block' : 'none';

    const grbMethod = document.querySelector('input[name="grbMethod"]:checked').value;
    document.getElementById('grbGlideGroup').style.display = (grbMethod === 'glide') ? 'block' : 'none';
    document.getElementById('grbDriftGroup').style.display = (grbMethod === 'drift') ? 'block' : 'none';
}

function updateAircraftUI(type) {
    const angleLabel = document.getElementById('angleLabel');
    const overlayIcon = document.querySelector('#aircraftIconOverlay i');
    
    const glideOption = document.getElementById('lbl_grb_glide');
    const ballisticOption = document.getElementById('lbl_grb_ballistic');
    
    const grbGlideRadio = document.getElementById('grb_glide');
    const grbBallisticRadio = document.getElementById('grb_ballistic');
    
    if (type === 'multirotor') {
        if(angleLabel) angleLabel.innerHTML = 'Max Pitch Angle (&theta;)'; 
        if(overlayIcon) overlayIcon.className = 'fas fa-helicopter';
        
        if(glideOption) glideOption.style.display = 'none';
        if(ballisticOption) ballisticOption.style.display = 'flex';
        
        if(grbGlideRadio && grbGlideRadio.checked) {
            document.getElementById('grb_1to1').checked = true;
        }
    } else {
        if(angleLabel) angleLabel.innerHTML = 'Max Bank Angle (&phi;)'; 
        if(overlayIcon) overlayIcon.className = 'fas fa-plane';
        
        if(glideOption) glideOption.style.display = 'flex';
        if(ballisticOption) ballisticOption.style.display = 'none';
        
        if(grbBallisticRadio && grbBallisticRadio.checked) {
            document.getElementById('grb_1to1').checked = true;
        }
    }
}

function resizeCanvas() {
    const wrapper = document.querySelector('.canvas-wrapper');
    const canvas = document.getElementById('cvCanvas');
    if (wrapper && canvas) {
        canvas.width = wrapper.clientWidth;
        canvas.height = Math.max(350, wrapper.clientWidth * 0.6);
    }
}

function getTitle(term) {
    const map = {
        cd: "Characteristic Dimension (CD)",
        v0: "Ground Speed (V0)", tr: "Reaction Time (tR)", theta: "Braking Angle",
        hfg: "Flight Geography", altSource: "Altitude Source", ham: "Altimetry Error (Ham)",
        sgnss: "GNSS Error", spos: "Pos. Hold Error", smap: "Map Error",
        grbMethod: "GRB Method", glideRatio: "Glide Ratio (E)",
        windSpeed: "Wind Speed", fallSpeed: "Descent Speed"
    };
    return map[term] || "Info";
}

function setupSliderSync(numberId, sliderId) {
    const numInput = document.getElementById(numberId);
    const sliderInput = document.getElementById(sliderId);
    if (numInput && sliderInput) {
        sliderInput.addEventListener('input', () => {
            numInput.value = sliderInput.value;
            calculateAndDisplay();
        });
        numInput.addEventListener('input', () => {
            sliderInput.value = numInput.value;
        });
    }
}

window.adjustValue = function(id, amount) {
    const input = document.getElementById(id);
    if (!input) return;
    let current = parseFloat(input.value) || 0;
    let next = current + amount;
    if (input.min && next < parseFloat(input.min)) next = parseFloat(input.min);
    if (input.max && next > parseFloat(input.max)) next = parseFloat(input.max);
    input.value = Math.round(next * 10) / 10;
    input.dispatchEvent(new Event('input')); 
};


// --- CALCULATIONS & DRAWING ---

function calculateAndDisplay() {
    const cd = parseFloat(document.getElementById('charDim').value) || 0;
    const v0 = parseFloat(document.getElementById('v0').value) || 0;
    const hfg = parseFloat(document.getElementById('hfg').value) || 0;
    const hAm = parseFloat(document.getElementById('altitudeMeasurement').value) || 0;
    const tr = parseFloat(document.getElementById('tr').value) || 0;
    
    const aircraftType = document.querySelector('input[name="aircraftType"]:checked').value;
    const method = document.querySelector('input[name="contingencyMethod"]:checked').value;
    const angleVal = parseFloat(document.getElementById('thetaMax').value) || 30;
    
    const overlayIcon = document.querySelector('#aircraftIconOverlay i');
    if (overlayIcon) {
        overlayIcon.style.transform = `rotate(${angleVal}deg)`;
    }

    const sGnss = parseFloat(document.getElementById('sGnss').value) || 0;
    const sPos = parseFloat(document.getElementById('sPos').value) || 0;
    const sK = parseFloat(document.getElementById('sK').value) || 0;

    const angleRad = angleVal * (Math.PI / 180);
    const sR = v0 * tr;
    const hR = v0 * 0.707 * tr; 

    let sCm = 0;
    let hCm = 0;

    if (method === 'parachute') {
        const tp = parseFloat(document.getElementById('tp').value) || 0;
        sCm = v0 * tp;
        hCm = v0 * 0.707 * tp; 
    } else {
        if (aircraftType === 'multirotor') {
            if(angleRad > 0) sCm = (v0 * v0) / (2 * G * Math.tan(angleRad));
            hCm = (v0 * v0) / (2 * G); 
        } else {
            if(angleRad > 0) sCm = (v0 * v0) / (G * Math.tan(angleRad));
            hCm = ((v0 * v0) / G) * 0.3; 
        }
    }

    const sCvBuffer = sGnss + sPos + sK + sR + sCm;
    const hCvBuffer = hAm + hR + hCm;
    const hCvTotal = hfg + hCvBuffer;

    let sGrb = 0;
    let vWind = 0;
    const isGrbOn = document.querySelector('input[name="grbToggle"]:checked').value === 'on';
    const grbMethod = document.querySelector('input[name="grbMethod"]:checked').value;
    
    if (isGrbOn) {
        const halfCd = cd / 2.0;
        if (grbMethod === '1to1') {
            sGrb = hCvTotal + halfCd;
        } else if (grbMethod === 'ballistic') {
            sGrb = v0 * Math.sqrt((2 * hCvTotal) / G) + halfCd;
        } else if (grbMethod === 'glide') {
            const e = parseFloat(document.getElementById('glideRatio').value) || 1;
            sGrb = hCvTotal * e + halfCd;
        } else if (grbMethod === 'drift') {
            vWind = parseFloat(document.getElementById('windSpeed').value) || 0;
            const vFall = parseFloat(document.getElementById('fallSpeed').value) || 1;
            sGrb = (hCvTotal / vFall) * vWind + halfCd;
        }
    }

    setVal('sCvValue', sCvBuffer.toFixed(1));
    setVal('hCvValue', hCvTotal.toFixed(1));
    setVal('det_sR', sR.toFixed(1) + " m");
    setVal('det_sCM', sCm.toFixed(1) + " m");
    setVal('det_hR', hR.toFixed(1) + " m");
    setVal('det_hCM', hCm.toFixed(1) + " m");
    
    if(document.getElementById('leg_fg_h')) document.getElementById('leg_fg_h').innerText = hfg.toFixed(1) + " m";
    if(document.getElementById('leg_cv_w')) document.getElementById('leg_cv_w').innerText = sCvBuffer.toFixed(1) + " m";
    if(document.getElementById('leg_cv_h')) document.getElementById('leg_cv_h').innerText = hCvBuffer.toFixed(1) + " m";
    if(document.getElementById('leg_grb_w')) document.getElementById('leg_grb_w').innerText = sGrb.toFixed(1) + " m";
    if(document.getElementById('sGrbValue')) document.getElementById('sGrbValue').innerText = sGrb.toFixed(1);

    // --- SORA 2.5 WARNINGS LOGIC ---
    let warnings = [];

    // 1. Flight Geography vs CD
    if (cd > 0 && hfg < 3 * cd) {
        warnings.push(`<b>Reminder:</b> SORA requires the Flight Geography dimensions to be at least 3 times the Characteristic Dimension (3 &times; CD = ${(3*cd).toFixed(1)} m). Your current H<sub>FG</sub> is only ${hfg} m.`);
    }

    // 2. Parachute drift wind speed
    if (isGrbOn && grbMethod === 'drift' && vWind < 3) {
        warnings.push("<b>Note:</b> Values below 3 m/s for Max Wind Speed are not considered realistic for parachute drift computation.");
    }

    // Display warnings
    const warningContainer = document.getElementById('warning-container');
    if (warningContainer) {
        if (warnings.length > 0) {
            warningContainer.style.display = 'block';
            warningContainer.innerHTML = warnings.map(w => `<div class="warning-msg"><i class="fas fa-exclamation-triangle"></i><span>${w}</span></div>`).join('');
        } else {
            warningContainer.style.display = 'none';
            warningContainer.innerHTML = '';
        }
    }
    // -------------------------------

    drawVisualization(hfg, sCvBuffer, hCvBuffer, hCvTotal, sGrb);
    
    saveToLocalStorage();
}

function setVal(id, content) {
    const el = document.getElementById(id);
    if(el) el.innerText = content;
}

function drawVisualization(hfg, sBuffer, hBuffer, hTotal, sGrb) {
    const canvas = document.getElementById('cvCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const idealFgPct = 0.35; 
    const idealFgPx = w * idealFgPct;
    const modelFgWidth = 100; 
    let scale = idealFgPx / modelFgWidth;

    const coreWidth = modelFgWidth + (2 * sBuffer);
    
    let visualGrb = sGrb;
    if (visualGrb > coreWidth * 0.6) {
        visualGrb = coreWidth * 0.6; 
    }

    const totalWidthM = coreWidth + (2 * visualGrb);
    const totalHeightM = hTotal;

    const isMobile = w < 600;
    const padX = isMobile ? 60 : 100; 
    const padTop = 40; 
    const padBot = sGrb > 0 ? 80 : 60; 
    
    const availW = w - (padX * 2);
    const availH = h - padTop - padBot;

    let currentTotalW = totalWidthM * scale;
    let currentTotalH = totalHeightM * scale;

    if (currentTotalW > availW) scale = availW / totalWidthM;
    if (currentTotalH > availH) {
        const hScale = availH / totalHeightM;
        if (hScale < scale) scale = hScale;
    }

    const fgW = modelFgWidth * scale;
    const fgH = hfg * scale;
    const bufW = sBuffer * scale;
    const bufH = hBuffer * scale;
    const grbW = visualGrb * scale;

    const centerX = w / 2;
    const groundY = h - padBot;
    
    const fgX = centerX - (fgW / 2);
    const fgY = groundY - fgH;
    
    const cvX = fgX - bufW;
    const cvY = fgY - bufH;
    const cvW = fgW + (2 * bufW);
    const cvH = fgH + bufH;

    const overlay = document.getElementById('aircraftIconOverlay');
    if(overlay) {
        const iconY = fgY + (fgH / 2);
        overlay.style.left = (centerX) + 'px'; 
        overlay.style.top = (iconY) + 'px';
        
        if(fgH < 20 || fgW < 20) overlay.style.display = 'none';
        else overlay.style.display = 'block';
    }

    // 1. GRB Box
    if (sGrb > 0) {
        const grbDrawHeight = 15;
        ctx.fillStyle = 'rgba(220, 53, 69, 0.2)';
        ctx.strokeStyle = '#dc3545';
        ctx.lineWidth = 2;
        
        ctx.strokeRect(cvX - grbW, groundY - grbDrawHeight, grbW, grbDrawHeight);
        ctx.fillRect(cvX - grbW, groundY - grbDrawHeight, grbW, grbDrawHeight);

        ctx.strokeRect(cvX + cvW, groundY - grbDrawHeight, grbW, grbDrawHeight);
        ctx.fillRect(cvX + cvW, groundY - grbDrawHeight, grbW, grbDrawHeight);
    }

    // 2. Yellow Box (Contingency Volume)
    ctx.fillStyle = 'rgba(255, 193, 7, 0.2)';
    ctx.strokeStyle = '#e0a800';
    ctx.lineWidth = 2;
    ctx.strokeRect(cvX, cvY, cvW, cvH);
    ctx.fillRect(cvX, cvY, cvW, cvH);

    // 3. Green Box (Flight Geography)
    ctx.fillStyle = 'rgba(40, 167, 69, 0.6)';
    ctx.strokeStyle = '#1e7e34';
    ctx.strokeRect(fgX, fgY, fgW, fgH);
    ctx.fillRect(fgX, fgY, fgW, fgH);

    // Ground
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(w, groundY);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 3;
    ctx.stroke();

    const fontSize = isMobile ? '11px' : '14px';
    ctx.font = `bold ${fontSize} Arial`;

    drawDimension(ctx, cvX, groundY + 25, fgX, groundY + 25, `${sBuffer.toFixed(1)} m`, 'bottom');
    
    if (sGrb > 0) {
        drawDimension(ctx, cvX + cvW, groundY + 25, cvX + cvW + grbW, groundY + 25, `${sGrb.toFixed(1)} m`, 'bottom');
    }
    
    const marginLineX = cvX - (isMobile ? 15 : 25);
    drawDimension(ctx, marginLineX, groundY, marginLineX, cvY, `${hTotal.toFixed(1)} m`, 'left');

    const hfgLineX = fgX + fgW + (isMobile ? 15 : 25);
    drawDimension(ctx, hfgLineX, groundY, hfgLineX, fgY, `${hfg.toFixed(1)} m`, 'right');
}

function drawDimension(ctx, x1, y1, x2, y2, text, position) {
    ctx.beginPath();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    const angle = Math.atan2(y2-y1, x2-x1);
    drawArrowHead(ctx, x1, y1, angle + Math.PI);
    drawArrowHead(ctx, x2, y2, angle);

    const textMetrics = ctx.measureText(text);
    const textW = textMetrics.width;
    const textH = 16; 

    let textX, textY;

    if (position === 'bottom') {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        textX = (x1 + x2) / 2;
        textY = y1 + 8;
    } else if (position === 'left') {
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        textX = x1 - 10;
        textY = (y1 + y2) / 2;
    } else if (position === 'right') {
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        textX = x1 + 10;
        textY = (y1 + y2) / 2;
    }

    const canvasW = ctx.canvas.width;
    if (textX - textW < 5 && position === 'left') {
        textX = x1 + 15; 
        ctx.textAlign = 'left';
    }
    if (textX + textW > canvasW - 5 && position === 'right') {
        textX = x1 - 15;
        ctx.textAlign = 'right';
    }

    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;
    
    let boxX = textX;
    let boxY = textY;
    const pad = 4;

    if(ctx.textAlign === 'center') boxX -= (textW / 2 + pad);
    if(ctx.textAlign === 'right') boxX -= (textW + pad);
    if(ctx.textAlign === 'left') boxX -= pad;
    
    if(ctx.textBaseline === 'top') boxY -= pad;
    if(ctx.textBaseline === 'middle') boxY -= (textH / 2 + pad);

    ctx.fillRect(boxX, boxY, textW + (pad*2), textH + (pad*2));
    ctx.restore();

    ctx.fillStyle = '#000';
    ctx.fillText(text, textX, textY);
}

function drawArrowHead(ctx, x, y, angle) {
    const len = 8;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + len * Math.cos(angle - Math.PI/6), y + len * Math.sin(angle - Math.PI/6));
    ctx.lineTo(x + len * Math.cos(angle + Math.PI/6), y + len * Math.sin(angle + Math.PI/6));
    ctx.fillStyle = '#333';
    ctx.fill();
}