import React, { useState, useRef, useEffect } from 'react';
import '../../styles/ChatWindow.css';

const ChatWindow = ({
  messages,
  loading = false,
  onSendMessage,
  sending = false,
  recipientName = 'Admin'
}) => {
  const [messageInput, setMessageInput] = useState('');
  const [attachment, setAttachment] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!messageInput.trim() && !attachment) return;

    if (onSendMessage) {
      onSendMessage(messageInput, attachment);
      setMessageInput('');
      setAttachment(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type and size
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/plain'];
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (!allowedTypes.includes(file.type)) {
        alert('Please select a valid file type (images, PDF, or text files)');
        return;
      }

      if (file.size > maxSize) {
        alert('File size must be less than 5MB');
        return;
      }

      setAttachment(file);
    }
  };

  const removeAttachment = () => {
    setAttachment(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (loading) {
    return (
      <div className="chat-window loading">
        <div className="chat-header">
          <h3>💬 Chat with {recipientName}</h3>
        </div>
        <div className="chat-messages">
          <div className="loading-messages">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="message skeleton">
                <div className="message-avatar skeleton"></div>
                <div className="message-content skeleton">
                  <div className="skeleton-text"></div>
                  <div className="skeleton-text short"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-window">
      <div className="chat-header">
        <h3>💬 Chat with {recipientName}</h3>
        <div className="chat-stats">
          <span>{messages.length} messages</span>
        </div>
      </div>

      <div className="chat-messages">
        {messages.length > 0 ? (
          messages.map((message) => (
            <div
              key={message.id}
              className={`message ${message.sender === 'user' ? 'sent' : 'received'}`}
            >
              <div className="message-avatar">
                {message.sender === 'user' ? '👤' : '👨‍💼'}
              </div>
              <div className="message-content">
                <div className="message-text">{message.content}</div>
                {message.attachment && (
                  <div className="message-attachment">
                    <a href={message.attachment.url} target="_blank" rel="noopener noreferrer">
                      📎 {message.attachment.name}
                    </a>
                  </div>
                )}
                <div className="message-time">
                  {new Date(message.timestamp).toLocaleString()}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-chat">
            <p>👋 Start a conversation with {recipientName}</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input">
        {attachment && (
          <div className="attachment-preview">
            <span>📎 {attachment.name}</span>
            <button onClick={removeAttachment} className="remove-attachment">×</button>
          </div>
        )}

        <div className="input-group">
          <textarea
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            rows={1}
            disabled={sending}
          />

          <div className="input-actions">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="attach-btn"
              disabled={sending}
              title="Attach file"
            >
              📎
            </button>

            <button
              onClick={handleSend}
              className="send-btn"
              disabled={sending || (!messageInput.trim() && !attachment)}
            >
              {sending ? '⏳' : '📤'}
            </button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          style={{ display: 'none' }}
          accept="image/*,.pdf,.txt"
        />

        <div className="chat-help">
          <small>💡 Tip: Press Enter to send, Shift+Enter for new line</small>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;