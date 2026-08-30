using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace FA23_Convocation2023_API.Security;

[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public sealed class ValidateAntiforgeryTokenAttribute : Attribute, IAsyncAuthorizationFilter
{
    public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        var antiforgery = context.HttpContext.RequestServices.GetRequiredService<IAntiforgery>();
        try
        {
            await antiforgery.ValidateRequestAsync(context.HttpContext);
        }
        catch (AntiforgeryValidationException)
        {
            context.Result = new ObjectResult(new { code = "security/invalid-csrf", message = "The request could not be verified." })
            {
                StatusCode = StatusCodes.Status400BadRequest
            };
        }
    }
}
