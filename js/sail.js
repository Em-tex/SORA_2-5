// Definerer nøkler for localStorage
const GRC_KEY = 'sail_grc_selection';
const MITIGATION_KEY = 'sail_mitigation_selections';
const ARC_KEY = 'sail_arc_selection';

function handleSelection(tableId) {
    const table = document.getElementById(tableId);
    table.querySelectorAll('td[data-clickable]').forEach(cell => {
        cell.addEventListener('click', function() {
            if (tableId === 'grcTable') {
                table.querySelectorAll('td[data-clickable]').forEach(c => c.classList.remove('selected'));
                this.classList.add('selected');
                // Lagre GRC-valg
                localStorage.setItem(GRC_KEY, JSON.stringify({
                    rowId: this.parentElement.id,
                    cellIndex: this.cellIndex
                }));
            } else { // mitigationTable
                const row = this.parentElement;
                row.querySelectorAll('td[data-clickable]').forEach(c => c.classList.remove('selected'));
                this.classList.add('selected');
                handleMitigationSelection(this);
                saveMitigationSelections(); // Lagre alle mitigeringsvalg
            }
            calculateFinalGRC();
        });
    });
}

function saveMitigationSelections() {
    const selections = {};
    document.querySelectorAll('#mitigationTable tbody tr').forEach(row => {
        const selectedCell = row.querySelector('td.selected');
        if (selectedCell) {
            selections[row.id] = selectedCell.cellIndex;
        }
    });
    localStorage.setItem(MITIGATION_KEY, JSON.stringify(selections));
}

function handleMitigationSelection(selectedCell) {
    const table = document.getElementById('mitigationTable');
    const rowIndex = selectedCell.parentElement.rowIndex;
    const cellIndex = selectedCell.cellIndex;

    // Reset M1(B) cells
    if (rowIndex === 2 && cellIndex !== 3) { // M1(A) is NOT -2
        table.querySelectorAll('td.na').forEach(cell => {
            if (cell.parentElement.rowIndex === 3 && (cell.cellIndex === 3 || cell.cellIndex === 4)) {
                cell.classList.remove('na');
                if (cell.getAttribute('data-original-text')) {
                    cell.textContent = cell.getAttribute('data-original-text');
                }
                cell.setAttribute('data-clickable', 'true');
                cell.style.backgroundColor = '#ffffff';
            }
        });
    }

    // If M1(A) -2 is selected, disable M1(B) -1 and -2
    if (rowIndex === 2 && cellIndex === 3) {
        disableMitigationCell(table.rows[3].cells[3]);
        disableMitigationCell(table.rows[3].cells[4]);
    }
}

function disableMitigationCell(cell) {
    if (cell.classList.contains('selected')) {
        // If the cell to be disabled is selected, move selection to 'None'
        const row = cell.parentElement;
        row.cells[2].classList.add('selected'); // 'None' is at cellIndex 2
    }
    cell.classList.add('na');
    cell.setAttribute('data-original-text', cell.textContent);
    cell.textContent = 'N/A';
    cell.removeAttribute('data-clickable');
    cell.classList.remove('selected');
    cell.style.backgroundColor = '#e0e0e0';
}

function handleARCSelection() {
    document.querySelectorAll('.arc-button').forEach(button => {
        button.addEventListener('click', function() {
            document.querySelectorAll('.arc-button').forEach(btn => {
                btn.classList.remove('selected-arc-a', 'selected-arc-b', 'selected-arc-c', 'selected-arc-d');
            });
            const arcClass = this.getAttribute('data-arc');
            this.classList.add(`selected-${arcClass}`);
            // Lagre ARC-valg
            localStorage.setItem(ARC_KEY, arcClass);
            calculateFinalGRC(); // Sørg for at kalkulering kjører
        });
    });
}

function calculateFinalGRC() {
    let finalGRC = 1;
    let m1MitigationValue = 0;
    let m2MitigationValue = 0;
    const selectedGRC = document.querySelector('#grcTable .selected');
    const selectedMitigations = document.querySelectorAll('#mitigationTable .selected');
    const selectedARC = document.querySelector('.arc-button.selected-arc-a, .arc-button.selected-arc-b, .arc-button.selected-arc-c, .arc-button.selected-arc-d');

    if (selectedGRC) {
        finalGRC = parseInt(selectedGRC.textContent);
    }

    selectedMitigations.forEach(selectedMitigation => {
        const value = parseInt(selectedMitigation.textContent);
        if (!isNaN(value)) {
            if (selectedMitigation.parentElement.textContent.includes("M2")) {
                m2MitigationValue += value;
            } else {
                m1MitigationValue += value;
            }
        }
    });

    const gRCColIndex = selectedGRC ? selectedGRC.cellIndex : -1;
    const m1Used = m1MitigationValue !== 0;

    if (m1Used && (gRCColIndex >= 5 && gRCColIndex <= 6)) {
        finalGRC = Math.max(finalGRC - Math.abs(m1MitigationValue), 3);
    } else if (finalGRC == 5 && (m1Used && gRCColIndex === 4)) {
        finalGRC = Math.max(finalGRC - Math.abs(m1MitigationValue), 3);
    } else if (finalGRC == 6 && (m1Used && gRCColIndex === 4)) {
        finalGRC = Math.max(finalGRC - Math.abs(m1MitigationValue), 3);
    } else if (finalGRC == 4 && (m1Used && gRCColIndex === 3)) {
        finalGRC = Math.max(finalGRC - Math.abs(m1MitigationValue), 2);
    } else if (finalGRC == 5 && (m1Used && gRCColIndex === 3)) {
        finalGRC = Math.max(finalGRC - Math.abs(m1MitigationValue), 2);
    } else if (finalGRC == 2 && (m1Used && gRCColIndex === 4)) {
        finalGRC = Math.max(finalGRC - Math.abs(m1MitigationValue), 2);
    } else {
        finalGRC -= Math.abs(m1MitigationValue);
    }

    finalGRC -= Math.abs(m2MitigationValue);
    finalGRC = Math.max(finalGRC, 1);

    document.getElementById('finalGRC').textContent = finalGRC;
    highlightSAIL(finalGRC, selectedARC ? selectedARC.getAttribute('data-arc') : 'arc-a');
}

function highlightSAIL(finalGRC, selectedARC) {
    const sailTable = document.getElementById('sailTable');
    sailTable.querySelectorAll('td').forEach(cell => {
        cell.classList.remove('highlight');
    });

    let grcRowText = finalGRC.toString();
    if (finalGRC <= 2) {
        grcRowText = '≤2';
    } else if (finalGRC >= 8) {
        document.getElementById('sail').textContent = 'Certified category';
        const row = Array.from(sailTable.rows).find(row => row.cells[0].textContent.trim() == '>7');
        if (row) row.cells[1].classList.add('highlight');
        return;
    }

    if (grcRowText && selectedARC) {
        const row = Array.from(sailTable.rows).find(r => r.cells[0].textContent.trim() == grcRowText);
        const arcIndex = { 'arc-a': 1, 'arc-b': 2, 'arc-c': 3, 'arc-d': 4 }[selectedARC];
        if (row && arcIndex !== undefined) {
            row.cells[arcIndex].classList.add('highlight');
            document.getElementById('sail').textContent = row.cells[arcIndex].textContent;
        }
    }
}

function loadSailSelections() {
    // 1. Last GRC
    const grcData = JSON.parse(localStorage.getItem(GRC_KEY));
    if (grcData) {
        document.querySelectorAll('#grcTable td[data-clickable]').forEach(c => c.classList.remove('selected'));
        const row = document.getElementById(grcData.rowId);
        if (row && row.cells[grcData.cellIndex]) {
            row.cells[grcData.cellIndex].classList.add('selected');
        }
    }

    // 2. Last Mitigations
    const mitData = JSON.parse(localStorage.getItem(MITIGATION_KEY));
    if (mitData) {
        document.querySelectorAll('#mitigationTable tbody tr').forEach(row => {
            row.querySelectorAll('td[data-clickable]').forEach(c => c.classList.remove('selected'));
            const selIndex = mitData[row.id];
            if (selIndex !== undefined && row.cells[selIndex]) {
                const cellToSelect = row.cells[selIndex];
                cellToSelect.classList.add('selected');
                // Kjør logikk for å deaktivere M1(B) om nødvendig
                if (row.id === 'mit-row-0' && selIndex === 3) { // M1(A) er -2
                    handleMitigationSelection(cellToSelect);
                }
            }
        });
    }

    // 3. Last ARC
    const arcData = localStorage.getItem(ARC_KEY);
    if (arcData) {
        document.querySelectorAll('.arc-button').forEach(btn => {
            btn.classList.remove('selected-arc-a', 'selected-arc-b', 'selected-arc-c', 'selected-arc-d');
            if (btn.getAttribute('data-arc') === arcData) {
                btn.classList.add(`selected-${arcData}`);
            }
        });
    }
}

function resetSailForm() {
    // 1. Fjern fra localStorage
    localStorage.removeItem(GRC_KEY);
    localStorage.removeItem(MITIGATION_KEY);
    localStorage.removeItem(ARC_KEY);

    // 2. Sett standardvalg manuelt (eller location.reload())
    // location.reload() er enklest
    location.reload();
}

// --- Initialisering ---

// Kjør selection handlers
handleSelection('grcTable');
handleSelection('mitigationTable');
handleARCSelection();

// Last inn lagrede valg når siden lastes
document.addEventListener('DOMContentLoaded', () => {
    loadSailSelections();
    calculateFinalGRC(); // Kalkuler GRC/SAIL basert på lagrede data
});

// Legg til lytter for nullstill-knappen
document.getElementById('resetSailForm').addEventListener('click', resetSailForm);