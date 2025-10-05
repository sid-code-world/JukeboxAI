const express = require('express');
const bodyParser = require('body-parser');
const Database = require('better-sqlite3');
const cors = require('cors');
const fs = require('fs');

const app = express();
const PORT = 3001;
const DB_PATH = 'compositions.db';

// --- Database Setup ---
const db = new Database(DB_PATH, { verbose: console.log });
db.exec(`
    CREATE TABLE IF NOT EXISTS compositions (
        id TEXT PRIMARY KEY,
        name TEXT,
        tracks TEXT
    );
`);

// --- Middleware ---
app.use(cors()); 
app.use(bodyParser.json());

// --- File Serving (Front-end) ---

const htmlFilePath = 'music-player-sqlite.html';
let htmlContent = '';

try {
    // Read the HTML file once when the server starts
    htmlContent = fs.readFileSync(htmlFilePath, 'utf8');
    console.log(`Successfully loaded ${htmlFilePath}`);
} catch (error) {
    console.error(`ERROR: Could not read HTML file at ${htmlFilePath}. Make sure it is in the same directory as server.js!`);
    console.error(error);
    process.exit(1); 
}

// NEW ROUTE: Handle both the root URL '/' and specific IDs '/:id'
app.get('/:id?', (req, res) => {
    // Get the ID from the URL parameter. It will be undefined if no ID is provided (e.g., just '/').
    // We only accept 6-character IDs to avoid routing conflicts with /api
    const compositionIdFromUrl = req.params.id && req.params.id.length === 6
        ? req.params.id.toUpperCase() 
        : null;

    // Inject the ID into the HTML. The client-side JS will read this variable.
    const injectionScript = compositionIdFromUrl 
        ? `<script>window.initialCompositionId = '${compositionIdFromUrl}';</script>`
        : `<script>window.initialCompositionId = null;</script>`;

    // Insert the script right before the closing </body> tag.
    // The HTML file must contain a </body> tag for this to work.
    const finalHtml = htmlContent.replace('</body>', `${injectionScript}</body>`);

    res.setHeader('Content-Type', 'text/html');
    res.send(finalHtml);
});

// --- API Routes (Prefix is still '/api') ---
const API_PREFIX = '/api';

// API Route: Save/Update Composition
// The client now generates the ID, so the server just saves it.
app.post(`${API_PREFIX}/save`, (req, res) => {
    const { id, name, tracks } = req.body;

    if (!id || !name || !tracks) {
        return res.status(400).json({ error: 'Missing required fields: id, name, or tracks.' });
    }

    try {
        const stmt = db.prepare('INSERT OR REPLACE INTO compositions (id, name, tracks) VALUES (?, ?, ?)');
        // Ensure ID is always uppercase as per client generation
        const info = stmt.run(id.toUpperCase(), name, tracks);

        console.log(`Saved composition with ID: ${id.toUpperCase()}. Changes: ${info.changes}`);

        res.json({ message: 'Composition saved successfully', id: id.toUpperCase() });
    } catch (error) {
        console.error('Database Error on Save:', error);
        res.status(500).json({ error: 'Failed to save composition to database.' });
    }
});

// API Route: Load Composition
app.get(`${API_PREFIX}/load/:id`, (req, res) => {
    const id = req.params.id.toUpperCase();

    try {
        const stmt = db.prepare('SELECT id, name, tracks FROM compositions WHERE id = ?');
        const composition = stmt.get(id);

        if (composition) {
            console.log(`Loaded composition with ID: ${id}`);
            res.json(composition);
        } else {
            console.log(`Composition ID ${id} not found.`);
            res.status(404).json({ error: `Composition ID ${id} not found` });
        }
    } catch (error) {
        console.error('Database Error on Load:', error);
        res.status(500).json({ error: 'Failed to load composition from database.' });
    }
});


// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`API endpoints are available at http://localhost:${PORT}/api/*`);
});
