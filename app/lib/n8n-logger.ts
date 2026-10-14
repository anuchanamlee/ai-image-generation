// lib/n8n-logger.ts
'use server'

interface LogData {
  user_id: string
  api_key?: string
  action: string      // เดี๋ยวเราจะส่งค่า "AI Model" เข้ามาที่นี่
  prompt_mode: string // สำหรับ "เลือกบริการ"
  finalPrompt: string // สำหรับ "promptที่ส่งให้ai"
  status: 'start' | 'success' | 'failed' // ✅ เพิ่ม 'start' ตามที่ขอ
  file_output?: string
}

export async function logToGoogleSheet(data: LogData) {
  const webhookUrl = process.env.n8n_log
  if (!webhookUrl) return

  // เติม timestamp อัตโนมัติ
  const payload = {
    ...data,
    timestamp: new Date().toISOString(),
  }

  try {
    // ยิงไป n8n (ไม่ต้อง await ก็ได้ ถ้าอยากให้ User ไม่ต้องรอ Log)
    fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch (error) {
    console.error('Log Error:', error)
  }
}