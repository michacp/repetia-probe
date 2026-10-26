import { Module } from '@nestjs/common';
import { TcpModule } from '../tcp/tcp.module.js';
import { ProbeController } from './probe.controller.js';
import { PingService } from '../network/ping.service.js';
import { ProbeGateway } from './probe.gateway.js';


@Module({
  imports: [TcpModule],
  controllers: [ProbeController],
  providers: [ProbeGateway, PingService],
})
export class ProbeModule { }