@echo off
TITLE Next.js Quick Tunnel Installer (Docker Version)
COLOR 0A

echo ========================================================
echo      Starting Your Application with Cloudflare Tunnel
echo ========================================================

REM 1. เช็คว่าลูกค้ามี Docker ไหม
docker --version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Docker is not installed!
    echo Please install Docker Desktop first.
    PAUSE
    EXIT /B
)

REM 2. สร้าง .env อัตโนมัติ
IF NOT EXIST .env (
    echo [INFO] Creating .env file from template...
    copy .env.example .env >nul
)

REM ========================================================
REM 3. (จุดที่แก้) สั่งล้างของเก่า และ Build ใหม่แบบไม่จำ Cache
REM    เพื่อแก้ปัญหาหาไฟล์ dev.db ไม่เจอแน่นอน 100%
REM ========================================================
echo [INFO] Stopping old containers...
docker-compose down

echo [INFO] Building fresh image (Force No-Cache)...
echo [WAIT] This ensures the Database is created correctly. Please wait...
docker-compose build --no-cache

echo [INFO] Starting containers...
docker-compose up -d

REM 4. รอให้ Cloudflare สร้างลิงก์เสร็จ
echo.
echo ========================================================
echo [WAIT] Waiting 15 seconds to generate public URL...
echo ========================================================
timeout /t 15 >nul

echo.
echo ========================================================
echo      YOUR PUBLIC LINK IS BELOW:
echo ========================================================
echo.

REM 5. ดึงลิงก์จาก Log ของ Docker มาโชว์ลูกค้าทันที
docker logs quick-tunnel 2>&1 | findstr ".trycloudflare.com"

echo.
echo ========================================================
echo Copy the link above and paste it into your browser.
echo.
echo DO NOT CLOSE THIS WINDOW (Minimize it to keep app running)
pause