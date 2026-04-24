import React, { useEffect, useState } from 'react';
import UserLayout from '../components/UserLayout';
import api from '../api';

const Messages = () => {
  const [messages, setMessages] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      const response = await api.get('/messages');
      setMessages(response.data.messages || response.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      await api.post('/messages', { content: newMessage, recipient_id: selectedConversation });
      setNewMessage('');
      fetchMessages(); // Refresh
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const conversations = messages.reduce((acc, msg) => {
    const otherUser = msg.sender_id === 'admin' ? 'Admin' : 'You'; // Simplify
    if (!acc[otherUser]) acc[otherUser] = [];
    acc[otherUser].push(msg);
    return acc;
  }, {});

  if (loading) {
    return (
      <UserLayout>
        <div className="loading">Loading messages...</div>
      </UserLayout>
    );
  }

  return (
    <UserLayout>
      <div className="messages-page">
        <div className="conversations-list">
          <h2>Conversations</h2>
          {Object.keys(conversations).map((user) => (
            <div
              key={user}
              className={`conversation-item ${selectedConversation === user ? 'active' : ''}`}
              onClick={() => setSelectedConversation(user)}
            >
              <span>{user}</span>
              <span className="unread-count">{conversations[user].filter(m => !m.read).length}</span>
            </div>
          ))}
        </div>
        <div className="chat-window">
          {selectedConversation ? (
            <>
              <div className="chat-messages">
                {conversations[selectedConversation].map((msg) => (
                  <div key={msg._id} className="message">
                    <strong>{msg.sender_id}:</strong> {msg.content}
                  </div>
                ))}
              </div>
              <div className="chat-input">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                />
                <button onClick={handleSendMessage}>Send</button>
              </div>
            </>
          ) : (
            <p>Select a conversation to start chatting.</p>
          )}
        </div>
      </div>
    </UserLayout>
  );
};

export default Messages;