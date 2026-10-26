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
- `net` nativo para TCP, Socket.IO para tiempo real, página única en `public/index.html`.
- Sin base de datos: todo en memoria (`FrameStore`) y exportable a archivo.
- Sin CDN ni dependencias de internet en el frontend (CSS plano, JS plano).

## Comandos

```bash
npm install
npm run start:dev      # desarrollo con recarga (ts-node-dev --poll)
npm run build          # compila y comprueba tipos
npm run start:prod
docker compose -f docker-compose.dev.yml up -d --build   # desarrollo en contenedor
docker compose up -d --build                             # versión portable
```

Interfaz: http://localhost:3000. Puertos TCP por defecto: 9870 y 2201.

## Estructura

```
src/
  main.ts                     # arranque, escucha en 0.0.0.0
  app.module.ts
  tcp/
    frame.store.ts            # estado en memoria + eventos RxJS
    tcp-listener.service.ts   # servidores net, conexiones, envío
    tcp.module.ts
  probe/
    probe.gateway.ts          # WebSocket hacia la UI (snapshot + eventos)
    probe.controller.ts       # REST bajo /api
    probe.module.ts
  network/
    ping.service.ts
public/index.html             # UI completa (sin build)
captures/                     # exportaciones (no se versionan)
```

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
- No cambiar `process.cwd()`-relativos de `public/` y `captures/` sin revisar Docker.

## Comportamiento a tener en cuenta

- Cada reinicio del proceso (incluida la recarga en desarrollo) borra las capturas en
  memoria y corta las conexiones TCP. El terminal reconecta solo.
- En Docker Desktop (Windows/Mac) las conexiones entrantes pueden mostrar una IP interna
  172.x en lugar de la IP real del terminal.
- Un puerto abierto en caliente desde la UI solo es alcanzable desde la LAN si está
  publicado en el compose (o con `network_mode: host` en Linux).

## Qué sigue (contexto)

1. El compañero con acceso a la LAN ejecuta las pruebas del README y exporta capturas.
2. Análisis de las capturas: cabeceras, longitudes, checksums, campos.
3. Implementar un `codec` y portarlo al servicio gateway del ERP en Django.
4. En paralelo, pedir el SDK o la especificación a Union Community.

## Referencia del dispositivo (manual AC-5000 v1.06)

- Server IP / Server Port se configuran en el terminal: Red → Server IP.
  Puerto 9870 (servidor UNIS) o 2201 (servidor Access).
- Terminal ID: máx. 8 dígitos, debe coincidir con el configurado en el servidor.
- Authentication: Server/Terminal, Terminal/Server (por defecto), Server Only,
  Terminal Only.
- Capacidad: 20.016 usuarios, 20.016 huellas, 61.439 logs.
- Otros puertos del equipo: RS-232 (impresora), RS-485, Wiegand in/out.