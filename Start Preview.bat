@echo off
REM Double-click this file to preview the website locally with your data changes.
REM It opens the site in your default browser at http://localhost:8000
REM Close this window when you're done previewing.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0preview.ps1"
pause
