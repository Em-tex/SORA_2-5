function handleSelection(tableId) {
    const table = document.getElementById(tableId);
    table.querySelectorAll('td[data-clickable]').forEach(cell => {
        cell.addEventListener('click', function() {
            // If it's the GRC table, only allow one cell to be selected
            if (tableId === 'grcTable') {
                table.querySelectorAll('td[data-clickable]').forEach(cell => {
                    cell.classList.remove('selected');
                });
                this.classList.add('selected');
            } else { // For mitigation table, allow one cell per row
                const row = this.parentElement;
                row.querySelectorAll('td[data-clickable]').forEach(cell => {
                    cell.classList.remove('selected');
                });
                this.classList.add('selected');

                // Disable conflicting selections
                handleMitigationSelection(this);
            }
            calculateFinalGRC(); // Recalculate GRC whenever a selection is made
        });
    });
}

function handleMitigationSelection(selectedCell) {
    const table = document.getElementById('mitigationTable');
    const rowIndex = selectedCell.parentElement.rowIndex;
    const cellIndex = selectedCell.cellIndex;

    console.log(`Selected cell at row: ${rowIndex}, column: ${cellIndex}`);

    // Reset only the M1(B) conflicting cells to be selectable again if a different M1(A) cell is selected
    if (rowIndex === 2 && cellIndex !== 3) {
        console.log('Re-enabling M1(B) cells');
        table.querySelectorAll('td.na').forEach(cell => {
            if (cell.parentElement.rowIndex === 3 && (cell.cellIndex === 3 || cell.cellIndex === 4)) {
                cell.classList.remove('na');
                if (cell.getAttribute('data-original-text')) {
                    cell.textContent = cell.getAttribute('data-original-text');
                }
                cell.setAttribute('data-clickable', 'true');
                cell.style.backgroundColor = '#ffffff';
                console.log(`Re-enabled cell at row: ${cell.parentElement.rowIndex}, column: ${cell.cellIndex}, content: ${cell.textContent}`);
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
    cell.classList.add('na');
    cell.setAttribute('data-original-text', cell.textContent);
    cell.textContent = 'N/A';
    cell.removeAttribute('data-clickable');
    cell.classList.remove('selected'); // Remove selected class if the cell was selected
    cell.style.backgroundColor = '#e0e0e0';
    console.log(`Disabled cell at row: ${cell.parentElement.rowIndex}, column: ${cell.cellIndex}, content: ${cell.textContent}`);
}

function handleARCSelection() {
    document.querySelectorAll('.arc-button').forEach(button => {
        button.addEventListener('click', function() {
            // Remove selected class from all buttons
            document.querySelectorAll('.arc-button').forEach(btn => {
                btn.classList.remove('selected-arc-a', 'selected-arc-b', 'selected-arc-c', 'selected-arc-d');
            });

            // Add selected class based on data-arc attribute
            const arcClass = this.getAttribute('data-arc');
            this.classList.add(`selected-${arcClass}`);
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
        console.log(`Selected GRC: ${finalGRC}`);
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

    console.log(`M1 Mitigation Value: ${m1MitigationValue}`);
    console.log(`M2 Mitigation Value: ${m2MitigationValue}`);

    const gRCColIndex = selectedGRC ? selectedGRC.cellIndex : -1;
    const m1Used = m1MitigationValue !== 0;

    if (m1Used && (gRCColIndex >= 5 && gRCColIndex <= 6)) {
        finalGRC = Math.max(finalGRC - Math.abs(m1MitigationValue), 3);
    } else if (finalGRC == 5 && (m1Used && gRCColIndex === 4)) {
        finalGRC = Math.max(finalGRC - Math.abs(m1MitigationValue), 3); // GRC cannot be lower than 3 before M2
    } else if (finalGRC == 6 && (m1Used && gRCColIndex === 4)) {
        finalGRC = Math.max(finalGRC - Math.abs(m1MitigationValue), 3); // GRC cannot be lower than 3 before M2
    } else if (finalGRC == 4 && (m1Used && gRCColIndex === 3)) {
        finalGRC = Math.max(finalGRC - Math.abs(m1MitigationValue), 2); // GRC cannot be lower than 2 before M2
    } else if (finalGRC == 5 && (m1Used && gRCColIndex === 3)) {
        finalGRC = Math.max(finalGRC - Math.abs(m1MitigationValue), 2); // GRC cannot be lower than 2 before M2
    } else if (finalGRC == 2 && (m1Used && gRCColIndex === 4)) {
        finalGRC = Math.max(finalGRC - Math.abs(m1MitigationValue), 2); // GRC cannot be lower than 2 before M2
    } else {
        finalGRC -= Math.abs(m1MitigationValue); // Apply M1 mitigation values to reduce GRC
    }

    finalGRC -= Math.abs(m2MitigationValue); // Apply M2 mitigation values to reduce GRC further

    finalGRC = Math.max(finalGRC, 1); // Final GRC cannot be lower than 1

    document.getElementById('finalGRC').textContent = finalGRC;
    console.log(`Final GRC: ${finalGRC}`);

    // Highlight the SAIL in the table
    highlightSAIL(finalGRC, selectedARC ? selectedARC.getAttribute('data-arc') : null);
}

function highlightSAIL(finalGRC, selectedARC) {
    const sailTable = document.getElementById('sailTable');
    sailTable.querySelectorAll('td').forEach(cell => {
        cell.classList.remove('highlight');
    });

    if (finalGRC <= 2) {
        finalGRC = '≤2';
    } else if (finalGRC >= 8) {
        document.getElementById('sail').textContent = 'Certified category';
        const row = Array.from(sailTable.rows).find(row => row.cells[0].textContent.trim() == '>7');
        if (row) {
            row.cells[1].classList.add('highlight');
        }
        return;
    }

    if (finalGRC && selectedARC) {
        const row = Array.from(sailTable.rows).find(row => row.cells[0].textContent.trim() == finalGRC);
        const arcIndex = { 'arc-a': 1, 'arc-b': 2, 'arc-c': 3, 'arc-d': 4 }[selectedARC];
        if (row && arcIndex !== undefined) {
            row.cells[arcIndex].classList.add('highlight');
            document.getElementById('sail').textContent = row.cells[arcIndex].textContent;
        }
    }
}

// Initialize selection handling for each table and ARC buttons
handleSelection('grcTable');
handleSelection('mitigationTable');
handleARCSelection();

// Calculate final GRC and SAIL whenever a selection is made
document.querySelectorAll('td[data-clickable], .arc-button').forEach(item => {
    item.addEventListener('click', calculateFinalGRC);
});

// Calculate initial GRC and SAIL
calculateFinalGRC();