// Constants
const G = 9.81; // Gravity

document.addEventListener('DOMContentLoaded', function() {
    // 1. Initialize listeners
    const inputs = document.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.addEventListener('input', calculateAndDisplay);
        input.addEventListener('change', calculateAndDisplay);
    });

    // 2. Logic for Method Dropdown
    const methodSelect = document.getElementById('contingencyMethod');
    if(methodSelect) {
        methodSelect.addEventListener('change', function() {
            const tpGroup = document.getElementById('tpGroup');
            tpGroup.style.display = (this.value === 'parachute') ? 'block' : 'none';
            calculateAndDisplay();
        });
    }

    // 3. Logic for Aircraft Type (Labels and Icons)
    const aircraftSelect = document.getElementById('aircraftType');
    if(aircraftSelect) {
        aircraftSelect.addEventListener('change', function() {
            updateAircraftUI(this.value);
            calculateAndDisplay();
        });
    }

    // Initial run
    updateAircraftUI(document.getElementById('aircraftType').value); // Ensure correct label on load
    calculateAndDisplay();
});

function updateAircraftUI(type) {
    const angleLabel = document.getElementById('angleLabel');
    const overlayIcon = document.querySelector('#aircraftIconOverlay i');

    if (type === 'multirotor') {
        // Multirotor logic
        if(angleLabel) angleLabel.innerHTML = 'Max Pitch Angle (&theta;)'; // Brake logic
        if(overlayIcon) {
            overlayIcon.className = 'fas fa-helicopter';
            overlayIcon.style.transform = 'rotate(0deg)';
        }
    } else {
        // Fixed Wing logic
        if(angleLabel) angleLabel.innerHTML = 'Max Bank Angle (&phi;)'; // Turn logic
        if(overlayIcon) {
            overlayIcon.className = 'fas fa-plane';
            overlayIcon.style.transform = 'rotate(-10deg)'; // Slight tilt for look
        }
    }
}

function calculateAndDisplay() {
    // --- A. Get Values ---
    const v0 = parseFloat(document.getElementById('v0').value) || 0;
    const hfg = parseFloat(document.getElementById('hfg').value) || 0;
    const hAm = parseFloat(document.getElementById('altitudeMeasurement').value) || 0;
    const tr = parseFloat(document.getElementById('tr').value) || 0;
    const aircraftType = document.getElementById('aircraftType').value;
    const angleVal = parseFloat(document.getElementById('thetaMax').value) || 30;
    const method = document.getElementById('contingencyMethod').value;

    const sGnss = parseFloat(document.getElementById('sGnss').value) || 0;
    const sPos = parseFloat(document.getElementById('sPos').value) || 0;
    const sK = parseFloat(document.getElementById('sK').value) || 0;

    // --- B. Calculations (SORA 2.5 Annex A) ---
    const angleRad = angleVal * (Math.PI / 180);

    // 1. Reaction Phase
    const sR = v0 * tr;
    const hR = v0 * 0.707 * tr; // Vertical 45deg assumption

    // 2. Maneuver Phase (S_CM)
    let sCm = 0;
    let hCm = 0;

    if (method === 'parachute') {
        const tp = parseFloat(document.getElementById('tp').value) || 0;
        sCm = v0 * tp;
        hCm = v0 * 0.707 * tp; 
    } else {
        // Standard Maneuver
        if (aircraftType === 'multirotor') {
            // Multirotor STOP: V^2 / (2 * g * tan(pitch))
            if(angleRad > 0) {
                sCm = (v0 * v0) / (2 * G * Math.tan(angleRad));
            }
            hCm = (v0 * v0) / (2 * G); // Kinetic to Potential
        } else {
            // Fixed Wing TURN: V^2 / (g * tan(bank))
            if(angleRad > 0) {
                sCm = (v0 * v0) / (G * Math.tan(angleRad));
            }
            // Zoom climb factor (30% energy)
            hCm = ((v0 * v0) / (2 * G)) * 0.3; 
        }
    }

    // 3. Totals
    const sCvBuffer = sGnss + sPos + sK + sR + sCm;
    const hCvBuffer = hAm + hR + hCm;
    const hCvTotal = hfg + hCvBuffer;

    // --- C. Update Results ---
    setVal('sCvValue', sCvBuffer.toFixed(1));
    setVal('hCvValue', hCvTotal.toFixed(1));
    
    setVal('det_sR', sR.toFixed(1) + " m");
    setVal('det_sCM', sCm.toFixed(1) + " m");
    setVal('det_hR', hR.toFixed(1) + " m");
    setVal('det_hCM', hCm.toFixed(1) + " m");

    // --- D. Draw ---
    drawVisualization(hfg, sCvBuffer, hCvBuffer, hCvTotal);
}

function setVal(id, content) {
    const el = document.getElementById(id);
    if(el) el.innerText = content;
}

// --- CANVAS LOGIC ---
function drawVisualization(hfg, sBuffer, hBuffer, hTotal) {
    const canvas = document.getElementById('cvCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Clear
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // --- Scaling ---
    const modelFgWidth = 100; // Arbitrary units for FG width
    const targetFgPx = 120;
    let scale = targetFgPx / modelFgWidth;

    const totalWidthM = modelFgWidth + (2 * sBuffer);
    const totalHeightM = hTotal;

    // Increased padding to accommodate horizontal text on sides
    const padX = 70; 
    const padTop = 60; 
    const padBot = 40;
    
    const availW = w - (padX * 2);
    const availH = h - padTop - padBot;

    // Adjust scale if total is too big
    if (totalWidthM * scale > availW) scale = availW / totalWidthM;
    if (totalHeightM * scale > availH) {
        const hScale = availH / totalHeightM;
        if(hScale < scale) scale = hScale;
    }

    // Dimensions in px
    const fgW = modelFgWidth * scale;
    const fgH = hfg * scale;
    const bufW = sBuffer * scale;
    const bufH = hBuffer * scale;

    // Positions
    const centerX = w / 2;
    const groundY = h - padBot;
    const fgX = centerX - (fgW / 2);
    const fgY = groundY - fgH;
    const cvX = fgX - bufW;
    const cvY = fgY - bufH;
    const cvW = fgW + (2 * bufW);
    const cvH = fgH + bufH;

    // --- Update Overlay Icon Position ---
    const overlay = document.getElementById('aircraftIconOverlay');
    if(overlay) {
        const iconY = fgY + (fgH / 2);
        // Canvas wrapper padding is 10px. 
        overlay.style.left = (centerX + 10) + 'px'; 
        overlay.style.top = (iconY + 10) + 'px';
        overlay.style.display = (fgH < 20 || fgW < 20) ? 'none' : 'block';
    }

    // --- DRAWING ---

    // 1. Contingency Volume (Yellow)
    ctx.fillStyle = 'rgba(255, 193, 7, 0.2)';
    ctx.strokeStyle = '#e0a800';
    ctx.lineWidth = 2;
    ctx.strokeRect(cvX, cvY, cvW, cvH);
    ctx.fillRect(cvX, cvY, cvW, cvH);

    // 2. Flight Geography (Green)
    ctx.fillStyle = 'rgba(40, 167, 69, 0.6)';
    ctx.strokeStyle = '#1e7e34';
    ctx.strokeRect(fgX, fgY, fgW, fgH);
    ctx.fillRect(fgX, fgY, fgW, fgH);

    // 3. Ground
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(w, groundY);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 3;
    ctx.stroke();

    // 4. Dimensions - UPDATED TEXT LOGIC
    // Horizontal Buffer (Bottom)
    drawDimension(ctx, cvX, groundY + 20, fgX, groundY + 20, `Buffer: ${sBuffer.toFixed(1)}m`, 'bottom');
    
    // Vertical Margin (Left side) - Horizontal Text
    // We pass 'left' to handle horizontal text positioning to the left of the arrow
    drawDimension(ctx, cvX - 25, fgY, cvX - 25, cvY, `Margin: ${hBuffer.toFixed(1)}m`, 'left');
    
    // Total Height (Right side) - Horizontal Text
    drawDimension(ctx, cvX + cvW + 25, groundY, cvX + cvW + 25, cvY, `Total: ${hTotal.toFixed(1)}m`, 'right');
}

function drawDimension(ctx, x1, y1, x2, y2, text, position) {
    ctx.beginPath();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Determine angle for arrowheads
    const angle = Math.atan2(y2-y1, x2-x1);
    drawArrowHead(ctx, x1, y1, angle + Math.PI);
    drawArrowHead(ctx, x2, y2, angle);

    // Text Settings
    ctx.fillStyle = '#000';
    ctx.font = 'bold 14px Arial'; // Larger and Bold
    
    // Calculate text width for background box
    const textMetrics = ctx.measureText(text);
    const textW = textMetrics.width;
    const textH = 16; // Approx height

    let textX, textY;

    if (position === 'bottom') {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        textX = (x1 + x2) / 2;
        textY = y1 + 8;
    } else if (position === 'left') {
        // Horizontal text to the left of the vertical line
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        textX = x1 - 10;
        textY = (y1 + y2) / 2;
    } else if (position === 'right') {
        // Horizontal text to the right of the vertical line
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        textX = x1 + 10;
        textY = (y1 + y2) / 2;
    }

    // Draw White Background Box for readability
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    let boxX = textX;
    let boxY = textY;

    // Adjust box position based on alignment
    if(ctx.textAlign === 'center') boxX -= (textW / 2 + 2);
    if(ctx.textAlign === 'right') boxX -= (textW + 2);
    if(ctx.textAlign === 'left') boxX -= 2;
    
    if(ctx.textBaseline === 'top') boxY -= 2;
    if(ctx.textBaseline === 'middle') boxY -= (textH / 2 + 2);

    ctx.fillRect(boxX, boxY, textW + 4, textH + 4);
    ctx.restore();

    // Draw Text
    ctx.fillText(text, textX, textY);
}

function drawArrowHead(ctx, x, y, angle) {
    const len = 8; // Slightly larger arrows
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + len * Math.cos(angle - Math.PI/6), y + len * Math.sin(angle - Math.PI/6));
    ctx.lineTo(x + len * Math.cos(angle + Math.PI/6), y + len * Math.sin(angle + Math.PI/6));
    ctx.fillStyle = '#333';
    ctx.fill();
}