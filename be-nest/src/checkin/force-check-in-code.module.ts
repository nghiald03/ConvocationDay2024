import { Module } from '@nestjs/common';
import { ForceCheckInCodeService } from './force-check-in-code.service.js';

/** Một instance dùng chung để bộ đếm nhập sai mã áp dụng cho mọi thao tác cần mã. */
@Module({
  providers: [ForceCheckInCodeService],
  exports: [ForceCheckInCodeService],
})
export class ForceCheckInCodeModule {}
