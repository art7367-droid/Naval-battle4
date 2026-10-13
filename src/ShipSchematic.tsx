import { Ship, Compartment, getCompartmentTypeColor } from './types';
import BattleshipSuperstructure from './BattleshipSuperstructure';

interface ShipSchematicProps {
  ship: Ship;
  backgroundImage?: string | null;
  showCompartments?: boolean;
  compartmentOpacity?: number;
  hitMarkers?: Array<{shipId: number; compartmentId: string; turn: number; damage: number}>;
}

export default function ShipSchematic({ 
  ship, 
  backgroundImage, 
  showCompartments = true,
  compartmentOpacity = 0.6,
  hitMarkers = []
}: ShipSchematicProps) {
  const getCompartmentColor = (comp: Compartment) => {
    return getCompartmentTypeColor(comp.type, comp.status);
  };
  
  // Функция для получения маркеров попаданий для отсека
  const getHitMarkersForCompartment = (compId: string) => {
    return hitMarkers.filter(m => m.shipId === ship.id && m.compartmentId === compId);
  };
  
  // Компонент для отрисовки маркера попадания
  const renderHitMarker = (x: number, y: number, markers: typeof hitMarkers) => {
    if (markers.length === 0) return null;
    const latestMarker = markers[markers.length - 1];
    return (
      <g>
        <circle cx={x} cy={y} r={4} fill="#dc2626" stroke="#fff" strokeWidth="1" opacity="0.9" />
        <text x={x} y={y + 1} fill="#fff" fontSize="6" textAnchor="middle" dominantBaseline="middle" fontWeight="bold">
          {markers.length > 1 ? `${markers.length}` : '✕'}
        </text>
        <title>Попадание: {latestMarker.damage} урона (ход {latestMarker.turn})</title>
      </g>
    );
  };

  const compartmentsByDeck = {
    deck: ship.compartments.filter(c => c.deck === 'deck').sort((a, b) => (a.positionFromBow || 0) - (b.positionFromBow || 0)),
    upper: ship.compartments.filter(c => c.deck === 'upper').sort((a, b) => (a.positionFromBow || 0) - (b.positionFromBow || 0)),
    middle: ship.compartments.filter(c => c.deck === 'middle').sort((a, b) => (a.positionFromBow || 0) - (b.positionFromBow || 0)),
    lower: ship.compartments.filter(c => c.deck === 'lower').sort((a, b) => (a.positionFromBow || 0) - (b.positionFromBow || 0)),
  };
  
  console.log(`📐 ${ship.name}: Всего отсеков: ${ship.compartments.length}`);
  console.log(`  - Палуба: ${compartmentsByDeck.deck.length}`);
  console.log(`  - Верхняя: ${compartmentsByDeck.upper.length}`);
  console.log(`  - Средняя: ${compartmentsByDeck.middle.length}`);
  console.log(`  - Нижняя: ${compartmentsByDeck.lower.length}`);

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
        
        {compartmentsByDeck.deck.length > 0 && (
          <>
            <text x="5" y={25 + superstructureOffset - deckHeight - deckGap} fill="#94a3b8" fontSize="8">Палуба</text>
            {compartmentsByDeck.deck.map((comp, idx) => {
              const x = padding + idx * compartmentWidth;
              const y = 25 + superstructureOffset - deckHeight - deckGap + 5;
              const color = getCompartmentColor(comp);
              
              return (
                <g key={`deck-${comp.id}`}>
                  <rect x={x} y={y} width={compartmentWidth - 1} height={deckHeight}
                    fill={color} opacity={0.6} stroke="#475569" strokeWidth="0.5" />
                  {comp.flooded > 0 && (
                    <g>
                      <circle cx={x + compartmentWidth / 2} cy={y + deckHeight / 2} r={deckHeight * 0.4} fill="#1e40af" opacity="0.8" />
                      <text x={x + compartmentWidth / 2} y={y + deckHeight / 2 + 1} fill="#ffffff" fontSize={deckHeight * 0.7} textAnchor="middle" dominantBaseline="middle">💧</text>
                    </g>
                  )}
                  {comp.fire > 0 && (
                    <g>
                      <circle cx={x + compartmentWidth / 2} cy={y + deckHeight / 2} r={deckHeight * 0.4} fill="#991b1b" opacity="0.8" />
                      <text x={x + compartmentWidth / 2} y={y + deckHeight / 2 + 1} fill="#ffffff" fontSize={deckHeight * 0.7} textAnchor="middle" dominantBaseline="middle">🔥</text>
                    </g>
                  )}
                  {renderHitMarker(x + compartmentWidth / 2, y + deckHeight / 2, getHitMarkersForCompartment(comp.id))}
                </g>
              );
            })}
          </>
        )}

        <text x="5" y={25 + superstructureOffset} fill="#94a3b8" fontSize="8">Верхняя</text>
        {compartmentsByDeck.upper.map((comp, idx) => {
          const x = padding + idx * compartmentWidth;
          const y = 25 + superstructureOffset;
          const color = getCompartmentColor(comp);
          
          return (
            <g key={comp.id}>
              <rect x={x} y={y} width={compartmentWidth - 1} height={deckHeight}
                fill={color} opacity={0.6} stroke="#475569" strokeWidth="0.5" />
              {comp.flooded > 0 && (
                <g>
                  <circle cx={x + compartmentWidth / 2} cy={y + deckHeight / 2} r={deckHeight * 0.4} fill="#1e40af" opacity="0.8" />
                  <text x={x + compartmentWidth / 2} y={y + deckHeight / 2 + 1} fill="#ffffff" fontSize={deckHeight * 0.7} textAnchor="middle" dominantBaseline="middle">💧</text>
                </g>
              )}
              {comp.fire > 0 && (
                <g>
                  <circle cx={x + compartmentWidth / 2} cy={y + deckHeight / 2} r={deckHeight * 0.4} fill="#991b1b" opacity="0.8" />
                  <text x={x + compartmentWidth / 2} y={y + deckHeight / 2 + 1} fill="#ffffff" fontSize={deckHeight * 0.7} textAnchor="middle" dominantBaseline="middle">🔥</text>
                </g>
              )}
              {renderHitMarker(x + compartmentWidth / 2, y + deckHeight / 2, getHitMarkersForCompartment(comp.id))}
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
                    fill={color} opacity={0.6} stroke="#475569" strokeWidth="0.5" />
                  {comp.flooded > 0 && (
                    <g>
                      <circle cx={x + compartmentWidth / 2} cy={y + deckHeight / 2} r={deckHeight * 0.4} fill="#1e40af" opacity="0.8" />
                      <text x={x + compartmentWidth / 2} y={y + deckHeight / 2 + 1} fill="#ffffff" fontSize={deckHeight * 0.7} textAnchor="middle" dominantBaseline="middle">💧</text>
                    </g>
                  )}
                  {comp.fire > 0 && (
                    <g>
                      <circle cx={x + compartmentWidth / 2} cy={y + deckHeight / 2} r={deckHeight * 0.4} fill="#991b1b" opacity="0.8" />
                      <text x={x + compartmentWidth / 2} y={y + deckHeight / 2 + 1} fill="#ffffff" fontSize={deckHeight * 0.7} textAnchor="middle" dominantBaseline="middle">🔥</text>
                    </g>
                  )}
                  {renderHitMarker(x + compartmentWidth / 2, y + deckHeight / 2, getHitMarkersForCompartment(comp.id))}
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
                fill={color} opacity={0.6} stroke="#475569" strokeWidth="0.5" />
              {comp.flooded > 0 && (
                <g>
                  <circle cx={x + compartmentWidth / 2} cy={y + deckHeight / 2} r={deckHeight * 0.4} fill="#1e40af" opacity="0.8" />
                  <text x={x + compartmentWidth / 2} y={y + deckHeight / 2 + 1} fill="#ffffff" fontSize={deckHeight * 0.7} textAnchor="middle" dominantBaseline="middle">💧</text>
                </g>
              )}
              {comp.fire > 0 && (
                <g>
                  <circle cx={x + compartmentWidth / 2} cy={y + deckHeight / 2} r={deckHeight * 0.4} fill="#991b1b" opacity="0.8" />
                  <text x={x + compartmentWidth / 2} y={y + deckHeight / 2 + 1} fill="#ffffff" fontSize={deckHeight * 0.7} textAnchor="middle" dominantBaseline="middle">🔥</text>
                </g>
              )}
              {renderHitMarker(x + compartmentWidth / 2, y + deckHeight / 2, getHitMarkersForCompartment(comp.id))}
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
                fill={color} opacity={0.6} stroke="#475569" strokeWidth="0.5" />
              {comp.flooded > 0 && (
                <g>
                  <circle cx={x + compartmentWidth / 2} cy={y + 15} r={12} fill="#1e40af" opacity="0.8" />
                  <text x={x + compartmentWidth / 2} y={y + 16} fill="#ffffff" fontSize="14" textAnchor="middle" dominantBaseline="middle">💧</text>
                </g>
              )}
              {comp.fire > 0 && (
                <g>
                  <circle cx={x + compartmentWidth / 2} cy={y + 15} r={12} fill="#991b1b" opacity="0.8" />
                  <text x={x + compartmentWidth / 2} y={y + 16} fill="#ffffff" fontSize="14" textAnchor="middle" dominantBaseline="middle">🔥</text>
                </g>
              )}
              {renderHitMarker(x + compartmentWidth / 2, y + 15, getHitMarkersForCompartment(comp.id))}
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
      
      <div className="flex gap-3 text-[9px] justify-center flex-wrap">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{backgroundColor: '#7f1d1d'}}></div>
          <span className="text-slate-400">Вооружение</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{backgroundColor: '#78350f'}}></div>
          <span className="text-slate-400">Боезапас</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{backgroundColor: '#1e3a8a'}}></div>
          <span className="text-slate-400">ГЭУ/Руль/Винты</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{backgroundColor: '#eab308'}}></div>
          <span className="text-slate-400">Мостик/Управление</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{backgroundColor: '#14532d'}}></div>
          <span className="text-slate-400">Остальные</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{backgroundColor: '#374151'}}></div>
          <span className="text-slate-400">Уничтожен</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{backgroundColor: '#d1d5db'}}></div>
          <span className="text-slate-400">Повреждён</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-slate-400">💧 Затопление</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-slate-400">🔥 Пожар</span>
        </div>
      </div>
    </div>
  );
}
