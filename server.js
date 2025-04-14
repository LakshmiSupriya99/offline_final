const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let documentContent = ""; 
let cursors = {}; 

const colors = ["red", "blue", "green", "purple", "orange", "pink", "cyan"];
const getRandomColor = () => colors[Math.floor(Math.random() * colors.length)];

wss.on('connection', (ws) => {
    const clientId = Math.random().toString(36).substr(2, 9);
    cursors[clientId] = { x: 0, y: 0, color: getRandomColor() };

    ws.send(JSON.stringify({ type: 'init', data: documentContent, cursors }));

    ws.on('message', (message) => {
        try {
            const parsedMessage = JSON.parse(message);

            if (parsedMessage.type === 'update') {
                documentContent = parsedMessage.data;
                wss.clients.forEach(client => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({ type: 'update', data: documentContent }));
                    }
                });
            }

            if (parsedMessage.type === 'cursor') {
                cursors[parsedMessage.clientId] = { 
                    x: parsedMessage.position.x, 
                    y: parsedMessage.position.y, 
                    color: cursors[parsedMessage.clientId]?.color || getRandomColor() 
                };

                wss.clients.forEach(client => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({ type: 'cursor', cursors }));
                    }
                });
            }

        } catch (error) {
            console.error('Error parsing message:', error);
        }
    });

    ws.on('close', () => {
        delete cursors[clientId];
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'cursor', cursors }));
            }
        });
    });
});

// Serve React build
app.use(express.static(path.join(__dirname, 'build')));
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Render-compatible port
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
