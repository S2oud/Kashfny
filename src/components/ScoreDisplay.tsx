// components/ScoreDisplay.tsx
'use client';

import React, { useState } from 'react';
import { Player } from '@/hooks/useGameState';

interface ScoreDisplayProps {
  players: Player[];
}

// Function to format score with K suffix for thousands
const formatScore = (score: number): string => {
  if (Math.abs(score) >= 1000) {
    return `${(score / 1000).toFixed(0)}K`;
  }
  return score.toString();
};

export default function ScoreDisplay({ players }: ScoreDisplayProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="bg-gray-50 rounded-md p-3 transition-all duration-300 shadow-sm">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium text-gray-700">النقاط الحالية:</h3>
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-gray-500 hover:text-gray-700 focus:outline-none"
          aria-label={isCollapsed ? "توسيع" : "طي"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${isCollapsed ? 'rotate-180' : ''}`}>
            <path d="m18 15-6-6-6 6"/>
          </svg>
        </button>
      </div>
      
      <div className={`space-y-1 overflow-hidden transition-all duration-300 ${isCollapsed ? 'max-h-0 opacity-0' : 'max-h-96 opacity-100'}`}>
        {players.map((player, index) => (
          <div key={index} className="flex justify-between items-center py-1 border-b border-gray-200 last:border-0">
            <span className="font-medium text-sm">{player.name}</span>
            <span className={`font-bold text-sm ${player.score > 0 ? 'text-green-600' : player.score < 0 ? 'text-red-600' : 'text-gray-600'}`}>
              {formatScore(player.score)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
