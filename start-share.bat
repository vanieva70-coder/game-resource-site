@echo off
title 游戏资源站 - 一键分享
echo.
echo  ============================================
echo    正在启动本地服务器和公网隧道，请稍候...
echo  ============================================
echo.
start "site-server" /min "C:\Users\Administrator\.dsh\dsh-runtimes\dsh-plugin-desktop-primary-runtime\dependencies\python\python.exe" -m http.server 8010 --directory "%~dp0" --bind 127.0.0.1
timeout /t 2 /nobreak >nul
"D:\deepseek\.tools\cloudflared.exe" tunnel --url http://127.0.0.1:8010 --no-autoupdate
echo.
echo  隧道已关闭。按任意键退出...
pause >nul
