import { useState } from 'react';
import { Ship } from './types';
import ShipSchematic from './ShipSchematic';
import ImageUploader from './ImageUploader';
import ShipEditor from './ShipEditor';
import PresetImage from './PresetImage';
import CompartmentLayerEditor from './CompartmentLayerEditor';
import GridCompartmentEditor from './GridCompartmentEditor';

type ViewMode = 'schematic' | 'upload' | 'preset' | 'editor' | 'layerEditor' | 'gridEditor';

interface ShipDetailViewProps {
  ship: Ship | null;
}

export default function ShipDetailView({ ship }: ShipDetailViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('schematic');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);

  if (!ship) {
    return (
      <div className="w-[498px] h-full bg-slate-800/50 rounded-lg p-3 border border-slate-600 flex flex-col overflow-hidden">
        <div className="text-center text-slate-400 mt-20">
          <div className="text-4xl mb-2">🚢</div>
          <div>Выберите корабль для просмотра деталей</div>
        </div>
      </div>
    );
  }

  const renderView = () => {
    switch (viewMode) {
      case 'schematic': return <ShipSchematic ship={ship} backgroundImage={backgroundImage} />;
      case 'upload': return <ImageUploader onImageLoad={setUploadedImage} currentImage={uploadedImage} />;
      case 'preset': return <PresetImage ship={ship} />;
      case 'editor': return <ShipEditor compartments={ship.compartments} onCompartmentsChange={() => {}} />;
      case 'layerEditor': return <CompartmentLayerEditor ship={ship} backgroundImage={backgroundImage} onBackgroundImageChange={setBackgroundImage} compartments={ship.compartments} onCompartmentsChange={() => {}} />;
      case 'gridEditor': return <GridCompartmentEditor ship={ship} backgroundImage={backgroundImage} onBackgroundImageChange={setBackgroundImage} compartments={ship.compartments} onCompartmentsChange={() => {}} />;
      default: return <ShipSchematic ship={ship} backgroundImage={backgroundImage} />;
    }
  };

  const allEffects: { name: string; effect: string; severity: 'damaged' | 'destroyed' }[] = [];
  ship.compartments.forEach(comp => {
    comp.components.forEach(component => {
      if (component.status !== 'operational') {
        allEffects.push({ name: component.name, effect: component.effect, severity: component.status });
      }
    });
    if (comp.status === 'flooded') {
      allEffects.push({ name: `${comp.name} (затоплен)`, effect: 'Снижает плавучесть', severity: 'damaged' });
    }
  });

  return (
    <div className="w-[498px] bg-slate-800/50 rounded-lg p-3 border border-slate-600 flex flex-col overflow-hidden">
      <div className="text-center mb-2 flex-shrink-0">
        <h3 className="text-base font-bold text-cyan-300">
          {ship.type === 'battleship' ? '🚢' : ship.type === 'cruiser' ? '⛴️' : '🚤'} {ship.name}
          {ship.isSunk && <span className="ml-2 text-red-400">☠️ ПОТОПЛЕН</span>}
        </h3>
        <div className="text-xs text-slate-400">
          HP: {ship.currentHP}/{ship.maxHP}
          {ship.stats.fires > 0 && <span className="ml-2 text-orange-400">🔥 {ship.stats.fires} пожар(ов)</span>}
          {ship.stats.flooding > 0 && <span className="ml-2 text-blue-400">🌊 Затопление {Math.round(ship.stats.flooding * 100)}%</span>}
        </div>
      </div>

      <div className="flex gap-1 mb-2 bg-slate-900/50 p-1 rounded flex-wrap">
        <button onClick={() => setViewMode('schematic')} className={`flex-1 px-2 py-1 rounded text-xs ${viewMode === 'schematic' ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-300'}`}>📐 Схема</button>
        <button onClick={() => setViewMode('upload')} className={`flex-1 px-2 py-1 rounded text-xs ${viewMode === 'upload' ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-300'}`}>📁 Загрузка</button>
        <button onClick={() => setViewMode('preset')} className={`flex-1 px-2 py-1 rounded text-xs ${viewMode === 'preset' ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-300'}`}>🖼️ Готовое</button>
        <button onClick={() => setViewMode('editor')} className={`flex-1 px-2 py-1 rounded text-xs ${viewMode === 'editor' ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-300'}`}>✏️ Редактор</button>
        <button onClick={() => setViewMode('layerEditor')} className={`flex-1 px-2 py-1 rounded text-xs ${viewMode === 'layerEditor' ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-300'}`}>🎨 Слои</button>
        <button onClick={() => setViewMode('gridEditor')} className={`flex-1 px-2 py-1 rounded text-xs ${viewMode === 'gridEditor' ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-300'}`}>🔲 Сетка</button>
      </div>

      <div className="mb-2 flex-shrink-0">{renderView()}</div>

      <div className="mb-2 p-2 bg-slate-900/50 rounded border border-slate-700 flex-shrink-0">
        <div className="text-[10px] font-bold text-slate-300 mb-1">📊 ХАРАКТЕРИСТИКИ:</div>
        <div className="grid grid-cols-2 gap-1 text-[9px]">
          <div className="flex justify-between"><span className="text-slate-400">Скорость:</span><span className={ship.stats.speed < 0.7 ? 'text-orange-400' : 'text-green-400'}>{Math.round(ship.stats.speed * 100)}%</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Управл.:</span><span className={ship.stats.maneuverability < 0.7 ? 'text-orange-400' : 'text-green-400'}>{Math.round(ship.stats.maneuverability * 100)}%</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Огонь ГК:</span><span className={ship.stats.mainGunFire < 0.7 ? 'text-orange-400' : 'text-green-400'}>{Math.round(ship.stats.mainGunFire * 100)}%</span></div>
          <div className="flex justify-between"><span className="text-slate-400">ПВО:</span><span className={ship.stats.aaFire < 0.7 ? 'text-orange-400' : 'text-green-400'}>{Math.round(ship.stats.aaFire * 100)}%</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Плавуч.:</span><span className={ship.stats.buoyancy < 0.7 ? 'text-red-400' : 'text-green-400'}>{Math.round(ship.stats.buoyancy * 100)}%</span></div>
        </div>
      </div>

      <div className="border-t border-slate-700 pt-2 flex-shrink-0">
        <h4 className="text-[10px] font-semibold text-slate-400 mb-1">⚠️ КРИТИЧЕСКИЕ ПОВРЕЖДЕНИЯ:</h4>
        <div className="space-y-0.5 max-h-[80px] overflow-y-auto">
          {allEffects.length > 0 ? (
            allEffects.map((effect, idx) => (
              <div key={idx} className="text-[9px]">
                <span className={effect.severity === 'destroyed' ? 'text-red-400' : 'text-orange-400'}>• {effect.name}:</span>
                <span className="text-slate-300 ml-1">{effect.effect}</span>
              </div>
            ))
          ) : (
            <div className="text-[9px] text-green-400">✓ Все системы работают нормально</div>
          )}
        </div>
      </div>
    </div>
  );
}
