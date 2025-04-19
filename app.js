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
