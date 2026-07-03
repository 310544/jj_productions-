# Instalar el bot en el computador del local 👔
### (chuleta rápida — hazlo una sola vez)

Ten a la mano: el **celular del dueño** (para el QR).

---

## PASO 1 — Instalar Node.js
- Entra a **nodejs.org**
- Dale al botón verde **"Windows Installer (.msi)"**
- Instálalo: Siguiente → Siguiente → Finalizar
  *(NO uses la parte de "Docker", ignórala.)*

## PASO 2 — Pasar la carpeta al computador
- Copia la carpeta **`whatsapp-bot`** (por USB) a `C:\` (para encontrarla fácil).
- Revisa que adentro esté el archivo **`.env`** (trae las claves).

## PASO 3 — Instalar y vincular
- Entra a la carpeta y **doble clic en `INSTALAR.bat`**
- Espera 2–3 minutos (baja lo que necesita)
- Sale un **QR** → el **DUEÑO** lo escanea con su WhatsApp:
  *WhatsApp → Dispositivos vinculados → Vincular un dispositivo*
- Cuando diga **"Bot listo"** → cierra la ventana

## PASO 4 — Que arranque solo (y escondido)
- Clic derecho en **`start-bot-hidden.vbs`** → **Crear acceso directo**
- Presiona **`Win + R`**, escribe **`shell:startup`**, Enter
- **Pega ahí** el acceso directo

## PASO 5 — Reiniciar y probar
- **Reinicia** el computador
- Espera medio minuto (no abras nada)
- En la app, tab "A la medida" → ⚙️ → botón **Prueba**
- Si llega el WhatsApp → ✅ ¡Todo listo!

---

## Y ya. De ahí en adelante:
Prenden el computador → el bot arranca solo, escondido → manda los avisos desde
el número del dueño. **Nunca más QR, nunca más terminal.**

### Si algún día toca apagar el bot
Administrador de tareas (`Ctrl + Shift + Esc`) → **Detalles** → `node.exe` → Finalizar tarea.
Para prenderlo otra vez: doble clic al `.vbs` (o reinicia el PC).
