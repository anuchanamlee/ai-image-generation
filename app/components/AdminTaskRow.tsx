'use client'

import { useState, useTransition } from "react";
import { toggleTaskStatus, deleteTask } from "../actions/adminActions"; // ใช้ @ หรือปรับเป็น ../actions ตามโครงสร้าง
import Link from "next/link"; // ✅ เพิ่ม Link สำหรับปุ่มแก้ไข

export default function AdminTaskRow({ task }: { task: any }) {
  const [isPending, startTransition] = useTransition();

  // จัดการการเปลี่ยนสถานะ เปิด/ปิด
  const handleToggle = () => {
    startTransition(async () => {
      await toggleTaskStatus(task.id, task.enabled);
    });
  };

  // จัดการการลบ
  const handleDelete = () => {
    if (confirm(`คุณแน่ใจหรือไม่ที่จะลบ "${task.title}" ?\nการกระทำนี้กู้คืนไม่ได้!`)) {
      startTransition(async () => {
        await deleteTask(task.id);
      });
    }
  };

  return (
    <tr className="hover:bg-gray-50 border-b last:border-b-0 transition-colors">
      
      {/* 1. ID (เปลี่ยนจาก Key เป็น ID) */}
      <td className="p-4 font-mono text-xs text-gray-400 text-center">
        #{task.id}
      </td>

      {/* 2. ชื่อบริการ & Master Prompt (เปลี่ยนจาก Note เป็น Master Prompt) */}
      <td className="p-4">
        <div className="font-medium text-gray-900">{task.title}</div>
        <div className="text-xs text-gray-400 truncate max-w-[200px]" title={task.masterPrompt}>
          {task.masterPrompt || "-"}
        </div>
      </td>
      
      {/* 3. การตั้งค่า (เพิ่มใหม่: ให้ตรงกับหัวตาราง) */}
      <td className="p-4">
        <div className="flex flex-wrap gap-2">
           {/* Badge บอกจำนวนภาพ */}
           <span className="bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded text-xs whitespace-nowrap">
             🖼️ {task.imageCount} ภาพ
           </span>
           
           {/* Badge บอกโหมด */}
           <span className={`px-2 py-0.5 rounded text-xs border whitespace-nowrap
             ${task.promptMode === 'USER' 
               ? 'bg-purple-50 text-purple-700 border-purple-100' 
               : 'bg-orange-50 text-orange-700 border-orange-100'
             }`}>
             {task.promptMode === 'USER' ? 'User Input' : 'Fixed'}
           </span>
        </div>
      </td>

      {/* 4. สถานะ + ปุ่ม Toggle */}
      <td className="p-4 text-center">
        <button
          onClick={handleToggle}
          disabled={isPending}
          className={`px-3 py-1 rounded-full text-xs font-semibold transition-all border
            ${task.enabled 
              ? "bg-green-100 text-green-700 border-green-200 hover:bg-green-200" 
              : "bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200"
            } ${isPending ? "opacity-50 cursor-wait" : ""}`}
        >
          {task.enabled ? "✅ เปิดใช้งาน" : "⛔ ปิดใช้งาน"}
        </button>
      </td>

      {/* 5. เมนูจัดการ */}
      <td className="p-4 text-right">
        <div className="flex justify-end items-center gap-3">
          
          {/* ปุ่ม Edit (ใช้งานได้แล้ว) */}
          <Link 
            href={`/admin/edit/${task.id}`}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline"
          >
            แก้ไข
          </Link>

          {/* ปุ่ม Delete */}
          <button 
            onClick={handleDelete}
            disabled={isPending}
            className="text-red-600 hover:text-red-800 text-sm font-medium hover:underline disabled:opacity-50"
          >
            {isPending ? "..." : "ลบ"}
          </button>
        </div>
      </td>
    </tr>
  );
}