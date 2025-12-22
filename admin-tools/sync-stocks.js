const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Path to the Python script
const PYTHON_SCRIPT = path.join(__dirname, 'stock-data-service', 'main.py');

// Function to run python script
function runSync() {
    console.log('🚀 Starting Stock Price Sync...');
    console.log(`Script: ${PYTHON_SCRIPT}`);

    // Check if conda is activated or just try 'python'
    // We assume the user has set up the environment or we can try to activate it if we knew the shell.
    // simpler to assume 'python' is the correct one (e.g. from an activated terminal) 
    // OR we explicitly call via the batch file which sets up conda.

    // However, if we want to run this from node, we might just spawn 'python'.

    const pythonProcess = spawn('python', [PYTHON_SCRIPT, '--sync-all'], {
        stdio: 'inherit', // Pipe output directly to console
        shell: true       // Use shell to pick up environment
    });

    pythonProcess.on('close', (code) => {
        if (code === 0) {
            console.log('✅ Sync completed successfully.');
        } else {
            console.error(`❌ Sync failed with code ${code}`);
        }
    });
}

runSync();
