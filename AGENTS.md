# AGENTS.md

Guía para agentes de código (y personas) que trabajen en este repositorio.

## Qué es este proyecto

`repetia-probe` es una herramienta DESECHABLE de diagnóstico para comunicarse con el
lector de huellas Union Community AC-5000. No es el producto final. El ERP real
(gimnasio) se construirá aparte en Django; lo aprendido aquí sobre el protocolo se
portará allí.

Objetivos:
- Escuchar conexiones TCP entrantes del terminal (el terminal es el CLIENTE).
- Mostrar en vivo cada trama en hex y ASCII.
- Enviar bytes manualmente, hacer ping, exportar capturas.
- Servir de ayuda para descubrir el protocolo, que NO está documentado en el manual.

## Stack

- NestJS (TypeScript), Node 22.
- TypeScript fijado en `~6.0.3` (ver "Versiones" más abajo).
- `net` nativo para TCP, Socket.IO para tiempo real, página única en `public/index.html`.
- Sin base de datos: todo en memoria (`FrameStore`) y exportable a archivo.
- Sin CDN ni dependencias de internet en el frontend (CSS plano, JS plano).

## Comandos

```bash
npm install
npm run start:dev      # desarrollo con recarga: nest start --watch
npm run build          # compila y comprueba tipos
npm run start          # arranque normal
npm run start:prod     # node dist/main (requiere build previo)

# Docker
docker compose up -d --build                              # versión portable (Dockerfile multi-stage)
docker compose -f docker-compose.dev.yml up -d --build    # desarrollo con recarga (Dockerfile.dev)
docker compose -f docker-compose.dev.yml up -d --build --renew-anon-volumes   # tras cambiar dependencias
docker compose -f docker-compose.dev.yml logs -f probe
```

Interfaz: http://localhost:3000. Puertos TCP por defecto: 9870 y 2201.

## Versiones (importante)

- **No actualizar TypeScript a 7.x.** La 7.0 solo trae el ejecutable `tsc` y no expone la API
  programática del compilador, así que `nest start` y `nest build` fallan. Mantener `~6.0.3`
  hasta que el CLI de Nest soporte TypeScript 7 (previsto con la 7.1).
- `@nestjs/cli` y `@nestjs/schematics` 12 exigen TypeScript >= 6. No bajar a TS 5.x sin bajar
  también el CLI a 11.
- No usar `ts-node-dev` ni forzar `"module": "commonjs"` / `moduleResolution: node` / `baseUrl`
  en el `tsconfig`: en TS 6 dos de esas opciones están obsoletas y el intento anterior produjo
  errores de módulos ES.
- Mantener `package-lock.json` versionado.

## Recarga en desarrollo

- El script `start:dev` es `nest start --watch`.
- En Docker sobre Windows hace falta polling. Está configurado en `docker-compose.dev.yml`
  mediante `TSC_WATCHFILE`, `TSC_WATCHDIRECTORY` y `CHOKIDAR_USEPOLLING`. No quitarlo.
- Esta recarga sí comprueba tipos: un error de tipos detiene el reinicio y aparece en los logs.
- No cambiar el mecanismo de recarga sin comprobar que sigue funcionando dentro del contenedor.

## Estructura

```
src/
  main.ts                     # arranque, escucha en 0.0.0.0
  app.module.ts
  tcp/
    frame.store.ts            # estado en memoria + eventos RxJS
    tcp-listener.service.ts   # servidores net, conexiones, envío, puertos en caliente
    tcp.module.ts
  probe/
    probe.gateway.ts          # WebSocket hacia la UI (snapshot + eventos)
    probe.controller.ts       # REST bajo /api
    probe.module.ts
  network/
    ping.service.ts
public/index.html             # UI completa (sin build)
captures/                     # exportaciones (no se versionan)
Dockerfile                    # multi-stage, versión portable
Dockerfile.dev                # desarrollo con volumen
docker-compose.yml            # versión portable
docker-compose.dev.yml        # desarrollo con recarga
```

## API REST (bajo /api)

- `GET/POST /ports`, `DELETE /ports/:port`: puertos de escucha en caliente.
- `POST /connect`: conexión saliente a IP:puerto del terminal.
- `POST /connections/:id/close`: cerrar una conexión.
- `POST /send`: enviar bytes (hex o texto) a una conexión activa.
- `GET/POST /autosend`: hex a enviar automáticamente al conectarse el terminal.
- `POST /ping`: ping a una IPv4.
- `GET /export?format=json|txt`: descarga y copia en `captures/`.
- `DELETE /frames`: borra las capturas.
- `GET /info`: IPs de este equipo y puertos abiertos (para la guía del terminal).

## Convenciones

- Idioma de la UI, mensajes de error y comentarios: español.
- Código y nombres de variables: inglés.
- La UI se construye con `textContent` y `createElement`. No usar `innerHTML` con datos
  que vengan de la red (las tramas son datos no confiables).
- Validar siempre la entrada en el controlador: IPs con `net.isIPv4`, puertos 1-65535,
  hex con `parseHex`.
- `PingService` usa `execFile` con argumentos en array, nunca `exec` con strings.
- Los cambios de estado pasan por `FrameStore` y se emiten como eventos; el gateway
  solo reenvía.
- Mantener la herramienta simple: no añadir base de datos, autenticación ni frameworks
  de frontend sin una razón fuerte.

## Cosas que NO hacer

- No subir capturas ni `.env` al repositorio (pueden contener datos biométricos).
- No inventar el protocolo del AC-5000. Si no hay captura o documentación, decirlo.
  Cualquier decodificación debe basarse en tramas reales exportadas.
- No ejecutar ni automatizar operaciones destructivas del terminal (Initialise
  Terminal, Delete All Users, cambio de Template Type).
- No exponer esta herramienta a internet: no tiene autenticación y permite abrir
  puertos, hacer ping y conectar a IPs arbitrarias. Solo uso en LAN.
- No cambiar las rutas relativas a `process.cwd()` de `public/` y `captures/` sin revisar Docker.
- No actualizar TypeScript a 7.x ni sustituir `nest start --watch` sin verificar que el
  arranque y la recarga siguen funcionando.
- No migrar funcionalidades del ERP (socios, facturación, etc.) a este repositorio.

## Comportamiento a tener en cuenta

- Cada reinicio del proceso (incluida la recarga en desarrollo) borra las capturas en
  memoria y corta las conexiones TCP. El terminal reconecta solo.
- En Docker Desktop (Windows/Mac) las conexiones entrantes pueden mostrar una IP interna
  172.x en lugar de la IP real del terminal.
- Un puerto abierto en caliente desde la UI solo es alcanzable desde la LAN si está
  publicado en el compose (o con `network_mode: host` en Linux).
- Se conservan como máximo las últimas 5000 tramas en memoria (`MAX_FRAMES`).
- Cada exportación incluye todo lo acumulado; por eso se pide borrar capturas antes de
  cada prueba.

## Qué sigue (contexto)

1. Persistencia ligera: escribir cada trama en `captures/sesion-<fecha>.jsonl` al llegar,
   para que recargas o reinicios no pierdan datos. (Pendiente.)
2. El compañero con acceso a la LAN ejecuta las pruebas del README y exporta capturas.
3. Análisis de las capturas: cabeceras, longitudes, checksums, campos.
4. Implementar un `codec` y portarlo al servicio gateway del ERP en Django.
5. En paralelo, pedir el SDK o la especificación a Union Community (`sales@unioncomm.co.kr`).

## Referencia del dispositivo (manual AC-5000 v1.06)

- Server IP / Server Port se configuran en el terminal: Red → Server IP.
  Puerto 9870 (servidor UNIS) o 2201 (servidor Access).
- Terminal ID: máx. 8 dígitos, debe coincidir con el configurado en el servidor.
- Authentication: Server/Terminal, Terminal/Server (por defecto), Server Only,
  Terminal Only.
- Capacidad: 20.016 usuarios, 20.016 huellas, 61.439 logs.
- Otros puertos del equipo: RS-232 (impresora), RS-485, Wiegand in/out.
- El manual NO documenta el protocolo de red.