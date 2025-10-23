// Global variabel for å holde dataene som lastes inn
let containmentData = {};

// --- START: Lagringsfunksjoner ---
const CONTAINMENT_KEY = 'containment_form_data';
const inputIds = ['speedInput', 'speedUnit', 'uaSize', 'sail', 'populationDensity', 'outdoorAssemblies'];

function saveContainmentForm() {
    const data = {};
    inputIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            data[id] = el.value;
        }
    });
    localStorage.setItem(CONTAINMENT_KEY, JSON.stringify(data));
}

function loadContainmentForm() {
    const data = JSON.parse(localStorage.getItem(CONTAINMENT_KEY));
    if (!data) {
        // Hvis ingen data, sett standard og lagre
        document.getElementById('speedInput').value = "20";
        document.getElementById('sail').value = "II";
        
        // ---- START PÅ FIX ----
        // Må kalle denne funksjonen for å fylle listen
        // før saveContainmentForm() kalles, slik at en
        // standardverdi for populationDensity blir lagret.
        updatePopulationDensityOptions();
        // ---- SLUTT PÅ FIX ----

        saveContainmentForm();
        return; // Gå ut
    }

    // Sett lagrede verdier
    if (data.speedInput) document.getElementById('speedInput').value = data.speedInput;
    if (data.speedUnit) document.getElementById('speedUnit').value = data.speedUnit;
    if (data.uaSize) document.getElementById('uaSize').value = data.uaSize;
    if (data.sail) document.getElementById('sail').value = data.sail;
    
    // VIKTIG: Oppdater populasjonsvalg FØR vi setter verdien
    updatePopulationDensityOptions();
    
    if (data.populationDensity) document.getElementById('populationDensity').value = data.populationDensity;
    if (data.outdoorAssemblies) document.getElementById('outdoorAssemblies').value = data.outdoorAssemblies;
}

function resetContainmentForm() {
    localStorage.removeItem(CONTAINMENT_KEY);
    location.reload();
}
// --- SLUTT: Lagringsfunksjoner ---


function updatePopulationDensityOptions() {
    const uaSize = document.getElementById('uaSize').value;
    const populationDensity = document.getElementById('populationDensity');
    const currentValue = populationDensity.value; // Ta vare på nåværende valgte verdi
    populationDensity.innerHTML = ''; // Tøm listen

    if (uaSize === '1m') {
        populationDensity.innerHTML += '<option value="50k">&lt; 50 000 ppl/km<sup>2</sup></option>';
        populationDensity.innerHTML += '<option value="NoLimit">No upper limit</option>';
    } else if (uaSize === '3mShelterApplicable') {
        populationDensity.innerHTML += '<option value="5k">&lt; 5 000 ppl/km<sup>2</sup></option>';
        populationDensity.innerHTML += '<option value="50k">&lt; 50 000 ppl/km<sup>2</sup></option>';
        populationDensity.innerHTML += '<option value="NoLimit">No upper limit</option>';
    } else if (uaSize === '3mShelterNotApplicable') {
        populationDensity.innerHTML += '<option value="500">&lt; 500 ppl/km<sup>2</sup></option>';
        populationDensity.innerHTML += '<option value="5k">&lt; 5 000 ppl/km<sup>2</sup></option>';
        populationDensity.innerHTML += '<option value="50k">&lt; 50 000 ppl/km<sup>2</sup></option>';
        populationDensity.innerHTML += '<option value="NoLimit">No upper limit</option>';
    } else {
        populationDensity.innerHTML += '<option value="50">&lt; 50 ppl/km<sup>2</sup></option>';
        populationDensity.innerHTML += '<option value="500">&lt; 500 ppl/km<sup>2</sup></option>';
        populationDensity.innerHTML += '<option value="5k">&lt; 5 000 ppl/km<sup>2</sup></option>';
        populationDensity.innerHTML += '<option value="50k">&lt; 50 000 ppl/km<sup>2</sup></option>';
        populationDensity.innerHTML += '<option value="NoLimit">No upper limit</option>';
    }
    
    // Prøv å sette tilbake forrige verdi hvis den fortsatt finnes
    if (Array.from(populationDensity.options).some(opt => opt.value === currentValue)) {
        populationDensity.value = currentValue;
    }
}

function getContainment(uaSize, sail, populationDensity, outdoorAssemblies) {
    let selectedColumn = populationDensity;
    if (outdoorAssemblies !== '40k' && (outdoorAssemblies === '400k' || populationDensity === 'NoLimit')) {
        selectedColumn = outdoorAssemblies === '400k' ? '400k' : '40kTo400k';
    }

    const values = containmentData[uaSize] && containmentData[uaSize][selectedColumn] && containmentData[uaSize][selectedColumn][outdoorAssemblies]
        ? containmentData[uaSize][selectedColumn][outdoorAssemblies]
        : containmentData[uaSize] && containmentData[uaSize][populationDensity] && containmentData[uaSize][populationDensity][outdoorAssemblies];

    if (!values) {
        console.error('No values found for the given selection');
        return 'Error';
    }

    return values[sail] || 'Error';
}

function calculateAdjacentArea() {
    const speed = parseFloat(document.getElementById('speedInput').value);
    const unit = document.getElementById('speedUnit').value;
    let speedInKmh;

    if (isNaN(speed)) {
        document.getElementById('adjacentArea').innerText = "-";
        return;
    }

    switch (unit) {
        case 'm/s':
            speedInKmh = speed * 3.6;
            break;
        case 'km/h':
            speedInKmh = speed;
            break;
        case 'kt':
            speedInKmh = speed * 1.852;
            break;
    }

    let distance = (speedInKmh * 3) / 60; // Convert km/h to km/min and multiply by 3 minutes
    if (distance < 5) distance = 5;
    if (distance > 35) distance = 35;

    document.getElementById('adjacentArea').innerText = `${distance.toFixed(distance % 1 === 0 ? 0 : 1)} km`;
}

function calculateContainment() {
    // Sjekk om data er lastet. Hvis ikke, ikke gjør noe.
    if (Object.keys(containmentData).length === 0) {
        console.error("Containment data is not loaded yet.");
        return;
    }

    const uaSize = document.getElementById('uaSize').value;
    const sail = document.getElementById('sail').value;
    const populationDensity = document.getElementById('populationDensity').value;
    const outdoorAssemblies = document.getElementById('outdoorAssemblies').value;

    const containment = getContainment(uaSize, sail, populationDensity, outdoorAssemblies);

    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = `<div>Required containment: ${containment}</div>`;
    resultDiv.className = 'result'; // Clear any existing class
    if (containment === 'Out of scope') {
        resultDiv.classList.add('out-of-scope');
    } else if (containment === 'Low') {
        resultDiv.classList.add('low');
    } else if (containment === 'Medium') {
        resultDiv.classList.add('medium');
    } else if (containment === 'High') {
        resultDiv.classList.add('high');
    }
}

// Funksjon for å kjøre kalkuleringer OG lagre
function runCalculationsAndSave() {
    calculateContainment();
    calculateAdjacentArea();
    saveContainmentForm();
}

// Initialiserer hele applikasjonen
async function initializeApp() {
    try {
        // 1. Last inn eksterne data
        const response = await fetch('data/containment_data.json');
        if (!response.ok) {
            throw new Error(`Failed to fetch containment_data.json: ${response.statusText}`);
        }
        containmentData = await response.json();

        // 2. Last inn lagrede brukerdata fra localStorage
        loadContainmentForm();

        // 3. Sett opp lyttere
        document.getElementById('uaSize').addEventListener('change', () => {
            updatePopulationDensityOptions();
            runCalculationsAndSave();
        });
        document.getElementById('sail').addEventListener('change', runCalculationsAndSave);
        document.getElementById('populationDensity').addEventListener('change', runCalculationsAndSave);
        document.getElementById('outdoorAssemblies').addEventListener('change', runCalculationsAndSave);
        document.getElementById('speedInput').addEventListener('input', runCalculationsAndSave);
        document.getElementById('speedUnit').addEventListener('change', runCalculationsAndSave);
        document.getElementById('resetContainmentForm').addEventListener('click', resetContainmentForm);

        // 4. Kjør kalkuleringer for første gang
        // updatePopulationDensityOptions() kalles allerede i loadContainmentForm
        calculateContainment();
        calculateAdjacentArea();

    } catch (error) {
        console.error("Failed to initialize containment calculator:", error);
        document.getElementById('result').innerHTML = `<div style="color: red;">Feil: Kunne ikke laste kalkulatordata.</div>`;
    }
}

// Vent til DOM er lastet, og kjør initialiseringen
document.addEventListener('DOMContentLoaded', initializeApp);