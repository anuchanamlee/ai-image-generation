import { prisma } from "../prisma";
import { logout } from "../actions/authActions";
import AdminTaskRow from "../components/AdminTaskRow";
import Link from "next/link";
import { Metadata } from "next";

// บังคับไม่ให้ cache (Real-time data)
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Admin Dashboard | AI Service Manager",
};

export default async function AdminDashboard() {
  // ดึงข้อมูลเรียงจากล่าสุด
  const tasks = await prisma.task.findMany({
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      
      {/* Navbar */}
      <nav className="bg-white border-b px-6 py-4 flex justify-between items-center shadow-sm sticky top-0 z-20">
        <div className="flex items-center gap-3">

          <div>
            <h1 className="font-bold text-lg text-gray-900 leading-tight">Admin Panel</h1>
            <p className="text-xs text-gray-500">System Management</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* ปุ่มไปหน้าบ้าน */}
          <Link 
            href="/" 
            target="_blank"
            className="hidden sm:flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 font-medium px-3 py-2 rounded-lg hover:bg-blue-50 transition-all"
          >
            <span>🌐</span> ดูหน้าเว็บ
          </Link>

          <div className="h-6 w-px bg-gray-200 hidden sm:block"></div>

          <form action={logout}>
            <button className="text-sm text-gray-600 hover:text-red-600 font-medium transition-colors px-4 py-2 hover:bg-red-50 rounded-lg">
              ออกจากระบบ
            </button>
          </form>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">จัดการบริการ (Services)</h2>
            <p className="text-gray-500 text-sm mt-1">
              ทั้งหมด <span className="font-bold text-black">{tasks.length}</span> รายการ
            </p>
          </div>
          
          <Link 
            href="/admin/create" 
            className="bg-black text-white px-5 py-2.5 rounded-lg shadow-lg hover:bg-gray-800 hover:scale-[1.02] transition-all text-sm font-medium flex items-center gap-2"
          >
            <span>+</span> เพิ่มบริการใหม่
          </Link>
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider font-semibold">
                <tr>
                  <th className="p-4 border-b w-16 text-center">ID</th>
                  <th className="p-4 border-b">ชื่อบริการ (Title)</th>
                  <th className="p-4 border-b">การตั้งค่า (Settings)</th>
                  <th className="p-4 border-b text-center">สถานะ</th>
                  <th className="p-4 border-b text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tasks.map((task) => (
                  <AdminTaskRow key={task.id} task={task} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Empty State */}
          {tasks.length === 0 && (
             <div className="p-16 text-center flex flex-col items-center justify-center text-gray-400">
                <div className="bg-gray-100 p-4 rounded-full mb-4">
                  <span className="text-4xl">📂</span>
                </div>
                <h3 className="text-lg font-medium text-gray-900">ยังไม่มีข้อมูล</h3>
                <p className="text-sm mt-1">เริ่มต้นด้วยการกดปุ่ม "เพิ่มบริการใหม่"</p>
             </div>
          )}
        </div>
        
        <div className="mt-8 text-center text-xs text-gray-400">
          AI Service System • Powered by Next.js & Prisma
        </div>
      </main>
    </div>
  );
}