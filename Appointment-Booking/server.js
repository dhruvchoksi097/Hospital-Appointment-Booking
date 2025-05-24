// server.js
// Simple Node.js HTTP server without Express

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto'); // For basic password hashing and token generation

// --- Configuration ---
const PORT = 3000;
const DATA_DIR = path.join(__dirname, 'data');
const PUBLIC_DIR = path.join(__dirname, 'public');
const VIEWS_DIR = path.join(__dirname, 'views');

// --- Data File Paths ---
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const RECORDS_FILE = path.join(DATA_DIR, 'records.json');
const BILLS_FILE = path.join(DATA_DIR, 'bills.json');
const APPOINTMENTS_FILE = path.join(DATA_DIR, 'appointments.json');
const LOG_FILE = path.join(DATA_DIR, 'blockchain_log.json');

// --- Ensure data directory and files exist ---
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
const ensureFile = (filePath, defaultContent = '[]') => {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, defaultContent, 'utf8');
    }
};
ensureFile(USERS_FILE, '[]');
ensureFile(RECORDS_FILE, '{}'); // Store records as { username: [...] }
ensureFile(BILLS_FILE, '{}');   // Store bills as { username: [...] }
ensureFile(APPOINTMENTS_FILE, '{}'); // Store appointments as { username: [...] }
ensureFile(LOG_FILE, '[]'); // Log is an array of events

// --- Helper Functions ---

// Read JSON data file safely
const readJsonFile = (filePath) => {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error(`Error reading file ${filePath}:`, err);
        // Return default structure based on file type if read fails
        if (filePath.endsWith('log.json') || filePath.endsWith('users.json')) return [];
        return {}; // For record/bill/appointment files
    }
};

// Write JSON data file safely
const writeJsonFile = (filePath, data) => {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8'); // Pretty print JSON
    } catch (err) {
        console.error(`Error writing file ${filePath}:`, err);
    }
};

// Add entry to the simulated blockchain log
const addToLog = (username, action, details) => {
    const log = readJsonFile(LOG_FILE);
    const newEntry = {
        timestamp: new Date().toISOString(),
        username: username, // Can be null/system for some actions if needed
        action: action,
        details: details,
        // In a real blockchain, you'd have hashes here
        // previousHash: log.length > 0 ? calculateHash(log[log.length - 1]) : '0',
        // currentHash: calculateHash(newEntryWithoutHash) // Simplified
    };
    log.push(newEntry);
    writeJsonFile(LOG_FILE, log);
};

// Basic password hashing (use bcrypt in real apps)
const hashPassword = (password) => {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
};

// Verify password
const verifyPassword = (storedPassword, providedPassword) => {
    const [salt, hash] = storedPassword.split(':');
    const providedHash = crypto.pbkdf2Sync(providedPassword, salt, 1000, 64, 'sha512').toString('hex');
    return hash === providedHash;
};

// Generate a simple token (use JWT in real apps)
const generateToken = () => crypto.randomBytes(32).toString('hex');

// Store active tokens (in-memory, replace with better session management)
const activeTokens = new Map(); // Map<token, username>

// Verify token
const verifyToken = (token) => {
    return activeTokens.get(token); // Returns username if token is valid, undefined otherwise
};

// --- Request Handler ---
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const method = req.method;

    console.log(`Request: ${method} ${pathname}`); // Log requests

    // --- Helper to send responses ---
    const sendResponse = (statusCode, contentType, data) => {
        res.writeHead(statusCode, { 'Content-Type': contentType });
        res.end(data);
    };

    const sendJson = (statusCode, data) => {
        sendResponse(statusCode, 'application/json', JSON.stringify(data));
    };

    const sendHtml = (filePath) => {
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                console.error(`Error reading HTML file ${filePath}:`, err);
                sendResponse(500, 'text/plain', 'Internal Server Error');
            } else {
                sendResponse(200, 'text/html', data);
            }
        });
    };

    const serveStaticFile = (filePath) => {
        const ext = path.extname(filePath).toLowerCase();
        let contentType = 'application/octet-stream'; // Default
        switch (ext) {
            case '.html': contentType = 'text/html'; break;
            case '.css': contentType = 'text/css'; break;
            case '.js': contentType = 'application/javascript'; break;
            case '.json': contentType = 'application/json'; break;
            case '.png': contentType = 'image/png'; break;
            case '.jpg': case '.jpeg': contentType = 'image/jpeg'; break;
            case '.gif': contentType = 'image/gif'; break;
        }

        fs.readFile(filePath, (err, data) => {
            if (err) {
                if (err.code === 'ENOENT') {
                    sendResponse(404, 'text/plain', 'Not Found');
                } else {
                    console.error(`Error reading static file ${filePath}:`, err);
                    sendResponse(500, 'text/plain', 'Internal Server Error');
                }
            } else {
                sendResponse(200, contentType, data);
            }
        });
    };

    // --- Routing ---

    // Serve static files from /public
    if (pathname.startsWith('/css/') || pathname.startsWith('/js/') || pathname.startsWith('/images/')) {
        const staticFilePath = path.join(PUBLIC_DIR, pathname);
        serveStaticFile(staticFilePath);
        return; // Stop further processing
    }

    // Serve HTML pages from /views
    if (method === 'GET') {
        switch (pathname) {
            case '/':
                sendHtml(path.join(VIEWS_DIR, 'index.html'));
                return;
            case '/register.html':
                sendHtml(path.join(VIEWS_DIR, 'register.html'));
                return;
            case '/dashboard.html':
                // Basic check if user *might* be logged in (client side handles real check)
                // In a real app, server-side rendering or token validation before serving would be better
                 sendHtml(path.join(VIEWS_DIR, 'dashboard.html'));
                return;
             case '/admin.html':
                sendHtml(path.join(VIEWS_DIR, 'admin.html'));
                return;
        }
    }

    // --- API Endpoints ---
    if (pathname.startsWith('/api/')) {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            let parsedBody = {};
            if (body && (method === 'POST' || method === 'PUT')) {
                try {
                    parsedBody = JSON.parse(body);
                } catch (e) {
                    return sendJson(400, { message: 'Invalid JSON payload' });
                }
            }

            // --- Authentication Routes ---
            if (pathname === '/api/register' && method === 'POST') {
                const { username, password, fullname } = parsedBody;
                if (!username || !password || !fullname) {
                    return sendJson(400, { message: 'Username, password, and full name are required' });
                }

                const users = readJsonFile(USERS_FILE);
                if (users.some(u => u.username === username)) {
                    return sendJson(409, { message: 'Username already exists' }); // 409 Conflict
                }

                const hashedPassword = hashPassword(password);
                users.push({ username, password: hashedPassword, fullname });
                writeJsonFile(USERS_FILE, users);

                // Initialize data structures for the new user
                const records = readJsonFile(RECORDS_FILE); records[username] = []; writeJsonFile(RECORDS_FILE, records);
                const bills = readJsonFile(BILLS_FILE); bills[username] = []; writeJsonFile(BILLS_FILE, bills);
                const appointments = readJsonFile(APPOINTMENTS_FILE); appointments[username] = []; writeJsonFile(APPOINTMENTS_FILE, appointments);

                addToLog(username, 'User Registered', `User '${username}' (${fullname}) registered.`);
                return sendJson(201, { message: 'User registered successfully' }); // 201 Created
            }

            if (pathname === '/api/login' && method === 'POST') {
                const { username, password } = parsedBody;
                if (!username || !password) {
                    return sendJson(400, { message: 'Username and password are required' });
                }

                const users = readJsonFile(USERS_FILE);
                const user = users.find(u => u.username === username);

                if (!user || !verifyPassword(user.password, password)) {
                     addToLog(username, 'Login Failed', `Failed login attempt for user '${username}'.`);
                    return sendJson(401, { message: 'Invalid username or password' }); // 401 Unauthorized
                }

                const token = generateToken();
                activeTokens.set(token, username); // Store token -> username mapping

                 addToLog(username, 'User Login', `User '${username}' logged in successfully.`);
                return sendJson(200, { message: 'Login successful', token: token });
            }

             if (pathname === '/api/logout' && method === 'POST') {
                const token = req.headers.authorization?.split(' ')[1];
                if (token && activeTokens.has(token)) {
                    const loggedOutUser = activeTokens.get(token);
                    activeTokens.delete(token);
                    addToLog(loggedOutUser, 'User Logout', `User '${loggedOutUser}' logged out.`);
                    return sendJson(200, { message: 'Logged out successfully' });
                }
                 return sendJson(200, { message: 'No active session or already logged out' }); // Still OK if no token
            }


            // --- Protected API Routes (Require Token) ---
            const authHeader = req.headers.authorization;
            const token = authHeader?.split(' ')[1]; // Expect "Bearer <token>"
            const currentUsername = verifyToken(token);

            if (!currentUsername && pathname !== '/api/admin/log') { // Allow admin log access without token (for simplicity)
                // Don't log failed API calls here as it might be noisy if token just expired
                return sendJson(401, { message: 'Unauthorized: Missing or invalid token' });
            }

            // --- Get Data Endpoints ---
             if (pathname === '/api/records' && method === 'GET') {
                const allRecords = readJsonFile(RECORDS_FILE);
                const userRecords = allRecords[currentUsername] || [];
                return sendJson(200, { records: userRecords });
            }

            if (pathname === '/api/bills' && method === 'GET') {
                const allBills = readJsonFile(BILLS_FILE);
                const userBills = allBills[currentUsername] || [];
                return sendJson(200, { bills: userBills });
            }

            if (pathname === '/api/appointments' && method === 'GET') {
                const allAppointments = readJsonFile(APPOINTMENTS_FILE);
                const userAppointments = allAppointments[currentUsername] || [];
                return sendJson(200, { appointments: userAppointments });
            }

             if (pathname === '/api/blockchain' && method === 'GET') {
                const fullLog = readJsonFile(LOG_FILE);
                // Filter log entries relevant to the current user
                const userLog = fullLog.filter(entry => entry.username === currentUsername);
                return sendJson(200, { log: userLog });
            }

             // --- Action Endpoints ---
             if (pathname === '/api/appointments' && method === 'POST') {
                const { date, reason } = parsedBody;
                if (!date || !reason) {
                    return sendJson(400, { message: 'Date and reason are required for appointment' });
                }
                const allAppointments = readJsonFile(APPOINTMENTS_FILE);
                if (!allAppointments[currentUsername]) allAppointments[currentUsername] = [];
                const newAppointment = { id: Date.now().toString(), date, reason }; // Simple ID
                allAppointments[currentUsername].push(newAppointment);
                writeJsonFile(APPOINTMENTS_FILE, allAppointments);

                addToLog(currentUsername, 'Appointment Booked', `Booked for ${date}. Reason: ${reason}`);
                return sendJson(201, { message: 'Appointment booked successfully', appointment: newAppointment });
            }

            // --- Simulate Pay Bill Endpoint ---
            if (pathname === '/api/paybill' && method === 'POST') {
                 const { billId, amount } = parsedBody; // In real app, use billId to find and update bill status
                 if (!billId || amount === undefined) {
                     return sendJson(400, { message: 'Bill ID and amount are required' });
                 }

                 // Simulate finding and updating the bill (here we just log)
                 console.log(`Simulating payment for bill ${billId}, amount ${amount} by ${currentUsername}`);

                 // Add a log entry for the payment simulation
                 addToLog(currentUsername, 'Bill Payment (Simulated)', `Simulated payment of $${amount} for bill ID ${billId}.`);

                 // You might update the status in bills.json here in a real scenario
                 // const allBills = readJsonFile(BILLS_FILE);
                 // const userBills = allBills[currentUsername] || [];
                 // const billIndex = userBills.findIndex(b => b.id === billId);
                 // if (billIndex > -1) {
                 //     userBills[billIndex].status = 'Paid';
                 //     writeJsonFile(BILLS_FILE, allBills);
                 // }

                 return sendJson(200, { message: 'Bill payment simulated successfully' });
            }

             // --- Admin Endpoint (Unprotected for demo) ---
             if (pathname === '/api/admin/log' && method === 'GET') {
                 const fullLog = readJsonFile(LOG_FILE);
                 return sendJson(200, { log: fullLog });
            }


            // --- Fallback for unknown API routes ---
            sendJson(404, { message: 'API endpoint not found' });
        });

    } else if (method !== 'GET') {
         // Handle other methods if not API or static/HTML GET requests
        sendResponse(405, 'text/plain', 'Method Not Allowed');
    } else {
        // Fallback for unknown GET routes (not static, not HTML views)
        sendHtml(path.join(VIEWS_DIR, 'index.html')); // Redirect to home/login for unknown paths
        // Or send 404: sendResponse(404, 'text/plain', 'Not Found');
    }
});

// --- Start Server ---
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log(`Data directory: ${DATA_DIR}`);
    console.log(`Public directory: ${PUBLIC_DIR}`);
     console.log(`Views directory: ${VIEWS_DIR}`);
});

// --- Graceful Shutdown ---
process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    server.close(() => {
        console.log('Server closed.');
        process.exit(0);
    });
});
