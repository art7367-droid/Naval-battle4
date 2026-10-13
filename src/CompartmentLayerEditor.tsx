import { useState, useRef } from 'react';
import { Ship, Compartment, CompartmentDeck, CompartmentPosition } from './types';

interface CompartmentLayerEditorProps {
  ship: Ship;
  backgroundImage: string | null;
  onBackgroundImageChange: (image: string | null) => void;
  compartments: Compartment[];
  onCompartmentsChange: (compartments: Compartment[]) => void;
}

export default function CompartmentLayerEditor({
  ship, backgroundImage, onBackgroundImageChange, compartments, onCompartmentsChange
}: CompartmentLayerEditorProps) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawCurrent, setDrawCurrent] = useState<{ x: number; y: number } | null>(null);
  const [selectedCompartment, setSelectedCompartment] = useState<string | null>(null);
  const [compartmentOpacity, setCompartmentOpacity] = useState(0.6);
  const [showCompartments, setShowCompartments] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const width = 478;
  const height = 220;
  const padding = 20;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => { onBackgroundImageChange(event.target?.result as string); };
      reader.readAsDataURL(file);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setIsDrawing(true);
    setDrawStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setDrawCurrent({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDrawing) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setDrawCurrent({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseUp = () => {
    if (!isDrawing || !drawStart || !drawCurrent) return;
    const newWidth = Math.abs(drawCurrent.x - drawStart.x);
    const newHeight = Math.abs(drawCurrent.y - drawStart.y);
    if (newWidth > 10 && newHeight > 10) {
      const shipLength = ship.length || 250;
      const numCompartments = Math.ceil(shipLength / 10);
      const compartmentWidth = (width - padding * 2) / numCompartments;
      const x = Math.min(drawStart.x, drawCurrent.x);
      const positionIndex = Math.floor((x - padding) / compartmentWidth);
      
      let position: CompartmentPosition = 'mid';
      const relativePos = positionIndex / numCompartments;
      if (relativePos < 0.15) position = 'bow';
      else if (relativePos < 0.35) position = 'forward';
      else if (relativePos < 0.65) position = 'mid';
      else if (relativePos < 0.85) position = 'aft';
      else position = 'stern';
      
      const newCompartment: Compartment = {
        id: `comp_${Date.now()}`, position, deck: 'upper', side: 'center',
        name: `Отсек ${compartments.length + 1}`,
        maxHP: 20, currentHP: 20, status: 'intact',
        watertight: true, armor: 50, flooded: 0, fire: 0,
        components: [], adjacentIds: [], lengthMeters: 10, positionFromBow: positionIndex * 10
      };
      onCompartmentsChange([...compartments, newCompartment]);
    }
    setIsDrawing(false);
    setDrawStart(null);
    setDrawCurrent(null);
  };

  const getCompartmentColor = (comp: Compartment) => {
    switch (comp.status) {
      case 'destroyed': return '#dc2626';
      case 'flooded': return '#2563eb';
      case 'on_fire': return '#f97316';
      case 'damaged': return '#ea580c';
      default: return '#16a34a';
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => fileInputRef.current?.click()} className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs">📁 Загрузить изображение</button>
        {backgroundImage && <button onClick={() => onBackgroundImageChange(null)} className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-xs">✕ Удалить</button>}
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={showCompartments} onChange={(e) => setShowCompartments(e.target.checked)} />Показать отсеки
        </label>
        <label className="flex items-center gap-2 text-xs">
          Прозрачность:
          <input type="range" min="0" max="1" step="0.1" value={compartmentOpacity} onChange={(e) => setCompartmentOpacity(parseFloat(e.target.value))} className="w-20" />
          {Math.round(compartmentOpacity * 100)}%
        </label>
      </div>
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />

      <svg width={width} height={height} className="border border-slate-600 rounded bg-slate-900/50 cursor-crosshair"
        onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
        {backgroundImage && (
          <image href={backgroundImage} x={padding} y={20} width={width - padding * 2} height={height - 40}
            preserveAspectRatio="xMidYMid meet" opacity={0.8} />
        )}
        <g opacity={showCompartments ? compartmentOpacity : 0}>
          {compartments.map((comp, idx) => {
            const shipLength = ship.length || 250;
            const numCompartments = Math.ceil(shipLength / 10);
            const compartmentWidth = (width - padding * 2) / numCompartments;
            const posIndex = comp.positionFromBow ? comp.positionFromBow / 10 : idx % numCompartments;
            const x = padding + posIndex * compartmentWidth;
            const y = 25;
            const color = getCompartmentColor(comp);
            const isSelected = selectedCompartment === comp.id;
            
            return (
              <g key={comp.id}>
                <rect x={x} y={y} width={compartmentWidth - 1} height={10}
                  fill={color} stroke={isSelected ? '#fbbf24' : '#475569'} strokeWidth={isSelected ? 2 : 0.5}
                  onClick={(e) => { e.stopPropagation(); setSelectedCompartment(comp.id); }} className="cursor-pointer" />
              </g>
            );
          })}
          {isDrawing && drawStart && drawCurrent && (
            <rect x={Math.min(drawStart.x, drawCurrent.x)} y={Math.min(drawStart.y, drawCurrent.y)}
              width={Math.abs(drawCurrent.x - drawStart.x)} height={Math.abs(drawCurrent.y - drawStart.y)}
              fill="#06b6d4" opacity={0.3} stroke="#06b6d4" strokeWidth="1" strokeDasharray="4,4" />
          )}
        </g>
      </svg>

      {selectedCompartment && (
        <div className="bg-slate-900/50 border border-slate-700 rounded p-2">
          <div className="text-xs font-bold text-slate-300">Выбран отсек</div>
          <button onClick={() => { onCompartmentsChange(compartments.filter(c => c.id !== selectedCompartment)); setSelectedCompartment(null); }}
            className="w-full mt-2 bg-red-600 hover:bg-red-700 text-white text-xs py-1 rounded">🗑️ Удалить</button>
        </div>
      )}
    </div>
  );
}
