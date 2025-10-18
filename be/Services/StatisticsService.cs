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

        public async Task<StatisticsDto> GetStatisticsAsync()
        {
            var totalSessions = await _context.Sessions.CountAsync();
            var totalHalls = await _context.Halls.CountAsync();
            var totalCheckIn = await _context.CheckIns.CountAsync(c => c.Status == true);

            // thống kê tất cả session
            var allSessions = await _context.Sessions
                .Select(s => new SessionStatisticDto
                {
                    SessionId = s.SessionId,
                    SessionNumber = s.Session1,
                    TotalHalls = s.CheckIns.Select(c => c.HallId).Distinct().Count(),
                    TotalCheckIn = s.CheckIns.Count(c => c.Status == true)
                })
                .ToListAsync();

            return new StatisticsDto
            {
                TotalSessions = totalSessions,
                TotalHalls = totalHalls,
                TotalCheckIn = totalCheckIn,
                Sessions = allSessions
            };
        }
    }
}
