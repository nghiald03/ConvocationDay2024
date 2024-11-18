using FA23_Convocation2023_API.Hubs;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

namespace FA23_Convocation2023_API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TestController : ControllerBase
    {
        private IHubContext<MessageHub> messageHub;
        public TestController(IHubContext<MessageHub> _messageHub)
        {
            messageHub = _messageHub;
        }
        [HttpPost]
        [Route("test")]
        public string Get()
        {
            List<string> test = new List<string>();
            test.Add("Hoang Thiên");
            test.Add("Đại Nghĩa");
            test.Add("Trường Thịnh");
            messageHub.Clients.All.SendAsync("SendMessage", "huhu", test);
            return "Test sent successfully to all users!";
        }

        [HttpGet]
        [Route("Connect")]
        public IActionResult Connect()
        {
            return Ok(new{
                status = StatusCodes.Status200OK,
                message = "Connect API thành công!",
                data = "OK"
            }
            );
        }
    }
}
