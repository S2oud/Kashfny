'use client';

import { useState, useEffect } from 'react';

// Define types for our game data
export type Player = {
  name: string;
  score: number;
};

export type Round = {
  id: number;
  scores: {
    playerId: number;
    points: number;
  }[];
};

export type GameData = {
  initialAmount: number;
  players: Player[];
  rounds: Round[];
  startDate: string;
};

// Custom hook for game state management
export function useGameState() {
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load game data from localStorage
  useEffect(() => {
    const storedData = localStorage.getItem('gameData');
    if (storedData) {
      try {
        setGameData(JSON.parse(storedData));
      } catch (e) {
        console.error('Error parsing game data:', e);
        setGameData(null);
      }
    }
    setIsLoading(false);
  }, []);

  // Save game data to localStorage
  const saveGameData = (data: GameData) => {
    localStorage.setItem('gameData', JSON.stringify(data));
    setGameData(data);
  };

  // Initialize new game
  const initializeGame = (initialAmount: number, playerNames: string[]) => {
    // Clear any existing game data first
    localStorage.removeItem('gameData');
    
    const newGameData: GameData = {
      initialAmount,
      players: playerNames.map(name => ({ name, score: initialAmount })),
      rounds: [],
      startDate: new Date().toISOString()
    };
    
    // Force a clean save to localStorage
    localStorage.setItem('gameData', JSON.stringify(newGameData));
    setGameData(newGameData);
    
    return newGameData;
  };

  // Add a new round with scores
  const addRound = (playerScores: {playerId: number; points: number}[]) => {
    if (!gameData) return null;
    
    const newRound: Round = {
      id: gameData.rounds.length + 1,
      scores: playerScores
    };

    const updatedPlayers = gameData.players.map((player, index) => {
      const roundScore = playerScores.find(s => s.playerId === index)?.points || 0;
      return {
        ...player,
        score: player.score + roundScore
      };
    });

    const updatedGameData = {
      ...gameData,
      players: updatedPlayers,
      rounds: [...gameData.rounds, newRound]
    };

    saveGameData(updatedGameData);
    return updatedGameData;
  };

  // Reset game (keep players but reset scores and rounds)
  const resetGame = () => {
    if (!gameData) return null;
    
    const resetGameData = {
      ...gameData,
      players: gameData.players.map(player => ({
        ...player,
        score: gameData.initialAmount
      })),
      rounds: []
    };
    
    saveGameData(resetGameData);
    return resetGameData;
  };

  // End game (clear localStorage)
  const endGame = () => {
    localStorage.removeItem('gameData');
    setGameData(null);
  };

  return {
    gameData,
    isLoading,
    initializeGame,
    addRound,
    resetGame,
    endGame
  };
}
