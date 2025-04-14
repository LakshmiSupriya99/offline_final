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

    const socket = new WebSocket(''ws://localhost:5000''); // Skip if offline-only
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
    </div>
  );
}

export default App;
