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
            var result = await _sessionService.CreateSession(sessionRequest.SessionNum, sessionRequest.Description, sessionRequest.SessionInDay);
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
        public async Task<IActionResult> UpdateStatusSessionAsync([FromRoute] int sessionId, [FromBody] UpdateSessionRequest updateRequest)
        {
            var result = await _sessionService.UpdateSessionAsync(sessionId, updateRequest.SessionNum, updateRequest.Description, updateRequest.SessionInDay);
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

        [HttpPost("AutoFillSessionInDay")] // Auto fill sessionInDay for a range of sessions
        public async Task<IActionResult> AutoFillSessionInDayAsync([FromBody] AutoFillSessionInDayRequest request)
        {
            if (request.FromSession > request.ToSession)
            {
                return BadRequest(new
                {
                    status = StatusCodes.Status400BadRequest,
                    message = "FromSession must be less than or equal to ToSession!"
                });
            }

            var result = await _sessionService.AutoFillSessionInDayAsync(request.FromSession, request.ToSession);

            if (!result)
            {
                return BadRequest(new
                {
                    status = StatusCodes.Status400BadRequest,
                    message = "No sessions found in the specified range or auto-fill failed!"
                });
            }

            return Ok(new
            {
                status = StatusCodes.Status200OK,
                message = $"Auto-filled sessionInDay for sessions {request.FromSession} to {request.ToSession} successfully!",
                data = new { fromSession = request.FromSession, toSession = request.ToSession }
            });
        }

    }
}
