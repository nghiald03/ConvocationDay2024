using FA23_Convocation2023_API.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace FA23_Convocation2023_API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class StatisticsController : ControllerBase
    {
        private readonly StatisticsService _service;
        public StatisticsController(StatisticsService service)
        {
            _service = service;
        }
        [HttpGet("active-halls-summary")]
        public async Task<IActionResult> GetActiveHallSummary()
        {
            var result = await _service.GetActiveHallSummaryAsync();
            if (result == null || !result.Any())
                return NotFound(new { message = "No active hall check-ins found." });

            return Ok(new
            {
                status = StatusCodes.Status200OK,
                message = "Get active hall successfully!",
                data = result
            });
        }

        [HttpGet("hall-overview")]
        public async Task<IActionResult> GetHallOverview()
        {
            var result = await _service.GetHallOverviewAsync();
            if (result == null || !result.Any())
                return NotFound(new { message = "No hall data found." });

            return Ok(new
            {
                status = StatusCodes.Status200OK,
                message = "Get hall sumary successfully!",
                data = result
            });
        }
    }
}
