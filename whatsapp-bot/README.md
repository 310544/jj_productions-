# Bot de recordatorios al sastre (desde el WhatsApp del dueño) 👔

Programita que corre en el **computador del local**. Cada día revisa los trajes a
la medida y le manda un WhatsApp al sastre **desde el número del dueño**, automático:
- **Aviso 1:** faltan 5 días (editable).
- **Aviso 2:** falta 1 día / "mañana" (editable).

Cada aviso se manda **una sola vez**. El dueño no hace nada en el día a día.

---

## Instalación (una sola vez, en el computador del local)

### 1. Instalar Node.js
Descarga e instala la versión **LTS** de https://nodejs.org (dale "Siguiente" a todo).

### 2. Copiar esta carpeta al computador del local
Copia toda la carpeta `whatsapp-bot` a, por ejemplo, `C:\rentatraje-bot`.

### 3. Instalar y arrancar
Abre esa carpeta, y en la barra de direcciones escribe `cmd` + Enter. Luego:
```
npm install
npm start
```
La primera vez descarga lo necesario (tarda un par de minutos).

### 4. Escanear el QR (una sola vez)
Aparece un **código QR** en la pantalla. En el celular del **dueño**:
WhatsApp → **Dispositivos vinculados** → **Vincular un dispositivo** → escanea el QR.

Cuando diga `🤖 Bot listo`, ¡ya está! Ya puede enviar desde el número del dueño.

### 5. Que arranque solo al prender el PC (y que nadie lo pueda cerrar)
- Presiona `Win + R`, escribe `shell:startup` y Enter (se abre la carpeta de Inicio).
- Arrastra ahí un **acceso directo** a **`start-bot-hidden.vbs`** (corre el bot
  **oculto**, sin ventana negra, para que nadie lo cierre por error).

Así, cada vez que prendan el computador, el bot arranca solo y en segundo plano.
Revisa al arrancar y todos los días a las 10:00 a.m. (se cambia con `HORA_ENVIO`).

> Si prefieres verlo funcionando (con ventana), usa `start-bot.bat` en vez del `.vbs`.

### Cómo apagar / reiniciar el bot oculto
Como no tiene ventana, para apagarlo: abre el **Administrador de tareas**
(`Ctrl + Shift + Esc`) → pestaña **Detalles** → busca **node.exe** → **Finalizar tarea**.
Para volver a arrancarlo, doble clic al `.vbs` (o reinicia el PC).

---

## En la app (⚙️ del tab "A la medida")
- **Número:** el del **SASTRE** (con `57` adelante) — es a quien le llega el aviso.
- **Clave de CallMeBot:** déjala **vacía** (con este bot no se necesita).
- **Días:** 5 y 1 (o los que quieras).

---

## Notas
- El computador debe estar **prendido a la hora del envío** (10 a.m. por defecto).
  Como también revisa **al arrancar**, con que lo prendan en el día, alcanza.
- Si algún día WhatsApp cierra el dispositivo vinculado, vuelve a correr `npm start`
  y escanea el QR de nuevo.
- Volumen bajo (pocos mensajes) = riesgo mínimo. No lo uses para mandar en masa.
- **Importante:** si antes activaste el envío por CallMeBot, desactívalo para que no
  se dupliquen los avisos (en Supabase SQL Editor):
  `SELECT cron.unschedule('recordatorio-sastre-diario');`
