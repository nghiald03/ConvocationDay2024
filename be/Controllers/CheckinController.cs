using FA23_Convocation2023_API.DTO;
using FA23_Convocation2023_API.Models;
using FA23_Convocation2023_API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FA23_Convocation2023_API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CheckinController : ControllerBase
    {
        private readonly CheckInService _checkInService;

        public CheckinController(CheckInService checkInService)
        {
            _checkInService = checkInService;
        }

        [HttpPut("UpdateCheckin")]
        [Authorize(Roles = "MN, CK")]
        public async Task<IActionResult> UpdateCheckinAsync(CheckinRequest checkinRequest)
        {
            try
            {
                var result = await _checkInService.UpdateCheckinAsync(checkinRequest);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPut("UpdateCheckinStudentCode")]
        public async Task<IActionResult> UpdateCheckinWithStudentCode(string studentCode)
        {
            try
            {
                var result = await _checkInService.UpdateCheckinWithStudentCode(studentCode);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpGet("GetAll")]
        [Authorize(Roles = "MN, CK")]
        public async Task<IActionResult> GetAllCheckinAsync()
        {
            var result = await _checkInService.GetAllCheckinAsync();
            return Ok(new
            {
                status = StatusCodes.Status200OK,
                message = "Get checkin successfully!",
                data = result
            });
        }

        [HttpPut("UncheckAll")]
        [Authorize(Roles = "MN, CK")]
        public async Task<IActionResult> UncheckAllCheckinAsync()
        {
            var result = await _checkInService.UncheckAllCheckinAsync();
            return Ok(new
            {
                status = StatusCodes.Status200OK,
                message = result
            });
        }

        [HttpGet("GetAllStatusCheckin")]
        [Authorize(Roles = "MN")]
        public async Task<IActionResult> GetAllStatusCheckinAsync()
        {
            var statusCheckin = await _checkInService.GetAllStatusCheckinAsync();
            return Ok(new
            {
                status = StatusCodes.Status200OK,
                message = "Get all status checkin successfully",
                data = statusCheckin
            });
        }

        [HttpPut("UpdateStatusCheckin")]
        [Authorize(Roles = "MN")]
        public async Task<IActionResult> UpdateStatusCheckinAsync(StatusCheckinRequest request)
        {
            try
            {
                var result = await _checkInService.UpdateStatusCheckinAsync(request.CheckinId, request.Status);
                return Ok(new
                {
                    status = StatusCodes.Status200OK,
                    message = "Update status checkin successfully!",
                    data = result
                });
            }
            catch (Exception e)
            {
                return BadRequest(e.Message);
            }
        }

        [HttpGet("GetCountCheckin")]
        [Authorize(Roles = "CK, MN")]
        public async Task<IActionResult> GetCountCheckinAsync()
        {
            var result = await _checkInService.GetCountCheckinAsync();
            return Ok(new
            {
                status = StatusCodes.Status200OK,
                message = "Get count checkin successfully!",
                data = result
            });
        }

        //create new checkin
        [HttpPost("CreateCheckin")]
        [Authorize()]
        public async Task<IActionResult> CreateCheckin(CreateCheckInRequest request)
        {
            var result = await _checkInService.CreateCheckinAsync(request.HallId, request.SessionId);
            if (result == null)
            {
                return BadRequest(new
                {
                    status = StatusCodes.Status400BadRequest,
                    message = "Checkin already exists!"
                });
            }
            return Ok(new
            {
                status = StatusCodes.Status200OK,
                message = "Create Checkin success!"
            });
        }

        //get list bachelor dose not checkin
        [HttpGet("GetListBachelorNotCheckin")]
        public async Task<IActionResult> GetListBachelorNotCheckinAsync()
        {
            var result = await _checkInService.GetBachelorCheckInAsync();
            return Ok(new
            {
                status = StatusCodes.Status200OK,
                message = "Get list bachelor not checkin successfully!",
                data = result
            });
        }

        [HttpGet("GetListBachelorNotCheckinV2")]
        public async Task<IActionResult> GetListBachelorNotCheckinAsync(
    [FromQuery] int pageIndex = 1,
    [FromQuery] int pageSize = 10)
        {
            // Kiểm tra giá trị của pageIndex và pageSize
            if (pageIndex < 1 || pageSize < 1)
            {
                return BadRequest(new
                {
                    status = StatusCodes.Status400BadRequest,
                    message = "Page index and page size must be greater than zero."
                });
            }

            try
            {

                var result = await _checkInService.GetBachelorCheckInV2Async(pageIndex, pageSize);

                if (result.TotalItems == 0)
                {
                    return Ok(new
                    {
                        status = StatusCodes.Status204NoContent,
                        message = "No bachelors found who have not checked in!"
                    });
                }

                return Ok(new
                {
                    status = StatusCodes.Status200OK,
                    message = "Get list of bachelors not checked in successfully!",
                    data = result,

                });
            }
            catch (Exception ex)
            {

                return StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    status = StatusCodes.Status500InternalServerError,
                    message = ex.Message
                });
            }
        }

        //get checkin status = false
        [HttpGet("GetCheckinStatusFalse")]
        public async Task<IActionResult> GetCheckinStatusFalseAsync()
        {
            var result = await _checkInService.GetCheckinStatusFalseAsync();
            return Ok(new
            {
                status = StatusCodes.Status200OK,
                message = "Get checkin status false successfully!",
                data = result
            });
        }





    }
}
