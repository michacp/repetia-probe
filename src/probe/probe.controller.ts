import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { promises as fs } from 'fs';
import { join } from 'path';
import { FrameStore } from '../tcp/frame.store.js';
import { TcpListenerService } from '../tcp/tcp-listener.service.js';
import { PingService } from '../network/ping.service.js';
import { networkInterfaces } from 'os';

function parseHex(input: string): Buffer {
  const clean = (input ?? '').replace(/0x/gi, '').replace(/[\s,:-]/g, '');
  if (!clean.length || clean.length % 2 !== 0 || /[^0-9a-f]/i.test(clean)) {
    throw new BadRequestException('Hex inválido: usa pares de dígitos, ej. 02 41 03');
  }
  return Buffer.from(clean, 'hex');
}

function parseText(input: string, crlf: boolean): Buffer {
  let s = (input ?? '')
    .replace(/\\r/g, '\r')
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t');
  if (crlf) s += '\r\n';
  if (!s.length) throw new BadRequestException('El mensaje está vacío');
  return Buffer.from(s, 'latin1');
}

@Controller('api')
export class ProbeController {
  constructor(
    private readonly store: FrameStore,
    private readonly tcp: TcpListenerService,
    private readonly ping: PingService,
  ) { }

  // --- Puertos ---
  @Get('ports')
  ports() {
    return { ports: this.tcp.listPorts() };
  }

  @Post('ports')
  async openPort(@Body() body: { port?: number }) {
    await this.tcp.startListening(Number(body?.port));
    return { ports: this.tcp.listPorts() };
  }

  @Delete('ports/:port')
  closePort(@Param('port') port: string) {
    this.tcp.stopListening(Number(port));
    return { ports: this.tcp.listPorts() };
  }

  // --- Conexiones ---
  @Post('connect')
  async connect(@Body() body: { host?: string; port?: number }) {
    const id = await this.tcp.connectTo(String(body?.host ?? ''), Number(body?.port));
    return { id };
  }

  @Post('connections/:id/close')
  closeConnection(@Param('id') id: string) {
    this.tcp.close(id);
    return { ok: true };
  }

  // --- Envío ---
  @Post('send')
  async send(
    @Body() body: { connId?: string; mode?: 'hex' | 'text'; payload?: string; crlf?: boolean },
  ) {
    if (!body?.connId) throw new BadRequestException('Falta la conexión destino');
    const buf =
      body.mode === 'text'
        ? parseText(body.payload ?? '', !!body.crlf)
        : parseHex(body.payload ?? '');
    await this.tcp.send(body.connId, buf);
    return { sent: buf.length };
  }

  @Get('autosend')
  getAutoSend() {
    const buf = this.tcp.getAutoSend();
    return { hex: buf ? (buf.toString('hex').match(/../g) ?? []).join(' ') : '' };
  }

  @Post('autosend')
  setAutoSend(@Body() body: { hex?: string }) {
    const hex = (body?.hex ?? '').trim();
    this.tcp.setAutoSend(hex ? parseHex(hex) : null);
    return this.getAutoSend();
  }

  // --- Ping ---
  @Post('ping')
  doPing(@Body() body: { host?: string }) {
    return this.ping.run(String(body?.host ?? ''));
  }

  // --- Exportación ---
  @Get('export')
  async export(
    @Query('format') format: string = 'json',
    @Res({ passthrough: true }) res: Response,
  ) {
    const data = this.store.exportAll();
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const isTxt = format === 'txt';
    const filename = `repetia-captura-${stamp}.${isTxt ? 'txt' : 'json'}`;

    const content = isTxt
      ? [
        `Exportado: ${data.exportedAt}`,
        '',
        '== CONEXIONES ==',
        ...data.connections.map(
          (c) =>
            `${c.id} ${c.origin} ${c.remoteAddress}:${c.remotePort} -> :${c.localPort} ` +
            `${c.connectedAt}${c.disconnectedAt ? ' .. ' + c.disconnectedAt : ''} ` +
            `in=${c.bytesIn}B out=${c.bytesOut}B`,
        ),
        '',
        '== TRAMAS ==',
        ...data.frames.map(
          (f) =>
            `[${f.ts}] ${f.connId} ${f.direction === 'in' ? '<-' : '->'} ${f.length}B\n` +
            `  hex  : ${f.hex}\n  ascii: ${f.ascii}`,
        ),
      ].join('\n')
      : JSON.stringify(data, null, 2);

    // Copia en disco (útil si se ejecuta en Docker con el volumen ./captures)
    try {
      const dir = join(process.cwd(), 'captures');
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(join(dir, filename), content, 'utf8');
    } catch {
      /* si falla el guardado en disco, la descarga sigue funcionando */
    }

    res.set({
      'Content-Type': isTxt ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    return content;
  }

  @Delete('frames')
  clear() {
    this.store.clear();
    return { ok: true };
  }
  @Get('info')
  info() {
    const addresses = Object.entries(networkInterfaces()).flatMap(([iface, list]) =>
      (list ?? [])
        .filter((i) => i.family === 'IPv4' && !i.internal)
        .map((i) => ({ iface, address: i.address })),
    );
    return { addresses, ports: this.tcp.listPorts(), platform: process.platform };
  }
}