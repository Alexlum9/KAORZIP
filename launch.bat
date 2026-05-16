@echo off
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion

set "FILE=%~dp0index.html"

:: ── Пробуем найти Chrome ──────────────────────────────────────
set "CHROME="

for %%P in (
    "%ProgramFiles%\Google\Chrome\Application\chrome.exe"
    "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
    "%LocalAppData%\Google\Chrome\Application\chrome.exe"
) do (
    if exist %%P (
        set "CHROME=%%~P"
        goto :found
    )
)

:: Попробуем из реестра
for /f "tokens=2,*" %%a in (
    'reg query "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe" /ve 2^>nul'
) do (
    if exist "%%b" (
        set "CHROME=%%b"
        goto :found
    )
)

:: Chrome не найден
:notfound
echo.
echo  ════════════════════════════════════════
echo    KAORZIP — Google Chrome не найден
echo  ════════════════════════════════════════
echo.
echo  Установите Google Chrome:
echo  https://www.google.com/chrome/
echo.
echo  Или откройте вручную:
echo  %FILE%
echo.
pause
exit /b 1

:found
start "" "%CHROME%" "%FILE%"
exit /b 0
