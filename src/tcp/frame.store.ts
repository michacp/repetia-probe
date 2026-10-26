import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';

export interface ConnectionInfo {
    id: string;
    origin: 'incoming' | 'outgoing';
    remoteAddress: string;
    remotePort: number;
    localPort: number;
    connectedAt: string;
    disconnectedAt?: string;
    active: boolean;
    bytesIn: number;
    bytesOut: number;
}

export interface FrameRecord {
    id: number;
    ts: string;
    connId: string;
    direction: 'in' | 'out';
    localPort: number;
    remoteAddress: string;
    length: number;
    hex: string;
    ascii: string;
}

export type StoreEvent =
    | { type: 'connection'; data: ConnectionInfo }
    | { type: 'frame'; data: FrameRecord }
    | { type: 'ports'; data: number[] }
    | { type: 'cleared'; data: null };

const MAX_FRAMES = 5000;

@Injectable()
export class FrameStore {
    private readonly connections = new Map<string, ConnectionInfo>();
    private frames: FrameRecord[] = [];
    private frameSeq = 0;

    readonly events$ = new Subject<StoreEvent>();

    openConnection(info: ConnectionInfo): void {
        this.connections.set(info.id, info);
        this.events$.next({ type: 'connection', data: { ...info } });
    }

    closeConnection(id: string): void {
        const conn = this.connections.get(id);
        if (!conn) return;
        conn.active = false;
        conn.disconnectedAt = new Date().toISOString();
        this.events$.next({ type: 'connection', data: { ...conn } });
    }

    addFrame(connId: string, direction: 'in' | 'out', buf: Buffer): FrameRecord | null {
        const conn = this.connections.get(connId);
        if (!conn) return null;

        if (direction === 'in') conn.bytesIn += buf.length;
        else conn.bytesOut += buf.length;

        const frame: FrameRecord = {
            id: ++this.frameSeq,
            ts: new Date().toISOString(),
            connId,
            direction,
            localPort: conn.localPort,
            remoteAddress: conn.remoteAddress,
            length: buf.length,
            hex: (buf.toString('hex').match(/../g) ?? []).join(' '),
            ascii: Array.from(buf)
                .map((b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : '.'))
                .join(''),
        };

        this.frames.push(frame);
        if (this.frames.length > MAX_FRAMES) this.frames.shift();

        this.events$.next({ type: 'frame', data: frame });
        return frame;
    }

    listConnections(): ConnectionInfo[] {
        return [...this.connections.values()];
    }

    listFrames(limit = 500): FrameRecord[] {
        return this.frames.slice(-limit);
    }

    emitPorts(ports: number[]): void {
        this.events$.next({ type: 'ports', data: ports });
    }

    clear(): void {
        this.frames = [];
        for (const [id, c] of this.connections) {
            if (!c.active) this.connections.delete(id);
        }
        this.events$.next({ type: 'cleared', data: null });
    }

    exportAll() {
        return {
            exportedAt: new Date().toISOString(),
            connections: this.listConnections(),
            frames: this.frames,
        };
    }
}