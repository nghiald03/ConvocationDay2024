

using Microsoft.AspNetCore.SignalR;

namespace FA23_Convocation2023_API.Hubs;
    public sealed class MessageHub: Hub
    {
        public override async Task OnConnectedAsync()
        {
            await Clients.All.SendAsync("ReceiveMessage", $"{Context.ConnectionId} has joined");
        }

    public async Task SendMessage(string methodName, object data)
    {
        await Clients.All.SendAsync(methodName, data);
    }
}

