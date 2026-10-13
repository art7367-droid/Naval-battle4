import { useState } from 'react';
import { Compartment, CompartmentPosition, CompartmentDeck, CompartmentSide, CompartmentStatus } from './types';

interface ShipEditorProps {
  compartments: Compartment[];
  onCompartmentsChange: (compartments: Compartment[]) => void;
}

export default function ShipEditor({ compartments, onCompartmentsChange }: ShipEditorProps) {
  const [selectedTool, setSelectedTool] = useState<'select' | 'add'>('select');
  const [selectedCompartment, setSelectedCompartment] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawCurrent, setDrawCurrent] = useState<{ x: number; y: number } | null>(null);

  const canvasWidth = 478;
  const canvasHeight = 200;

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (selectedTool !== 'add') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setIsDrawing(true);
    setDrawStart({ x, y });
    setDrawCurrent({ x, y });
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDrawing) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setDrawCurrent({ x, y });
  };

  const handleMouseUp = () => {
    if (!isDrawing || !drawStart || !drawCurrent) return;
    const width = Math.abs(drawCurrent.x - drawStart.x);
    const height = Math.abs(drawCurrent.y - drawStart.y);
    if (width > 10 && height > 10) {
      const newCompartment: Compartment = {
        id: `comp_${Date.now()}`,
        position: 'mid', deck: 'middle', side: 'center',
        name: `Отсек ${compartments.length + 1}`,
        maxHP: 20, currentHP: 20, status: 'intact',
        watertight: true, armor: 50, flooded: 0, fire: 0,
        components: [], adjacentIds: []
      };
      onCompartmentsChange([...compartments, newCompartment]);
    }
    setIsDrawing(false);
    setDrawStart(null);
    setDrawCurrent(null);
  };

  const handleCompartmentClick = (id: string) => {
    if (selectedTool === 'select') {
      setSelectedCompartment(selectedCompartment === id ? null : id);
    }
  };

  const updateCompartment = (id: string, updates: Partial<Compartment>) => {
    onCompartmentsChange(compartments.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const deleteCompartment = (id: string) => {
    onCompartmentsChange(compartments.filter(c => c.id !== id));
    setSelectedCompartment(null);
  };

  const getStatusColor = (status: CompartmentStatus) => {
    switch (status) {
      case 'destroyed': return '#dc2626';
      case 'flooded': return '#2563eb';
      case 'damaged': return '#ea580c';
      default: return '#16a34a';
    }
  };

  const selectedComp = compartments.find(c => c.id === selectedCompartment);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button onClick={() => setSelectedTool('select')} className={`px-3 py-1 rounded text-xs ${selectedTool === 'select' ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-300'}`}>🖱️ Выбор</button>
        <button onClick={() => setSelectedTool('add')} className={`px-3 py-1 rounded text-xs ${selectedTool === 'add' ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-300'}`}>✏️ Добавить отсек</button>
      </div>

      <svg width={canvasWidth} height={canvasHeight} className="border border-slate-600 rounded bg-slate-900/50 cursor-crosshair"
        onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
        {compartments.map(comp => (
          <g key={comp.id}>
            <rect x={10} y={10} width={canvasWidth - 20} height={canvasHeight - 20}
              fill={getStatusColor(comp.status)} opacity={0.7}
              stroke={selectedCompartment === comp.id ? '#fbbf24' : '#475569'}
              strokeWidth={selectedCompartment === comp.id ? 2 : 1}
              onClick={() => handleCompartmentClick(comp.id)} className="cursor-pointer" />
            <text x={canvasWidth / 2} y={canvasHeight / 2} fill="white" fontSize="12" textAnchor="middle" dominantBaseline="middle" pointerEvents="none">
              {comp.name}
            </text>
          </g>
        ))}
        {isDrawing && drawStart && drawCurrent && (
          <rect x={Math.min(drawStart.x, drawCurrent.x)} y={Math.min(drawStart.y, drawCurrent.y)}
            width={Math.abs(drawCurrent.x - drawStart.x)} height={Math.abs(drawCurrent.y - drawStart.y)}
            fill="#06b6d4" opacity={0.3} stroke="#06b6d4" strokeWidth="1" strokeDasharray="4,4" />
        )}
      </svg>

      {selectedComp && (
        <div className="bg-slate-900/50 border border-slate-700 rounded p-2 space-y-2">
          <div className="text-xs font-bold text-slate-300">Свойства отсека:</div>
          <div>
            <label className="text-[10px] text-slate-400">Название:</label>
            <input type="text" value={selectedComp.name} onChange={(e) => updateCompartment(selectedComp.id, { name: e.target.value })}
              className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-white" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-400">Позиция:</label>
              <select value={selectedComp.position} onChange={(e) => updateCompartment(selectedComp.id, { position: e.target.value as CompartmentPosition })}
                className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-white">
                <option value="bow">Нос</option><option value="forward">Носовая часть</option><option value="mid">Центр</option>
                <option value="aft">Кормовая часть</option><option value="stern">Корма</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-400">Палуба:</label>
              <select value={selectedComp.deck} onChange={(e) => updateCompartment(selectedComp.id, { deck: e.target.value as CompartmentDeck })}
                className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-white">
                <option value="upper">Верхняя</option><option value="middle">Средняя</option>
                <option value="lower">Нижняя</option><option value="bottom">Двойное дно</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-400">Борт:</label>
              <select value={selectedComp.side} onChange={(e) => updateCompartment(selectedComp.id, { side: e.target.value as CompartmentSide })}
                className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-white">
                <option value="port">Левый</option><option value="center">Центр</option><option value="starboard">Правый</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-400">Статус:</label>
              <select value={selectedComp.status} onChange={(e) => updateCompartment(selectedComp.id, { status: e.target.value as CompartmentStatus })}
                className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-white">
                <option value="intact">Целый</option><option value="damaged">Повреждён</option>
                <option value="flooded">Затоплен</option><option value="destroyed">Разрушен</option>
              </select>
            </div>
          </div>
          <button onClick={() => deleteCompartment(selectedComp.id)} className="w-full bg-red-600 hover:bg-red-700 text-white text-xs py-1 rounded">🗑️ Удалить отсек</button>
        </div>
      )}

      <div className="flex gap-3 text-[9px] justify-center">
        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-600 rounded"></div><span className="text-slate-400">Целый</span></div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-orange-600 rounded"></div><span className="text-slate-400">Повреждён</span></div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-600 rounded"></div><span className="text-slate-400">Затоплен</span></div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-600 rounded"></div><span className="text-slate-400">Разрушен</span></div>
      </div>
    </div>
  );
}
