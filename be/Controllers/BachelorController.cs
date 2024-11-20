using FA23_Convocation2023_API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Globalization;
using System;
using FA23_Convocation2023_API.DTO;
using FA23_Convocation2023_API.Services;

namespace FA23_Convocation2023_API.Controllers
{
    [Route("api/[controller]")]
    [Authorize(Roles = "MN")]
    [ApiController]
    public class BachelorController : ControllerBase
    {

        private readonly BachelorService _bachService;
        private readonly HallService _hallService;
        private readonly SessionService _sessionService;

        public BachelorController(BachelorService bachService, HallService hallService, SessionService sessionService)
        {
            _bachService = bachService;
            _hallService = hallService;
            _sessionService = sessionService;
        }

        [HttpGet("search")]
        public async Task<ActionResult<PagedResult<BachelorDTO>>> SearchBachelors(
           [FromQuery] string keySearch,
           [FromQuery] int pageIndex = 1,
           [FromQuery] int pageSize = 10)
        {
            if (pageIndex < 1 || pageSize < 1)
            {
                return BadRequest("Page index and page size must be greater than zero.");
            }

            var result = await _bachService.SearchBachelorsAsync(keySearch, pageIndex, pageSize);
            return Ok(new
            {
                status = StatusCodes.Status200OK,
                message = "Get bachelors successfully!",
                data = result
            });
        }

        [HttpGet("GetAll")]
        public async Task<IActionResult> GetAllBachelorAsync(
     [FromQuery] int pageIndex = 1,
     [FromQuery] int pageSize = 10,
     [FromQuery] string? keySearch = null,
     [FromQuery] int? sessionId = null,
     [FromQuery] int? hallId = null)
        {
            if (pageIndex < 1 || pageSize < 1)
            {
                return BadRequest("Page index and page size must be greater than zero.");
            }

            var result = await _bachService.GetAllBachelorAsync(pageIndex, pageSize, keySearch, sessionId, hallId);

            if (result.TotalItems == 0)
            {
                return Ok(new
                {
                    status = StatusCodes.Status204NoContent,
                    message = "Not any bachelors!"
                });
            }

            return Ok(new
            {
                status = StatusCodes.Status200OK,
                message = "Get all bachelors successfully!",
                data = result
            });
        }


        [HttpPost("Add")]
        public async Task<IActionResult> AddBechelorAsync([FromBody] List<BachelorDTO> bachelorRequest)
        {
            var result = await _bachService.AddBachelorAsync(bachelorRequest);
            if (((dynamic)result).ErrorMessages != null) return BadRequest(new
            {
                status = StatusCodes.Status400BadRequest,
                message = "Có lỗi xảy ra trong quá trình thêm Bachelor! Chi tiết trong messages",
                errorMessages = ((dynamic)result).ErrorMessages,
                data = bachelorRequest
            });
            return Ok(new
            {
                status = StatusCodes.Status200OK,
                message = "Thêm danh sách Bachelor thành công!",
                data = bachelorRequest
            });
        }

        [HttpPut("Update")]
        public async Task<IActionResult> UpdateBachelorAsync(BachelorDTO bachelorRequest)
        {
            var hallExist = await _hallService.HallExist(bachelorRequest.HallName);
            if (!hallExist)
            {
                return BadRequest("Hall is not existed!");
            }
            var sessionExist = await _sessionService.SessionExist(bachelorRequest.SessionNum);
            if (!sessionExist)
            {
                return BadRequest("Session is not existed!");
            }
            var existingBachelor = await _bachService.UpdateBachelorAsync(bachelorRequest);
            return Ok(new
            {
                status = StatusCodes.Status200OK,
                message = "Update bachelors successfully!",
                data = existingBachelor
            });
        }
        //update list bachelor by hallname and sessionnum
        [HttpPut("UpdateListBachelor/{hallId}/{sessionId}")]
        public async Task<IActionResult> UpdateListBachelorAsync([FromBody] List<ListBachelor> bachelorRequest, [FromRoute] int hallId, [FromRoute] int sessionId)
        {
            var result = await _bachService.UpdateListBachelorAsync(bachelorRequest, hallId, sessionId);
            return Ok(new
            {
                status = StatusCodes.Status200OK,
                message = "Update bachelors successfully!",
                errorMessages = ((dynamic)result).ErrorMessages
            });
        }

        [HttpDelete("Delete/{StudentCode}")]
        public async Task<IActionResult> DeleteBachelorAsync([FromRoute] string StudentCode)
        {
            var result = await _bachService.DeleteBachelorAsync(StudentCode);
            if (!result)
            {
                return BadRequest(new
                {
                    status = StatusCodes.Status400BadRequest,
                    message = "Delete failed!"
                });
            }
            else
            {
                return Ok(new
                {
                    status = StatusCodes.Status200OK,
                    message = "Delete successfully!"
                });
            }
        }

        [HttpDelete("DeleteAll")]
        public async Task<IActionResult> DeleteAllBachelorAsync()
        {
            var result = await _bachService.DeleteAllBachelorAsync();
            return Ok(new
            {
                status = StatusCodes.Status200OK,
                message = "Delete all bachelor successfully!"
            });
        }

        [HttpPut("ResetStatus")]
        public async Task<IActionResult> ResetStatusAsync()
        {
            await _bachService.ResetStatusAsync();
            return Ok(new
            {
                status = StatusCodes.Status200OK,
                message = "Reset all status checkin successfully!"
            });
        }

        //get bachelor by hall name and session number
        [HttpGet("GetByHallSession/{hallId}/{sessionId}")]
        public async Task<IActionResult> GetBachelorByHallSessionAsync([FromRoute] int hallId, [FromRoute] int sessionId)
        {
            var result = await _bachService.GetBachelorByHallSessionAsync(hallId, sessionId);
            return Ok(new
            {
                status = StatusCodes.Status200OK,
                message = "Get all bachelors successfully!",
                data = result
            });
        }
    }
}
