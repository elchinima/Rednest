namespace Rednest.Api.Attributes;

[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public class RequireSecurityVerificationAttribute : Attribute, IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var user = context.HttpContext.User;
        var userIdStr = user.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out _))
        {
            context.Result = new UnauthorizedObjectResult(new { message = "Unauthorized." });
            return;
        }

        var token = context.HttpContext.Request.Cookies[SecurityVerificationHelper.CookieName];

        if (string.IsNullOrEmpty(token) || !SecurityVerificationHelper.ValidateToken(token, userIdStr))
        {
            context.Result = new ObjectResult(new
            {
                message = "Security verification required. Please enter your account password.",
                requiresSecurityCheck = true
            })
            {
                StatusCode = StatusCodes.Status403Forbidden
            };
            return;
        }

        await next();
    }
}
