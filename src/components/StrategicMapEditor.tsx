import { useState, useRef } from 'react';
import { StrategicMapData } from '../types/shipDatabase';
import { saveToIndexedDB, deleteFromIndexedDB } from '../utils/indexedDB';

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
  
  // Размеры тайлов
  const standardTileWidth = 1500;
  const standardTileHeight = 1500;
  const lastColumnWidth = 703; // Для тайлов 06, 13, 20, 27, 34
  const lastRowHeight = 267; // Для тайлов 35-41
  
  // Функция для определения размера тайла по его ID
  const getTileSize = (tileId: number) => {
    const row = Math.floor(tileId / cols);
    const col = tileId % cols;
    
    const isLastColumn = col === 6;
    const isLastRow = row === 5;
    
    return {
      width: isLastColumn ? lastColumnWidth : standardTileWidth,
      height: isLastRow ? lastRowHeight : standardTileHeight
    };
  };
  
  // Функция для определения позиции тайла
  const getTilePosition = (tileId: number) => {
    const row = Math.floor(tileId / cols);
    const col = tileId % cols;
    
    let x = 0;
    for (let c = 0; c < col; c++) {
      x += (c === 6 ? lastColumnWidth : standardTileWidth);
    }
    
    let y = 0;
    for (let r = 0; r < row; r++) {
      y += (r === 5 ? lastRowHeight : standardTileHeight);
    }
    
    return { x, y };
  };
  
  // Масштаб для отображения в редакторе
  const displayScale = 0.15; // 15% от оригинального размера
  const tileWidth = mapWidth / cols;
  const tileHeight = mapHeight / rows;
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const hexSampleInputRef = useRef<HTMLInputElement>(null);
  const [currentTileIndex, setCurrentTileIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOverTile, setDragOverTile] = useState<number | null>(null);
  const [hexSample, setHexSample] = useState<string | undefined>(strategicMapData?.hexSample);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = async (event) => {
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
              let updated;
              if (existing >= 0) {
                updated = [...prev];
                updated[existing] = { id: tileId, imageData, row, col };
              } else {
                updated = [...prev, { id: tileId, imageData, row, col }];
              }
              
              // Автоматическое сохранение в IndexedDB
              const tilesWithSizes = updated.map(tile => {
                const size = getTileSize(tile.id);
                return {
                  ...tile,
                  width: size.width,
                  height: size.height
                };
              });
              
              const dataToSave: StrategicMapData = {
                tiles: tilesWithSizes,
                mapWidth,
                mapHeight,
                tileWidth,
                tileHeight
              };
              
              saveToIndexedDB(dataToSave)
                .then(() => {
                  console.log(`✅ Тайл ${String(tileId).padStart(2, '0')} сохранён в IndexedDB`);
                })
                .catch((error) => {
                  console.error('❌ Ошибка сохранения в IndexedDB:', error);
                  alert('Ошибка сохранения данных. Проверьте консоль для деталей.');
                });
              
              return updated;
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
          let updated;
          if (existing >= 0) {
            updated = [...prev];
            updated[existing] = { id: tileId, imageData, row, col };
          } else {
            updated = [...prev, { id: tileId, imageData, row, col }];
          }
          
          // Автоматическое сохранение в IndexedDB
          const tilesWithSizes = updated.map(tile => {
            const size = getTileSize(tile.id);
            return {
              ...tile,
              width: size.width,
              height: size.height
            };
          });
          
          const dataToSave: StrategicMapData = {
            tiles: tilesWithSizes,
            mapWidth,
            mapHeight,
            tileWidth,
            tileHeight
          };
          
          saveToIndexedDB(dataToSave)
            .then(() => {
              console.log(`✅ Тайл ${String(tileId).padStart(2, '0')} сохранён в IndexedDB`);
            })
            .catch((error) => {
              console.error('❌ Ошибка сохранения в IndexedDB:', error);
              alert('Ошибка сохранения данных. Проверьте консоль для деталей.');
            });
          
          return updated;
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

  const handleSave = async () => {
    const tilesWithSizes = mapTiles.map(tile => {
      const size = getTileSize(tile.id);
      return {
        ...tile,
        width: size.width,
        height: size.height
      };
    });
    
    const dataToSave: StrategicMapData = {
      tiles: tilesWithSizes,
      mapWidth,
      mapHeight,
      tileWidth,
      tileHeight,
      hexSample: hexSample
    };
    
    try {
      await saveToIndexedDB(dataToSave);
      console.log(`✅ Данные сохранены в IndexedDB`);
      
      onUpdate(dataToSave);
      alert(`✅ Карта сохранена в IndexedDB!\nТайлов: ${tilesWithSizes.length}\n\nIndexedDB поддерживает большие объёмы данных (до нескольких ГБ).`);
    } catch (error) {
      console.error('❌ Ошибка сохранения:', error);
      alert('❌ Ошибка сохранения данных. Проверьте консоль для деталей.');
    }
  };

  const handleClear = async () => {
    if (confirm('Очистить все изображения карты?')) {
      try {
        await deleteFromIndexedDB();
        setMapTiles([]);
        setHexSample(undefined);
        console.log('✅ Данные очищены из IndexedDB');
      } catch (error) {
        console.error('❌ Ошибка очистки:', error);
        alert('Ошибка очистки данных');
      }
    }
  };

  const handleExport = () => {
    const tilesWithSizes = mapTiles.map(tile => {
      const size = getTileSize(tile.id);
      return {
        ...tile,
        width: size.width,
        height: size.height
      };
    });
    
    const dataToExport: StrategicMapData = {
      tiles: tilesWithSizes,
      mapWidth,
      mapHeight,
      tileWidth,
      tileHeight,
      hexSample: hexSample
    };
    
    const jsonData = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'strategic-map-data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log('✅ Данные экспортированы в файл');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string) as StrategicMapData;
        if (data.tiles && Array.isArray(data.tiles)) {
          setMapTiles(data.tiles);
          if (data.hexSample) {
            setHexSample(data.hexSample);
          }
          await saveToIndexedDB(data);
          console.log(`✅ Импортировано ${data.tiles.length} тайлов в IndexedDB`);
          alert(`✅ Импортировано ${data.tiles.length} тайлов`);
        } else {
          alert('❌ Неверный формат файла');
        }
      } catch (error) {
        console.error('❌ Ошибка импорта:', error);
        alert('❌ Ошибка чтения файла');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Сброс input для повторного импорта того же файла
  };

  const handleHexSampleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      const originalImageData = event.target?.result as string;
      
      // Обрабатываем изображение: удаляем белый фон
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          console.error('❌ Не удалось получить контекст canvas');
          return;
        }
        
        // Рисуем оригинальное изображение
        ctx.drawImage(img, 0, 0);
        
        // Получаем данные пикселей
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Проходим по всем пикселям и делаем белые прозрачными
        // Белый цвет: R=255, G=255, B=255
        // Порог для определения "белого" (можно настроить)
        const whiteThreshold = 240;
        
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          // Если пиксель близок к белому, делаем его прозрачным
          if (r > whiteThreshold && g > whiteThreshold && b > whiteThreshold) {
            data[i + 3] = 0; // Alpha = 0 (полностью прозрачный)
          }
        }
        
        // Возвращаем обработанные данные обратно в canvas
        ctx.putImageData(imageData, 0, 0);
        
        // Получаем обработанное изображение как data URL
        const processedImageData = canvas.toDataURL('image/png');
        
        setHexSample(processedImageData);
        
        // Сохраняем с образцом
        const tilesWithSizes = mapTiles.map(tile => {
          const size = getTileSize(tile.id);
          return {
            ...tile,
            width: size.width,
            height: size.height
          };
        });
        
        const dataToSave: StrategicMapData = {
          tiles: tilesWithSizes,
          mapWidth,
          mapHeight,
          tileWidth,
          tileHeight,
          hexSample: processedImageData
        };
        
        try {
          await saveToIndexedDB(dataToSave);
          console.log('✅ Образец гекса обработан и сохранён в IndexedDB (белый фон удалён)');
          alert('✅ Образец гекса загружен!\nБелый фон автоматически удалён.');
        } catch (error) {
          console.error('❌ Ошибка сохранения образца:', error);
          alert('❌ Ошибка сохранения образца');
        }
      };
      
      img.onerror = () => {
        console.error('❌ Ошибка загрузки изображения');
        alert('❌ Ошибка загрузки изображения');
      };
      
      img.src = originalImageData;
    };
    
    reader.onerror = () => {
      console.error('❌ Ошибка чтения файла');
      alert('❌ Ошибка чтения файла');
    };
    
    reader.readAsDataURL(file);
    e.target.value = ''; // Сброс input
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
            onClick={handleExport}
            disabled={mapTiles.length === 0}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 disabled:cursor-not-allowed rounded text-sm"
          >
            📤 Экспорт
          </button>
          <button
            onClick={() => importInputRef.current?.click()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded text-sm"
          >
            📥 Импорт
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
      
      <input
        ref={importInputRef}
        type="file"
        accept="application/json"
        onChange={handleImport}
        className="hidden"
      />
      
      <input
        ref={hexSampleInputRef}
        type="file"
        accept="image/*"
        onChange={handleHexSampleUpload}
        className="hidden"
      />

      {/* Секция образца гекса */}
      <div className="mb-4 p-3 bg-slate-900/50 rounded border border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-cyan-300">⬡ Образец гекса для сетки</h4>
          <div className="flex gap-2">
            <button
              onClick={() => hexSampleInputRef.current?.click()}
              className="px-3 py-1 bg-teal-600 hover:bg-teal-700 rounded text-xs"
            >
              📁 Загрузить образец
            </button>
            {hexSample && (
              <button
                onClick={() => {
                  setHexSample(undefined);
                  const dataToSave: StrategicMapData = {
                    tiles: mapTiles.map(tile => ({
                      ...tile,
                      width: getTileSize(tile.id).width,
                      height: getTileSize(tile.id).height
                    })),
                    mapWidth,
                    mapHeight,
                    tileWidth,
                    tileHeight
                  };
                  saveToIndexedDB(dataToSave);
                }}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-xs"
              >
                ✕ Удалить
              </button>
            )}
          </div>
        </div>
        {hexSample ? (
          <div className="flex items-center gap-3">
            <img 
              src={hexSample} 
              alt="Образец гекса" 
              className="border border-slate-600 rounded"
              style={{ maxWidth: '100px', maxHeight: '100px' }}
            />
            <div className="text-xs text-green-400">
              ✅ Образец загружен и будет использоваться для отрисовки гексагональной сетки
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-500">
            ⚠️ Образец не загружен. Загрузите изображение одного гекса для отрисовки сетки на карте.
          </div>
        )}
      </div>

      <div className="mb-4 text-sm text-slate-400">
        <p>Размер карты: {mapWidth} × {mapHeight} пикселей</p>
        <p>Стандартный тайл: {standardTileWidth} × {standardTileHeight} пикселей</p>
        <p>Последний столбец (06, 13, 20, 27, 34): {lastColumnWidth} × {standardTileHeight} пикселей</p>
        <p>Последний ряд (35-40): {standardTileWidth} × {lastRowHeight} пикселей</p>
        <p>Тайл 41: {lastColumnWidth} × {lastRowHeight} пикселей</p>
        <p className="mt-2">
          Загружено: <span className="text-cyan-400 font-bold">{mapTiles.length}</span> из 42 изображений
        </p>
        {mapTiles.length > 0 && (
          <p className="mt-1 text-xs text-green-400">
            💾 Данные автоматически сохраняются в localStorage при каждом изменении
          </p>
        )}
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
            width: `${mapWidth * displayScale}px`,
            height: `${mapHeight * displayScale}px`
          }}
        >
          {Array.from({ length: 42 }).map((_, idx) => {
            const row = Math.floor(idx / cols);
            const col = idx % cols;
            const tile = mapTiles.find(t => t.id === idx);
            const isHovered = dragOverTile === idx;
            const tileSize = getTileSize(idx);
            const tilePos = getTilePosition(idx);
            
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
                  left: `${tilePos.x * displayScale}px`,
                  top: `${tilePos.y * displayScale}px`,
                  width: `${tileSize.width * displayScale}px`,
                  height: `${tileSize.height * displayScale}px`
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
                      <div className="text-[9px] mt-1">{tileSize.width}×{tileSize.height}</div>
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
