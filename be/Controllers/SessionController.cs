using FA23_Convocation2023_API.DTO;
using FA23_Convocation2023_API.Models;
using FA23_Convocation2023_API.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace FA23_Convocation2023_API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SessionController : ControllerBase
    {
        private readonly SessionService _sessionService;

        public SessionController(SessionService sessionService)
        {
            _sessionService = sessionService;
        }


        //Create a new session
        [HttpPost("CreateSession")]
        public async Task<IActionResult> CreateSessionAsync([FromBody]CreateSessionRequest sessionRequest)
        { 
            var sessionExist = _sessionService.SessionExist(sessionRequest.SessionNum);
            if (sessionExist.Result) {
                return BadRequest(new
                {
                    status = StatusCodes.Status400BadRequest,
                    message = "Session already exists!"
                });
            }
            var result = await _sessionService.CreateSession(sessionRequest.SessionNum);
            return Ok(new
            {
                status = StatusCodes.Status200OK,
                message = "Create session check in successfully!",
                data = result
            });
        }
        //get list session
        [HttpGet("GetAll")]
        public async Task<IActionResult> GetAllSessionAsync()
        {
            var result = await _sessionService.GetAllSessionAsync();
            if (result.Count == 0) return Ok(new
            {
                status = StatusCodes.Status204NoContent,
                message = "Not any sessions!"
            });
            return Ok(new
            {
                status = StatusCodes.Status200OK,
                message = "Get all sessions successfully!",
                data = result
            });
        }

        [HttpPut("UpdateStatusSession/{sessionId}")] // Update status session
        public async Task<IActionResult> UpdateStatusSessionAsync([FromRoute] int sessionId, [FromBody] int sessionNum)
        {
            var result = await _sessionService.UpdateSessionAsync(sessionId, sessionNum);
            return Ok(new
            {
                status = StatusCodes.Status200OK,
                message = "Update status session successfully!",
                data = result
            });
        }

        [HttpDelete("DeleteSession/{sessionId}")] // Delete session
        public async Task<IActionResult> DeleteSessionAsync([FromRoute] int sessionId)
        {
            var result = await _sessionService.DeleteSessionAsync(sessionId);
            return Ok(new
            {
                status = StatusCodes.Status200OK,
                message = "Delete session successfully!",
                data = result
            });
        }

    }
}
