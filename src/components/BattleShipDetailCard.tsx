import { Ship, Compartment, getCompartmentTypeColor, getCompartmentTypeName } from '../types';

interface BattleShipDetailCardProps {
  ship: Ship | null;
  hitMarkers?: Array<{shipId: number; compartmentId: string; turn: number; damage: number}>;
}

export default function BattleShipDetailCard({ ship, hitMarkers = [] }: BattleShipDetailCardProps) {
  if (!ship) {
    return (
      <div className="w-[600px] bg-slate-800/50 rounded-lg p-4 border border-slate-600">
        <div className="text-center text-slate-400 py-8">
          <div className="text-4xl mb-2">🚢</div>
          <div>Выберите корабль для просмотра деталей</div>
        </div>
      </div>
    );
  }

  const shipHitMarkers = hitMarkers.filter(m => m.shipId === ship.id);
  const totalDamage = shipHitMarkers.reduce((sum, m) => sum + m.damage, 0);

  // Группируем отсеки по палубам
  const compartmentsByDeck = {
    deck: ship.compartments.filter(c => c.deck === 'deck').sort((a, b) => (a.positionFromBow || 0) - (b.positionFromBow || 0)),
    upper: ship.compartments.filter(c => c.deck === 'upper').sort((a, b) => (a.positionFromBow || 0) - (b.positionFromBow || 0)),
    middle: ship.compartments.filter(c => c.deck === 'middle').sort((a, b) => (a.positionFromBow || 0) - (b.positionFromBow || 0)),
    lower: ship.compartments.filter(c => c.deck === 'lower').sort((a, b) => (a.positionFromBow || 0) - (b.positionFromBow || 0)),
  };

  const getCompartmentColor = (comp: Compartment) => {
    return getCompartmentTypeColor(comp.type, comp.status);
  };

  const getHitMarkersForCompartment = (compId: string) => {
    return shipHitMarkers.filter(m => m.compartmentId === compId);
  };

  const renderCompartment = (comp: Compartment, idx: number, total: number) => {
    const compWidth = 100 / total;
    const hits = getHitMarkersForCompartment(comp.id);
    const color = getCompartmentColor(comp);
    
    return (
      <div
        key={comp.id}
        className="relative border border-slate-600 rounded"
        style={{
          width: `${compWidth}%`,
          height: '40px',
          backgroundColor: color,
          opacity: 0.8
        }}
        title={`${comp.name} (${getCompartmentTypeName(comp.type)})\nСтатус: ${comp.status}\nHP: ${comp.currentHP}/${comp.maxHP}${comp.flooded > 0 ? `\nЗатопление: ${Math.round(comp.flooded * 100)}%` : ''}${comp.fire > 0 ? `\nПожар: ${Math.round(comp.fire * 100)}%` : ''}${hits.length > 0 ? `\nПопаданий: ${hits.length}` : ''}`}
      >
        {/* Иконка затопления */}
        {comp.flooded > 0 && (
          <div className="absolute top-0 left-0 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center text-xs">
            💧
          </div>
        )}
        
        {/* Иконка пожара */}
        {comp.fire > 0 && (
          <div className="absolute top-0 right-0 w-4 h-4 bg-red-600 rounded-full flex items-center justify-center text-xs">
            🔥
          </div>
        )}
        
        {/* Маркеры попаданий */}
        {hits.length > 0 && (
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 bg-red-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold text-white border border-white">
            {hits.length}
          </div>
        )}
        
        {/* Название отсека */}
        <div className="absolute inset-0 flex items-center justify-center text-[8px] text-white font-semibold pointer-events-none overflow-hidden">
          {comp.name.length > 15 ? comp.name.substring(0, 12) + '...' : comp.name}
        </div>
      </div>
    );
  };

  return (
    <div className="w-[600px] bg-slate-800/50 rounded-lg p-4 border border-slate-600">
      {/* Заголовок */}
      <div className="text-center mb-3">
        <h3 className="text-lg font-bold text-cyan-300">
          {ship.type === 'battleship' ? '🚢' : ship.type === 'cruiser' ? '⛴️' : '🚤'} {ship.name}
          {ship.isSunk && <span className="ml-2 text-red-400">☠️ ПОТОПЛЕН</span>}
        </h3>
        <div className="text-xs text-slate-400">
          HP: {ship.currentHP}/{ship.maxHP}
          {ship.stats.fires > 0 && <span className="ml-2 text-orange-400">🔥 {ship.stats.fires} пожар(ов)</span>}
          {ship.stats.flooding > 0 && <span className="ml-2 text-blue-400">🌊 Затопление {Math.round(ship.stats.flooding * 100)}%</span>}
        </div>
      </div>

      {/* Схема отсеков */}
      <div className="mb-3 p-2 bg-slate-900/50 rounded border border-slate-700">
        <div className="text-xs font-bold text-slate-300 mb-2">📐 Схема отсеков:</div>
        
        {/* Палуба */}
        {compartmentsByDeck.deck.length > 0 && (
          <div className="mb-2">
            <div className="text-[10px] text-slate-400 mb-1">Палуба:</div>
            <div className="flex gap-1">
              {compartmentsByDeck.deck.map((comp, idx) => renderCompartment(comp, idx, compartmentsByDeck.deck.length))}
            </div>
          </div>
        )}
        
        {/* Верхняя палуба */}
        {compartmentsByDeck.upper.length > 0 && (
          <div className="mb-2">
            <div className="text-[10px] text-slate-400 mb-1">Верхняя палуба:</div>
            <div className="flex gap-1">
              {compartmentsByDeck.upper.map((comp, idx) => renderCompartment(comp, idx, compartmentsByDeck.upper.length))}
            </div>
          </div>
        )}
        
        {/* Средняя палуба */}
        {compartmentsByDeck.middle.length > 0 && (
          <div className="mb-2">
            <div className="text-[10px] text-slate-400 mb-1">Средняя палуба:</div>
            <div className="flex gap-1">
              {compartmentsByDeck.middle.map((comp, idx) => renderCompartment(comp, idx, compartmentsByDeck.middle.length))}
            </div>
          </div>
        )}
        
        {/* Нижняя палуба */}
        {compartmentsByDeck.lower.length > 0 && (
          <div className="mb-2">
            <div className="text-[10px] text-slate-400 mb-1">Нижняя палуба:</div>
            <div className="flex gap-1">
              {compartmentsByDeck.lower.map((comp, idx) => renderCompartment(comp, idx, compartmentsByDeck.lower.length))}
            </div>
          </div>
        )}
      </div>

      {/* Характеристики */}
      <div className="mb-3 p-2 bg-slate-900/50 rounded border border-slate-700">
        <div className="text-xs font-bold text-slate-300 mb-1">📊 ХАРАКТЕРИСТИКИ:</div>
        <div className="grid grid-cols-2 gap-1 text-[10px]">
          <div className="flex justify-between">
            <span className="text-slate-400">Скорость:</span>
            <span className={ship.stats.speed < 0.7 ? 'text-orange-400' : 'text-green-400'}>
              {Math.round(ship.stats.speed * 100)}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Управл.:</span>
            <span className={ship.stats.maneuverability < 0.7 ? 'text-orange-400' : 'text-green-400'}>
              {Math.round(ship.stats.maneuverability * 100)}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Огонь ГК:</span>
            <span className={ship.stats.mainGunFire < 0.7 ? 'text-orange-400' : 'text-green-400'}>
              {Math.round(ship.stats.mainGunFire * 100)}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">ПВО:</span>
            <span className={ship.stats.aaFire < 0.7 ? 'text-orange-400' : 'text-green-400'}>
              {Math.round(ship.stats.aaFire * 100)}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Плавуч.:</span>
            <span className={ship.stats.buoyancy < 0.7 ? 'text-red-400' : 'text-green-400'}>
              {Math.round(ship.stats.buoyancy * 100)}%
            </span>
          </div>
        </div>
        
        {/* Статистика попаданий */}
        {shipHitMarkers.length > 0 && (
          <div className="mt-2 pt-2 border-t border-slate-700">
            <div className="text-[10px] font-bold text-red-400 mb-1">🎯 ПОПАДАНИЯ:</div>
            <div className="grid grid-cols-2 gap-1 text-[10px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Всего попаданий:</span>
                <span className="text-red-400">{shipHitMarkers.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Общий урон:</span>
                <span className="text-red-400">{totalDamage}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Критические повреждения */}
      <div className="p-2 bg-slate-900/50 rounded border border-slate-700">
        <div className="text-xs font-bold text-slate-300 mb-1">⚠️ СОСТОЯНИЕ ОТСЕКОВ:</div>
        <div className="space-y-1 max-h-[150px] overflow-y-auto">
          {ship.compartments.map(comp => {
            const hits = getHitMarkersForCompartment(comp.id);
            const hasDamage = comp.status !== 'intact' || comp.fire > 0 || comp.flooded > 0 || hits.length > 0;
            
            if (!hasDamage) return null;
            
            return (
              <div key={comp.id} className="text-[9px] flex items-start gap-2">
                <div 
                  className="w-3 h-3 rounded flex-shrink-0 mt-0.5"
                  style={{backgroundColor: getCompartmentColor(comp)}}
                ></div>
                <div className="flex-1">
                  <span className="text-slate-300 font-semibold">{comp.name}</span>
                  <span className="text-slate-500 ml-1">({getCompartmentTypeName(comp.type)})</span>
                  <div className="text-slate-400 ml-2">
                    {comp.status === 'destroyed' && <span className="text-red-400">Уничтожен</span>}
                    {comp.status === 'damaged' && <span className="text-orange-400">Повреждён</span>}
                    {comp.flooded > 0 && <span className="text-blue-400 ml-1">💧 {Math.round(comp.flooded * 100)}%</span>}
                    {comp.fire > 0 && <span className="text-orange-400 ml-1">🔥 {Math.round(comp.fire * 100)}%</span>}
                    {hits.length > 0 && <span className="text-red-400 ml-1">🎯 {hits.length} попаданий</span>}
                  </div>
                </div>
              </div>
            );
          })}
          
          {ship.compartments.every(c => c.status === 'intact' && c.fire === 0 && c.flooded === 0) && (
            <div className="text-[9px] text-green-400">✓ Все отсеки в норме</div>
          )}
        </div>
      </div>

      {/* Легенда */}
      <div className="mt-3 p-2 bg-slate-900/30 rounded border border-slate-700">
        <div className="text-[9px] font-bold text-slate-400 mb-1">Легенда:</div>
        <div className="grid grid-cols-3 gap-1 text-[8px]">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded" style={{backgroundColor: '#7f1d1d'}}></div>
            <span className="text-slate-400">Вооружение</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded" style={{backgroundColor: '#78350f'}}></div>
            <span className="text-slate-400">Боезапас</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded" style={{backgroundColor: '#1e3a8a'}}></div>
            <span className="text-slate-400">ГЭУ/Руль</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded" style={{backgroundColor: '#eab308'}}></div>
            <span className="text-slate-400">Мостик</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded" style={{backgroundColor: '#14532d'}}></div>
            <span className="text-slate-400">Остальные</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded" style={{backgroundColor: '#374151'}}></div>
            <span className="text-slate-400">Уничтожен</span>
          </div>
        </div>
      </div>
    </div>
  );
}
