import { useRef } from 'react';

interface ImageUploaderProps {
  onImageLoad: (imageData: string) => void;
  currentImage: string | null;
}

export default function ImageUploader({ onImageLoad, currentImage }: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        onImageLoad(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        onImageLoad(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="space-y-2">
      <div
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="border-2 border-dashed border-slate-600 rounded-lg p-4 text-center cursor-pointer hover:border-cyan-500 transition-colors"
      >
        {currentImage ? (
          <img src={currentImage} alt="Схема корабля" className="max-w-full max-h-[200px] mx-auto" />
        ) : (
          <div className="text-slate-400">
            <div className="text-3xl mb-2">📁</div>
            <div className="text-sm">Перетащите изображение сюда</div>
            <div className="text-xs text-slate-500 mt-1">или кликните для выбора файла</div>
          </div>
        )}
      </div>
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
    </div>
  );
}
