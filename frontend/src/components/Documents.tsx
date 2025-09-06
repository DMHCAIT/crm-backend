import React, { useState } from 'react';
import { 
  FileText, 
  Upload, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Download, 
  Eye,
  User,
  Calendar,
  Filter
} from 'lucide-react';

const Documents: React.FC = () => {
  const [activeTab, setActiveTab] = useState('pending');

  const documents = [
    {
      id: 1,
      studentName: 'Rahul Sharma',
      studentId: 'MED2024001',
      course: 'MBBS',
      documentType: '10th Marksheet',
      uploadDate: '2024-12-08',
      status: 'pending',
      verifiedBy: null,
      notes: 'Awaiting verification',
      fileUrl: '#'
    },
    {
      id: 2,
      studentName: 'Priya Patel',
      studentId: 'MED2024002',
      course: 'MD Cardiology',
      documentType: 'MBBS Certificate',
      uploadDate: '2024-12-07',
      status: 'verified',
      verifiedBy: 'Dr. Sarah Johnson',
      notes: 'All requirements met',
      fileUrl: '#'
    },
    {
      id: 3,
      studentName: 'Amit Kumar',
      studentId: 'MED2024003',
      course: 'MBBS',
      documentType: 'NEET Scorecard',
      uploadDate: '2024-12-06',
      status: 'rejected',
      verifiedBy: 'Dr. Sarah Johnson',
      notes: 'Score does not meet minimum requirements',
      fileUrl: '#'
    },
    {
      id: 4,
      studentName: 'Sarah Ali',
      studentId: 'MED2024004',
      course: 'MD Pediatrics',
      documentType: 'Medical Certificate',
      uploadDate: '2024-12-09',
      status: 'pending',
      verifiedBy: null,
      notes: 'Under review',
      fileUrl: '#'
    },
    {
      id: 5,
      studentName: 'Vikram Singh',
      studentId: 'MED2024005',
      course: 'MD Cardiology',
      documentType: 'Experience Certificate',
      uploadDate: '2024-12-05',
      status: 'verified',
      verifiedBy: 'Dr. Michael Chen',
      notes: 'Valid hospital experience confirmed',
      fileUrl: '#'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'rejected':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const tabs = [
    { id: 'pending', label: 'Pending Review', count: documents.filter(d => d.status === 'pending').length },
    { id: 'verified', label: 'Verified', count: documents.filter(d => d.status === 'verified').length },
    { id: 'rejected', label: 'Rejected', count: documents.filter(d => d.status === 'rejected').length },
    { id: 'all', label: 'All Documents', count: documents.length }
  ];

  const filteredDocuments = activeTab === 'all' 
    ? documents 
    : documents.filter(doc => doc.status === activeTab);

  const stats = [
    {
      title: 'Total Documents',
      value: documents.length,
      icon: FileText,
      color: 'bg-blue-500'
    },
    {
      title: 'Pending Review',
      value: documents.filter(d => d.status === 'pending').length,
      icon: Clock,
      color: 'bg-yellow-500'
    },
    {
      title: 'Verified',
      value: documents.filter(d => d.status === 'verified').length,
      icon: CheckCircle,
      color: 'bg-green-500'
    },
    {
      title: 'Rejected',
      value: documents.filter(d => d.status === 'rejected').length,
      icon: AlertCircle,
      color: 'bg-red-500'
    }
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">DMHCA Document Management</h1>
          <div className="flex items-center space-x-3">
            <button className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2">
              <Filter className="w-4 h-4" />
              <span>Filter</span>
            </button>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
              <Upload className="w-4 h-4" />
              <span>Upload Document</span>
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.title} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-sm text-gray-500">{stat.title}</p>
                  </div>
                  <div className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Documents List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="divide-y divide-gray-200">
          {filteredDocuments.map((document) => (
            <div key={document.id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{document.documentType}</h3>
                    <p className="text-sm text-gray-500">
                      {document.studentName} • {document.studentId}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`px-3 py-1 text-sm font-medium rounded-full border ${getStatusColor(document.status)}`}>
                    {document.status.charAt(0).toUpperCase() + document.status.slice(1)}
                  </span>
                  {getStatusIcon(document.status)}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <User className="w-4 h-4" />
                  <span>Course: {document.course}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>Uploaded: {new Date(document.uploadDate).toLocaleDateString()}</span>
                </div>
                {document.verifiedBy && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4" />
                    <span>Verified by: {document.verifiedBy}</span>
                  </div>
                )}
              </div>

              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <p className="text-sm text-gray-700">
                  <strong>Notes:</strong> {document.notes}
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex space-x-3">
                  <button className="flex items-center space-x-2 text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors">
                    <Eye className="w-4 h-4" />
                    <span>View</span>
                  </button>
                  <button className="flex items-center space-x-2 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded-lg transition-colors">
                    <Download className="w-4 h-4" />
                    <span>Download</span>
                  </button>
                </div>

                {document.status === 'pending' && (
                  <div className="flex space-x-2">
                    <button className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm">
                      Reject
                    </button>
                    <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm">
                      Approve
                    </button>
                  </div>
                )}

                {document.status === 'rejected' && (
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm">
                    Request Resubmission
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {filteredDocuments.length === 0 && (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-lg text-gray-500">No documents found</p>
            <p className="text-sm text-gray-400">Documents will appear here when uploaded by students</p>
          </div>
        )}
      </div>

      {/* Document Requirements */}
      <div className="mt-8 bg-blue-50 rounded-xl border border-blue-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Required Documents by Course</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium text-gray-900 mb-3">MBBS Program</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• 10th & 12th Marksheets</li>
              <li>• NEET Scorecard</li>
              <li>• Transfer Certificate</li>
              <li>• Character Certificate</li>
              <li>• Medical Fitness Certificate</li>
              <li>• Category Certificate (if applicable)</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-3">MD Programs</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• MBBS Degree Certificate</li>
              <li>• NEET-PG Scorecard</li>
              <li>• Internship Completion Certificate</li>
              <li>• Experience Certificate (if applicable)</li>
              <li>• Registration Certificate</li>
              <li>• No Objection Certificate</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Documents;