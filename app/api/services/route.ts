import { prisma } from "../../prisma"; // ตรวจสอบ path ให้ถูกต้อง
import { NextResponse } from "next/server";

// บังคับไม่ให้ Cache เพื่อให้ได้ข้อมูลล่าสุดเสมอ
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const tasks = await prisma.task.findMany({
      where: { enabled: true },
      // เลือกเฉพาะ Field ที่มีอยู่จริงใน Schema ใหม่
      select: {
        id: true,
        title: true,
        masterPrompt: true,
        imageCount: true,
        promptMode: true,
        createdAt: true,
      },
      // เรียงจากใหม่ไปเก่า
      orderBy: { createdAt: 'desc' } 
    });

    // ไม่ต้อง map inputs แล้ว เพราะเราลบตาราง inputs ทิ้งไปแล้ว
    // ส่งข้อมูลดิบกลับไปได้เลย
    return NextResponse.json({ 
      success: true, 
      data: tasks 
    });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" }, 
      { status: 500 }
    );
  }
}