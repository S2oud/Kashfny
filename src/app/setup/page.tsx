'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Card from '@/components/Card';
import Button from '@/components/Button';
import { useGameState } from '@/hooks/useGameState';

export default function Setup() {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const { initializeGame } = useGameState();
  const [initialAmount, setInitialAmount] = useState('50000');
  const [incrementAmount, setIncrementAmount] = useState('5000');
  const [playerName, setPlayerName] = useState('');
  const [players, setPlayers] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [showIncrementSettings, setShowIncrementSettings] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleAddPlayer = () => {
    if (!playerName.trim()) {
      setError('الرجاء إدخال اسم اللاعب');
      return;
    }
    
    setPlayers([...players, playerName.trim()]);
    setPlayerName('');
    setError('');
  };

  const handleRemovePlayer = (index: number) => {
    const newPlayers = [...players];
    newPlayers.splice(index, 1);
    setPlayers(newPlayers);
  };

  const handleStartGame = () => {
    if (!initialAmount || isNaN(Number(initialAmount)) || Number(initialAmount) <= 0) {
      setError('الرجاء إدخال مبلغ صحيح');
      return;
    }

    if (players.length < 2) {
      setError('يجب إضافة لاعبين على الأقل');
      return;
    }

    // Store increment amount in localStorage
    localStorage.setItem('incrementAmount', incrementAmount);
    
    // Initialize game data using the hook
    initializeGame(Number(initialAmount), players);
    
    // Navigate to game screen
    router.push('/game');
  };

  const handleIncrement = () => {
    const currentAmount = Number(initialAmount) || 0;
    const increment = Number(incrementAmount) || 5000;
    setInitialAmount(String(currentAmount + increment));
  };

  const handleDecrement = () => {
    const currentAmount = Number(initialAmount) || 0;
    const increment = Number(incrementAmount) || 5000;
    const newAmount = Math.max(0, currentAmount - increment);
    setInitialAmount(String(newAmount));
  };

  if (!isClient) {
    return null; // Prevent hydration errors
  }

  return (
    <main className="flex min-h-screen flex-col p-4 md:p-8">
      <Card>
        <Header 
          title="إعداد اللعبة"
          showBackButton
          backUrl="/"
        />
        
        <div className="space-y-4">
          <div>
            <label htmlFor="initialAmount" className="block text-sm font-medium text-gray-700 mb-1">
              المبلغ الابتدائي لكل لاعب
            </label>
            <div className="flex items-center space-x-2 space-x-reverse">
              <button 
                onClick={handleDecrement}
                className="px-3 py-2 border border-gray-300 rounded-md shadow-sm text-lg font-medium bg-gray-100 hover:bg-gray-200"
              >
                -
              </button>
              <input
                type="number"
                id="initialAmount"
                value={initialAmount}
                onChange={(e) => setInitialAmount(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-center"
                min="0"
              />
              <button 
                onClick={handleIncrement}
                className="px-3 py-2 border border-gray-300 rounded-md shadow-sm text-lg font-medium bg-gray-100 hover:bg-gray-200"
              >
                +
              </button>
            </div>
          </div>
          
          <div>
            <button 
              onClick={() => setShowIncrementSettings(!showIncrementSettings)}
              className="text-sm text-primary hover:underline flex items-center"
            >
              {showIncrementSettings ? 'إخفاء إعدادات الزيادة/النقص' : 'إعدادات الزيادة/النقص'}
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`mr-1 transition-transform ${showIncrementSettings ? 'rotate-180' : ''}`}>
                <path d="m6 9 6 6 6-6"/>
              </svg>
            </button>
            
            {showIncrementSettings && (
              <div className="mt-2 p-3 bg-gray-50 rounded-md">
                <label htmlFor="incrementAmount" className="block text-sm font-medium text-gray-700 mb-1">
                  قيمة الزيادة/النقص
                </label>
                <input
                  type="number"
                  id="incrementAmount"
                  value={incrementAmount}
                  onChange={(e) => setIncrementAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  min="1"
                />
              </div>
            )}
          </div>
          
          <div>
            <label htmlFor="playerName" className="block text-sm font-medium text-gray-700 mb-1">
              إضافة لاعب
            </label>
            <div className="flex space-x-2 space-x-reverse">
              <input
                type="text"
                id="playerName"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                placeholder="اسم اللاعب"
              />
              <Button
                onClick={handleAddPlayer}
                variant="primary"
              >
                إضافة
              </Button>
            </div>
          </div>
          
          {error && (
            <div className="text-red-500 text-sm">
              {error}
            </div>
          )}
          
          {players.length > 0 && (
            <div>
              <h3 className="text-md font-medium text-gray-700 mb-2">اللاعبون:</h3>
              <ul className="bg-gray-50 rounded-md p-2">
                {players.map((player, index) => (
                  <li key={index} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-0">
                    <span>{player}</span>
                    <button
                      onClick={() => handleRemovePlayer(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      حذف
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="pt-4 flex space-x-3 space-x-reverse">
            <Button
              href="/"
              variant="secondary"
              className="flex-1"
            >
              رجوع
            </Button>
            <Button
              onClick={handleStartGame}
              variant="primary"
              className="flex-1"
              disabled={players.length < 2 || !initialAmount}
            >
              بدء اللعبة
            </Button>
          </div>
        </div>
      </Card>
    </main>
  );
}
