import React, { useState } from 'react';
import { 
  MessageSquare, 
  Mail, 
  Phone, 
  Send, 
  Search, 
  Filter,
  Star,
  Archive,
  MoreHorizontal,
  CheckCircle,
  Clock,
  AlertCircle,
  User
} from 'lucide-react';

const MultiChannelInbox: React.FC = () => {
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [activeFilter, setActiveFilter] = useState('all');

  const conversations = [
    {
      id: 1,
      studentName: 'Rahul Sharma',
      studentId: 'LEAD-2024-001',
      channel: 'whatsapp',
      subject: 'MBBS Admission Inquiry',
      preview: 'Hi, I want to know about MBBS admission process and fees...',
      timestamp: '2 mins ago',
      status: 'unread',
      priority: 'high',
      course: 'MBBS',
      messages: [
        {
          id: 1,
          sender: 'student',
          content: 'Hi, I want to know about MBBS admission process and fees',
          timestamp: '10:30 AM',
          channel: 'whatsapp'
        },
        {
          id: 2,
          sender: 'counselor',
          content: 'Hello Rahul! Thank you for your interest in our MBBS program. I\'ll be happy to help you with the admission process.',
          timestamp: '10:32 AM',
          channel: 'whatsapp'
        }
      ]
    },
    {
      id: 2,
      studentName: 'Priya Patel',
      studentId: 'LEAD-2024-002',
      channel: 'email',
      subject: 'MD Cardiology Specialization',
      preview: 'I have completed my MBBS and looking for MD Cardiology...',
      timestamp: '15 mins ago',
      status: 'read',
      priority: 'medium',
      course: 'MD Cardiology',
      messages: [
        {
          id: 1,
          sender: 'student',
          content: 'I have completed my MBBS and looking for MD Cardiology specialization. Can you provide details about eligibility and fees?',
          timestamp: '9:45 AM',
          channel: 'email'
        }
      ]
    },
    {
      id: 3,
      studentName: 'Amit Kumar',
      studentId: 'LEAD-2024-003',
      channel: 'sms',
      subject: 'Fee Payment Query',
      preview: 'Can I pay fees in installments for MBBS?',
      timestamp: '1 hour ago',
      status: 'read',
      priority: 'low',
      course: 'MBBS',
      messages: [
        {
          id: 1,
          sender: 'student',
          content: 'Can I pay fees in installments for MBBS?',
          timestamp: '8:30 AM',
          channel: 'sms'
        }
      ]
    },
    {
      id: 4,
      studentName: 'Sarah Ali',
      studentId: 'STU-2024-004',
      channel: 'phone',
      subject: 'Document Verification Status',
      preview: 'Missed call - Regarding document verification',
      timestamp: '2 hours ago',
      status: 'unread',
      priority: 'high',
      course: 'MD Pediatrics',
      messages: [
        {
          id: 1,
          sender: 'system',
          content: 'Missed call from +91 9876543213 at 7:30 AM - Student inquired about document verification status',
          timestamp: '7:30 AM',
          channel: 'phone'
        }
      ]
    }
  ];

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'whatsapp':
        return <MessageSquare className="w-4 h-4 text-green-600" />;
      case 'email':
        return <Mail className="w-4 h-4 text-blue-600" />;
      case 'sms':
        return <MessageSquare className="w-4 h-4 text-purple-600" />;
      case 'phone':
        return <Phone className="w-4 h-4 text-orange-600" />;
      default:
        return <MessageSquare className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'unread':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'read':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'replied':
        return <CheckCircle className="w-4 h-4 text-blue-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredConversations = activeFilter === 'all' 
    ? conversations 
    : conversations.filter(conv => conv.status === activeFilter || conv.channel === activeFilter);

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">DMHCA Multi-Channel Inbox</h1>
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search conversations..."
                className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
              />
            </div>
            <button className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2">
              <Filter className="w-4 h-4" />
              <span>Filter</span>
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-4 mb-6">
          {[
            { id: 'all', label: 'All', count: conversations.length },
            { id: 'unread', label: 'Unread', count: conversations.filter(c => c.status === 'unread').length },
            { id: 'whatsapp', label: 'WhatsApp', count: conversations.filter(c => c.channel === 'whatsapp').length },
            { id: 'email', label: 'Email', count: conversations.filter(c => c.channel === 'email').length },
            { id: 'phone', label: 'Calls', count: conversations.filter(c => c.channel === 'phone').length }
          ].map(filter => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeFilter === filter.id
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {filter.label} ({filter.count})
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
        {/* Conversations List */}
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h2 className="font-semibold text-gray-900">Conversations ({filteredConversations.length})</h2>
          </div>
          <div className="overflow-y-auto h-full">
            {filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => setSelectedConversation(conversation)}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedConversation?.id === conversation.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">
                        {conversation.studentName}
                      </h3>
                      <div className="flex items-center space-x-1">
                        {getChannelIcon(conversation.channel)}
                        {getStatusIcon(conversation.status)}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mb-1">{conversation.studentId}</p>
                    <p className="text-sm text-gray-700 truncate mb-2">{conversation.subject}</p>
                    <p className="text-xs text-gray-500 truncate mb-2">{conversation.preview}</p>
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-1 text-xs rounded-full border ${getPriorityColor(conversation.priority)}`}>
                        {conversation.priority}
                      </span>
                      <span className="text-xs text-gray-400">{conversation.timestamp}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Conversation View */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Header */}
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{selectedConversation.studentName}</h3>
                      <p className="text-sm text-gray-500">{selectedConversation.studentId} • {selectedConversation.course}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                      <Star className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                      <Archive className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 p-4 overflow-y-auto">
                <div className="space-y-4">
                  {selectedConversation.messages.map((message: any) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender === 'counselor' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.sender === 'counselor'
                            ? 'bg-blue-600 text-white'
                            : message.sender === 'system'
                            ? 'bg-gray-100 text-gray-700'
                            : 'bg-gray-200 text-gray-800'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p className={`text-xs mt-1 ${
                          message.sender === 'counselor' ? 'text-blue-100' : 'text-gray-500'
                        }`}>
                          {message.timestamp}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reply Input */}
              <div className="p-4 border-t border-gray-200">
                <div className="flex items-center space-x-3">
                  <input
                    type="text"
                    placeholder="Type your message..."
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <select className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option>WhatsApp</option>
                    <option>Email</option>
                    <option>SMS</option>
                  </select>
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
                    <Send className="w-4 h-4" />
                    <span>Send</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a conversation</h3>
                <p className="text-gray-500">Choose a conversation from the list to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
          <h3 className="text-2xl font-bold text-blue-600">{conversations.filter(c => c.status === 'unread').length}</h3>
          <p className="text-sm text-gray-500">Unread Messages</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
          <h3 className="text-2xl font-bold text-green-600">{conversations.filter(c => c.channel === 'whatsapp').length}</h3>
          <p className="text-sm text-gray-500">WhatsApp Chats</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
          <h3 className="text-2xl font-bold text-purple-600">{conversations.filter(c => c.channel === 'email').length}</h3>
          <p className="text-sm text-gray-500">Email Threads</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
          <h3 className="text-2xl font-bold text-orange-600">{conversations.filter(c => c.channel === 'phone').length}</h3>
          <p className="text-sm text-gray-500">Phone Calls</p>
        </div>
      </div>
    </div>
  );
};

export default MultiChannelInbox;