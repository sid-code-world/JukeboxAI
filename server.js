const express = require('express');
const path = require('path');
const sqlite = require('sqlite');
const sqlite3 = require('sqlite3');
const cors = require('cors'); 

const app = express();
const port = 3001;
// Path to the database file; it will be created if it doesn't exist
const DB_PATH = path.join(__dirname, 'compositions.db');

let db;

// -----------------------------------------------------------------------------
// MIDDLEWARE SETUP
// -----------------------------------------------------------------------------
// Allows the browser to send JSON data to the server
app.use(express.json()); 
// Enables Cross-Origin Resource Sharing (CORS) for local development
app.use(cors()); 

// -----------------------------------------------------------------------------
// 1. DATABASE INITIALIZATION
// -----------------------------------------------------------------------------

async function initializeDatabase() {
    try {
        // Open the database in asynchronous mode
        db = await sqlite.open({
            filename: DB_PATH,
            driver: sqlite3.Database
        });

        // The core SQL command to create the table
        await db.exec(`
            CREATE TABLE IF NOT EXISTS compositions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                tracks TEXT NOT NULL,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('SQLite database initialized and connected.');
    } catch (e) {
        console.error('Failed to initialize database:', e);
        // Exiting the process if the database can't start is critical
        process.exit(1); 
    }
}

// -----------------------------------------------------------------------------
// 2. API ROUTES (SQL Execution)
// -----------------------------------------------------------------------------

// POST /api/compositions: Save a new composition (INSERT SQL)
app.post('/api/compositions', async (req, res) => {
    const { name, tracks } = req.body;
    
    if (!name || !tracks) {
        return res.status(400).json({ error: 'Composition name and track data are required.' });
    }

    try {
        // Use db.run with parameterized queries to execute the INSERT statement
        const result = await db.run(
            'INSERT INTO compositions (name, tracks) VALUES (?, ?)',
            [name, tracks]
        );
        res.status(201).json({ 
            message: 'Composition saved successfully', 
            id: result.lastID 
        });
    } catch (e) {
        console.error('Error saving composition:', e);
        res.status(500).json({ error: 'Failed to save composition.' });
    }
});

// GET /api/compositions: Retrieve a list of all compositions (SELECT SQL)
app.get('/api/compositions', async (req, res) => {
    try {
        // Use db.all to execute the SELECT statement and return multiple rows
        const compositions = await db.all('SELECT id, name, createdAt FROM compositions ORDER BY createdAt DESC');
        res.json(compositions);
    } catch (e) {
        console.error('Error fetching compositions list:', e);
        res.status(500).json({ error: 'Failed to retrieve compositions list.' });
    }
});

// GET /api/compositions/:id: Retrieve the full data for a single composition (SELECT SQL with WHERE clause)
app.get('/api/compositions/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // Use db.get to execute the SELECT statement and return a single row
        const composition = await db.get('SELECT * FROM compositions WHERE id = ?', id);
        if (composition) {
            res.json(composition);
        } else {
            res.status(404).json({ error: 'Composition not found.' });
        }
    } catch (e) {
        console.error('Error fetching composition details:', e);
        res.status(500).json({ error: 'Failed to retrieve composition details.' });
    }
});

// DELETE /api/compositions/:id: Delete a composition (DELETE SQL)
app.delete('/api/compositions/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // Use db.run to execute the DELETE statement
        const result = await db.run('DELETE FROM compositions WHERE id = ?', id);
        if (result.changes > 0) {
            res.json({ message: 'Composition deleted successfully.' });
        } else {
            res.status(404).json({ error: 'Composition not found or already deleted.' });
        }
    } catch (e) {
        console.error('Error deleting composition:', e);
        res.status(500).json({ error: 'Failed to delete composition.' });
    }
});


// -----------------------------------------------------------------------------
// 3. STATIC FILE SERVING AND STARTUP
// -----------------------------------------------------------------------------

// Serve static files (like your HTML) from the current directory.
app.use(express.static(__dirname));

// Serve the main HTML file for the root URL ('/')
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'music-player-advanced.html'));
});

// Start the server only after the database is successfully initialized
initializeDatabase().then(() => {
    app.listen(port, () => {
        console.log(`Server running on http://localhost:${port}`);
    });
});
