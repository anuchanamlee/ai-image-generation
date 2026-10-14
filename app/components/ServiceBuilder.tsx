'use client'

import { useState } from 'react';
import { createTask, updateTask } from '../actions/adminActions';
import { useRouter } from 'next/navigation';

export default function ServiceBuilder({ initialData }: { initialData?: any }) {
  const router = useRouter();
  const isEdit = !!initialData;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [promptMode, setPromptMode] = useState(initialData?.promptMode || 'USER');

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    const action = isEdit ? updateTask.bind(null, initialData.id) : createTask;
    const res = await action(formData);
    
    if (res.success) {
      router.push('/admin');
      router.refresh();
    } else {
      alert("❌ " + res.message);
      setIsSubmitting(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-8">
      
      {/* CARD 1: ข้อมูลพื้นฐาน */}
      <section className="bg-white p-8 rounded-2xl shadow-sm border border-gray-300">
        <div className="flex items-center gap-4 mb-6 border-b border-gray-100 pb-4">
          <div className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center font-bold text-lg shadow-md">1</div>
          <h3 className="text-xl font-extrabold text-black">ข้อมูลทั่วไป</h3>
        </div>
        
        <div>
           <label className="block text-base font-bold text-gray-900 mb-2">ชื่อบริการ (Service Title)</label>
           <input 
             name="title" 
             defaultValue={initialData?.title} 
             required 
             className="w-full border-2 border-gray-300 p-4 rounded-xl text-lg text-black font-medium focus:ring-2 focus:ring-black focus:border-black outline-none transition-all placeholder:text-gray-400" 
             placeholder="เช่น: AI วาดรูปสไตล์เกาหลี" 
           />
           <p className="mt-2 text-sm text-gray-600">ชื่อนี้จะแสดงให้ลูกค้าเห็นในหน้าแรก</p>
        </div>
      </section>

      {/* CARD 2: การตั้งค่า Output */}
      <section className="bg-white p-8 rounded-2xl shadow-sm border border-gray-300">
        <div className="flex items-center gap-4 mb-6 border-b border-gray-100 pb-4">
          <div className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center font-bold text-lg shadow-md">2</div>
          <h3 className="text-xl font-extrabold text-black">การตั้งค่าจำนวนภาพ INPUT ของผู้ใช้</h3>
        </div>

        <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 flex items-center justify-between">
            <div>
              <label className="block text-base font-bold text-gray-900">จำนวนภาพที่ใช้สร้าง</label>
              <p className="text-sm text-gray-700 mt-1 font-medium">จำนวนภาพที่ผู้ใช้ใช้ในการสร้างภาพ</p>
            </div>
            <div className="flex items-center bg-white border-2 border-gray-300 rounded-lg px-3 shadow-sm focus-within:border-black focus-within:ring-1 focus-within:ring-black">
              <input 
                type="number" 
                name="imageCount" 
                defaultValue={initialData?.imageCount || 1} 
                min="1" max="10" required 
                className="w-20 p-3 text-center font-extrabold text-2xl text-black outline-none border-none bg-transparent" 
              />
              <span className="text-gray-600 font-bold text-sm pr-2">ภาพ</span>
            </div>
        </div>
      </section>

      {/* CARD 3: รูปแบบคำสั่ง */}
      <section className="bg-white p-8 rounded-2xl shadow-sm border border-gray-300">
        <div className="flex items-center gap-4 mb-6 border-b border-gray-100 pb-4">
          <div className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center font-bold text-lg shadow-md">3</div>
          <h3 className="text-xl font-extrabold text-black">รูปแบบคำสั่ง (Prompt Logic)</h3>
        </div>

        {/* ตัวเลือกแบบ Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
          {/* Option: USER */}
          <label className={`cursor-pointer relative p-6 rounded-xl border-2 transition-all shadow-sm ${promptMode === 'USER' ? 'border-black bg-gray-50 ring-1 ring-black' : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50'}`}>
            <input 
              type="radio" name="promptMode" value="USER" 
              className="absolute opacity-0"
              checked={promptMode === 'USER'}
              onChange={() => setPromptMode('USER')}
            />
            <div className="flex items-center justify-between mb-3">
              <span className="font-extrabold text-lg text-black">🎨 User Mode</span>
              {promptMode === 'USER' && <div className="w-6 h-6 bg-black text-white rounded-full flex items-center justify-center text-sm">✓</div>}
            </div>
            <p className="text-sm text-gray-700 font-medium leading-relaxed">
              เหมาะสำหรับงานที่ต้องการความหลากหลาย <br/>
              (Master Prompt + สิ่งที่ลูกค้าพิมพ์)
            </p>
          </label>

          {/* Option: FIXED */}
          <label className={`cursor-pointer relative p-6 rounded-xl border-2 transition-all shadow-sm ${promptMode === 'FIXED' ? 'border-black bg-gray-50 ring-1 ring-black' : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50'}`}>
            <input 
              type="radio" name="promptMode" value="FIXED" 
              className="absolute opacity-0"
              checked={promptMode === 'FIXED'}
              onChange={() => setPromptMode('FIXED')}
            />
            <div className="flex items-center justify-between mb-3">
              <span className="font-extrabold text-lg text-black">🔒 Fixed Mode</span>
              {promptMode === 'FIXED' && <div className="w-6 h-6 bg-black text-white rounded-full flex items-center justify-center text-sm">✓</div>}
            </div>
            <p className="text-sm text-gray-700 font-medium leading-relaxed">
              เหมาะสำหรับงานสำเร็จรูป กดปุ่มเดียวจบ <br/>
              (ใช้ Master Prompt อย่างเดียว)
            </p>
          </label>
        </div>

        {/* Master Prompt Textarea */}
        <div>
          <label className="block text-base font-bold text-gray-900 mb-2">
            Master Prompt (คำสั่งหลักถึง AI)
          </label>
          <div className="relative">
            <textarea 
              name="masterPrompt" 
              defaultValue={initialData?.masterPrompt} 
              required
              className="w-full border-2 border-gray-300 p-5 rounded-xl h-48 font-mono text-sm leading-relaxed text-gray-900 focus:ring-2 focus:ring-black focus:border-black outline-none resize-none shadow-inner bg-gray-50 placeholder:text-gray-400" 
              placeholder="Ex: high quality portrait of, cinematic lighting, 8k resolution..." 
            />
          </div>
          {promptMode === 'USER' && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-lg flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">ℹ️</span>
              <p className="text-sm text-blue-800 font-medium">
                ระบบจะนำข้อความที่ลูกค้าพิมพ์ มาต่อท้ายข้อความ Master Prompt นี้โดยอัตโนมัติ
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Action Buttons */}
      <div className="flex items-center gap-4 pt-6 pb-20">
        <button 
          type="button"
          onClick={() => router.back()}
          className="px-8 py-4 rounded-xl font-bold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 hover:text-black transition-all shadow-sm"
        >
          ยกเลิก
        </button>
        <button 
          type="submit" 
          disabled={isSubmitting} 
          className="flex-1 bg-black text-white py-4 rounded-xl font-bold text-xl hover:bg-gray-800 disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
        >
          {isSubmitting ? '⏳ กำลังบันทึก...' : '💾 บันทึกบริการ'}
        </button>
      </div>

    </form>
  );
}