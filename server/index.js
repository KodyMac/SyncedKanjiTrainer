const { Redis } = require('@upstash/redis');

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const USER_COLORS = [
    '#e63946',
    '#2a9d8f',
    '#6a4c93',
    '#f4a261',
    '#457b9d',
    '#2d6a4f',
    '#e76f51',
]

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


io.on('connection',(socket) => {
    console.log(`User connected: ${socket.id}`);

    //client will send this when entering a room
    socket.on('join_room', async ({roomId, username }) => {
        socket.join(roomId); //put socket in named group

        const existingUsers = await redis.hgetall(`room:${roomId}:users`) || {};
        const colorIndex = Object.keys(existingUsers).length % USER_COLORS.length;
        const color = USER_COLORS[colorIndex];

        //store user is redis hash with roomId as key and array of users as value
        await redis.hset(`room:${roomId}:users`, {
            [socket.id]: JSON.stringify({username, color })
        });

        socket.emit('assigned_color', color); //tell user their color
        console.log(`${username} joined room: ${roomId}`);
        const usersHash = await redis.hgetall(`room:${roomId}:users`);
        //convert hash to array of {id, username} for frontend
        const users = Object.entries(usersHash).map(([id, data]) => {
            const parsed = typeof data === 'string' ? JSON.parse(data) : data;
            return { id, username: parsed.username, color: parsed.color };
        });

        //notify room
        io.to(roomId).emit('room_users', users);

        const strokes = await redis.lrange(`room:${roomId}:strokes`,0,-1);
        if(strokes.length > 0) {
            const parsed = strokes
                .map(s => {
                    try {
                        return typeof s === 'string' ? JSON.parse(s) : s;
                    } catch (e) {
                        return null; //skip corrupted strokes
                    }
                })
                .filter(Boolean); //remove nulls
            socket.emit('replay_strokes', parsed);
        }
        //track which room this socket is in for disconnect cleanup
        await redis.set(`socket:${socket.id}:room`, roomId);
    });

    socket.on('disconnect', async () => {
        console.log(`User disconnected: ${socket.id}`);
        //find which room this socket was in
        const roomId = await redis.get(`socket:${socket.id}:room`);
        if(!roomId) return; //not in a room
        
        //remove from room user hash
        await redis.hdel(`room:${roomId}:users`, socket.id);

        //clean up room tracking
        await redis.del(`socket:${socket.id}:room`);

        //send updated user list to room
        const usersHash = await redis.hgetall(`room:${roomId}:users`) || {};
        const users = Object.entries(usersHash).map(([id, data]) => {
            const parsed = typeof data === 'string' ? JSON.parse(data) : data;
            return { id, username: parsed.username, color: parsed.color };
        });
        io.to(roomId).emit('room_users', users);
        
    });

    //client will send this when drawing on canvas
    socket.on('draw', async ({ roomId, x0, y0, x1, y1, color, lineWidth }) => {
        //append stroke to redis list for this room
        await redis.rpush(`room:${roomId}:strokes`, JSON.stringify({ x0, y0, x1, y1, color, lineWidth }));
        
        socket.to(roomId).emit('draw', { x0,y0,x1,y1,color,lineWidth });
    });

    //client will send this when lifting mouse
    socket.on('stroke_end', ({ roomId }) => {
        socket.to(roomId).emit('stroke_end');
    });

    socket.on('clear_canvas', async ({ roomId }) => {
        await redis.del(`room:${roomId}:strokes`);
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