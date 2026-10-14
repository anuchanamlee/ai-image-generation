import { prisma } from "./prisma";
import ServiceSelector from "./components/ServiceSelector";
import Link from "next/link";
import { Metadata } from "next";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Image Generation | Professional Workspace",
  description: "AI Image Generation Tool",
};

export default async function Home() {
  const tasks = await prisma.task.findMany({
    where: { enabled: true },
    orderBy: { title: 'asc' }
  });

  return (
    // ใช้ h-screen และ overflow-hidden เพื่อทำเป็น App-like interface
    <div className="h-screen bg-gray-50 flex flex-col font-sans text-gray-900">
      
      {/* Navbar: เพิ่ม Border และ Shadow บางๆ ให้แยกชั้นชัดเจน */}
      <nav className="bg-white border-b border-gray-300 h-16 flex-none z-50 px-6 flex items-center justify-between shadow-sm">
        
        {/* Brand */}
        <div className="flex items-center gap-3">
          
          <div className="leading-tight">
            <h1 className="font-extrabold text-xl text-black tracking-tight">Image Generator</h1>
            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Workbench</p>
          </div>
        </div>

        {/* Menu */}
        <div className="flex items-center gap-3">
          <Link 
            href="/admin" 
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-gray-700 hover:text-black hover:bg-gray-100 border border-transparent hover:border-gray-300 transition-all"
          >
            <span>⚙️</span>
            <span>จัดการระบบ</span>
          </Link>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-grow overflow-hidden p-2 sm:p-4">
        <div className="h-full w-full max-w-[1920px] mx-auto bg-white rounded-xl shadow-sm border border-gray-300 overflow-hidden">
           <ServiceSelector tasks={tasks} />
        </div>
      </main>

    </div>
  );
}