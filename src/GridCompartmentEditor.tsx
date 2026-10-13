import { useState, useRef, useEffect, useCallback } from 'react';
import { Ship, Compartment, CompartmentDeck, CompartmentPosition as CompartmentPositionType, CompartmentType, getCompartmentTypeColor } from './types';

interface GridCompartmentEditorProps {
  ship: Ship;
  backgroundImage: string | null;
  onBackgroundImageChange: (image: string | null) => void;
  compartments: Compartment[];
  onCompartmentsChange: (compartments: Compartment[]) => void;
}

interface GridPosition { x: number; y: number; }
interface CompartmentGridPosition { gridX: number; gridY: number; }

export default function GridCompartmentEditor({
  ship, backgroundImage, onBackgroundImageChange, compartments, onCompartmentsChange
}: GridCompartmentEditorProps) {
  const [selectedCompartment, setSelectedCompartment] = useState<string | null>(null);
  const [selectedCompartments, setSelectedCompartments] = useState<Set<string>>(new Set());
  const [draggingCompartment, setDraggingCompartment] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<GridPosition>({ x: 0, y: 0 });
  const [dragPosition, setDragPosition] = useState<GridPosition>({ x: 0, y: 0 });
  const [compartmentOpacity, setCompartmentOpacity] = useState(0.7);
  const [showGrid, setShowGrid] = useState(true);
  const [showCompartments, setShowCompartments] = useState(true);
  const [backgroundPosition, setBackgroundPosition] = useState<GridPosition>({ x: 0, y: 0 });
  const [draggingBackground, setDraggingBackground] = useState(false);
  const [backgroundDragOffset, setBackgroundDragOffset] = useState<GridPosition>({ x: 0, y: 0 });
  const [compartmentPositions, setCompartmentPositions] = useState<Map<string, CompartmentGridPosition>>(new Map());
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const cols = 56;
  const rows = 23;
  const gridSize = 10;
  const padding = 20;
  const width = cols * gridSize + padding * 2;
  const height = rows * gridSize + padding * 2;

  useEffect(() => {
    setCompartmentPositions(prevPositions => {
      const newPositions = new Map(prevPositions);
      compartments.forEach((comp) => {
        if (!newPositions.has(comp.id)) {
          let foundPosition: CompartmentGridPosition | null = null;
          for (let y = rows - 1; y >= 0 && !foundPosition; y--) {
            for (let x = 0; x < cols && !foundPosition; x++) {
              const isOccupied = Array.from(newPositions.values()).some(pos => pos.gridX === x && pos.gridY === y);
              if (!isOccupied) foundPosition = { gridX: x, gridY: y };
            }
          }
          const position = foundPosition || { gridX: 0, gridY: rows - 1 };
          newPositions.set(comp.id, position);
        }
      });
      const compartmentIds = new Set(compartments.map(c => c.id));
      Array.from(newPositions.keys()).forEach(id => {
        if (!compartmentIds.has(id)) newPositions.delete(id);
      });
      return newPositions;
    });
  }, [compartments, rows, cols]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => { onBackgroundImageChange(event.target?.result as string); };
      reader.readAsDataURL(file);
    }
  };

  const handleBackgroundMouseDown = (e: React.MouseEvent) => {
    if (!backgroundImage) return;
    e.preventDefault();
    const svgRect = svgRef.current?.getBoundingClientRect();
    if (!svgRect) return;
    const mouseX = e.clientX - svgRect.left;
    const mouseY = e.clientY - svgRect.top;
    setDraggingBackground(true);
    setBackgroundDragOffset({ x: mouseX - backgroundPosition.x, y: mouseY - backgroundPosition.y });
  };

  const handleMouseDown = (e: React.MouseEvent, compId: string) => {
    e.stopPropagation();
    e.preventDefault();
    const pos = compartmentPositions.get(compId);
    if (!pos) return;
    const svgRect = svgRef.current?.getBoundingClientRect();
    if (!svgRect) return;
    const mouseX = e.clientX - svgRect.left - padding;
    const mouseY = e.clientY - svgRect.top - padding;
    setDraggingCompartment(compId);
    setDragOffset({ x: mouseX - pos.gridX * gridSize, y: mouseY - pos.gridY * gridSize });
    setDragPosition({ x: pos.gridX, y: pos.gridY });
    setSelectedCompartment(compId);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!svgRef.current) return;
    const svgRect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - svgRect.left;
    const mouseY = e.clientY - svgRect.top;
    if (draggingBackground) {
      setBackgroundPosition({ x: mouseX - backgroundDragOffset.x, y: mouseY - backgroundDragOffset.y });
    } else if (draggingCompartment) {
      const relX = mouseX - padding;
      const relY = mouseY - padding;
      const newGridX = Math.max(0, Math.min(Math.round((relX - dragOffset.x) / gridSize), cols - 1));
      const newGridY = Math.max(0, Math.min(Math.round((relY - dragOffset.y) / gridSize), rows - 1));
      setDragPosition({ x: newGridX, y: newGridY });
    }
  }, [draggingBackground, draggingCompartment, backgroundDragOffset, dragOffset, gridSize, cols, rows]);

  const handleMouseUp = useCallback(() => {
    if (draggingCompartment) {
      const newPositions = new Map(compartmentPositions);
      newPositions.set(draggingCompartment, { gridX: dragPosition.x, gridY: dragPosition.y });
      setCompartmentPositions(newPositions);
      const updatedCompartments = compartments.map(c => {
        if (c.id === draggingCompartment) {
          return { ...c, positionFromBow: dragPosition.x * 5 };
        }
        return c;
      });
      onCompartmentsChange(updatedCompartments);
    }
    setDraggingCompartment(null);
    setDraggingBackground(false);
  }, [draggingCompartment, draggingBackground, dragPosition, compartmentPositions, compartments, onCompartmentsChange]);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
  }, [handleMouseMove, handleMouseUp]);

  const addCompartment = () => {
    const newCompartment: Compartment = {
      id: `comp_${Date.now()}_${Math.random()}`, position: 'mid', deck: 'lower', side: 'center',
      type: 'other',
      name: `Отсек ${compartments.length + 1}`,
      maxHP: 20, currentHP: 20, status: 'intact', watertight: true, armor: 50,
      flooded: 0, fire: 0, components: [], adjacentIds: [], lengthMeters: 5, positionFromBow: 0
    };
    let targetPosition: CompartmentGridPosition = { gridX: 0, gridY: rows - 1 };
    const isOccupied = Array.from(compartmentPositions.values()).some(pos => pos.gridX === 0 && pos.gridY === rows - 1);
    if (isOccupied) {
      for (let y = rows - 1; y >= 0; y--) {
        for (let x = 0; x < cols; x++) {
          const cellOccupied = Array.from(compartmentPositions.values()).some(pos => pos.gridX === x && pos.gridY === y);
          if (!cellOccupied) { targetPosition = { gridX: x, gridY: y }; break; }
        }
      }
    }
    const newPositions = new Map(compartmentPositions);
    newPositions.set(newCompartment.id, targetPosition);
    setCompartmentPositions(newPositions);
    onCompartmentsChange([...compartments, newCompartment]);
    setSelectedCompartment(newCompartment.id);
  };

  const deleteCompartment = (id: string) => {
    onCompartmentsChange(compartments.filter(c => c.id !== id));
    if (selectedCompartment === id) setSelectedCompartment(null);
  };

  const getCompartmentColor = (comp: Compartment) => {
    return getCompartmentTypeColor(comp.type, comp.status);
  };

  const updateCompartment = (id: string, updates: Partial<Compartment>) => {
    onCompartmentsChange(compartments.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap items-center">
        <button onClick={() => fileInputRef.current?.click()} className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs">📁 Загрузить</button>
        {backgroundImage && (
          <>
            <button onClick={() => onBackgroundImageChange(null)} className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-xs">✕ Удалить</button>
            <button onClick={() => setBackgroundPosition({ x: 0, y: 0 })} className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-xs">🎯 Сброс</button>
          </>
        )}
        <button onClick={addCompartment} className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-xs">➕ Добавить</button>
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} />Сетка</label>
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={showCompartments} onChange={(e) => setShowCompartments(e.target.checked)} />Отсеки</label>
        <label className="flex items-center gap-2 text-xs">
          Прозр.: <input type="range" min="0" max="1" step="0.1" value={compartmentOpacity} onChange={(e) => setCompartmentOpacity(parseFloat(e.target.value))} className="w-20" />
          {Math.round(compartmentOpacity * 100)}%
        </label>
      </div>
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />

      <svg ref={svgRef} width={width} height={height} className="border border-slate-600 rounded bg-slate-900/50 cursor-default"
        onMouseDown={handleBackgroundMouseDown}>
        {backgroundImage && (
          <image href={backgroundImage} x={backgroundPosition.x} y={backgroundPosition.y} width={width} height={height}
            preserveAspectRatio="xMidYMid meet" opacity={0.8} className="cursor-move" />
        )}
        {showGrid && (
          <g opacity={0.3}>
            {Array.from({ length: cols + 1 }).map((_, i) => (
              <line key={`v-${i}`} x1={padding + i * gridSize} y1={padding} x2={padding + i * gridSize} y2={height - padding} stroke="#64748b" strokeWidth="0.5" />
            ))}
            {Array.from({ length: rows + 1 }).map((_, i) => (
              <line key={`h-${i}`} x1={padding} y1={padding + i * gridSize} x2={width - padding} y2={padding + i * gridSize} stroke="#64748b" strokeWidth="0.5" />
            ))}
          </g>
        )}
        {showCompartments && compartments.map((comp) => {
          const pos = compartmentPositions.get(comp.id);
          if (!pos) return null;
          const isSelected = selectedCompartment === comp.id || selectedCompartments.has(comp.id);
          const isDragging = draggingCompartment === comp.id;
          const color = getCompartmentColor(comp);
          const displayX = isDragging ? dragPosition.x : pos.gridX;
          const displayY = isDragging ? dragPosition.y : pos.gridY;

          const cellX = padding + displayX * gridSize;
          const cellY = padding + displayY * gridSize;
          return (
            <g key={comp.id}
              onMouseDown={(e) => {
                e.stopPropagation();
                if (e.shiftKey) {
                  const newSelected = new Set(selectedCompartments);
                  if (newSelected.has(comp.id)) newSelected.delete(comp.id); else newSelected.add(comp.id);
                  setSelectedCompartments(newSelected);
                } else {
                  setSelectedCompartments(new Set([comp.id]));
                  handleMouseDown(e, comp.id);
                }
              }}
              className="cursor-move">
              <rect x={cellX} y={cellY} width={gridSize} height={gridSize}
                fill={color} opacity={compartmentOpacity}
                stroke={isSelected ? '#fbbf24' : isDragging ? '#06b6d4' : '#475569'}
                strokeWidth={isSelected || isDragging ? 2 : 1} />
              {comp.flooded > 0 && (
                <g>
                  <circle cx={cellX + gridSize / 2} cy={cellY + gridSize / 2} r={gridSize * 0.4} fill="#1e40af" opacity="0.8" />
                  <text x={cellX + gridSize / 2} y={cellY + gridSize / 2 + 1} fill="#ffffff" fontSize={gridSize * 0.6} textAnchor="middle" dominantBaseline="middle" style={{pointerEvents: 'none'}}>💧</text>
                </g>
              )}
              {comp.fire > 0 && (
                <g>
                  <circle cx={cellX + gridSize / 2} cy={cellY + gridSize / 2} r={gridSize * 0.4} fill="#991b1b" opacity="0.8" />
                  <text x={cellX + gridSize / 2} y={cellY + gridSize / 2 + 1} fill="#ffffff" fontSize={gridSize * 0.6} textAnchor="middle" dominantBaseline="middle" style={{pointerEvents: 'none'}}>🔥</text>
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {selectedCompartments.size > 0 && (
        <div className="bg-slate-900/50 border border-slate-700 rounded p-3 space-y-2">
          <div className="text-xs font-bold text-slate-300">
            {selectedCompartments.size === 1 ? 'Свойства отсека:' : `Выбрано: ${selectedCompartments.size}`}
          </div>
          {selectedCompartments.size === 1 ? (() => {
            const compId = Array.from(selectedCompartments)[0];
            const comp = compartments.find(c => c.id === compId);
            if (!comp) return null;
            return (
              <>
                <div className="text-xs text-slate-400">{comp.name}</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400">Тип отсека:</label>
                    <select value={comp.type} onChange={(e) => updateCompartment(comp.id, { type: e.target.value as CompartmentType })}
                      className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-white">
                      <option value="bridge">Мостик</option>
                      <option value="control_system">Система управления</option>
                      <option value="weaponry">Вооружение</option>
                      <option value="propulsion">ГЭУ</option>
                      <option value="rudder">Руль</option>
                      <option value="propellers">Винты</option>
                      <option value="ammunition">Боезапас</option>
                      <option value="other">Остальные</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">Палуба:</label>
                    <select value={comp.deck} onChange={(e) => updateCompartment(comp.id, { deck: e.target.value as CompartmentDeck })}
                      className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-white">
                      <option value="lower">Нижняя</option>
                      <option value="middle">Средняя</option>
                      <option value="upper">Верхняя</option>
                      <option value="deck">Палуба</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">Позиция:</label>
                    <select value={comp.position} onChange={(e) => updateCompartment(comp.id, { position: e.target.value as CompartmentPositionType })}
                      className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-white">
                      <option value="bow">Нос</option><option value="forward">Носовая</option><option value="mid">Центр</option>
                      <option value="aft">Кормовая</option><option value="stern">Корма</option>
                    </select>
                  </div>
                </div>
                <button onClick={() => deleteCompartment(comp.id)} className="w-full bg-red-600 hover:bg-red-700 text-white text-xs py-1 rounded">🗑️ Удалить</button>
              </>
            );
          })() : (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => { const u = compartments.map(c => selectedCompartments.has(c.id) ? {...c, status: 'intact' as const} : c); onCompartmentsChange(u); }} className="bg-green-600 text-white text-xs py-1 rounded">✓ Целый</button>
                <button onClick={() => { const u = compartments.map(c => selectedCompartments.has(c.id) ? {...c, status: 'damaged' as const} : c); onCompartmentsChange(u); }} className="bg-orange-600 text-white text-xs py-1 rounded">⚠ Повреждён</button>
                <button onClick={() => { const u = compartments.map(c => selectedCompartments.has(c.id) ? {...c, status: 'flooded' as const} : c); onCompartmentsChange(u); }} className="bg-blue-600 text-white text-xs py-1 rounded">💧 Затоплен</button>
                <button onClick={() => { const u = compartments.map(c => selectedCompartments.has(c.id) ? {...c, status: 'destroyed' as const} : c); onCompartmentsChange(u); }} className="bg-red-600 text-white text-xs py-1 rounded">✕ Разрушен</button>
              </div>
              <button onClick={() => { onCompartmentsChange(compartments.filter(c => !selectedCompartments.has(c.id))); setSelectedCompartments(new Set()); }}
                className="w-full bg-red-600 hover:bg-red-700 text-white text-xs py-1 rounded">🗑️ Удалить все ({selectedCompartments.size})</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
