// Global variables
let frontalAreaPoints = []; // Loaded from JSON
const caInputElements = {}; 
const caSliderElements = {}; 
const caInputIds = ['dimension', 'cruiseSpeed', 'mtom', 'minAltitude']; // Numeric inputs

// Canvas Context
let canvas, ctx;

// --- STORAGE FUNCTIONS ---
const CRITICAL_AREA_KEY = 'critical_area_form_data';

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
             if (sliderEl) sliderEl.value = data[id]; // Sync slider
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

// --- CONSTANTS (SORA 2.5 Annex F) ---
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
            const dim1 = points[i].dim;
            const area1 = points[i].area;
            const dim2 = points[i + 1].dim;
            const area2 = points[i + 1].area;
            return area1 + ((dimension - dim1) * (area2 - area1)) / (dim2 - dim1);
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
    const maxTime = 300; 

    while (verticalPosition > -altitude && time < maxTime) {
        const vMagnitude = Math.sqrt(vHorizontal * vHorizontal + vVertical * vVertical);
        let dragForceMagnitude = 0;
        if (vMagnitude > 1e-6) {
             dragForceMagnitude = 0.5 * RHO * vMagnitude * vMagnitude * frontalArea * CD_BALLISTIC;
        }

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
        if (initialHorizontalSpeed === 0) vHorizontal = 0;
    }

    if (Math.abs(vHorizontal) < 1e-6) return 90;
    const finalImpactAngleRad = Math.atan(Math.abs(vVertical) / Math.abs(vHorizontal));
    return finalImpactAngleRad * (180 / Math.PI);
}

function calculateJarusPhysics(dimension, cruiseSpeed, mass) {
    const w = dimension;
    const vImpact = cruiseSpeed;
    const m = mass;
    const thetaRad = JARUS_IMPACT_ANGLE_DEG * (Math.PI / 180);

    const rD = R_PERSON + w / 2;
    const dGlide = H_PERSON / Math.tan(thetaRad); 

    let dSlideReduced = 0;
    if (w > 1) {
        const vHorizontalImpact = vImpact * Math.cos(thetaRad);
        const vNonLethal = (m > 0) ? Math.sqrt((2 * K_NON_LETHAL) / m) : Infinity;
        const vHorizontalAfterImpact = COEFF_RESTITUTION_JARUS * vHorizontalImpact;

        if (vHorizontalAfterImpact > vNonLethal) {
             const tSafe = (vHorizontalAfterImpact - vNonLethal) / (COEFF_FRICTION * G);
             dSlideReduced = vHorizontalAfterImpact * tSafe - 0.5 * COEFF_FRICTION * G * tSafe * tSafe;
             dSlideReduced = Math.max(0, dSlideReduced);
        }
    }

    return {
        rD: rD,
        dGlide: dGlide,
        dSlideReduced: dSlideReduced,
        angleDeg: JARUS_IMPACT_ANGLE_DEG
    };
}

function calculateJarusModel(dimension, cruiseSpeed, mass) {
    const phys = calculateJarusPhysics(dimension, cruiseSpeed, mass);
    let Ac = 0;
    const term1 = 2 * phys.rD * (phys.dGlide + phys.dSlideReduced);
    const term2 = Math.PI * phys.rD * phys.rD;

    if (dimension >= 8) { 
        Ac = term1 + term2;
    } else if (dimension > 1 && dimension < 8) { 
        Ac = OBSTACLE_REDUCTION_FACTOR * (term1 + term2);
    } else { 
        Ac = 2 * phys.rD * phys.dGlide + 0.5 * (Math.PI * phys.rD * phys.rD);
    }
    return Ac;
}

function calculateHighImpactModel(dimension, mass, frontalArea) {
    const w = dimension;
    const m = mass;
    const A = frontalArea;

    const vTerminal = (RHO * A * CD_BALLISTIC > 0) ? Math.sqrt((2 * m * G) / (RHO * A * CD_BALLISTIC)) : 0;
    const eKTerminal = 0.5 * m * vTerminal * vTerminal; 
    const eKTerminalKJ = eKTerminal / 1000;

    let Fs = 0;
    if (eKTerminalKJ < 12) {
        Fs = 2.3;
    } else if (eKTerminalKJ >= 12 && eKTerminalKJ <= 3125) {
        Fs = 1.4 * Math.pow(eKTerminalKJ, 0.2);
    } else {
        Fs = 7.0;
    }
     Fs = Math.max(2.3, Math.min(Fs, 7.0));

    const rD = R_PERSON + w / 2;
    return Fs * Math.PI * rD * rD;
}

function highlightTableColumn(criticalArea) {
    const thresholds = [
        { limit: 6.5, id: "1m" },
        { limit: 65, id: "3m" },
        { limit: 650, id: "8m" },
        { limit: 6500, id: "20m" },
        { limit: 65000, id: "40m" }
    ];

    let highlightedId = null;
    if (criticalArea > 0) {
         if (criticalArea <= thresholds[0].limit) highlightedId = thresholds[0].id;
         else if (criticalArea <= thresholds[1].limit) highlightedId = thresholds[1].id;
         else if (criticalArea <= thresholds[2].limit) highlightedId = thresholds[2].id;
         else if (criticalArea <= thresholds[3].limit) highlightedId = thresholds[3].id;
         else highlightedId = thresholds[4].id;
    }

    thresholds.forEach(th => {
        document.getElementById(`col-${th.id}-head`)?.classList.remove('highlight-col');
    });

    if (highlightedId) {
        document.getElementById(`col-${highlightedId}-head`)?.classList.add('highlight-col');
    }
}

/**
 * --- VISUALIZATION RENDERER ---
 */
function updateVisualization(vizData) {
    if (!ctx || !canvas) return;

    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);

    if (!vizData.isValid) {
        ctx.fillStyle = "#95a5a6";
        ctx.font = "14px Arial";
        ctx.textAlign = "left";
        ctx.fillText("Waiting for valid inputs to draw...", 20, 30);
        return;
    }

    const groundY = height - 30;
    const startX = 50; 

    const totalDistanceMeters = vizData.glide + vizData.slide;
    const displayMeters = Math.max(5, totalDistanceMeters * 1.5); 
    const scale = (width - 100) / displayMeters; 

    const personX = startX + (vizData.glide * scale);
    const stopX = personX + (vizData.slide * scale);
    
    // 1. Draw Ground
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(width, groundY);
    ctx.strokeStyle = "#34495e";
    ctx.lineWidth = 2;
    ctx.stroke();

    // 2. Draw Critical Area Impact Zone
    const impactZoneStart = personX - (vizData.glide * scale); 
    ctx.fillStyle = "rgba(220, 53, 69, 0.3)";
    ctx.fillRect(impactZoneStart, groundY - 5, stopX - impactZoneStart, 10);
    
    // 3. Draw Person (Symbolic)
    const personH_px = 1.8 * scale * 2; 
    const pHeight = Math.max(20, Math.min(personH_px, 60)); 
    
    ctx.fillStyle = "#28a745";
    ctx.beginPath();
    ctx.arc(personX, groundY - pHeight, 5, 0, Math.PI*2); 
    ctx.fill();
    ctx.fillRect(personX - 2, groundY - pHeight, 4, pHeight);

    // 4. Draw Drone Path
    const angleRad = vizData.angle * (Math.PI / 180);
    let droneY = groundY - (Math.tan(angleRad) * (vizData.glide * scale));
    
    if (vizData.angle > 85) droneY = 20; 
    const drawDroneY = Math.max(20, droneY); 
    const drawDroneX = personX - ((groundY - drawDroneY) / Math.tan(angleRad));

    ctx.beginPath();
    ctx.moveTo(drawDroneX, drawDroneY);
    ctx.lineTo(personX, groundY - (pHeight/2)); 
    ctx.strokeStyle = "#007bff";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]); 
    ctx.stroke();
    ctx.setLineDash([]);

    // 5. Draw FontAwesome Icon
    ctx.save();
    ctx.translate(drawDroneX, drawDroneY);
    ctx.rotate(angleRad);
    
    // Bruk FontAwesome for ikonene (\uf533 = helicopter, \uf072 = plane)
    ctx.font = '900 24px "Font Awesome 6 Free"';
    ctx.fillStyle = "#003366";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (vizData.isRotorcraft) {
        ctx.fillText('\uf533', 0, 0); // fa-helicopter
    } else {
        ctx.fillText('\uf072', 0, 0); // fa-plane
    }
    
    ctx.restore();

    // 6. Labels
    ctx.fillStyle = "#333";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    
    ctx.fillText(`${vizData.angle.toFixed(1)}°`, drawDroneX + 25, drawDroneY + 15);
    
    ctx.font = "12px sans-serif";
    ctx.fillText(`Glide: ${vizData.glide.toFixed(1)}m`, (startX + personX)/2, groundY + 20);
    
    if (vizData.slide > 0.1) {
        ctx.fillText(`Slide: ${vizData.slide.toFixed(1)}m`, (personX + stopX)/2, groundY + 20);
    }
}

/**
 * MAIN EXECUTION
 */
function calculateCriticalArea() {
    if (frontalAreaPoints.length === 0) return;

    const isRotorcraftEl = document.getElementById('isRotorcraft');
    const isRotorcraft = isRotorcraftEl ? isRotorcraftEl.checked : false;
    
    const dimension = parseFloat(caInputElements.dimension.value);
    const cruiseSpeed = parseFloat(caInputElements.cruiseSpeed.value);
    const mtom = parseFloat(caInputElements.mtom.value);
    const minAltitude = parseFloat(caInputElements.minAltitude.value);

    const resultValueEl = document.getElementById('criticalAreaValue');
    const modelUsedEl = document.getElementById('modelUsed');
    const impactAngleResultEl = document.getElementById('impactAngleResult');

    let vizData = { isValid: false, isRotorcraft: isRotorcraft, angle: 90, glide: 0, slide: 0 };

    if (isNaN(dimension) || isNaN(cruiseSpeed) || isNaN(mtom) || isNaN(minAltitude) ||
        dimension <= 0 || cruiseSpeed < 0 || mtom <= 0 || minAltitude < 0) {
        resultValueEl.textContent = '-';
        modelUsedEl.textContent = 'Model Used: -';
        impactAngleResultEl.style.display = 'none';
        highlightTableColumn(-1);
        saveCriticalAreaForm();
        updateVisualization(vizData);
        return;
    }

    let criticalArea = 0;
    let modelUsed = "";
    let impactAngle = null;

    if (isRotorcraft) {
        const frontalArea = interpolateFrontalArea(dimension);
        impactAngle = calculateImpactAngle(cruiseSpeed, minAltitude, frontalArea, mtom);
        impactAngleResultEl.style.display = 'block';
        impactAngleResultEl.innerHTML = `Calculated Impact Angle: <span>${impactAngle.toFixed(1)}</span> °`;

        if (impactAngle > HIGH_ANGLE_THRESHOLD_DEG) {
            modelUsed = "High Impact Angle Model";
            criticalArea = calculateHighImpactModel(dimension, mtom, frontalArea);
            vizData = { isValid: true, isRotorcraft: true, angle: impactAngle, glide: 0.1, slide: 0 };
        } else {
            modelUsed = "JARUS Model (Calculated Angle < 60°)";
            const phys = calculateJarusPhysics(dimension, cruiseSpeed, mtom);
            criticalArea = calculateJarusModel(dimension, cruiseSpeed, mtom);
            vizData = { isValid: true, isRotorcraft: true, angle: 35, glide: phys.dGlide, slide: phys.dSlideReduced };
        }
    } else { 
        modelUsed = "JARUS Model (Standard 35°)";
        impactAngleResultEl.style.display = 'none';
        criticalArea = calculateJarusModel(dimension, cruiseSpeed, mtom);
        const phys = calculateJarusPhysics(dimension, cruiseSpeed, mtom);
        vizData = { isValid: true, isRotorcraft: false, angle: 35, glide: phys.dGlide, slide: phys.dSlideReduced };
    }

    resultValueEl.textContent = criticalArea.toFixed(2);
    modelUsedEl.textContent = `Model Used: ${modelUsed}`;
    highlightTableColumn(criticalArea);
    saveCriticalAreaForm();
    
    updateVisualization(vizData);
}

// --- INIT ---
async function initializeApp() {
    try {
        const response = await fetch('data/critical_area_config.json');
        if (!response.ok) throw new Error(`Failed to fetch config`);
        const configData = await response.json();
        frontalAreaPoints = configData.frontalAreaPoints;

        // Setup Inputs & Sliders
        caInputIds.forEach(id => {
            const inputEl = document.getElementById(id);
            const sliderEl = document.getElementById(`${id}Slider`);
            caInputElements[id] = inputEl;
            caSliderElements[id] = sliderEl;

            // Sync Logic
            if (inputEl && sliderEl) {
                inputEl.addEventListener('input', (e) => {
                    sliderEl.value = e.target.value;
                    calculateCriticalArea();
                });
                sliderEl.addEventListener('input', (e) => {
                    inputEl.value = e.target.value;
                    calculateCriticalArea();
                });
            }
        });

        const isRotorcraftEl = document.getElementById('isRotorcraft');
        if (isRotorcraftEl) isRotorcraftEl.addEventListener('change', calculateCriticalArea);

        document.getElementById('resetCriticalAreaForm').addEventListener('click', resetCriticalAreaForm);

        // Setup Canvas
        canvas = document.getElementById('caVizCanvas');
        if (canvas) {
            const dpr = window.devicePixelRatio || 1;
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            ctx = canvas.getContext('2d');
            ctx.scale(dpr, dpr);
        }

        loadCriticalAreaForm();
        
        // Vent på at FontAwesome lastes inn før vi tegner for første gang, 
        // ellers blir ikonet usynlig ved sidelasting.
        document.fonts.ready.then(() => {
            calculateCriticalArea();
        });

        // Mobile Resize Handler
        window.addEventListener('resize', () => {
             if(canvas) {
                const dpr = window.devicePixelRatio || 1;
                const rect = canvas.parentElement.getBoundingClientRect(); 
                canvas.width = rect.width * dpr;
                canvas.height = 250 * dpr; 
                ctx.scale(dpr, dpr);
                calculateCriticalArea(); 
             }
        });

    } catch (error) {
        console.error("Initialization error:", error);
    }
}

document.addEventListener('DOMContentLoaded', initializeApp);