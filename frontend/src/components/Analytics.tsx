import React, { useState } from 'react';
import { 
  TrendingUp, 
  Users, 
  GraduationCap, 
  DollarSign, 
  Calendar, 
  Target,
  PieChart,
  BarChart3,
  LineChart
} from 'lucide-react';

const Analytics: React.FC = () => {
  const [timeframe, setTimeframe] = useState('month');

  const kpiMetrics = [
    {
      title: 'Lead Conversion Rate',
      value: '68.4%',
      change: '+5.2%',
      changeType: 'positive',
      icon: Target,
      description: 'Leads to enrollment conversion'
    },
    {
      title: 'Average Response Time',
      value: '2.4 hrs',
      change: '-0.8 hrs',
      changeType: 'positive',
      icon: Calendar,
      description: 'First response to new leads'
    },
    {
      title: 'Student Retention',
      value: '94.2%',
      change: '+1.1%',
      changeType: 'positive',
      icon: GraduationCap,
      description: 'Year-over-year retention rate'
    },
    {
      title: 'Revenue per Student',
      value: '₹2.8L',
      change: '+12%',
      changeType: 'positive',
      icon: DollarSign,
      description: 'Average annual revenue'
    }
  ];

  const channelPerformance = [
    { channel: 'Website', leads: 456, conversions: 312, rate: '68.4%', cost: '₹2,400' },
    { channel: 'Facebook Ads', leads: 234, conversions: 145, rate: '62.0%', cost: '₹4,800' },
    { channel: 'Education Fairs', leads: 123, conversions: 89, rate: '72.4%', cost: '₹8,000' },
    { channel: 'Referrals', leads: 89, conversions: 76, rate: '85.4%', cost: '₹1,200' },
    { channel: 'Google Ads', leads: 167, conversions: 98, rate: '58.7%', cost: '₹6,700' }
  ];

  const courseAnalytics = [
    { course: 'MBBS', applications: 1234, enrolled: 456, capacity: 500, utilization: '91.2%' },
    { course: 'MD Cardiology', applications: 456, enrolled: 123, capacity: 150, utilization: '82.0%' },
    { course: 'MD Pediatrics', applications: 234, enrolled: 67, capacity: 80, utilization: '83.8%' },
    { course: 'MS Surgery', applications: 189, enrolled: 45, capacity: 60, utilization: '75.0%' },
    { course: 'MD Radiology', applications: 156, enrolled: 34, capacity: 40, utilization: '85.0%' }
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">DMHCA Analytics & Insights</h1>
        <div className="flex items-center space-x-3">
          <select 
            value={timeframe} 
            onChange={(e) => setTimeframe(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            Export Report
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiMetrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.title} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Icon className="w-6 h-6 text-blue-600" />
                </div>
                <span className={`text-sm font-medium px-2 py-1 rounded ${
                  metric.changeType === 'positive' ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'
                }`}>
                  {metric.change}
                </span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">{metric.value}</h3>
              <p className="text-sm font-medium text-gray-700 mb-1">{metric.title}</p>
              <p className="text-xs text-gray-500">{metric.description}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lead Source Performance */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Lead Source Performance</h2>
              <BarChart3 className="w-5 h-5 text-gray-400" />
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {channelPerformance.map((channel, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900">{channel.channel}</h3>
                      <span className="text-sm font-medium text-green-600">{channel.rate}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>{channel.leads} leads → {channel.conversions} enrolled</span>
                      <span className="text-gray-500">Cost: {channel.cost}</span>
                    </div>
                    <div className="mt-2 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: channel.rate }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Enrollment Funnel */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Enrollment Funnel</h2>
              <TrendingUp className="w-5 h-5 text-gray-400" />
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Website Visitors</span>
                  <span className="text-lg font-bold text-gray-900">15,234</span>
                </div>
                <div className="bg-gray-200 rounded-full h-3">
                  <div className="bg-blue-600 h-3 rounded-full" style={{ width: '100%' }}></div>
                </div>
              </div>

              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Lead Generation</span>
                  <span className="text-lg font-bold text-gray-900">2,456</span>
                </div>
                <div className="bg-gray-200 rounded-full h-3">
                  <div className="bg-green-600 h-3 rounded-full" style={{ width: '75%' }}></div>
                </div>
                <span className="text-xs text-green-600 mt-1">16.1% conversion</span>
              </div>

              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Counseling Scheduled</span>
                  <span className="text-lg font-bold text-gray-900">1,678</span>
                </div>
                <div className="bg-gray-200 rounded-full h-3">
                  <div className="bg-yellow-600 h-3 rounded-full" style={{ width: '50%' }}></div>
                </div>
                <span className="text-xs text-yellow-600 mt-1">68.3% from leads</span>
              </div>

              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Applications Submitted</span>
                  <span className="text-lg font-bold text-gray-900">1,234</span>
                </div>
                <div className="bg-gray-200 rounded-full h-3">
                  <div className="bg-purple-600 h-3 rounded-full" style={{ width: '35%' }}></div>
                </div>
                <span className="text-xs text-purple-600 mt-1">73.5% completion</span>
              </div>

              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Final Enrollment</span>
                  <span className="text-lg font-bold text-gray-900">856</span>
                </div>
                <div className="bg-gray-200 rounded-full h-3">
                  <div className="bg-red-600 h-3 rounded-full" style={{ width: '25%' }}></div>
                </div>
                <span className="text-xs text-red-600 mt-1">69.4% enrollment rate</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Course Analytics */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Course Performance Analysis</h2>
            <PieChart className="w-5 h-5 text-gray-400" />
          </div>
        </div>
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Course</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-700">Applications</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-700">Enrolled</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-700">Capacity</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-700">Utilization</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-700">Progress</th>
                </tr>
              </thead>
              <tbody>
                {courseAnalytics.map((course, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                          <GraduationCap className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-medium text-gray-900">{course.course}</span>
                      </div>
                    </td>
                    <td className="text-center py-4 px-4 text-gray-600">{course.applications}</td>
                    <td className="text-center py-4 px-4">
                      <span className="font-medium text-gray-900">{course.enrolled}</span>
                    </td>
                    <td className="text-center py-4 px-4 text-gray-600">{course.capacity}</td>
                    <td className="text-center py-4 px-4">
                      <span className={`font-medium ${
                        parseFloat(course.utilization) >= 85 ? 'text-green-600' :
                        parseFloat(course.utilization) >= 70 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {course.utilization}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            parseFloat(course.utilization) >= 85 ? 'bg-green-500' :
                            parseFloat(course.utilization) >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: course.utilization }}
                        ></div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Predictive Insights */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <LineChart className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">AI-Powered Insights</h2>
            <p className="text-sm text-gray-600">Predictive analytics based on current trends</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">Enrollment Forecast</h3>
            <p className="text-2xl font-bold text-blue-600 mb-1">+15%</p>
            <p className="text-sm text-gray-600">Expected increase in next quarter based on current lead quality and conversion patterns.</p>
          </div>
          
          <div className="bg-white rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">Optimal Channel</h3>
            <p className="text-lg font-bold text-green-600 mb-1">Education Fairs</p>
            <p className="text-sm text-gray-600">Highest ROI channel with 72.4% conversion rate and lowest cost per acquisition.</p>
          </div>
          
          <div className="bg-white rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">At-Risk Students</h3>
            <p className="text-2xl font-bold text-red-600 mb-1">23</p>
            <p className="text-sm text-gray-600">Students showing signs of potential dropout based on engagement patterns.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;