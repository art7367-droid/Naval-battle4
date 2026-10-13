import { Ship, Compartment } from './types';
import BattleshipSuperstructure from './BattleshipSuperstructure';

interface ShipSchematicProps {
  ship: Ship;
  backgroundImage?: string | null;
  showCompartments?: boolean;
  compartmentOpacity?: number;
}

export default function ShipSchematic({ 
  ship, 
  backgroundImage, 
  showCompartments = true,
  compartmentOpacity = 0.6 
}: ShipSchematicProps) {
  const getCompartmentColor = (comp: Compartment) => {
    switch (comp.status) {
      case 'destroyed': return '#dc2626';
      case 'flooded': return '#2563eb';
      case 'on_fire': return '#f97316';
      case 'damaged': return '#ea580c';
      default: return '#16a34a';
    }
  };

  const compartmentsByDeck = {
    upper: ship.compartments.filter(c => c.deck === 'upper').sort((a, b) => (a.positionFromBow || 0) - (b.positionFromBow || 0)),
    middle: ship.compartments.filter(c => c.deck === 'middle').sort((a, b) => (a.positionFromBow || 0) - (b.positionFromBow || 0)),
    lower: ship.compartments.filter(c => c.deck === 'lower').sort((a, b) => (a.positionFromBow || 0) - (b.positionFromBow || 0)),
  };

  const renderSideView = () => {
    const width = 478;
    const height = 220;
    const padding = 20;
    const availableWidth = width - padding * 2;
    
    const shipLength = ship.length || 250;
    const numCompartments = Math.ceil(shipLength / 10);
    const compartmentWidth = availableWidth / numCompartments;
    
    const deckHeight = 10;
    const deckGap = 2;
    const superstructureOffset = ship.type === 'battleship' ? 60 : 0;

    return (
      <svg width={width} height={height} className="border border-slate-600 rounded bg-slate-900/50">
        {backgroundImage && (
          <image href={backgroundImage} x={padding} y={20} width={availableWidth} height={height - 40}
            preserveAspectRatio="xMidYMid meet" opacity={0.8} />
        )}
        
        <g opacity={showCompartments ? compartmentOpacity : 0}>
        <text x="10" y="15" fill="#94a3b8" fontSize="10" fontWeight="bold">
          ВИД СБОКУ - {ship.name} ({shipLength}м, {numCompartments} отсеков)
        </text>
        
        {ship.type === 'battleship' && (
          <BattleshipSuperstructure width={availableWidth} height={superstructureOffset} offsetX={padding} offsetY={20} />
        )}
        
        <text x="5" y={25 + superstructureOffset} fill="#94a3b8" fontSize="8">Верхняя</text>
        {compartmentsByDeck.upper.map((comp, idx) => {
          const x = padding + idx * compartmentWidth;
          const y = 25 + superstructureOffset;
          const color = getCompartmentColor(comp);
          
          return (
            <g key={comp.id}>
              <rect x={x} y={y} width={compartmentWidth - 1} height={deckHeight}
                fill={color} opacity={0.7} stroke="#475569" strokeWidth="0.5" />
              {comp.flooded > 0 && (
                <text x={x + compartmentWidth / 2} y={y + deckHeight / 2} fill="#60a5fa" fontSize="8" textAnchor="middle" dominantBaseline="middle">💧</text>
              )}
              {comp.fire > 0 && (
                <text x={x + compartmentWidth / 2 + 8} y={y + deckHeight / 2} fill="#f97316" fontSize="8" textAnchor="middle" dominantBaseline="middle">🔥</text>
              )}
            </g>
          );
        })}

        {ship.type !== 'destroyer' && (
          <>
            <text x="5" y={25 + superstructureOffset + deckHeight + deckGap + 15} fill="#94a3b8" fontSize="8">Средняя</text>
            {compartmentsByDeck.middle.map((comp, idx) => {
              const x = padding + idx * compartmentWidth;
              const y = 25 + superstructureOffset + deckHeight + deckGap;
              const color = getCompartmentColor(comp);
              
              return (
                <g key={comp.id}>
                  <rect x={x} y={y} width={compartmentWidth - 1} height={deckHeight}
                    fill={color} opacity={0.7} stroke="#475569" strokeWidth="0.5" />
                  {comp.flooded > 0 && (
                    <text x={x + compartmentWidth / 2} y={y + deckHeight / 2} fill="#60a5fa" fontSize="8" textAnchor="middle" dominantBaseline="middle">💧</text>
                  )}
                  {comp.fire > 0 && (
                    <text x={x + compartmentWidth / 2 + 8} y={y + deckHeight / 2} fill="#f97316" fontSize="8" textAnchor="middle" dominantBaseline="middle">🔥</text>
                  )}
                </g>
              );
            })}
          </>
        )}

        <text x="5" y={25 + superstructureOffset + (ship.type === 'destroyer' ? 1 : 2) * (deckHeight + deckGap) + 15} fill="#94a3b8" fontSize="8">Нижняя</text>
        {compartmentsByDeck.lower.map((comp, idx) => {
          const x = padding + idx * compartmentWidth;
          const y = 25 + superstructureOffset + (ship.type === 'destroyer' ? 1 : 2) * (deckHeight + deckGap);
          const color = getCompartmentColor(comp);
          
          return (
            <g key={comp.id}>
              <rect x={x} y={y} width={compartmentWidth - 1} height={deckHeight}
                fill={color} opacity={0.7} stroke="#475569" strokeWidth="0.5" />
              {comp.flooded > 0 && (
                <text x={x + compartmentWidth / 2} y={y + deckHeight / 2} fill="#60a5fa" fontSize="8" textAnchor="middle" dominantBaseline="middle">💧</text>
              )}
              {comp.fire > 0 && (
                <text x={x + compartmentWidth / 2 + 8} y={y + deckHeight / 2} fill="#f97316" fontSize="8" textAnchor="middle" dominantBaseline="middle">🔥</text>
              )}
            </g>
          );
        })}

        <text x={padding} y={height - 5} fill="#94a3b8" fontSize="8" textAnchor="middle">НОС</text>
        <text x={width - padding} y={height - 5} fill="#94a3b8" fontSize="8" textAnchor="middle">КОРМА</text>
        </g>
      </svg>
    );
  };

  const renderTopView = () => {
    const width = 478;
    const height = 80;
    const padding = 20;
    const availableWidth = width - padding * 2;
    
    const shipLength = ship.length || 250;
    const numCompartments = Math.ceil(shipLength / 10);
    const compartmentWidth = availableWidth / numCompartments;

    return (
      <svg width={width} height={height} className="border border-slate-600 rounded bg-slate-900/50">
        <text x="10" y="15" fill="#94a3b8" fontSize="10" fontWeight="bold">ВИД СВЕРХУ</text>
        
        {compartmentsByDeck.upper.map((comp, idx) => {
          const x = padding + idx * compartmentWidth;
          const y = 25;
          const color = getCompartmentColor(comp);
          
          return (
            <g key={`top-${comp.id}`}>
              <rect x={x} y={y} width={compartmentWidth - 1} height={30}
                fill={color} opacity={0.7} stroke="#475569" strokeWidth="0.5" />
              {comp.flooded > 0 && (
                <text x={x + compartmentWidth / 2} y={y + 15} fill="#60a5fa" fontSize="10" textAnchor="middle" dominantBaseline="middle">💧</text>
              )}
              {comp.fire > 0 && (
                <text x={x + compartmentWidth / 2 + 10} y={y + 15} fill="#f97316" fontSize="10" textAnchor="middle" dominantBaseline="middle">🔥</text>
              )}
            </g>
          );
        })}

        <text x={padding} y={height - 5} fill="#94a3b8" fontSize="8" textAnchor="middle">НОС</text>
        <text x={width - padding} y={height - 5} fill="#94a3b8" fontSize="8" textAnchor="middle">КОРМА</text>
      </svg>
    );
  };

  return (
    <div className="space-y-2">
      {renderSideView()}
      {renderTopView()}
      
      <div className="flex gap-3 text-[9px] justify-center">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-600 rounded"></div>
          <span className="text-slate-400">Целый</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-orange-600 rounded"></div>
          <span className="text-slate-400">Повреждён</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-blue-600 rounded"></div>
          <span className="text-slate-400">Затоплен</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-red-600 rounded"></div>
          <span className="text-slate-400">Разрушен</span>
        </div>
      </div>
    </div>
  );
}
