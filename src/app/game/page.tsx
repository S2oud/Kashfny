'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Card from '@/components/Card';
import Button from '@/components/Button';
import ScoreDisplay from '@/components/ScoreDisplay';
import PlayerScoreInput from '@/components/PlayerScoreInput';
import RoundHistory from '@/components/RoundHistory';
import { useGameState } from '@/hooks/useGameState';

export default function Game() {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const { gameData, isLoading, addRound, resetGame, endGame } = useGameState();
  const [roundScores, setRoundScores] = useState<{[key: number]: string}>({});
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('scores'); // 'scores' or 'history'

  useEffect(() => {
    setIsClient(true);
    if (!isLoading && !gameData) {
      router.push('/');
    }
  }, [isLoading, gameData, router]);

  const handleScoreChange = (index: number, value: string) => {
    setRoundScores({
      ...roundScores,
      [index]: value
    });
  };

  const handleAddRound = () => {
    if (!gameData) return;

    const newScores: {playerId: number; points: number}[] = [];
    let hasScores = false;

    gameData.players.forEach((player, index) => {
      const scoreValue = roundScores[index] ? parseInt(roundScores[index]) : 0;
      if (scoreValue !== 0) {
        hasScores = true;
      }
      newScores.push({
        playerId: index,
        points: scoreValue
      });
    });

    if (!hasScores) {
      setError('الرجاء إدخال نقاط لاعب واحد على الأقل');
      return;
    }

    addRound(newScores);
    setRoundScores({});
    setError('');
  };

  const handleResetGame = () => {
    if (confirm('هل أنت متأكد من إعادة ضبط اللعبة؟ سيتم حذف جميع النقاط.')) {
      resetGame();
      setRoundScores({});
    }
  };

  const handleEndGame = () => {
    if (confirm('هل أنت متأكد من إنهاء اللعبة؟ سيتم العودة إلى الصفحة الرئيسية.')) {
      endGame();
      router.push('/');
    }
  };

  if (!isClient || isLoading || !gameData) {
    return null;
  }

  return (
    <main className="flex min-h-screen flex-col p-4 md:p-8">
      <Card className="bg-gradient-to-br from-white to-gray-50 shadow-lg">
        <Header 
          title="كاشفني / داقشني"
          subtitle={`الجولة ${gameData.rounds.length + 1}`}
        />
        
        <div className="flex border-b border-gray-200 mb-4">
          <button
            className={`flex-1 py-2 px-4 text-center ${activeTab === 'scores' ? 'border-b-2 border-primary text-primary font-bold' : 'text-gray-500'}`}
            onClick={() => setActiveTab('scores')}
          >
            النقاط
          </button>
          <button
            className={`flex-1 py-2 px-4 text-center ${activeTab === 'history' ? 'border-b-2 border-primary text-primary font-bold' : 'text-gray-500'}`}
            onClick={() => setActiveTab('history')}
          >
            السجل
          </button>
        </div>
        
        {activeTab === 'scores' && (
          <div className="space-y-4">
            <ScoreDisplay players={gameData.players} />
            
            <div className="mt-6">
              <h3 className="text-md font-medium text-gray-700 mb-3">إضافة نقاط الجولة:</h3>
              <div className="space-y-3 bg-white p-3 rounded-md shadow-sm">
                {gameData.players.map((player, index) => (
                  <PlayerScoreInput
                    key={index}
                    playerName={player.name}
                    value={roundScores[index] || ''}
                    onChange={(value) => handleScoreChange(index, value)}
                    index={index}
                  />
                ))}
              </div>
              
              {error && (
                <div className="text-red-500 text-sm mt-2">
                  {error}
                </div>
              )}
              
              <Button
                onClick={handleAddRound}
                variant="primary"
                fullWidth
                className="mt-4"
              >
                إضافة النقاط
              </Button>
            </div>
          </div>
        )}
        
        {activeTab === 'history' && (
          <div className="space-y-4">
            <RoundHistory gameData={gameData} />
          </div>
        )}
        
        <div className="pt-6 flex space-x-3 space-x-reverse">
          <Button
            onClick={handleResetGame}
            variant="secondary"
            className="flex-1"
          >
            إعادة ضبط
          </Button>
          <Button
            onClick={handleEndGame}
            variant="danger"
            className="flex-1"
          >
            إنهاء اللعبة
          </Button>
        </div>
      </Card>
    </main>
  );
}
