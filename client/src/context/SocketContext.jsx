import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        //conntect to server
        const newSocket = io('http://localhost:3001', {
            transports: ['websocket'] //skips http polling fallback, straight to ws
        });
        
        newSocket.on('connect', () => {
            console.log('Connected to server:', newSocket.id);
            setIsConnected(true);
        });

        newSocket.on('disconnect', () => {
            console.log('Disconnected from server');
            setIsConnected(false);
        });

        setSocket(newSocket);

        //cleanup on unmount
        return () => newSocket.disconnect();
    } , []);

    return (
        <SocketContext.Provider value={{ socket, isConnected }}>
            {children}
        </SocketContext.Provider>
    );
}

//custom hook for easy access to socket context
export function useSocket() {
    return useContext(SocketContext);
}