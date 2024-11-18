using FA23_Convocation2023_API.DTO;
using FA23_Convocation2023_API.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace FA23_Convocation2023_API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class HallController : ControllerBase
    {
        private readonly HallService _hallService;

        public HallController(HallService hallService)
        {
            _hallService = hallService;
        }

        //Create a new hall
        [HttpPost("CreateHall")]
        public async Task<IActionResult> CreateHallAsync([FromBody]CreateHallRequest hallRequest)
        {
            var hallExist = await _hallService.HallExist(hallRequest.HallName);
            if (hallExist)
            {
                return BadRequest(new
                {
                    status = StatusCodes.Status400BadRequest,
                    message = "Hall already exists!"
                });
            }
            
            var result = await _hallService.CreateHall(hallRequest.HallName);
            return Ok(new
            {
                status = StatusCodes.Status200OK,
                message = "Create hall successfully!",
                data = result
            });
        }

        //get list hall
        [HttpGet("GetAll")]
        public async Task<IActionResult> GetAllHallAsync()
        {
            var result = await _hallService.GetAllHallAsync();
            if (result.Count == 0) return Ok(new
            {
                status = StatusCodes.Status204NoContent,
                message = "Not any halls!"
            });
            return Ok(new
            {
                status = StatusCodes.Status200OK,
                message = "Get all halls successfully!",
                data = result
            });
        }

        [HttpPut("UpdateHall/{hallId}")] // Update hall
        public async Task<IActionResult> UpdateHallAsync([FromRoute] int hallId, [FromBody] string hallName)
        {
            var result = await _hallService.UpdateHallAsync(hallId, hallName);
            if (!result) return BadRequest(new
            {
                status = StatusCodes.Status400BadRequest,
                message = "Update failed!"
            });
            return Ok(new
            {
                status = StatusCodes.Status200OK,
                message = "Update hall successfully!",
                data = result
            });
        }

        [HttpDelete("DeleteHall/{hallId}")] // Delete hall
        public async Task<IActionResult> DeleteHallAsync([FromRoute] int hallId)
        {
            var result = await _hallService.DeleteHallAsync(hallId);
            if (!result) return BadRequest(new
            {
                status = StatusCodes.Status400BadRequest,
                message = "Xóa thất bại! Hãy chắc chắn trong Hall không còn Bachelor, Checkins nào"
            });
            return Ok(new
            {
                status = StatusCodes.Status200OK,
                message = "Delete hall successfully!",
                data = result
            });
        }
    }
}
