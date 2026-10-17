import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Package, CreditCard, Users, BarChart2, TrendingUp, MessageSquare, Headphones, Volume2, VolumeX, Sparkles } from 'lucide-react';

export function QuickActions() {
  const actions = [
    {
      name: 'New Sale',
      to: '/cashier',
      icon: <ShoppingCart size={20} />,
      description: 'Record a new sale quickly',
      color: 'bg-green-50 border-green-200 hover:bg-green-100'
    },
    {
      name: 'Add Product',
      to: '/products?modal=add',
      icon: <Package size={20} />,
      description: 'Add new inventory items',
      color: 'bg-blue-50 border-blue-200 hover:bg-blue-100'
    },
    {
      name: 'Add Expense',
      to: '/expenses?modal=add',
      icon: <CreditCard size={20} />,
      description: 'Record business expenses',
      color: 'bg-red-50 border-red-200 hover:bg-red-100'
    },
    {
      name: 'Customer Payment',
      to: '/customers',
      icon: <Users size={20} />,
      description: 'Record customer payments',
      color: 'bg-purple-50 border-purple-200 hover:bg-purple-100'
    },
    {
      name: 'Analytics',
      to: '/reports',
      icon: <BarChart2 size={20} />,
      description: 'View sales and profit reports',
      color: 'bg-orange-50 border-orange-200 hover:bg-orange-100'
    },
    {
      name: 'AI Assistant',
      to: '/dashboard',
      icon: <MessageSquare size={20} />,
      description: 'Get AI-powered business insights',
      color: 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100'
    },
    {
      name: 'Voice Assistant',
      to: '/dashboard',
      icon: <Volume2 size={20} />,
      description: 'Get voice-powered business assistance',
      color: 'bg-cyan-50 border-cyan-200 hover:bg-cyan-100'
    },
    {
      name: 'Business Tips',
      to: '/dashboard',
      icon: <Sparkles size={20} />,
      description: 'Get AI-powered business tips and insights',
      color: 'bg-violet-50 border-violet-200 hover:bg-violet-100'
    },
    {
      name: 'Help & Support',
      to: '/settings',
      icon: <Headphones size={20} />,
      description: 'Get help and contact support',
      color: 'bg-teal-50 border-teal-200 hover:bg-teal-100'
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp size={20} className="text-brand-600" />
        <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {actions.map((action) => (
          <Link
            key={action.to}
            to={action.to}
            className={`${action.color} border rounded-lg p-4 transition-all duration-200 transform hover:scale-105 block`}
          >
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                {action.icon}
              </div>
              <div>
                <h3 className="font-medium text-sm text-gray-900 mb-1">{action.name}</h3>
                <p className="text-xs text-gray-600">{action.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}