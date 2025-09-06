import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Filter,
  User,
  Shield,
  Crown,
  Briefcase,
  UserCheck,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Edit3,
  Trash2,
  Eye,
  Settings,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

const UserManagement: React.FC = () => {
  const [currentUserRole, setCurrentUserRole] = useState('super_admin'); // This would come from auth context
  const [selectedRole, setSelectedRole] = useState('all');
  const [expandedUsers, setExpandedUsers] = useState<number[]>([]);
  const [showAddUserModal, setShowAddUserModal] = useState(false);

  const roleHierarchy = {
    'super_admin': { 
      level: 5, 
      label: 'Super Admin', 
      icon: Crown, 
      color: 'bg-purple-500',
      canAdd: ['senior_manager', 'manager', 'team_leader', 'counselor'] 
    },
    'senior_manager': { 
      level: 4, 
      label: 'Senior Manager', 
      icon: Shield, 
      color: 'bg-blue-500',
      canAdd: ['manager', 'team_leader', 'counselor'] 
    },
    'manager': { 
      level: 3, 
      label: 'Manager', 
      icon: Briefcase, 
      color: 'bg-green-500',
      canAdd: ['team_leader', 'counselor'] 
    },
    'team_leader': { 
      level: 2, 
      label: 'Team Leader', 
      icon: UserCheck, 
      color: 'bg-orange-500',
      canAdd: ['counselor'] 
    },
    'counselor': { 
      level: 1, 
      label: 'Counselor', 
      icon: User, 
      color: 'bg-gray-500',
      canAdd: [] 
    }
  };

  const users = [
    // Super Admin (System Administrator)
    {
      id: 1,
      name: 'System Administrator',
      email: 'admin@dmhca.in',
      phone: '+91 9999999999',
      officePhone: '+91 9999999999',
      role: 'super_admin',
      department: 'Administration',
      designation: 'System Administrator',
      location: 'Delhi',
      dateOfBirth: '1980-01-01',
      joinDate: '2020-01-01',
      status: 'active',
      reportsTo: null,
      subordinates: [2, 3]
    },
    // Senior Managers
    {
      id: 2,
      name: 'Employee Name',
      email: 'moin@delhimedical.net',
      phone: '+91 9618908624',
      officePhone: '+91 9650477988',
      role: 'senior_manager',
      department: 'Sales & Marketing',
      designation: 'Senior Sales Manager',
      location: 'Delhi',
      dateOfBirth: '1983-03-15',
      joinDate: '2020-01-15',
      status: 'active',
      reportsTo: 1,
      subordinates: [4, 5, 6, 7]
    },
    {
      id: 3,
      name: 'Nikhil Gajabimkar',
      email: 'gajabimkarnikhil@delhimedical.net',
      phone: '+91 9985492153',
      officePhone: '+91 9390221480',
      role: 'senior_manager',
      department: 'Development & Operations',
      designation: 'Manager - Development & Operations, IBMP',
      location: 'Delhi',
      dateOfBirth: '1992-07-29',
      joinDate: '2022-01-10',
      status: 'active',
      reportsTo: 1,
      subordinates: [8]
    },
    // Managers
    {
      id: 4,
      name: 'Akram Shareef',
      email: 'akram@dmhca.in',
      phone: '+91 8885472064',
      officePhone: '+91 7042239227',
      role: 'manager',
      department: 'Sales',
      designation: 'Assistant Sales Manager',
      location: 'Delhi',
      dateOfBirth: '1993-07-20',
      joinDate: '2025-03-06',
      status: 'active',
      reportsTo: 2,
      subordinates: [9, 10, 11]
    },
    // Team Leaders
    {
      id: 5,
      name: 'Akshay Suryavanshi',
      email: 'akshay@delhimedical.net',
      phone: '+91 8341124314',
      officePhone: '+91 9390214659',
      role: 'team_leader',
      department: 'Sales Team',
      designation: 'Senior Sales Team Lead',
      location: 'Delhi',
      dateOfBirth: '2000-07-15',
      joinDate: '2025-02-05',
      status: 'active',
      reportsTo: 2,
      subordinates: [12, 13, 14, 15, 16]
    },
    {
      id: 6,
      name: 'Mohd Rafathullah',
      email: 'mrafathullah@delhimedical.net',
      phone: '+91 8309622122',
      officePhone: '+91 7042400531',
      role: 'team_leader',
      department: 'Sales Team',
      designation: 'Sales Team Lead',
      location: 'Delhi',
      dateOfBirth: '1996-09-14',
      joinDate: '2024-12-05',
      status: 'active',
      reportsTo: 2,
      subordinates: [17, 18, 19]
    },
    {
      id: 7,
      name: 'Katla Shankar Varma',
      email: 'shankar@dmhca.in',
      phone: '+91 8121505771',
      officePhone: '+91 9667721390',
      role: 'team_leader',
      department: 'Admissions',
      designation: 'Senior Admission Counsellor',
      location: 'Delhi',
      dateOfBirth: '1994-04-20',
      joinDate: '2025-05-05',
      status: 'active',
      reportsTo: 2,
      subordinates: [20, 21, 22]
    },
    {
      id: 8,
      name: 'Mehraj Khan',
      email: 'Mehraj@delhimedical.net',
      phone: '+91 8367734252',
      officePhone: '+91 9958885154',
      role: 'team_leader',
      department: 'Sales Team',
      designation: 'Assistant Sales Team Lead',
      location: 'Delhi',
      dateOfBirth: '1999-05-15',
      joinDate: '2024-08-12',
      status: 'active',
      reportsTo: 3,
      subordinates: [23, 24]
    },
    // Counselors
    {
      id: 9,
      name: 'B. Renuka Nakshatra',
      email: 'renukanakshatra@delhimedical.net',
      phone: '+91 8688325633',
      officePhone: '+91 8130095646',
      role: 'counselor',
      department: 'Admissions',
      designation: 'Admission Counsellor',
      location: 'Delhi',
      dateOfBirth: '2000-04-23',
      joinDate: '2024-05-07',
      status: 'active',
      reportsTo: 4,
      subordinates: []
    },
    {
      id: 10,
      name: 'Asiya Begum',
      email: 'asiy@dmhca.in',
      phone: '+91 7075786615',
      officePhone: '+91 9667044553',
      role: 'counselor',
      department: 'Admissions',
      designation: 'Admission Counsellor',
      location: 'Delhi',
      dateOfBirth: '2002-10-23',
      joinDate: '2025-04-21',
      status: 'active',
      reportsTo: 4,
      subordinates: []
    },
    {
      id: 11,
      name: 'Yaseen Hussain',
      email: 'yaseen@dmhca.in',
      phone: '+91 9014651325',
      officePhone: '+91 7013590139',
      role: 'counselor',
      department: 'Admissions',
      designation: 'Admission Counsellor',
      location: 'Delhi',
      dateOfBirth: '2002-07-26',
      joinDate: '2025-04-21',
      status: 'active',
      reportsTo: 4,
      subordinates: []
    },
    {
      id: 12,
      name: 'Vijaya Sri Chanda',
      email: 'vchanda@dmhca.in',
      phone: '+91 9667099003',
      officePhone: '+91 8106219985',
      role: 'counselor',
      department: 'Admissions',
      designation: 'Admission Counsellor',
      location: 'Delhi',
      dateOfBirth: '2000-06-13',
      joinDate: '2025-05-06',
      status: 'active',
      reportsTo: 5,
      subordinates: []
    },
    {
      id: 13,
      name: 'Tutika Alekhya',
      email: 'alekhya@dmhca.in',
      phone: '+91 7735707703',
      officePhone: '+91 7042819933',
      role: 'counselor',
      department: 'Admissions',
      designation: 'Admission Counsellor',
      location: 'Delhi',
      dateOfBirth: '2001-03-25',
      joinDate: '2025-05-05',
      status: 'active',
      reportsTo: 5,
      subordinates: []
    },
    {
      id: 14,
      name: 'Nacharam Sandeeptha',
      email: 'sandeeptha@dmhca.in',
      phone: '+91 6301778596',
      officePhone: '+91 8130907483',
      role: 'counselor',
      department: 'Admissions',
      designation: 'Admission Counsellor',
      location: 'Delhi',
      dateOfBirth: '2003-03-06',
      joinDate: '2025-05-25',
      status: 'active',
      reportsTo: 5,
      subordinates: []
    },
    {
      id: 15,
      name: 'Asha Bhavani Kondapalli',
      email: 'ashakondapalli@dmhca.in',
      phone: '+91 7675818782',
      officePhone: '+91 9667044553',
      role: 'counselor',
      department: 'Admissions',
      designation: 'Admission Counsellor',
      location: 'Delhi',
      dateOfBirth: '2001-12-06',
      joinDate: '2025-05-25',
      status: 'active',
      reportsTo: 5,
      subordinates: []
    },
    {
      id: 16,
      name: 'Mirza Younus Baig',
      email: 'mirzayounus@dmhca.in',
      phone: '+91 9347953145',
      officePhone: '+91 8130700998',
      role: 'counselor',
      department: 'Admissions',
      designation: 'Admission Counsellor',
      location: 'Delhi',
      dateOfBirth: '1989-11-12',
      joinDate: '2025-05-26',
      status: 'active',
      reportsTo: 5,
      subordinates: []
    },
    {
      id: 17,
      name: 'Mohd Aslam Ali',
      email: 'aslamali@dmhca.in',
      phone: '+91 7842786220',
      officePhone: '+91 9667300108',
      role: 'counselor',
      department: 'Admissions',
      designation: 'Admission Counsellor',
      location: 'Delhi',
      dateOfBirth: '1994-03-03',
      joinDate: '2025-05-28',
      status: 'active',
      reportsTo: 6,
      subordinates: []
    },
    {
      id: 18,
      name: 'Khushi Tamang',
      email: 'khushit@dmhca.in',
      phone: '+91 8597781406',
      officePhone: '+91 9667717427',
      role: 'counselor',
      department: 'Admissions',
      designation: 'Admission Counsellor',
      location: 'Delhi',
      dateOfBirth: '2005-09-03',
      joinDate: '2025-07-07',
      status: 'active',
      reportsTo: 6,
      subordinates: []
    },
    {
      id: 19,
      name: 'Tejasree',
      email: 'tejasree@dmhca.in',
      phone: '+91 9542560400',
      officePhone: '+91 9667715078',
      role: 'counselor',
      department: 'Admissions',
      designation: 'Admission Counsellor',
      location: 'Delhi',
      dateOfBirth: '1997-07-23',
      joinDate: '2025-07-07',
      status: 'active',
      reportsTo: 6,
      subordinates: []
    },
    {
      id: 20,
      name: 'Priyanka',
      email: 'priyanka@dmhca.in',
      phone: '+91 7036727837',
      officePhone: '+91 7042223094',
      role: 'counselor',
      department: 'Admissions',
      designation: 'Admission Counsellor',
      location: 'Delhi',
      dateOfBirth: '1997-07-30',
      joinDate: '2025-07-07',
      status: 'active',
      reportsTo: 7,
      subordinates: []
    },
    {
      id: 21,
      name: 'Bhavani',
      email: 'bhavani@dmhca.in',
      phone: '+91 7386426087',
      officePhone: '+91 9667717056',
      role: 'counselor',
      department: 'Admissions',
      designation: 'Admission Counsellor',
      location: 'Delhi',
      dateOfBirth: '2002-02-16',
      joinDate: '2025-07-07',
      status: 'active',
      reportsTo: 7,
      subordinates: []
    },
    {
      id: 22,
      name: 'Hussain Mohammad Askari',
      email: 'askari@dmhca.in',
      phone: '+91 8074683560',
      officePhone: '+91 8074683560',
      role: 'counselor',
      department: 'Admissions',
      designation: 'Admission Counsellor',
      location: 'Delhi',
      dateOfBirth: '1997-02-09',
      joinDate: '2025-07-07',
      status: 'active',
      reportsTo: 7,
      subordinates: []
    },
    {
      id: 23,
      name: 'Katla Shankar Varma',
      email: 'shankar@dmhca.in',
      phone: '+91 8121505771',
      officePhone: '+91 9667721390',
      role: 'counselor',
      department: 'Admissions',
      designation: 'Admission Counsellor',
      location: 'Delhi',
      dateOfBirth: '1994-04-20',
      joinDate: '2025-05-05',
      status: 'active',
      reportsTo: 8,
      subordinates: []
    }
  ];

  const getVisibleUsers = () => {
    const currentUserLevel = roleHierarchy[currentUserRole as keyof typeof roleHierarchy].level;
    return users.filter(user => {
      const userLevel = roleHierarchy[user.role as keyof typeof roleHierarchy].level;
      return userLevel <= currentUserLevel;
    });
  };

  const getFilteredUsers = () => {
    const visibleUsers = getVisibleUsers();
    if (selectedRole === 'all') return visibleUsers;
    return visibleUsers.filter(user => user.role === selectedRole);
  };

  const canAddRole = (roleToAdd: string) => {
    const currentRoleData = roleHierarchy[currentUserRole as keyof typeof roleHierarchy];
    return currentRoleData.canAdd.includes(roleToAdd);
  };

  const getAvailableRolesToAdd = () => {
    const currentRoleData = roleHierarchy[currentUserRole as keyof typeof roleHierarchy];
    return currentRoleData.canAdd.map(role => ({
      value: role,
      label: roleHierarchy[role as keyof typeof roleHierarchy].label
    }));
  };

  const toggleUserExpanded = (userId: number) => {
    setExpandedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const getUserSubordinates = (userId: number) => {
    const user = users.find(u => u.id === userId);
    if (!user || !user.subordinates.length) return [];
    return users.filter(u => user.subordinates.includes(u.id));
  };

  const getRoleIcon = (role: string) => {
    const roleData = roleHierarchy[role as keyof typeof roleHierarchy];
    const Icon = roleData.icon;
    return <Icon className="w-4 h-4" />;
  };

  const getRoleColor = (role: string) => {
    return roleHierarchy[role as keyof typeof roleHierarchy].color;
  };

  const getRoleLabel = (role: string) => {
    return roleHierarchy[role as keyof typeof roleHierarchy].label;
  };

  const handleAddUser = () => {
    setShowAddUserModal(true);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">DMHCA User Management</h1>
            <p className="text-sm text-gray-500">Manage DMHCA team members and hierarchical access</p>
          </div>
          {getAvailableRolesToAdd().length > 0 && (
            <button 
              onClick={handleAddUser}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add User</span>
            </button>
          )}
        </div>

        {/* Current User Role Display */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 ${getRoleColor(currentUserRole)} rounded-lg flex items-center justify-center`}>
              {getRoleIcon(currentUserRole)}
            </div>
            <div>
              <p className="text-sm text-blue-600 font-medium">Your Role</p>
              <p className="text-lg font-semibold text-gray-900">{getRoleLabel(currentUserRole)}</p>
              {getAvailableRolesToAdd().length > 0 ? (
                <p className="text-xs text-gray-600">
                  You can add: {getAvailableRolesToAdd().map(r => r.label).join(', ')}
                </p>
              ) : (
                <p className="text-xs text-gray-600">No user creation permissions</p>
              )}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search users by name, email, or department..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <select 
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Roles</option>
            {Object.entries(roleHierarchy).map(([role, data]) => (
              <option key={role} value={role}>{data.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Role Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        {Object.entries(roleHierarchy).map(([role, data]) => {
          const count = getVisibleUsers().filter(user => user.role === role).length;
          const Icon = data.icon;
          return (
            <div key={role} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className={`w-8 h-8 ${data.color} rounded-lg flex items-center justify-center`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <span className="text-2xl font-bold text-gray-900">{count}</span>
              </div>
              <p className="text-sm font-medium text-gray-700">{data.label}</p>
            </div>
          );
        })}
      </div>

      {/* Users List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Team Members ({getFilteredUsers().length})</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {getFilteredUsers().map((user) => {
            const subordinates = getUserSubordinates(user.id);
            const isExpanded = expandedUsers.includes(user.id);
            const Icon = roleHierarchy[user.role as keyof typeof roleHierarchy].icon;
            
            return (
              <div key={user.id}>
                <div className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      {subordinates.length > 0 && (
                        <button
                          onClick={() => toggleUserExpanded(user.id)}
                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-gray-500" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-500" />
                          )}
                        </button>
                      )}
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{user.name}</h3>
                          <div className={`flex items-center space-x-2 px-3 py-1 ${getRoleColor(user.role)} rounded-full`}>
                            <Icon className="w-3 h-3 text-white" />
                            <span className="text-xs font-medium text-white">{getRoleLabel(user.role)}</span>
                          </div>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {user.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div className="flex items-center space-x-2">
                            <Mail className="w-4 h-4" />
                            <span>{user.email}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Phone className="w-4 h-4" />
                            <span>{user.phone}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Phone className="w-4 h-4" />
                            <span>Office: {user.officePhone}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <MapPin className="w-4 h-4" />
                            <span>{user.location}</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-500 mt-2">
                          <p><strong>Department:</strong> {user.department}</p>
                          <p><strong>Designation:</strong> {user.designation}</p>
                          <p><strong>DOB:</strong> {new Date(user.dateOfBirth).toLocaleDateString()}</p>
                          <p><strong>Joined:</strong> {new Date(user.joinDate).toLocaleDateString()}</p>
                        </div>
                        {subordinates.length > 0 && (
                          <p className="text-xs text-blue-600 mt-1">
                            Manages {subordinates.length} team member{subordinates.length !== 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                        <Settings className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Subordinates */}
                {isExpanded && subordinates.length > 0 && (
                  <div className="bg-gray-50 border-l-4 border-blue-500">
                    {subordinates.map((subordinate) => {
                      const SubIcon = roleHierarchy[subordinate.role as keyof typeof roleHierarchy].icon;
                      return (
                        <div key={subordinate.id} className="p-4 ml-8 border-b border-gray-200 last:border-b-0">
                          <div className="flex items-center space-x-4">
                            <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center">
                              <User className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-1">
                                <h4 className="font-medium text-gray-900">{subordinate.name}</h4>
                                <div className={`flex items-center space-x-1 px-2 py-1 ${getRoleColor(subordinate.role)} rounded-full`}>
                                  <SubIcon className="w-3 h-3 text-white" />
                                  <span className="text-xs font-medium text-white">{getRoleLabel(subordinate.role)}</span>
                                </div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-600">
                                <span>{subordinate.email}</span>
                                <span>{subordinate.designation}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Add New User</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Personal Information */}
              <div className="md:col-span-2">
                <h3 className="text-lg font-medium text-gray-900 mb-3 border-b pb-2">Personal Information</h3>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Birth <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              {/* Contact Information */}
              <div className="md:col-span-2">
                <h3 className="text-lg font-medium text-gray-900 mb-3 border-b pb-2 mt-4">Contact Information</h3>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Personal Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="+91 9876543210"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Office Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="+91 9876543210"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Official Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="employee@dmhca.in or employee@delhimedical.net"
                />
              </div>
              
              {/* Professional Information */}
              <div className="md:col-span-2">
                <h3 className="text-lg font-medium text-gray-900 mb-3 border-b pb-2 mt-4">Professional Information</h3>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role <span className="text-red-500">*</span>
                </label>
                <select 
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Role</option>
                  {getAvailableRolesToAdd().map(role => (
                    <option key={role.value} value={role.value}>{role.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employee Designation <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Senior Sales Manager, Admission Counsellor"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department <span className="text-red-500">*</span>
                </label>
                <select 
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Department</option>
                  <option value="Sales & Marketing">Sales & Marketing</option>
                  <option value="Admissions">Admissions</option>
                  <option value="Development & Operations">Development & Operations</option>
                  <option value="Administration">Administration</option>
                  <option value="Sales Team">Sales Team</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Joining <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location <span className="text-red-500">*</span>
                </label>
                <select 
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Location</option>
                  <option value="Delhi">Delhi</option>
                  <option value="Mumbai">Mumbai</option>
                  <option value="Bangalore">Bangalore</option>
                  <option value="Chennai">Chennai</option>
                  <option value="Hyderabad">Hyderabad</option>
                </select>
              </div>
              
              {/* Reports To */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reports To <span className="text-red-500">*</span>
                </label>
                <select 
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Supervisor</option>
                  {getVisibleUsers()
                    .filter(user => {
                      const userLevel = roleHierarchy[user.role as keyof typeof roleHierarchy].level;
                      const currentLevel = roleHierarchy[currentUserRole as keyof typeof roleHierarchy].level;
                      return userLevel >= currentLevel; // Can report to same level or higher
                    })
                    .map(user => (
                      <option key={user.id} value={user.id}>
                        {user.name} - {user.designation}
                      </option>
                    ))}
                </select>
              </div>
              
              {/* Form Note */}
              <div className="md:col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                <p className="text-sm text-blue-700">
                  <span className="font-medium">Note:</span> All fields marked with <span className="text-red-500">*</span> are required. 
                  Please ensure all information is accurate before submitting.
                </p>
              </div>
            </div>
            
            <div className="flex space-x-3 mt-8 pt-4 border-t">
              <button 
                onClick={() => setShowAddUserModal(false)}
                className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  // Handle user creation here
                  setShowAddUserModal(false);
                }}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;