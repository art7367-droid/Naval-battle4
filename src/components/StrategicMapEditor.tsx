import { useState, useRef } from 'react';
import { StrategicMapData } from '../types/shipDatabase';

interface StrategicMapEditorProps {
  strategicMapData?: StrategicMapData;
  onUpdate: (data: StrategicMapData) => void;
}

export default function StrategicMapEditor({ strategicMapData, onUpdate }: StrategicMapEditorProps) {
  const [mapTiles, setMapTiles] = useState<Array<{ id: number; imageData: string; row: number; col: number }>>(
    strategicMapData?.tiles || []
  );
  
  const mapWidth = strategicMapData?.mapWidth || 9703;
  const mapHeight = strategicMapData?.mapHeight || 7767;
  const cols = 7;
  const rows = 6;
  const tileWidth = mapWidth / cols;
  const tileHeight = mapHeight / rows;
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentTileIndex, setCurrentTileIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOverTile, setDragOverTile] = useState<number | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageData = event.target?.result as string;
        
        // Извлекаем номер из имени файла (00-41)
        const match = file.name.match(/(\d{2})/);
        if (match) {
          const tileId = parseInt(match[1]);
          if (tileId >= 0 && tileId < 42) {
            const row = Math.floor(tileId / cols);
            const col = tileId % cols;
            
            setMapTiles(prev => {
              const existing = prev.findIndex(t => t.id === tileId);
              if (existing >= 0) {
                const updated = [...prev];
                updated[existing] = { id: tileId, imageData, row, col };
                return updated;
              } else {
                return [...prev, { id: tileId, imageData, row, col }];
              }
            });
          }
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDrop = (e: React.DragEvent, tileId: number) => {
    e.preventDefault();
    setIsDragging(false);
    setDragOverTile(null);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageData = event.target?.result as string;
        const row = Math.floor(tileId / cols);
        const col = tileId % cols;
        
        setMapTiles(prev => {
          const existing = prev.findIndex(t => t.id === tileId);
          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = { id: tileId, imageData, row, col };
            return updated;
          } else {
            return [...prev, { id: tileId, imageData, row, col }];
          }
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent, tileId: number) => {
    e.preventDefault();
    setIsDragging(true);
    setDragOverTile(tileId);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
    setDragOverTile(null);
  };

  const handleSave = () => {
    onUpdate({
      tiles: mapTiles,
      mapWidth,
      mapHeight,
      tileWidth,
      tileHeight
    });
  };

  const handleClear = () => {
    if (confirm('Очистить все изображения карты?')) {
      setMapTiles([]);
    }
  };

  return (
    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-600">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-cyan-300">🗺️ Редактор стратегической карты</h3>
        <div className="flex gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
          >
            📁 Загрузить изображения
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-sm"
          >
            💾 Сохранить
          </button>
          <button
            onClick={handleClear}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-sm"
          >
            🗑️ Очистить
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="mb-4 text-sm text-slate-400">
        <p>Размер карты: {mapWidth} × {mapHeight} пикселей</p>
        <p>Размер тайла: {Math.round(tileWidth)} × {Math.round(tileHeight)} пикселей</p>
        <p>Загружено: {mapTiles.length} из 42 изображений</p>
        <p className="mt-2 text-xs">
          💡 Перетащите файлы на нужные ячейки или используйте кнопку загрузки. 
          Файлы должны содержать номер от 00 до 41 в имени.
        </p>
      </div>

      <div 
        className="relative border border-slate-700 rounded overflow-auto bg-slate-900/50"
        style={{ maxHeight: '600px' }}
      >
        <div 
          className="relative"
          style={{ 
            width: `${cols * 150}px`,
            height: `${rows * 150}px`
          }}
        >
          {Array.from({ length: 42 }).map((_, idx) => {
            const row = Math.floor(idx / cols);
            const col = idx % cols;
            const tile = mapTiles.find(t => t.id === idx);
            const isHovered = dragOverTile === idx;
            
            return (
              <div
                key={idx}
                className={`absolute border-2 transition-all ${
                  isHovered 
                    ? 'border-cyan-400 bg-cyan-500/20' 
                    : tile 
                    ? 'border-green-600' 
                    : 'border-slate-600 hover:border-slate-500'
                }`}
                style={{
                  left: `${col * 150}px`,
                  top: `${row * 150}px`,
                  width: '150px',
                  height: '150px'
                }}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, idx)}
              >
                {tile ? (
                  <img
                    src={tile.imageData}
                    alt={`Tile ${idx}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">
                    <div className="text-center">
                      <div className="text-2xl mb-1">{String(idx).padStart(2, '0')}</div>
                      <div className="text-[10px]">Ряд {row + 1}, Кол {col + 1}</div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 text-xs text-slate-500">
        <p className="font-semibold mb-2">Расположение тайлов:</p>
        <div className="grid grid-cols-7 gap-1 text-center">
          {Array.from({ length: 42 }).map((_, idx) => {
            const tile = mapTiles.find(t => t.id === idx);
            return (
              <div 
                key={idx}
                className={`p-1 rounded text-[10px] ${
                  tile ? 'bg-green-900/50 text-green-300' : 'bg-slate-900/50 text-slate-500'
                }`}
              >
                {String(idx).padStart(2, '0')}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
