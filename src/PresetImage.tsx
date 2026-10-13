import { Ship } from './types';

interface PresetImageProps {
  ship: Ship;
}

export default function PresetImage({ ship }: PresetImageProps) {
  const getImagePath = () => {
    switch (ship.type) {
      case 'battleship': return '/images/battleship-schematic.svg';
      case 'cruiser': return '/images/cruiser-schematic.svg';
      case 'destroyer': return '/images/destroyer-schematic.svg';
      default: return '/images/battleship-schematic.svg';
    }
  };

  return (
    <div className="relative">
      <img 
        src={getImagePath()} 
        alt={`Схема ${ship.name}`}
        className="w-full h-auto rounded border border-slate-600"
        onError={(e) => {
          e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="498" height="200" viewBox="0 0 498 200"%3E%3Crect fill="%231e293b" width="498" height="200"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%2394a3b8" font-size="14"%3EСхема корабля%3C/text%3E%3Ctext x="50%25" y="60%25" dominant-baseline="middle" text-anchor="middle" fill="%2364748b" font-size="10"%3EДобавьте изображение в public/images/%3C/text%3E%3C/svg%3E';
        }}
      />
      <div className="absolute top-2 left-2 bg-slate-900/80 rounded px-2 py-1 text-xs text-slate-300">
        {ship.name}
      </div>
    </div>
  );
}
