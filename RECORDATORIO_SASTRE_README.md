# Recordatorio automático al sastre 👔

Avisa por WhatsApp a quien hace los trajes a la medida cuando se acerca la entrega:
- **Aviso 1:** faltan 5 días (editable).
- **Aviso 2:** falta 1 día / "se entrega mañana" (editable).

Cada aviso se manda **una sola vez**. Funciona **solo**, aunque nadie abra la app.

---

## Pasos para activarlo (una sola vez)

### 1. Crear las tablas
En Supabase → **SQL Editor** → pega y corre el archivo:
`recordatorio_sastre_schema.sql`

### 2. Poner el número del sastre
En la app → tab **"A la medida"** → botón **⚙️** (arriba a la derecha):
- Nombre del sastre.
- **WhatsApp con indicativo** (Colombia = `57` + número, ej. `573001234567`).
- **Clave de CallMeBot** (ver abajo cómo se saca).
- Días de aviso (5 y 1 por defecto).
- Botón **"Prueba"** para confirmar que le llega.

> **Sacar la clave de CallMeBot (gratis, 1 minuto):** el sastre agrega el contacto
> **+34 644 51 95 23** en WhatsApp y le manda el mensaje:
> *"I allow callmebot to send me messages"*. Le responden con su **apikey**; se pega en el ⚙️.
> ⚠️ La clave es **por número**: si cambias de sastre, el nuevo repite este paso.

### 3. Desplegar la función del servidor
En Supabase → **Edge Functions** → **Deploy a new function**:
- Nombre: `recordatorio-sastre`
- Pega el contenido de `supabase/functions/recordatorio-sastre/index.ts` y despliega.

*(O con el CLI: `supabase functions deploy recordatorio-sastre`.)*

### 4. Programar el envío diario
En Supabase → **SQL Editor** → abre `recordatorio_sastre_cron.sql`,
reemplaza `TU_PROJECT_REF` y `TU_ANON_KEY`, y córrelo.

Listo. Todos los días a las 8:00 a.m. (Colombia) el sistema revisa y avisa.

---

## Notas
- Para **probar sin esperar**, corre el bloque comentado del final de `recordatorio_sastre_cron.sql`.
- La hora se cambia en el `cron.schedule` (`'0 13 * * *'` = 13:00 UTC = 8:00 a.m. Colombia).
- Si un traje se marca **entregado/cancelado**, ya no recibe avisos.
