@echo off
REM ====================================================================
REM  Instalador del bot de recordatorios (correr UNA vez en el PC del local)
REM  Instala lo necesario y arranca para escanear el QR del DUENO.
REM ====================================================================
cd /d "%~dp0"
echo.
echo ====================================================
echo   Instalando el bot de recordatorios...
echo   (la primera vez tarda unos minutos, espera)
echo ====================================================
echo.
call npm install
echo.
echo ====================================================
echo   Ahora escanea el QR con el WhatsApp del DUENO:
echo   WhatsApp - Dispositivos vinculados - Vincular
echo   Cuando diga "Bot listo", cierra esta ventana.
echo ====================================================
echo.
call npm start
pause
