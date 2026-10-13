import { Ship, Compartment, getCompartmentTypeColor } from '../types';

interface BattleShipSchematicProps {
  ship: Ship;
  hitMarkers?: Array<{shipId: number; compartmentId: string; turn: number; damage: number}>;
}

export default function BattleShipSchematic({ ship, hitMarkers = [] }: BattleShipSchematicProps) {
  const shipHitMarkers = hitMarkers.filter(m => m.shipId === ship.id);
  
  // Получаем реальные координаты из compartmentData
  const compartments = ship.compartments as any[];
  
  // Находим границы для масштабирования
  const positions = compartments.map(c => ({
    x: c.gridX || 0,
    y: c.gridY || 0
  }));
  
  const maxX = Math.max(...positions.map(p => p.x), 56);
  const maxY = Math.max(...positions.map(p => p.y), 23);
  
  // Размеры SVG
  const svgWidth = 580;
  const svgHeight = 200;
  const padding = 10;
  
  // Масштабирование
  const scaleX = (svgWidth - padding * 2) / (maxX + 1);
  const scaleY = (svgHeight - padding * 2) / (maxY + 1);
  
  const getCompartmentColor = (comp: Compartment) => {
    return getCompartmentTypeColor(comp.type, comp.status);
  };
  
  const getHitMarkersForCompartment = (compId: string) => {
    return shipHitMarkers.filter(m => m.compartmentId === compId);
  };
  
  return (
    <svg width={svgWidth} height={svgHeight} className="border border-slate-700 rounded bg-slate-900/50">
      {/* Отображаем отсеки в их реальных позициях */}
      {compartments.map((comp, idx) => {
        const posX = (comp.gridX || 0) * scaleX + padding;
        const posY = (comp.gridY || 0) * scaleY + padding;
        
        const compWidth = scaleX * 0.9;
        const compHeight = scaleY * 0.9;
        
        const color = getCompartmentColor(comp);
        const hits = getHitMarkersForCompartment(comp.id);
        
        return (
          <g key={comp.id}>
            {/* Базовый прямоугольник отсека */}
            <rect
              x={posX}
              y={posY}
              width={compWidth}
              height={compHeight}
              fill={color}
              opacity={0.8}
              stroke="#475569"
              strokeWidth="0.5"
            />
            
            {/* Иконка затопления */}
            {comp.flooded > 0 && (
              <g>
                <circle cx={posX + compWidth / 2} cy={posY + compHeight / 2} r={compHeight * 0.3} fill="#1e40af" opacity="0.8" />
                <text x={posX + compWidth / 2} y={posY + compHeight / 2 + 1} fill="#ffffff" fontSize={compHeight * 0.5} textAnchor="middle" dominantBaseline="middle" style={{pointerEvents: 'none'}}>💧</text>
              </g>
            )}
            
            {/* Иконка пожара */}
            {comp.fire > 0 && (
              <g>
                <circle cx={posX + compWidth / 2} cy={posY + compHeight / 2} r={compHeight * 0.3} fill="#991b1b" opacity="0.8" />
                <text x={posX + compWidth / 2} y={posY + compHeight / 2 + 1} fill="#ffffff" fontSize={compHeight * 0.5} textAnchor="middle" dominantBaseline="middle" style={{pointerEvents: 'none'}}>🔥</text>
              </g>
            )}
            
            {/* Маркеры попаданий */}
            {hits.length > 0 && (
              <g>
                <circle cx={posX + compWidth * 0.8} cy={posY + compHeight * 0.2} r={compHeight * 0.25} fill="#dc2626" stroke="#fff" strokeWidth="1" opacity="0.9" />
                <text x={posX + compWidth * 0.8} y={posY + compHeight * 0.2 + 1} fill="#fff" fontSize={compHeight * 0.3} textAnchor="middle" dominantBaseline="middle" fontWeight="bold">
                  {hits.length}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}
