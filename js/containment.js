const containmentData = {
    "1m": {
        "NoLimit": {
            "400k": {"I": "High", "II": "High", "III": "Medium", "IV": "Low", "V": "Low", "VI": "Low"},
            "40kTo400k": {"I": "Medium", "II": "Medium", "III": "Low", "IV": "Low", "V": "Low", "VI": "Low"},
            "40k": {"I": "Medium", "II": "Medium", "III": "Low", "IV": "Low", "V": "Low", "VI": "Low"}
        },
        "50k": {
            "400k": {"I": "High", "II": "High", "III": "Medium", "IV": "Low", "V": "Low", "VI": "Low"},
            "40kTo400k": {"I": "Medium", "II": "Medium", "III": "Low", "IV": "Low", "V": "Low", "VI": "Low"},
            "40k": {"I": "Low", "II": "Low", "III": "Low", "IV": "Low", "V": "Low", "VI": "Low"}
        }
    },
    "3mShelterApplicable": {
        "NoLimit": {
            "400k": {"I": "Out of scope", "II": "Out of scope", "III": "Out of scope", "IV": "Medium", "V": "Medium", "VI": "Low"},
            "40kTo400k": {"I": "High", "II": "High", "III": "Medium", "IV": "Low", "V": "Low", "VI": "Low"},
            "40k": {"I": "High", "II": "High", "III": "Medium", "IV": "Low", "V": "Low", "VI": "Low"}
        },
        "50k": {
            "400k": {"I": "Out of scope", "II": "Out of scope", "III": "Out of scope", "IV": "Medium", "V": "Medium", "VI": "Low"},
            "40kTo400k": {"I": "High", "II": "High", "III": "Medium", "IV": "Low", "V": "Low", "VI": "Low"},
            "40k": {"I": "Medium", "II": "Medium", "III": "Low", "IV": "Low", "V": "Low", "VI": "Low"}
        },
        "5k": {
            "400k": {"I": "Out of scope", "II": "Out of scope", "III": "Out of scope", "IV": "Medium", "V": "Medium", "VI": "Low"},
            "40kTo400k": {"I": "High", "II": "High", "III": "Medium", "IV": "Low", "V": "Low", "VI": "Low"},
            "40k": {"I": "Low", "II": "Low", "III": "Low", "IV": "Low", "V": "Low", "VI": "Low"}
        }
    },
    "3mShelterNotApplicable": {
        "NoLimit": {
            "400k": {"I": "Out of scope", "II": "Out of scope", "III": "Out of scope", "IV": "Medium", "V": "Medium", "VI": "Low"},
            "40kTo400k": {"I": "Out of scope", "II": "Out of scope", "III": "Out of scope", "IV": "Medium", "V": "Medium", "VI": "Low"},
            "40k": {"I": "Out of scope", "II": "Out of scope", "III": "Out of scope", "IV": "Medium", "V": "Medium", "VI": "Low"}
        },
        "50k": {
            "400k": {"I": "Out of scope", "II": "Out of scope", "III": "Out of scope", "IV": "Medium", "V": "Medium", "VI": "Low"},
            "40kTo400k": {"I": "High", "II": "High", "III": "Medium", "IV": "Low", "V": "Low", "VI": "Low"},
            "40k": {"I": "High", "II": "High", "III": "Medium", "IV": "Low", "V": "Low", "VI": "Low"}
        },
        "5k": {
            "400k": {"I": "Out of scope", "II": "Out of scope", "III": "Out of scope", "IV": "Medium", "V": "Low", "VI": "Low"},
            "40kTo400k": {"I": "High", "II": "High", "III": "Medium", "IV": "Low", "V": "Low", "VI": "Low"},
            "40k": {"I": "Medium", "II": "Medium", "III": "Low", "IV": "Low", "V": "Low", "VI": "Low"}
        },
        "500": {
            "400k": {"I": "Out of scope", "II": "Out of scope", "III": "Out of scope", "IV": "Medium", "V": "Medium", "VI": "Low"},
            "40kTo400k": {"I": "High", "II": "High", "III": "Medium", "IV": "Low", "V": "Low", "VI": "Low"},
            "40k": {"I": "Low", "II": "Low", "III": "Low", "IV": "Low", "V": "Low", "VI": "Low"}
        }
    },
    "8m": {
        "NoLimit": {
            "400k": {"I": "Out of scope", "II": "Out of scope", "III": "Out of scope", "IV": "Out of scope", "V": "Medium", "VI": "Low"},
            "40kTo400k": {"I": "Out of scope", "II": "Out of scope", "III": "Out of scope", "IV": "Out of scope", "V": "Medium", "VI": "Low"},
            "40k": {"I": "Out of scope", "II": "Out of scope", "III": "Out of scope", "IV": "Out of scope", "V": "Medium", "VI": "Low"}
        },
        "50k": {
            "400k": {"I": "Out of scope", "II": "Out of scope", "III": "Out of scope", "IV": "Out of scope", "V": "Medium", "VI": "Low"},
            "40kTo400k": {"I": "Out of scope", "II": "Out of scope", "III": "Out of scope", "IV": "Medium", "V": "Low", "VI": "Low"},
            "40k": {"I": "Out of scope", "II": "Out of scope", "III": "Out of scope", "IV": "Medium", "V": "Low", "VI": "Low"}
        },
        "5k": {
            "400k": {"I": "Out of scope", "II": "Out of scope", "III": "Out of scope", "IV": "Out of scope", "V": "Medium", "VI": "Low"},
            "40kTo400k": {"I": "Out of scope", "II": "Out of scope", "III": "Out of scope", "IV": "Medium", "V": "Low", "VI": "Low"},
            "40k": {"I": "High", "II": "High", "III": "Medium", "IV": "Low", "V": "Low", "VI": "Low"}
        },
        "500": {
            "400k": {"I": "Out of scope", "II": "Out of scope", "III": "Out of scope", "IV": "Out of scope", "V": "Medium", "VI": "Low"},
            "40kTo400k": {"I": "Out of scope", "II": "Out of scope", "III": "Out of scope", "IV": "Out of scope", "V": "Medium", "VI": "Low"},
            "40k": {"I": "Medium", "II": "Medium", "III": "Low", "IV": "Low", "V": "Low", "VI": "Low"}
        },
        "50": {
            "400k": {"I": "Out of scope", "II": "Out of scope", "III": "Out of scope", "IV": "Out of scope", "V": "Medium", "VI": "Low"},
            "40kTo400k": {"I": "Out of scope", "II": "Out of scope", "III": "Out of scope", "IV": "Out of scope", "V": "Medium", "VI": "Low"},
            "40k": {"I": "Low", "II": "Low", "III": "Low", "IV": "Low", "V": "Low", "VI": "Low"}
        }
    },
    "20m": {
        "NoLimit": {
            "400k": {"I": "Out of scope", "II": "Out of scope", "III": "Out of scope", "IV": "Out of scope", "V": "Out of scope", "VI": "Medium"},
            "40kTo400k": {"I": "Out of scope", "II": "Out of scope", "III": "Out of scope", "IV": "Out of scope", "V": "Out of scope", "VI": "Medium"},
            "40k": {"I": "Out of scope", "II": "Out of scope", "III": "Out of scope", "IV": "Out of scope", "V": "Out of scope", "VI": "Medium"}
        },
        "50k": {
            "400k": {"I": "Out of scope", "II": "Out of scope", "III": "Out of scope", "IV": "Out of scope", "V": "Out of scope", "VI": "Medium"},
            "40kTo400k": {"I": "Out of scope", "II": "Out of scope", "III": "Out of scope", "IV": "Out of scope", "V": "Medium", "VI": "Low"},
            "40k": {"I": "Out of scope", "II": "Out of scope", "III": "Out of scope", "IV": "Out of scope", "V": "Medium", "VI": "Low"}
        },
        "5k": {
            "400k": {"I": "Out of scope", "II": "Out of scope", "III": "Out of scope", "IV": "Out of scope", "V": "Out of scope", "VI": "Medium"},
            "40kTo400k": {"I": "Out of scope", "II": "Out of scope", "III": "Out of scope", "IV": "Out of scope", "V": "Medium", "VI": "Low"},
            "40k": {"I": "Out of scope", "II": "Out of scope", "III": "Out of scope", "IV": "Medium", "V": "Low", "VI": "Low"}
        },
        "500": {
            "400k": {"I": "Out of scope", "II": "Out of scope", "III": "Out of scope", "IV": "Out of scope", "V": "Out of scope", "VI": "Medium"},
            "40kTo400k": {"I": "Out of scope", "II": "Out of scope", "III": "Out of scope", "IV": "Out of scope", "V": "Medium", "VI": "Low"},
            "40k": {"I": "High", "II": "High", "III": "Medium", "IV": "Low", "V": "Low", "VI": "Low"}
        },
        "50": {
            "400k": {"I": "Out of scope", "II": "Out of scope", "III": "Out of scope", "IV": "Out of scope", "V": "Out of scope", "VI": "Medium"},
            "40kTo400k": {"I": "Out of scope", "II": "Out of scope", "III": "Out of scope", "IV": "Out of scope", "V": "Medium", "VI": "Low"},
            "40k": {"I": "Medium", "II": "Low", "III": "Low", "IV": "Low", "V": "Low", "VI": "Low"}
        }
    },
    "40m": {
        "NoLimit": {
            "400k": {"I": "Out of scope", "II": "Out of scope", "III": "Out of scope", "IV": "Out of scope", "V": "Out of scope", "VI": "Out of scope"},
            "40kTo400k": {"I": "Out of scope", "II": "Out of scope", "III": "Out of scope", "IV": "Out of scope", "V": "Out of scope", "VI": "Out of scope"},
            "40k": {"I": "Out of scope", "II": "Out of scope", "III": "Out of scope", "IV": "Out of scope", "V": "Out of scope", "VI": "Out of scope"}
        },
        "50k": {
            "400k": {"I": "Out of scope", "II": "Out of scope", "III": "Out of scope", "IV": "Out of scope", "V": "Out of scope", "VI": "Out of scope"},
            "40kTo400k": {"I": "Out of scope", "II": "Out of scope", "III": "Out of scope", "IV": "Out of scope", "V": "Out of scope", "VI": "Medium"},
            "40k": {"I": "Out of scope", "II": "Out of scope", "III": "Out of scope", "IV": "Out of scope", "V": "Out of scope", "VI": "Medium"}
        },
        "5k": {
            "400k": {"I": "Out of scope", "II": "Out of scope", "III": "Out of scope", "IV": "Out of scope", "V": "Out of scope", "VI": "Out of scope"},
            "40kTo400k": {"I": "Out of scope", "II": "Out of scope", "III": "Out of scope", "IV": "Out of scope", "V": "Out of scope", "VI": "Medium"},
            "40k": {"I": "Out of scope", "II": "Out of scope", "III": "Out of scope", "IV": "Out of scope", "V": "Medium", "VI": "Low"}
        },
        "500": {
            "400k": {"I": "Out of scope", "II": "Out of scope", "III": "Out of scope", "IV": "Out of scope", "V": "Out of scope", "VI": "Out of scope"},
            "40kTo400k": {"I": "Out of scope", "II": "Out of scope", "III": "Out of scope", "IV": "Out of scope", "V": "Out of scope", "VI": "Medium"},
            "40k": {"I": "Out of scope", "II": "Out of scope", "III": "Out of scope", "IV": "Medium", "V": "Low", "VI": "Low"}
        },
        "50": {
            "400k": {"I": "Out of scope", "II": "Out of scope", "III": "Out of scope", "IV": "Out of scope", "V": "Out of scope", "VI": "Out of scope"},
            "40kTo400k": {"I": "Out of scope", "II": "Out of scope", "III": "Out of scope", "IV": "Out of scope", "V": "Out of scope", "VI": "Medium"},
            "40k": {"I": "High", "II": "High", "III": "Medium", "IV": "Low", "V": "Low", "VI": "Low"}
        }
    }
};

function updatePopulationDensityOptions() {
    const uaSize = document.getElementById('uaSize').value;
    const populationDensity = document.getElementById('populationDensity');
    populationDensity.innerHTML = '';

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
}

function getContainment(uaSize, sail, populationDensity, outdoorAssemblies) {
    console.clear();
    console.log(`UA Size: ${uaSize}`);
    console.log(`SAIL: ${sail}`);
    console.log(`Population Density: ${populationDensity}`);
    console.log(`Outdoor Assemblies: ${outdoorAssemblies}`);

    let selectedColumn = populationDensity;
    if (outdoorAssemblies !== '40k' && (outdoorAssemblies === '400k' || populationDensity === 'NoLimit')) {
        selectedColumn = outdoorAssemblies === '400k' ? '400k' : '40kTo400k';
    }

    console.log(`Selected Column: ${selectedColumn}`);

    const values = containmentData[uaSize][selectedColumn] && containmentData[uaSize][selectedColumn][outdoorAssemblies]
        ? containmentData[uaSize][selectedColumn][outdoorAssemblies]
        : containmentData[uaSize][populationDensity] && containmentData[uaSize][populationDensity][outdoorAssemblies];

    console.log(`Values from table: ${JSON.stringify(values)}`);

    if (!values) {
        console.error('No values found for the given selection');
        return 'Error';
    }

    let containment = values[sail];

    if (containment === "Out of scope") {
        console.log(`Containment Level: ${containment}`);
        return containment;
    }

    console.log(`Containment Level: ${containment}`);
    return containment;
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

document.getElementById('uaSize').addEventListener('change', updatePopulationDensityOptions);
document.getElementById('uaSize').addEventListener('change', calculateContainment);
document.getElementById('sail').addEventListener('change', calculateContainment);
document.getElementById('populationDensity').addEventListener('change', calculateContainment);
document.getElementById('outdoorAssemblies').addEventListener('change', calculateContainment);
document.getElementById('speedInput').addEventListener('input', calculateAdjacentArea);
document.getElementById('speedUnit').addEventListener('change', calculateAdjacentArea);

// Initialize population density options based on default UA Size selection
updatePopulationDensityOptions();
calculateContainment();
calculateAdjacentArea(); // Calculate adjacent area on page load