@echo off
title 游戏资源站 - 一键部署
cd /d "%~dp0"
echo.
echo  正在上传新页面到 Cloudflare Pages ...
echo  修改 games.json 或图片后，双击本文件即可更新网站。
echo.

rem ---- 读取 .env 里的 API Token ----
if exist ".env" (
  for /f "usebackq tokens=1,* delims==" %%a in (".env") do (
    if "%%a"=="CLOUDFLARE_API_TOKEN" set "CLOUDFLARE_API_TOKEN=%%b"
    if "%%a"=="CLOUDFLARE_ACCOUNT_ID" set "CLOUDFLARE_ACCOUNT_ID=%%b"
  )
)

if "%CLOUDFLARE_API_TOKEN%"=="" (
  echo  [X] 找不到 .env 里的 CLOUDFLARE_API_TOKEN
  echo      请确认本目录下有 .env 文件。
  pause
  exit /b 1
)

"C:\Users\Administrator\.dsh\dsh-runtimes\dsh-plugin-desktop-primary-runtime\dependencies\node\bin\node.exe" "D:\deepseek\.tools\wrangler\node_modules\wrangler\bin\wrangler.js" pages deploy . --project-name gamehub --commit-dirty=true

echo.
echo  正在备份代码到 GitHub ...
set "PATH=C:\Program Files\Git\cmd;%PATH%"
git add -A
git commit -m "游戏资源站" --allow-empty >nul 2>nul
git push

echo.
echo  --------------------------------------------------
echo   部署完成，网站地址：https://gamehub-bym.pages.dev
echo  --------------------------------------------------
echo.
pause
