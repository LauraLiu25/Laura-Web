@echo off
cd /d "%~dp0ai-matcher"
if not exist .env (
  echo [提示] 请先运行: copy .env.example .env  并填写 NEWAPI_API_KEY
)
call npm start
