import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import UserDashboardLayout from '../../components/UserDashboardLayout';
import ChatWindow from '../../components/ChatWindow';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useSocketNotifications } from '../../hooks/useSocketNotifications';
import toast from 'react-hot-toast';

const JobSeekerMessages = () => {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Socket integration for real-time updates
  const { subscribe } = useSocketNotifications();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (user?.role !== 'user') {
      router.push('/unauthorized');
      return;
    }
    fetchMessages();

    // Subscribe to real-time message updates
    const unsubscribe = subscribe('new_message', (data) => {
      if (data.recipientId === user.id || data.senderId === user.id) {
        fetchMessages(); // Refresh messages
        toast.success('New message received!');
      }
    });

    return () => unsubscribe();
  }, [user, authLoading, router, subscribe]);

  const fetchMessages = async () => {
    try {
      const response = await api.get('/messages');
      if (response.data.success) {
        setMessages(response.data.messages);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (content, attachment) => {
    if (!content.trim() && !attachment) return;

    setSending(true);
    try {
      const formData = new FormData();
      formData.append('content', content);
      if (attachment) {
        formData.append('attachment', attachment);
      }

      const response = await api.post('/messages/send', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        fetchMessages(); // Refresh messages
        toast.success('Message sent successfully!');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const messageStats = {
    total: messages.length,
    unread: messages.filter(msg => !msg.read && msg.sender !== 'user').length,
    today: messages.filter(msg => {
      const today = new Date().toDateString();
      return new Date(msg.timestamp).toDateString() === today;
    }).length,
  };

  if (authLoading || loading) {
    return (
      <UserDashboardLayout>
        <div className="loading-spinner">Loading messages...</div>
      </UserDashboardLayout>
    );
  }

  return (
    <UserDashboardLayout>
      <div className="job-seeker-messages">
        {/* Header with Stats */}
        <div className="messages-header">
          <div className="header-content">
            <h1>💬 Messages</h1>
            <p>Communicate with recruiters and administrators</p>
          </div>

          <div className="messages-stats">
            <div className="stat-item">
              <span className="stat-value">{messageStats.total}</span>
              <span className="stat-label">Total</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{messageStats.unread}</span>
              <span className="stat-label">Unread</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{messageStats.today}</span>
              <span className="stat-label">Today</span>
            </div>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="messages-content">
          <ChatWindow
            messages={messages}
            loading={loading}
            onSendMessage={handleSendMessage}
            sending={sending}
            recipientName="Admin"
          />
        </div>

        {/* Help Section */}
        <div className="messages-help">
          <h3>💡 Message Guidelines</h3>
          <ul>
            <li>Be professional and courteous in your communications</li>
            <li>Respond to messages within 24-48 hours</li>
            <li>Include relevant details about your application or inquiry</li>
            <li>Use attachments only when necessary (max 5MB)</li>
            <li>Supported file types: Images, PDF, and text files</li>
          </ul>

          <div className="help-contact">
            <p>Need help? Contact support at <a href="mailto:support@airswift.com">support@airswift.com</a></p>
          </div>
        </div>
      </div>
    </UserDashboardLayout>
  );
};

export default JobSeekerMessages;