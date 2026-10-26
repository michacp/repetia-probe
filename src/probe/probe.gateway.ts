import {
    OnGatewayConnection,
    OnGatewayInit,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { OnModuleDestroy } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { Subscription } from 'rxjs';
import { FrameStore } from '../tcp/frame.store.js';
import { TcpListenerService } from '../tcp/tcp-listener.service.js';


@WebSocketGateway()
export class ProbeGateway
    implements OnGatewayInit, OnGatewayConnection, OnModuleDestroy {
    @WebSocketServer()
    server!: Server;

    private sub?: Subscription;

    constructor(
        private readonly store: FrameStore,
        private readonly tcp: TcpListenerService,
    ) { }

    afterInit(): void {
        this.sub = this.store.events$.subscribe((ev) => {
            this.server.emit(ev.type, ev.data);
        });
    }

    handleConnection(client: Socket): void {
        client.emit('snapshot', {
            connections: this.store.listConnections(),
            frames: this.store.listFrames(500),
            ports: this.tcp.listPorts(),
        });
    }

    onModuleDestroy(): void {
        this.sub?.unsubscribe();
    }
}