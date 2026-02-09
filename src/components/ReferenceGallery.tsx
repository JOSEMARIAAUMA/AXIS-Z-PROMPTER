import React, { useRef } from 'react';
import { PromptItem } from '../types';
import { Icons } from './Icon';

interface ReferenceGalleryProps {
  prompt: PromptItem | null;
  onUpdateImages: (images: string[]) => void;
  onAnalyzeImage: (image: string) => void;
}

export const ReferenceGallery: React.FC<ReferenceGalleryProps> = ({ prompt, onUpdateImages, onAnalyzeImage }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!prompt) {
     return <div className="h-full bg-arch-900" />;
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        onUpdateImages([...prompt.images, base64]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteImage = (index: number) => {
    const newImages = [...prompt.images];
    newImages.splice(index, 1);
    onUpdateImages(newImages);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    onUpdateImages([...prompt.images, event.target.result as string]);
                }
            };
            reader.readAsDataURL(blob);
        }
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
       const file = e.dataTransfer.files[0];
       if (file.type.startsWith('image/')) {
           const reader = new FileReader();
           reader.onloadend = () => {
               onUpdateImages([...prompt.images, reader.result as string]);
           };
           reader.readAsDataURL(file);
       }
    }
  };

  return (
    <div 
        className="h-full flex flex-col bg-arch-900" 
        onPaste={handlePaste}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
    >
      <div className="p-4 border-b border-arch-800 bg-arch-950 flex justify-between items-center">
        <h3 className="text-sm font-semibold text-arch-200">Referencias Visuales</h3>
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="p-1.5 bg-arch-800 hover:bg-arch-700 rounded-md text-arch-300 transition-colors"
          title="Subir imagen"
        >
          <Icons.Upload size={16} />
        </button>
        <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*"
            onChange={handleFileChange}
        />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {prompt.images.length === 0 ? (
          <div className="h-48 border-2 border-dashed border-arch-800 rounded-lg flex flex-col items-center justify-center text-arch-500">
            <Icons.Image size={32} className="mb-2 opacity-50" />
            <span className="text-xs">Arrastra, pega o sube imágenes aquí</span>
          </div>
        ) : (
          prompt.images.map((img, idx) => (
            <div key={idx} className="relative group rounded-lg overflow-hidden border border-arch-800 bg-black">
              <img src={img} alt={`Ref ${idx}`} className="w-full h-auto object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
              
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                 <button 
                    onClick={() => onAnalyzeImage(img)}
                    className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-500 shadow-lg transform hover:scale-105 transition-all"
                    title="Analizar con IA"
                 >
                    <Icons.Magic size={16} />
                 </button>
                 <button 
                    onClick={() => handleDeleteImage(idx)}
                    className="p-2 bg-red-600 text-white rounded-full hover:bg-red-500 shadow-lg transform hover:scale-105 transition-all"
                    title="Eliminar"
                 >
                    <Icons.Trash size={16} />
                 </button>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="p-2 text-[10px] text-arch-600 text-center border-t border-arch-800">
          Portapapeles y Drag & Drop habilitados
      </div>
    </div>
  );
};