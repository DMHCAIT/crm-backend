import React, { useState, useEffect, useRef } from 'react';
import { Bell, Search, User, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import ProductionStatus from './ProductionStatus';

const Header: React.FC = () => {
  const { user, signOut } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    try {
      await signOut();
      // Redirect will be handled by AuthWrapper
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search DMHCA students, leads, or courses..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-96"
            />
          </div>
          <ProductionStatus />
        </div>
        
        <div className="flex items-center space-x-4">
          <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors">
            <Bell className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              3
            </span>
          </button>
          
          <div className="relative flex items-center space-x-3 border-l border-gray-200 pl-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{user?.name || 'Dr. Sarah Johnson'}</p>
              <p className="text-xs text-gray-500">{user?.role || 'Admissions Counselor'}</p>
            </div>
            <div className="relative" ref={menuRef}>
              <button 
                className="flex items-center space-x-1 w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full hover:shadow-md transition-shadow"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <User className="w-4 h-4 text-white ml-2" />
                <ChevronDown className="w-3 h-3 text-white" />
              </button>
              
              {/* User Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        window.location.hash = '#profile';
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <User className="w-4 h-4 mr-2" />
                      Profile
                    </button>
                    <hr className="my-1 border-gray-200" />
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        handleLogout();
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;