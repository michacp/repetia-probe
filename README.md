# Repetia Probe 🕵️‍♂️⚡

Herramienta de diagnóstico para comprobar la comunicación con el lector de huellas **Union Community AC-5000**.

Repetia Probe escucha las conexiones TCP del terminal, captura en tiempo real los datos que envía y permite exportarlos para analizar el protocolo de comunicación.

> **Proyecto experimental y desechable.** Se utiliza para investigar y documentar el protocolo del terminal. No es el producto final. El ERP definitivo (gimnasio) se desarrollará en Django, incorporando lo aprendido aquí.

## 🚀 Stack tecnológico

- **Backend:** NestJS (TypeScript) sobre Node.js 22.
- **Comunicación TCP:** módulo nativo `net` de Node.js (el terminal es el cliente y se conecta a nosotros).
- **Tiempo real:** Socket.IO.
- **Frontend:** una sola página (`public/index.html`) en HTML, CSS y JavaScript nativos, sin CDN ni dependencias de internet.
- **Almacenamiento:** memoria (`FrameStore`), con exportación a JSON y TXT.
- **Infraestructura:** ejecución directa en Windows/Linux/macOS o mediante Docker.

> **TypeScript:** el proyecto usa TypeScript 6 (`~6.0.3`). **No actualizar a TypeScript 7** hasta que el CLI de Nest lo soporte: la versión 7.0 no expone la API del compilador y `nest start` falla. Mantén `package-lock.json` en el repositorio para que todos instalen las mismas versiones.

## 📋 Requisitos

- Un PC en la **misma red local** que el terminal.
- Node.js 22 o Docker.
- El PC debería tener IP fija o reservada, porque el terminal apunta a ella.
- Acceso al menú de configuración de red del terminal.

## 🛠️ Instalación y ejecución

### Opción A: Node.js directo (recomendada en Windows)

```powershell
npm install
copy .env.example .env
npm run start
```

Abre [http://localhost:3000](http://localhost:3000). Deberías ver **«Servidor conectado»** en verde.

Para desarrollo con recarga automática al guardar cambios:

```powershell
npm run start:dev
```

### Opción B: Docker

**Versión portable** (pruebas en la LAN, sin recarga):

```powershell
docker compose up -d --build
docker compose logs -f probe
docker compose down
```

**Modo desarrollo** (recarga automática al guardar cambios en `src/`):

```powershell
docker compose -f docker-compose.dev.yml up -d --build
docker compose -f docker-compose.dev.yml logs -f probe
docker compose -f docker-compose.dev.yml down
```

Detalles del modo desarrollo:

- Usa `nest start --watch` con polling (necesario en Docker sobre Windows).
- Cada recarga reinicia el proceso: **se pierden las capturas en memoria y se cortan las conexiones TCP** (el terminal reconecta solo). Exporta antes de editar código si estás en medio de una prueba.
- Los cambios en `public/` no reinician nada: basta con refrescar el navegador.
- Si añades una dependencia, renueva el volumen de `node_modules`:
  `docker compose -f docker-compose.dev.yml up -d --build --renew-anon-volumes`

Notas sobre Docker:

- Los puertos publicados en los compose son `3000`, `9870` y `2201`. Un puerto abierto en caliente desde la interfaz solo es alcanzable desde la LAN si también está publicado en el compose (o si se usa `network_mode: host` en Linux).
- En Windows y macOS, Docker puede mostrar una IP interna (`172.x.x.x`) en lugar de la IP real del terminal. No afecta a las tramas capturadas, pero la IP que muestra la guía puede ser la del contenedor: configura el terminal con la IP real del PC en la LAN.
- Por esa razón, para las pruebas con el terminal real se recomienda la **Opción A** (Node directo).

## 🔥 Firewall de Windows

Abre PowerShell como administrador:

```powershell
New-NetFirewallRule `
  -DisplayName "Repetia Probe" `
  -Direction Inbound `
  -Protocol TCP `
  -LocalPort 3000,9870,2201 `
  -Action Allow `
  -Profile Private
```

Si la red está marcada como **Pública**, cámbiala a **Privada** o adapta la regla. Evita abrir los puertos en redes no confiables.

Puertos:

- `3000`: interfaz web y API.
- `9870`: puerto TCP de escucha (servidor UNIS).
- `2201`: puerto TCP alternativo (servidor Access).

## ⚙️ Configurar el terminal

En la interfaz web, pulsa **Guía del terminal**: muestra la IP y los puertos reales de este equipo y los pasos del menú.

Resumen (se entra al menú manteniendo `ENT` 2 segundos):

1. **Red → IP:** IP estática en la misma subred que el PC.
2. **Red → Server IP:** IP local del PC donde corre Repetia Probe y puerto `9870`.
3. **Red → Terminal ID:** `1` y autenticación `Terminal/Server`.
4. Guardar: `F4` en el menú principal → `1. Yes` → `ENT`.

Comprobación: el icono de red de la pantalla del terminal pasa a «conectado con el servidor» y en la página aparece una tarjeta de conexión **entrante**.

## 🔎 Si el terminal no conecta

1. Pulsa **Ping** con la IP del terminal. Si falla, revisa cableado, IP, subred y gateway.
2. En el terminal: **Información → Network Info** para verificar IP, servidor y puerto guardados.
3. Comprueba que el firewall permite las conexiones entrantes en los puertos indicados.
4. Prueba el puerto alternativo `2201` cambiando `Server Port` en el terminal.
5. Si el terminal conecta pero no llegan bytes, usa **Al conectarse el terminal** o el envío manual y documenta el resultado.

## 🧪 Protocolo de pruebas

Antes de cada prueba:

1. Pulsa **Borrar capturas**.
2. Ejecuta la prueba.
3. Pulsa **Exportar JSON** y **Exportar TXT**.
4. Renombra los archivos con el número de la prueba.
5. Anota la hora, la acción y el mensaje que muestra el terminal.

| # | Prueba |
|---|---|
| 1 | **Solo conexión:** reinicia el terminal y déjalo conectado 3 minutos sin interactuar. Comprueba si envía latidos periódicos. |
| 2 | **Huella correcta:** ficha con un usuario registrado. Repite 2 veces. |
| 3 | **Huella fallida:** huella no registrada o intento fallido. |
| 4 | **Tarjeta:** fichaje con tarjeta, si hay lector. |
| 5 | **ID + contraseña:** fichaje con un usuario que tenga contraseña. |
| 6 | **Cambio de modo:** pulsa `F1` y realiza un fichaje. |
| 7 | **Alta de usuario:** crea un usuario de prueba desde `Usuario → Añadir` con un ID y una huella. |
| 8 | **Baja de usuario:** elimina el usuario creado en la prueba anterior. |
| 9 | **Autenticación:** cambia `Red → Terminal ID → Authentication` a `Server Only` y ficha una vez. Comprueba si el terminal espera respuesta del servidor. Al terminar, restaura `Terminal/Server`. |
| 10 | **Reconexión:** cierra la conexión con el botón **Cerrar** de la tarjeta. Comprueba si el terminal reconecta solo y cuánto tarda. |

Cuando sea posible, toma una foto de la pantalla del terminal o anota el mensaje (`Success`, `Match failed`, `Net Error`, etc.).

## 📦 Exportación de capturas

Cada exportación:

- se **descarga en el navegador** (carpeta de Descargas de quien usa la página), y
- se **guarda una copia** en la carpeta `captures/` del equipo donde corre la herramienta. Esa carpeta está en `.gitignore` y no se sube a Git. En Docker se mapea como volumen a `./captures`.

Se exporta lo que hay en memoria en ese momento (hasta las últimas 5000 tramas) y siempre **todo lo acumulado**, por eso conviene pulsar **Borrar capturas** antes de cada prueba.

Para cada prueba conserva: el JSON, el TXT, el número de prueba, la fecha y hora, la acción realizada y el resultado observado. No mezcles capturas de pruebas distintas sin identificarlas.

## 🤖 Instrucciones para agentes de IA

El archivo [`AGENTS.md`](./AGENTS.md) contiene las instrucciones para agentes de IA que trabajen en este repositorio. Debe leerse antes de modificar el código.

## 🔐 Privacidad

Las capturas pueden contener identificadores personales y datos asociados a autenticación biométrica.

- Usa usuarios de prueba siempre que sea posible.
- Comparte las capturas solo por canales privados.
- No las publiques en repositorios públicos ni en incidencias abiertas.
- Revisa los archivos antes de compartirlos.

## ⚠️ Operaciones que deben evitarse

No modifiques estas opciones del terminal sin consultarlo antes:

- `Initialise Terminal`
- `Delete All Users`
- `Template types` (borra todos los usuarios y reinicia el terminal)

## 📌 Alcance del proyecto

Repetia Probe es una herramienta temporal para obtener evidencia verificable sobre:

- El establecimiento y cierre de conexiones TCP.
- Las tramas enviadas por el terminal.
- Los eventos asociados a fichajes y operaciones con usuarios.
- Los mecanismos de autenticación y respuesta del servidor.
- El comportamiento de reconexión del terminal.

Los resultados servirán de base técnica para implementar la comunicación con el lector en el futuro ERP en Django.

## 🛡️ Seguridad

La herramienta no tiene autenticación y permite abrir puertos, hacer ping y conectar a IPs arbitrarias. **Úsala solo en una LAN de confianza y nunca la expongas a internet.**