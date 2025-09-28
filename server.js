// Import the express library
const express = require('express');
const path = require('path');

// Create a new Express application
const app = express();
const port = 3000; // You can change this to any port you like

// Serve static files from the directory where this script is located.
// This is important because it allows the browser to find your HTML file.
app.use(express.static(__dirname));

// Define a route for the root URL ('/').
// When a user visits this URL, this function sends the HTML file back.
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start the server and make it listen for incoming requests on the specified port.
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
