const { spawn } = require('child_process');
const path = require('path');

// Path to the Python script
const PYTHON_SCRIPT = path.join(__dirname, 'stock-data-service', 'generate_stock_list.py');

function updateList() {
    console.log('📜 Generating Stock List (stocks.json)...');
    console.log(`Script: ${PYTHON_SCRIPT}`);

    const pythonProcess = spawn('python', [PYTHON_SCRIPT], {
        stdio: 'inherit',
        shell: true
    });

    pythonProcess.on('close', (code) => {
        if (code === 0) {
            console.log('✅ Stock list updated successfully.');
        } else {
            console.error(`❌ Failed to update stock list with code ${code}`);
        }
    });
}

updateList();
