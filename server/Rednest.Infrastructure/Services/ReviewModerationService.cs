namespace Rednest.Infrastructure.Services;

public class ReviewModerationService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<ReviewModerationService> _logger;

    private const int DailyLimit = 20;
    private const int WindowHours = 25;
    private const int PollIntervalSeconds = 60;
    private const int DelayBetweenRequestsMs = 60000;

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
            .CountAsync(r => r.Status.Status != ReviewStatus.Pending && r.Status.UpdatedAt >= windowStart, stoppingToken);

        if (processedCount >= DailyLimit)
        {
            var lastModerated = await db.Reviews
                .Where(r => r.Status.Status != ReviewStatus.Pending)
                .OrderByDescending(r => r.Status.UpdatedAt)
                .Select(r => r.Status.UpdatedAt)
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
            .Where(r => r.Status.Status == ReviewStatus.Pending)
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
                var (isClean, detectedLanguage) = await ModerateReviewAsync(apiKey, review, stoppingToken);

                if (Enum.TryParse<ReviewLanguage>(detectedLanguage, true, out var parsedLang))
                {
                    review.Language = parsedLang;
                }
                else if (detectedLanguage.Equals("Azeri", StringComparison.OrdinalIgnoreCase))
                {
                    review.Language = ReviewLanguage.Azerbaijani;
                }

                review.Status = new ReviewStatusInfo
                {
                    Status = isClean ? ReviewStatus.Published : ReviewStatus.Verification,
                    UpdatedAt = GetBakuTime()
                };

                await db.SaveChangesAsync(stoppingToken);

                _logger.LogInformation(
                    "Review {ReviewId} moderated: Language={Language}, IsClean={IsClean}, Status={Status}",
                    review.Id, review.Language, isClean, review.Status.Status);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to moderate review {ReviewId}.", review.Id);
            }

            await Task.Delay(DelayBetweenRequestsMs, stoppingToken);
        }
    }

    private async Task<(bool IsClean, string DetectedLanguage)> ModerateReviewAsync(
        string apiKey,
        Review review,
        CancellationToken stoppingToken)
    {
        var comment = review.ReviewData.Comment;

        var prompt = $$"""
            You are an AI content moderation and language detection assistant.
            Analyze the following user review text for a restaurant/coffee ordering service:

            Review text: "{{comment}}"

            Your instructions:
            1. Language Detection:
               - Automatically detect the primary language of the text.
               - Allowed valid languages are: "Russian", "English", "Azerbaijani".
               - If the text is in Russian, set detectedLanguage to "Russian" and hasWrongLanguage to false.
               - If the text is in English, set detectedLanguage to "English" and hasWrongLanguage to false.
               - If the text is in Azerbaijani, set detectedLanguage to "Azerbaijani" and hasWrongLanguage to false.
               - If the text is in any other language or unrecognizable, set detectedLanguage to the actual language name (e.g. "Turkish", "Spanish", "Unknown") and hasWrongLanguage to true.

            2. Offensive Content Check:
               - Detect profanity, curses, swear words, insults, hate speech, vulgarities, and offensive slang in any language (especially Azerbaijani, Russian, English).
               - Notice: Azerbaijani profanities, vulgar slang (e.g. words like "pox", "səfeh", "qələt", "it", etc.) MUST be marked as hasOffensiveContent = true.
               - Set hasOffensiveContent to true if any offensive, vulgar, or insulting language is detected; otherwise false.

            3. Advertising & Links:
               - Set hasAdvertising to true if there is promotional spam or marketing; otherwise false.
               - Set hasLinks to true if there are URLs, domains, emails, phone numbers, or social media handles (@username); otherwise false.

            4. Overall Decision:
               - isClean must be true ONLY IF hasOffensiveContent is false, hasAdvertising is false, hasLinks is false, and hasWrongLanguage is false.
               - If any violation is found, isClean MUST be false.

            Respond ONLY with a valid JSON object:
            {
              "isClean": true or false,
              "hasOffensiveContent": true or false,
              "hasAdvertising": true or false,
              "hasLinks": true or false,
              "hasWrongLanguage": true or false,
              "detectedLanguage": "Russian" | "English" | "Azerbaijani" | "Other",
              "summary": "Brief explanation in English"
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
            return (false, "Unknown");
        }

        return ParseGeminiResponse(responseBody, review.Id);
    }

    private (bool IsClean, string DetectedLanguage) ParseGeminiResponse(string responseBody, Guid reviewId)
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

            var offensive = root.GetProperty("hasOffensiveContent").GetBoolean();
            var advertising = root.GetProperty("hasAdvertising").GetBoolean();
            var links = root.GetProperty("hasLinks").GetBoolean();
            var wrongLang = root.GetProperty("hasWrongLanguage").GetBoolean();
            var isCleanReported = root.GetProperty("isClean").GetBoolean();
            var isClean = isCleanReported && !offensive && !advertising && !links && !wrongLang;
            var detectedLang = root.TryGetProperty("detectedLanguage", out var lang) ? lang.GetString() ?? "Unknown" : "Unknown";

            return (isClean, detectedLang);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to parse Gemini response for review {ReviewId}. Body: {Body}",
                reviewId, responseBody.Length > 500 ? responseBody[..500] : responseBody);
            return (false, "Unknown");
        }
    }
}
