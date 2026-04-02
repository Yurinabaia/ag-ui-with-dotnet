using Microsoft.Agents.AI;
using Microsoft.Agents.AI.Hosting.AGUI.AspNetCore;
using Microsoft.Extensions.AI;
using OpenAI;
using OpenAI.Chat;
using System.ClientModel;
namespace Agent_Framework;

public class Program
{
    public static async Task Main(string[] args)
    {
        WebApplicationBuilder builder = WebApplication.CreateBuilder(args);

        builder.Services.AddHttpClient().AddLogging();

        builder.Services.AddAGUI();

        builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
            p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));

        WebApplication app = builder.Build();

        app.UseCors();

        string proxyUrl   = app.Configuration["OPENAI_BASE_URL"]
            ?? throw new InvalidOperationException(
                "Set OPENAI_BASE_URL in appsettings or environment variables.");

        string apiKey     = app.Configuration["OPENAI_API_KEY"]
            ?? throw new InvalidOperationException(
                "Set OPENAI_API_KEY in appsettings or environment variables.");

        string deployment = app.Configuration["OPENAI_DEPLOYMENT_NAME"] ?? "gpt-4o-mini";


        var clientOptions = new OpenAIClientOptions { Endpoint = new Uri(proxyUrl) };
        ChatClient chatClient = new OpenAIClient(new ApiKeyCredential(apiKey), clientOptions)
            .GetChatClient(deployment);


        AIAgent agent = chatClient.AsIChatClient().AsAIAgent(
            name: "AGUIAssistant",
            instructions: "You are a helpful assistant.");

        app.MapGet("/", () => Results.Ok(new
        {
            protocol   = "AG-UI",
            framework  = "Microsoft Agent Framework",
            version    = "1.0.0-rc5",
            endpoint   = "/agent",
            docs       = "https://learn.microsoft.com/agent-framework/integrations/ag-ui/",
        }));

        app.MapAGUI("/agent", agent);

        await app.RunAsync();
    }
}

