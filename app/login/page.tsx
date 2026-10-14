'use client'

import { login } from "../actions/authActions"; // ตรวจสอบ path ให้ถูกต้อง
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

function SubmitButton() {
  const { pending } = useFormStatus();
  
  return (
    <button 
      type="submit"
      disabled={pending}
      className={`w-full p-3 rounded-lg font-bold text-white transition-all shadow-sm
        ${pending 
          ? "bg-gray-400 cursor-not-allowed" 
          : "bg-black hover:bg-gray-800 active:scale-[0.98]"
        }`}
    >
      {pending ? "กำลังตรวจสอบ... ⏳" : "เข้าสู่ระบบ"}
    </button>
  );
}

const initialState = {
  success: false,
  message: '',
};

export default function LoginPage() {
  // ใช้ useActionState (React 19 / Next.js 15+)
  const [state, formAction] = useActionState(login, initialState);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 font-sans">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm border border-gray-200">
        
        <div className="text-center mb-6">
          <h1 className="text-2xl font-extrabold text-gray-900">Admin Login</h1>
          <p className="text-gray-500 text-sm mt-1">เข้าสู่ระบบจัดการหลังบ้าน</p>
        </div>
        
        {state?.message && (
          <div className={`mb-6 p-3 text-sm rounded-lg flex items-center gap-2 border animate-pulse
            ${state.success 
              ? 'bg-green-50 text-green-700 border-green-200' 
              : 'bg-red-50 text-red-600 border-red-200'
            }`}>
            {state.success ? '✅' : '❌'} {state.message}
          </div>
        )}

        <form action={formAction} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-1.5">Username</label>
            <input 
              type="text" 
              name="username" 
              required 
              className="w-full border-2 border-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition-all text-gray-900 font-medium placeholder:text-gray-400" 
              placeholder="ใส่ชื่อผู้ใช้ของคุณที่นี่"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-1.5">Password</label>
            <input 
              type="password" 
              name="password" 
              required 
              className="w-full border-2 border-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition-all text-gray-900 font-medium placeholder:text-gray-400" 
              placeholder="••••••"
            />
          </div>

          <SubmitButton />
        </form>

      </div>
    </div>
  );
}