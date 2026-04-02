import { useState, useEffect } from 'react';
import { useSocket } from './context/SocketContext';

export default function App() {
  const { socket, isConnected } = useSocket();
  const [username, setUsername] = useState('');
  const [roomId, setRoomId] = useState('');
  const [hasJoined, setHasJoined] = useState('');
  const [roomUsers, setRoomUsers] = useState([]);

  useEffect(() => {
    if(!socket) return;

    //listen for updated user list
    socket.on('room_users', (users) => {
      setRoomUsers(users);
    });

    return () => socket.off('room_users');
  }, [socket]);
  
  function joinRoom() {
    if(!username.trim() || !roomId.trim()) return;
    socket.emit('join_room', { roomId, username });
    setHasJoined(true);
  }

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 480, margin: '60px auto', padding: '0 20px' }}>

      {/* Connection status indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32 }}>
        <div style={{
          width: 10, height: 10, borderRadius: '50%',
          background: isConnected ? '#22c55e' : '#ef4444'
        }} />
        <span style={{ fontSize: 13, color: '#666' }}>
          {isConnected ? 'Connected to server' : 'Connecting...'}
        </span>
      </div>

      {!hasJoined ? (
        <div>
          <h1 style={{ marginBottom: 24 }}>漢字 Kanji Trainer</h1>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              placeholder="Your name"
              value={username}
              onChange={e => setUsername(e.target.value)}
              style={{ padding: '10px 14px', fontSize: 15, borderRadius: 8, border: '1px solid #ddd' }}
            />
            <input
              placeholder="Room code (share with a friend)"
              value={roomId}
              onChange={e => setRoomId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && joinRoom()}
              style={{ padding: '10px 14px', fontSize: 15, borderRadius: 8, border: '1px solid #ddd' }}
            />
            <button
              onClick={joinRoom}
              disabled={!isConnected}
              style={{
                padding: '12px', fontSize: 15, borderRadius: 8,
                background: '#3b82f6', color: 'white', border: 'none',
                cursor: isConnected ? 'pointer' : 'not-allowed',
                opacity: isConnected ? 1 : 0.5
              }}
            >
              Join Room →
            </button>
          </div>
        </div>
      ) : (
        <div>
          <h1 style={{ marginBottom: 4 }}>Room: {roomId}</h1>
          <p style={{ color: '#666', marginBottom: 24 }}>Share this room code with a friend</p>

          <h3>Users in this room ({roomUsers.length})</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {roomUsers.map(user => (
              <li key={user.id} style={{
                padding: '10px 14px', marginBottom: 8, borderRadius: 8,
                background: user.id === socket.id ? '#eff6ff' : '#f9fafb',
                border: '1px solid #e5e7eb',
                display: 'flex', alignItems: 'center', gap: 8
              }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
                {user.username}
                {user.id === socket.id && <span style={{ color: '#3b82f6', fontSize: 12 }}>(you)</span>}
              </li>
            ))}
          </ul>

          <p style={{ color: '#aaa', fontSize: 13, marginTop: 32 }}>
            Canvas coming in Phase 3...
          </p>
        </div>
      )}
    </div>
  );
}