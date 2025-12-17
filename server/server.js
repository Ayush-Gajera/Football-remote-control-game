const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, '../public')));

// Store room state
const rooms = {};

io.on('connection', (socket) => {
    // console.log('A user connected:', socket.id);

    // Host creates a room
    socket.on('create-room', (roomId) => {
        if (rooms[roomId]) {
            // Room exists? Maybe just rejoin or overwrite? 
            // For chaos/arcade, let's just claim it.
        }
        rooms[roomId] = {
            host: socket.id,
            players: {},
            scores: { 1: 0, 2: 0 }
        };
        socket.join(roomId);
        console.log(`Room created: ${roomId}`);
    });

    // Player joins a room
    socket.on('join-room', ({ roomId, player }) => {
        const room = rooms[roomId];
        if (room) {
            if (room.players[player]) {
                // Already taken? Kick old one? Allow reconnect?
                // Let's allow reconnect/overwrite for simplicity
            }
            room.players[player] = socket.id;
            socket.join(roomId);

            // Notify host
            io.to(room.host).emit('player-joined', { player });
            console.log(`Player ${player} joined room ${roomId}`);
        } else {
            socket.emit('error', 'Room not found');
        }
    });

    // Movement Inputs
    socket.on('move-start', ({ roomId, player, direction }) => {
        const room = rooms[roomId];
        if (room && room.host) {
            io.to(room.host).emit('player-move', { player, direction, active: true });
        }
    });

    socket.on('move-stop', ({ roomId, player }) => {
        const room = rooms[roomId];
        if (room && room.host) {
            io.to(room.host).emit('player-move', { player, active: false });
        }
    });

    // Action Inputs
    socket.on('action-kick', ({ roomId, player }) => {
        const room = rooms[roomId];
        if (room && room.host) io.to(room.host).emit('player-action', { player, type: 'kick' });
    });

    socket.on('action-jump', ({ roomId, player }) => {
        const room = rooms[roomId];
        if (room && room.host) io.to(room.host).emit('player-action', { player, type: 'jump' });
    });

    socket.on('action-air-hit', ({ roomId, player }) => {
        const room = rooms[roomId];
        if (room && room.host) io.to(room.host).emit('player-action', { player, type: 'air-hit' });
    });

    // Feedback events (Game -> Controllers)
    socket.on('feedback-event', ({ roomId, target, type, data }) => {
        const room = rooms[roomId];
        if (!room) return;

        if (target === 'all') {
            // Broadcast to all players in the room (excluding host usually, but cleaner to just emit to room)
            // But wait, players join the 'room' channel? Yes, in 'join-room': socket.join(roomId);
            // So:
            socket.to(roomId).emit('feedback', { type, data });
        } else if (room.players[target]) {
            // Send to specific player
            io.to(room.players[target]).emit('feedback', { type, data });
        }
    });

    // Game Over Event (Host -> Controllers) for Music
    socket.on('game-over', ({ roomId, winner }) => {
        const room = rooms[roomId];
        if (room) {
            socket.to(roomId).emit('game-over', { winner });
        }
    });

    socket.on('disconnect', () => {
        // Handle disconnects if needed
        // For now, if a player disconnects, they just stop moving.
        // If host disconnects, the room effectively dies.
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
