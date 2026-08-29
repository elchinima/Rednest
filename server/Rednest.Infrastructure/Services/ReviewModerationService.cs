namespace Rednest.Infrastructure.Services;

public class ReviewModerationService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<ReviewModerationService> _logger;

    private const int DailyLimit = 20;
    private const int WindowHours = 25;
    private const int PollIntervalSeconds = 300;
    private const int DelayBetweenRequestsMs = 3000;

    private static readonly string GeminiModel = "gemini-3.7-flash";
    private static readonly string GeminiBaseUrl = "https://generativelanguage.googleapis.com/v1beta/models";

    private static DateTime GetBakuTime() => DateTime.UtcNow.AddHours(4);

    public ReviewModerationService(
        IServiceScopeFactory scopeFactory,
        IHttpClientFactory httpClientFactory,
        ILogger<ReviewModerationService> logger)
    {
        _scopeFactory = scopeFactory;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var apiKey = Environment.GetEnvironmentVariable("REVIEW_AI_API");
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            _logger.LogWarning("REVIEW_AI_API is not configured. Review moderation service is disabled.");
            return;
        }

        _logger.LogInformation("ReviewModerationService started.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessNextBatchAsync(apiKey, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error in ReviewModerationService loop.");
            }

            await Task.Delay(TimeSpan.FromSeconds(PollIntervalSeconds), stoppingToken);
        }

        _logger.LogInformation("ReviewModerationService stopped.");
    }

    private async Task ProcessNextBatchAsync(string apiKey, CancellationToken stoppingToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var windowStart = GetBakuTime().AddHours(-WindowHours);
        var processedCount = await db.Reviews
            .CountAsync(r => r.Moderation != null && r.Moderation.ModeratedAt >= windowStart, stoppingToken);

        if (processedCount >= DailyLimit)
        {
            var lastModerated = await db.Reviews
                .Where(r => r.Moderation != null)
                .OrderByDescending(r => r.Moderation!.ModeratedAt)
                .Select(r => r.Moderation!.ModeratedAt)
                .FirstOrDefaultAsync(stoppingToken);

            if (lastModerated != default)
            {
                var nextRunAt = lastModerated.AddHours(WindowHours);
                var waitTime = nextRunAt - GetBakuTime();
                if (waitTime > TimeSpan.Zero)
                {
                    _logger.LogInformation(
                        "Daily moderation limit ({Limit}) reached. Next run scheduled at {NextRun} UTC+4.",
                        DailyLimit, nextRunAt);
                    await Task.Delay(waitTime, stoppingToken);
                }
            }
            return;
        }

        var remaining = DailyLimit - processedCount;

        var pendingReviews = await db.Reviews
            .Where(r => r.Status == ReviewStatus.Pending)
            .OrderBy(r => r.CreatedAt)
            .Take(remaining)
            .ToListAsync(stoppingToken);

        if (pendingReviews.Count == 0)
        {
            return;
        }

        _logger.LogInformation("Processing {Count} pending reviews.", pendingReviews.Count);

        foreach (var review in pendingReviews)
        {
            if (stoppingToken.IsCancellationRequested) break;

            try
            {
                var result = await ModerateReviewAsync(apiKey, review, stoppingToken);

                review.Moderation = result;
                review.Status = result.IsClean ? ReviewStatus.Published : ReviewStatus.Verification;

                await db.SaveChangesAsync(stoppingToken);

                _logger.LogInformation(
                    "Review {ReviewId} moderated: IsClean={IsClean}, Status={Status}",
                    review.Id, result.IsClean, review.Status);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to moderate review {ReviewId}.", review.Id);
            }

            await Task.Delay(DelayBetweenRequestsMs, stoppingToken);
        }
    }

    private async Task<ModerationResult> ModerateReviewAsync(
        string apiKey,
        Review review,
        CancellationToken stoppingToken)
    {
        var language = review.Language.ToString();
        var comment = review.ReviewData.Comment;

        var prompt = $$"""
            You are a content moderation assistant. Analyze the following user review and return a JSON response.

            Review text: "{{comment}}"
            User-selected language: "{{language}}"

            Check for:
            1. Offensive content (profanity, insults, hate speech) in any language
            2. Advertising or promotional content
            3. URLs, links, or social media references (@handles, domains)
            4. Language check: the review must be written in one of the allowed languages: Russian, English, or Azerbaijani. If written in a different language, flag it.

            Respond ONLY with a valid JSON object (no markdown, no explanation):
            {
              "isClean": true or false,
              "hasOffensiveContent": true or false,
              "hasAdvertising": true or false,
              "hasLinks": true or false,
              "hasWrongLanguage": true or false,
              "detectedLanguage": "detected language name in English",
              "summary": "brief explanation of findings in English"
            }
            """;

        var requestBody = new
        {
            contents = new[]
            {
                new
                {
                    parts = new[]
                    {
                        new { text = prompt }
                    }
                }
            },
            generationConfig = new
            {
                temperature = 0.1,
                maxOutputTokens = 256
            }
        };

        var json = JsonSerializer.Serialize(requestBody);
        var url = $"{GeminiBaseUrl}/{GeminiModel}:generateContent?key={apiKey}";

        var httpClient = _httpClientFactory.CreateClient();
        using var content = new StringContent(json, Encoding.UTF8, "application/json");
        using var response = await httpClient.PostAsync(url, content, stoppingToken);

        var responseBody = await response.Content.ReadAsStringAsync(stoppingToken);

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("Gemini API error for review {ReviewId}: {Status} - {Body}",
                review.Id, response.StatusCode, responseBody);
            return FallbackResult("Gemini API error");
        }

        return ParseGeminiResponse(responseBody, review.Id);
    }

    private ModerationResult ParseGeminiResponse(string responseBody, Guid reviewId)
    {
        try
        {
            using var doc = JsonDocument.Parse(responseBody);
            var candidates = doc.RootElement.GetProperty("candidates");
            var firstCandidate = candidates[0];
            var parts = firstCandidate.GetProperty("content").GetProperty("parts");
            var text = parts[0].GetProperty("text").GetString() ?? string.Empty;

            text = text.Trim();
            if (text.StartsWith("```"))
            {
                var startIdx = text.IndexOf('{');
                var endIdx = text.LastIndexOf('}');
                if (startIdx >= 0 && endIdx > startIdx)
                    text = text[startIdx..(endIdx + 1)];
            }

            using var resultDoc = JsonDocument.Parse(text);
            var root = resultDoc.RootElement;

            return new ModerationResult
            {
                IsClean = root.GetProperty("isClean").GetBoolean(),
                HasOffensiveContent = root.GetProperty("hasOffensiveContent").GetBoolean(),
                HasAdvertising = root.GetProperty("hasAdvertising").GetBoolean(),
                HasLinks = root.GetProperty("hasLinks").GetBoolean(),
                HasWrongLanguage = root.GetProperty("hasWrongLanguage").GetBoolean(),
                DetectedLanguage = root.TryGetProperty("detectedLanguage", out var lang) ? lang.GetString() ?? "" : "",
                Summary = root.TryGetProperty("summary", out var summary) ? summary.GetString() ?? "" : "",
                ModeratedAt = GetBakuTime()
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to parse Gemini response for review {ReviewId}. Body: {Body}",
                reviewId, responseBody.Length > 500 ? responseBody[..500] : responseBody);
            return FallbackResult("Parse error - manual review required");
        }
    }

    private static ModerationResult FallbackResult(string reason) => new()
    {
        IsClean = false,
        HasOffensiveContent = false,
        HasAdvertising = false,
        HasLinks = false,
        HasWrongLanguage = false,
        DetectedLanguage = "Unknown",
        Summary = reason,
        ModeratedAt = GetBakuTime()
    };
}
