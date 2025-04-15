import React, { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  const [document, setDocument] = useState(localStorage.getItem('offlineDoc') || "");
  const [cursors, setCursors] = useState({});
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const textareaRef = useRef(null);
  const clientId = useRef(Math.random().toString(36).substr(2, 9)).current;
  const socketRef = useRef(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!isOnline) return;

    const socket = new WebSocket('wss://offline-final.onrender.com'); // Skip if offline-only
    socketRef.current = socket;

    socket.onopen = () => {
      const saved = localStorage.getItem('offlineDoc');
      if (saved) {
        socket.send(JSON.stringify({ type: 'update', data: saved }));
      }
    };

    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'update') {
        setDocument(msg.data);
        localStorage.setItem('offlineDoc', msg.data);
      } else if (msg.type === 'cursor') {
        setCursors(msg.cursors);
      }
    };

    socket.onclose = () => setTimeout(() => window.location.reload(), 3000);
    socket.onerror = (error) => console.error('WebSocket error:', error);

    return () => socket.close();
  }, [isOnline]);

  const handleChange = (e) => {
    const val = e.target.value;
    setDocument(val);
    localStorage.setItem('offlineDoc', val);

    if (isOnline && socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'update', data: val }));
    }
  };

  const handleCursorMove = () => {
    const { selectionStart, selectionEnd } = textareaRef.current;
    const cursorPosition = { x: selectionStart, y: selectionEnd };
    if (isOnline && socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'cursor',
        clientId,
        position: cursorPosition,
      }));
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      const textareaElement = textareaRef.current;
      textareaElement.addEventListener('mousemove', handleCursorMove);
      
      return () => {
        if (textareaElement) {
          textareaElement.removeEventListener('mousemove', handleCursorMove);
        }
      };
    }
  }, [isOnline]);

  return (
    <div className="App">
      <h1>Collaborative Editor {isOnline ? '🟢 Online' : '🔴 Offline'}</h1>
      <textarea
        ref={textareaRef}
        value={document}
        onChange={handleChange}
        rows="20"
        cols="80"
      />
      <div className="cursors">
        {Object.keys(cursors).map(clientId => {
          const cursor = cursors[clientId];
          return (
            <div
              key={clientId}
              className="cursor"
              style={{
                position: 'absolute',
                top: `${cursor.y}px`, 
                left: `${cursor.x}px`,
                backgroundColor: cursor.color,
                width: '5px',
                height: '5px',
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

export default App;
