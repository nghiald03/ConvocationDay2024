using FA23_Convocation2023_API.Models;
using FA23_Convocation2023_API.DTO;
using Microsoft.EntityFrameworkCore;

namespace FA23_Convocation2023_API.Services
{
    public class StatisticsService
    {
        private readonly Convo24Context _context;

        public StatisticsService(Convo24Context context)
        {
            _context = context;
        }

        public async Task<List<SessionHallSummaryDto>> GetActiveHallSummaryAsync()
        {
            // Lấy tất cả check-in hợp lệ
            var activeCheckIns = await _context.CheckIns
                .Include(c => c.Hall)
                .Include(c => c.Session)
                .Where(c => c.Status == true)
                .ToListAsync();

            if (!activeCheckIns.Any())
                return new List<SessionHallSummaryDto>();

            // Lấy danh sách tất cả hall + session đang xuất hiện
            var hallSessionPairs = activeCheckIns
                .Select(c => new { c.SessionId, c.Session.Session1, c.HallId, c.Hall.HallName })
                .Distinct()
                .ToList();

            // Gộp với bảng Bachelor để lấy tổng sinh viên
            var result = new List<SessionHallSummaryDto>();

            foreach (var pair in hallSessionPairs)
            {
                var totalStudents = await _context.Bachelors.CountAsync(b =>
                    b.SessionId == pair.SessionId && b.HallId == pair.HallId);

                var checkedInCount = await _context.Bachelors.CountAsync(b =>
                    b.SessionId == pair.SessionId && b.HallId == pair.HallId && b.CheckIn == true);

                result.Add(new SessionHallSummaryDto
                {
                    SessionId = pair.SessionId ?? 0,
                    SessionNumber = pair.Session1,
                    HallId = pair.HallId ?? 0,
                    HallName = pair.HallName,
                    TotalStudents = totalStudents,
                    CheckedInCount = checkedInCount
                });
            }

            // Sort kết quả
            return result
                .OrderBy(r => r.HallName)
                .ThenBy(r => r.SessionNumber)
                .ToList();
        }

        public async Task<List<HallOverviewDto>> GetHallOverviewAsync()
        {
            // 1️⃣ Query tổng hợp tất cả dữ liệu cần thiết
            var rawData = await (
                from b in _context.Bachelors
                join s in _context.Sessions on b.SessionId equals s.SessionId
                join h in _context.Halls on b.HallId equals h.HallId
                select new
                {
                    HallId = h.HallId,
                    HallName = h.HallName,
                    SessionId = s.SessionId,
                    SessionNumber = s.Session1,
                    IsCheckedIn = b.CheckIn ?? false
                }
            ).ToListAsync();

            // 2️⃣ Nhóm theo Hall
            var hallGroups = rawData
                .GroupBy(x => new { x.HallId, x.HallName })
                .Select(g =>
                {
                    var sessionGroups = g
                        .GroupBy(x => new { x.SessionId, x.SessionNumber })
                        .Select(sg => new HallSessionSummaryDto
                        {
                            SessionId = sg.Key.SessionId,
                            SessionNumber = sg.Key.SessionNumber,
                            TotalStudents = sg.Count(),
                            CheckedInCount = sg.Count(x => x.IsCheckedIn)
                        })
                        .OrderBy(s => s.SessionNumber)
                        .ToList();

                    // xác định session hiện tại (mới nhất)
                    var current = sessionGroups.LastOrDefault();

                    return new HallOverviewDto
                    {
                        HallId = g.Key.HallId,
                        HallName = g.Key.HallName,
                        TotalSessions = sessionGroups.Count,
                        Sessions = sessionGroups,
                        CurrentSessionId = current?.SessionId,
                        CurrentSessionNumber = current?.SessionNumber
                    };
                })
                .OrderBy(h => h.HallName)
                .ToList();

            return hallGroups;
        }
    }
}
