using FA23_Convocation2023_API.Hubs;
using FA23_Convocation2023_API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace FA23_Convocation2023_API.Controllers
{
    [Route("api/[controller]")]
    [Authorize(Roles = "MN, MC, CK")]
    [ApiController]
    public class McController : ControllerBase
    {
        private readonly IHubContext<MessageHub> messageHub;
        private readonly Convo24Context _context;

        public McController(IHubContext<MessageHub> _messageHub, Convo24Context context)
        {
            messageHub = _messageHub;
            _context = context;
        }

        // ==========================================
        // 1. GET LOCATION
        // ==========================================
        [HttpGet("GetLocationBachelor")]
        public async Task<IActionResult> GetLocationBachelor([FromQuery] string studentCode)
        {
            var bachelor = await _context.Bachelors.FirstOrDefaultAsync(b => b.StudentCode == studentCode);

            if (bachelor == null)
            {
                return NotFound(new { status = StatusCodes.Status404NotFound, message = "Not Found", data = "" });
            }

            if (bachelor.CheckIn != true || bachelor.Status != true)
            {
                return Ok(new { status = StatusCodes.Status200OK, message = "Bachelor does not Checkin or Status is false.", data = "" });
            }

            return Ok(new
            {
                status = StatusCodes.Status200OK,
                message = "Location of bachelor",
                data = bachelor
            });
        }

        // ==========================================
        // 2. GET ALL (Sort Convert To Int)
        // ==========================================
        [HttpGet("GetAllLocationBachelor")]
        public async Task<IActionResult> GetAllLocationBachelor()
        {
            // Ép kiểu Chair sang Int để sort đúng (1, 2, ... 10)
            // Lưu ý: Dữ liệu Chair phải là số, không được chứa chữ
            var bachelors = await _context.Bachelors
                                          .OrderBy(b => Convert.ToInt32(b.Chair))
                                          .ToListAsync();

            if (bachelors == null || !bachelors.Any())
            {
                return NotFound(new { status = StatusCodes.Status404NotFound, message = "Not Found", data = "" });
            }

            var results = bachelors.Select(bache => new
            {
                id = bache.Id,
                studentCode = bache.StudentCode,
                fullname = bache.FullName,
                mail = bache.Mail,
                major = bache.Major,
                hallName = bache.HallId,
                sessionNum = bache.SessionId,
                chair = bache.Chair,
                chairParent = bache.ChairParent,
                message = (bache.CheckIn != true || bache.Status != true) ? "Bachelor does not Checkin/Active" : "Ok"
            }).ToList();

            return Ok(new
            {
                status = StatusCodes.Status200OK,
                message = "Location of bachelor",
                data = results
            });
        }

        // ==========================================
        // 3. GET 1ST (Sort Convert To Int)
        // ==========================================
        [HttpGet("GetBachelor1st")]
        public async Task<IActionResult> Get1stBachelorToShow([FromQuery] int hall, [FromQuery] int session)
        {
            var listUser = await _context.Bachelors
                                         .Where(b => b.Status == true && b.HallId == hall && b.SessionId == session)
                                         // Sort bằng số int
                                         .OrderBy(b => Convert.ToInt32(b.Chair))
                                         .ToListAsync();

            if (listUser.Count == 0)
            {
                return NotFound(new { status = StatusCodes.Status404NotFound, message = "Not Found", data = "" });
            }

            var user1 = listUser[0];
            user1.StatusBaChelor = "Current";

            Bachelor user2 = null;
            if (listUser.Count > 1)
            {
                user2 = listUser[1];
                user2.StatusBaChelor = "Next";
            }

            await _context.SaveChangesAsync();

            await messageHub.Clients.All.SendAsync("SendMessage", "CurrentBachelor " + user1.ToString(), user1.ToString());

            return Ok(new
            {
                status = StatusCodes.Status200OK,
                message = "Get bachelors successfully!",
                data = new { User1 = user1, User2 = user2 }
            });
        }

        // ==========================================
        // 4. NEXT (Logic Convert To Int)
        // ==========================================
        [HttpGet("GetBachelorNext")]
        public async Task<IActionResult> GetBaChelorNext([FromQuery] int hall, [FromQuery] int session)
        {
            var currentBachelor = await _context.Bachelors
                .FirstOrDefaultAsync(b => b.StatusBaChelor == "Current" && b.HallId == hall && b.SessionId == session && b.Status == true);

            if (currentBachelor == null)
            {
                return NotFound(new { status = StatusCodes.Status404NotFound, message = "Current bachelor not found", data = "" });
            }

            // Parse ghế hiện tại ra số để so sánh
            int currentChairNum = int.Parse(currentBachelor.Chair);

            // Tìm người có ghế > ghế hiện tại (So sánh số học)
            var nextBachelor = await _context.Bachelors
                .Where(b => b.HallId == hall &&
                            b.SessionId == session &&
                            b.Status == true &&
                            Convert.ToInt32(b.Chair) > currentChairNum) // So sánh số
                .OrderBy(b => Convert.ToInt32(b.Chair)) // Sắp xếp số tăng dần
                .FirstOrDefaultAsync();

            if (nextBachelor == null)
            {
                return Ok(new { status = StatusCodes.Status200OK, message = "IN THE LAST BACHELOR, CAN NOT NEXT", data = "" });
            }

            // Tìm người kế tiếp thứ 3
            int nextChairNum = int.Parse(nextBachelor.Chair);
            var nextNextBachelor = await _context.Bachelors
                .Where(b => b.HallId == hall &&
                            b.SessionId == session &&
                            b.Status == true &&
                            Convert.ToInt32(b.Chair) > nextChairNum) // So sánh số
                .OrderBy(b => Convert.ToInt32(b.Chair))
                .FirstOrDefaultAsync();

            // Update trạng thái
            currentBachelor.StatusBaChelor = "Back";
            nextBachelor.StatusBaChelor = "Current";
            if (nextNextBachelor != null) nextNextBachelor.StatusBaChelor = "Next";

            await _context.SaveChangesAsync();

            await messageHub.Clients.All.SendAsync("SendMessage", "CurrentBachelor " + nextBachelor.ToString(), nextBachelor.ToString());

            return Ok(new
            {
                status = StatusCodes.Status200OK,
                message = "Get 3 bachelors (moved next)!",
                data = new
                {
                    Bachelor1 = currentBachelor,
                    Bachelor2 = nextBachelor,
                    Bachelor3 = nextNextBachelor ?? (object)""
                }
            });
        }

        // ==========================================
        // 5. BACK (Logic Convert To Int)
        // ==========================================
        [HttpGet("GetBachelorBack")]
        public async Task<IActionResult> GetBaChelorBack([FromQuery] int hall, [FromQuery] int session)
        {
            var currentBachelor = await _context.Bachelors
                .FirstOrDefaultAsync(b => b.StatusBaChelor == "Current" && b.HallId == hall && b.SessionId == session && b.Status == true);

            if (currentBachelor == null)
            {
                return NotFound(new { status = StatusCodes.Status404NotFound, message = "Current bachelor not found", data = "" });
            }

            int currentChairNum = int.Parse(currentBachelor.Chair);

            // Tìm người có ghế < ghế hiện tại (So sánh số học)
            var prevBachelor = await _context.Bachelors
                .Where(b => b.HallId == hall &&
                            b.SessionId == session &&
                            b.Status == true &&
                            Convert.ToInt32(b.Chair) < currentChairNum) // So sánh số
                .OrderByDescending(b => Convert.ToInt32(b.Chair)) // Giảm dần theo số
                .FirstOrDefaultAsync();

            if (prevBachelor == null)
            {
                return Ok(new { status = StatusCodes.Status200OK, message = "IN THE FIRST BACHELOR, CAN NOT BACK", data = "" });
            }

            // Tìm người trước nữa
            int prevChairNum = int.Parse(prevBachelor.Chair);
            var prevPrevBachelor = await _context.Bachelors
                .Where(b => b.HallId == hall &&
                            b.SessionId == session &&
                            b.Status == true &&
                            Convert.ToInt32(b.Chair) < prevChairNum)
                .OrderByDescending(b => Convert.ToInt32(b.Chair))
                .FirstOrDefaultAsync();

            // Update trạng thái
            currentBachelor.StatusBaChelor = "Next";
            prevBachelor.StatusBaChelor = "Current";
            if (prevPrevBachelor != null) prevPrevBachelor.StatusBaChelor = "Back";

            await _context.SaveChangesAsync();

            await messageHub.Clients.All.SendAsync("SendMessage", "CurrentBachelor " + prevBachelor.ToString(), prevBachelor.ToString());

            return Ok(new
            {
                status = StatusCodes.Status200OK,
                message = "Get 3 bachelors (moved back)!",
                data = new
                {
                    Bachelor1 = prevPrevBachelor ?? (object)"",
                    Bachelor2 = prevBachelor,
                    Bachelor3 = currentBachelor
                }
            });
        }

        // ==========================================
        // 6. GET CURRENT (Logic Convert To Int)
        // ==========================================
        [HttpGet("GetBachelorCurrent")]
        public async Task<IActionResult> GetBaChelorCurrrent([FromQuery] int hall, [FromQuery] int session)
        {
            var currentBachelor = await _context.Bachelors
                .FirstOrDefaultAsync(b => b.StatusBaChelor == "Current" && b.HallId == hall && b.SessionId == session && b.Status == true);

            if (currentBachelor == null)
            {
                return NotFound(new { status = StatusCodes.Status404NotFound, message = "No active current bachelor found", data = "" });
            }

            int currentChairNum = int.Parse(currentBachelor.Chair);

            // Back: Tìm nhỏ hơn gần nhất
            var backBachelor = await _context.Bachelors
                .Where(b => b.HallId == hall &&
                            b.SessionId == session &&
                            b.Status == true &&
                            Convert.ToInt32(b.Chair) < currentChairNum)
                .OrderByDescending(b => Convert.ToInt32(b.Chair))
                .FirstOrDefaultAsync();

            // Next: Tìm lớn hơn gần nhất
            var nextBachelor = await _context.Bachelors
                .Where(b => b.HallId == hall &&
                            b.SessionId == session &&
                            b.Status == true &&
                            Convert.ToInt32(b.Chair) > currentChairNum)
                .OrderBy(b => Convert.ToInt32(b.Chair))
                .FirstOrDefaultAsync();

            // Update DB để đồng bộ
            if (backBachelor != null) backBachelor.StatusBaChelor = "Back";
            currentBachelor.StatusBaChelor = "Current";
            if (nextBachelor != null) nextBachelor.StatusBaChelor = "Next";

            await _context.SaveChangesAsync();

            await messageHub.Clients.All.SendAsync("SendMessage", "CurrentBachelor " + currentBachelor.ToString(), currentBachelor.ToString());

            return Ok(new
            {
                status = StatusCodes.Status200OK,
                message = "Get 3 bachelors (reload current)",
                data = new
                {
                    Bachelor1 = backBachelor ?? (object)"",
                    Bachelor2 = currentBachelor,
                    Bachelor3 = nextBachelor ?? (object)""
                }
            });
        }
    }
}