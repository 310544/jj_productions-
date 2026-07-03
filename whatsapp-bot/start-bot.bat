@echo off
REM Arranca el bot de recordatorios. Un acceso directo a este .bat en la carpeta
REM de Inicio de Windows hace que el bot se prenda solo al encender el PC.
cd /d "%~dp0"
node index.mjs
pause
