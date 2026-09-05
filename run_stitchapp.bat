@echo off
setlocal enabledelayedexpansion
title StitchCSV - College IT Campus Relay ^& AI Server

echo ======================================================================
echo       STITCHCSV - COLLEGE OF INFORMATION TECHNOLOGY CAMPUS RELAY
echo ======================================================================
echo.
echo Connecting local OpenCode AI engine ^& StitchCSV webapp to:
echo   - [1] Next.js Webapp:  http://127.0.0.1:3000
echo   - [2] OpenCode Server: http://127.0.0.1:4096
echo   - [3] Campus Ngrok:    (Auto-configured on launch)
echo.
echo Tip: Run "run_stitchapp.bat --auth" anytime to re-enter your Ngrok token.
echo.

cd /d "%~dp0"

:: ----------------------------------------------------------------------
:: [CLI CONTROLS] Stop / Schedule Handlers
:: ----------------------------------------------------------------------
if /i "%~1"=="--stop" goto DO_STOP
if /i "%~1"=="--schedule" goto DO_SCHEDULE
if /i "%~1"=="--auth" goto DO_AUTH
goto NORMAL_START

:DO_AUTH
echo ======================================================================
echo [NGROK AUTHENTICATION UPDATE]
echo Current Token Path: %LOCALAPPDATA%\ngrok\ngrok.yml
echo ======================================================================
set /p NEW_TOKEN="Enter new Ngrok Authtoken: "
if defined NEW_TOKEN (
    set "NGROK_AUTHTOKEN=!NEW_TOKEN!"
    where ngrok >nul 2>&1
    if !errorlevel! equ 0 (
        call ngrok config add-authtoken "!NEW_TOKEN!" >nul 2>&1
    )
    powershell -NoProfile -Command "Set-Content -Path (Join-Path $env:LOCALAPPDATA 'ngrok\ngrok.yml') -Value ('version: ''2''' + [Environment]::NewLine + 'authtoken: ' + '!NEW_TOKEN!') -Encoding utf8" >nul 2>&1
    echo ======================================================================
    echo [OK] Ngrok Authtoken updated and saved successfully!
    echo ======================================================================
) else (
    echo [CANCELLED] No token entered.
)
exit /b 0

:DO_STOP
echo ======================================================================
echo [CLI STOP] Terminating StitchApp, Tunnel, and OpenCode processes...
echo ======================================================================
powershell -NoProfile -Command "$ports = 3000, 4096; foreach ($port in $ports) { $conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue; if ($conns) { foreach ($c in $conns) { Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue } } }" >nul 2>&1
powershell -NoProfile -Command "$procs = Get-CimInstance Win32_Process; foreach ($p in $procs) { if ($p.CommandLine -like '*tunnel_runner.js*') { Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue } }" >nul 2>&1
echo [CLI STOP] All services stopped.
exit /b 0

:DO_SCHEDULE
if /i "%~2"=="on" goto SCHEDULE_ON
if /i "%~2"=="off" goto SCHEDULE_OFF
if /i "%~2"=="status" goto SCHEDULE_STATUS
echo Usage: run_stitchapp.bat --schedule [on / off / status]
exit /b 1

:SCHEDULE_ON
echo [SCHEDULE] Registering daily 6:00 PM to 9:00 PM auto window for StitchApp...
schtasks /create /f /tn "StitchApp_Relay_Start_6PM" /tr "cmd.exe /c start \"\" \"%~dp0run_stitchapp.bat\"" /sc daily /st 18:00 >nul 2>&1
schtasks /create /f /tn "StitchApp_Relay_Stop_9PM" /tr "cmd.exe /c \"%~dp0run_stitchapp.bat\" --stop" /sc daily /st 21:00 >nul 2>&1
echo ======================================================================
echo [SCHEDULE SUCCESS]
echo   - Auto Start: 6:00 PM (18:00) PHT daily  [StitchApp_Relay_Start_6PM]
echo   - Auto Stop:  9:00 PM (21:00) PHT daily  [StitchApp_Relay_Stop_9PM]
echo ======================================================================
exit /b 0

:SCHEDULE_OFF
echo [SCHEDULE] Disabling and removing StitchApp scheduled tasks...
schtasks /delete /f /tn "StitchApp_Relay_Start_6PM" >nul 2>&1
schtasks /delete /f /tn "StitchApp_Relay_Stop_9PM" >nul 2>&1
echo ======================================================================
echo [SCHEDULE SUCCESS] All StitchApp scheduled tasks disabled.
echo ======================================================================
exit /b 0

:SCHEDULE_STATUS
echo ======================================================================
echo              STITCHAPP TASK SCHEDULER STATUS
echo ======================================================================
schtasks /query /tn "StitchApp_Relay_Start_6PM" 2>nul
schtasks /query /tn "StitchApp_Relay_Stop_9PM" 2>nul
exit /b 0

:NORMAL_START

:: ----------------------------------------------------------------------
:: [SCHEDULE SETTINGS] Auto-Launch Schedule (Philippine Time UTC+8)
:: Default active window: 6:00 PM (18:00) to 9:00 PM (21:00) daily
:: ----------------------------------------------------------------------
set ENABLE_AUTO_SCHEDULE=1
set SCHEDULE_START=18:00
set SCHEDULE_STOP=21:00

if "%ENABLE_AUTO_SCHEDULE%"=="1" (
    schtasks /query /tn "StitchApp_Relay_Start_6PM" >nul 2>&1
    if errorlevel 1 (
        schtasks /create /f /tn "StitchApp_Relay_Start_6PM" /tr "cmd.exe /c start \"\" \"%~dp0run_stitchapp.bat\"" /sc daily /st %SCHEDULE_START% >nul 2>&1
        echo [SCHEDULE] Auto-launch registered for %SCHEDULE_START% PHT daily.
    )
    schtasks /query /tn "StitchApp_Relay_Stop_9PM" >nul 2>&1
    if errorlevel 1 (
        schtasks /create /f /tn "StitchApp_Relay_Stop_9PM" /tr "cmd.exe /c \"%~dp0run_stitchapp.bat\" --stop" /sc daily /st %SCHEDULE_STOP% >nul 2>&1
        echo [SCHEDULE] Auto-shutdown registered for %SCHEDULE_STOP% PHT daily.
    )
) else (
    schtasks /delete /f /tn "StitchApp_Relay_Start_6PM" >nul 2>&1
    schtasks /delete /f /tn "StitchApp_Relay_Stop_9PM" >nul 2>&1
)

:: ----------------------------------------------------------------------
:: [GUARD 0] Single-Instance Mutex (Port 3000 Check)
:: ----------------------------------------------------------------------
netstat -ano | findstr /R /C:":3000 .*LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    echo [AUTO-CLEANUP] Port 3000 is occupied by a previous instance.
    echo Overwriting port 3000: terminating old process to start fresh...
    powershell -NoProfile -Command "$conns = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue; if ($conns) { foreach ($c in $conns) { Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue } }" >nul 2>&1
    ping 127.0.0.1 -n 2 >nul
    echo   -^> Old process terminated. Port 3000 reclaimed [OK]
)

:: ----------------------------------------------------------------------
:: [GUARD 0.5] Environment Configuration Check (.env.local)
:: ----------------------------------------------------------------------
if not exist ".env.local" (
    echo [CONFIG] Generating default .env.local with Campus Relay configuration...
    (
        echo # StitchCSV Local Environment Configuration
        echo OPENCODE_SERVER_URL=https://sandstorm-wilder-drainable.ngrok-free.dev
        echo AI_PROVIDER=gemini
        echo GEMINI_MODEL=gemini-2.0-flash
        echo GEMINI_BASE_URL=https://gemini.api.google.com/v1
        echo NEXT_PUBLIC_SUPABASE_URL=https://nstyqceyjkgevnibfqks.supabase.co
        echo NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdHlxY2V5amtnZXZuaWJmcWtzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2NDMwMzcsImV4cCI6MjA5ODIxOTAzN30.EUozeDCEFqvkLSNOpaBEaXA2D8ZbdPrhGdrNFelpRCU
    ) > ".env.local"
    echo   -^> .env.local initialized with static relay URL [OK]
)

:: ----------------------------------------------------------------------
:: [GUARD 1] Node & Ngrok Dependency Verification
:: ----------------------------------------------------------------------
echo [1/3] Checking Node.js and dependencies...
if not exist "node_modules" (
    echo [INSTALL] First-time setup: installing node dependencies...
    call npm install
)

node -e "require('@ngrok/ngrok')" 2>nul
if %errorlevel% neq 0 (
    echo [INSTALL] Installing official Ngrok cloud SDK...
    call npm install @ngrok/ngrok --no-save
) else (
    echo   -^> Ngrok SDK verified [OK]
)

:: Verify Ngrok Authtoken or prompt user
if not exist "%LOCALAPPDATA%\ngrok\ngrok.yml" (
    if "%NGROK_AUTHTOKEN%"=="" (
        echo.
        echo ======================================================================
        echo [NGROK AUTHENTICATION]
        echo No Ngrok Auth Token detected for your campus relay.
        echo Please paste your Ngrok Authtoken below (from https://dashboard.ngrok.com)
        echo ======================================================================
        set /p USER_NGROK_TOKEN="Enter Ngrok Authtoken: "
        if defined USER_NGROK_TOKEN (
            set "NGROK_AUTHTOKEN=!USER_NGROK_TOKEN!"
            where ngrok >nul 2>&1
            if !errorlevel! equ 0 (
                call ngrok config add-authtoken "!USER_NGROK_TOKEN!" >nul 2>&1
            )
            echo   -^> Ngrok token saved successfully [OK]
        )
    )
)

:: ----------------------------------------------------------------------
:: [GUARD 2] Headless OpenCode Server Check (Port 4096)
:: ----------------------------------------------------------------------
echo [2/3] Checking OpenCode AI Server (Port 4096)...
netstat -ano | findstr /R /C:":4096 .*LISTENING" >nul 2>&1
if %errorlevel% neq 0 (
    echo   -^> Launching headless OpenCode server on http://127.0.0.1:4096...
    start /b "" cmd /c "opencode serve --port 4096 --hostname 127.0.0.1 --pure >nul 2>&1"
    timeout /t 2 >nul
) else (
    echo   -^> OpenCode AI Server is already online [OK]
)

:: ----------------------------------------------------------------------
:: [GUARD 3] Launch Cloud Tunnel & Next.js Server
:: ----------------------------------------------------------------------
echo [3/3] Launching Ngrok Cloud Tunnel for campus students...
start /b "" cmd /c "node tunnel_runner.js"

echo.
echo ======================================================================
echo   STITCHAPP READY: Serving College IT Students on Campus!
echo   Local Webapp: http://127.0.0.1:3000
echo   AI Parser:    http://127.0.0.1:3000/api/ai-parse
echo ======================================================================
echo.

call pnpm run dev || npm run dev
if %errorlevel% neq 0 (
    echo.
    echo ======================================================================
    echo [ERROR] Server exited with code %errorlevel%.
    echo ======================================================================
    pause
)
