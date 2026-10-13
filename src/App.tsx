import { useState, useCallback } from 'react';
import { Ship, GamePhase, Shot, Trajectory, BattleLogEntry, createCompartments, calculateShipStats } from './types';
import { ShipDatabaseEntry } from './types/shipDatabase';
import {
  generatePlayerShips,
  generateEnemyShips,
  executeShots,
  allShipsSunk,
  getReachableHexes,
  hexDistance,
  getHeading,
} from './gameLogic';
import { resetAI, generateAIShots, generateAIMoves, updateAIAfterShots } from './ai';
import { processDamagePropagation } from './damagePropagation';
import HexGrid from './HexGrid';
import BattleLog from './components/BattleLog';
import BattleShipDetailCard from './components/BattleShipDetailCard';
import ShipDatabaseManager from './components/ShipDatabaseManager';
import ShipSelectionScreen from './components/ShipSelectionScreen';

function shipIcon(type: string): string {
  switch (type) {
    case 'battleship': return '🚢';
    case 'cruiser': return '⛴️';
    case 'destroyer': return '🚤';
    default: return '⚓';
  }
}

type AppScreen = 'menu' | 'database' | 'selection' | 'battle';

function App() {
  const [screen, setScreen] = useState<AppScreen>('menu');
  const [phase, setPhase] = useState<GamePhase>('placement');
  const [playerShips, setPlayerShips] = useState<Ship[]>([]);
  const [enemyShips, setEnemyShips] = useState<Ship[]>([]);
  const [message, setMessage] = useState('Нажмите "Начать бой" для размещения кораблей');
  const [playerShotTargets, setPlayerShotTargets] = useState<{ shipId: number; targetQ: number; targetR: number }[]>([]);
  const [playerShots, setPlayerShots] = useState<Shot[]>([]);
  const [enemyShots, setEnemyShots] = useState<Shot[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<{ q: number; r: number } | null>(null);
  const [currentShipIndex, setCurrentShipIndex] = useState(0);
  const [turnNumber, setTurnNumber] = useState(1);
  const [selectedShipForMove, setSelectedShipForMove] = useState<Ship | null>(null);
  const [reachableHexes, setReachableHexes] = useState<{ q: number; r: number }[]>([]);
  const [playerTrajectories, setPlayerTrajectories] = useState<Trajectory[]>([]);
  const [enemyTrajectories, setEnemyTrajectories] = useState<Trajectory[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [selectedShipForDetail, setSelectedShipForDetail] = useState<Ship | null>(null);
  const [selectedPlayerShipsFromDB, setSelectedPlayerShipsFromDB] = useState<ShipDatabaseEntry[]>([]);
  const [selectedEnemyShipsFromDB, setSelectedEnemyShipsFromDB] = useState<ShipDatabaseEntry[]>([]);
  const [battleLog, setBattleLog] = useState<BattleLogEntry[]>([]);
  const [showBattleLog, setShowBattleLog] = useState(true); // Лог боя видим по умолчанию
  const [hitMarkers, setHitMarkers] = useState<Array<{shipId: number; compartmentId: string; turn: number; damage: number}>>([]);

  const startBattle = useCallback(() => {
    const pShips = generatePlayerShips();
    const eShips = generateEnemyShips();
    
    setPlayerShips(pShips);
    setEnemyShips(eShips);
    setPhase('movement');
    setCurrentShipIndex(0);
    setMessage(`Ход ${turnNumber}: Фаза движения. Выберите корабль для перемещения.`);
    resetAI();
  }, [turnNumber]);

  const startBattleFromDB = useCallback((playerDBShips: ShipDatabaseEntry[], enemyDBShips: ShipDatabaseEntry[]) => {
    setSelectedPlayerShipsFromDB(playerDBShips);
    setSelectedEnemyShipsFromDB(enemyDBShips);
    
    // Создаём корабли с учётом реальной длины из базы данных
    const pShips = playerDBShips.map((dbShip, index) => {
      const shipLength = dbShip.length || (dbShip.class === 'battleship' ? 250 : dbShip.class === 'cruiser' ? 200 : 115);
      
      // Используем compartmentData из БД если есть
      let compartments;
      if (dbShip.compartmentData?.compartments && dbShip.compartmentData.compartments.length > 0) {
        console.log(`🚢 ${dbShip.name}: Загружаю ${dbShip.compartmentData.compartments.length} отсеков из БД`);
        compartments = dbShip.compartmentData.compartments.map(c => ({
          id: c.id,
          position: c.position as any,
          deck: c.deck as any,
          side: c.side as any,
          type: c.type as any,
          name: c.name,
          maxHP: c.maxHP,
          currentHP: c.currentHP,
          status: c.status as any,
          watertight: c.watertight,
          armor: c.armor,
          flooded: 0,
          fire: 0,
          components: [],
          adjacentIds: [],
          lengthMeters: 10,
          positionFromBow: c.gridX * 5
        }));
      } else {
        console.log(`🚢 ${dbShip.name}: Нет данных в БД, создаю ${shipLength}м корабль автоматически`);
        compartments = createCompartments(dbShip.class as any, shipLength);
      }
      
      const stats = calculateShipStats(compartments);
      const totalHP = compartments.reduce((sum: number, c: any) => sum + c.maxHP, 0);
      
      // Увеличиваем точность и урон в зависимости от класса
      let accuracy = 85;
      let damage = 50;
      if (dbShip.class === 'battleship') {
        accuracy = 90;
        damage = 60;
      } else if (dbShip.class === 'cruiser') {
        accuracy = 85;
        damage = 45;
      } else {
        accuracy = 80;
        damage = 35;
      }
      
      return {
        id: index + 1,
        type: dbShip.class as any,
        name: dbShip.name,
        maxHP: totalHP,
        currentHP: totalHP,
        q: Math.floor(Math.random() * 8),
        r: Math.floor(Math.random() * 25),
        heading: 0 as any,
        accuracy,
        damage,
        speed: Math.round(dbShip.speed / 10),
        range: dbShip.range,
        hasMoved: false,
        hasFired: false,
        compartments,
        stats,
        battleLog: [],
        isSunk: false,
        length: dbShip.length,
        beam: dbShip.beam,
        draft: dbShip.draft,
        displacementStandard: dbShip.displacementStandard,
        displacementFull: dbShip.displacementFull,
      };
    });
    
    const eShips = enemyDBShips.map((dbShip, index) => {
      const shipLength = dbShip.length || (dbShip.class === 'battleship' ? 250 : dbShip.class === 'cruiser' ? 200 : 115);
      
      // Используем compartmentData из БД если есть
      let compartments;
      if (dbShip.compartmentData?.compartments && dbShip.compartmentData.compartments.length > 0) {
        compartments = dbShip.compartmentData.compartments.map(c => ({
          id: c.id,
          position: c.position as any,
          deck: c.deck as any,
          side: c.side as any,
          type: c.type as any,
          name: c.name,
          maxHP: c.maxHP,
          currentHP: c.currentHP,
          status: c.status as any,
          watertight: c.watertight,
          armor: c.armor,
          flooded: 0,
          fire: 0,
          components: [],
          adjacentIds: [],
          lengthMeters: 10,
          positionFromBow: c.gridX * 5
        }));
      } else {
        compartments = createCompartments(dbShip.class as any, shipLength);
      }
      
      const stats = calculateShipStats(compartments);
      const totalHP = compartments.reduce((sum: number, c: any) => sum + c.maxHP, 0);
      
      // Увеличиваем точность и урон в зависимости от класса
      let accuracy = 70;
      let damage = 30;
      if (dbShip.class === 'battleship') {
        accuracy = 80;
        damage = 45;
      } else if (dbShip.class === 'cruiser') {
        accuracy = 75;
        damage = 35;
      } else {
        accuracy = 70;
        damage = 25;
      }
      
      return {
        id: index + 100,
        type: dbShip.class as any,
        name: dbShip.name,
        maxHP: totalHP,
        currentHP: totalHP,
        q: 25 - Math.floor(Math.random() * 8),
        r: Math.floor(Math.random() * 25),
        heading: 3 as any,
        accuracy,
        damage,
        speed: Math.round(dbShip.speed / 10),
        range: dbShip.range,
        hasMoved: false,
        hasFired: false,
        compartments,
        stats,
        battleLog: [],
        isSunk: false,
        length: dbShip.length,
        beam: dbShip.beam,
        draft: dbShip.draft,
        displacementStandard: dbShip.displacementStandard,
        displacementFull: dbShip.displacementFull,
      };
    });
    
    setPlayerShips(pShips);
    setEnemyShips(eShips);
    setScreen('battle');
    setPhase('movement');
    setCurrentShipIndex(0);
    setMessage(`Ход 1: Фаза движения. Выберите корабль для перемещения.`);
    resetAI();
  }, []);

  const handleShipSelectForMove = useCallback((ship: Ship) => {
    if (phase !== 'movement') return;
    if (ship.hasMoved || ship.currentHP <= 0) return;
    
    setSelectedShipForMove(ship);
    setSelectedShipForDetail(ship);
    const reachable = getReachableHexes(ship, [...playerShips, ...enemyShips].filter(s => s.currentHP > 0));
    setReachableHexes(reachable);
    setMessage(`${shipIcon(ship.type)} ${ship.name} выбран. Выберите клетку для перемещения (макс. ${ship.speed} гексов).`);
  }, [phase, playerShips, enemyShips]);

  const handleShipClickForDetail = useCallback((ship: Ship) => {
    setSelectedShipForDetail(ship);
  }, []);

  const handleMoveClick = useCallback((q: number, r: number) => {
    if (phase !== 'movement' || !selectedShipForMove) return;
    
    const isReachable = reachableHexes.some(h => h.q === q && h.r === r);
    if (!isReachable) return;
    
    const isOccupied = [...playerShips, ...enemyShips].some(
      s => s.q === q && s.r === r && s.currentHP > 0 && s.id !== selectedShipForMove.id
    );
    
    if (isOccupied) {
      setMessage('⚠️ Клетка занята другим кораблём!');
      return;
    }
    
    const newHeading = getHeading(selectedShipForMove.q, selectedShipForMove.r, q, r);
    
    const newTrajectory: Trajectory = {
      shipId: selectedShipForMove.id,
      path: [
        { q: selectedShipForMove.q, r: selectedShipForMove.r },
        { q, r }
      ]
    };
    setPlayerTrajectories(prev => [...prev, newTrajectory]);
    
    const updatedShips = playerShips.map(s => 
      s.id === selectedShipForMove.id 
        ? { ...s, q, r, heading: newHeading, hasMoved: true }
        : s
    );
    
    setPlayerShips(updatedShips);
    setSelectedShipForMove(null);
    setReachableHexes([]);
    
    const allMoved = updatedShips.filter(s => s.currentHP > 0).every(s => s.hasMoved);
    
    if (allMoved) {
      setMessage('Все корабли переместились! Переход к фазе планирования атаки...');
      setTimeout(() => {
        setPhase('planning');
        setCurrentShipIndex(0);
        const firstAlive = updatedShips.findIndex(s => s.currentHP > 0);
        if (firstAlive !== -1) {
          setCurrentShipIndex(firstAlive);
          setMessage(`Ход ${turnNumber}: Выберите цель для ${shipIcon(updatedShips[firstAlive].type)} ${updatedShips[firstAlive].name}`);
        }
      }, 1000);
    } else {
      const nextAlive = updatedShips.findIndex(s => s.currentHP > 0 && !s.hasMoved);
      if (nextAlive !== -1) {
        setMessage(`Выберите следующий корабль для перемещения.`);
      } else {
        setMessage('Все корабли переместились! Переход к фазе планирования атаки...');
        setTimeout(() => {
          setPhase('planning');
          const firstAlive = updatedShips.findIndex(s => s.currentHP > 0);
          if (firstAlive !== -1) {
            setCurrentShipIndex(firstAlive);
            setMessage(`Ход ${turnNumber}: Выберите цель для ${shipIcon(updatedShips[firstAlive].type)} ${updatedShips[firstAlive].name}`);
          }
        }, 1000);
      }
    }
  }, [phase, selectedShipForMove, reachableHexes, playerShips, turnNumber]);

  const handleCellClick = useCallback((q: number, r: number) => {
    if (phase === 'movement') {
      handleMoveClick(q, r);
      return;
    }
    
    if (phase !== 'planning') return;

    const currentShip = playerShips[currentShipIndex];
    if (!currentShip || currentShip.currentHP <= 0) return;

    const isOwnShip = playerShips.some(s => s.q === q && s.r === r && s.currentHP > 0);
    if (isOwnShip) {
      setMessage(`⚠️ Нельзя стрелять по своим кораблям!`);
      return;
    }

    const distance = hexDistance(currentShip.q, currentShip.r, q, r);
    if (distance > currentShip.range) {
      setMessage(`⚠️ Цель вне дальности! Максимальная дальность: ${currentShip.range} гексов`);
      return;
    }

    setSelectedTarget({ q, r });
    setMessage(`${shipIcon(currentShip.type)} ${currentShip.name} → цель: (${q},${r}). Подтвердить?`);
  }, [phase, playerShips, currentShipIndex, handleMoveClick]);

  const confirmShot = useCallback(() => {
    if (!selectedTarget) return;

    const currentShip = playerShips[currentShipIndex];
    if (!currentShip) return;

    const newTarget = {
      shipId: currentShip.id,
      targetQ: selectedTarget.q,
      targetR: selectedTarget.r,
    };
    setPlayerShotTargets([...playerShotTargets, newTarget]);

    const nextAlive = playerShips.findIndex((s, i) => i > currentShipIndex && s.currentHP > 0);
    if (nextAlive !== -1) {
      setCurrentShipIndex(nextAlive);
      setSelectedTarget(null);
      setMessage(`Выберите цель для ${shipIcon(playerShips[nextAlive].type)} ${playerShips[nextAlive].name}`);
    } else {
      setMessage('Все корабли выбрали цели! Выполнение выстрелов...');
      setTimeout(() => executePhase(), 1000);
    }
  }, [selectedTarget, playerShips, currentShipIndex, playerShotTargets]);

  const skipShot = useCallback(() => {
    const currentShip = playerShips[currentShipIndex];
    if (!currentShip) return;

    setMessage(`${shipIcon(currentShip.type)} ${currentShip.name} пропустил выстрел`);

    const nextAlive = playerShips.findIndex((s, i) => i > currentShipIndex && s.currentHP > 0);
    if (nextAlive !== -1) {
      setCurrentShipIndex(nextAlive);
      setSelectedTarget(null);
      setTimeout(() => {
        setMessage(`Выберите цель для ${shipIcon(playerShips[nextAlive].type)} ${playerShips[nextAlive].name}`);
      }, 500);
    } else {
      setMessage('Все корабли обработаны! Выполнение выстрелов...');
      setTimeout(() => executePhase(), 1000);
    }
  }, [playerShips, currentShipIndex]);

  const executePhase = useCallback(() => {
    setPhase('execution');
    setIsAnimating(true);
    setMessage('Выстрелы выполняются...');

    setTimeout(() => {
      // Выполняем выстрелы игрока
      const playerResult = executeShots(playerShotTargets, playerShips, enemyShips);
      let updatedEnemyShips = playerResult.updatedShips;
      setPlayerShots(playerResult.shots);
      
      // Сохраняем информацию о попаданиях игрока по вражеским кораблям
      const playerHitMarkers: Array<{shipId: number; compartmentId: string; turn: number; damage: number}> = [];
      playerResult.shots.filter(s => s.hit && s.targetShipId).forEach(shot => {
        const targetShip = updatedEnemyShips.find(s => s.id === shot.targetShipId);
        if (targetShip) {
          // Находим повреждённый отсек (последний повреждённый)
          const damagedCompartment = targetShip.compartments.find(c => c.status !== 'intact' && c.currentHP < c.maxHP);
          if (damagedCompartment) {
            playerHitMarkers.push({
              shipId: shot.targetShipId!,
              compartmentId: damagedCompartment.id,
              turn: turnNumber,
              damage: shot.damage
            });
          }
        }
      });
      
      // Добавляем попадания и промахи в журнал
      const playerShotLogs: BattleLogEntry[] = playerResult.shots.map(s => ({
        id: `log_${Date.now()}_${Math.random()}`,
        turn: turnNumber,
        timestamp: Date.now(),
        type: s.hit ? 'shot_hit' as const : 'shot_miss' as const,
        shipId: s.shipId,
        shipName: s.shipName,
        message: s.hit 
          ? `🎯 ${s.shipName} попал в ${s.targetShipName} (${s.damage} урона)`
          : `💨 ${s.shipName} промахнулся по (${s.targetQ},${s.targetR})`,
        severity: s.hit ? 'info' as const : 'warning' as const
      }));

      // Выстрелы противника
      const enemyShotTargets = generateAIShots(enemyShips, playerShips);
      const enemyResult = executeShots(enemyShotTargets, enemyShips, playerShips);
      let updatedPlayerShips = enemyResult.updatedShips;
      setEnemyShots(enemyResult.shots);
      
      // Сохраняем информацию о попаданиях врага по нашим кораблям
      const enemyHitMarkers: Array<{shipId: number; compartmentId: string; turn: number; damage: number}> = [];
      enemyResult.shots.filter(s => s.hit && s.targetShipId).forEach(shot => {
        const targetShip = updatedPlayerShips.find(s => s.id === shot.targetShipId);
        if (targetShip) {
          // Находим повреждённый отсек (последний повреждённый)
          const damagedCompartment = targetShip.compartments.find(c => c.status !== 'intact' && c.currentHP < c.maxHP);
          if (damagedCompartment) {
            enemyHitMarkers.push({
              shipId: shot.targetShipId!,
              compartmentId: damagedCompartment.id,
              turn: turnNumber,
              damage: shot.damage
            });
          }
        }
      });
      
      // Обновляем маркеры попаданий
      setHitMarkers(prev => [...prev, ...playerHitMarkers, ...enemyHitMarkers]);
      
      updateAIAfterShots(enemyResult.shots, enemyResult.updatedShips);

      // Обработка распространения повреждений
      const propagationResult = processDamagePropagation(
        [...updatedPlayerShips, ...updatedEnemyShips],
        turnNumber
      );
      
      // Разделяем обратно на игроков и врагов
      updatedPlayerShips = propagationResult.ships.filter(s => s.id < 100);
      updatedEnemyShips = propagationResult.ships.filter(s => s.id >= 100);
      
      setPlayerShips(updatedPlayerShips);
      setEnemyShips(updatedEnemyShips);
      
      // Добавляем попадания и промахи врага в журнал
      const enemyShotLogs: BattleLogEntry[] = enemyResult.shots.map(s => ({
        id: `log_${Date.now()}_${Math.random()}`,
        turn: turnNumber,
        timestamp: Date.now(),
        type: s.hit ? 'shot_hit' as const : 'shot_miss' as const,
        shipId: s.shipId,
        shipName: s.shipName,
        message: s.hit 
          ? `🎯 Вражеский ${s.shipName} попал в ${s.targetShipName} (${s.damage} урона)`
          : `💨 Вражеский ${s.shipName} промахнулся`,
        severity: s.hit ? 'critical' as const : 'warning' as const
      }));
      
      // Обновляем журнал боя
      setBattleLog(prev => [
        ...prev,
        ...playerShotLogs,
        ...enemyShotLogs,
        ...propagationResult.allLogs
      ]);

      setIsAnimating(false);
      setPhase('results');
      
      const playerHits = playerResult.shots.filter(s => s.hit).length;
      const enemyHits = enemyResult.shots.filter(s => s.hit).length;
      
      // Подсчёт потопленных кораблей
      const sunkPlayer = updatedPlayerShips.filter(s => s.isSunk).length;
      const sunkEnemy = updatedEnemyShips.filter(s => s.isSunk).length;
      
      let resultMsg = `Результаты хода ${turnNumber}:\n`;
      resultMsg += `Ваши попадания: ${playerHits}/${playerShotTargets.length}\n`;
      resultMsg += `Попадания врага: ${enemyHits}/${enemyShotTargets.length}\n`;
      
      // Добавляем информацию о пожарах и затоплениях
      const playerFires = updatedPlayerShips.reduce((sum, s) => sum + s.stats.fires, 0);
      const enemyFires = updatedEnemyShips.reduce((sum, s) => sum + s.stats.fires, 0);
      if (playerFires > 0 || enemyFires > 0) {
        resultMsg += `\n🔥 Пожары: ваши ${playerFires}, враг ${enemyFires}\n`;
      }
      
      if (allShipsSunk(updatedPlayerShips) || sunkPlayer === playerShips.length) {
        resultMsg += '\n💀 Поражение! Все ваши корабли потоплены!';
        setPhase('gameOver');
      } else if (allShipsSunk(updatedEnemyShips) || sunkEnemy === enemyShips.length) {
        resultMsg += '\n🏆 Победа! Все корабли противника потоплены!';
        setPhase('gameOver');
      } else {
        resultMsg += '\nНажмите "Следующий ход" для продолжения';
      }
      
      setMessage(resultMsg);
    }, 2000);
  }, [playerShotTargets, playerShips, enemyShips, turnNumber]);

  const nextTurn = useCallback(() => {
    setTurnNumber(t => t + 1);
    setPhase('movement');
    setCurrentShipIndex(0);
    setSelectedTarget(null);
    setPlayerShotTargets([]);
    setPlayerShots([]);
    setEnemyShots([]);
    setSelectedShipForMove(null);
    setReachableHexes([]);
    setHitMarkers([]); // Сбрасываем маркеры попаданий между ходами
    
    setPlayerShips(prev => prev.map(s => ({ ...s, hasMoved: false, hasFired: false })));
    setEnemyShips(prev => prev.map(s => ({ ...s, hasMoved: false, hasFired: false })));
    
    setTimeout(() => {
      setEnemyShips(prev => {
        const moves = generateAIMoves(prev, playerShips);
        let updated = [...prev];
        
        const newEnemyTrajectories: Trajectory[] = moves.map(move => {
          const ship = prev.find(s => s.id === move.shipId);
          const newHeading = ship ? getHeading(move.fromQ, move.fromR, move.toQ, move.toR) : 0;
          return {
            shipId: move.shipId,
            path: [
              { q: move.fromQ, r: move.fromR },
              { q: move.toQ, r: move.toR }
            ]
          };
        });
        setEnemyTrajectories(prevTrajectories => [...prevTrajectories, ...newEnemyTrajectories]);
        
        for (const move of moves) {
          const newHeading = getHeading(move.fromQ, move.fromR, move.toQ, move.toR);
          updated = updated.map(s => 
            s.id === move.shipId ? { ...s, q: move.toQ, r: move.toR, heading: newHeading, hasMoved: true } : s
          );
        }
        return updated;
      });
      
      setMessage(`Ход ${turnNumber + 1}: Фаза движения. Выберите корабль для перемещения.`);
    }, 500);
  }, [playerShips, turnNumber]);

  const resetGame = () => {
    setScreen('menu');
    setPhase('placement');
    setPlayerShips([]);
    setEnemyShips([]);
    setMessage('Нажмите "Начать бой" для размещения кораблей');
    setPlayerShotTargets([]);
    setPlayerShots([]);
    setEnemyShots([]);
    setSelectedTarget(null);
    setCurrentShipIndex(0);
    setTurnNumber(1);
    setSelectedShipForMove(null);
    setReachableHexes([]);
    setPlayerTrajectories([]);
    setEnemyTrajectories([]);
    setIsAnimating(false);
    setSelectedShipForDetail(null);
    setSelectedPlayerShipsFromDB([]);
    setSelectedEnemyShipsFromDB([]);
    setBattleLog([]);
    setShowBattleLog(false);
    resetAI();
  };

  // Экран меню
  if (screen === 'menu') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 text-white p-4 flex items-center justify-center">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-4">
              ⚓ Морской Бой
            </h1>
            <p className="text-xl text-blue-200">Тактическая игра WeGO</p>
          </div>
          
          <div className="space-y-4">
            <button
              onClick={() => setScreen('database')}
              className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg font-bold text-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg"
            >
              📚 База данных кораблей
            </button>
            
            <button
              onClick={() => setScreen('selection')}
              className="w-full px-6 py-4 bg-gradient-to-r from-red-600 to-orange-600 rounded-lg font-bold text-lg hover:from-red-700 hover:to-orange-700 transition-all shadow-lg"
            >
              ⚔️ Начать бой
            </button>
          </div>
          
          <div className="mt-8 text-center text-sm text-slate-400">
            <p>Версия с базой данных кораблей</p>
            <p className="mt-2">Создавайте и управляйте коллекцией кораблей, выбирайте флоты для сражений</p>
          </div>
        </div>
      </div>
    );
  }

  // Экран базы данных
  if (screen === 'database') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 text-white p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-cyan-300">📚 Управление базой данных</h1>
            <button
              onClick={() => setScreen('menu')}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg"
            >
              ← Назад в меню
            </button>
          </div>
          <ShipDatabaseManager />
        </div>
      </div>
    );
  }

  // Экран выбора кораблей
  if (screen === 'selection') {
    return (
      <div>
        <div className="bg-slate-900 p-2 flex justify-between items-center">
          <button
            onClick={() => setScreen('menu')}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white"
          >
            ← Назад в меню
          </button>
        </div>
        <ShipSelectionScreen onStartBattle={startBattleFromDB} />
      </div>
    );
  }

  // Экран боя
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 text-white">
      <div className="w-full px-2">
        <div className="text-center mb-4">
          <div className="flex justify-between items-center mb-2">
            <button
              onClick={resetGame}
              className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm"
            >
              ← В меню
            </button>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              ⚓ Морской Бой — WeGO
            </h1>
            <div className="w-20"></div>
          </div>
          <p className="text-blue-200 mt-2 text-base whitespace-pre-line">{message}</p>
          <p className="text-slate-400 text-sm mt-1">
            Ход: {turnNumber} | Фаза: {
              phase === 'movement' ? 'Движение' : 
              phase === 'planning' ? 'Планирование' : 
              phase === 'execution' ? 'Выполнение' : 
              phase === 'results' ? 'Результаты' : phase
            }
          </p>
        </div>

        <div className="flex justify-center gap-3 mb-4 flex-wrap">
          {phase === 'planning' && selectedTarget && (
            <button
              onClick={confirmShot}
              className="px-5 py-2 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-lg font-semibold hover:from-yellow-600 hover:to-orange-700 transition-all shadow-lg animate-pulse"
            >
              🎯 Подтвердить выстрел
            </button>
          )}
          {phase === 'planning' && (
            <button
              onClick={skipShot}
              className="px-5 py-2 bg-gradient-to-r from-slate-500 to-slate-600 rounded-lg font-semibold hover:from-slate-600 hover:to-slate-700 transition-all shadow-lg"
            >
              ⏭️ Пропустить выстрел
            </button>
          )}
          {phase === 'results' && (
            <button
              onClick={nextTurn}
              className="px-5 py-2 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg font-semibold hover:from-purple-600 hover:to-pink-700 transition-all shadow-lg"
            >
              ➡️ Следующий ход
            </button>
          )}
          {(phase === 'results' || phase === 'gameOver') && battleLog.length > 0 && (
            <button
              onClick={() => setShowBattleLog(!showBattleLog)}
              className="px-5 py-2 bg-gradient-to-r from-slate-600 to-slate-700 rounded-lg font-semibold hover:from-slate-700 hover:to-slate-800 transition-all shadow-lg"
            >
              📜 {showBattleLog ? 'Скрыть' : 'Показать'} журнал ({battleLog.length})
            </button>
          )}
          {phase === 'gameOver' && (
            <button
              onClick={resetGame}
              className="px-5 py-2 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg font-semibold hover:from-purple-600 hover:to-pink-700 transition-all shadow-lg"
            >
              🔄 Новая игра
            </button>
          )}
        </div>

        {phase !== 'placement' && (
          <div className="flex justify-center gap-6 mb-4 flex-wrap">
            <div className="text-center">
              <div className="text-cyan-300 font-semibold mb-1">🛡️ Ваш флот</div>
              <div className="flex gap-2 text-xs flex-wrap justify-center max-w-md">
                {playerShips.map(ship => (
                  <button
                    key={ship.id}
                    onClick={() => phase === 'movement' && handleShipSelectForMove(ship)}
                    disabled={ship.currentHP <= 0 || ship.hasMoved || ship.isSunk}
                    className={`px-2 py-1 rounded transition-all relative ${
                      ship.isSunk
                        ? 'bg-gray-900/70 text-gray-400 line-through opacity-60'
                        : ship.currentHP <= 0
                        ? 'bg-red-900/50 text-red-300 line-through opacity-50'
                        : selectedShipForMove?.id === ship.id
                        ? 'bg-green-600/70 text-green-100 ring-2 ring-green-400'
                        : phase === 'movement' && !ship.hasMoved
                        ? 'bg-blue-700/50 text-blue-200 hover:bg-blue-600/50 cursor-pointer'
                        : 'bg-slate-700/50 text-slate-300'
                    }`}
                  >
                    {shipIcon(ship.type)} {ship.currentHP}/{ship.maxHP}
                    {ship.stats.fires > 0 && <span className="ml-1" title={`${ship.stats.fires} пожар(ов)`}>🔥</span>}
                    {ship.stats.flooding > 0.1 && <span className="ml-1" title={`Затопление ${Math.round(ship.stats.flooding * 100)}%`}>🌊</span>}
                    {ship.isSunk && <span className="ml-1" title="Потоплен">☠️</span>}
                  </button>
                ))}
              </div>
            </div>
            <div className="text-center">
              <div className="text-red-300 font-semibold mb-1">🎯 Вражеский флот</div>
              <div className="flex gap-2 text-xs flex-wrap justify-center max-w-md">
                {enemyShips.map(ship => (
                  <div
                    key={ship.id}
                    className={`px-2 py-1 rounded ${
                      ship.isSunk
                        ? 'bg-gray-900/70 text-gray-400 line-through opacity-60'
                        : ship.currentHP <= 0
                        ? 'bg-red-900/50 text-red-300 line-through opacity-50'
                        : ship.currentHP < ship.maxHP
                        ? 'bg-orange-600/50 text-orange-200'
                        : 'bg-slate-700/50 text-slate-300'
                    }`}
                  >
                    {shipIcon(ship.type)} {ship.currentHP}/{ship.maxHP}
                    {ship.stats.fires > 0 && <span className="ml-1" title={`${ship.stats.fires} пожар(ов)`}>🔥</span>}
                    {ship.stats.flooding > 0.1 && <span className="ml-1" title={`Затопление ${Math.round(ship.stats.flooding * 100)}%`}>🌊</span>}
                    {ship.isSunk && <span className="ml-1" title="Потоплен">☠️</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {phase !== 'placement' && (
          <div className="flex flex-col lg:flex-row justify-start gap-4 items-start">
            <div className="flex flex-col gap-4 flex-shrink-0">
              <BattleShipDetailCard ship={selectedShipForDetail} hitMarkers={hitMarkers} />
              {showBattleLog && <BattleLog entries={battleLog} title="Журнал боя" />}
            </div>
            <div className="flex-1 overflow-hidden">
              <HexGrid
                playerShips={playerShips}
                enemyShips={enemyShips}
                phase={phase}
                selectedTarget={selectedTarget}
                shotTargets={playerShotTargets}
                shots={playerShots}
                enemyShots={enemyShots}
                selectedShipForMove={selectedShipForMove}
                reachableHexes={reachableHexes}
                attackingShip={playerShips[currentShipIndex]}
                playerTrajectories={playerTrajectories}
                enemyTrajectories={enemyTrajectories}
                isAnimating={isAnimating}
                onCellClick={handleCellClick}
                onShipClick={handleShipClickForDetail}
              />
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-center gap-4 flex-wrap text-xs">
          <div className="flex items-center gap-1">
            <span>🚢</span>
            <span>Линкор (100 HP, 75%, 20 уз, 10 гексов)</span>
          </div>
          <div className="flex items-center gap-1">
            <span>⛴️</span>
            <span>Крейсер (50 HP, 70%, 30 уз, 7 гексов)</span>
          </div>
          <div className="flex items-center gap-1">
            <span>🚤</span>
            <span>Эсминец (25 HP, 65%, 40 уз, 4 гекса)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-8 h-0.5 bg-blue-500 opacity-50" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #3b82f6 0, #3b82f6 5px, transparent 5px, transparent 10px)' }}></div>
            <span>Траектория ваших кораблей</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-8 h-0.5 bg-red-500 opacity-50" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #ef4444 0, #ef4444 5px, transparent 5px, transparent 10px)' }}></div>
            <span>Траектория кораблей противника</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
