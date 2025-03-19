const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();
const port = 3001;

// Middleware to parse JSON bodies
app.use(express.json());

// Enable CORS for all routes
app.use(cors());

// Proxy endpoint for Square API
app.post('/api/catalog/object', async (req, res) => {
  try {
    const response = await axios.post(
      'https://connect.squareup.com/v2/catalog/object',
      req.body,
      {
        headers: {
          Authorization: `Bearer EAAAlk3V8-x2wAZd8-F8ERSbWpCNXrr0Yqm1fr-ohMpcZwu1RfXFqHW-4JBZycKc`, 
          "Content-Type": "application/json"
        }
      }
    );
    res.json(response.data);
  } catch (error) {
    console.error("Proxy error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Proxy server running at http://localhost:${port}`);
});