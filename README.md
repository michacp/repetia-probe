# Repetia Probe 🕵️‍♂️⚡

Herramienta de diagnóstico para comprobar la comunicación con el lector de huellas **Union Community AC-5000**.

Repetia Probe escucha las conexiones TCP del terminal, captura los datos que envía en tiempo real y permite exportarlos para analizar el protocolo de comunicación.

> **Proyecto experimental y desechable.** Esta herramienta se utiliza para investigar y documentar el protocolo de comunicación del terminal. No es el producto final. El ERP definitivo se desarrollará en Django, incorporando los conocimientos obtenidos durante estas pruebas.

## 🚀 Stack tecnológico

- **Backend:** NestJS con TypeScript y Node.js 22.
- **Comunicación TCP:** módulo nativo `net` de Node.js para escuchar las conexiones del terminal.
- **Comunicación en tiempo real:** Socket.IO.
- **Frontend:** HTML, CSS y JavaScript nativos, sin dependencias externas ni CDN.
- **Almacenamiento:** memoria mediante `FrameStore`, con exportación de capturas a archivos JSON y TXT.
- **Infraestructura:** ejecución directa en Windows o mediante Docker.

> **Nota:** el stack descrito debe corresponder con la implementación actual del repositorio. Si el proyecto todavía utiliza otra versión de Node.js o una arquitectura diferente, actualiza esta sección para evitar contradicciones.

## 📋 Requisitos

- Un PC en la **misma red local** que el terminal.
- Node.js 22 (recomendado para el stack actual) o Docker.
- El PC debería tener una IP fija o reservada, ya que el terminal debe conectarse a ella.
- Acceso a la configuración de red del terminal.

## 🛠️ Instalación y ejecución

### Opción A: Node.js directo (recomendada en Windows)

Desde la carpeta del proyecto, ejecuta:

```powershell
npm install
copy .env.example .env
npm run start
```

Abre [http://localhost:3000](http://localhost:3000).

Deberías ver el indicador **«Servidor conectado»** en verde.

### Opción B: Docker

```powershell
docker compose up -d --build
```

En Windows o macOS, Docker puede mostrar una IP interna (por ejemplo, `172.x.x.x`) en lugar de la IP real del PC en la red local. Esto no necesariamente afecta a las tramas capturadas, pero debes configurar el terminal con la IP accesible desde su propia red.

## 🔥 Firewall de Windows

Abre PowerShell como administrador y ejecuta:

```powershell
New-NetFirewallRule `
  -DisplayName "Repetia Probe" `
  -Direction Inbound `
  -Protocol TCP `
  -LocalPort 3000,9870,2201 `
  -Action Allow `
  -Profile Private
```

Si la red está marcada como **Pública**, configura correctamente el perfil de red o adapta la regla al perfil que corresponda. Evita abrir los puertos a redes no confiables.

Los puertos utilizados son:

- `3000`: interfaz web y servicios asociados, según la configuración de la aplicación.
- `9870`: puerto TCP de escucha principal del terminal.
- `2201`: puerto alternativo para las pruebas de comunicación.

Verifica los puertos efectivos en la configuración del proyecto antes de realizar las pruebas.

## ⚙️ Configurar el terminal

En la interfaz web, pulsa **Guía del terminal** para consultar la IP, el puerto y los pasos de configuración.

Resumen de la configuración:

1. **Red → IP:** asignar una IP estática al terminal.
2. **Red → Server IP:** introducir la IP local del PC donde se ejecuta Repetia Probe y el puerto `9870`.
3. **Red → Terminal ID:** configurar `1` y el modo `Terminal/Server`.
4. Guardar los cambios con `F4 → Yes`.

Asegúrate de que el PC y el terminal puedan comunicarse dentro de la red local.

## 🔎 Si el terminal no conecta

1. Pulsa **Ping** e introduce la IP del terminal. Si falla, revisa el cableado, la IP, la subred y el gateway.
2. En el terminal, consulta **Información → Network Info** para verificar la IP, el servidor y el puerto guardados.
3. Comprueba que el firewall permite las conexiones entrantes por los puertos correspondientes.
4. Prueba el puerto alternativo `2201`, cambiando el valor de `Server Port` en el terminal.
5. Si el terminal conecta, pero no llegan bytes, prueba la opción **Al conectarse el terminal** o utiliza el envío manual. Documenta el resultado en el informe de pruebas.

## 🧪 Protocolo de pruebas

Antes de cada prueba:

1. Pulsa **Borrar capturas**.
2. Ejecuta la prueba indicada.
3. Pulsa **Exportar JSON** y **Exportar TXT**.
4. Renombra los archivos con el número de la prueba.
5. Registra la hora, la acción realizada y el resultado que aparece en la pantalla del terminal.

| # | Prueba |
|---|---|
| 1 | **Solo conexión:** reinicia el terminal y déjalo conectado durante 3 minutos sin interactuar. Comprueba si envía latidos periódicos. |
| 2 | **Huella correcta:** ficha con un usuario registrado. Repite 2 veces. |
| 3 | **Huella fallida:** intenta fichar con una huella no registrada o realiza un intento fallido. |
| 4 | **Tarjeta:** realiza un fichaje con tarjeta, si el terminal dispone de lector. |
| 5 | **ID + contraseña:** realiza un fichaje con un usuario que tenga contraseña configurada. |
| 6 | **Cambio de modo:** pulsa `F1` y realiza un fichaje. |
| 7 | **Alta de usuario:** crea un usuario de prueba desde `Usuario → Añadir`, asignándole un ID y una huella. |
| 8 | **Baja de usuario:** elimina el usuario creado en la prueba anterior. |
| 9 | **Autenticación:** cambia `Red → Terminal ID → Authentication` a `Server Only` y realiza un fichaje. Comprueba si el terminal espera una respuesta del servidor. Al terminar, restaura `Terminal/Server`. |
| 10 | **Reconexión:** cierra la conexión desde la interfaz de Repetia Probe mediante el botón **Cerrar**. Comprueba si el terminal se reconecta automáticamente y cuánto tarda. |

Cuando sea posible, toma una fotografía de la pantalla del terminal o registra el mensaje que aparece, por ejemplo: `Success`, `Match failed` o `Net Error`.

## 📦 Exportación de capturas

Las capturas se utilizan para analizar el protocolo TCP y documentar el comportamiento del terminal.

Para cada prueba, conserva:

- El archivo JSON exportado.
- El archivo TXT exportado.
- El número de prueba.
- La fecha y hora.
- La acción realizada.
- El resultado observado en el terminal.

No mezcles capturas de distintas pruebas sin identificarlas.

## 🤖 Instrucciones para agentes de IA

El archivo [`AGENTS.md`](./AGENTS.md) contiene las instrucciones específicas para los agentes de IA que trabajen en este repositorio.

Antes de modificar el código, los agentes deben revisar esas instrucciones y respetar la arquitectura, las convenciones y las restricciones definidas para el proyecto.

Principios generales:

- Mantener el alcance de Repetia Probe limitado al diagnóstico y la investigación del protocolo.
- No convertir esta herramienta experimental en el ERP definitivo.
- No migrar funcionalidades a Django dentro de este repositorio, salvo que se solicite expresamente.
- Priorizar la captura fiel de los datos recibidos y la trazabilidad de las pruebas.
- Evitar dependencias externas innecesarias en el frontend.
- No asumir formatos, comandos o respuestas del protocolo que no hayan sido observados o documentados.
- No introducir cambios destructivos en la configuración o en los datos del terminal sin autorización explícita.

## 🔐 Privacidad

Las capturas pueden contener identificadores personales y datos relacionados con la autenticación biométrica.

- Utiliza usuarios de prueba siempre que sea posible.
- Comparte las capturas únicamente mediante canales privados autorizados.
- Evita publicar capturas reales en repositorios públicos o incidencias abiertas.
- Revisa los archivos exportados antes de compartirlos.

## ⚠️ Operaciones que deben evitarse

No modifiques las siguientes opciones del terminal sin consultarlo previamente:

- `Initialise Terminal`.
- `Delete All Users`.
- `Template types`.

**Importante:** la opción `Template types` puede borrar todos los usuarios y reiniciar el terminal, según la advertencia documentada para estas pruebas.

## 📌 Alcance del proyecto

Repetia Probe es una herramienta temporal de diagnóstico. Su objetivo es obtener evidencia verificable sobre:

- El establecimiento y cierre de conexiones TCP.
- Las tramas enviadas por el terminal.
- Los eventos asociados a fichajes y operaciones de usuarios.
- Los posibles mecanismos de autenticación y respuesta del servidor.
- El comportamiento de reconexión del terminal.

Los resultados obtenidos servirán como base técnica para implementar la comunicación con el lector en el futuro ERP desarrollado en Django.