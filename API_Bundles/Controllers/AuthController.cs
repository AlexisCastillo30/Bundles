﻿using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly APS _aps;

    public AuthController(APS aps)
    {
        _aps = aps;
    }

    public static async Task<Tokens> PrepareTokens(HttpRequest request, HttpResponse response, APS aps)
    {
        if (!request.Cookies.ContainsKey("internal_token"))
        {
            return null;
        }
        var tokens = new Tokens
        {
            PublicToken = request.Cookies["public_token"],
            InternalToken = request.Cookies["internal_token"],
            RefreshToken = request.Cookies["refresh_token"],
            ExpiresAt = DateTime.Parse(request.Cookies["expires_at"])
        };
        if (tokens.ExpiresAt < DateTime.Now.ToUniversalTime())
        {
            tokens = await aps.RefreshTokens(tokens);
            response.Cookies.Append("public_token", tokens.PublicToken);
            response.Cookies.Append("internal_token", tokens.InternalToken);
            response.Cookies.Append("refresh_token", tokens.RefreshToken);
            response.Cookies.Append("expires_at", tokens.ExpiresAt.ToString());
        }
        return tokens;
    }

    [HttpGet("login")]
    public ActionResult Login()
    {
        var redirectUri = _aps.GetAuthorizationURL();
        return Redirect(redirectUri);
    }

    [HttpGet("logout")]
    public ActionResult Logout()
    {
        Response.Cookies.Delete("public_token");
        Response.Cookies.Delete("internal_token");
        Response.Cookies.Delete("refresh_token");
        Response.Cookies.Delete("expires_at");
        return Redirect("/");
    }

    [HttpGet("callback")]
    public async Task<ActionResult> Callback(string code)
    {
        var tokens = await _aps.GenerateTokens(code);
        Response.Cookies.Append("public_token", tokens.PublicToken);
        Response.Cookies.Append("internal_token", tokens.InternalToken);
        Response.Cookies.Append("refresh_token", tokens.RefreshToken);
        Response.Cookies.Append("expires_at", tokens.ExpiresAt.ToString());
        return Redirect("/");
    }

    [HttpGet("profile")]
    public async Task<ActionResult> GetProfile()
    {
        var tokens = await PrepareTokens(Request, Response, _aps);
        if (tokens == null)
        {
            return Unauthorized();
        }
        var profile = await _aps.GetUserProfile(tokens);
        return Ok(new { name = profile.Name });
    }

    [HttpGet("token")]
    public async Task<ActionResult> GetPublicToken()
    {
        var tokens = await PrepareTokens(Request, Response, _aps);
        if (tokens == null)
        {
            return Unauthorized();
        }
        var expiresIn = Math.Floor((tokens.ExpiresAt - DateTime.Now.ToUniversalTime()).TotalSeconds);
        return Ok(new { access_token = tokens.PublicToken, expires_in = expiresIn });
    }
}