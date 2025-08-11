import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageCircle, 
  Heart, 
  Clock, 
  Shield, 
  Users, 
  AlertTriangle, 
  Send 
} from 'lucide-react';
import io from 'socket.io-client';
import './App.css';

const Logo = () => (
  <div className="relative w-20 h-20 mx-auto mb-4">
    <div className="w-20 h-20 rounded-full border-4 border-blue-400 relative flex items-center justify-center">
      <div className="text-blue-400 font-bold text-2xl">10</div>
    </div>
    <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 text-blue-400 font-bold text-sm">
      More Minutes
    </div>
  </div>
);

const App = () => {
  const [screen, setScreen] = useState('home');
  const [userType, setUserType] = useState(null);
  const [isMatching, setIsMatching] = useState(false);
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(600);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [isTyping, setIsTyping] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(0);
  
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const timerRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Socket.IO connection
  useEffect(() => {
    const SOCKET_URL = process.env.NODE_ENV === 'production' 
      ? window.location.origin 
      : 'http://localhost:3001';
    
    socketRef.current = io(SOCKET_URL, {
      path: '/api/socket',
      transports: ['websocket', 'polling']
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      setConnectionStatus('connected');
    });

    socket.on('disconnect', () => {
      setConnectionStatus('disconnected');
    });

    socket.on('user_count', (count) => {
      setOnlineUsers(count);
    });

    socket.on('match_found', (data) => {
      setIsMatching(false);
      setScreen('chat');
      setMessages([
        { 
          type: 'system', 
          text: '🎉 Connected! You can now chat with each other. Remember: be kind and respectful.',
          timestamp: Date.now()
        }
      ]);
      startTimer();
    });

    socket.on('match_timeout', () => {
      setIsMatching(false);
      setScreen('home');
      alert('No match found at the moment. Please try again later.');
    });

    socket.on('message', (data) => {
      setMessages(prev => [...prev, {
        type: 'other',
        text: data.message,
        timestamp: data.timestamp
      }]);
    });

    socket.on('user_typing', (isTyping) => {
      setIsTyping(isTyping);
    });

    socket.on('partner_disconnected', () => {
      setMessages(prev => [...prev, {
        type: 'system',
        text: '💔 Your chat partner has disconnected. Take care!',
        timestamp: Date.now()
      }]);
    });

    socket.on('session_ended', () => {
      setMessages(prev => [...prev, {
        type: 'system',
        text: '⏰ Time\'s up! Thanks for connecting and supporting each other.',
        timestamp: Date.now()
      }]);
      stopTimer();
    });

    return () => {
      if (socket) {
        socket.disconnect();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          if (socketRef.current) {
            socketRef.current.emit('end_session');
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const sendMessage = () => {
    if (currentMessage.trim() && socketRef.current) {
      const messageData = {
        message: currentMessage,
        timestamp: Date.now()
      };
      
      socketRef.current.emit('send_message', messageData);
      setMessages(prev => [...prev, { 
        type: 'user', 
        text: currentMessage,
        timestamp: messageData.timestamp 
      }]);
      setCurrentMessage('');
      
      socketRef.current.emit('stop_typing');
    }
  };

  const handleTyping = (value) => {
    setCurrentMessage(value);
    
    if (socketRef.current) {
      socketRef.current.emit('typing');
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        socketRef.current.emit('stop_typing');
      }, 1000);
    }
  };

  const startMatching = (type) => {
    setUserType(type);
    setIsMatching(true);
    setScreen('matching');
    
    if (socketRef.current) {
      socketRef.current.emit('find_match', { userType: type });
    }
  };

  const cancelMatching = () => {
    setIsMatching(false);
    setScreen('home');
    
    if (socketRef.current) {
      socketRef.current.emit('cancel_match');
    }
  };

  const leaveChat = () => {
    if (socketRef.current) {
      socketRef.current.emit('leave_chat');
    }
    
    setScreen('home');
    setMessages([]);
    setTimeRemaining(600);
    setUserType(null);
    stopTimer();
  };

  if (screen === 'matching') {
    return (
      <div className="max-w-sm mx-auto bg-white min-h-screen shadow-xl">
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-6 flex flex-col justify-center items-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 mx-auto mb-6"></div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Finding someone for you...</h2>
            <p className="text-gray-600 mb-4">
              Looking for {userType === 'seeker' ? 'someone to listen' : 'someone who needs support'}
            </p>
            <p className="text-sm text-gray-500">
              {onlineUsers} people online now
            </p>
          </div>
          
          <button 
            onClick={cancelMatching}
            className="absolute top-6 left-6 text-gray-500 hover:text-gray-700 bg-white rounded-full p-2 shadow-md"
          >
            ← Back
          </button>
        </div>
      </div>
    );
  }

  if (screen === 'chat') {
    return (
      <div className="max-w-sm mx-auto bg-white min-h-screen shadow-xl">
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <div className="bg-white p-4 shadow-sm flex items-center justify-between">
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-3 ${
                connectionStatus === 'connected' ? 'bg-green-400' : 'bg-red-400'
              }`}></div>
              <span className="font-semibold text-gray-800">
                {connectionStatus === 'connected' ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            
            <div className="flex items-center bg-blue-100 px-3 py-1 rounded-full">
              <Clock className="w-4 h-4 mr-1" />
              <span className={`font-mono text-sm ${timeRemaining <= 60 ? 'text-red-600 font-bold' : 'text-blue-800'}`}>
                {formatTime(timeRemaining)}
              </span>
            </div>

            <button 
              onClick={leaveChat}
              className="text-red-500 hover:text-red-700 text-sm font-medium"
            >
              Leave
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, idx) => (
              <div key={idx} className={
                msg.type === 'system' ? 'text-center' :
                msg.type === 'user' ? 'flex justify-end' : 'flex justify-start'
              }>
                {msg.type === 'system' ? (
                  <div className="bg-yellow-100 text-yellow-800 px-3 py-2 rounded-lg text-sm max-w-xs mx-auto">
                    {msg.text}
                  </div>
                ) : (
                  <div className={`max-w-xs px-4 py-2 rounded-2xl ${
                    msg.type === 'user' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-white text-gray-800 shadow-sm'
                  }`}>
                    {msg.text}
                  </div>
                )}
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-200 text-gray-600 px-4 py-2 rounded-2xl max-w-xs">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {timeRemaining > 0 ? (
            <div className="bg-white p-4 border-t">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={currentMessage}
                  onChange={(e) => handleTyping(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type your message..."
                  className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:border-blue-500"
                  disabled={connectionStatus !== 'connected'}
                />
                <button 
                  onClick={sendMessage}
                  disabled={!currentMessage.trim() || connectionStatus !== 'connected'}
                  className="bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600 transition-colors disabled:bg-gray-300"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white p-4 border-t text-center">
              <button 
                onClick={leaveChat}
                className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
              >
                Return Home
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto bg-white min-h-screen shadow-xl">
      <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 p-6 flex flex-col">
        <div className="text-center mb-8 mt-12">
          <Logo />
          <h1 className="text-3xl font-bold text-blue-400 mb-2">10 More Minutes</h1>
          <p className="text-slate-300 text-lg">Get through the next 10 minutes together</p>
          
          <div className="mt-4 flex items-center justify-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-400' : 'bg-red-400'
            }`}></div>
            <span className="text-slate-400 text-sm">
              {connectionStatus === 'connected' ? 'Online' : 'Connecting...'}
            </span>
            <span className="text-slate-500 text-sm">
              ({onlineUsers} online)
            </span>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center space-y-6">
          <button 
            onClick={() => startMatching('seeker')}
            disabled={connectionStatus !== 'connected'}
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105 border border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <MessageCircle className="w-8 h-8 mx-auto mb-3" />
            <h3 className="text-xl font-semibold mb-2">I need support</h3>
            <p className="text-blue-100">Connect with someone who can listen</p>
          </button>

          <button 
            onClick={() => startMatching('helper')}
            disabled={connectionStatus !== 'connected'}
            className="bg-gradient-to-r from-teal-600 to-teal-700 text-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105 border border-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Heart className="w-8 h-8 mx-auto mb-3" />
            <h3 className="text-xl font-semibold mb-2">I can give support</h3>
            <p className="text-teal-100">Help someone through their moment</p>
          </button>
        </div>

        <div className="flex justify-around mt-8 text-sm text-slate-400">
          <div className="flex items-center">
            <Shield className="w-4 h-4 mr-1" />
            <span>Anonymous</span>
          </div>
          
          <button className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600" title="Emergency">
            <AlertTriangle className="w-4 h-4" />
          </button>
          
          <div className="flex items-center">
            <Clock className="w-4 h-4 mr-1" />
            <span>10 minutes</span>
          </div>
          
          <div className="flex items-center">
            <Users className="w-4 h-4 mr-1" />
            <span>Safe space</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
