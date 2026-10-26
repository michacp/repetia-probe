import { Controller } from '@nestjs/common';
import { TcpService } from './tcp.service.js';

@Controller('tcp')
export class TcpController {
  constructor(private readonly tcpService: TcpService) {}
}
