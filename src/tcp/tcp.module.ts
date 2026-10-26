import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FrameStore } from './frame.store.js';
import { TcpListenerService } from './tcp-listener.service.js';


@Module({
  imports: [ConfigModule],
  providers: [FrameStore, TcpListenerService],
  exports: [FrameStore, TcpListenerService],
})
export class TcpModule { }