@echo off
setlocal

where pwsh.exe >nul 2>nul
if not errorlevel 1 (
  pwsh.exe -NoLogo -NoProfile -File "%~dp0start-dev-services.ps1" %*
  exit /b %ERRORLEVEL%
)

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-dev-services.ps1" %*
exit /b %ERRORLEVEL%
