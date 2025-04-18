// components/PlayerScoreInput.tsx
'use client';

import React, { useEffect, useState } from 'react';

interface PlayerScoreInputProps {
  playerName: string;
  value: string;
  onChange: (value: string) => void;
  index: number;
}

// Function to format score with K suffix for thousands
const formatDisplayValue = (value: string): string => {
  const numValue = Number(value) || 0;
  if (Math.abs(numValue) >= 1000) {
    return `${(numValue / 1000).toFixed(0)}K`;
  }
  return numValue.toString();
};

export default function PlayerScoreInput({ 
  playerName, 
  value, 
  onChange,
  index
}: PlayerScoreInputProps) {
  const [incrementAmount, setIncrementAmount] = useState('5000');
  const [displayValue, setDisplayValue] = useState(formatDisplayValue(value));
  
  useEffect(() => {
    // Get increment amount from localStorage
    const storedIncrement = localStorage.getItem('incrementAmount');
    if (storedIncrement) {
      setIncrementAmount(storedIncrement);
    }
  }, []);

  useEffect(() => {
    setDisplayValue(formatDisplayValue(value));
  }, [value]);

  const handleIncrement = () => {
    const currentValue = Number(value) || 0;
    const increment = Number(incrementAmount) || 5000;
    onChange(String(currentValue + increment));
  };

  const handleDecrement = () => {
    const currentValue = Number(value) || 0;
    const increment = Number(incrementAmount) || 5000;
    onChange(String(currentValue - increment));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove K suffix if present
    let newValue = e.target.value;
    if (newValue.endsWith('K') || newValue.endsWith('k')) {
      newValue = String(Number(newValue.slice(0, -1)) * 1000);
    }
    onChange(newValue);
  };

  // Determine background color based on value
  const getBgColor = () => {
    const numValue = Number(value) || 0;
    if (numValue > 0) return 'bg-green-50';
    if (numValue < 0) return 'bg-red-50';
    return 'bg-white';
  };

  return (
    <div className="flex items-center space-x-2 space-x-reverse">
      <label htmlFor={`player-${index}`} className="w-1/3 text-sm font-medium text-gray-700">
        {playerName}:
      </label>
      <div className="w-2/3 flex items-center space-x-1 space-x-reverse">
        <button 
          onClick={handleDecrement}
          className="px-2 py-1 border border-gray-300 rounded-md shadow-sm text-sm font-medium bg-red-50 hover:bg-red-100 text-red-600"
          type="button"
        >
          -
        </button>
        <input
          type="text"
          id={`player-${index}`}
          value={displayValue}
          onChange={handleInputChange}
          className={`w-20 px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-center text-sm ${getBgColor()}`}
          placeholder="0"
        />
        <button 
          onClick={handleIncrement}
          className="px-2 py-1 border border-gray-300 rounded-md shadow-sm text-sm font-medium bg-green-50 hover:bg-green-100 text-green-600"
          type="button"
        >
          +
        </button>
      </div>
    </div>
  );
}
