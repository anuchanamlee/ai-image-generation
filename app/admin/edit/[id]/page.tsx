import ServiceBuilder from "../../../components/ServiceBuilder";
import { getTaskById } from "../../../actions/adminActions";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "แก้ไขบริการ | Admin Panel",
};

// Next.js 15: params เป็น Promise ต้อง await
export default async function EditServicePage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params;
  
  // ดึงข้อมูล Task ตาม ID
  const task = await getTaskById(Number(id));

  // ถ้าไม่เจอให้เด้งไปหน้า 404
  if (!task) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      
      {/* Header */}
      <header className="bg-white border-b border-gray-300 sticky top-0 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          
          <div className="flex items-center gap-4">
            <Link 
              href="/admin"
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-black transition-all font-bold"
            >
              ←
            </Link>
            <div>
              <h1 className="text-lg font-extrabold text-black tracking-tight">แก้ไขบริการ</h1>
              <p className="text-xs font-medium text-gray-600">Edit Service ID: {id}</p>
            </div>
          </div>

          <Link 
            href="/admin"
            className="text-sm font-bold text-gray-600 hover:text-red-600 transition-colors bg-gray-100 px-4 py-2 rounded-lg hover:bg-red-50"
          >
            ยกเลิก
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 text-blue-600 rounded-full mb-4 text-3xl shadow-sm">
            ✏️
          </div>
          <h2 className="text-3xl font-extrabold text-black mb-3">ปรับปรุงข้อมูลบริการ</h2>
          <p className="text-gray-700 text-lg font-medium">
            แก้ไขรายละเอียด "{task.title}"
          </p>
        </div>
        
        {/* ส่งข้อมูลเก่า (task) เข้าไปให้ ServiceBuilder */}
        <ServiceBuilder initialData={task} />
      </main>
    </div>
  );
}