import {
    BadRequestException,
    Injectable,
    Logger,
    NotFoundException,
    OnModuleDestroy,
    OnModuleInit,
    RequestTimeoutException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as net from 'net';
import { FrameStore } from './frame.store.js';

@Injectable()
export class TcpListenerService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(TcpListenerService.name);
    private readonly servers = new Map<number, net.Server>();
    private readonly sockets = new Map<string, net.Socket>();
    private connSeq = 0;
    private autoSendBuf: Buffer | null = null;

    constructor(
        private readonly config: ConfigService,
        private readonly store: FrameStore,
    ) { }

    onModuleInit(): void {
        const raw = this.config.get<string>('TCP_PORTS') ?? '9870,2201';
        const ports = raw
            .split(',')
            .map((p) => Number(p.trim()))
            .filter((p) => Number.isInteger(p) && p > 0 && p < 65536);

        for (const port of ports) {
            this.startListening(port).catch((e: Error) => this.logger.error(e.message));
        }
    }

    onModuleDestroy(): void {
        for (const s of this.sockets.values()) s.destroy();
        for (const srv of this.servers.values()) srv.close();
    }

    // ---------- Puertos de escucha ----------

    listPorts(): number[] {
        return [...this.servers.keys()].sort((a, b) => a - b);
    }

    async startListening(port: number): Promise<void> {
        this.assertPort(port);
        if (this.servers.has(port)) {
            throw new BadRequestException(`El puerto ${port} ya está abierto`);
        }

        await new Promise<void>((resolve, reject) => {
            const server = net.createServer((socket) => this.register(socket, 'incoming'));

            const onStartError = (err: NodeJS.ErrnoException) => {
                reject(
                    new BadRequestException(
                        err.code === 'EADDRINUSE'
                            ? `El puerto ${port} está ocupado por otro proceso`
                            : err.code === 'EACCES'
                                ? `Sin permisos para abrir el puerto ${port}`
                                : err.message,
                    ),
                );
            };

            server.once('error', onStartError);
            server.listen(port, '0.0.0.0', () => {
                server.off('error', onStartError);
                server.on('error', (e) => this.logger.error(`Puerto ${port}: ${e.message}`));
                this.servers.set(port, server);
                this.logger.log(`Escuchando TCP en 0.0.0.0:${port}`);
                this.store.emitPorts(this.listPorts());
                resolve();
            });
        });
    }

    /** Cierra el puerto; las conexiones ya establecidas siguen vivas. */
    stopListening(port: number): void {
        const server = this.servers.get(port);
        if (!server) throw new NotFoundException(`El puerto ${port} no está abierto`);
        server.close();
        this.servers.delete(port);
        this.logger.log(`Puerto ${port} cerrado`);
        this.store.emitPorts(this.listPorts());
    }

    // ---------- Conexión saliente (nosotros -> terminal) ----------

    connectTo(host: string, port: number): Promise<string> {
        this.assertPort(port);
        if (!net.isIPv4(host)) throw new BadRequestException('IP inválida');

        return new Promise((resolve, reject) => {
            const socket = new net.Socket();
            socket.setTimeout(5000);

            socket.once('timeout', () => {
                socket.destroy();
                reject(new RequestTimeoutException(`Sin respuesta de ${host}:${port} (5 s)`));
            });
            socket.once('error', (err) => {
                reject(new BadRequestException(`No se pudo conectar a ${host}:${port}: ${err.message}`));
            });

            socket.connect(port, host, () => {
                socket.setTimeout(0);
                socket.removeAllListeners('error');
                socket.removeAllListeners('timeout');
                resolve(this.register(socket, 'outgoing'));
            });
        });
    }

    // ---------- Envío automático y manual ----------

    setAutoSend(buf: Buffer | null): void {
        this.autoSendBuf = buf;
    }

    getAutoSend(): Buffer | null {
        return this.autoSendBuf;
    }

    async send(connId: string, data: Buffer): Promise<void> {
        const socket = this.sockets.get(connId);
        if (!socket || socket.destroyed) {
            throw new NotFoundException(`La conexión ${connId} no está activa`);
        }
        await new Promise<void>((resolve, reject) => {
            socket.write(data, (err) => {
                if (err) return reject(err);
                this.store.addFrame(connId, 'out', data);
                resolve();
            });
        });
    }

    close(connId: string): void {
        const socket = this.sockets.get(connId);
        if (!socket) throw new NotFoundException(`La conexión ${connId} no está activa`);
        socket.destroy();
    }

    // ---------- Interno ----------

    private assertPort(port: number): void {
        if (!Number.isInteger(port) || port < 1 || port > 65535) {
            throw new BadRequestException('Puerto inválido (1-65535)');
        }
    }

    private register(socket: net.Socket, origin: 'incoming' | 'outgoing'): string {
        const seq = ++this.connSeq;
        const id = origin === 'incoming' ? `${socket.localPort}-${seq}` : `out-${seq}`;
        const remoteAddress = (socket.remoteAddress ?? 'desconocida').replace('::ffff:', '');

        socket.setKeepAlive(true, 30_000);
        this.sockets.set(id, socket);

        this.store.openConnection({
            id,
            origin,
            remoteAddress,
            remotePort: socket.remotePort ?? 0,
            localPort: socket.localPort ?? 0,
            connectedAt: new Date().toISOString(),
            active: true,
            bytesIn: 0,
            bytesOut: 0,
        });
        this.logger.log(`[${id}] ${origin === 'incoming' ? 'entrante de' : 'saliente a'} ${remoteAddress}:${socket.remotePort}`);

        socket.on('data', (buf: Buffer) => {
            const f = this.store.addFrame(id, 'in', buf);
            if (f) this.logger.log(`[${id}] <- ${f.length} bytes | ${f.hex} | ${f.ascii}`);
        });
        socket.on('error', (err) => this.logger.warn(`[${id}] error de socket: ${err.message}`));
        socket.on('close', () => {
            this.sockets.delete(id);
            this.store.closeConnection(id);
            this.logger.log(`[${id}] desconectado`);
        });

        if (origin === 'incoming' && this.autoSendBuf) {
            this.send(id, this.autoSendBuf).catch((e: Error) =>
                this.logger.warn(`[${id}] fallo en envío automático: ${e.message}`),
            );
        }

        return id;
    }
}