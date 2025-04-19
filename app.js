/*document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded');
    
    // Basic UI elements
    const authorizeButton = document.getElementById('authorize');
    const loadingElement = document.getElementById('loading');
    const debugInfoElement = document.getElementById('debug-info');
    const debugContainer = document.getElementById('debug-controls');
    
    // Create a simple test area
    const testArea = document.createElement('div');
    testArea.innerHTML = `
        <div id="sheet-test-area" style="margin-top: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 5px;">
            <h3>Google Sheets API Test</h3>
            <div style="margin: 15px 0;">
                <input type="text" id="test-name" placeholder="Name" style="padding: 8px; margin-right: 10px;">
                <input type="email" id="test-email" placeholder="Email" style="padding: 8px; margin-right: 10px;">
                <button id="test-check-btn" style="padding: 8px 15px;">Check Registration</button>
            </div>
            <div style="margin: 15px 0;">
                <button id="read-sheet-btn" style="padding: 8px 15px; margin-right: 10px;">Read Sheet</button>
                <button id="write-test-btn" style="padding: 8px 15px;">Write Test Data</button>
            </div>
            <div id="sheet-output" style="margin-top: 15px; padding: 10px; background: #f5f5f5; min-height: 100px; max-height: 300px; overflow: auto;"></div>
        </div>
    `;
    document.querySelector('.container').insertBefore(testArea, debugContainer);
    
    // Debug log function
    function debugLog(message) {
        console.log(message);
        const timestamp = new Date().toLocaleTimeString();
        
        // Add to debug info if it exists
        if (debugInfoElement) {
            debugInfoElement.innerHTML += `<div>[${timestamp}] ${message}</div>`;
            debugInfoElement.scrollTop = debugInfoElement.scrollHeight;
        }
        
        // Also add to sheet output area
        const sheetOutput = document.getElementById('sheet-output');
        if (sheetOutput) {
            sheetOutput.innerHTML += `<div>[${timestamp}] ${message}</div>`;
            sheetOutput.scrollTop = sheetOutput.scrollHeight;
        }
    }
    
    // Show/hide loading
    function showLoading(show) {
        if (loadingElement) {
            loadingElement.style.display = show ? 'flex' : 'none';
        }
    }
    
    // Hide loading at start
    showLoading(false);
    
    // Google Sheets API configuration
    const CLIENT_ID = '1044487611714-hhjuj7qgsbd92u8e2hmi93rgumbft94d.apps.googleusercontent.com';
    const API_KEY = 'AIzaSyCHmP2iZi3JtiJgsEzBOZVhjxvM2UGEo0Q';
    const SPREADSHEET_ID = '1oIC0LfAL6Nti-0UZRr1bqhvjAJctF7Wb1c0GkfH8sWA';
    const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';
    
    let accessToken = null;
    
    // Initialize Google Auth
    function initGoogleAuth() {
        debugLog('Initializing Google Auth...');
        
        // Initialize token client
        const tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: (tokenResponse) => {
                if (tokenResponse.error) {
                    debugLog('Error getting token: ' + tokenResponse.error);
                    return;
                }
                
                accessToken = tokenResponse.access_token;
                debugLog('Access token obtained successfully');
                
                // Enable the test buttons
                document.getElementById('test-check-btn').disabled = false;
                document.getElementById('read-sheet-btn').disabled = false;
                document.getElementById('write-test-btn').disabled = false;
                
                // Hide the authorization area
                const authContainer = document.getElementById('auth-container');
                if (authContainer) {
                    authContainer.style.display = 'none';
                }
                
                showLoading(false);
            }
        });
        
        // Set up authorize button
        authorizeButton.addEventListener('click', () => {
            debugLog('Authorization requested...');
            showLoading(true);
            tokenClient.requestAccessToken();
        });
        
        // Disable test buttons until authorized
        document.getElementById('test-check-btn').disabled = true;
        document.getElementById('read-sheet-btn').disabled = true;
        document.getElementById('write-test-btn').disabled = true;
    }
    
    // Read from sheet
    function readSheet() {
        if (!accessToken) {
            debugLog('No access token available. Please authorize first.');
            return;
        }
        
        showLoading(true);
        debugLog('Reading from spreadsheet...');
        
        fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Sheet1!A:C`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            debugLog('Spreadsheet data received:');
            debugLog(JSON.stringify(data.values, null, 2));
            showLoading(false);
        })
        .catch(error => {
            debugLog('Error reading spreadsheet: ' + error.message);
            showLoading(false);
        });
    }
    
    // Write to sheet
    function writeToSheet(name, email, checkedIn) {
        if (!accessToken) {
            debugLog('No access token available. Please authorize first.');
            return;
        }
        
        // Find the next empty row or append to the end
        readSheetForWriting(name, email, checkedIn);
    }
    
    function readSheetForWriting(name, email, checkedIn) {
        showLoading(true);
        debugLog(`Preparing to write data for ${name} (${email})`);
        
        fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Sheet1!A:C`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            const rows = data.values || [];
            let rowIndex = -1;
            let alreadyCheckedIn = false;
            
            // Look for the email in existing rows
            for (let i = 0; i < rows.length; i++) {
                if (rows[i][1] && rows[i][1].toLowerCase() === email.toLowerCase()) {
                    rowIndex = i + 1;  // +1 because sheet rows are 1-indexed
                    alreadyCheckedIn = rows[i][2] === 'Yes';
                    break;
                }
            }
            
            if (rowIndex === -1) {
                // Add a new row
                appendRow(name, email, checkedIn);
            } else if (!alreadyCheckedIn) {
                // Update existing row
                updateRow(rowIndex, checkedIn);
            } else {
                debugLog(`${name} is already checked in`);
                showLoading(false);
            }
        })
        .catch(error => {
            debugLog('Error reading spreadsheet for writing: ' + error.message);
            showLoading(false);
        });
    }
    
    function appendRow(name, email, checkedIn) {
        debugLog(`Appending new row for ${name}`);
        
        fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Sheet1!A:C:append?valueInputOption=USER_ENTERED`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                values: [[name, email, checkedIn]]
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            debugLog(`New row added for ${name}`);
            showLoading(false);
        })
        .catch(error => {
            debugLog('Error appending row: ' + error.message);
            showLoading(false);
        });
    }
    
    function updateRow(rowIndex, checkedIn) {
        debugLog(`Updating row ${rowIndex} to checked in status: ${checkedIn}`);
        
        fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Sheet1!C${rowIndex}?valueInputOption=USER_ENTERED`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                values: [[checkedIn]]
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            debugLog(`Row ${rowIndex} updated successfully`);
            showLoading(false);
        })
        .catch(error => {
            debugLog('Error updating row: ' + error.message);
            showLoading(false);
        });
    }
    
    // Check registration status
    function checkRegistration(name, email) {
        if (!accessToken) {
            debugLog('No access token available. Please authorize first.');
            return;
        }
        
        showLoading(true);
        debugLog(`Checking registration for ${name} (${email})`);
        
        fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Sheet1!A:C`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            const rows = data.values || [];
            let found = false;
            let alreadyCheckedIn = false;
            let rowIndex = -1;
            
            for (let i = 0; i < rows.length; i++) {
                if (rows[i][1] && rows[i][1].toLowerCase() === email.toLowerCase()) {
                    found = true;
                    rowIndex = i + 1;  // +1 because sheet rows are 1-indexed
                    alreadyCheckedIn = rows[i][2] === 'Yes';
                    break;
                }
            }
            
            if (found) {
                if (alreadyCheckedIn) {
                    debugLog(`${name} is already checked in`);
                } else {
                    debugLog(`${name} is registered but not checked in. Updating...`);
                    updateRow(rowIndex, 'Yes');
                    return; // updateRow will hide the loading spinner
                }
            } else {
                debugLog(`${name} is not registered. Adding to sheet...`);
                appendRow(name, email, 'Yes');
                return; // appendRow will hide the loading spinner
            }
            
            showLoading(false);
        })
        .catch(error => {
            debugLog('Error checking registration: ' + error.message);
            showLoading(false);
        });
    }
    
    // Set up test buttons
    function setupTestButtons() {
        document.getElementById('test-check-btn').addEventListener('click', () => {
            const name = document.getElementById('test-name').value.trim();
            const email = document.getElementById('test-email').value.trim();
            
            if (name && email) {
                checkRegistration(name, email);
            } else {
                debugLog('Please enter both name and email');
            }
        });
        
        document.getElementById('read-sheet-btn').addEventListener('click', () => {
            readSheet();
        });
        
        document.getElementById('write-test-btn').addEventListener('click', () => {
            const name = document.getElementById('test-name').value.trim() || 'Test User';
            const email = document.getElementById('test-email').value.trim() || 'test@example.com';
            writeToSheet(name, email, 'Yes');
        });
    }
    
    // Initialize
    if (typeof google !== 'undefined' && google.accounts) {
        initGoogleAuth();
        setupTestButtons();
    } else {
        debugLog('Google Identity API not loaded. Waiting...');
        
        // Check every second if it's loaded
        const checkInterval = setInterval(() => {
            if (typeof google !== 'undefined' && google.accounts) {
                clearInterval(checkInterval);
                debugLog('Google Identity API loaded');
                initGoogleAuth();
                setupTestButtons();
            }
        }, 1000);
        
        // Timeout after 10 seconds
        setTimeout(() => {
            clearInterval(checkInterval);
            if (!(typeof google !== 'undefined' && google.accounts)) {
                debugLog('Google Identity API failed to load. Please refresh the page.');
            }
        }, 10000);
    }
});

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded');
    
    // Define all UI elements
    const startButton = document.getElementById('startButton');
    const scanAgainButton = document.getElementById('scanAgain');
    const authorizeButton = document.getElementById('authorize');
    const readerContainer = document.getElementById('reader-container');
    const resultContainer = document.getElementById('result-container');
    const authContainer = document.getElementById('auth-container');
    const resultStatus = document.getElementById('result-status');
    const nameElement = document.getElementById('name');
    const emailElement = document.getElementById('email');
    const loadingElement = document.getElementById('loading');
    const debugInfoElement = document.getElementById('debug-info');
    const toggleDebugButton = document.getElementById('toggleDebug');
    const forceHideLoadingButton = document.getElementById('forceHideLoading');
    
    // Debug logging
    function debugLog(message) {
        console.log(message);
        if (debugInfoElement) {
            const timestamp = new Date().toLocaleTimeString();
            debugInfoElement.innerHTML += `<div>${timestamp}: ${message}</div>`;
            debugInfoElement.scrollTop = debugInfoElement.scrollHeight;
        }
    }
    
    // Toggle debug info visibility
    if (toggleDebugButton) {
        toggleDebugButton.addEventListener('click', function() {
            if (debugInfoElement.style.display === 'none') {
                debugInfoElement.style.display = 'block';
                toggleDebugButton.textContent = 'Hide Debug Info';
            } else {
                debugInfoElement.style.display = 'none';
                toggleDebugButton.textContent = 'Show Debug Info';
            }
        });
    }
    
    // Force hide loading screen
    if (forceHideLoadingButton) {
        forceHideLoadingButton.addEventListener('click', function() {
            debugLog('Force hiding loading screen');
            if (loadingElement) {
                loadingElement.style.display = 'none';
                loadingElement.classList.add('hidden');
                debugLog('Loading screen forcibly hidden');
            }
        });
    }
    
    // Debug utility for checking loading visibility
    function checkLoadingVisibility() {
        if (loadingElement) {
            const computedStyle = window.getComputedStyle(loadingElement);
            debugLog('Loading element computed display value: ' + computedStyle.display);
            return computedStyle.display !== 'none';
        }
        return false;
    }
    
    try {
        // Hide loading screen at startup (using both class and direct style)
        debugLog('Attempting to hide loading screen at startup');
        if (loadingElement) {
            loadingElement.classList.add('hidden');
            loadingElement.style.display = 'none'; // Direct style override
            debugLog('Loading screen should be hidden now');
            debugLog('Is loading still visible? ' + checkLoadingVisibility());
        } else {
            debugLog('Loading element not found in DOM');
        }
    } catch (error) {
        console.error('Error in initialization:', error);
        debugLog('Error in initialization: ' + error.message);
    }

    let html5QrCode;
    let isScanning = false;
    
    // Google Sheets API configuration
    const CLIENT_ID = '1044487611714-hhjuj7qgsbd92u8e2hmi93rgumbft94d.apps.googleusercontent.com';
    const API_KEY = 'AIzaSyCHmP2iZi3JtiJgsEzBOZVhjxvM2UGEo0Q';
    const SPREADSHEET_ID = '1oIC0LfAL6Nti-0UZRr1bqhvjAJctF7Wb1c0GkfH8sWA';
    
    // Initialize the HTML5 QR code library
    function initQRScanner() {
        debugLog('Initializing QR scanner...');
        const qrConfig = { fps: 10, qrbox: { width: 250, height: 250 } };
        
        try {
            html5QrCode = new Html5Qrcode("reader");
            debugLog('QR scanner initialized successfully');
            
            startButton.addEventListener('click', function() {
                if (!isScanning) {
                    startScanning(qrConfig);
                }
            });
            
            scanAgainButton.addEventListener('click', function() {
                resultContainer.classList.add('hidden');
                readerContainer.classList.remove('hidden');
                startScanning(qrConfig);
            });
            
            // Show the reader container now that it's initialized
            readerContainer.classList.remove('hidden');
            showLoading(false);
        } catch (error) {
            console.error('Error initializing QR scanner:', error);
            debugLog('Error initializing QR scanner: ' + error.message);
            displayError('Failed to initialize QR scanner: ' + error.message);
        }
    }
    
    // Start the QR code scanning
    function startScanning(config) {
        debugLog('Starting camera for scanning...');
        showLoading(true);
        
        // Get available cameras first
        Html5Qrcode.getCameras().then(cameras => {
            if (cameras && cameras.length) {
                debugLog(`Found ${cameras.length} cameras`);
                
                // Use the back camera if available (usually better for scanning QR codes)
                const backCamera = cameras.find(camera => camera.label.toLowerCase().includes('back'));
                const cameraId = backCamera ? backCamera.id : cameras[0].id;
                debugLog(`Using camera: ${cameraId}`);
                
                html5QrCode.start(
                    cameraId, 
                    config,
                    onScanSuccess,
                    onScanFailure
                ).then(() => {
                    isScanning = true;
                    startButton.textContent = 'Scanning...';
                    debugLog('Camera started, scanning for QR codes');
                    showLoading(false);
                }).catch(err => {
                    console.error('Unable to start scanning', err);
                    debugLog('Unable to start scanning: ' + err.message);
                    displayError('Unable to access camera. Please check your permissions.');
                });
            } else {
                debugLog('No cameras found on this device');
                displayError('No cameras found on this device');
            }
        }).catch(err => {
            console.error('Error getting cameras', err);
            debugLog('Error getting cameras: ' + err.message);
            displayError('Error getting cameras: ' + err.message);
        });
    }
    
    // Handle successful QR scan
    // Handle successful QR scan
function onScanSuccess(decodedText, decodedResult) {
    if (isScanning) {
        isScanning = false;
        debugLog('QR code scanned: ' + decodedText);
        
        // Stop scanning
        html5QrCode.stop().then(() => {
            showLoading(true);
            startButton.textContent = 'Start Scanning';
            
            try {
                // First try to parse as JSON
                try {
                    const data = JSON.parse(decodedText);
                    debugLog(`Parsed JSON data: ${JSON.stringify(data)}`);
                    
                    if (data.email && data.name) {
                        // Check if user is registered in Google Sheet
                        checkRegistration(data.email, data.name);
                    } else {
                        debugLog('Invalid JSON: missing email or name');
                        throw new Error('Invalid JSON format'); // This will trigger the text parsing below
                    }
                } catch (jsonError) {
                    // If JSON parsing fails, try to parse as text format
                    debugLog('Not valid JSON, trying to parse as text');
                    
                    // Try to extract email and name from text format
                    const emailMatch = decodedText.match(/email:?\s*([^\n]+)/i);
                    const nameMatch = decodedText.match(/name:?\s*([^\n]+)/i);
                    
                    const email = emailMatch ? emailMatch[1].trim() : null;
                    const name = nameMatch ? nameMatch[1].trim() : null;
                    
                    debugLog(`Extracted from text - Name: ${name}, Email: ${email}`);
                    
                    if (email && name) {
                        checkRegistration(email, name);
                    } else {
                        // Try one more format - just split by newline and look at key:value pairs
                        const lines = decodedText.split('\n');
                        const data = {};
                        
                        lines.forEach(line => {
                            const parts = line.split(':');
                            if (parts.length === 2) {
                                const key = parts[0].trim().toLowerCase();
                                const value = parts[1].trim();
                                data[key] = value;
                            }
                        });
                        
                        debugLog(`Parsed from lines: ${JSON.stringify(data)}`);
                        
                        if (data.email && data.name) {
                            checkRegistration(data.email, data.name);
                        } else {
                            debugLog('Could not extract email and name from text');
                            displayResult('error', 'QR code format not recognized. Please scan a valid QR code.');
                        }
                    }
                }
            } catch (e) {
                console.error('Error processing QR data', e);
                debugLog('Error processing QR data: ' + e.message);
                displayResult('error', 'Unable to process QR code data');
            }
        }).catch(err => {
            console.error('Error stopping camera', err);
            debugLog('Error stopping camera: ' + err.message);
        });
    }
}
    
    // Handle scan failures
    function onScanFailure(error) {
        // This is called frequently when no QR is detected, so we don't log this
    }
    
    // Show loading spinner
    function showLoading(show) {
        debugLog(show ? 'Showing loading spinner' : 'Hiding loading spinner');
        if (loadingElement) {
            if (show) {
                loadingElement.classList.remove('hidden');
                loadingElement.style.display = 'flex';
            } else {
                loadingElement.classList.add('hidden');
                loadingElement.style.display = 'none';
            }
            debugLog('Is loading visible after change? ' + checkLoadingVisibility());
        } else {
            debugLog('Loading element not found when trying to set visibility');
        }
    }
    
    // Display error message
    function displayError(message) {
        debugLog('Error: ' + message);
        showLoading(false);
        displayResult('error', message);
    }
    
    // Display scan result
    function displayResult(type, message, name = '', email = '') {
        debugLog(`Displaying result: ${type} - ${message}`);
        showLoading(false);
        readerContainer.classList.add('hidden');
        resultContainer.classList.remove('hidden');
        
        resultStatus.className = '';
        resultStatus.classList.add(type);
        resultStatus.textContent = message;
        
        nameElement.textContent = name;
        emailElement.textContent = email;
    }
    
    // For demonstration purposes, let's use a mock check
    function checkRegistration(email, name) {
        debugLog(`Checking registration for: ${email}`);
        
        // Example only: Simulate checking a spreadsheet
        setTimeout(() => {
            // For testing: pretend the user is registered
            displayResult('success', 'Check-in successful!', name, email);
        }, 1500);
        
        // In a real implementation, you would check the sheet here
    }
    
    // Initialize test mode
    function initTest() {
        debugLog('Initializing test mode...');
        
        authorizeButton.addEventListener('click', function() {
            debugLog('Authorization button clicked');
            showLoading(true);
            
            debugLog('Starting authorization process...');
            setTimeout(() => {
                debugLog('Authorization successful (test mode)');
                authContainer.classList.add('hidden');
                showLoading(false);
                initQRScanner();
            }, 1000);
        });
    }
    
    // Initialize test mode
    initTest();
    
    debugLog('Initialization complete');
});
*/

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded');
    
    // Define all UI elements
    const startButton = document.getElementById('startButton');
    const scanAgainButton = document.getElementById('scanAgain');
    const authorizeButton = document.getElementById('authorize');
    const readerContainer = document.getElementById('reader-container');
    const resultContainer = document.getElementById('result-container');
    const authContainer = document.getElementById('auth-container');
    const resultStatus = document.getElementById('result-status');
    const nameElement = document.getElementById('name');
    const emailElement = document.getElementById('email');
    const loadingElement = document.getElementById('loading');
    const debugInfoElement = document.getElementById('debug-info');
    const toggleDebugButton = document.getElementById('toggleDebug');
    const forceHideLoadingButton = document.getElementById('forceHideLoading');
    
    // Google Sheets API configuration
    const CLIENT_ID = '1044487611714-hhjuj7qgsbd92u8e2hmi93rgumbft94d.apps.googleusercontent.com';
    const API_KEY = 'AIzaSyCHmP2iZi3JtiJgsEzBOZVhjxvM2UGEo0Q';
    const SPREADSHEET_ID = '1oIC0LfAL6Nti-0UZRr1bqhvjAJctF7Wb1c0GkfH8sWA';
    const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';
    
    let html5QrCode;
    let isScanning = false;
    let accessToken = null; // Will store the Google Sheets access token
    
    // Debug logging
    function debugLog(message) {
        console.log(message);
        if (debugInfoElement) {
            const timestamp = new Date().toLocaleTimeString();
            debugInfoElement.innerHTML += `<div>${timestamp}: ${message}</div>`;
            debugInfoElement.scrollTop = debugInfoElement.scrollHeight;
        }
    }
    
    // Toggle debug info visibility
    if (toggleDebugButton) {
        toggleDebugButton.addEventListener('click', function() {
            if (debugInfoElement.style.display === 'none') {
                debugInfoElement.style.display = 'block';
                toggleDebugButton.textContent = 'Hide Debug Info';
            } else {
                debugInfoElement.style.display = 'none';
                toggleDebugButton.textContent = 'Show Debug Info';
            }
        });
    }
    
    // Force hide loading screen
    if (forceHideLoadingButton) {
        forceHideLoadingButton.addEventListener('click', function() {
            debugLog('Force hiding loading screen');
            if (loadingElement) {
                loadingElement.style.display = 'none';
                loadingElement.classList.add('hidden');
                debugLog('Loading screen forcibly hidden');
            }
        });
    }
    
    // Debug utility for checking loading visibility
    function checkLoadingVisibility() {
        if (loadingElement) {
            const computedStyle = window.getComputedStyle(loadingElement);
            debugLog('Loading element computed display value: ' + computedStyle.display);
            return computedStyle.display !== 'none';
        }
        return false;
    }
    
    try {
        // Hide loading screen at startup (using both class and direct style)
        debugLog('Attempting to hide loading screen at startup');
        if (loadingElement) {
            loadingElement.classList.add('hidden');
            loadingElement.style.display = 'none'; // Direct style override
            debugLog('Loading screen should be hidden now');
            debugLog('Is loading still visible? ' + checkLoadingVisibility());
        } else {
            debugLog('Loading element not found in DOM');
        }
    } catch (error) {
        console.error('Error in initialization:', error);
        debugLog('Error in initialization: ' + error.message);
    }
    
    // Initialize the HTML5 QR code library
    function initQRScanner() {
        debugLog('Initializing QR scanner...');
        const qrConfig = { fps: 10, qrbox: { width: 250, height: 250 } };
        
        try {
            html5QrCode = new Html5Qrcode("reader");
            debugLog('QR scanner initialized successfully');
            
            startButton.addEventListener('click', function() {
                if (!isScanning) {
                    startScanning(qrConfig);
                }
            });
            
            scanAgainButton.addEventListener('click', function() {
                resultContainer.classList.add('hidden');
                readerContainer.classList.remove('hidden');
                startScanning(qrConfig);
            });
            
            // Show the reader container now that it's initialized
            readerContainer.classList.remove('hidden');
            showLoading(false);
        } catch (error) {
            console.error('Error initializing QR scanner:', error);
            debugLog('Error initializing QR scanner: ' + error.message);
            displayError('Failed to initialize QR scanner: ' + error.message);
        }
    }
    
    // Start the QR code scanning
    function startScanning(config) {
        debugLog('Starting camera for scanning...');
        showLoading(true);
        
        // Get available cameras first
        Html5Qrcode.getCameras().then(cameras => {
            if (cameras && cameras.length) {
                debugLog(`Found ${cameras.length} cameras`);
                
                // Use the back camera if available (usually better for scanning QR codes)
                const backCamera = cameras.find(camera => camera.label.toLowerCase().includes('back'));
                const cameraId = backCamera ? backCamera.id : cameras[0].id;
                debugLog(`Using camera: ${cameraId}`);
                
                html5QrCode.start(
                    cameraId, 
                    config,
                    onScanSuccess,
                    onScanFailure
                ).then(() => {
                    isScanning = true;
                    startButton.textContent = 'Scanning...';
                    debugLog('Camera started, scanning for QR codes');
                    showLoading(false);
                }).catch(err => {
                    console.error('Unable to start scanning', err);
                    debugLog('Unable to start scanning: ' + err.message);
                    displayError('Unable to access camera. Please check your permissions.');
                });
            } else {
                debugLog('No cameras found on this device');
                displayError('No cameras found on this device');
            }
        }).catch(err => {
            console.error('Error getting cameras', err);
            debugLog('Error getting cameras: ' + err.message);
            displayError('Error getting cameras: ' + err.message);
        });
    }
    
    // Handle successful QR scan
    function onScanSuccess(decodedText, decodedResult) {
        if (isScanning) {
            isScanning = false;
            debugLog('QR code scanned: ' + decodedText);
            
            // Stop scanning
            html5QrCode.stop().then(() => {
                showLoading(true);
                startButton.textContent = 'Start Scanning';
                
                try {
                    // First try to parse as JSON
                    try {
                        const data = JSON.parse(decodedText);
                        debugLog(`Parsed JSON data: ${JSON.stringify(data)}`);
                        
                        if (data.email && data.name) {
                            // Check if user is registered in Google Sheet
                            checkRegistration(data.email, data.name);
                        } else {
                            debugLog('Invalid JSON: missing email or name');
                            throw new Error('Invalid JSON format'); // This will trigger the text parsing below
                        }
                    } catch (jsonError) {
                        // If JSON parsing fails, try to parse as text format
                        debugLog('Not valid JSON, trying to parse as text');
                        
                        // Try to extract email and name from text format
                        const emailMatch = decodedText.match(/email:?\s*([^\n]+)/i);
                        const nameMatch = decodedText.match(/name:?\s*([^\n]+)/i);
                        
                        const email = emailMatch ? emailMatch[1].trim() : null;
                        const name = nameMatch ? nameMatch[1].trim() : null;
                        
                        debugLog(`Extracted from text - Name: ${name}, Email: ${email}`);
                        
                        if (email && name) {
                            checkRegistration(email, name);
                        } else {
                            // Try one more format - just split by newline and look at key:value pairs
                            const lines = decodedText.split('\n');
                            const data = {};
                            
                            lines.forEach(line => {
                                const parts = line.split(':');
                                if (parts.length === 2) {
                                    const key = parts[0].trim().toLowerCase();
                                    const value = parts[1].trim();
                                    data[key] = value;
                                }
                            });
                            
                            debugLog(`Parsed from lines: ${JSON.stringify(data)}`);
                            
                            if (data.email && data.name) {
                                checkRegistration(data.email, data.name);
                            } else {
                                debugLog('Could not extract email and name from text');
                                displayResult('error', 'QR code format not recognized. Please scan a valid QR code.');
                            }
                        }
                    }
                } catch (e) {
                    console.error('Error processing QR data', e);
                    debugLog('Error processing QR data: ' + e.message);
                    displayResult('error', 'Unable to process QR code data');
                }
            }).catch(err => {
                console.error('Error stopping camera', err);
                debugLog('Error stopping camera: ' + err.message);
            });
        }
    }
    
    // Handle scan failures
    function onScanFailure(error) {
        // This is called frequently when no QR is detected, so we don't log this
    }
    
    // Show loading spinner
    function showLoading(show) {
        debugLog(show ? 'Showing loading spinner' : 'Hiding loading spinner');
        if (loadingElement) {
            if (show) {
                loadingElement.classList.remove('hidden');
                loadingElement.style.display = 'flex';
            } else {
                loadingElement.classList.add('hidden');
                loadingElement.style.display = 'none';
            }
            debugLog('Is loading visible after change? ' + checkLoadingVisibility());
        } else {
            debugLog('Loading element not found when trying to set visibility');
        }
    }
    
    // Display error message
    function displayError(message) {
        debugLog('Error: ' + message);
        showLoading(false);
        displayResult('error', message);
    }
    
    // Display scan result
    function displayResult(type, message, name = '', email = '') {
        debugLog(`Displaying result: ${type} - ${message}`);
        showLoading(false);
        readerContainer.classList.add('hidden');
        resultContainer.classList.remove('hidden');
        
        resultStatus.className = '';
        resultStatus.classList.add(type);
        resultStatus.textContent = message;
        
        nameElement.textContent = name;
        emailElement.textContent = email;
    }
    
    // Check registration in Google Sheets
    function checkRegistration(email, name) {
        debugLog(`Checking registration for: ${email}`);
        
        if (!accessToken) {
            debugLog('No access token available. Falling back to test mode.');
            // For testing if no access token: pretend the user is registered
            setTimeout(() => {
                displayResult('success', 'Check-in successful! (Test Mode)', name, email);
            }, 1500);
            return;
        }
        
        showLoading(true);
        
        fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Sheet1!A:C`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            const rows = data.values || [];
            let found = false;
            let alreadyCheckedIn = false;
            let rowIndex = -1;
            
            // Check if the email exists and if they're already checked in
            for (let i = 0; i < rows.length; i++) {
                if (rows[i][1] && rows[i][1].toLowerCase() === email.toLowerCase()) {
                    found = true;
                    rowIndex = i + 1;  // +1 because sheet rows are 1-indexed
                    if (rows[i][2] === 'Yes') {
                        alreadyCheckedIn = true;
                    }
                    break;
                }
            }
            
            if (found) {
                debugLog(`User found at row ${rowIndex}, already checked in: ${alreadyCheckedIn}`);
                if (alreadyCheckedIn) {
                    displayResult('warning', 'Already checked in!', name, email);
                } else {
                    // Update the check-in status to Yes
                    updateCheckInStatus(rowIndex, name, email);
                }
            } else {
                debugLog('User not found in spreadsheet. Adding them...');
                // Add them to the spreadsheet
                appendToSheet(name, email);
            }
        })
        .catch(error => {
            console.error('Error fetching spreadsheet data:', error);
            debugLog('Error fetching spreadsheet data: ' + error.message);
            displayError('Error checking registration. Please try again.');
        });
    }
    
    // Update check-in status in the spreadsheet
    function updateCheckInStatus(rowIndex, name, email) {
        debugLog(`Updating check-in status for row ${rowIndex}`);
        
        fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Sheet1!C${rowIndex}?valueInputOption=USER_ENTERED`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                values: [['Yes']]
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            debugLog(`Check-in status updated successfully for ${name}`);
            displayResult('success', 'Check-in successful!', name, email);
        })
        .catch(error => {
            console.error('Error updating check-in status:', error);
            debugLog('Error updating check-in status: ' + error.message);
            displayError('Error updating check-in status. Please try again.');
        });
    }
    
    // Add a new row to the spreadsheet
    function appendToSheet(name, email) {
        debugLog(`Adding new registration for ${name}`);
        
        fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Sheet1!A:C:append?valueInputOption=USER_ENTERED`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                values: [[name, email, 'Yes']]
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            debugLog(`New registration added successfully for ${name}`);
            displayResult('success', 'Registration and check-in successful!', name, email);
        })
        .catch(error => {
            console.error('Error adding registration:', error);
            debugLog('Error adding registration: ' + error.message);
            displayError('Error adding registration. Please try again.');
        });
    }
    
    // Initialize Google authorization
    function initGoogleAuth() {
        debugLog('Initializing Google Auth...');
        
        // Initialize token client
        const tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: (tokenResponse) => {
                if (tokenResponse.error) {
                    debugLog('Error getting token: ' + tokenResponse.error);
                    // Continue with initialization but in test mode
                    authContainer.classList.add('hidden');
                    showLoading(false);
                    initQRScanner();
                    return;
                }
                
                accessToken = tokenResponse.access_token;
                debugLog('Access token obtained successfully');
                
                // Hide the authorization container and init scanner
                authContainer.classList.add('hidden');
                initQRScanner();
                showLoading(false);
            }
        });
        
        // Set up authorize button for real Google auth
        authorizeButton.addEventListener('click', () => {
            debugLog('Authorization button clicked');
            showLoading(true);
            
            // Use Google OAuth flow
            try {
                debugLog('Starting Google OAuth authorization...');
                tokenClient.requestAccessToken();
            } catch (error) {
                debugLog('Error during OAuth authorization: ' + error.message);
                // Fall back to test mode if OAuth fails
                setTimeout(() => {
                    debugLog('Falling back to test mode');
                    authContainer.classList.add('hidden');
                    showLoading(false);
                    initQRScanner();
                }, 1000);
            }
        });
    }
    
    // Initialize
    if (typeof google !== 'undefined' && google.accounts) {
        initGoogleAuth();
    } else {
        debugLog('Google Identity API not loaded. Waiting...');
        
        // Check every second if it's loaded
        const checkInterval = setInterval(() => {
            if (typeof google !== 'undefined' && google.accounts) {
                clearInterval(checkInterval);
                debugLog('Google Identity API loaded');
                initGoogleAuth();
            }
        }, 1000);
        
        // Timeout after 10 seconds
        setTimeout(() => {
            clearInterval(checkInterval);
            if (!(typeof google !== 'undefined' && google.accounts)) {
                debugLog('Google Identity API failed to load. Falling back to test mode');
                // If Google API fails to load, initialize QR scanner anyway
                authContainer.classList.add('hidden');
                initQRScanner();
            }
        }, 10000);
    }
    
    debugLog('Initialization complete');
});
