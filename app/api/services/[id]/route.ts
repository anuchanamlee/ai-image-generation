import { prisma } from "../../../prisma"; // ตรวจสอบ path ให้ถูกต้อง
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  // รับ params เป็น id แทน key
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. รอรับค่า params (Next.js 15)
    const { id } = await params;
    
    // 2. แปลง id เป็นตัวเลข (เพราะใน DB id เป็น Int)
    const taskId = parseInt(id);

    if (isNaN(taskId)) {
      return NextResponse.json(
        { success: false, message: "Invalid ID format" },
        { status: 400 }
      );
    }

    // 3. ค้นหาข้อมูลจาก DB (ไม่ต้อง include inputs แล้ว)
    const task = await prisma.task.findUnique({
      where: { id: taskId }
    });

    if (!task) {
      return NextResponse.json(
        { success: false, message: `Service ID ${id} not found` },
        { status: 404 }
      );
    }

    // 4. ส่งข้อมูลกลับ (Database ใหม่ไม่มี inputs ให้ format แล้ว ส่ง raw data ได้เลย)
    return NextResponse.json({ 
      success: true, 
      data: task 
    });

  } catch (error) {
    console.error("❌ API Error Detail:", error);
    
    return NextResponse.json(
      { success: false, message: "Error fetching service" }, 
      { status: 500 }
    );
  }
}