using FA23_Convocation2023_API.DTO;
using FA23_Convocation2023_API.Models;
using Microsoft.EntityFrameworkCore;

namespace FA23_Convocation2023_API.Services
{
    public class SessionService
    {
        private readonly Convo24Context _context;

        public SessionService(Convo24Context context)
        {
            _context = context;
        }

        //check if session is existed
        public Task<bool> SessionExist(int sessionNum)
        {
            return _context.Sessions.AnyAsync(s => s.Session1 == sessionNum);
        }

        //create session
        public async Task<Session> CreateSession(int sessionNum, string description = null, int? sessionInDay = null)
        {
            var session = new Session
            {
                Session1 = sessionNum,
                SessionInDay = sessionInDay,
                Description = description
            };
            await _context.Sessions.AddAsync(session);
            await _context.SaveChangesAsync();
            return session;
        }

        //get all session
        public async Task<List<ListSession>> GetAllSessionAsync()
        {
            var sessions = await _context.Sessions.ToListAsync();
            var listSession = new List<ListSession>();
            foreach (var session in sessions)
            {
                listSession.Add(new ListSession
                {
                    SessionId = session.SessionId,
                    Session1 = session.Session1,
                    SessionInDay = session.SessionInDay,
                    Description = session.Description,
                    Status = session.Status
                });
            }
            return listSession;
        }

        public async Task<Session> UpdateSessionAsync(int sessionId, int sessionNum, string? description = null, int? sessionInDay = null) {
            try {
                var existingSession = await _context.Sessions.FirstOrDefaultAsync(s => s.SessionId == sessionId);
                if (existingSession == null)
                {
                    return null;
                }
                existingSession.Session1 = sessionNum;
                existingSession.SessionInDay = sessionInDay;
                existingSession.Description = description;
                _context.Sessions.Update(existingSession);
                await _context.SaveChangesAsync();
                return existingSession;
            } catch (Exception ex) {
                Console.WriteLine(ex.Message);
                return null;
            }
        }

        public async Task<bool> DeleteSessionAsync(int sessionId)
        {
            try {
                var existingSession = await _context.Sessions.FirstOrDefaultAsync(s => s.SessionId == sessionId);
                if (existingSession == null)
                {
                    return false;
                }
                _context.Sessions.Remove(existingSession);
                await _context.SaveChangesAsync();
                return true;
            } catch (Exception ex) {
                Console.WriteLine(ex.Message);
                return false;
            }
        }

        // Auto fill sessionInDay for a range of sessions
        public async Task<bool> AutoFillSessionInDayAsync(int fromSession, int toSession)
        {
            try
            {
                // Get all sessions within the range
                var sessions = await _context.Sessions
                    .Where(s => s.Session1 >= fromSession && s.Session1 <= toSession)
                    .OrderBy(s => s.Session1)
                    .ToListAsync();

                if (sessions.Count == 0)
                {
                    return false;
                }

                // Auto fill sessionInDay starting from 1
                for (int i = 0; i < sessions.Count; i++)
                {
                    sessions[i].SessionInDay = i + 1;
                }

                _context.Sessions.UpdateRange(sessions);
                await _context.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex.Message);
                return false;
            }
        }

        // Open a session
        public async Task<Session> OpenSessionAsync(int sessionId)
        {
            try
            {
                var session = await _context.Sessions.FirstOrDefaultAsync(s => s.SessionId == sessionId);
                if (session == null)
                {
                    return null;
                }

                session.Status = FA23_Convocation2023_API.Enums.SessionStatus.Open;
                _context.Sessions.Update(session);
                await _context.SaveChangesAsync();
                return session;
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex.Message);
                return null;
            }
        }

        // Close a session and auto-update attendance status
        public async Task<Session> CloseSessionAsync(int sessionId)
        {
            try
            {
                var session = await _context.Sessions
                    .Include(s => s.Bachelors)
                    .FirstOrDefaultAsync(s => s.SessionId == sessionId);

                if (session == null)
                {
                    return null;
                }

                // Update session status
                session.Status = FA23_Convocation2023_API.Enums.SessionStatus.Closed;

                // Auto-update attendance status for students who haven't checked in
                foreach (var bachelor in session.Bachelors)
                {
                    if (bachelor.CheckIn != true && bachelor.AttendanceStatus == FA23_Convocation2023_API.Enums.AttendanceStatus.NotCheckedIn)
                    {
                        bachelor.AttendanceStatus = FA23_Convocation2023_API.Enums.AttendanceStatus.Absent;
                    }
                }

                _context.Sessions.Update(session);
                await _context.SaveChangesAsync();
                return session;
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex.Message);
                return null;
            }
        }
    }
}
