// Constants based on EASA guidelines and Annex F
const R_PERSON = 0.3; // Radius of a person (m) [cite: 3486, 648]
const H_PERSON = 1.8; // Height of a person (m) [cite: 3486, 638]
const G = 9.81; // Gravitational acceleration (m/s^2) [cite: 3486, 638]
const RHO = 1.225; // Air density (kg/m^3) [cite: 2744, 3602]
const CD_BALLISTIC = 0.8; // Drag coefficient for ballistic descent [cite: 2743, 3601]
const K_NON_LETHAL = 290; // Non-lethal kinetic energy limit (J) for slide [cite: 3486, 638, 2719]
const JARUS_IMPACT_ANGLE_DEG = 35; // Standard impact angle for JARUS model (degrees) [cite: 3486, 2648]
const HIGH_ANGLE_THRESHOLD_DEG = 60; // Threshold for using High Impact Angle Model (degrees) [cite: 3370]
const COEFF_RESTITUTION_JARUS = 0.65; // Coefficient of restitution (e) for JARUS model at 35 deg [cite: 3486] - Note Annex F Eq(51) makes this angle dependent, but EASA doc uses fixed 0.65 [cite: 3486]
const COEFF_FRICTION = 0.75; // Coefficient of friction (Cg) [cite: 3486, 638]
const OBSTACLE_REDUCTION_FACTOR = 0.6; // For JARUS Case 2 (1m < w < 8m) [cite: 3486, 667]

/**
 * Linearly interpolates the frontal area based on characteristic dimension.
 * Uses Table 7 from EASA Guidelines doc.
 * @param {number} dimension Characteristic dimension (m).
 * @returns {number} Estimated frontal area (m^2).
 */
function interpolateFrontalArea(dimension) {
    // Data points from EASA Table 7 [cite: 3547]
    const points = [
        { dim: 1, area: 0.1 },
        { dim: 3, area: 0.5 },
        { dim: 8, area: 2.5 },   // Note: EASA doc Table 7 typo says 2.5, Annex F Table 29 says 2.0. Using EASA value.
        { dim: 20, area: 12.5 }, // Note: EASA doc Table 7 typo says 12.5, Annex F Table 29 says 8.0. Using EASA value.
        { dim: 40, area: 25.0 }  // Note: EASA doc Table 7 typo says 25, Annex F Table 29 says 14.0. Using EASA value.
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
    // Should not happen if dimension is within bounds checked earlier
    console.error("Interpolation failed for dimension:", dimension);
    return points[points.length - 1].area; // Fallback
}


/**
 * Calculates the impact angle for a ballistic descent using iteration.
 * Based on EASA Guidelines Annex 1 [cite: 3558-3608].
 * @param {number} initialHorizontalSpeed Max cruise speed (m/s).
 * @param {number} altitude AGL (m).
 * @param {number} frontalArea Frontal area (m^2).
 * @param {number} mass MTOM (kg).
 * @returns {number} Impact angle in degrees.
 */
function calculateImpactAngle(initialHorizontalSpeed, altitude, frontalArea, mass) {
    if (altitude <= 0) return 90; // Cannot calculate for zero or negative altitude

    let vHorizontal = initialHorizontalSpeed;
    let vVertical = 0;
    let verticalDistance = 0;
    const dt = 0.01; // Time step for iteration (s)

    while (verticalDistance > -altitude) {
        const vMagnitude = Math.sqrt(vHorizontal * vHorizontal + vVertical * vVertical);
        if (vMagnitude === 0) { // Avoid division by zero if starting from hover with zero speed
             vVertical -= G * dt; // Only gravity acts initially if speed is zero
        } else {
            const dragForceMagnitude = 0.5 * RHO * vMagnitude * vMagnitude * frontalArea * CD_BALLISTIC;
            // Angle theta of velocity vector relative to horizontal (negative downwards)
            const thetaRad = Math.atan2(vVertical, vHorizontal);

            const dragForceHorizontal = Math.cos(thetaRad) * dragForceMagnitude;
            const dragForceVertical = Math.sin(thetaRad) * dragForceMagnitude;

            // Update velocities [cite: 3587, 3588]
            vHorizontal += (dragForceHorizontal / mass) * dt; // Drag opposes horizontal motion
            vVertical += (dragForceVertical / mass - G) * dt; // Drag opposes vertical motion, gravity accelerates downwards
        }

        // Update vertical distance (using average velocity over the timestep) [cite: 3564, 3569]
        // Approximation: Use end velocity of step for simplicity, small dt minimizes error
         verticalDistance += vVertical * dt;

         // Safety break for extremely long calculations (e.g., very high altitude)
         if (Math.abs(vVertical * dt) < 1e-6 && verticalDistance < -altitude) {
             console.warn("Impact angle calculation potentially stalled or took too long.");
             break;
         }
    }

    // Calculate final impact angle [cite: 3606, 3608]
    if (vHorizontal === 0 && vVertical < 0) return 90; // Pure vertical impact
    if (vHorizontal === 0 && vVertical === 0) return 0; // No movement? Should not happen.
    const finalImpactAngleRad = Math.atan(Math.abs(vVertical) / vHorizontal); // Angle with the ground
    return finalImpactAngleRad * (180 / Math.PI); // Convert to degrees
}

/**
 * Calculates Critical Area using the JARUS model.
 * Based on EASA Guidelines Chapter 4 [cite: 3442-3487] and Annex F Sections 1.8 & B.3 [cite: 627-682, 3080-3089].
 * @param {number} dimension Characteristic dimension (w) (m).
 * @param {number} cruiseSpeed Max cruise speed (V) (m/s).
 * @param {number} mass MTOM (m) (kg).
 * @returns {number} Calculated Critical Area (Ac) (m^2).
 */
function calculateJarusModel(dimension, cruiseSpeed, mass) {
    const w = dimension;
    const vCruise = cruiseSpeed;
    const m = mass;
    const thetaRad = JARUS_IMPACT_ANGLE_DEG * (Math.PI / 180);

    const rD = R_PERSON + w / 2;
    const dGlide = H_PERSON / Math.tan(thetaRad);

    let dSlideReduced = 0;
    // Slide calculation only relevant for > 1m (Case 1 and 2) [cite: 671, 2825]
    if (w > 1) {
        // Horizontal speed component at impact [cite: 3463, 644]
        // NOTE: EASA doc formula uses V (cruise speed) here[cite: 3463], Annex F uses v (impact speed). Sticking to EASA doc.
        const vHorizontal = vCruise * Math.cos(thetaRad);

        // Calculate non-lethal speed based on energy threshold [cite: 3481, 655]
        const vNonLethal = Math.sqrt((2 * K_NON_LETHAL) / m);

        // Horizontal speed immediately after impact (considering restitution) [cite: 3486]
        const vHorizontalAfterImpact = COEFF_RESTITUTION_JARUS * vHorizontal;

        if (vHorizontalAfterImpact > vNonLethal) {
             // Calculate time to reach non-lethal speed (Corrected based on Annex F)
             const tSafe = (vHorizontalAfterImpact - vNonLethal) / (COEFF_FRICTION * G);

             // Calculate reduced slide distance
             dSlideReduced = vHorizontalAfterImpact * tSafe - 0.5 * COEFF_FRICTION * G * tSafe * tSafe;
        } else {
            dSlideReduced = 0; // Already non-lethal at impact
        }
    }

    let Ac = 0;
    if (w >= 8) { // Case 1 [cite: 3447-3449, 650]
        Ac = 2 * rD * (dGlide + dSlideReduced) + Math.PI * rD * rD;
    } else if (w > 1 && w < 8) { // Case 2 [cite: 3450-3452, 664]
        Ac = OBSTACLE_REDUCTION_FACTOR * (2 * rD * (dGlide + dSlideReduced) + Math.PI * rD * rD);
    } else { // Case 3 (w <= 1) - Using EASA doc formula [cite: 3453-3454], slide ignored [cite: 671]
        Ac = 2 * rD * dGlide + 0.5 * (Math.PI * rD * rD); // EASA formula
        // Ac = 2 * rD * dGlide + Math.PI * rD * rD; // Annex F formula [cite: 673]
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

    // Calculate terminal velocity [cite: 3542, 3543]
    const vTerminal = Math.sqrt((2 * m * G) / (RHO * A * CD_BALLISTIC));

    // Calculate kinetic energy at terminal velocity [cite: 3541]
    const eKTerminal = 0.5 * m * vTerminal * vTerminal; // Joules
    const eKTerminalKJ = eKTerminal / 1000; // Convert to kJ for Fs calculation

    // Determine Safety Factor (Fs) based on EASA Table 6 [cite: 3533]
    let Fs = 0;
    if (eKTerminalKJ < 12) {
        Fs = 2.3;
    } else if (eKTerminalKJ >= 12 && eKTerminalKJ <= 3125) {
        Fs = 1.4 * Math.pow(eKTerminalKJ, 0.2);
    } else { // eKTerminalKJ > 3125
        Fs = 7.0;
    }

    // Calculate rD [cite: 3457]
    const rD = R_PERSON + w / 2;

    // Calculate Critical Area [cite: 3518]
    const Ac = Fs * Math.PI * rD * rD;

    return Ac;
}

/**
 * Highlights the correct column in the summary table based on calculated Ac.
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

    if (criticalArea <= thresholds[0].limit) {
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

    // Remove highlight from all columns first
    thresholds.forEach(th => {
        document.getElementById(`col-${th.id}-head`)?.classList.remove('highlight-col');
        document.getElementById(`col-${th.id}-val`)?.classList.remove('highlight-col');
    });

    // Add highlight to the correct column
    if (highlightedId) {
        document.getElementById(`col-${highlightedId}-head`)?.classList.add('highlight-col');
        document.getElementById(`col-${highlightedId}-val`)?.classList.add('highlight-col');
    }
}

/**
 * Main calculation function triggered by input changes.
 */
function calculateCriticalArea() {
    // Get inputs
    const isRotorcraft = document.getElementById('isRotorcraft').checked;
    const dimension = parseFloat(document.getElementById('dimension').value);
    const cruiseSpeed = parseFloat(document.getElementById('cruiseSpeed').value);
    const mtom = parseFloat(document.getElementById('mtom').value);
    const minAltitude = parseFloat(document.getElementById('minAltitude').value);

    const resultValueEl = document.getElementById('criticalAreaValue');
    const modelUsedEl = document.getElementById('modelUsed');
    const impactAngleResultEl = document.getElementById('impactAngleResult');
    const impactAngleSpan = impactAngleResultEl.querySelector('span'); // Assuming span exists inside

    // Basic Validation
    if (isNaN(dimension) || isNaN(cruiseSpeed) || isNaN(mtom) || isNaN(minAltitude) ||
        dimension <= 0 || cruiseSpeed < 0 || mtom <= 0 || minAltitude < 0) {
        resultValueEl.textContent = 'Invalid Input';
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


        if (impactAngle > HIGH_ANGLE_THRESHOLD_DEG) {
            modelUsed = "High Impact Angle Model";
            criticalArea = calculateHighImpactModel(dimension, mtom, frontalArea);
        } else {
            modelUsed = "JARUS Model (Rotorcraft/Multirotor)";
            criticalArea = calculateJarusModel(dimension, cruiseSpeed, mtom);
        }
    } else { // Fixed Wing or similar
        modelUsed = "JARUS Model (Fixed Wing)";
        impactAngleResultEl.style.display = 'none';
        criticalArea = calculateJarusModel(dimension, cruiseSpeed, mtom);
    }

    // Display Results
    resultValueEl.textContent = criticalArea.toFixed(2);
    modelUsedEl.textContent = `Model Used: ${modelUsed}`;

    // Highlight Table Column
    highlightTableColumn(criticalArea);
}


// Initial calculation on page load
document.addEventListener('DOMContentLoaded', calculateCriticalArea);