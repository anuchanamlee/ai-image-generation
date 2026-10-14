// actions/authActions.ts
'use server'

import { prisma } from "../prisma"; // หรือ ../prisma ตามโครงสร้างคุณ
import { compare } from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, SESSION_TTL_MS, signSession } from "../lib/session";

// ต้องมี prevState เพื่อรับค่าจาก useActionState (หรือ useFormState)
export async function login(prevState: any, formData: FormData) {
  try {
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;

    console.log(`🔍 กำลังตรวจสอบ Login: ${username}`);

    // 1. Validation เบื้องต้น
    if (!username || !password) {
      return { success: false, message: "กรุณากรอกข้อมูลให้ครบ" };
    }

    // 2. หา User ด้วย username อย่างเดียว (Prisma Best Practice)
    const user = await prisma.adminUser.findUnique({
      where: { username }
    });

    // 3. ตรวจสอบว่า "มี User ไหม" และ "Active อยู่ไหม"
    if (!user || !user.active) {
      console.log("❌ ไม่พบ User หรือ User ถูกระงับ");
      // เพื่อความปลอดภัย ไม่ควรบอกละเอียดว่า Username ผิด หรือ Password ผิด
      return { success: false, message: "Username หรือ Password ไม่ถูกต้อง" };
    }

    // 4. เช็ค Password
    const isPasswordValid = await compare(password, user.passwordHash);
    
    if (!isPasswordValid) {
      console.log("❌ รหัสผ่านผิด");
      return { success: false, message: "Username หรือ Password ไม่ถูกต้อง" };
    }

    console.log("✅ Login สำเร็จ! กำลังสร้าง Cookie...");

    // 5. Signed session cookie (HMAC) - the server can tell a forged cookie from a real one
    (await cookies()).set(SESSION_COOKIE, await signSession(user.id, user.role), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      expires: Date.now() + SESSION_TTL_MS,
      path: "/",
      sameSite: "lax",
    });

  } catch (error) {
    console.error("Login Error:", error);
    return { success: false, message: "เกิดข้อผิดพลาดของระบบ กรุณาลองใหม่" };
  }

  // 6. Redirect ต้องอยู่นอก try-catch (เพราะ redirect ของ Next.js ทำงานโดยการ throw error)
  redirect("/admin");
}

export async function logout() {
  // ลบ Cookie
  (await cookies()).delete(SESSION_COOKIE);
  
  // กลับหน้าแรก
  redirect("/");
}