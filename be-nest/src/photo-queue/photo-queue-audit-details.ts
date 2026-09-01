type NumberIssuedAudit = {
  type: 'number-issued';
  source: 'KIOSK' | 'COORDINATOR';
  studentCode: string;
  fullName: string;
  queueNumber: number;
  actorName?: string;
  reason?: string;
};

type PhotoConfirmedAudit = {
  type: 'photo-confirmed';
  actorName: string;
  studentCode: string;
  fullName: string;
  photographed: boolean;
  retouchNoteImage1?: string;
  retouchNoteImage2?: string;
  notPhotographedReason?: string;
};

export function getPhotoQueueAuditDetails(
  event: NumberIssuedAudit | PhotoConfirmedAudit,
) {
  if (event.type === 'number-issued') {
    if (event.source === 'KIOSK') {
      return `${event.studentCode} ${event.fullName} đã lấy số ${event.queueNumber} tại kiosk.`;
    }
    const reason = event.reason ? ` Lý do: ${event.reason}.` : '';
    return `${event.actorName ?? 'Điều phối viên'} đã cấp số ${event.queueNumber} cho ${event.studentCode} ${event.fullName}.${reason}`;
  }

  if (event.photographed) {
    return `${event.actorName} đã xác nhận ${event.studentCode} ${event.fullName} đã chụp. Ảnh 1: ${event.retouchNoteImage1}; Ảnh 2: ${event.retouchNoteImage2}.`;
  }
  return `${event.actorName} đã xác nhận ${event.studentCode} ${event.fullName} chưa chụp. Lý do: ${event.notPhotographedReason}.`;
}
