import { Ship, Compartment, getCompartmentTypeColor } from '../types';

interface BattleShipSchematicProps {
  ship: Ship;
  hitMarkers?: Array<{shipId: number; compartmentId: string; turn: number; damage: number}>;
}

export default function BattleShipSchematic({ ship, hitMarkers = [] }: BattleShipSchematicProps) {
  const shipHitMarkers = hitMarkers.filter(m => m.shipId === ship.id);
  
  // Получаем реальные координаты из compartmentData
  const compartments = ship.compartments as any[];
  
  // Используем те же размеры что и в базе данных
  const cols = 56;
  const rows = 23;
  const padding = 20;
  
  // Высота SVG = высота картинки + 40px для линейки
  const imageHeight = 116; // Размер картинки Ямато
  const svgWidth = cols * 12 + padding * 2; // 712px
  const svgHeight = imageHeight + 40; // 156px
  
  // gridSize вычисляется автоматически на основе высоты (минимум 6px для читаемости)
  const gridSize = Math.max(6, Math.min(12, (svgHeight - 40 - padding * 2) / rows));
  
  // Пересчитываем реальную высоту SVG на основе gridSize
  const actualSvgHeight = gridSize * rows + padding * 2 + 40;
  
  const getCompartmentColor = (comp: Compartment) => {
    return getCompartmentTypeColor(comp.type, comp.status);
  };
  
  const getHitMarkersForCompartment = (compId: string) => {
    return shipHitMarkers.filter(m => m.compartmentId === compId);
  };
  
  return (
    <svg width={svgWidth} height={actualSvgHeight} className="border border-slate-700 rounded bg-slate-900/50">
      {/* Определяем область для изображения (между padding и линейкой) */}
      <defs>
        <clipPath id={`image-clip-${ship.id}`}>
          <rect x={padding} y={padding} width={svgWidth - padding * 2} height={actualSvgHeight - padding * 2 - 40} />
        </clipPath>
      </defs>
      
      {/* Фоновое изображение корабля - оригинальный размер, привязано к сетке, заблокировано */}
      {ship.backgroundImage && (
        <g clipPath={`url(#image-clip-${ship.id})`}>
          <image 
            href={ship.backgroundImage} 
            x={ship.backgroundPosition?.x || padding} 
            y={ship.backgroundPosition?.y || padding} 
            opacity={0.6}
            style={{ pointerEvents: 'none' }}
          />
        </g>
      )}
      
      {/* Отображаем отсеки в их реальных позициях */}
      {compartments.map((comp, idx) => {
        const posX = (comp.gridX || 0) * gridSize + padding;
        const posY = (comp.gridY || 0) * gridSize + padding;
        
        const compWidth = gridSize * 0.9;
        const compHeight = gridSize * 0.9;
        
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
              opacity={0.6}
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
      
      {/* Линейка снизу */}
      <g>
        <line x1={padding} y1={actualSvgHeight - 30} x2={svgWidth - padding} y2={actualSvgHeight - 30} stroke="#94a3b8" strokeWidth="1" />
        {Array.from({ length: Math.floor(cols / 4) + 1 }).map((_, i) => {
          const x = padding + i * 4 * gridSize;
          const meters = i * 20;
          return (
            <g key={`ruler-${i}`}>
              <line x1={x} y1={actualSvgHeight - 34} x2={x} y2={actualSvgHeight - 26} stroke="#94a3b8" strokeWidth="1" />
              <text x={x} y={actualSvgHeight - 16} fill="#94a3b8" fontSize="7" textAnchor="middle">{meters}м</text>
            </g>
          );
        })}
        {Array.from({ length: cols + 1 }).map((_, i) => {
          if (i % 4 === 0) return null;
          const x = padding + i * gridSize;
          return <line key={`tick-${i}`} x1={x} y1={actualSvgHeight - 32} x2={x} y2={actualSvgHeight - 28} stroke="#64748b" strokeWidth="0.5" />;
        })}
        <text x={svgWidth / 2} y={actualSvgHeight - 5} fill="#64748b" fontSize="8" textAnchor="middle">1 клетка = 5м | Всего: {cols * 5}м</text>
      </g>
    </svg>
  );
}
