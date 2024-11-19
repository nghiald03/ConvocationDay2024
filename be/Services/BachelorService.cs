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

           var query = _context.Bachelors.Include(b=>b.Hall).Include(b=>b.Session)
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

      

            public async Task<PagedResult<ListBachelor>> GetAllBachelorAsync(int pageIndex, int pageSize)
        {

            var query = _context.Bachelors.Include(b => b.Hall).Include(b => b.Session)
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
          });

            var totalItems = await query.CountAsync();
            var items = await query.Skip((pageIndex - 1) * pageSize).Take(pageSize).ToListAsync();

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

        public async Task<object> AddBachelorAsync([FromBody] List<BachelorDTO> bachelorRequest)
        {
            List<string> errorList = new List<string>();

            // Lấy danh sách mã sinh viên từ yêu cầu
            var studentCodes = bachelorRequest.Select(b => b.StudentCode).ToList();
            // Lấy danh sách sinh viên đã tồn tại
            var existingStudents = await _context.Bachelors
                .Where(b => studentCodes.Contains(b.StudentCode))
                .Select(b => b.StudentCode)
                .ToListAsync();

            // Tạo bộ nhớ đệm cho các CheckIn đã tồn tại dựa trên HallId và SessionId
            var existingCheckIns = await _context.CheckIns
                .Select(c => new { c.HallId, c.SessionId })
                .ToDictionaryAsync(c => (c.HallId, c.SessionId), c => true);

            foreach (var bItem in bachelorRequest)
            {
                var hall = await _context.Halls.FirstOrDefaultAsync(h => h.HallName == bItem.HallName);
                var session = await _context.Sessions.FirstOrDefaultAsync(s => s.Session1 == bItem.SessionNum);

                if (existingStudents.Contains(bItem.StudentCode))
                {
                    errorList.Add($"Bachelor {bItem.StudentCode} is existed!");
                    continue;
                }
                if (hall == null)
                {
                    errorList.Add($"Hall {bItem.HallName} not found!");
                    continue;
                }
                if (session == null)
                {
                    errorList.Add($"Session {bItem.SessionNum} not found!");
                    continue;
                }

                // Kiểm tra xem CheckIn có tồn tại trong bộ nhớ đệm không
                if (!existingCheckIns.ContainsKey((hall.HallId, session.SessionId)))
                {
                    var checkin = new CheckIn
                    {
                        HallId = hall.HallId,
                        SessionId = session.SessionId,
                        Status = null,
                        Hall = hall,
                        Session = session
                    };
                    await _context.CheckIns.AddAsync(checkin);

                    // Thêm CheckIn mới vào bộ nhớ đệm
                    existingCheckIns[(hall.HallId, session.SessionId)] = true;
                }

                var bachelor = new Bachelor
                {
                    Image = bItem.Image,
                    FullName = bItem.FullName,
                    StudentCode = bItem.StudentCode,
                    Major = bItem.Major,
                    Mail = bItem.Mail,
                    HallId = hall.HallId,
                    SessionId = session.SessionId,
                    Status = false,
                    CheckIn = false,
                    Chair = bItem.Chair,
                    ChairParent = bItem.ChairParent,
                };

                await _context.Bachelors.AddAsync(bachelor);
            }

            await _context.SaveChangesAsync();

            return new
            {
                Data = bachelorRequest,
                ErrorMessages = errorList
            };
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
