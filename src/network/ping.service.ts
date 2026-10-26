import { BadRequestException, Injectable } from '@nestjs/common';
import { execFile } from 'child_process';
import * as net from 'net';

@Injectable()
export class PingService {
    run(host: string): Promise<{ ok: boolean; output: string }> {
        if (!net.isIPv4(host)) throw new BadRequestException('IP inválida');

        const isWin = process.platform === 'win32';
        const args = isWin ? ['-n', '3', '-w', '2000', host] : ['-c', '3', '-W', '2', host];

        return new Promise((resolve) => {
            execFile(
                'ping',
                args,
                { timeout: 15_000, encoding: 'buffer', windowsHide: true },
                (err, stdout, stderr) => {
                    if (err && (err as NodeJS.ErrnoException).code === 'ENOENT') {
                        return resolve({ ok: false, output: 'El comando ping no está disponible en este entorno.' });
                    }
                    const output = Buffer.concat([stdout ?? Buffer.alloc(0), stderr ?? Buffer.alloc(0)])
                        .toString('latin1')
                        .trim();
                    resolve({ ok: /TTL=/i.test(output), output });
                },
            );
        });
    }
}