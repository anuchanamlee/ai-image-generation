'use server'

import { prisma } from "../prisma";


export type FormState = {
  success: boolean;
  message: string;
  data?: any;
};

// ==============================================================================
// 🔧 CONFIGURATION URLs
// ==============================================================================
const N8N_AUTH_URL = process.env.N8N_AUTH_URL || "http://host.docker.internal:5678/webhook/api/verify-key";
const N8N_LOG_START_URL = process.env.N8N_LOG_START_URL || "http://host.docker.internal:5678/webhook/api/log-start";
const N8N_LOG_END_URL = process.env.N8N_LOG_END_URL || "http://host.docker.internal:5678/webhook/api/log-end";

const MODEL_ENDPOINTS: Record<string, string> = {
  'Gemini 2.5 Flash': process.env.Gemini_2_5_Flash_Image || "http://host.docker.internal:5678/webhook/api/Gemini-2.5-Flash-Image",
};

// ==============================================================================
// 🛠️ HELPER FUNCTIONS
// ==============================================================================
async function safeParseResponse(response: Response) {
  const text = await response.text();
  try { return JSON.parse(text); } catch (e) { return { raw_response: text }; }
}

function formatBase64Image(data: any, mimeType: string = 'image/png'): string | null {
  if (!data || typeof data !== 'string') return null;
  if (data.length < 100) return null;
  if (data.startsWith('data:image')) return data;
  return `data:${mimeType};base64,${data}`;
}

// ฟังก์ชันช่วยยิง Log Start (Fire & Forget)
async function fireLogStart(payload: any) {
    console.log("📝 Sending Log Start...");
    // ใช้ timeout สั้นๆ สำหรับ log เพื่อไม่ให้หน่วงระบบ
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 3000); // 3 วินาที

    fetch(N8N_LOG_START_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ...payload,
            status: 'start',
            timestamp: new Date().toISOString()
        }),
        signal: controller.signal
    })
    .catch(e => console.warn("⚠️ Log Start Warning (Non-blocking):", e.message))
    .finally(() => clearTimeout(id));
}

// ==============================================================================
// 🚀 MAIN ACTION
// ==============================================================================
export async function submitWorkflow(taskId: number, formData: FormData): Promise<FormState> {
  const model = formData.get("model") as string;
  console.log(`\n🔵 ===== START TASK ID: ${taskId} | Model: ${model} =====`);

  const userApiKey = formData.get("apiKey") as string;
  const userPrompt = formData.get("userPrompt") as string || "";
  let userId = "Verifying Key..."; 
  let finalPrompt = ""; 

  try {
    const imageFiles = formData.getAll("imageFiles") as File[];
    
    if (!userApiKey) return { success: false, message: "กรุณาระบุ API Key" };
    if (imageFiles.length === 0) return { success: false, message: "กรุณาเลือกรูปภาพอย่างน้อย 1 รูป" };
    if (!model) return { success: false, message: "กรุณาเลือกโมเดล AI" };

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) return { success: false, message: "ไม่พบข้อมูลบริการ" };

    finalPrompt = task.masterPrompt;
    if (task.promptMode === 'USER' && userPrompt.trim()) {
      finalPrompt = `${task.masterPrompt} ${userPrompt}`;
    }

    // --------------------------------------------------------------------------
    // 🔐 STEP 1: Check Auth (N8N)
    // --------------------------------------------------------------------------
    const authFormData = new FormData();
    authFormData.append("apiKey", userApiKey); 
    
    // Auth Timeout 10s
    const authController = new AbortController();
    const authTimeout = setTimeout(() => authController.abort(), 10000); 

    let authRes;
    try {
      authRes = await fetch(N8N_AUTH_URL, { method: "POST", body: authFormData, signal: authController.signal });
    } catch (err: any) {
        if (err.name === 'AbortError') throw new Error("AUTH_TIMEOUT: เชื่อมต่อระบบตรวจสอบสิทธิ์ไม่สำเร็จ (Timeout)");
        throw new Error("AUTH_CONNECTION_FAILED: ไม่สามารถติดต่อ N8N ได้");
    } finally { clearTimeout(authTimeout); }

    const authJson = await safeParseResponse(authRes);
    if (!authRes.ok) return { success: false, message: "Auth Failed", data: authJson };

    if (authJson.user) userId = authJson.user; 
    else if (authJson.data?.user) userId = authJson.data.user;
    else userId = `Unknown (${userApiKey.slice(0,5)}...)`; 

    let remainingCredits = authJson.data?.remaining_credits;
    if (Array.isArray(authJson) && authJson[0]?.keyData) {
        const k = authJson[0].keyData;
        if(k.limit !== undefined && k.used !== undefined) remainingCredits = k.limit - k.used;
    }

    // ==================================================================================
    // ⚡ CASE 1: DIRECT RAW MODE (Gemini 3 Pro)
    // ==================================================================================

    if (model === 'Gemini 3 Pro' || model === 'gemini-3-pro-image-preview') {
        
        console.log(`⚡ DIRECT RAW MODE: ${model} with ${imageFiles.length} images`);
        
        const systemGoogleKey = process.env.GOOGLE_API_KEY;
        if (!systemGoogleKey) return { success: false, message: "Server Google API Key not found" };

        const parts: any[] = [{ text: finalPrompt }];
        for (const file of imageFiles) {
            const arrayBuffer = await file.arrayBuffer();
            const base64Image = Buffer.from(arrayBuffer).toString("base64");
            parts.push({
                inline_data: { mime_type: file.type, data: base64Image }
            });
        }
        
        fireLogStart({
            user_id: userId, api_key: userApiKey, action: model, prompt_mode: task.title, 
            finalPrompt: finalPrompt
        });

        const requestBody = {
            contents: [{ parts: parts }],
            generationConfig: { temperature: 0.4, topK: 32, topP: 1, maxOutputTokens: 2048 }
        };

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${systemGoogleKey}`;
        
        // 🔥 เพิ่ม Controller สำหรับ Google Timeout (2 นาที)
        const googleController = new AbortController();
        const googleTimeout = setTimeout(() => googleController.abort(), 120000); // 120 วินาที

        let response;
        try {
            console.log(`📡 Sending Request to Google...`);
            response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestBody),
                signal: googleController.signal,
                // @ts-ignore: duplex option is valid in node environment but might verify types issue
                duplex: 'half' // ช่วยเรื่องการส่ง Body ขนาดใหญ่
            });
        } catch (error: any) {
            if (error.name === 'AbortError') {
                throw new Error("Google API Timeout: ใช้เวลานานเกิน 2 นาที (รูปอาจจะใหญ่เกินไป หรือ Google ช้าผิดปกติ)");
            }
            throw error; // โยน Error อื่นๆ ต่อไป
        } finally {
            clearTimeout(googleTimeout);
        }

        let json = await response.json();
        if (Array.isArray(json)) json = json[0];

        let outputImageBase64: string | null = null;
        if (json.candidates && json.candidates[0]?.content?.parts) {
             const parts = json.candidates[0].content.parts;
             for (const part of parts) {
                 if (part.data) { outputImageBase64 = part.data; break; }
                 if (part.inlineData?.data) { outputImageBase64 = part.inlineData.data; break; }
                 if (part.inline_data?.data) { outputImageBase64 = part.inline_data.data; break; }
             }
        }

        if (!outputImageBase64) {
             console.log("JSON DUMP:", JSON.stringify(json).substring(0,200));
             
             // เช็ค Error จาก Google
             if (json.error) {
                 return { success: false, message: `Google Error: ${json.error.message || JSON.stringify(json.error)}` };
             }

             return { success: true, message: "No Image Found", data: { output: "ไม่พบข้อมูลภาพ (AI อาจตอบเป็น Text)" } };
        }

        const formattedImage = formatBase64Image(outputImageBase64);
        
        // LOG END
        fetch(N8N_LOG_END_URL, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: userId, api_key: userApiKey, action: model, prompt_mode: task.title, 
                finalPrompt: finalPrompt, status: 'success', 
                file_output: outputImageBase64.substring(0, 50),
                timestamp: new Date().toISOString()
            })
        }).catch(err => console.error("Log End Error:", err));

        return { 
            success: true, message: "Success!", 
            data: { images: [formattedImage], remaining_credits: remainingCredits } 
        };
    }

    // ==================================================================================
    // 🐢 CASE 2: N8N MODE (Fallback / Gemini 2.5)
    // ==================================================================================
    console.log(`🐢 N8N MODE for: ${model}`);
    const targetApiUrl = MODEL_ENDPOINTS[model];
    if (!targetApiUrl) return { success: false, message: `Model not found: ${model}` };

    fireLogStart({
        user_id: userId, api_key: userApiKey, action: model, prompt_mode: task.title, 
        finalPrompt: finalPrompt
    });

    const genFormData = new FormData();
    genFormData.append("serviceTitle", task.title);
    genFormData.append("prompt", finalPrompt);
    genFormData.append("model", model);
    imageFiles.forEach((file) => genFormData.append("images", file));

    // N8N Timeout 3 นาที
    const n8nController = new AbortController();
    const n8nTimeout = setTimeout(() => n8nController.abort(), 180000);

    let genRes;
    try {
        genRes = await fetch(targetApiUrl, { 
            method: "POST", 
            body: genFormData,
            signal: n8nController.signal
        });
    } catch (error: any) {
         if (error.name === 'AbortError') throw new Error("N8N Processing Timeout (3 mins)");
         throw error;
    } finally {
        clearTimeout(n8nTimeout);
    }

    let genJson = await safeParseResponse(genRes);

    if (!genRes.ok) throw new Error(genJson.error || "AI Error");

    if (Array.isArray(genJson)) {
        genJson = genJson[0];
    }

    console.log("🐢 N8N JSON Keys:", Object.keys(genJson));

    let imageOutput = genJson.data || genJson.output || genJson.image || genJson.images || genJson.raw_response;
    
    // Drill down logic
    if (imageOutput && typeof imageOutput === 'object') {
         console.log("🕵️ Found object in 'images/data' field, digging deeper...");
         if (imageOutput.candidates && imageOutput.candidates[0]?.content?.parts) {
             const parts = imageOutput.candidates[0].content.parts;
             for (const part of parts) {
                 if (part.inlineData?.data) { imageOutput = part.inlineData.data; break; }
                 if (part.inline_data?.data) { imageOutput = part.inline_data.data; break; }
                 if (part.data) { imageOutput = part.data; break; }
             }
         }
         else if (imageOutput.data && typeof imageOutput.data === 'string') {
             imageOutput = imageOutput.data;
         }
    }

    const formattedImage = formatBase64Image(imageOutput);
    
    if (!formattedImage) {
        console.error("❌ N8N Response Body:", JSON.stringify(genJson).substring(0, 500));
        throw new Error("No image data found in N8N response");
    }

    const pureBase64 = formattedImage.split(',')[1];
    
    // LOG END
    await fetch(N8N_LOG_END_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            user_id: userId, api_key: userApiKey, action: model, prompt_mode: task.title, finalPrompt: finalPrompt,
            status: 'success', file_output: pureBase64, timestamp: new Date().toISOString()
        })
    }).catch(err => console.error("Log End Error:", err));

    return { 
      success: true, message: "Success!",
      data: { images: [formattedImage], remaining_credits: remainingCredits }
    };

  } catch (error: any) {
    console.error("Error:", error);
    return { success: false, message: error.message };
  }
}