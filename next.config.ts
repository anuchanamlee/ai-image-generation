// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 👇 1. เพิ่มบรรทัดนี้สำหรับ Docker (ช่วยลดขนาด Image ลงเยอะมาก)
  output: "standalone",

  // 👇 2. ส่วนเดิมของคุณ (กำหนดขนาดไฟล์ Upload)
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', 
    },
  },
};

export default nextConfig;