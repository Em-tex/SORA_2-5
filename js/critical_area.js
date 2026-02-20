// Global variables
let frontalAreaPoints = []; 
const caInputElements = {}; 
const caSliderElements = {}; 
const caInputIds = ['dimension', 'cruiseSpeed', 'mtom', 'minAltitude'];

// Canvas Contexts
let canvasSide, ctxSide, widthSide, heightSide;
let canvasTop, ctxTop, widthTop, heightTop;

const CRITICAL_AREA_KEY = 'critical_area_form_data';

// --- STORAGE FUNCTIONS ---
function saveCriticalAreaForm() {
    const data = {};
    caInputIds.forEach(id => {
        const el = caInputElements[id];
        if (el) data[id] = el.value;
    });
    const rotorEl = document.getElementById('isRotorcraft');
    data['isRotorcraft'] = rotorEl ? rotorEl.checked : false;
    localStorage.setItem(CRITICAL_AREA_KEY, JSON.stringify(data));
}

function loadCriticalAreaForm() {
    const data = JSON.parse(localStorage.getItem(CRITICAL_AREA_KEY));
    if (!data) return;

    caInputIds.forEach(id => {
         const el = caInputElements[id];
         const sliderEl = caSliderElements[id];
         if (el && data[id] !== undefined) {
             el.value = data[id];
             if (sliderEl) sliderEl.value = data[id]; 
         }
    });

    const rotorEl = document.getElementById('isRotorcraft');
    if (rotorEl && data['isRotorcraft'] !== undefined) {
        rotorEl.checked = data['isRotorcraft'];
    }
}

function resetCriticalAreaForm() {
    localStorage.removeItem(CRITICAL_AREA_KEY);
    location.reload();
}

// --- CONSTANTS ---
const R_PERSON = 0.3; 
const H_PERSON = 1.8; 
const G = 9.81; 
const RHO = 1.225; 
const CD_BALLISTIC = 0.8; 
const K_NON_LETHAL = 290; 
const JARUS_IMPACT_ANGLE_DEG = 35; 
const HIGH_ANGLE_THRESHOLD_DEG = 60; 
const COEFF_RESTITUTION_JARUS = 0.65; 
const COEFF_FRICTION = 0.75; 
const OBSTACLE_REDUCTION_FACTOR = 0.6; 

// --- CALCULATION LOGIC ---
function interpolateFrontalArea(dimension) {
    const points = frontalAreaPoints; 
    if (!points || points.length === 0) return 0.1; 
    if (dimension <= points[0].dim) return points[0].area;
    if (dimension >= points[points.length - 1].dim) return points[points.length - 1].area;

    for (let i = 0; i < points.length - 1; i++) {
        if (dimension >= points[i].dim && dimension <= points[i + 1].dim) {
            return points[i].area + ((dimension - points[i].dim) * (points[i+1].area - points[i].area)) / (points[i+1].dim - points[i].dim);
        }
    }
    return points[points.length - 1].area;
}

function calculateImpactAngle(initialHorizontalSpeed, altitude, frontalArea, mass) {
    if (altitude <= 0) return 90;

    let vHorizontal = initialHorizontalSpeed;
    let vVertical = 0;
    let verticalPosition = 0;
    const dt = 0.01;
    let time = 0;
    
    while (verticalPosition > -altitude && time < 300) {
        const vMagnitude = Math.sqrt(vHorizontal * vHorizontal + vVertical * vVertical);
        let dragForceMagnitude = 0;
        if (vMagnitude > 1e-6) dragForceMagnitude = 0.5 * RHO * vMagnitude * vMagnitude * frontalArea * CD_BALLISTIC;

        let accHorizontal = 0;
        let accVertical = -G;

        if (vMagnitude > 1e-6) {
            accHorizontal -= (dragForceMagnitude * (vHorizontal / vMagnitude)) / mass;
            accVertical -= (dragForceMagnitude * (vVertical / vMagnitude)) / mass;
        }

        vHorizontal += accHorizontal * dt;
        vVertical += accVertical * dt;
        verticalPosition += vVertical * dt;
        time += dt;

        if (initialHorizontalSpeed > 0 && vHorizontal < 0) vHorizontal = 0;
    }

    if (Math.abs(vHorizontal) < 1e-6) return 90;
    return Math.atan(Math.abs(vVertical) / Math.abs(vHorizontal)) * (180 / Math.PI);
}

function calculateJarusPhysics(dimension, cruiseSpeed, mass) {
    const w = dimension;
    const thetaRad = JARUS_IMPACT_ANGLE_DEG * (Math.PI / 180);
    const rD = R_PERSON + w / 2;
    const dGlide = H_PERSON / Math.tan(thetaRad); 

    let dSlideReduced = 0;
    if (w > 1) {
        const vHorizontalImpact = cruiseSpeed * Math.cos(thetaRad);
        const vNonLethal = (mass > 0) ? Math.sqrt((2 * K_NON_LETHAL) / mass) : Infinity;
        const vHorizontalAfterImpact = COEFF_RESTITUTION_JARUS * vHorizontalImpact;

        if (vHorizontalAfterImpact > vNonLethal) {
             const tSafe = (vHorizontalAfterImpact - vNonLethal) / (COEFF_FRICTION * G);
             dSlideReduced = vHorizontalAfterImpact * tSafe - 0.5 * COEFF_FRICTION * G * tSafe * tSafe;
             dSlideReduced = Math.max(0, dSlideReduced);
        }
    }
    return { rD: rD, dGlide: dGlide, dSlideReduced: dSlideReduced, angleDeg: JARUS_IMPACT_ANGLE_DEG };
}

function calculateJarusModel(dimension, cruiseSpeed, mass) {
    const phys = calculateJarusPhysics(dimension, cruiseSpeed, mass);
    let Ac = 0;
    const term1 = 2 * phys.rD * (phys.dGlide + phys.dSlideReduced);
    const term2 = Math.PI * phys.rD * phys.rD;

    if (dimension > 8) Ac = term1 + term2;
    else if (dimension > 1 && dimension <= 8) Ac = OBSTACLE_REDUCTION_FACTOR * (term1 + term2);
    else Ac = 2 * phys.rD * phys.dGlide + 0.5 * (Math.PI * phys.rD * phys.rD);
    return Ac;
}

function calculateHighImpactModel(dimension, mass, frontalArea) {
    const vTerminal = (RHO * frontalArea * CD_BALLISTIC > 0) ? Math.sqrt((2 * mass * G) / (RHO * frontalArea * CD_BALLISTIC)) : 0;
    const eKTerminalKJ = (0.5 * mass * vTerminal * vTerminal) / 1000; 

    let Fs = 0;
    if (eKTerminalKJ < 12) Fs = 2.3;
    else if (eKTerminalKJ >= 12 && eKTerminalKJ <= 3125) Fs = 1.4 * Math.pow(eKTerminalKJ, 0.2);
    else Fs = 7.0;
    Fs = Math.max(2.3, Math.min(Fs, 7.0));

    return Fs * Math.PI * Math.pow((R_PERSON + dimension / 2), 2);
}

function highlightTableColumn(criticalArea) {
    const thresholds = [{ limit: 6.5, id: "1m" }, { limit: 65, id: "3m" }, { limit: 650, id: "8m" }, { limit: 6500, id: "20m" }, { limit: 65000, id: "40m" }];
    let highlightedId = "40m";
    if (criticalArea > 0) {
        for (let th of thresholds) {
            if (criticalArea <= th.limit) { highlightedId = th.id; break; }
        }
    }
    thresholds.forEach(th => document.getElementById(`col-${th.id}-head`)?.classList.remove('highlight-col'));
    document.getElementById(`col-${highlightedId}-head`)?.classList.add('highlight-col');
}

// --- VISUALIZATION DRAW HELPERS ---
function drawLabelBox(ctx, text, x, y, bgColor = "#ffffff", textColor = "#333", canvasWidth = 500, canvasHeight = 300, isLarge = false) {
    ctx.font = isLarge ? "bold 15px sans-serif" : "bold 13px sans-serif";
    const metrics = ctx.measureText(text);
    const w = metrics.width + 16;
    const h = isLarge ? 26 : 24;

    const padding = 5;
    let drawX = Math.max(w/2 + padding, Math.min(x, canvasWidth - w/2 - padding));
    let drawY = Math.max(h/2 + padding, Math.min(y, canvasHeight - h/2 - padding));

    ctx.fillStyle = bgColor;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(drawX - w/2, drawY - h/2, w, h, 4);
    else ctx.rect(drawX - w/2, drawY - h/2, w, h);
    ctx.fill();

    ctx.strokeStyle = "#bdc3c7";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = textColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, drawX, drawY + 1); 
}

function drawExplosion(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
        const angle = (i * Math.PI) / 5;
        const radius = (i % 2 === 0) ? 14 : 6;
        ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
    ctx.closePath();
    ctx.fillStyle = "#e74c3c";
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#c0392b";
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI*2);
    ctx.fillStyle = "#f1c40f";
    ctx.fill();
    ctx.restore();
}

// --- RENDER TOP VIEW (Area Footprint) ---
function drawTopView(vizData) {
    if (!ctxTop) return;
    ctxTop.clearRect(0, 0, widthTop, heightTop);

    if (!vizData.isValid) {
        ctxTop.fillStyle = "#95a5a6";
        ctxTop.font = "14px Arial";
        ctxTop.textAlign = "center";
        ctxTop.fillText("Venter på konfigurasjon...", widthTop/2, heightTop/2);
        return;
    }

    const centerY = heightTop / 2;
    
    let rVisMeters = vizData.isHighImpact ? Math.sqrt(vizData.area / Math.PI) : vizData.rD;
    const totalW = vizData.glide + vizData.slide + (rVisMeters * 2);
    const totalH = rVisMeters * 2;
    
    const reqMetersW = Math.max(10, totalW * 1.15);
    const reqMetersH = Math.max(10, totalH * 1.5);
    
    const scale = Math.min((widthTop - 40) / reqMetersW, (heightTop - 60) / reqMetersH);
    
    const glidePx = vizData.glide * scale;
    const slidePx = vizData.slide * scale;
    const rPx = Math.max(15, rVisMeters * scale); // Sperre mot usynlig areal

    const totalWidthPx = glidePx + slidePx;
    const startX = (widthTop - totalWidthPx) / 2; 
    const impactX = startX + glidePx;
    const endX = impactX + slidePx;

    // 1. FOOTPRINT (Rød sone)
    ctxTop.fillStyle = "rgba(231, 76, 60, 0.15)";
    ctxTop.strokeStyle = "#e74c3c";
    ctxTop.lineWidth = 2;
    ctxTop.beginPath();

    if (vizData.isHighImpact) {
        ctxTop.arc(impactX, centerY, rPx, 0, Math.PI * 2);
    } else {
        ctxTop.arc(endX, centerY, rPx, -Math.PI/2, Math.PI/2);
        ctxTop.arc(startX, centerY, rPx, Math.PI/2, -Math.PI/2);
        ctxTop.closePath();
    }
    ctxTop.fill();
    ctxTop.stroke();

    // 2. TEGN BREDDE-MÅL (W)
    const drawWidthLineX = vizData.isHighImpact ? impactX - rPx - 25 : startX - rPx - 25;
    const w_meters = rVisMeters * 2;
    
    ctxTop.beginPath();
    ctxTop.moveTo(drawWidthLineX, centerY - rPx);
    ctxTop.lineTo(drawWidthLineX, centerY + rPx);
    ctxTop.strokeStyle = "#34495e";
    ctxTop.lineWidth = 2;
    ctxTop.setLineDash([4, 4]); ctxTop.stroke(); ctxTop.setLineDash([]);
    
    ctxTop.beginPath();
    ctxTop.moveTo(drawWidthLineX - 5, centerY - rPx + 5); ctxTop.lineTo(drawWidthLineX, centerY - rPx); ctxTop.lineTo(drawWidthLineX + 5, centerY - rPx + 5);
    ctxTop.moveTo(drawWidthLineX - 5, centerY + rPx - 5); ctxTop.lineTo(drawWidthLineX, centerY + rPx); ctxTop.lineTo(drawWidthLineX + 5, centerY + rPx - 5);
    ctxTop.stroke();

    drawLabelBox(ctxTop, `W: ${w_meters.toFixed(1)}m`, drawWidthLineX, centerY, "#f8f9fa", "#2c3e50", widthTop, heightTop, true);

    // 3. PATH LINJER
    if (glidePx > 0) {
        ctxTop.beginPath(); ctxTop.moveTo(startX, centerY); ctxTop.lineTo(impactX, centerY);
        ctxTop.strokeStyle = "#3498db"; ctxTop.lineWidth = 6; ctxTop.stroke();
    }
    if (slidePx > 0) {
        ctxTop.beginPath(); ctxTop.moveTo(impactX, centerY); ctxTop.lineTo(endX, centerY);
        ctxTop.strokeStyle = "#f39c12"; ctxTop.lineWidth = 6; ctxTop.stroke();
    }

    // 4. MARKØRER
    if (vizData.isHighImpact) {
        drawExplosion(ctxTop, impactX, centerY);
    } else {
        if (glidePx > 0) {
            ctxTop.fillStyle = "#e67e22"; ctxTop.beginPath(); ctxTop.arc(impactX, centerY, 5, 0, Math.PI*2); ctxTop.fill();
        }
        drawExplosion(ctxTop, endX, centerY);
    }

    // 5. MÅL OG LABELS
    const lblYBot = centerY + rPx + 20;

    if (vizData.isHighImpact) {
        drawLabelBox(ctxTop, `Area = ${vizData.area.toFixed(1)} m²`, impactX, lblYBot, "#fff0f0", "#c0392b", widthTop, heightTop, true);
    } else {
        ctxTop.beginPath(); ctxTop.moveTo(endX, centerY); ctxTop.lineTo(endX + rPx * 0.7, centerY - rPx * 0.7);
        ctxTop.strokeStyle = "#c0392b"; ctxTop.lineWidth = 2; ctxTop.stroke();
        drawLabelBox(ctxTop, `rD = ${rVisMeters.toFixed(1)}m`, endX + rPx + 20, centerY - rPx, "#fff0f0", "#c0392b", widthTop, heightTop, true);

        if (glidePx > 0) drawLabelBox(ctxTop, `Glide: ${vizData.glide.toFixed(1)}m`, startX + glidePx/2, centerY - rPx - 25, "#eef7fd", "#2980b9", widthTop, heightTop, true);
        if (slidePx > 0) drawLabelBox(ctxTop, `Slide: ${vizData.slide.toFixed(1)}m`, impactX + slidePx/2, centerY + rPx + 25, "#fdf8e3", "#d35400", widthTop, heightTop, true);
    }
}

// --- RENDER SIDE VIEW (Angle & Descent) ---
function drawSideView(vizData) {
    if (!ctxSide) return;
    ctxSide.clearRect(0, 0, widthSide, heightSide);

    if (!vizData.isValid) return;

    const groundY = heightSide - 30; 
    const angleRad = vizData.angle * (Math.PI / 180);

    const h18Px = 50; 
    const maxDrawHeight = groundY - 20; // Høyeste punkt banen tegnes fra
    const impactX = widthSide * 0.70; 

    // 1. BAKKE
    ctxSide.beginPath();
    ctxSide.moveTo(0, groundY); ctxSide.lineTo(widthSide, groundY);
    ctxSide.strokeStyle = "#34495e"; ctxSide.lineWidth = 3; ctxSide.stroke();

    // 2. TEGN BANE (Fra toppen av skjermen og ned)
    let pathStartX, pathStartY;
    let droneX, droneY, droneAngle;
    let personX;

    ctxSide.strokeStyle = "#007bff";
    ctxSide.lineWidth = 3;
    ctxSide.setLineDash([8, 8]);
    ctxSide.beginPath();

    if (vizData.isRotorcraft) {
        // UNIVERSAL PARABEL (for både High Impact og JARUS)
        let H_total = maxDrawHeight;
        let D_total = (2 * H_total) / Math.tan(angleRad);
        
        // Pass på at parabelen ikke starter utenfor venstre kant
        if (impactX - D_total < 20) {
            D_total = impactX - 20;
            H_total = (D_total * Math.tan(angleRad)) / 2;
        }

        pathStartX = impactX - D_total;
        pathStartY = groundY - H_total;

        ctxSide.moveTo(pathStartX, pathStartY);
        for(let i=1; i<=20; i++) {
            let t = i/20;
            let x = pathStartX + t * D_total;
            let y = pathStartY + H_total * (t * t);
            if(y > groundY) { ctxSide.lineTo(x, groundY); break; }
            ctxSide.lineTo(x, y);
        }
        ctxSide.stroke();

        // Plasser dronen på 30% av fallet
        droneX = pathStartX + 0.3 * D_total;
        droneY = pathStartY + H_total * (0.3 * 0.3);
        droneAngle = Math.atan((2 * H_total * 0.3) / D_total);

        // Regn ut hvor y = 1.8m befinner seg på parabelen
        if (H_total >= h18Px) {
            let t_18 = Math.sqrt((H_total - h18Px) / H_total);
            personX = pathStartX + t_18 * D_total;
        }
    } else {
        // RETT LINJE (Fixed Wing JARUS)
        let H_total = maxDrawHeight;
        let D_total = H_total / Math.tan(angleRad);
        
        if (impactX - D_total < 20) {
            D_total = impactX - 20;
            H_total = D_total * Math.tan(angleRad);
        }

        pathStartX = impactX - D_total;
        pathStartY = groundY - H_total;

        ctxSide.moveTo(pathStartX, pathStartY);
        ctxSide.lineTo(impactX, groundY);
        ctxSide.stroke();

        droneX = pathStartX + 0.3 * D_total;
        droneY = pathStartY + 0.3 * H_total;
        droneAngle = angleRad;

        if (H_total >= h18Px) {
            personX = impactX - (h18Px / Math.tan(angleRad));
        }
    }
    ctxSide.setLineDash([]);

    // 3. TEGN PERSON OG SLIDE (KUN HVIS IKKE HIGH IMPACT)
    if (!vizData.isHighImpact && personX !== undefined) {
        const h18Y = groundY - h18Px;
        
        // 1.8m referanselinje
        ctxSide.beginPath();
        ctxSide.moveTo(0, h18Y); ctxSide.lineTo(widthSide, h18Y);
        ctxSide.strokeStyle = "rgba(127, 140, 141, 0.4)"; ctxSide.setLineDash([5, 5]); ctxSide.stroke(); ctxSide.setLineDash([]);
        ctxSide.fillStyle = "#7f8c8d"; ctxSide.font = "bold 12px sans-serif"; ctxSide.textAlign = "left";
        ctxSide.fillText("1.8m Head Height", 10, h18Y - 8);

        // Person Ikon
        ctxSide.font = `900 ${h18Px}px "Font Awesome 6 Free"`;
        ctxSide.fillStyle = "#27ae60";
        ctxSide.textAlign = "center";
        ctxSide.textBaseline = "bottom";
        ctxSide.fillText('\uf183', personX, groundY + 4); 

        // Slide linje (Tegnes proporsjonalt ut fra Glide-avstanden på skjermen)
        if (vizData.slide > 0 && vizData.glide > 0) {
            const glide_vis_px = impactX - personX; 
            let slide_px = (vizData.slide / vizData.glide) * glide_vis_px;
            let endX = impactX + slide_px;
            
            // SPERRE: Kutter streken før den forsvinner ut av vinduet
            if (endX > widthSide - 30) {
                endX = widthSide - 30;
            }

            ctxSide.strokeStyle = "#f39c12";
            ctxSide.beginPath();
            ctxSide.moveTo(impactX, groundY);
            ctxSide.lineTo(endX, groundY);
            ctxSide.stroke();
            
            drawExplosion(ctxSide, endX, groundY);
            ctxSide.fillStyle = "#e67e22"; ctxSide.beginPath(); ctxSide.arc(impactX, groundY, 5, 0, Math.PI*2); ctxSide.fill(); // Impact punkt
        } else {
            drawExplosion(ctxSide, impactX, groundY);
        }
    } else {
        // High Impact (Ingen person. Ren, bratt vinkel som treffer bakken i en eksplosjon)
        drawExplosion(ctxSide, impactX, groundY);
    }

    // 4. TEGN VINKEL-ARK OG LABELS (Kollisjonssikret)
    let arcRadius = 40;
    ctxSide.beginPath();
    ctxSide.moveTo(impactX, groundY); ctxSide.lineTo(impactX - arcRadius - 15, groundY); 
    ctxSide.strokeStyle = "#7f8c8d"; ctxSide.lineWidth = 1; ctxSide.setLineDash([4, 4]); ctxSide.stroke(); ctxSide.setLineDash([]);

    ctxSide.beginPath();
    ctxSide.arc(impactX, groundY, arcRadius, Math.PI, Math.PI + angleRad); 
    ctxSide.strokeStyle = "#e74c3c"; ctxSide.lineWidth = 2; ctxSide.stroke();

    // Plasser vinkelteksten smart. Hvis personen er i nærheten, dytt teksten opp!
    let textX = impactX - arcRadius - 20;
    let textY = groundY - 20;
    
    if (!vizData.isHighImpact && personX !== undefined && Math.abs(textX - personX) < 40) {
        textX = impactX - 25;
        textY = groundY - arcRadius - 25;
    }

    drawLabelBox(ctxSide, `${vizData.angle.toFixed(1)}°`, textX, textY, "#fff0f0", "#c0392b", widthSide, heightSide, true);

    // 5. TEGN DRONE IKON
    ctxSide.save();
    ctxSide.translate(droneX, droneY);
    ctxSide.rotate(droneAngle);
    ctxSide.font = `900 32px "Font Awesome 6 Free"`;
    ctxSide.fillStyle = "#003366";
    ctxSide.textAlign = "center";
    ctxSide.textBaseline = "middle";
    ctxSide.fillText(vizData.isRotorcraft ? '\uf533' : '\uf072', 0, 0); 
    ctxSide.restore();
}

// --- MAIN EXECUTION ---
function calculateCriticalArea() {
    const isRotorcraftEl = document.getElementById('isRotorcraft');
    const isRotorcraft = isRotorcraftEl ? isRotorcraftEl.checked : false;
    
    const dimension = parseFloat(caInputElements.dimension.value);
    const cruiseSpeed = parseFloat(caInputElements.cruiseSpeed.value);
    const mtom = parseFloat(caInputElements.mtom.value);
    const minAltitude = parseFloat(caInputElements.minAltitude.value);

    const resultValueEl = document.getElementById('criticalAreaValue');
    const modelUsedEl = document.getElementById('modelUsed');
    const impactAngleResultEl = document.getElementById('impactAngleResult');

    let vizData = { isValid: false, isRotorcraft: isRotorcraft, dimension: dimension, angle: 90, glide: 0, slide: 0, area: 0, rD: 0, isHighImpact: false };

    if (isNaN(dimension) || isNaN(cruiseSpeed) || isNaN(mtom) || isNaN(minAltitude) ||
        dimension <= 0 || cruiseSpeed < 0 || mtom <= 0 || minAltitude < 0) {
        resultValueEl.textContent = '-';
        modelUsedEl.textContent = 'Model Used: -';
        if (impactAngleResultEl) impactAngleResultEl.style.display = 'none';
        highlightTableColumn(-1);
        saveCriticalAreaForm();
        drawSideView(vizData); 
        drawTopView(vizData);
        return;
    }

    let criticalArea = 0;
    let modelUsed = "";
    let impactAngle = null;

    if (isRotorcraft) {
        const frontalArea = interpolateFrontalArea(dimension);
        impactAngle = calculateImpactAngle(cruiseSpeed, minAltitude, frontalArea, mtom);

        if (impactAngle > HIGH_ANGLE_THRESHOLD_DEG) {
            modelUsed = "High Impact Angle Model";
            if (impactAngleResultEl) {
                impactAngleResultEl.style.display = 'block';
                impactAngleResultEl.innerHTML = `Calculated Impact Angle: <span>${impactAngle.toFixed(1)}°</span> (> 60°)`;
            }
            criticalArea = calculateHighImpactModel(dimension, mtom, frontalArea);
            
            vizData = { isValid: true, isRotorcraft: true, dimension: dimension, angle: impactAngle, glide: 0, slide: 0, area: criticalArea, rD: 0, isHighImpact: true };
        } else {
            modelUsed = `JARUS Model (Standard 35°)`;
            if (impactAngleResultEl) {
                impactAngleResultEl.style.display = 'block';
                impactAngleResultEl.innerHTML = `Calculated ballistic angle: <span>${impactAngle.toFixed(1)}°</span> (< 60°)`;
            }
            const phys = calculateJarusPhysics(dimension, cruiseSpeed, mtom);
            criticalArea = calculateJarusModel(dimension, cruiseSpeed, mtom);
            vizData = { isValid: true, isRotorcraft: true, dimension: dimension, angle: 35, glide: phys.dGlide, slide: phys.dSlideReduced, area: criticalArea, rD: phys.rD, isHighImpact: false };
        }
    } else { 
        modelUsed = "JARUS Model (Standard 35°)";
        if (impactAngleResultEl) impactAngleResultEl.style.display = 'none';
        
        criticalArea = calculateJarusModel(dimension, cruiseSpeed, mtom);
        const phys = calculateJarusPhysics(dimension, cruiseSpeed, mtom);
        vizData = { isValid: true, isRotorcraft: false, dimension: dimension, angle: 35, glide: phys.dGlide, slide: phys.dSlideReduced, area: criticalArea, rD: phys.rD, isHighImpact: false };
    }

    resultValueEl.textContent = criticalArea.toFixed(2);
    modelUsedEl.textContent = `Model Used: ${modelUsed}`;
    highlightTableColumn(criticalArea);
    saveCriticalAreaForm();
    
    drawSideView(vizData);
    drawTopView(vizData);
}

// --- INITIALIZATION & SETUP ---
function setupCanvases() {
    const dpr = window.devicePixelRatio || 1;
    
    const containerSide = document.getElementById('sideViewContainer');
    canvasSide = document.getElementById('caVizCanvas');
    if (containerSide && canvasSide) {
        const rect = containerSide.getBoundingClientRect();
        canvasSide.width = rect.width * dpr;
        canvasSide.height = rect.height * dpr;
        widthSide = rect.width;
        heightSide = rect.height;
        ctxSide = canvasSide.getContext('2d');
        ctxSide.scale(dpr, dpr);
    }

    const containerTop = document.getElementById('topViewContainer');
    canvasTop = document.getElementById('caVizCanvasTop');
    if (containerTop && canvasTop) {
        const rect = containerTop.getBoundingClientRect();
        canvasTop.width = rect.width * dpr;
        canvasTop.height = rect.height * dpr;
        widthTop = rect.width;
        heightTop = rect.height;
        ctxTop = canvasTop.getContext('2d');
        ctxTop.scale(dpr, dpr);
    }
}

async function initializeApp() {
    try {
        const res = await fetch('data/critical_area_config.json');
        if (res.ok) {
            const data = await res.json();
            frontalAreaPoints = data.frontalAreaPoints;
        }
    } catch (err) { 
        console.warn("Using fallbacks.", err); 
    }

    caInputIds.forEach(id => {
        const inputEl = document.getElementById(id);
        const sliderEl = document.getElementById(`${id}Slider`);
        caInputElements[id] = inputEl;
        caSliderElements[id] = sliderEl;

        if (inputEl && sliderEl) {
            inputEl.addEventListener('input', (e) => { sliderEl.value = e.target.value; calculateCriticalArea(); });
            sliderEl.addEventListener('input', (e) => { inputEl.value = e.target.value; calculateCriticalArea(); });
        }
    });

    const isRotorcraftEl = document.getElementById('isRotorcraft');
    if (isRotorcraftEl) isRotorcraftEl.addEventListener('change', calculateCriticalArea);
    document.getElementById('resetCriticalAreaForm').addEventListener('click', resetCriticalAreaForm);

    setupCanvases();
    loadCriticalAreaForm();
    
    document.fonts.ready.then(() => calculateCriticalArea());
    
    window.addEventListener('resize', () => {
         setupCanvases();
         calculateCriticalArea(); 
    });
}

document.addEventListener('DOMContentLoaded', initializeApp);