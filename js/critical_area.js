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
 * Uses Table 7 from EASA Guidelines doc[cite: 7045].
 * @param {number} dimension Characteristic dimension (m).
 * @returns {number} Estimated frontal area (m^2).
 */
function interpolateFrontalArea(dimension) {
    // Data points from EASA Table 7 [cite: 7046]
    const points = [
        { dim: 1, area: 0.1 },
        { dim: 3, area: 0.5 },
        { dim: 8, area: 2.5 },
        { dim: 20, area: 12.5 },
        { dim: 40, area: 25.0 }
    ];

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
 * Based on EASA Guidelines Chapter 4 [cite: 3442-3487] and Annex F Sections 1.8 & B.3 [cite: 627-682, 3080-3089].
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

    const rD = R_PERSON + w / 2; // [cite: 3457, 7104]
    const dGlide = H_PERSON / Math.tan(thetaRad); // [cite: 3460, 7104]

    let dSlideReduced = 0;
    // Slide calculation only relevant for > 1m (Case 1 and 2)
    if (w > 1) {
        // Horizontal speed component at impact
        const vHorizontalImpact = vImpact * Math.cos(thetaRad); // [cite: 3464, 7104]

        // Calculate non-lethal speed based on energy threshold [cite: 3481, 7104]
        const vNonLethal = (m > 0) ? Math.sqrt((2 * K_NON_LETHAL) / m) : Infinity;

        // Horizontal speed immediately after impact (considering restitution)
        const vHorizontalAfterImpact = COEFF_RESTITUTION_JARUS * vHorizontalImpact;

        if (vHorizontalAfterImpact > vNonLethal) {
             // Calculate time to reach non-lethal speed [cite: 3480, 7104] (Corrected formula)
             const tSafe = (vHorizontalAfterImpact - vNonLethal) / (COEFF_FRICTION * G);

             // Calculate reduced slide distance [cite: 3462, 7104]
             dSlideReduced = vHorizontalAfterImpact * tSafe - 0.5 * COEFF_FRICTION * G * tSafe * tSafe;
             dSlideReduced = Math.max(0, dSlideReduced); // Ensure non-negative distance
        } else {
            dSlideReduced = 0; // Already non-lethal at impact
        }
    }

    let Ac = 0;
    if (w >= 8) { // Case 1 [cite: 3447-3449, 650]
        Ac = 2 * rD * (dGlide + dSlideReduced) + Math.PI * rD * rD; // [cite: 3448]
    } else if (w > 1 && w < 8) { // Case 2 [cite: 3450-3452, 664] - Corrected upper bound to <8
        Ac = OBSTACLE_REDUCTION_FACTOR * (2 * rD * (dGlide + dSlideReduced) + Math.PI * rD * rD); // [cite: 3451]
    } else { // Case 3 (w <= 1)
        // Using EASA doc formula [cite: 3453-3454] which differs slightly from Annex F B.3 [cite: 3086-3089]
        Ac = 2 * rD * dGlide + 0.5 * (Math.PI * rD * rD); // [cite: 3454]
    }

    return Ac;
}

/**
 * Calculates Critical Area using the High Impact Angle model.
 * Based on EASA Guidelines Chapter 5 [cite: 3488-3549].
 * @param {number} dimension Characteristic dimension (w) (m).
 * @param {number} mass MTOM (m) (kg).
 * @param {number} frontalArea Estimated frontal area (A) (m^2).
 * @returns {number} Calculated Critical Area (Ac) (m^2).
 */
function calculateHighImpactModel(dimension, mass, frontalArea) {
    const w = dimension;
    const m = mass;
    const A = frontalArea;

    // Calculate terminal velocity [cite: 7042]
    const vTerminal = (RHO * A * CD_BALLISTIC > 0) ? Math.sqrt((2 * m * G) / (RHO * A * CD_BALLISTIC)) : 0;

    // Calculate kinetic energy at terminal velocity [cite: 7041]
    const eKTerminal = 0.5 * m * vTerminal * vTerminal; // Joules
    const eKTerminalKJ = eKTerminal / 1000; // Convert to kJ for Fs calculation

    // Determine Safety Factor (Fs) based on EASA Table 6 [cite: 7037]
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

    // Calculate rD [cite: 3457, 7019]
    const rD = R_PERSON + w / 2;

    // Calculate Critical Area [cite: 7018]
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
        // document.getElementById(`col-${th.id}-val`)?.classList.remove('highlight-col'); // Don't highlight value cell
    });

    // Add highlight to the correct header
    if (highlightedId) {
        document.getElementById(`col-${highlightedId}-head`)?.classList.add('highlight-col');
        // document.getElementById(`col-${highlightedId}-val`)?.classList.add('highlight-col'); // Don't highlight value cell
    }
}

/**
 * Main calculation function triggered by input changes.
 */
function calculateCriticalArea() {
    // Get inputs
    const isRotorcraft = document.getElementById('isRotorcraft').checked;
    const dimensionInput = document.getElementById('dimension');
    const cruiseSpeedInput = document.getElementById('cruiseSpeed');
    const mtomInput = document.getElementById('mtom');
    const minAltitudeInput = document.getElementById('minAltitude');

    const dimension = parseFloat(dimensionInput.value);
    const cruiseSpeed = parseFloat(cruiseSpeedInput.value);
    const mtom = parseFloat(mtomInput.value);
    const minAltitude = parseFloat(minAltitudeInput.value);

    const resultValueEl = document.getElementById('criticalAreaValue');
    const modelUsedEl = document.getElementById('modelUsed');
    const impactAngleResultEl = document.getElementById('impactAngleResult');

     // Clear previous results if any input is empty or invalid
    if (dimensionInput.value === '' || cruiseSpeedInput.value === '' || mtomInput.value === '' || minAltitudeInput.value === '' ||
        isNaN(dimension) || isNaN(cruiseSpeed) || isNaN(mtom) || isNaN(minAltitude) ||
        dimension <= 0 || cruiseSpeed < 0 || mtom <= 0 || minAltitude < 0) {
        resultValueEl.textContent = '-';
        modelUsedEl.textContent = 'Model Used: -';
        impactAngleResultEl.style.display = 'none';
        highlightTableColumn(-1); // Clear highlight
        return;
    }


    let criticalArea = 0;
    let modelUsed = "";
    let impactAngle = null;

    // Model Selection Logic [cite: 3368-3371]
    if (isRotorcraft) {
        const frontalArea = interpolateFrontalArea(dimension);
        impactAngle = calculateImpactAngle(cruiseSpeed, minAltitude, frontalArea, mtom);
        impactAngleResultEl.style.display = 'block';
        impactAngleResultEl.innerHTML = `Calculated Impact Angle: <span>${impactAngle.toFixed(1)}</span> °`;


        if (impactAngle > HIGH_ANGLE_THRESHOLD_DEG) { // [cite: 3467]
            modelUsed = "High Impact Angle Model";
            criticalArea = calculateHighImpactModel(dimension, mtom, frontalArea); // [cite: 3488-3549]
        } else {
            modelUsed = "JARUS Model (Rotorcraft/Multirotor)";
            criticalArea = calculateJarusModel(dimension, cruiseSpeed, mtom); // [cite: 3442-3487]
        }
    } else { // Fixed Wing or similar
        modelUsed = "JARUS Model (Fixed Wing)";
        impactAngleResultEl.style.display = 'none';
        criticalArea = calculateJarusModel(dimension, cruiseSpeed, mtom); // [cite: 3442-3487]
    }

    // Display Results
    resultValueEl.textContent = criticalArea.toFixed(2);
    modelUsedEl.textContent = `Model Used: ${modelUsed}`;

    // Highlight Table Column Header
    highlightTableColumn(criticalArea);
}


// Initial setup on page load
document.addEventListener('DOMContentLoaded', () => {
    // Set default values to blank
    document.getElementById('dimension').value = '';
    document.getElementById('cruiseSpeed').value = '';
    document.getElementById('mtom').value = '';
    document.getElementById('minAltitude').value = '';
    calculateCriticalArea(); // Run once to clear results initially
});