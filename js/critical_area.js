// Globale variabler for konfigurasjon og elementer
let frontalAreaPoints = []; // Vil bli lastet fra JSON
const caInputElements = {}; // Cache elementene
const caInputIds = ['isRotorcraft', 'dimension', 'cruiseSpeed', 'mtom', 'minAltitude'];

// --- START: Lagringsfunksjoner ---
const CRITICAL_AREA_KEY = 'critical_area_form_data';

function saveCriticalAreaForm() {
    const data = {};
    caInputIds.forEach(id => {
        const el = caInputElements[id];
        if (el) {
            data[id] = (el.type === 'checkbox') ? el.checked : el.value;
        }
    });
    localStorage.setItem(CRITICAL_AREA_KEY, JSON.stringify(data));
}

function loadCriticalAreaForm() {
    const data = JSON.parse(localStorage.getItem(CRITICAL_AREA_KEY));
    if (!data) {
        // Sett standard (blank) og lagre
        caInputIds.forEach(id => {
            const el = caInputElements[id];
            if (el) {
                 if (el.type === 'checkbox') el.checked = false;
                 else el.value = '';
            }
        });
        saveCriticalAreaForm();
        return;
    }

    // Sett lagrede verdier
    caInputIds.forEach(id => {
         const el = caInputElements[id];
         if (el && data[id] !== undefined) {
             if (el.type === 'checkbox') el.checked = data[id];
             else el.value = data[id];
         }
    });
}

function resetCriticalAreaForm() {
    localStorage.removeItem(CRITICAL_AREA_KEY);
    location.reload();
}
// --- SLUTT: Lagringsfunksjoner ---


// Constants based on EASA guidelines and Annex F
const R_PERSON = 0.3; // Radius of a person (m)
const H_PERSON = 1.8; // Height of a person (m)
const G = 9.81; // Gravitational acceleration (m/s^2)
const RHO = 1.225; // Air density (kg/m^3)
const CD_BALLISTIC = 0.8; // Drag coefficient for ballistic descent
const K_NON_LETHAL = 290; // Non-lethal kinetic energy limit (J) for slide
const JARUS_IMPACT_ANGLE_DEG = 35; // Standard impact angle for JARUS model (degrees)
const HIGH_ANGLE_THRESHOLD_DEG = 60; // Threshold for using High Impact Angle Model (degrees)
const COEFF_RESTITUTION_JARUS = 0.65; // Coefficient of restitution (e) for JARUS model at 35 deg
const COEFF_FRICTION = 0.75; // Coefficient of friction (Cg)
const OBSTACLE_REDUCTION_FACTOR = 0.6; // For JARUS Case 2 (1m < w <= 8m) - Korrigert <=

/**
 * Linearly interpolates the frontal area based on characteristic dimension.
 * Uses data loaded from critical_area_config.json.
 * @param {number} dimension Characteristic dimension (m).
 *@returns {number} Estimated frontal area (m^2).
 */
function interpolateFrontalArea(dimension) {
    // Bruker nå den globalt lastede 'frontalAreaPoints'
    const points = frontalAreaPoints; 
    if (!points || points.length === 0) {
        console.error("Frontal area data is not loaded!");
        return 0.1; // Fallback
    }

    if (dimension <= points[0].dim) return points[0].area;
    if (dimension >= points[points.length - 1].dim) return points[points.length - 1].area;

    for (let i = 0; i < points.length - 1; i++) {
        if (dimension >= points[i].dim && dimension <= points[i + 1].dim) {
            const dim1 = points[i].dim;
            const area1 = points[i].area;
            const dim2 = points[i + 1].dim;
            const area2 = points[i + 1].area;
            // Linear interpolation formula
            return area1 + ((dimension - dim1) * (area2 - area1)) / (dim2 - dim1);
        }
    }
    console.error("Interpolation failed for dimension:", dimension);
    return points[points.length - 1].area; // Fallback
}


/**
 * Calculates the impact angle for a ballistic descent using iteration.
 * Based on EASA Guidelines Annex 1 .
 * @param {number} initialHorizontalSpeed Max cruise speed (m/s).
 * @param {number} altitude AGL (m).
 * @param {number} frontalArea Frontal area (m^2).
 * @param {number} mass MTOM (kg).
 * @returns {number} Impact angle in degrees.
 */
function calculateImpactAngle(initialHorizontalSpeed, altitude, frontalArea, mass) {
    if (altitude <= 0) return 90; // Vertical impact at ground level or below

    let vHorizontal = initialHorizontalSpeed;
    let vVertical = 0;
    let verticalPosition = 0; // Start at altitude 0 (relative)
    const dt = 0.01; // Time step (s)
    let time = 0;
    const maxTime = 300; // Safety break after 5 minutes

    while (verticalPosition > -altitude && time < maxTime) {
        const vMagnitude = Math.sqrt(vHorizontal * vHorizontal + vVertical * vVertical);

        let dragForceMagnitude = 0;
        if (vMagnitude > 1e-6) { // Avoid issues at zero speed
             dragForceMagnitude = 0.5 * RHO * vMagnitude * vMagnitude * frontalArea * CD_BALLISTIC;
        }

        // Acceleration components
        let accHorizontal = 0;
        let accVertical = -G; // Gravity always acts downwards

        if (vMagnitude > 1e-6) {
            // Drag components oppose velocity components
            accHorizontal -= (dragForceMagnitude * (vHorizontal / vMagnitude)) / mass;
            accVertical -= (dragForceMagnitude * (vVertical / vMagnitude)) / mass;
        }

        // Update velocities using Euler integration (simple but works for small dt)
        vHorizontal += accHorizontal * dt;
        vVertical += accVertical * dt;

        // Update vertical position
        verticalPosition += vVertical * dt;
        time += dt;

        // Ensure horizontal speed doesn't go negative due to drag model simplicity
        if (initialHorizontalSpeed > 0 && vHorizontal < 0) vHorizontal = 0;
        if (initialHorizontalSpeed === 0) vHorizontal = 0; // If started with 0 horizontal, keep it 0
    }

     if (time >= maxTime) {
        console.warn("Impact angle calculation timed out.");
        return 90; // Assume vertical impact if calculation takes too long
    }


    // Calculate final impact angle relative to the ground
    if (Math.abs(vHorizontal) < 1e-6) return 90; // Pure vertical impact
    const finalImpactAngleRad = Math.atan(Math.abs(vVertical) / Math.abs(vHorizontal));
    return finalImpactAngleRad * (180 / Math.PI); // Convert to degrees
}

/**
 * Calculates Critical Area using the JARUS model.
 * Based on EASA Guidelines Chapter 4 and Annex F Sections 1.8 & B.3.
 * @param {number} dimension Characteristic dimension (w) (m).
 * @param {number} cruiseSpeed Max cruise speed (V) (m/s). Used as impact speed V in formula.
 * @param {number} mass MTOM (m) (kg).
 * @returns {number} Calculated Critical Area (Ac) (m^2).
 */
function calculateJarusModel(dimension, cruiseSpeed, mass) {
    const w = dimension;
    const vImpact = cruiseSpeed; // Using cruise speed as impact speed V per EASA doc
    const m = mass;
    const thetaRad = JARUS_IMPACT_ANGLE_DEG * (Math.PI / 180);

    const rD = R_PERSON + w / 2; //
    const dGlide = H_PERSON / Math.tan(thetaRad); //

    let dSlideReduced = 0;
    // Slide calculation only relevant for > 1m (Case 1 and 2)
    if (w > 1) {
        // Horizontal speed component at impact
        const vHorizontalImpact = vImpact * Math.cos(thetaRad); //

        // Calculate non-lethal speed based on energy threshold
        const vNonLethal = (m > 0) ? Math.sqrt((2 * K_NON_LETHAL) / m) : Infinity;

        // Horizontal speed immediately after impact (considering restitution)
        const vHorizontalAfterImpact = COEFF_RESTITUTION_JARUS * vHorizontalImpact;

        if (vHorizontalAfterImpact > vNonLethal) {
             // Calculate time to reach non-lethal speed (Corrected formula)
             const tSafe = (vHorizontalAfterImpact - vNonLethal) / (COEFF_FRICTION * G);

             // Calculate reduced slide distance
             dSlideReduced = vHorizontalAfterImpact * tSafe - 0.5 * COEFF_FRICTION * G * tSafe * tSafe;
             dSlideReduced = Math.max(0, dSlideReduced); // Ensure non-negative distance
        } else {
            dSlideReduced = 0; // Already non-lethal at impact
        }
    }

    let Ac = 0;
    if (w >= 8) { // Case 1
        Ac = 2 * rD * (dGlide + dSlideReduced) + Math.PI * rD * rD; //
    } else if (w > 1 && w < 8) { // Case 2 - Corrected upper bound to <8
        Ac = OBSTACLE_REDUCTION_FACTOR * (2 * rD * (dGlide + dSlideReduced) + Math.PI * rD * rD); //
    } else { // Case 3 (w <= 1)
        // Using EASA doc formula which differs slightly from Annex F B.3
        Ac = 2 * rD * dGlide + 0.5 * (Math.PI * rD * rD); //
    }

    return Ac;
}

/**
 * Calculates Critical Area using the High Impact Angle model.
 * Based on EASA Guidelines Chapter 5.
 * @param {number} dimension Characteristic dimension (w) (m).
 * @param {number} mass MTOM (m) (kg).
 * @param {number} frontalArea Estimated frontal area (A) (m^2).
 * @returns {number} Calculated Critical Area (Ac) (m^2).
 */
function calculateHighImpactModel(dimension, mass, frontalArea) {
    const w = dimension;
    const m = mass;
    const A = frontalArea;

    // Calculate terminal velocity
    const vTerminal = (RHO * A * CD_BALLISTIC > 0) ? Math.sqrt((2 * m * G) / (RHO * A * CD_BALLISTIC)) : 0;

    // Calculate kinetic energy at terminal velocity
    const eKTerminal = 0.5 * m * vTerminal * vTerminal; // Joules
    const eKTerminalKJ = eKTerminal / 1000; // Convert to kJ for Fs calculation

    // Determine Safety Factor (Fs) based on EASA Table 6
    let Fs = 0;
    if (eKTerminalKJ < 12) {
        Fs = 2.3;
    } else if (eKTerminalKJ >= 12 && eKTerminalKJ <= 3125) {
        // Formula from EASA doc Figure: Fs = 1.4 * Ek_tot^0.2
        Fs = 1.4 * Math.pow(eKTerminalKJ, 0.2);
    } else { // eKTerminalKJ > 3125
        Fs = 7.0;
    }
     Fs = Math.max(2.3, Math.min(Fs, 7.0)); // Ensure Fs is within [2.3, 7.0] bounds

    // Calculate rD
    const rD = R_PERSON + w / 2;

    // Calculate Critical Area
    const Ac = Fs * Math.PI * rD * rD;

    return Ac;
}

/**
 * Highlights the correct column HEADER in the summary table based on calculated Ac.
 * @param {number} criticalArea Calculated Critical Area (m^2).
 */
function highlightTableColumn(criticalArea) {
    const thresholds = [
        { limit: 6.5, id: "1m" },
        { limit: 65, id: "3m" },
        { limit: 650, id: "8m" },
        { limit: 6500, id: "20m" },
        { limit: 65000, id: "40m" }
    ];

    let highlightedId = null;

    if (criticalArea <= 0) { // Handle invalid/zero case
        highlightedId = null;
    } else if (criticalArea <= thresholds[0].limit) {
        highlightedId = thresholds[0].id;
    } else if (criticalArea <= thresholds[1].limit) {
        highlightedId = thresholds[1].id;
    } else if (criticalArea <= thresholds[2].limit) {
        highlightedId = thresholds[2].id;
    } else if (criticalArea <= thresholds[3].limit) {
        highlightedId = thresholds[3].id;
    } else { // criticalArea > 6500
        highlightedId = thresholds[4].id;
    }

    // Remove highlight from all headers first
    thresholds.forEach(th => {
        document.getElementById(`col-${th.id}-head`)?.classList.remove('highlight-col');
    });

    // Add highlight to the correct header
    if (highlightedId) {
        document.getElementById(`col-${highlightedId}-head`)?.classList.add('highlight-col');
    }
}

/**
 * Main calculation function triggered by input changes.
 */
function calculateCriticalArea() {
    // Sjekk om data er lastet
    if (frontalAreaPoints.length === 0) {
        console.error("Critical area config data is not loaded yet.");
        return;
    }

    // Get inputs
    const isRotorcraft = caInputElements.isRotorcraft.checked;
    const dimension = parseFloat(caInputElements.dimension.value);
    const cruiseSpeed = parseFloat(caInputElements.cruiseSpeed.value);
    const mtom = parseFloat(caInputElements.mtom.value);
    const minAltitude = parseFloat(caInputElements.minAltitude.value);

    const resultValueEl = document.getElementById('criticalAreaValue');
    const modelUsedEl = document.getElementById('modelUsed');
    const impactAngleResultEl = document.getElementById('impactAngleResult');

     // Clear previous results if any input is empty or invalid
    if (isNaN(dimension) || isNaN(cruiseSpeed) || isNaN(mtom) || isNaN(minAltitude) ||
        dimension <= 0 || cruiseSpeed < 0 || mtom <= 0 || minAltitude < 0) {
        resultValueEl.textContent = '-';
        modelUsedEl.textContent = 'Model Used: -';
        impactAngleResultEl.style.display = 'none';
        highlightTableColumn(-1); // Clear highlight
        
        // Lagre selv om det er tomt/ugyldig
        saveCriticalAreaForm();
        return;
    }

    let criticalArea = 0;
    let modelUsed = "";
    let impactAngle = null;

    // Model Selection Logic
    if (isRotorcraft) {
        const frontalArea = interpolateFrontalArea(dimension);
        impactAngle = calculateImpactAngle(cruiseSpeed, minAltitude, frontalArea, mtom);
        impactAngleResultEl.style.display = 'block';
        impactAngleResultEl.innerHTML = `Calculated Impact Angle: <span>${impactAngle.toFixed(1)}</span> °`;


        if (impactAngle > HIGH_ANGLE_THRESHOLD_DEG) { //
            modelUsed = "High Impact Angle Model";
            criticalArea = calculateHighImpactModel(dimension, mtom, frontalArea); //
        } else {
            modelUsed = "JARUS Model (Rotorcraft/Multirotor)";
            criticalArea = calculateJarusModel(dimension, cruiseSpeed, mtom); //
        }
    } else { // Fixed Wing or similar
        modelUsed = "JARUS Model (Fixed Wing)";
        impactAngleResultEl.style.display = 'none';
        criticalArea = calculateJarusModel(dimension, cruiseSpeed, mtom); //
    }

    // Display Results
    resultValueEl.textContent = criticalArea.toFixed(2);
    modelUsedEl.textContent = `Model Used: ${modelUsed}`;

    // Highlight Table Column Header
    highlightTableColumn(criticalArea);

    // Lagre de gyldige dataene
    saveCriticalAreaForm();
}


// --- START: Event Listeners ---
async function initializeApp() {
    try {
        // 1. Last inn eksterne konfigurasjonsdata
        const response = await fetch('data/critical_area_config.json');
        if (!response.ok) {
            throw new Error(`Failed to fetch critical_area_config.json: ${response.statusText}`);
        }
        const configData = await response.json();
        frontalAreaPoints = configData.frontalAreaPoints;

        // 2. Cache alle input-elementer
        caInputIds.forEach(id => {
            caInputElements[id] = document.getElementById(id);
        });

        // 3. Last inn lagrede brukerdata
        loadCriticalAreaForm();
        
        // 4. Kjør kalkulering basert på lastede data
        calculateCriticalArea(); 

        // 5. Legg til lyttere for alle inputs
        caInputIds.forEach(id => {
            caInputElements[id].addEventListener('input', calculateCriticalArea);
            caInputElements[id].addEventListener('change', calculateCriticalArea); // For checkbox
        });

        // 6. Legg til lytter for nullstill-knappen
        document.getElementById('resetCriticalAreaForm').addEventListener('click', resetCriticalAreaForm);

    } catch (error) {
        console.error("Failed to initialize critical area calculator:", error);
        document.getElementById('modelUsed').innerHTML = `<span style="color: red;">Feil: Kunne ikke laste kalkulatordata.</span>`;
    }
}

document.addEventListener('DOMContentLoaded', initializeApp);
// --- SLUTT: Event Listeners ---