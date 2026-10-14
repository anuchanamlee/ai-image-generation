'use client'

import { useState, useRef, useEffect } from 'react';
import { submitWorkflow } from '../actions/submitWorkflow';

// --- TYPE DEFINITION ---
type ConnectionStatus = 'ready' | 'processing' | 'disconnected';

type ImageItem = {
  id: string;
  file: File;
  previewUrl: string;
  selected: boolean;
  selectedAt: number;
};

// --- HELPER 1: แปลง Data URI กลับเป็น File Object ---
const dataURItoFile = (dataURI: string, filename: string): File => {
  try {
      let base64Data = dataURI;
      let mime = 'image/png';

      if (dataURI.includes(',')) {
          const arr = dataURI.split(',');
          const mimeMatch = arr[0].match(/:(.*?);/);
          if (mimeMatch) mime = mimeMatch[1];
          base64Data = arr[1];
      }

      const bstr = atob(base64Data);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
      }
      return new File([u8arr], filename, { type: mime });
  } catch (e) {
      console.error("Error converting data URI to file:", e);
      return new File([], filename);
  }
};

// --- HELPER 2: แก้ปัญหาภาพแตก (เติม Prefix) ---
const getValidImageUrl = (imageData: string) => {
    if (!imageData) return '';
    if (imageData.startsWith('data:image')) {
        return imageData;
    }
    return `data:image/png;base64,${imageData}`;
};

// --- HELPER 3: ฟังก์ชันช่วยดาวน์โหลดไฟล์ ---
const downloadImage = (dataUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

const AVAILABLE_MODELS = [
  { label: "Gemini 2.5 Flash Image", value: "Gemini 2.5 Flash" }, // Value ต้องตรงกับ Backend
  { label: "Gemini 3 Pro Image Preview", value: "Gemini 3 Pro" }, // Value ต้องตรงกับ Backend
];

export default function ServiceSelector({ tasks }: { tasks: any[] }) {
  const [selectedId, setSelectedId] = useState<string>(tasks[0]?.id.toString() || "");
  
  // 🔥 เปลี่ยน isLoading เป็น status
  const [status, setStatus] = useState<ConnectionStatus>('ready');
  
  const [result, setResult] = useState<any>(null);
  
  const [images, setImages] = useState<ImageItem[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlsRef = useRef<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const currentTask = tasks.find(t => t.id.toString() === selectedId);
  const maxImages = currentTask?.imageCount || 1;

  useEffect(() => {
    objectUrlsRef.current = images.map(img => img.previewUrl);
  }, [images]);

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString('th-TH', { hour12: false });
    setLogs(prev => [...prev, `[${time}] ${msg}`]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const currentCount = images.length;
      const remainingSlots = maxImages - currentCount;

      if (remainingSlots <= 0) {
        alert(`ครบจำนวนที่กำหนดแล้ว (${maxImages} รูป)`);
        return;
      }

      const filesToAdd = Array.from(e.target.files).slice(0, remainingSlots);
      
      const now = Date.now();
      const newImages: ImageItem[] = filesToAdd.map((file, index) => ({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        selected: true,
        selectedAt: now + index
      }));

      setImages(prev => [...prev, ...newImages]);
      
      if (e.target.files.length > remainingSlots) {
        alert(`รับได้เพิ่มอีกแค่ ${remainingSlots} รูปเท่านั้น (ส่วนที่เกินถูกตัดออก)`);
      }

      if (images.length === 0) setPreviewIndex(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleUseOutputAsInput = () => {
    if (!result?.success || !result.data?.images?.[0]) return;

    try {
        addLog("💾 Saving & Recycling output image...");
        
        const rawOutput = result.data.images[0];
        const validOutputUrl = getValidImageUrl(rawOutput);
        const filename = `recycled-${Date.now()}.png`;

        downloadImage(validOutputUrl, filename);
        addLog("✅ Image saved to device.");

        const newFile = dataURItoFile(validOutputUrl, filename);

        objectUrlsRef.current.forEach(url => URL.revokeObjectURL(url));

        const newImageItem: ImageItem = {
            id: crypto.randomUUID(),
            file: newFile,
            previewUrl: URL.createObjectURL(newFile),
            selected: true,
            selectedAt: Date.now(),
        };

        setImages([newImageItem]);
        setPreviewIndex(0);
        setResult(null);
        
        // เมื่อ Recycle ให้กลับมาเป็น Ready
        setStatus('ready');

        addLog("✅ Set output as new input source.");

    } catch (error) {
        console.error("Failed process:", error);
        addLog("❌ Failed to process image.");
    }
  };

  const toggleCurrentSelection = () => {
    if (images.length === 0) return;
    if (!images[previewIndex]) return;

    const currentImg = images[previewIndex];
    setImages(prev => prev.map(img => 
      img.id === currentImg.id 
        ? { ...img, selected: !img.selected, selectedAt: !img.selected ? Date.now() : 0 } 
        : img
    ));
  };

  const removeCurrentImage = () => {
    if (images.length === 0) return;
    if (!images[previewIndex]) return;

    const currentImg = images[previewIndex];
    URL.revokeObjectURL(currentImg.previewUrl);
    setImages(prev => {
      const newArr = prev.filter(img => img.id !== currentImg.id);
      if (newArr.length === 0) return [];
      return newArr;
    });
    
    if (previewIndex >= images.length - 1) {
        setPreviewIndex(Math.max(0, images.length - 2)); 
    }
  };

  const nextImage = () => previewIndex < images.length - 1 && setPreviewIndex(p => p + 1);
  const prevImage = () => previewIndex > 0 && setPreviewIndex(p => p - 1);

  const getSelectionNumber = (img: ImageItem) => {
    if (!img.selected) return null;
    return images.filter(i => i.selected).sort((a, b) => a.selectedAt - b.selectedAt).findIndex(i => i.id === img.id) + 1;
  };

  // 🔥 CORE LOGIC สำหรับ Submit + จัดการสถานะ
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!currentTask) return;

    const selectedFiles = images.filter(img => img.selected).map(img => img.file);
    if (selectedFiles.length === 0) {
      alert("กรุณาเลือกรูปภาพอย่างน้อย 1 รูป");
      return;
    }

    // 🟡 เริ่มต้น Processing
    setStatus('processing');
    setResult(null);
    setLogs([]);
    addLog(`🚀 Initializing job: ${currentTask.title}`);

    const formData = new FormData(e.currentTarget);
    formData.delete('imageFile');
    selectedFiles.forEach((file) => formData.append('imageFiles', file));

    const timers = [
        setTimeout(() => addLog("📡 Connecting to server..."), 500),
        setTimeout(() => addLog("🤖 AI is thinking..."), 2000),
    ];

    try {
        const res = await submitWorkflow(currentTask.id, formData);
        timers.forEach(clearTimeout);

        if (res.success) {
            // 🟢 สำเร็จ
            setStatus('ready');
            addLog("✅ Task completed.");
        } else {
            // 🔴 ตรวจสอบสถานะ Disconnected
            if (res.data?.status === 'disconnected') {
                setStatus('disconnected');
                addLog("🔴 ERROR: Connection Lost / Server Unreachable.");
                addLog(`ℹ️ Details: ${res.message}`);
            } else {
                // Error ทั่วไป (เช่น API Key ผิด) ให้ถือว่า Ready
                setStatus('ready');
                addLog(`❌ Error: ${res.message}`);
            }
        }
        setResult(res);
    } catch (error) {
        timers.forEach(clearTimeout);
        // 🔴 Error จากฝั่ง Client เอง
        setStatus('disconnected');
        addLog("❌ Critical System Error / Network Failed.");
    }
  }

  const currentImage = images[previewIndex];

  if (tasks.length === 0) return <div className="h-full flex items-center justify-center text-gray-500 font-bold">⚠️ ยังไม่มีบริการในระบบ</div>;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full w-full bg-white overflow-hidden">
      
      {/* ================= MAIN CONTENT AREA ================= */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 divide-y lg:divide-y-0 lg:divide-x divide-gray-300 overflow-hidden">
        
        {/* === COLUMN 1: SETTINGS === */}
        <div className="w-full lg:w-[320px] flex-shrink-0 flex flex-col bg-white h-1/3 lg:h-auto overflow-hidden">
            <div className="p-4 border-b border-gray-300 bg-gray-50 flex-shrink-0">
                <h2 className="text-lg font-extrabold text-black flex items-center gap-2">
                    <span className="w-6 h-6 rounded bg-black text-white flex items-center justify-center text-xs">1</span>
                    ตั้งค่า (Settings)
                </h2>
            </div>

            <div className="flex-grow overflow-y-auto p-5 space-y-5">
                <div>
                    <label className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-1 block">เลือกบริการ</label>
                    <div className="relative">
                        <select 
                        value={selectedId} 
                        onChange={(e) => { setSelectedId(e.target.value); setResult(null); setImages([]); setPreviewIndex(0); setStatus('ready'); }}
                        className="w-full p-2 bg-white border border-gray-300 rounded font-bold text-black text-sm focus:ring-1 focus:ring-black outline-none cursor-pointer"
                        >
                        {tasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-black text-xs">▼</div>
                    </div>
                    <p className="text-[10px] text-blue-600 mt-1 font-medium">ℹ️ Max Images: {maxImages}</p>
                </div>

                <div>
                    <label className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-1 block">API Key</label>
                    <input type="password" name="apiKey" required placeholder="sk-..." className="w-full p-2 bg-white border border-gray-300 rounded text-sm"/>
                </div>

                <div>
                    <label className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-1 block">AI Model</label>
                    <select name="model" className="w-full p-2 bg-white border border-gray-300 rounded text-sm cursor-pointer">
                        {AVAILABLE_MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                </div>

                {currentTask && currentTask.promptMode === 'USER' && (
                <div>
                    <label className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-1 block">Prompt</label>
                    <textarea name="userPrompt" required className="w-full p-2 bg-white border border-gray-300 rounded text-sm h-24 resize-none" placeholder="Description..."></textarea>
                </div>
                )}
            </div>

            <div className="p-4 border-t border-gray-300 bg-gray-50 flex-shrink-0">
                <button 
                    type="submit" 
                    disabled={status === 'processing' || images.filter(i => i.selected).length === 0}
                    className={`w-full py-3 font-bold text-sm rounded shadow-sm transition-all active:scale-[0.98] text-white
                        ${status === 'processing' ? 'bg-gray-400 cursor-not-allowed' : ''}
                        ${status === 'ready' ? 'bg-black hover:bg-gray-800' : ''}
                        ${status === 'disconnected' ? 'bg-red-600 hover:bg-red-700' : ''}
                    `}
                >
                    {status === 'processing' && '⏳ Processing...'}
                    {status === 'ready' && `🚀 Send Data (${images.filter(i => i.selected).length})`}
                    {status === 'disconnected' && '🔄 Retry Connection'}
                </button>
            </div>
        </div>

        {/* === COLUMN 2: PREVIEW === */}
        <div className="flex-1 flex flex-col bg-gray-100 min-w-[300px] h-1/3 lg:h-auto overflow-hidden">
            <div className="p-4 border-b border-gray-300 bg-white flex justify-between items-center flex-shrink-0">
                <div className="flex items-center gap-3">
                    <h2 className="text-lg font-extrabold text-black flex items-center gap-2">
                        <span className="w-6 h-6 rounded bg-gray-700 text-white flex items-center justify-center text-xs">2</span>
                        ตรวจสอบรูป
                    </h2>
                    <span className={`text-xs font-bold px-2 py-1 rounded border ${images.length === maxImages ? 'bg-red-50 text-red-600 border-red-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                        {images.length} / {maxImages}
                    </span>
                </div>
                {images.length < maxImages && (
                    <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="cursor-pointer bg-white border border-gray-300 hover:border-black px-3 py-1.5 rounded text-xs font-bold text-gray-800 hover:text-black transition-all flex items-center gap-1 shadow-sm"
                    >
                    <span>➕</span> เพิ่มรูปภาพ
                    <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={handleFileChange} />
                    </div>
                )}
            </div>

            <div className="flex-grow flex items-center justify-center p-4 relative overflow-hidden bg-gray-200/50">
            {images.length === 0 ? (
                <div onClick={() => images.length < maxImages && fileInputRef.current?.click()} className="text-center cursor-pointer group opacity-60 hover:opacity-100 transition-opacity">
                    <div className="text-5xl mb-2">📁</div>
                    <p className="font-bold text-gray-600 text-sm">คลิกเพื่ออัปโหลดรูปภาพ</p>
                    <p className="text-xs text-gray-500">รองรับไฟล์ JPG, PNG</p>
                </div>
            ) : (
                <div className="relative w-full h-full flex flex-col items-center justify-center">
                    <div className="relative shadow-md border-4 border-white bg-white w-full h-full max-h-[90%] flex items-center justify-center overflow-hidden">
                        {currentImage && (
                            <img 
                                src={currentImage.previewUrl} 
                                alt="Preview" 
                                className={`max-w-full max-h-full object-contain transition-all duration-300 ${!currentImage.selected ? 'grayscale opacity-60' : ''}`}
                            />
                        )}
                        
                        {currentImage?.selected && (
                            <div className="absolute top-2 left-2 bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold border-2 border-white shadow-md z-10">
                                {getSelectionNumber(currentImage)}
                            </div>
                        )}
                    </div>
                    {previewIndex > 0 && <button type="button" onClick={prevImage} className="absolute left-0 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-black w-10 h-10 rounded-full shadow-lg flex items-center justify-center font-bold text-lg backdrop-blur-sm transition-all">‹</button>}
                    {previewIndex < images.length - 1 && <button type="button" onClick={nextImage} className="absolute right-0 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-black w-10 h-10 rounded-full shadow-lg flex items-center justify-center font-bold text-lg backdrop-blur-sm transition-all">›</button>}
                </div>
            )}
            </div>

            <div className="h-16 bg-white border-t border-gray-300 flex items-center justify-between px-4 flex-shrink-0">
                {images.length > 0 && currentImage ? (
                    <>
                        <div className="flex items-center gap-2">
                            <button type="button" onClick={toggleCurrentSelection} className={`px-3 py-1 rounded text-xs font-bold border transition-all ${currentImage.selected ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300'}`}>
                                {currentImage.selected ? '✓ Selected' : '✕ Ignored'}
                            </button>
                            <button type="button" onClick={removeCurrentImage} className="p-1.5 rounded border border-red-200 text-red-500 hover:bg-red-50" title="Delete">🗑️</button>
                        </div>
                        <div className="flex gap-1 overflow-x-auto max-w-[150px] lg:max-w-[250px]">
                            {images.map((img, idx) => (
                            <div key={img.id} onClick={() => setPreviewIndex(idx)} className={`w-10 h-10 flex-shrink-0 border-2 cursor-pointer ${idx === previewIndex ? 'border-black' : 'border-transparent opacity-60'}`}>
                                <img src={img.previewUrl} className="w-full h-full object-cover" />
                            </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="w-full h-full"></div>
                )}
            </div>
        </div>

        {/* === COLUMN 3: OUTPUT === */}
        <div className="flex-1 flex flex-col bg-white border-l border-gray-300 h-1/3 lg:h-auto min-w-[300px] overflow-hidden">
            <div className="p-4 border-b border-gray-300 bg-gray-50 flex justify-between items-center flex-shrink-0">
                <h2 className="text-lg font-extrabold text-black flex items-center gap-2">
                    <span className="w-6 h-6 rounded bg-black text-white flex items-center justify-center text-xs">3</span>
                    ผลลัพธ์ (Output)
                </h2>
                {result?.success && <span className="bg-green-600 text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Done</span>}
            </div>

            <div className="flex-grow flex items-center justify-center p-6 bg-gray-50/50 relative overflow-hidden">
                {!result && logs.length === 0 && (
                    <div className="text-center opacity-40">
                        <div className="text-6xl mb-2 grayscale">🖼️</div>
                        <p className="font-bold text-gray-500 text-sm">พื้นที่แสดงรูปผลลัพธ์</p>
                    </div>
                )}

                {/* Loading State */}
                {status === 'processing' && !result && (
                    <div className="text-center">
                        <div className="w-16 h-16 border-4 border-gray-300 border-t-black rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-black font-bold text-sm animate-pulse">กำลังประมวลผล...</p>
                    </div>
                )}

                {/* Disconnected State */}
                {status === 'disconnected' && (
                     <div className="text-center max-w-xs p-6 bg-red-50 border border-red-200 rounded-lg shadow-sm">
                        <div className="text-4xl mb-2">🔌</div>
                        <p className="text-red-700 font-bold text-sm">Connection Lost</p>
                        <p className="text-red-500 text-xs mt-1">ไม่สามารถติดต่อ Server ได้</p>
                    </div>
                )}

                {/* Error State */}
                {result && !result.success && status !== 'disconnected' && (
                    <div className="text-center max-w-xs p-4 bg-red-50 border border-red-200 rounded-lg">
                        <div className="text-4xl mb-2">⚠️</div>
                        <p className="text-red-600 text-xs font-bold">{result.message}</p>
                    </div>
                )}

                {/* Success State */}
                {result?.success && result.data?.images && (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                        <div className="relative group shadow-xl border-4 border-white bg-white w-full h-full max-h-[90%] flex items-center justify-center overflow-hidden">
                            <img src={getValidImageUrl(result.data.images[0])} alt="Result" className="max-w-full max-h-full object-contain" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-2 backdrop-blur-sm">
                                <div className="flex gap-2">
                                    <a href={getValidImageUrl(result.data.images[0])} target="_blank" className="bg-white text-black px-4 py-2 rounded font-bold text-xs hover:scale-105 transition-transform">View</a>
                                    <a href={getValidImageUrl(result.data.images[0])} download={`generated-${Date.now()}.png`} className="bg-black text-white px-4 py-2 rounded font-bold text-xs border border-white hover:scale-105 transition-transform">Save</a>
                                </div>
                                <button type="button" onClick={handleUseOutputAsInput} className="bg-purple-600 text-white px-4 py-2 rounded font-bold text-xs border border-white hover:scale-105 transition-transform">
                                    🔄 Use as Input & Save
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
        
      </div>

      {/* ================= BOTTOM LOG ================= */}
      <div className="h-[200px] bg-black border-t-4 border-gray-800 flex flex-col flex-shrink-0">
        <div className="bg-gray-900 px-4 py-1 flex justify-between items-center border-b border-gray-800">
            <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${status === 'disconnected' ? 'bg-red-500 animate-pulse' : 'bg-red-900'}`}></div>
                <div className={`w-2.5 h-2.5 rounded-full ${status === 'processing' ? 'bg-yellow-500 animate-pulse' : 'bg-yellow-900'}`}></div>
                <div className={`w-2.5 h-2.5 rounded-full ${status === 'ready' ? 'bg-green-500' : 'bg-green-900'}`}></div>
                <span className="ml-2 uppercase font-bold tracking-widest text-gray-400 text-[10px]">System Console</span>
            </div>
            <span className={`text-[10px] font-mono font-bold ${
                status === 'processing' ? 'text-yellow-400' :
                status === 'disconnected' ? 'text-red-500' :
                'text-green-500'
            }`}>
                {status === 'processing' ? '● PROCESSING' : status === 'disconnected' ? '● DISCONNECTED' : '○ READY'}
            </span>
        </div>
        <div className="flex-grow overflow-y-auto p-3 font-mono text-[11px] space-y-1">
            {logs.map((log, i) => (
                <div key={i} className={`break-words border-l-2 pl-2 transition-all ${
                    log.includes('❌') || log.includes('🔴') ? 'text-red-400 border-red-600' :
                    log.includes('✅') ? 'text-green-400 border-green-600' :
                    'text-gray-300 border-transparent'
                }`}>
                    {log}
                </div>
            ))}
            <div ref={logsEndRef} />
            {status === 'processing' && <div className="animate-pulse mt-1 text-yellow-500">_</div>}
        </div>
      </div>

    </form>
  );
}