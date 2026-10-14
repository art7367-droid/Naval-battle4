import { useState, useRef, useEffect } from 'react';
import { StrategicMapData } from '../types/shipDatabase';

interface StrategicMapProps {
  onBack: () => void;
  strategicMapData?: StrategicMapData;
}

interface Viewport {
  x: number;
  y: number;
  width: number;
  height: number;
  zoom: number;
}

interface Region {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

export default function StrategicMap({ onBack, strategicMapData }: StrategicMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Размер карты Тихого океана
  const MAP_WIDTH = strategicMapData?.mapWidth || 9703;
  const MAP_HEIGHT = strategicMapData?.mapHeight || 7767;
  
  const [viewport, setViewport] = useState<Viewport>({
    x: 0,
    y: 0,
    width: 1200,
    height: 800,
    zoom: 0.5
  });
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  
  // Регионы Тихого океана
  const regions: Region[] = [
    { id: 'japan', name: 'Япония', x: 7500, y: 1200, width: 800, height: 600, color: '#dc2626' },
    { id: 'philippines', name: 'Филиппины', x: 6800, y: 2400, width: 600, height: 500, color: '#2563eb' },
    { id: 'midway', name: 'Мидуэй', x: 4500, y: 1500, width: 400, height: 400, color: '#16a34a' },
    { id: 'hawaii', name: 'Гавайи', x: 2500, y: 1800, width: 500, height: 400, color: '#9333ea' },
    { id: 'australia', name: 'Австралия', x: 7000, y: 3500, width: 1200, height: 900, color: '#ea580c' },
    { id: 'alaska', name: 'Аляска', x: 1000, y: 500, width: 800, height: 600, color: '#0891b2' },
    { id: 'california', name: 'Калифорния', x: 800, y: 1500, width: 600, height: 800, color: '#ca8a04' },
  ];
  
  // Обновление размеров canvas при изменении контейнера
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setViewport(prev => ({
          ...prev,
          width: rect.width,
          height: rect.height
        }));
      }
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);
  
  // Кэш для загруженных изображений
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());
  
  // Загрузка изображений тайлов
  useEffect(() => {
    if (!strategicMapData?.tiles) return;
    
    strategicMapData.tiles.forEach(tile => {
      if (!imageCache.current.has(tile.imageData)) {
        const img = new Image();
        img.src = tile.imageData;
        imageCache.current.set(tile.imageData, img);
      }
    });
  }, [strategicMapData]);
  
  // Отрисовка карты
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Очистка canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Фон - океан
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Вычисляем видимую область
    const visibleX = viewport.x / viewport.zoom;
    const visibleY = viewport.y / viewport.zoom;
    const visibleWidth = viewport.width / viewport.zoom;
    const visibleHeight = viewport.height / viewport.zoom;
    
    // Отрисовка тайлов (только видимых)
    if (strategicMapData?.tiles) {
      const cols = 7;
      
      // Размеры тайлов
      const standardTileWidth = 1500;
      const standardTileHeight = 1500;
      const lastColumnWidth = 703;
      const lastRowHeight = 267;
      
      // Функция для определения размера тайла по его ID
      const getTileSize = (tileId: number, tileData?: any) => {
        const row = Math.floor(tileId / cols);
        const col = tileId % cols;
        
        const isLastColumn = col === 6;
        const isLastRow = row === 5;
        
        return {
          width: tileData?.width || (isLastColumn ? lastColumnWidth : standardTileWidth),
          height: tileData?.height || (isLastRow ? lastRowHeight : standardTileHeight)
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
      
      strategicMapData.tiles.forEach(tile => {
        const tileSize = getTileSize(tile.id, tile);
        const tilePos = getTilePosition(tile.id);
        const tileRight = tilePos.x + tileSize.width;
        const tileBottom = tilePos.y + tileSize.height;
        
        // Проверка видимости тайла
        if (tileRight < visibleX || tilePos.x > visibleX + visibleWidth ||
            tileBottom < visibleY || tilePos.y > visibleY + visibleHeight) {
          return; // Тайл не виден
        }
        
        const img = imageCache.current.get(tile.imageData);
        if (img && img.complete && img.naturalWidth > 0) {
          const screenX = (tilePos.x - visibleX) * viewport.zoom;
          const screenY = (tilePos.y - visibleY) * viewport.zoom;
          const screenWidth = tileSize.width * viewport.zoom;
          const screenHeight = tileSize.height * viewport.zoom;
          
          ctx.drawImage(img, screenX, screenY, screenWidth, screenHeight);
        }
      });
    } else {
      // Если нет загруженных тайлов, рисуем статические регионы
      regions.forEach(region => {
        // Проверка видимости региона
        const regionRight = region.x + region.width;
        const regionBottom = region.y + region.height;
        
        if (regionRight < visibleX || region.x > visibleX + visibleWidth ||
            regionBottom < visibleY || region.y > visibleY + visibleHeight) {
          return; // Регион не виден
        }
        
        const screenX = (region.x - visibleX) * viewport.zoom;
        const screenY = (region.y - visibleY) * viewport.zoom;
        const screenWidth = region.width * viewport.zoom;
        const screenHeight = region.height * viewport.zoom;
        
        // Фон региона
        ctx.fillStyle = region.color + '40'; // 25% прозрачность
        ctx.fillRect(screenX, screenY, screenWidth, screenHeight);
        
        // Граница региона
        ctx.strokeStyle = region.color;
        ctx.lineWidth = 2 / viewport.zoom;
        ctx.strokeRect(screenX, screenY, screenWidth, screenHeight);
        
        // Название региона
        ctx.fillStyle = '#ffffff';
        ctx.font = `${Math.max(12, 16 * viewport.zoom)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(region.name, screenX + screenWidth / 2, screenY + screenHeight / 2);
      });
    }
    
    // Отрисовка сетки
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1 / viewport.zoom;
    
    const gridSize = 500;
    const startX = Math.floor(visibleX / gridSize) * gridSize;
    const startY = Math.floor(visibleY / gridSize) * gridSize;
    
    for (let x = startX; x < visibleX + visibleWidth; x += gridSize) {
      if (x >= 0 && x <= MAP_WIDTH) {
        const screenX = (x - visibleX) * viewport.zoom;
        ctx.beginPath();
        ctx.moveTo(screenX, 0);
        ctx.lineTo(screenX, canvas.height);
        ctx.stroke();
      }
    }
    
    for (let y = startY; y < visibleY + visibleHeight; y += gridSize) {
      if (y >= 0 && y <= MAP_HEIGHT) {
        const screenY = (y - visibleY) * viewport.zoom;
        ctx.beginPath();
        ctx.moveTo(0, screenY);
        ctx.lineTo(canvas.width, screenY);
        ctx.stroke();
      }
    }
    
    // Границы карты
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3 / viewport.zoom;
    const mapScreenX = (0 - visibleX) * viewport.zoom;
    const mapScreenY = (0 - visibleY) * viewport.zoom;
    const mapScreenWidth = MAP_WIDTH * viewport.zoom;
    const mapScreenHeight = MAP_HEIGHT * viewport.zoom;
    ctx.strokeRect(mapScreenX, mapScreenY, mapScreenWidth, mapScreenHeight);
    
    // Отрисовка гексагональной сетки (20 морских миль)
    // Оригинальная сетка: 43×53 гекса = 40 миль
    // Новая сетка: 86×106 гекса = 20 миль (в 2 раза меньше)
    const hexCols = 106;
    const hexRows = 86;
    const hexWidth = MAP_WIDTH / hexCols;
    const hexHeight = MAP_HEIGHT / hexRows;
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1 / viewport.zoom;
    
    // Отрисовка только видимых гексов
    const startHexCol = Math.max(0, Math.floor(visibleX / hexWidth));
    const endHexCol = Math.min(hexCols, Math.ceil((visibleX + visibleWidth) / hexWidth));
    const startHexRow = Math.max(0, Math.floor(visibleY / hexHeight));
    const endHexRow = Math.min(hexRows, Math.ceil((visibleY + visibleHeight) / hexHeight));
    
    for (let row = startHexRow; row < endHexRow; row++) {
      for (let col = startHexCol; col < endHexCol; col++) {
        // Центр гекса
        const centerX = col * hexWidth + hexWidth / 2;
        const centerY = row * hexHeight + hexHeight / 2;
        
        // Отрисовка гекса (pointy-top ориентация)
        const screenX = (centerX - visibleX) * viewport.zoom;
        const screenY = (centerY - visibleY) * viewport.zoom;
        const screenHexWidth = hexWidth * viewport.zoom;
        const screenHexHeight = hexHeight * viewport.zoom;
        
        ctx.beginPath();
        // 6 вершин гекса (pointy-top)
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i - Math.PI / 6;
          const x = screenX + (screenHexWidth / 2) * Math.cos(angle);
          const y = screenY + (screenHexHeight / 2) * Math.sin(angle);
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.closePath();
        ctx.stroke();
      }
    }
    
  }, [viewport, regions, strategicMapData]);
  
  // Обработка мыши - перемещение карты
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    
    setViewport(prev => ({
      ...prev,
      x: Math.max(0, Math.min(MAP_WIDTH * prev.zoom - prev.width, prev.x - dx)),
      y: Math.max(0, Math.min(MAP_HEIGHT * prev.zoom - prev.height, prev.y - dy))
    }));
    
    setDragStart({ x: e.clientX, y: e.clientY });
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  // Обработка колеса мыши - масштабирование
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(2, viewport.zoom * zoomFactor));
    
    // Масштабирование относительно центра экрана
    const centerX = viewport.x + viewport.width / 2;
    const centerY = viewport.y + viewport.height / 2;
    
    const newX = centerX - (centerX - viewport.x) * (newZoom / viewport.zoom);
    const newY = centerY - (centerY - viewport.y) * (newZoom / viewport.zoom);
    
    setViewport(prev => ({
      ...prev,
      zoom: newZoom,
      x: Math.max(0, Math.min(MAP_WIDTH * newZoom - prev.width, newX)),
      y: Math.max(0, Math.min(MAP_HEIGHT * newZoom - prev.height, newY))
    }));
  };
  
  // Клик по региону
  const handleClick = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    const mapX = viewport.x / viewport.zoom + clickX / viewport.zoom;
    const mapY = viewport.y / viewport.zoom + clickY / viewport.zoom;
    
    const clickedRegion = regions.find(region =>
      mapX >= region.x && mapX <= region.x + region.width &&
      mapY >= region.y && mapY <= region.y + region.height
    );
    
    setSelectedRegion(clickedRegion || null);
  };
  
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      {/* Верхняя панель */}
      <div className="bg-slate-800 p-4 flex justify-between items-center border-b border-slate-700">
        <button
          onClick={onBack}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
        >
          ← Назад в меню
        </button>
        <h1 className="text-2xl font-bold text-cyan-300">🗺️ Стратегическая карта Тихого океана</h1>
        <div className="text-sm text-slate-400">
          Масштаб: {Math.round(viewport.zoom * 100)}%
        </div>
      </div>
      
      {/* Карта */}
      <div 
        ref={containerRef}
        className="flex-1 relative overflow-hidden cursor-move"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onClick={handleClick}
      >
        <canvas
          ref={canvasRef}
          width={viewport.width}
          height={viewport.height}
          className="absolute top-0 left-0"
        />
      </div>
      
      {/* Информация о выбранном регионе */}
      {selectedRegion && (
        <div className="absolute bottom-4 right-4 bg-slate-800 border border-slate-700 rounded-lg p-4 shadow-lg">
          <h3 className="text-lg font-bold text-cyan-300 mb-2">{selectedRegion.name}</h3>
          <div className="text-sm text-slate-300">
            <p>Координаты: ({selectedRegion.x}, {selectedRegion.y})</p>
            <p>Размер: {selectedRegion.width} × {selectedRegion.height}</p>
          </div>
        </div>
      )}
      
      {/* Подсказки */}
      <div className="absolute bottom-4 left-4 bg-slate-800/80 border border-slate-700 rounded-lg p-3 text-xs text-slate-400">
        <p>🖱️ Перетаскивание - перемещение карты</p>
        <p>🔍 Колесо мыши - масштабирование</p>
        <p>👆 Клик - выбор региона</p>
      </div>
    </div>
  );
}
