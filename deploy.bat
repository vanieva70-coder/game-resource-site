@echo off
title 游戏资源站 - 一键更新上线
cd /d "%~dp0"
echo.
echo  正在上传更新到 Cloudflare Pages ...
echo  （改完 games.json 或图片后，双击本文件即可更新网站）
echo.
"C:\Users\Administrator\.dsh\dsh-runtimes\dsh-plugin-desktop-primary-runtime\dependencies\node\bin\node.exe" "D:\deepseek\.tools\wrangler\node_modules\wrangler\bin\wrangler.js" pages deploy . --project-name game-resource-hub --commit-dirty=true
echo.
echo  正在备份代码到 GitHub ...
set "PATH=C:\Program Files\Git\cmd;%PATH%"
git add -A
git commit -m "更新资源站" --allow-empty >nul 2>nul
git push
echo.
echo  --------------------------------------------------
echo   更新完成！网站地址： https://game-resource-hub.pages.dev
echo  --------------------------------------------------
echo.
pause
