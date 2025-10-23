// Constants
const G = 9.81; // Gravitational acceleration (m/s^2)

// Cache DOM elements for performance
const elements = {
    v0: document.getElementById('v0'),
    speedHelpText: document.getElementById('speedHelpText'), // Added for help text
    tr: document.getElementById('tr'),
    aircraftType: document.getElementById('aircraftType'),
    contingencyMethod: document.getElementById('contingencyMethod'),
    parachuteTimeRow: document.getElementById('parachuteTimeRow'),
    tp: document.getElementById('tp'),
    sGnss: document.getElementById('sGnss'),
    sPos: document.getElementById('sPos'),
    sK: document.getElementById('sK'),
    pitchAngleRow: document.getElementById('pitchAngleRow'),
    thetaMax: document.getElementById('thetaMax'),
    rollAngleRow: document.getElementById('rollAngleRow'),
    phiMax: document.getElementById('phiMax'),
    anglePlaceholder: document.getElementById('anglePlaceholder'),
    hfg: document.getElementById('hfg'),
    altitudeMeasurement: document.getElementById('altitudeMeasurement'),
    sCvValue: document.getElementById('sCvValue'),
    hCvValue: document.getElementById('hCvValue'),
    resetButton: document.getElementById('resetContingencyForm'),
    // Details spans - Horizontal
    det_sGnss: document.getElementById('det_sGnss'),
    det_sPos: document.getElementById('det_sPos'),
    det_sK: document.getElementById('det_sK'),
    det_sR: document.getElementById('det_sR'),
    det_sCM: document.getElementById('det_sCM'),
    det_sCvTotal: document.getElementById('det_sCvTotal'),
    // Details spans - Vertical
    det_hfg: document.getElementById('det_hfg'),
    det_hAM: document.getElementById('det_hAM'),
    det_hR: document.getElementById('det_hR'),
    det_hCM: document.getElementById('det_hCM'),
    det_hCvTotal: document.getElementById('det_hCvTotal'),
};

// IDs of all input elements used for saving/loading
const inputIds = ['v0', 'tr', 'aircraftType', 'contingencyMethod', 'tp', 'sGnss', 'sPos', 'sK', 'thetaMax', 'phiMax', 'hfg', 'altitudeMeasurement'];

// --- START: Storage Functions ---
const CONTINGENCY_KEY = 'contingency_form_data';

function saveContingencyForm() {
    const data = {};
    inputIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            data[id] = el.value;
        }
    });
    localStorage.setItem(CONTINGENCY_KEY, JSON.stringify(data));
}

function loadContingencyForm() {
    const data = JSON.parse(localStorage.getItem(CONTINGENCY_KEY));
    if (data) {
        inputIds.forEach(id => {
            const el = document.getElementById(id);
            if (el && data[id] !== undefined) {
                el.value = data[id];
            }
        });
    } else {
        applyDefaultValues();
    }
    updateUIBasedOnSelections(); // Update UI after loading
}

function resetContingencyForm() {
    localStorage.removeItem(CONTINGENCY_KEY);
    applyDefaultValues();
    updateUIBasedOnSelections();
    calculateAndDisplay();
}

function applyDefaultValues() {
    elements.v0.value = 10;
    elements.tr.value = 1;
    elements.aircraftType.value = 'multirotor';
    elements.contingencyMethod.value = 'maneuver';
    elements.tp.value = 2;
    elements.sGnss.value = 3;
    elements.sPos.value = 3;
    elements.sK.value = 1;
    elements.thetaMax.value = 45;
    elements.phiMax.value = 30;
    elements.hfg.value = 100;
    elements.altitudeMeasurement.value = 'barometric';
}
// --- END: Storage Functions ---

function calculateHorizontalCV() {
    const v0 = parseFloat(elements.v0.value) || 0;
    const tr = parseFloat(elements.tr.value) || 0;
    const sGnss = parseFloat(elements.sGnss.value) || 0;
    const sPos = parseFloat(elements.sPos.value) || 0;
    const sK = parseFloat(elements.sK.value) || 0;
    const method = elements.contingencyMethod.value;
    const aircraft = elements.aircraftType.value;
    const tp = parseFloat(elements.tp.value) || 0;
    const thetaMax = parseFloat(elements.thetaMax.value) || 0;
    const phiMax = parseFloat(elements.phiMax.value) || 0;

    const sR = v0 * tr;
    let sCM = 0;

    if (method === 'maneuver') {
        if (aircraft === 'multirotor') {
            const thetaRad = thetaMax * (Math.PI / 180);
            const tanTheta = Math.tan(thetaRad);
            sCM = (tanTheta > 1e-9) ? (0.5 * Math.pow(v0, 2) / (G * tanTheta)) : Infinity;
        } else if (aircraft === 'fixedwing') {
            const phiRad = phiMax * (Math.PI / 180);
            const tanPhi = Math.tan(phiRad);
            sCM = (tanPhi > 1e-9) ? (Math.pow(v0, 2) / (G * tanPhi)) : Infinity;
        }
    } else if (method === 'parachute') {
        sCM = v0 * tp;
    }

    const sCV = sGnss + sPos + sK + sR + sCM;

    // Update details display (without abbreviations)
    elements.det_sGnss.textContent = sGnss.toFixed(1) + ' m';
    elements.det_sPos.textContent = sPos.toFixed(1) + ' m';
    elements.det_sK.textContent = sK.toFixed(1) + ' m';
    elements.det_sR.textContent = sR.toFixed(1) + ' m';
    elements.det_sCM.textContent = isFinite(sCM) ? sCM.toFixed(1) + ' m' : 'Infinite (check angle)';
    elements.det_sCvTotal.textContent = isFinite(sCV) ? sCV.toFixed(1) + ' m' : 'Infinite';

    return sCV;
}

function calculateVerticalCV() {
    const v0 = parseFloat(elements.v0.value) || 0;
    const tr = parseFloat(elements.tr.value) || 0;
    const hfg = parseFloat(elements.hfg.value) || 0;
    const altMeasure = elements.altitudeMeasurement.value;
    const aircraft = elements.aircraftType.value;
    const method = elements.contingencyMethod.value;
    const tp = parseFloat(elements.tp.value) || 0;

    const hAM = altMeasure === 'barometric' ? 1.0 : 4.0;
    const hR = v0 * 0.7 * tr; // Approximation
    let hCM = 0;

    if (method === 'maneuver') {
        if (aircraft === 'multirotor') {
            hCM = 0.5 * Math.pow(v0, 2) / G; // Kinetic to Potential
        } else if (aircraft === 'fixedwing') {
            hCM = (Math.pow(v0, 2) / G) * 0.3; // Climb Turn approx.
        }
    } else if (method === 'parachute') {
        hCM = v0 * tp * 0.7; // Approx. climb during deployment
    }

    const hCV = hfg + hAM + hR + hCM;

    // Update details display (without abbreviations)
    elements.det_hfg.textContent = hfg.toFixed(1) + ' m';
    elements.det_hAM.textContent = hAM.toFixed(1) + ' m';
    elements.det_hR.textContent = hR.toFixed(1) + ' m';
    elements.det_hCM.textContent = hCM.toFixed(1) + ' m';
    elements.det_hCvTotal.textContent = hCV.toFixed(1) + ' m';

    return hCV;
}

// Update visibility and text of specific input fields based on selections
function updateUIBasedOnSelections() {
    const method = elements.contingencyMethod.value;
    const aircraft = elements.aircraftType.value;

    // Show/hide parachute time input
    elements.parachuteTimeRow.style.display = method === 'parachute' ? 'flex' : 'none';

    // Show/hide angle inputs ONLY if "Standard Maneuver" is selected
    const showPitch = (method === 'maneuver' && aircraft === 'multirotor');
    const showRoll = (method === 'maneuver' && aircraft === 'fixedwing');

    elements.pitchAngleRow.style.display = showPitch ? 'flex' : 'none';
    elements.rollAngleRow.style.display = showRoll ? 'flex' : 'none';
    elements.anglePlaceholder.style.display = (!showPitch && !showRoll) ? 'flex' : 'none';

    // Update speed help text based on aircraft type
    if (aircraft === 'multirotor') {
        elements.speedHelpText.textContent = 'Must be ≥ 3 m/s for multirotor.';
        elements.speedHelpText.style.display = 'block';
    } else if (aircraft === 'fixedwing') {
        elements.speedHelpText.textContent = 'Must be ≥ 1.25 Vstall,clean for fixed-wing.';
        elements.speedHelpText.style.display = 'block';
    } else {
        elements.speedHelpText.style.display = 'none'; // Hide if no type selected somehow
    }
}

// Main function to trigger calculations and update the display
function calculateAndDisplay() {
    updateUIBasedOnSelections(); // Update UI first

    const sCV = calculateHorizontalCV();
    const hCV = calculateVerticalCV();

    elements.sCvValue.textContent = isFinite(sCV) ? sCV.toFixed(1) : '-';
    elements.hCvValue.textContent = isFinite(hCV) ? hCV.toFixed(1) : '-';

    saveContingencyForm(); // Save state
}

// Initialize the application
function initializeApp() {
    loadContingencyForm(); // Load or apply defaults
    calculateAndDisplay(); // Initial calculation

    // Add event listeners
    inputIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            const eventType = (el.tagName === 'SELECT') ? 'change' : 'input';
            el.addEventListener(eventType, calculateAndDisplay);
        }
    });

    elements.resetButton.addEventListener('click', resetContingencyForm);
}

// Wait for the DOM to be fully loaded before initializing
document.addEventListener('DOMContentLoaded', initializeApp);