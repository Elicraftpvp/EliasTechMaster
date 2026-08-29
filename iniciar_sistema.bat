@echo off
chcp 65001 > nul
title EliasTechMaster - Servidor Local

cd /d "%~dp0"

echo ======================================================
echo           EliasTechMaster - Sistema Local OS
echo ======================================================
echo.

taskkill /f /im php.exe >nul 2>&1
timeout /t 1 >nul

set "PHP_CMD=C:\php\php.exe"

if not exist "%PHP_CMD%" (
    echo [ERRO] PHP nao foi encontrado em C:\php\php.exe
    echo Instale o PHP 8.3 em C:\php antes de continuar.
    pause
    exit /b 1
)

echo [OK] PHP: "%PHP_CMD%"
"%PHP_CMD%" -v | findstr /C:"PHP 8"
echo [OK] Pasta: %CD%
echo [OK] Banco de Dados: SQLite
echo.
echo Servidor rodando em: http://localhost:8000
echo Mantenha esta janela aberta.
echo Para encerrar, feche a janela ou pressione CTRL+C.
echo.

start "" cmd /c "timeout /t 2 >nul & start http://localhost:8000/auth/login.html"

"%PHP_CMD%" -S localhost:8000

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Servidor encerrado com erro %ERRORLEVEL%.
    pause
)