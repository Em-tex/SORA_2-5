// Constants
const G = 9.81; // Gravity

const definitions = {
    v0: "Max Ground Speed (V0). Include wind speed! Example: If max airspeed is 10 m/s and max wind is 5 m/s, enter 15 m/s.",
    tr: "Pilot Reaction Time. Time from failure detection to action. Default 1-2s.",
    theta: "Max Pitch/Bank Angle. Used for braking/turning. Lower angle = longer distance (safer buffer).",
    hfg: "Flight Geography Height. Your planned operational ceiling (AGL).",
    altSource: "Altitude Source determines error margin. Barometric is relative (precise), GNSS is absolute (less precise).",
    ham: "Altimetry Error. SORA defaults: 1m for Barometric, 4m for GNSS.",
    sgnss: "GNSS Accuracy. Horizontal position error. Default often 5-10m.",
    spos: "Position Hold Error. Drift while hovering. Often 0-3m.",
    smap: "Map Error. Accuracy of the map data. Often 0-1m."
};

document.addEventListener('DOMContentLoaded', function() {
    setupSliderSync('v0', 'v0-slider');
    setupSliderSync('tr', 'tr-slider');
    setupSliderSync('thetaMax', 'thetaMax-slider');

    const inputs = document.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.addEventListener('input', calculateAndDisplay);
        input.addEventListener('change', calculateAndDisplay);
    });

    const radios = document.querySelectorAll('input[type="radio"]');
    radios.forEach(radio => {
        radio.addEventListener('change', function() {
            if(this.name === 'aircraftType') updateAircraftUI(this.value);
            if(this.name === 'contingencyMethod') {
                document.getElementById('tpGroup').style.display = (this.value === 'parachute') ? 'block' : 'none';
            }
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
            // Adjust left to prevent bubble going off screen on mobile
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

    // RESPONSIVE CANVAS: Listen to resize
    window.addEventListener('resize', () => {
        resizeCanvas();
        calculateAndDisplay();
    });

    // Init
    const initialType = document.querySelector('input[name="aircraftType"]:checked').value;
    updateAircraftUI(initialType);
    
    // Slight delay to ensure layout is done before first draw
    setTimeout(() => {
        resizeCanvas();
        calculateAndDisplay();
    }, 100);
});

function resizeCanvas() {
    const wrapper = document.querySelector('.canvas-wrapper');
    const canvas = document.getElementById('cvCanvas');
    if (wrapper && canvas) {
        // Set actual pixel dimensions to match CSS
        canvas.width = wrapper.clientWidth;
        // Keep good aspect ratio, min height 350
        canvas.height = Math.max(350, wrapper.clientWidth * 0.6);
    }
}

function getTitle(term) {
    // ... same map as before ...
    const map = {
        v0: "Ground Speed (V0)", tr: "Reaction Time (tR)", theta: "Braking Angle",
        hfg: "Flight Geography", altSource: "Altitude Source", ham: "Altimetry Error (Ham)",
        sgnss: "GNSS Error", spos: "Pos. Hold Error", smap: "Map Error"
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

function updateAircraftUI(type) {
    const angleLabel = document.getElementById('angleLabel');
    const overlayIcon = document.querySelector('#aircraftIconOverlay i');
    if (type === 'multirotor') {
        if(angleLabel) angleLabel.innerHTML = 'Max Pitch Angle (&theta;)'; 
        if(overlayIcon) {
            overlayIcon.className = 'fas fa-helicopter';
            overlayIcon.style.transform = 'rotate(0deg)';
        }
    } else {
        if(angleLabel) angleLabel.innerHTML = 'Max Bank Angle (&phi;)'; 
        if(overlayIcon) {
            overlayIcon.className = 'fas fa-plane';
            overlayIcon.style.transform = 'rotate(-10deg)'; 
        }
    }
}

function calculateAndDisplay() {
    const v0 = parseFloat(document.getElementById('v0').value) || 0;
    const hfg = parseFloat(document.getElementById('hfg').value) || 0;
    const hAm = parseFloat(document.getElementById('altitudeMeasurement').value) || 0;
    const tr = parseFloat(document.getElementById('tr').value) || 0;
    
    const aircraftType = document.querySelector('input[name="aircraftType"]:checked').value;
    const method = document.querySelector('input[name="contingencyMethod"]:checked').value;
    const angleVal = parseFloat(document.getElementById('thetaMax').value) || 30;
    
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

    setVal('sCvValue', sCvBuffer.toFixed(1));
    setVal('hCvValue', hCvTotal.toFixed(1));
    setVal('det_sR', sR.toFixed(1) + " m");
    setVal('det_sCM', sCm.toFixed(1) + " m");
    setVal('det_hR', hR.toFixed(1) + " m");
    setVal('det_hCM', hCm.toFixed(1) + " m");
    
    if(document.getElementById('vis_sCV')) document.getElementById('vis_sCV').innerText = sCvBuffer.toFixed(1) + " m";
    if(document.getElementById('vis_hCM')) document.getElementById('vis_hCM').innerText = hCvBuffer.toFixed(1) + " m";

    drawVisualization(hfg, sCvBuffer, hCvBuffer, hCvTotal);
}

function setVal(id, content) {
    const el = document.getElementById(id);
    if(el) el.innerText = content;
}

function drawVisualization(hfg, sBuffer, hBuffer, hTotal) {
    const canvas = document.getElementById('cvCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // --- PRIORITIZED SCALING LOGIC ---
    
    // 1. Define ideal Flight Geography visual width (e.g. 30% of canvas)
    const idealFgPct = 0.35; 
    const idealFgPx = w * idealFgPct;
    
    // Model unit width of Flight Geography (arbitrary, just reference)
    const modelFgWidth = 100; 
    
    // Initial Scale based on keeping FG ideal size
    let scale = idealFgPx / modelFgWidth;

    // Real dimensions in meters
    const totalWidthM = modelFgWidth + (2 * sBuffer);
    const totalHeightM = hTotal;

    // Canvas safety padding (px)
    // Needs to be large enough for text, but adaptable to mobile
    const isMobile = w < 600;
    const padX = isMobile ? 60 : 100; 
    const padTop = 40; 
    const padBot = 60; // Space for bottom text
    
    const availW = w - (padX * 2);
    const availH = h - padTop - padBot;

    // 2. Check if this scale causes overflow
    let currentTotalW = totalWidthM * scale;
    let currentTotalH = totalHeightM * scale;

    // 3. Shrink ONLY if overflow
    if (currentTotalW > availW) {
        scale = availW / totalWidthM;
    }
    if (currentTotalH > availH) {
        // Double check height constraint
        const hScale = availH / totalHeightM;
        if (hScale < scale) scale = hScale;
    }

    // --- Compute Draw Coordinates ---
    const fgW = modelFgWidth * scale;
    const fgH = hfg * scale;
    const bufW = sBuffer * scale;
    const bufH = hBuffer * scale;

    const centerX = w / 2;
    const groundY = h - padBot;
    
    const fgX = centerX - (fgW / 2);
    const fgY = groundY - fgH;
    
    const cvX = fgX - bufW;
    const cvY = fgY - bufH;
    const cvW = fgW + (2 * bufW);
    const cvH = fgH + bufH;

    // --- Icon Update ---
    const overlay = document.getElementById('aircraftIconOverlay');
    if(overlay) {
        const iconY = fgY + (fgH / 2);
        overlay.style.left = (centerX) + 'px'; // Center is center (canvas wrapper handles rel)
        overlay.style.top = (iconY) + 'px';
        
        // Hide if box is too tiny
        if(fgH < 20 || fgW < 20) overlay.style.display = 'none';
        else overlay.style.display = 'block';
    }

    // --- DRAW ---
    // Yellow Box
    ctx.fillStyle = 'rgba(255, 193, 7, 0.2)';
    ctx.strokeStyle = '#e0a800';
    ctx.lineWidth = 2;
    ctx.strokeRect(cvX, cvY, cvW, cvH);
    ctx.fillRect(cvX, cvY, cvW, cvH);

    // Green Box
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

    // Dimensions
    // Use dynamic font size for mobile
    const fontSize = isMobile ? '12px' : '14px';
    ctx.font = `bold ${fontSize} Arial`;

    drawDimension(ctx, cvX, groundY + 25, fgX, groundY + 25, `${sBuffer.toFixed(1)} m`, 'bottom');
    
    const marginLineX = cvX - (isMobile ? 15 : 25);
    drawDimension(ctx, marginLineX, fgY, marginLineX, cvY, `${hBuffer.toFixed(1)} m`, 'left');
    
    const totalLineX = cvX + cvW + (isMobile ? 15 : 25);
    drawDimension(ctx, totalLineX, groundY, totalLineX, cvY, `${hTotal.toFixed(1)} m`, 'right');
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

    ctx.fillStyle = '#000';
    // Font already set in main draw function
    
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

    // COLLISION DETECTION / CLAMPING
    const canvasW = ctx.canvas.width;
    // Left edge check
    if (textX - textW < 5 && position === 'left') {
        textX = x1 + 15; // Move to inside right
        ctx.textAlign = 'left';
    }
    // Right edge check
    if (textX + textW > canvasW - 5 && position === 'right') {
        textX = x1 - 15; // Move to inside left
        ctx.textAlign = 'right';
    }

    // Box Background
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