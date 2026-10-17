import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Sparkles, Volume2, VolumeX, MessageSquare, X, Headphones } from 'lucide-react';

export interface BusinessWelcomeProps {
  businessName: string;
  onClose: () => void;
}

export function BusinessWelcome({ businessName, onClose }: BusinessWelcomeProps) {
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="relative card p-6 mb-6 bg-gradient-to-r from-brand-50 to-blue-50 border-brand-200">
      {/* Voice chat panel */}
      {isVoiceEnabled && (
        <div className="mb-4 p-4 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-lg border border-cyan-200">
          <div className="flex items-center gap-3 mb-3">
            <Headphones className="text-cyan-600" size={18} />
            <h3 className="text-sm font-semibold text-cyan-900">Voice Assistant Active</h3>
          </div>
          <p className="text-xs text-cyan-800">
            🎤 Voice assistance is now active! You can ask questions like:
            <span className="block mt-1 ml-2 text-cyan-700">
              "What's my revenue today?", "Which customers bought most today?", "Which products are selling well?"
            </span>
          </p>
        </div>
      )}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="Close welcome panel"
      >
        <X size={18} />
      </button>

      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-brand-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <Sparkles className="text-white" size={20} />
        </div>

        <div className="flex-1">
          <h2 className="text-lg font-bold text-gray-900 mb-1">
            Welcome to {businessName}! 🎉
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Your shop is ready! Let me help you get started with some quick insights and suggestions.
          </p>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isVoiceEnabled
                ? 'bg-brand-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {isVoiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              {isVoiceEnabled ? 'Voice On' : 'Voice Off'}
            </button>

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <MessageSquare size={16} />
              AI Assistant
            </button>
          </div>

          {isExpanded && (
            <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Smart Business Assistant</h3>
              <p className="text-sm text-gray-600 mb-3">
                I'm here to help analyze your business data and provide insights! I can help you with:
              </p>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• Analyze sales trends and patterns</li>
                <li>• Identify slow-moving products</li>
                <li>• Optimize inventory levels</li>
                <li>• Calculate profit margins</li>
                <li>• Provide business recommendations</li>
              </ul>
              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-800">
                  <strong>Quick Tip:</strong> Try asking "What's my best selling product this week?" or
                  "Which products need restocking?"
                </p>
              </div>
            </div>
          )}

          {isVoiceEnabled && (
            <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-xs text-green-800">
                🎤 Voice assistance is active! Just speak naturally and I'll analyze your business data.
                Try asking questions like "What was my revenue yesterday?" or "Which customers bought most today?".
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}