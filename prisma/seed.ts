// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🗑️  กำลังล้างข้อมูลเก่า...')
  await prisma.task.deleteMany()
  await prisma.adminUser.deleteMany()

  console.log('🌱 กำลังสร้างข้อมูลใหม่...')

  // 1. สร้าง Admin (user: admin / pass: 1234)
  const password = await hash('1234', 12)
  await prisma.adminUser.create({
    data: {
      username: 'admin',
      passwordHash: password,
      displayName: 'Super Admin',
      role: 'superadmin',
    }
  })

  // 2. สร้าง Task ตัวอย่าง (ตามโครงสร้างใหม่)
  
  // แบบที่ 1: USER Mode (ให้ User พิมพ์ Prompt เพิ่ม)
  await prisma.task.create({
    data: {
      title: '✨ AI วาดรูปตามสั่ง (Custom)',
      masterPrompt: 'high quality, 8k, detailed, ', // ทิ้งท้ายไว้รอ User พิมพ์ต่อ
      imageCount: 1,
      promptMode: 'USER',
      enabled: true
    }
  })

  // แบบที่ 2: FIXED Mode (User กดปุ่มอย่างเดียว ได้รูปเลย)
  await prisma.task.create({
    data: {
      title: '📸 สร้างรูปโปรไฟล์เกาหลี',
      masterPrompt: 'korean portrait, soft lighting, pastel colors, high quality, photorealistic',
      imageCount: 1,
      promptMode: 'FIXED',
      enabled: true
    }
  })

  // แบบที่ 3: หลายรูป
  await prisma.task.create({
    data: {
      title: '🎨 ไอเดียโลโก้ (4 แบบ)',
      masterPrompt: 'minimal vector logo, flat design, white background',
      imageCount: 4,
      promptMode: 'USER',
      enabled: true
    }
  })

  console.log('✅ Seeding สำเร็จ!')
}

main()
  .then(async () => await prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })