// components/RoundHistory.tsx
'use client';

import React from 'react';
import { GameData } from '@/hooks/useGameState';

interface RoundHistoryProps {
  gameData: GameData;
}

export default function RoundHistory({ gameData }: RoundHistoryProps) {
  if (gameData.rounds.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        لا توجد جولات مسجلة بعد
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-md p-4">
      <h3 className="text-md font-medium text-gray-700 mb-3">سجل الجولات:</h3>
      <div className="space-y-4">
        {gameData.rounds.slice().reverse().map((round) => (
          <div key={round.id} className="border border-gray-200 rounded-md p-3">
            <h4 className="font-medium text-gray-700 mb-2">الجولة {round.id}</h4>
            <div className="space-y-1">
              {round.scores.map((score) => {
                if (score.points === 0) return null;
                const player = gameData.players[score.playerId];
                return (
                  <div key={score.playerId} className="flex justify-between items-center">
                    <span>{player.name}</span>
                    <span className={`font-medium ${score.points > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {score.points > 0 ? `+${score.points}` : score.points}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
