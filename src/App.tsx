import { useState, useCallback, useRef } from 'react';
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
  const [playerShotTargets, setPlayerShotTargets] = useState<{ shipId: number; targetShipId: number }[]>([]);
  const [playerShots, setPlayerShots] = useState<Shot[]>([]);
  const [enemyShots, setEnemyShots] = useState<Shot[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<{ shipId: number } | null>(null);
  const [currentShipIndex, setCurrentShipIndex] = useState(0);
  const [turnNumber, setTurnNumber] = useState(1);
  const [selectedShipForMove, setSelectedShipForMove] = useState<Ship | null>(null);
  const [reachableHexes, setReachableHexes] = useState<{ q: number; r: number }[]>([]);
  const [playerTrajectories, setPlayerTrajectories] = useState<Trajectory[]>([]);
  const [enemyTrajectories, setEnemyTrajectories] = useState<Trajectory[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [movementOrders, setMovementOrders] = useState<Map<number, { q: number; r: number }>>(new Map()); // Приказы на движение: shipId -> destination
  const [shotAnimations, setShotAnimations] = useState<Array<{from: {q: number; r: number}; to: {q: number; r: number}; id: number}>>([]); // Анимация выстрелов
  const [selectedShipForDetail, setSelectedShipForDetail] = useState<Ship | null>(null);
  const [selectedPlayerShipsFromDB, setSelectedPlayerShipsFromDB] = useState<ShipDatabaseEntry[]>([]);
  const [selectedEnemyShipsFromDB, setSelectedEnemyShipsFromDB] = useState<ShipDatabaseEntry[]>([]);
  const [battleLog, setBattleLog] = useState<BattleLogEntry[]>([]);
  const [showBattleLog, setShowBattleLog] = useState(true); // Лог боя видим по умолчанию
  const [hitMarkers, setHitMarkers] = useState<Array<{shipId: number; compartmentId: string; turn: number; damage: number}>>([]);
  
  // useRef для хранения актуального значения playerShotTargets
  const playerShotTargetsRef = useRef<{ shipId: number; targetShipId: number }[]>([]);
  
  // Обновляем ref при каждом изменении state
  const setPlayerShotTargetsWithRef = (targets: { shipId: number; targetShipId: number }[]) => {
    console.log(`🔄 setPlayerShotTargetsWithRef:`, targets);
    playerShotTargetsRef.current = targets;
    setPlayerShotTargets(targets);
  };

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
          positionFromBow: c.gridX * 5,
          gridX: c.gridX,
          gridY: c.gridY
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
        backgroundImage: dbShip.compartmentData?.backgroundImage,
        backgroundPosition: dbShip.compartmentData?.backgroundPosition,
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
          positionFromBow: c.gridX * 5,
          gridX: c.gridX,
          gridY: c.gridY
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
        backgroundImage: dbShip.compartmentData?.backgroundImage,
        backgroundPosition: dbShip.compartmentData?.backgroundPosition,
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
    // В фазе движения - выбираем корабль для перемещения
    if (phase === 'movement' && ship.currentHP > 0 && !ship.hasMoved) {
      setSelectedShipForMove(ship);
      setSelectedShipForDetail(ship);
      const reachable = getReachableHexes(ship, [...playerShips, ...enemyShips].filter(s => s.currentHP > 0));
      setReachableHexes(reachable);
      setMessage(`${shipIcon(ship.type)} ${ship.name} выбран. Выберите клетку для перемещения (макс. ${ship.speed} гексов). ПКМ - пропустить.`);
    } else {
      // В других фазах - просто показываем детали
      setSelectedShipForDetail(ship);
    }
  }, [phase, playerShips, enemyShips]);

  const handleShipRightClick = useCallback((e: React.MouseEvent, ship: Ship) => {
    e.preventDefault();
    e.stopPropagation();
    
    // В фазе движения - пропускаем движение этого корабля
    if (phase === 'movement' && selectedShipForMove?.id === ship.id) {
      console.log(`⏭️ Пропуск движения корабля ${ship.name} через ПКМ`);
      
      const updatedShips = playerShips.map(s => 
        s.id === ship.id ? { ...s, hasMoved: true } : s
      );
      setPlayerShips(updatedShips);
      setSelectedShipForMove(null);
      setReachableHexes([]);
      
      // Проверяем, все ли корабли переместились
      const allMoved = updatedShips.filter(s => s.currentHP > 0).every(s => s.hasMoved);
      
      if (allMoved) {
        console.log(`✅ Все корабли обработаны, переход к фазе планирования`);
        setMessage('Все корабли обработаны! Переход к фазе планирования выстрелов...');
        setTimeout(() => {
          setPhase('planning');
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
          setMessage('Все корабли обработаны! Переход к фазе планирования выстрелов...');
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
    }
  }, [phase, selectedShipForMove, playerShips, turnNumber]);

  const handleMoveClick = useCallback((q: number, r: number) => {
    if (phase !== 'movement' || !selectedShipForMove) return;
    
    const isReachable = reachableHexes.some(h => h.q === q && h.r === r);
    if (!isReachable) return;
    
    const isOccupied = [...playerShips, ...enemyShips].some(
      s => s.q === q && s.r === r && s.currentHP > 0 && s.id !== selectedShipForMove.id
    );
    
    // Проверяем, не занят ли гекс другим приказом на движение
    const isOrderOccupied = Array.from(movementOrders.entries()).some(
      ([shipId, dest]) => shipId !== selectedShipForMove.id && dest.q === q && dest.r === r
    );
    
    if (isOccupied || isOrderOccupied) {
      setMessage('⚠️ Клетка занята другим кораблём!');
      return;
    }
    
    // Сохраняем приказ на движение, но НЕ перемещаем корабль
    const newOrders = new Map(movementOrders);
    newOrders.set(selectedShipForMove.id, { q, r });
    setMovementOrders(newOrders);
    
    setMessage(`${shipIcon(selectedShipForMove.type)} ${selectedShipForMove.name}: Приказ на перемещение в (${q},${r}) отдан. Выберите следующий корабль.`);
    
    const updatedShips = playerShips.map(s => 
      s.id === selectedShipForMove.id ? { ...s, hasMoved: true } : s
    );
    setPlayerShips(updatedShips);
    
    setSelectedShipForMove(null);
    setReachableHexes([]);
    
    const allMoved = updatedShips.filter(s => s.currentHP > 0).every(s => s.hasMoved);
    
    if (allMoved) {
      setMessage('Все приказы на движение отданы! Переход к фазе планирования атаки...');
      setTimeout(() => {
        setPhase('planning');
        const firstAlive = updatedShips.findIndex(s => s.currentHP > 0);
        if (firstAlive !== -1) {
          setCurrentShipIndex(firstAlive);
          setMessage(`Ход ${turnNumber}: Выберите цель для ${shipIcon(updatedShips[firstAlive].type)} ${updatedShips[firstAlive].name}`);
        }
      }, 1000);
    } else {
      const nextAlive = updatedShips.findIndex(s => s.currentHP > 0 && !s.hasMoved);
      if (nextAlive !== -1) {
        setMessage(`Выберите следующий корабль для отдачи приказа на движение.`);
      } else {
        setMessage('Все приказы на движение отданы! Переход к фазе планирования атаки...');
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
  }, [phase, selectedShipForMove, reachableHexes, playerShips, turnNumber, movementOrders]);

  const handleCellClick = useCallback((q: number, r: number) => {
    console.log(`🖱️ Клик на гекс (${q}, ${r}), фаза: ${phase}`);
    
    if (phase === 'movement') {
      handleMoveClick(q, r);
      return;
    }
    
    if (phase !== 'planning') {
      console.log(`⚠️ Не в фазе planning, игнорируем клик`);
      return;
    }

    const currentShip = playerShips[currentShipIndex];
    if (!currentShip || currentShip.currentHP <= 0) {
      console.log(`⚠️ Текущий корабль не найден или уничтожен`);
      return;
    }
    
    console.log(`🚢 Текущий корабль: ${currentShip.name} (ID: ${currentShip.id})`);

    const isOwnShip = playerShips.some(s => s.q === q && s.r === r && s.currentHP > 0);
    if (isOwnShip) {
      console.log(`⚠️ Клик на свой корабль`);
      setMessage(`⚠️ Нельзя стрелять по своим кораблям!`);
      return;
    }

    // Находим вражеский корабль на этом гексе
    const targetShip = enemyShips.find(s => s.q === q && s.r === r && s.currentHP > 0);
    if (!targetShip) {
      console.log(`⚠️ На гексе (${q}, ${r}) нет вражеского корабля`);
      setMessage(`⚠️ На этом гексе нет вражеского корабля!`);
      return;
    }
    
    console.log(`🎯 Найден вражеский корабль: ${targetShip.name} (ID: ${targetShip.id})`);

    const distance = hexDistance(currentShip.q, currentShip.r, q, r);
    console.log(`📏 Дистанция: ${distance}, дальность: ${currentShip.range}`);
    
    if (distance > currentShip.range) {
      console.log(`⚠️ Цель вне дальности!`);
      setMessage(`⚠️ Цель вне дальности! Максимальная дальность: ${currentShip.range} гексов`);
      return;
    }

    setSelectedTarget({ shipId: targetShip.id });
    console.log(`✅ Цель установлена: ${targetShip.name}`);
    setMessage(`${shipIcon(currentShip.type)} ${currentShip.name} → цель: ${targetShip.name}. Подтвердить?`);
  }, [phase, playerShips, currentShipIndex, handleMoveClick]);

  const confirmShot = useCallback(() => {
    console.log(`🔫 confirmShot вызван, selectedTarget:`, selectedTarget);
    
    if (!selectedTarget) {
      console.log(`⚠️ Нет выбранной цели`);
      return;
    }

    const currentShip = playerShips[currentShipIndex];
    if (!currentShip) {
      console.log(`⚠️ Текущий корабль не найден`);
      return;
    }
    
    console.log(`🚢 Текущий корабль: ${currentShip.name} (ID: ${currentShip.id})`);

    // selectedTarget теперь содержит ID корабля-цели
    const targetShipId = selectedTarget.shipId;
    const targetShip = enemyShips.find(s => s.id === targetShipId);
    
    if (!targetShip) {
      console.log(`⚠️ Цель не найдена в enemyShips`);
      setMessage('⚠️ Цель не найдена!');
      return;
    }
    
    console.log(`🎯 Цель: ${targetShip.name} (ID: ${targetShipId})`);

    const newTarget = {
      shipId: currentShip.id,
      targetShipId: targetShipId,
    };
    
    console.log(`✅ Добавляем цель в playerShotTargets:`, newTarget);
    console.log(`📊 Текущие цели:`, playerShotTargets);
    
    const updatedTargets = [...playerShotTargets, newTarget];
    console.log(`📝 Обновленные цели:`, updatedTargets);
    setPlayerShotTargetsWithRef(updatedTargets);

    const nextAlive = playerShips.findIndex((s, i) => i > currentShipIndex && s.currentHP > 0);
    console.log(`🔍 Следующий живой корабль:`, nextAlive);
    console.log(`📊 currentShipIndex:`, currentShipIndex);
    console.log(`🚢 Всего кораблей:`, playerShips.length);
    
    if (nextAlive !== -1) {
      console.log(`➡️ Переход к следующему кораблю`);
      setCurrentShipIndex(nextAlive);
      setSelectedTarget(null);
      setMessage(`Выберите цель для ${shipIcon(playerShips[nextAlive].type)} ${playerShips[nextAlive].name}`);
    } else {
      console.log(`✅ Все корабли выбрали цели! Вызываем executePhase через 1 секунду`);
      console.log(`📊 Целей для выстрела:`, updatedTargets.length);
      setMessage('Все корабли выбрали цели! Выполнение выстрелов...');
      setTimeout(() => {
        console.log(`⏰ setTimeout сработал, вызываем executePhase`);
        executePhase();
      }, 1000);
    }
  }, [selectedTarget, playerShips, enemyShips, currentShipIndex, playerShotTargets]);

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

  const nextTurn = useCallback(() => {
    setTurnNumber(t => t + 1);
    setPhase('movement');
    setCurrentShipIndex(0);
    setSelectedTarget(null);
    setPlayerShotTargetsWithRef([]);
    setPlayerShots([]);
    setEnemyShots([]);
    setSelectedShipForMove(null);
    setReachableHexes([]);
    setHitMarkers([]); // Сбрасываем маркеры попаданий между ходами
    setMovementOrders(new Map()); // Сбрасываем приказы на движение
    setShotAnimations([]); // Сбрасываем анимацию выстрелов
    
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

  const executePhase = useCallback(() => {
    console.log(`🚀 executePhase вызван!`);
    console.log(`📊 playerShotTargetsRef.current:`, playerShotTargetsRef.current);
    console.log(`📊 playerShotTargetsRef.current.length:`, playerShotTargetsRef.current.length);
    
    const currentTargets = playerShotTargetsRef.current;
    
    if (currentTargets.length === 0) {
      console.log(`⚠️ playerShotTargets пуст! Выстрелы не будут выполнены.`);
    }
    
    setPhase('execution');
    setIsAnimating(true);
    setMessage('⚓ Исполнение приказов...');

    // Объявляем переменные для использования в setTimeout
    let updatedPlayerShips: Ship[] = [];
    let updatedEnemyShips: Ship[] = [];

    // Шаг 1: Анимация перемещения кораблей (1.5 секунды)
    setTimeout(() => {
      console.log(`🚢 Выполнение приказов на движение`);
      
      // Применяем приказы на движение для игрока
      updatedPlayerShips = playerShips.map(ship => {
        const destination = movementOrders.get(ship.id);
        if (destination) {
          const newHeading = getHeading(ship.q, ship.r, destination.q, destination.r);
          const newTrajectory: Trajectory = {
            shipId: ship.id,
            path: [
              { q: ship.q, r: ship.r },
              { q: destination.q, r: destination.r }
            ]
          };
          setPlayerTrajectories(prev => [...prev, newTrajectory]);
          return { ...ship, q: destination.q, r: destination.r, heading: newHeading };
        }
        return ship;
      });
      
      // Применяем приказы на движение для врага (ИИ)
      const enemyMoves = generateAIMoves(enemyShips, updatedPlayerShips);
      updatedEnemyShips = enemyShips.map(ship => {
        const move = enemyMoves.find(m => m.shipId === ship.id);
        if (move) {
          const newHeading = getHeading(move.fromQ, move.fromR, move.toQ, move.toR);
          const newTrajectory: Trajectory = {
            shipId: ship.id,
            path: [
              { q: move.fromQ, r: move.fromR },
              { q: move.toQ, r: move.toR }
            ]
          };
          setEnemyTrajectories(prev => [...prev, newTrajectory]);
          return { ...ship, q: move.toQ, r: move.toR, heading: newHeading };
        }
        return ship;
      });
      
      setPlayerShips(updatedPlayerShips);
      setEnemyShips(updatedEnemyShips);
      
      // Очищаем приказы на движение после их выполнения
      setMovementOrders(new Map());
      
      console.log(`🔫 Выполнение выстрелов игрока: ${currentTargets.length} целей`);
      console.log(`📋 Список целей:`, currentTargets);
      currentTargets.forEach(t => {
        const attacker = updatedPlayerShips.find(s => s.id === t.shipId);
        const target = updatedEnemyShips.find(s => s.id === t.targetShipId);
        console.log(`  ${attacker?.name} → ${target?.name}`);
      });
      
      // Создаем анимацию выстрелов игрока
      const playerShotAnims = currentTargets.map((t, idx) => {
        const attacker = updatedPlayerShips.find(s => s.id === t.shipId);
        const target = updatedEnemyShips.find(s => s.id === t.targetShipId);
        if (attacker && target) {
          return {
            from: { q: attacker.q, r: attacker.r },
            to: { q: target.q, r: target.r },
            id: Date.now() + idx
          };
        }
        return null;
      }).filter(a => a !== null) as Array<{from: {q: number; r: number}; to: {q: number; r: number}; id: number}>;
      
      setShotAnimations(playerShotAnims);
      
      // Шаг 2: Анимация выстрелов (1 секунда)
      setTimeout(() => {
        // Выполняем выстрелы игрока
        const playerResult = executeShots(currentTargets, updatedPlayerShips, updatedEnemyShips);
        updatedEnemyShips = playerResult.updatedShips;
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
      
      console.log(`📊 Выстрелы игрока: ${playerResult.shots.length}`);
      playerResult.shots.forEach(s => {
        console.log(`  ${s.shipName} → ${s.targetShipName || 'нет цели'}: ${s.hit ? 'ПОПАДАНИЕ' : 'промах'} (${s.damage} урона)`);
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
          : `💨 ${s.shipName} промахнулся по ${s.targetShipName || 'цели'}`,
        severity: s.hit ? 'info' as const : 'warning' as const
      }));

      // Выстрелы противника
      const enemyShotTargets = generateAIShots(enemyShips, updatedPlayerShips);
      const enemyResult = executeShots(enemyShotTargets, enemyShips, updatedPlayerShips);
      updatedPlayerShips = enemyResult.updatedShips;
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
        resultMsg += '\nПереход к следующему ходу...';
      }
      
      setMessage(resultMsg);
      setShotAnimations([]); // Очищаем анимацию выстрелов
      
      // Автоматический переход к следующему ходу через 2 секунды (если игра не окончена)
      if (phase !== 'gameOver') {
        setTimeout(() => {
          nextTurn();
        }, 2000);
      }
      }, 1000); // Конец setTimeout для анимации выстрелов
    }, 1500); // Конец setTimeout для анимации перемещения
  }, [playerShotTargets, playerShips, enemyShips, turnNumber, movementOrders, nextTurn]);

  const resetGame = () => {
    setScreen('menu');
    setPhase('placement');
    setPlayerShips([]);
    setEnemyShips([]);
    setMessage('Нажмите "Начать бой" для размещения кораблей');
    setPlayerShotTargetsWithRef([]);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 text-white p-1">
      <div className="w-full">
        {phase !== 'placement' && (
          <div className="flex flex-col lg:flex-row justify-start gap-2 items-start">
            <div className="flex flex-col gap-2 flex-shrink-0">
              <BattleShipDetailCard ship={selectedShipForDetail} hitMarkers={hitMarkers} />
              {showBattleLog && <BattleLog entries={battleLog} title="Журнал боя" />}
            </div>
            <div className="flex-1 overflow-auto">
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
                movementOrders={movementOrders}
                shotAnimations={shotAnimations}
                onCellClick={handleCellClick}
                onShipClick={handleShipClickForDetail}
                onShipRightClick={handleShipRightClick}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
