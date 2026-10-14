'use server'

import { prisma } from "../prisma"; // แนะนำให้ใช้ @ ถ้าตั้ง path alias ไว้ หรือใช้ ../prisma ตามเดิมถ้า error
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession } from "../lib/session";

// Server actions can be POSTed to directly, bypassing proxy.ts, so every action checks the session itself.
async function requireAdmin() {
  const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) throw new Error("Unauthorized");
  return session;
}

// ==========================================
// 1. READ (ดึงข้อมูล)
// ==========================================

export async function getTaskById(id: number) {
  await requireAdmin();
  try {
    const task = await prisma.task.findUnique({
      where: { id },
    });
    return task;
  } catch (error) {
    console.error("Database Error:", error);
    return null;
  }
}

// ==========================================
// 2. CREATE (สร้างใหม่)
// ==========================================

export async function createTask(formData: FormData) {
  await requireAdmin();
  try {
    // ดึงค่าและ Validate เบื้องต้น
    const title = formData.get("title") as string;
    const masterPrompt = formData.get("masterPrompt") as string;
    const promptMode = formData.get("promptMode") as string;
    
    // แปลงตัวเลข และกันค่า Null/NaN (Default เป็น 1)
    const rawImageCount = formData.get("imageCount");
    const imageCount = rawImageCount ? parseInt(rawImageCount.toString()) : 1;

    // Validation อย่างง่าย
    if (!title || !masterPrompt) {
      return { success: false, message: "กรุณากรอกข้อมูลให้ครบถ้วน" };
    }

    // บันทึกลง DB (โครงสร้างใหม่ ไม่มี inputs/key/note แล้ว)
    await prisma.task.create({
      data: {
        title,
        masterPrompt,
        imageCount: isNaN(imageCount) ? 1 : imageCount, // กันเหนียวถ้า parse ไม่ผ่าน
        promptMode,
        enabled: true, // เริ่มต้นให้เปิดใช้งานเลย
      },
    });

    // รีเฟรชหน้าเว็บ
    revalidatePath("/admin");
    revalidatePath("/");
    return { success: true, message: "สร้างบริการสำเร็จ!" };

  } catch (error) {
    console.error("Create Error:", error);
    return { success: false, message: "เกิดข้อผิดพลาดในการบันทึก" };
  }
}

// ==========================================
// 3. UPDATE (แก้ไข)
// ==========================================

export async function updateTask(id: number, formData: FormData) {
  await requireAdmin();
  try {
    const title = formData.get("title") as string;
    const masterPrompt = formData.get("masterPrompt") as string;
    const promptMode = formData.get("promptMode") as string;
    
    const rawImageCount = formData.get("imageCount");
    const imageCount = rawImageCount ? parseInt(rawImageCount.toString()) : 1;

    await prisma.task.update({
      where: { id },
      data: {
        title,
        masterPrompt,
        imageCount: isNaN(imageCount) ? 1 : imageCount,
        promptMode,
      },
    });

    revalidatePath("/admin");
    revalidatePath("/");
    return { success: true, message: "แก้ไขข้อมูลสำเร็จ!" };

  } catch (error) {
    console.error("Update Error:", error);
    return { success: false, message: "เกิดข้อผิดพลาดในการแก้ไข" };
  }
}

// ==========================================
// 4. TOGGLE & DELETE (จัดการสถานะ)
// ==========================================

export async function toggleTaskStatus(taskId: number, currentStatus: boolean) {
  await requireAdmin();
  try {
    await prisma.task.update({
      where: { id: taskId },
      data: { enabled: !currentStatus },
    });
    
    revalidatePath("/admin");
    revalidatePath("/");
    return { success: true, message: "อัปเดตสถานะสำเร็จ" };
  } catch (error) {
    console.error("Toggle Error:", error);
    return { success: false, message: "เกิดข้อผิดพลาด" };
  }
}

export async function deleteTask(taskId: number) {
  await requireAdmin();
  try {
    await prisma.task.delete({
      where: { id: taskId },
    });
    
    revalidatePath("/admin");
    revalidatePath("/");
    return { success: true, message: "ลบข้อมูลสำเร็จ" };
  } catch (error) {
    console.error("Delete Error:", error);
    return { success: false, message: "ไม่สามารถลบได้" };
  }
}