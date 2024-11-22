using FA23_Convocation2023_API.DTO;
using FA23_Convocation2023_API.Models;
using FA23_Convocation2023_API.Utils;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using static Microsoft.EntityFrameworkCore.DbLoggerCategory;

namespace FA23_Convocation2023_API.Services
{
    public class BachelorService
    {
        private readonly Convo24Context _context = new Convo24Context();

        public async Task<PagedResult<BachelorDTO>> SearchBachelorsAsync(string keySearch, int pageIndex, int pageSize)
        {

            var query = _context.Bachelors.Include(b => b.Hall).Include(b => b.Session)
           .Where(b => string.IsNullOrEmpty(keySearch) || b.FullName.Contains(keySearch) || b.StudentCode.Contains(keySearch))
           .OrderBy(b => b.Id)
           .Select(b => new BachelorDTO
           {
               Image = b.Image,
               FullName = b.FullName,
               Major = b.Major,
               StudentCode = b.StudentCode,
               Mail = b.Mail,
               HallName = b.Hall.HallName,
               SessionNum = (int)b.Session.Session1,
               Chair = b.Chair,
               ChairParent = b.ChairParent
           });

            var totalItems = await query.CountAsync();
            var items = await query.Skip((pageIndex - 1) * pageSize).Take(pageSize).ToListAsync();

            var paginatedResult = new PaginatedList<BachelorDTO>(items, totalItems, pageIndex, pageSize);
            return new PagedResult<BachelorDTO>
            {
                Items = paginatedResult.Items,
                TotalItems = paginatedResult.TotalCount,
                TotalPages = paginatedResult.TotalPages,
                CurrentPage = paginatedResult.CurrentPage,
                PageSize = paginatedResult.PageSize,
                HasPreviousPage = paginatedResult.HasPreviousPage,
                HasNextPage = paginatedResult.HasNextPage
            };


        }



        public async Task<PagedResult<ListBachelor>> GetAllBachelorAsync(int pageIndex, int pageSize, string keySearch = null, int? sessionId = null, int? hallId = null)
        {
            var query = _context.Bachelors.Include(b => b.Hall).Include(b => b.Session)
                .AsQueryable();

            // Tìm kiếm theo FullName hoặc StudentCode
            if (!string.IsNullOrWhiteSpace(keySearch))
            {
                query = query.Where(b => b.FullName.Contains(keySearch) || b.StudentCode.Contains(keySearch));
            }

            // Lọc theo SessionId
            if (sessionId.HasValue)
            {
                query = query.Where(b => b.SessionId == sessionId.Value);
            }

            // Lọc theo HallId
            if (hallId.HasValue)
            {
                query = query.Where(b => b.HallId == hallId.Value);
            }

            var totalItems = await query.CountAsync();

            // Select ra ListBachelor
            var items = await query
                .Skip((pageIndex - 1) * pageSize)
                .Take(pageSize)
                .Select(bachelor => new ListBachelor
                {
                    Id = bachelor.Id,
                    StudentCode = bachelor.StudentCode,
                    FullName = bachelor.FullName,
                    Mail = bachelor.Mail,
                    Faculty = bachelor.Faculty,
                    Major = bachelor.Major,
                    Image = bachelor.Image,
                    Status = bachelor.Status,
                    StatusBaChelor = bachelor.StatusBaChelor,
                    HallName = bachelor.Hall.HallName,
                    SessionNum = bachelor.Session.Session1,
                    Chair = bachelor.Chair,
                    ChairParent = bachelor.ChairParent,
                    CheckIn = bachelor.CheckIn,
                    TimeCheckIn = bachelor.TimeCheckIn
                })
                .ToListAsync();

            var paginatedResult = new PaginatedList<ListBachelor>(items, totalItems, pageIndex, pageSize);
            return new PagedResult<ListBachelor>
            {
                Items = paginatedResult.Items,
                TotalItems = paginatedResult.TotalCount,
                TotalPages = paginatedResult.TotalPages,
                CurrentPage = paginatedResult.CurrentPage,
                PageSize = paginatedResult.PageSize,
                HasPreviousPage = paginatedResult.HasPreviousPage,
                HasNextPage = paginatedResult.HasNextPage
            };
        }

       public async Task<AddBachelorResponse> AddBachelorAsync(List<BachelorDTO> bachelorRequest)
{
    var response = new AddBachelorResponse();

    foreach (var bItem in bachelorRequest)
    {
        // Check for null fields
        if (string.IsNullOrEmpty(bItem.Image) || string.IsNullOrEmpty(bItem.FullName) || 
            string.IsNullOrEmpty(bItem.StudentCode) || string.IsNullOrEmpty(bItem.Mail) || 
            string.IsNullOrEmpty(bItem.Major) || string.IsNullOrEmpty(bItem.HallName) || 
            bItem.SessionNum == 0 || string.IsNullOrEmpty(bItem.Chair) || string.IsNullOrEmpty(bItem.ChairParent))
        {
            response.ErrorMessages.Add($"Bachelor {bItem.StudentCode} has null field!");
            continue;
        }

        // Check if bachelor already exists
        var bachelor = await _context.Bachelors.FirstOrDefaultAsync(b => b.StudentCode.Equals(bItem.StudentCode));
        if (bachelor != null)
        {
            response.ErrorMessages.Add($"Bachelor {bItem.StudentCode} already exists!");
            continue;
        }

        // Handle hall and session
        // Handle hall
        var hall = await _context.Halls.FirstOrDefaultAsync(h => h.HallName == bItem.HallName) 
                   ?? new Hall { HallName = bItem.HallName };

        if (hall.HallId == 0) // If Hall is new, add and save it
        {
            await _context.Halls.AddAsync(hall);
            await _context.SaveChangesAsync(); // Save to get the generated HallId
        }

// Handle session
        var session = await _context.Sessions.FirstOrDefaultAsync(s => s.Session1 == bItem.SessionNum) 
                      ?? new Session { Session1 = bItem.SessionNum };

        if (session.SessionId == 0) // If Session is new, add and save it
        {
            await _context.Sessions.AddAsync(session);
            await _context.SaveChangesAsync(); // Save to get the generated SessionId
        }

// Handle check-in
        var checkin = await _context.CheckIns.FirstOrDefaultAsync(c =>
                          c.HallId == hall.HallId && c.SessionId == session.SessionId)
                      ?? new CheckIn { HallId = hall.HallId, SessionId = session.SessionId };

        if (checkin.CheckinId == 0) // If CheckIn is new, add it
        {
            await _context.CheckIns.AddAsync(checkin);
            await _context.SaveChangesAsync(); // Save CheckIn
        }
        
        
        

        // Create a new bachelor
        var bachelorEntity = new Bachelor
        {
            Image = bItem.Image,
            FullName = bItem.FullName,
            StudentCode = bItem.StudentCode,
            Mail = bItem.Mail,
            Major = bItem.Major,
            HallId = hall.HallId,
            SessionId = session.SessionId,
            Chair = bItem.Chair,
            ChairParent = bItem.ChairParent
        };

        await _context.Bachelors.AddAsync(bachelorEntity);
        response.SuccessfulBachelors.Add(bItem);
    }

    await _context.SaveChangesAsync();
    return response;
}


        //update UpdateBachelorAsync
        public async Task<Bachelor?> UpdateBachelorAsync(BachelorDTO bachelorRequest)
        {
            var existingBachelor = await _context.Bachelors.FirstOrDefaultAsync(b => b.StudentCode == bachelorRequest.StudentCode);

            if (existingBachelor == null)
            {
                return null;
            }
            var hall = await _context.Halls.FirstOrDefaultAsync(h => h.HallName == bachelorRequest.HallName);
            var session = await _context.Sessions.FirstOrDefaultAsync(s => s.Session1 == bachelorRequest.SessionNum);
            existingBachelor.Image = bachelorRequest.Image;
            existingBachelor.FullName = bachelorRequest.FullName;
            existingBachelor.StudentCode = bachelorRequest.StudentCode;
            existingBachelor.Mail = bachelorRequest.Mail;
            existingBachelor.Major = bachelorRequest.Major;
            existingBachelor.HallId = hall.HallId;
            existingBachelor.SessionId = session.SessionId;
            existingBachelor.Chair = bachelorRequest.Chair;
            existingBachelor.ChairParent = bachelorRequest.ChairParent;

            _context.Bachelors.Update(existingBachelor);
            await _context.SaveChangesAsync();
            return existingBachelor;
        }

        //update list bachelor by hallname and sessionnum
        public async Task<object> UpdateListBachelorAsync(List<ListBachelor> bachelorRequest, int hallId, int sessionNum)
        {
            var listBachelor = await _context.Bachelors.Where(b => b.HallId == hallId && b.SessionId == sessionNum).ToListAsync();
            List<string> errorList = new List<string>();
            foreach (var bItem in bachelorRequest)
            {
                var existingBachelor = listBachelor.FirstOrDefault(b => b.StudentCode == bItem.StudentCode);
                if (existingBachelor == null)
                {
                    errorList.Add($"Bachelor {bItem.StudentCode} is not existed!");
                    continue;
                }
                existingBachelor.Image = bItem.Image;
                existingBachelor.FullName = bItem.FullName;
                existingBachelor.StudentCode = bItem.StudentCode;
                existingBachelor.Mail = bItem.Mail;
                existingBachelor.Major = bItem.Major;
                existingBachelor.HallId = hallId;
                existingBachelor.SessionId = sessionNum;
                existingBachelor.Chair = bItem.Chair;
                existingBachelor.ChairParent = bItem.ChairParent;
                _context.Bachelors.Update(existingBachelor);
            }
            await _context.SaveChangesAsync();
            return new
            {
                ErrorMessages = errorList
            };
        }
        //delete bachelor by student code
        public async Task<bool> DeleteBachelorAsync(string studentCode)
        {
            var existBachelor = await _context.Bachelors.FirstOrDefaultAsync(b => b.StudentCode == studentCode);
            if (existBachelor == null)
            {
                return false;
            }
            _context.Bachelors.Remove(existBachelor);
            await _context.SaveChangesAsync();
            return true;
        }
        //delete all bachelor
        public async Task<bool> DeleteAllBachelorAsync()
        {
            foreach (var bachelor in _context.Bachelors)
            {
                _context.Bachelors.Remove(bachelor);
            }
            await _context.SaveChangesAsync();
            return true;
        }

        //reset status of all bachelor
        public async Task ResetStatusAsync()
        {
            foreach (var bachelor in _context.Bachelors)
            {
                bachelor.StatusBaChelor = null;
                bachelor.Status = false;
                bachelor.CheckIn = false;
                _context.Bachelors.Update(bachelor);
            }
            await _context.SaveChangesAsync();
        }

        //get bachelor by hall id and session id
        public async Task<List<Bachelor>> GetBachelorByHallSessionAsync(int hallId, int sessionId)
        {
            var result = await _context.Bachelors
                .Where(b => b.HallId == hallId && b.SessionId == sessionId)
                .ToListAsync();
            return result;
        }

    }
}
