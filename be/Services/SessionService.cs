using FA23_Convocation2023_API.DTO;
using FA23_Convocation2023_API.Models;
using Microsoft.EntityFrameworkCore;

namespace FA23_Convocation2023_API.Services
{
    public class SessionService
    {
        private readonly Convo24Context _context = new Convo24Context();

        //check if session is existed
        public Task<bool> SessionExist(int sessionNum)
        {
            return _context.Sessions.AnyAsync(s => s.Session1 == sessionNum);
        }

        //create session
        public async Task<Session> CreateSession(int sessionNum)
        {
            var session = new Session
            {
                Session1 = sessionNum
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
                    Session1 = session.Session1
                });
            }
            return listSession;
        }

        public async Task<Session> UpdateSessionAsync(int sessionId, int sessionNum) {
            try {
                var existingSession = await _context.Sessions.FirstOrDefaultAsync(s => s.SessionId == sessionId);
                if (existingSession == null)
                {
                    return null;
                }
                existingSession.Session1 = sessionNum;
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
    }
}
