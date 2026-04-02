const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors({ origin: 'http://localhost:5173' }));

//wrap express in an http server so socket can attach
const httpServer = http.createServer(app);

const io = new Server(httpServer, { 
    cors: {
        origin: 'http://localhost:5173',
        methods: ['GET', 'POST']
    }
});

//track connected users using JS object
const rooms = {};

io.on('connection',(socket) => {
    console.log(`User connected: ${socket.id}`);

    //client will send this when entering a room
    socket.on('join_room', ({roomId, username }) => {
        socket.join(roomId); //put socket in named group

        //add user to room tracker
        if(!rooms[roomId]) rooms[roomId] = [];
        rooms[roomId].push({id: socket.id, username});

        console.log(`${username} joined room: ${roomId}`);

        //notify room
        io.to(roomId).emit('room_users', rooms[roomId]);
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        //remove user from room
        for (const roomId in rooms) {
            rooms[roomId] = rooms[roomId].filter(user => user.id !== socket.id);
            //notify room of updated users
            io.to(roomId).emit('room_users', rooms[roomId]);
        }
    });

    //client will send this when drawing on canvas
    socket.on('draw', ({ roomId, x0, y0, x1, y1, color, lineWidth }) => {
        //broadcast to everyone in room besides sender
        socket.to(roomId).emit('draw', { x0,y0,x1,y1,color,lineWidth });
    });

    //client will send this when lifting mouse
    socket.on('stroke_end', ({ roomId }) => {
        socket.to(roomId).emit('stroke_end');
    });

    socket_on('clear_canvas', ({ roomId }) => {
        socket.to(roomId).emit('clear_canvas');
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', connections: io.engine.clientsCount });
});

const PORT = 3001;
httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});