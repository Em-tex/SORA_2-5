// Global variables
let frontalAreaPoints = [
    { "dim": 0.1, "area": 0.01 },
    { "dim": 0.5, "area": 0.05 },
    { "dim": 1.0, "area": 0.20 },
    { "dim": 3.0, "area": 1.50 },
    { "dim": 8.0, "area": 8.00 },
    { "dim": 20.0, "area": 40.00 },
    { "dim": 40.0, "area": 100.00 }
]; 

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
    
    const speedUnitEl = document.getElementById('speedUnit');
    if(speedUnitEl) data['speedUnit'] = speedUnitEl.value;

    localStorage.setItem(CRITICAL_AREA_KEY, JSON.stringify(data));
}

function loadCriticalAreaForm() {
    const data = JSON.parse(localStorage.getItem(CRITICAL_AREA_KEY));
    if (!data) return;

    caInputIds.forEach(id => {
         const el = caInputElements[id];
         if (el && data[id] !== undefined) {
             el.value = data[id];
             // Trigger input event to update sliders logic
             el.dispatchEvent(new Event('input'));
         }
    });

    const rotorEl = document.getElementById('isRotorcraft');
    if (rotorEl && data['isRotorcraft'] !== undefined) {
        rotorEl.checked = data['isRotorcraft'];
        toggleAltitudeVisibility();
    }

    const speedUnitEl = document.getElementById('speedUnit');
    if (speedUnitEl && data['speedUnit'] !== undefined) {
        speedUnitEl.value = data['speedUnit'];
    }
}

function toggleAltitudeVisibility() {
    const isRotorcraft = document.getElementById('isRotorcraft').checked;
    const altitudeGroup = document.getElementById('altitudeGroup');
    if(altitudeGroup) {
        altitudeGroup.style.display = isRotorcraft ? 'block' : 'none';
    }
}

// --- LOGARITHMIC SLIDER SETUP ---
function setupLogSlider(sliderId, inputId, minVal, maxVal) {
    const slider = document.getElementById(sliderId);
    const input = document.getElementById(inputId);
    if (!slider || !input) return;

    // Vi antar slideren har min=0 og max=1000 i HTML
    const minLog = Math.log(minVal);
    const maxLog = Math.log(maxVal);
    const scale = (maxLog - minLog) / 1000;

    // Slider -> Input
    slider.addEventListener('input', () => {
        const pos = parseFloat(slider.value);
        let val = Math.exp(minLog + scale * pos);
        
        // Pen avrunding
        if (val < 10) val = Math.round(val * 100) / 100;
        else if (val < 100) val = Math.round(val * 10) / 10;
        else val = Math.round(val);
        
        // Clamp
        val = Math.max(minVal, Math.min(val, maxVal));

        // Oppdater kun hvis endret for å unngå loop
        if (parseFloat(input.value) !== val) {
            input.value = val;
            calculateCriticalArea();
        }
    });

    // Input -> Slider
    input.addEventListener('input', () => {
        let val = parseFloat(input.value);
        if (!val || val <= 0) return;

        val = Math.max(minVal, Math.min(val, maxVal));
        const pos = (Math.log(val) - minLog) / scale;
        slider.value = pos;
        calculateCriticalArea();
    });
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
    const dt = 0.05; // Slightly coarser step for performance
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

// TERSKEL-FUNKSJONER FOR OPPSUMMERING
function findTransitionAltitude(speedMS, frontalArea, mass) {
    let low = 0; let high = 2000; 
    if(calculateImpactAngle(speedMS, high, frontalArea, mass) < HIGH_ANGLE_THRESHOLD_DEG) return Infinity; 
    if(calculateImpactAngle(speedMS, 0.1, frontalArea, mass) >= HIGH_ANGLE_THRESHOLD_DEG) return 0; 
    for(let i = 0; i < 20; i++) {
        let mid = (low + high) / 2;
        let angle = calculateImpactAngle(speedMS, mid, frontalArea, mass);
        if(angle >= HIGH_ANGLE_THRESHOLD_DEG) high = mid; else low = mid;
    }
    return (low + high) / 2;
}

function findTransitionSpeed(altitude, frontalArea, mass) {
    let low = 0; let high = 500; 
    if(calculateImpactAngle(high, altitude, frontalArea, mass) >= HIGH_ANGLE_THRESHOLD_DEG) return Infinity; 
    if(calculateImpactAngle(low, altitude, frontalArea, mass) < HIGH_ANGLE_THRESHOLD_DEG) return 0; 
    for(let i = 0; i < 20; i++) {
        let mid = (low + high) / 2;
        let angle = calculateImpactAngle(mid, altitude, frontalArea, mass);
        if(angle >= HIGH_ANGLE_THRESHOLD_DEG) low = mid; else high = mid;
    }
    return (low + high) / 2;
}

function findTransitionDimension(speedMS, altitude, mass) {
    let low = 0.01; let high = 50; 
    if(calculateImpactAngle(speedMS, altitude, interpolateFrontalArea(high), mass) < HIGH_ANGLE_THRESHOLD_DEG) return Infinity; 
    if(calculateImpactAngle(speedMS, altitude, interpolateFrontalArea(low), mass) >= HIGH_ANGLE_THRESHOLD_DEG) return 0; 
    for(let i = 0; i < 20; i++) {
        let mid = (low + high) / 2;
        let angle = calculateImpactAngle(speedMS, altitude, interpolateFrontalArea(mid), mass);
        if(angle >= HIGH_ANGLE_THRESHOLD_DEG) high = mid; else low = mid;
    }
    return (low + high) / 2;
}

function findTransitionMass(speedMS, altitude, dimension) {
    let low = 0.01; let high = 1000; 
    let frontalArea = interpolateFrontalArea(dimension);
    if(calculateImpactAngle(speedMS, altitude, frontalArea, high) >= HIGH_ANGLE_THRESHOLD_DEG) return Infinity; 
    if(calculateImpactAngle(speedMS, altitude, frontalArea, low) < HIGH_ANGLE_THRESHOLD_DEG) return 0; 
    for(let i = 0; i < 20; i++) {
        let mid = (low + high) / 2;
        let angle = calculateImpactAngle(speedMS, altitude, frontalArea, mid);
        if(angle >= HIGH_ANGLE_THRESHOLD_DEG) low = mid; else high = mid;
    }
    return (low + high) / 2;
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
    
    thresholds.forEach(th => {
        document.getElementById(`col-${th.id}-head`)?.classList.remove('highlight-col-head');
        document.getElementById(`col-${th.id}-data`)?.classList.remove('highlight-col-data');
    });
    
    document.getElementById(`col-${highlightedId}-head`)?.classList.add('highlight-col-head');
    document.getElementById(`col-${highlightedId}-data`)?.classList.add('highlight-col-data');
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
        ctxTop.fillText("Waiting for configuration...", widthTop/2, heightTop/2);
        return;
    }

    const centerY = heightTop / 2;
    
    let rVisMeters = vizData.isHighImpact ? Math.sqrt(vizData.area / Math.PI) : vizData.rD;
    const totalW = vizData.glide + vizData.slide + (rVisMeters * 2);
    const totalH = rVisMeters * 2;
    
    const reqMetersW = Math.max(15, totalW * 1.3);
    const reqMetersH = Math.max(15, totalH * 2.5); 
    
    const scale = Math.min((widthTop - 40) / reqMetersW, (heightTop - 60) / reqMetersH);
    
    const glidePx = vizData.glide * scale;
    const slidePx = vizData.slide * scale;
    const rPx = Math.max(10, rVisMeters * scale); 

    const totalWidthPx = glidePx + slidePx;
    const startX = (widthTop - totalWidthPx) / 2; 
    const impactX = startX + glidePx;
    const endX = impactX + slidePx;

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

    drawLabelBox(ctxTop, `W: ${w_meters.toFixed(1)}m`, drawWidthLineX - 10, centerY, "#f8f9fa", "#2c3e50", widthTop, heightTop, true);

    if (glidePx > 0) {
        ctxTop.beginPath(); ctxTop.moveTo(startX, centerY); ctxTop.lineTo(impactX, centerY);
        ctxTop.strokeStyle = "#3498db"; ctxTop.lineWidth = 6; ctxTop.stroke();
    }
    if (slidePx > 0) {
        ctxTop.beginPath(); ctxTop.moveTo(impactX, centerY); ctxTop.lineTo(endX, centerY);
        ctxTop.strokeStyle = "#f39c12"; ctxTop.lineWidth = 6; ctxTop.stroke();
    }

    if (vizData.isHighImpact) {
        drawExplosion(ctxTop, impactX, centerY);
    } else {
        if (glidePx > 0) {
            ctxTop.fillStyle = "#e67e22"; ctxTop.beginPath(); ctxTop.arc(impactX, centerY, 5, 0, Math.PI*2); ctxTop.fill();
        }
        drawExplosion(ctxTop, endX, centerY);
    }

    const lblYBot = centerY + rPx + 20;

    if (vizData.isHighImpact) {
        drawLabelBox(ctxTop, `Area = ${vizData.area.toFixed(1)} m²`, impactX, lblYBot, "#fff0f0", "#c0392b", widthTop, heightTop, true);
    } else {
        ctxTop.beginPath(); ctxTop.moveTo(endX, centerY); ctxTop.lineTo(endX + rPx * 0.7, centerY - rPx * 0.7);
        ctxTop.strokeStyle = "#c0392b"; ctxTop.lineWidth = 2; ctxTop.stroke();
        drawLabelBox(ctxTop, `rD = ${rVisMeters.toFixed(1)}m`, endX + rPx + 20, centerY - rPx - 10, "#fff0f0", "#c0392b", widthTop, heightTop, true);

        if (glidePx > 0) drawLabelBox(ctxTop, `Glide: ${vizData.glide.toFixed(1)}m`, startX + glidePx/2, centerY - rPx - 35, "#eef7fd", "#2980b9", widthTop, heightTop, true);
        if (slidePx > 0) drawLabelBox(ctxTop, `Slide: ${vizData.slide.toFixed(1)}m`, impactX + slidePx/2, centerY + rPx + 35, "#fdf8e3", "#d35400", widthTop, heightTop, true);
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
    const maxDrawHeight = groundY - 20; 
    const impactX = widthSide * 0.75; 

    ctxSide.beginPath();
    ctxSide.moveTo(0, groundY); ctxSide.lineTo(widthSide, groundY);
    ctxSide.strokeStyle = "#34495e"; ctxSide.lineWidth = 3; ctxSide.stroke();

    let pathStartX, pathStartY;
    let droneX, droneY, droneAngle;
    let personX;

    ctxSide.strokeStyle = "#007bff";
    ctxSide.lineWidth = 3;
    ctxSide.setLineDash([8, 8]);
    ctxSide.beginPath();

    if (vizData.isRotorcraft) {
        let H_total = maxDrawHeight;
        let D_total = (2 * H_total) / Math.tan(angleRad);
        
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

        droneX = pathStartX + 0.15 * D_total;
        droneY = pathStartY + H_total * (0.15 * 0.15);
        droneAngle = Math.atan((2 * H_total * 0.15) / D_total);

        if (H_total >= h18Px) {
            let t_18 = Math.sqrt((H_total - h18Px) / H_total);
            personX = pathStartX + t_18 * D_total;
        }
    } else {
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

        droneX = pathStartX + 0.15 * D_total;
        droneY = pathStartY + 0.15 * H_total;
        droneAngle = angleRad;

        if (H_total >= h18Px) {
            personX = impactX - (h18Px / Math.tan(angleRad));
        }
    }
    ctxSide.setLineDash([]);

    const h18Y = groundY - h18Px;
    if (!vizData.isHighImpact && personX !== undefined) {
        
        ctxSide.beginPath();
        ctxSide.moveTo(0, h18Y); ctxSide.lineTo(widthSide, h18Y);
        ctxSide.strokeStyle = "rgba(127, 140, 141, 0.4)"; ctxSide.setLineDash([5, 5]); ctxSide.stroke(); ctxSide.setLineDash([]);
        
        ctxSide.fillStyle = "#7f8c8d"; ctxSide.font = "bold 12px sans-serif"; ctxSide.textAlign = "left";
        
        let textHeadX = 10;
        if (pathStartX < 120 && pathStartY < h18Y) { textHeadX = pathStartX + 20; }
        let textHeadY = h18Y - 8;
        if (textHeadY < 15) textHeadY = h18Y + 15; 
        ctxSide.fillText("1.8m Head Height", textHeadX, textHeadY);

        ctxSide.font = `900 ${h18Px}px "Font Awesome 6 Free"`;
        ctxSide.fillStyle = "#27ae60";
        ctxSide.textAlign = "center";
        ctxSide.textBaseline = "bottom";
        ctxSide.fillText('\uf183', personX, groundY + 4); 

        if (vizData.slide > 0 && vizData.glide > 0) {
            const glide_vis_px = impactX - personX; 
            let slide_px = (vizData.slide / vizData.glide) * glide_vis_px;
            let endX = impactX + slide_px;
            
            if (endX > widthSide - 30) endX = widthSide - 30;

            ctxSide.strokeStyle = "#f39c12";
            ctxSide.beginPath();
            ctxSide.moveTo(impactX, groundY);
            ctxSide.lineTo(endX, groundY);
            ctxSide.stroke();
            
            drawExplosion(ctxSide, endX, groundY);
            ctxSide.fillStyle = "#e67e22"; ctxSide.beginPath(); ctxSide.arc(impactX, groundY, 5, 0, Math.PI*2); ctxSide.fill(); 
        } else {
            drawExplosion(ctxSide, impactX, groundY);
        }
    } else {
        drawExplosion(ctxSide, impactX, groundY);
    }

    let availableSpace = impactX - pathStartX;
    let arcRadius = Math.min(45, Math.max(20, availableSpace * 0.5)); 

    ctxSide.beginPath();
    ctxSide.moveTo(impactX, groundY); ctxSide.lineTo(impactX - arcRadius - 15, groundY); 
    ctxSide.strokeStyle = "#7f8c8d"; ctxSide.lineWidth = 1; ctxSide.setLineDash([4, 4]); ctxSide.stroke(); ctxSide.setLineDash([]);

    ctxSide.beginPath();
    ctxSide.arc(impactX, groundY, arcRadius, Math.PI, Math.PI + angleRad); 
    ctxSide.strokeStyle = "#e74c3c"; ctxSide.lineWidth = 2; ctxSide.stroke();

    let textX = impactX - arcRadius - 30;
    let textY = groundY - arcRadius - 10;
    if (textX < 30) textX = 30; 
    
    if (vizData.angle > 70) { 
        textX = impactX - arcRadius - 40;
        textY = groundY - 50;
    } else if (vizData.angle > 45 || (!vizData.isHighImpact && personX !== undefined && Math.abs(textX - personX) < 60)) {
        textX = impactX - arcRadius - 20;
        textY = h18Y - 30; 
    }

    drawLabelBox(ctxSide, `${vizData.angle.toFixed(1)}°`, textX, textY, "#fff0f0", "#c0392b", widthSide, heightSide, true);

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
    const mtom = parseFloat(caInputElements.mtom.value);
    const minAltitude = parseFloat(caInputElements.minAltitude.value);

    const rawSpeed = parseFloat(caInputElements.cruiseSpeed.value);
    const speedUnit = document.getElementById('speedUnit').value;
    let cruiseSpeed = rawSpeed; 
    if (speedUnit === 'kmh') cruiseSpeed = rawSpeed / 3.6;
    if (speedUnit === 'kt') cruiseSpeed = rawSpeed * 0.514444;

    const resultValueEl = document.getElementById('criticalAreaValue');
    const modelUsedEl = document.getElementById('modelUsed');
    const impactAngleResultEl = document.getElementById('impactAngleResult');
    const modelSwitchDisplayEl = document.getElementById('modelSwitchDisplay');

    let vizData = { isValid: false, isRotorcraft: isRotorcraft, dimension: dimension, angle: 90, glide: 0, slide: 0, area: 0, rD: 0, isHighImpact: false };

    if (isNaN(dimension) || isNaN(cruiseSpeed) || isNaN(mtom) || (isRotorcraft && isNaN(minAltitude)) ||
        dimension <= 0 || cruiseSpeed < 0 || mtom <= 0 || (isRotorcraft && minAltitude < 0)) {
        resultValueEl.textContent = '-';
        modelUsedEl.textContent = 'Model Used: -';
        if (impactAngleResultEl) impactAngleResultEl.style.display = 'none';
        if (modelSwitchDisplayEl) modelSwitchDisplayEl.style.display = 'none';
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

        const switchAlt = findTransitionAltitude(cruiseSpeed, frontalArea, mtom);
        const switchSpd = findTransitionSpeed(minAltitude, frontalArea, mtom);
        const switchDim = findTransitionDimension(cruiseSpeed, minAltitude, mtom);
        const switchMass = findTransitionMass(cruiseSpeed, minAltitude, dimension);
        
        let spdDisp = switchSpd;
        let spdUnitStr = 'm/s';
        if (speedUnit === 'kmh') { spdDisp = switchSpd * 3.6; spdUnitStr = 'km/h'; }
        if (speedUnit === 'kt') { spdDisp = switchSpd / 0.514444; spdUnitStr = 'kt'; }

        let altText = (switchAlt === Infinity) ? "Never" : (switchAlt === 0) ? "Always" : `> ${switchAlt.toFixed(0)} m`;
        let spdText = (switchSpd === Infinity) ? "Always" : (switchSpd === 0) ? "Never" : `< ${spdDisp.toFixed(1)} ${spdUnitStr}`;
        let dimText = (switchDim === Infinity) ? "Never" : (switchDim === 0) ? "Always" : `> ${switchDim.toFixed(1)} m`;
        let massText = (switchMass === Infinity) ? "Always" : (switchMass === 0) ? "Never" : `< ${switchMass.toFixed(1)} kg`;

        if (modelSwitchDisplayEl) {
            modelSwitchDisplayEl.style.display = 'block';
            modelSwitchDisplayEl.innerHTML = `<strong>High Impact Angle Model (>60°) triggers if (with current parameters):</strong><br>
            • Altitude: <strong>${altText}</strong><br>
            • Speed: <strong>${spdText}</strong><br>
            • Dimension: <strong>${dimText}</strong><br>
            • MTOM: <strong>${massText}</strong>`;
        }

        if (impactAngle > HIGH_ANGLE_THRESHOLD_DEG) {
            modelUsed = "High Impact Angle Model";
            if (impactAngleResultEl) {
                impactAngleResultEl.style.display = 'block';
                impactAngleResultEl.innerHTML = `Calculated Impact Angle: <span>${impactAngle.toFixed(1)}°</span> (> 60°)`;
            }
            criticalArea = calculateHighImpactModel(dimension, mtom, frontalArea);
            
            vizData = { isValid: true, isRotorcraft: true, dimension: dimension, angle: impactAngle, glide: 0, slide: 0, area: criticalArea, rD: 0, isHighImpact: true };
        } else {
            modelUsed = `JARUS Model (Calculated < 60°)`;
            if (impactAngleResultEl) {
                impactAngleResultEl.style.display = 'block';
                impactAngleResultEl.innerHTML = `Calculated ballistic angle: <span>${impactAngle.toFixed(1)}°</span> (< 60°)`;
            }
            const phys = calculateJarusPhysics(dimension, cruiseSpeed, mtom);
            criticalArea = calculateJarusModel(dimension, cruiseSpeed, mtom);
            vizData = { isValid: true, isRotorcraft: true, dimension: dimension, angle: impactAngle, glide: phys.dGlide, slide: phys.dSlideReduced, area: criticalArea, rD: phys.rD, isHighImpact: false };
        }
    } else { 
        modelUsed = "JARUS Model (Standard 35°)";
        if (impactAngleResultEl) impactAngleResultEl.style.display = 'none';
        if (modelSwitchDisplayEl) modelSwitchDisplayEl.style.display = 'none';
        
        criticalArea = calculateJarusModel(dimension, cruiseSpeed, mtom);
        const phys = calculateJarusPhysics(dimension, cruiseSpeed, mtom);
        vizData = { isValid: true, isRotorcraft: false, dimension: dimension, angle: 35, glide: phys.dGlide, slide: phys.dSlideReduced, area: criticalArea, rD: phys.rD, isHighImpact: false };
    }

    // --- NYTT: Lagre resultatet for bruk i Analytical Formula ---
    localStorage.setItem('sora_last_calculated_ac', criticalArea.toFixed(2));
    // -----------------------------------------------------------

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

function initializeApp() {
    caInputIds.forEach(id => {
        const inputEl = document.getElementById(id);
        const sliderEl = document.getElementById(`${id}Slider`);
        caInputElements[id] = inputEl;
        caSliderElements[id] = sliderEl;

        // Skip standard listener if using Log Slider helper (it adds its own)
        // But for safety, keep existing logic unless overridden
    });

    // --- SETT OPP LOGARITMISKE SLIDERE ---
    // Dimension: 0.1m til 50m (Utvidet range)
    setupLogSlider('dimensionSlider', 'dimension', 0.1, 50);
    // MTOM: 0.1kg til 500kg
    setupLogSlider('mtomSlider', 'mtom', 0.1, 500);
    // Speed: 0 til 150 (enhet varierer, men slider dekker verdiene)
    setupLogSlider('cruiseSpeedSlider', 'cruiseSpeed', 1, 150);

    // Altitude: Lineær
    const altSlider = document.getElementById('minAltitudeSlider');
    const altInput = document.getElementById('minAltitude');
    if(altSlider && altInput) {
        altSlider.addEventListener('input', () => { altInput.value = altSlider.value; calculateCriticalArea(); });
        altInput.addEventListener('input', () => { altSlider.value = altInput.value; calculateCriticalArea(); });
    }

    const isRotorcraftEl = document.getElementById('isRotorcraft');
    if (isRotorcraftEl) {
        isRotorcraftEl.addEventListener('change', () => {
            toggleAltitudeVisibility();
            calculateCriticalArea();
        });
    }

    const speedUnitEl = document.getElementById('speedUnit');
    if(speedUnitEl) speedUnitEl.addEventListener('change', calculateCriticalArea);

    document.getElementById('resetCriticalAreaForm').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem(CRITICAL_AREA_KEY);
        // Remove also the result calculation if resetting
        localStorage.removeItem('sora_last_calculated_ac'); 
        
        caInputIds.forEach(id => {
            if (caInputElements[id]) caInputElements[id].value = '';
        });

        // Set reasonable defaults to avoid errors
        if(caInputElements['dimension']) caInputElements['dimension'].value = 1;
        if(caInputElements['mtom']) caInputElements['mtom'].value = 2.5;
        if(caInputElements['cruiseSpeed']) caInputElements['cruiseSpeed'].value = 15;
        if(caInputElements['minAltitude']) caInputElements['minAltitude'].value = 50;
        
        // Trigger updates
        if(caInputElements['dimension']) caInputElements['dimension'].dispatchEvent(new Event('input'));
        if(caInputElements['mtom']) caInputElements['mtom'].dispatchEvent(new Event('input'));

        const rotorEl = document.getElementById('isRotorcraft');
        if (rotorEl) rotorEl.checked = false;
        
        const speedUnitEl = document.getElementById('speedUnit');
        if (speedUnitEl) speedUnitEl.value = 'ms';

        toggleAltitudeVisibility();
        calculateCriticalArea();
    });

    setupCanvases();
    loadCriticalAreaForm();
    
    calculateCriticalArea();
    document.fonts.ready.then(() => calculateCriticalArea());
    
    window.addEventListener('resize', () => {
         setupCanvases();
         calculateCriticalArea(); 
    });
}

document.addEventListener('DOMContentLoaded', initializeApp);