namespace Rednest.Infrastructure.Services;

public class ReviewModerationService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<ReviewModerationService> _logger;

    private const int PollIntervalSeconds = 60;
    private const int DelayBetweenRequestsMs = 60000;

    private static readonly string Model = Environment.GetEnvironmentVariable("REVIEW_AI_MODEL") ?? "gemma-4-31b-it";
    private static readonly string BaseUrl = "https://generativelanguage.googleapis.com/v1beta/models";

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

        _logger.LogInformation("ReviewModerationService started with model {Model}.", Model);

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

        var pendingReviews = await db.Reviews
            .Where(r => r.Status.Status == ReviewStatus.Pending)
            .OrderBy(r => r.CreatedAt)
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

                var parsedLang = ParseDetectedLanguage(detectedLanguage);
                review.Language = parsedLang;

                review.Status.Status = isClean ? ReviewStatus.Published : ReviewStatus.Verification;
                review.Status.UpdatedAt = GetBakuTime();

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

    private static ReviewLanguage? ParseDetectedLanguage(string? lang)
    {
        if (string.IsNullOrWhiteSpace(lang)) return null;

        var lower = lang.Trim().ToLowerInvariant();

        if (lower.Contains("azer") || lower.Contains("azər") || lower.Contains("az") || lower.Contains("turk") || lower.Contains("türk"))
        {
            return ReviewLanguage.Azerbaijani;
        }
        if (lower.Contains("rus") || lower.Contains("ru"))
        {
            return ReviewLanguage.Russian;
        }
        if (lower.Contains("eng") || lower.Contains("en"))
        {
            return ReviewLanguage.English;
        }

        return null;
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
               - Azerbaijani (both Latin script with special characters like 'ç, ə, ğ, ı, ö, ş, ü' AND standard ASCII/English keyboard transliteration like 'cox gozel', 'ela', 'dadlidir', 'qeseng', 'beyendim', 'pisdir', 'gec catdi', etc.) MUST ALWAYS be classified as "Azerbaijani", and hasWrongLanguage MUST be false.
               - Russian (Cyrillic like 'Очень вкусно', 'Все отлично', 'Хуйня полная', etc.) MUST ALWAYS be classified as "Russian", and hasWrongLanguage MUST be false.
               - English ('Great food', 'Very nice', etc.) MUST ALWAYS be classified as "English", and hasWrongLanguage MUST be false.
               - If the text is in any other language (e.g. French, German, Spanish, Arabic, etc.), set detectedLanguage to that language name and set hasWrongLanguage to true.

            2. Offensive Content Check:
               - Detect profanity, curses, swear words, insults, hate speech, vulgarities, and offensive slang in any language (especially Azerbaijani, Russian, English).
               - Notice: Azerbaijani profanities, vulgar slang (e.g. words like "pox", "səfeh", "sefeh", "qələt", "qelet", "it", "it oğlu", "peysər", "peyser", "sik", "am", "göt", "got", "siktir", etc.) MUST be marked as hasOffensiveContent = true.
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
                maxOutputTokens = 2048,
                responseMimeType = "application/json"
            }
        };

        var json = JsonSerializer.Serialize(requestBody);
        var url = $"{BaseUrl}/{Model}:generateContent";

        var httpClient = _httpClientFactory.CreateClient();
        using var requestMessage = new HttpRequestMessage(HttpMethod.Post, url);
        requestMessage.Headers.Add("X-goog-api-key", apiKey);
        requestMessage.Content = new StringContent(json, Encoding.UTF8, "application/json");

        using var response = await httpClient.SendAsync(requestMessage, stoppingToken);
        var responseBody = await response.Content.ReadAsStringAsync(stoppingToken);

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("AI API error for review {ReviewId}: {Status} - {Body}",
                review.Id, response.StatusCode, responseBody);
            return (false, "Unknown");
        }

        return ParseResponse(responseBody, review.Id);
    }

    private (bool IsClean, string DetectedLanguage) ParseResponse(string responseBody, Guid reviewId)
    {
        try
        {
            using var doc = JsonDocument.Parse(responseBody);
            var candidates = doc.RootElement.GetProperty("candidates");
            var firstCandidate = candidates[0];
            var parts = firstCandidate.GetProperty("content").GetProperty("parts");

            string text = string.Empty;
            foreach (var part in parts.EnumerateArray())
            {
                if (part.TryGetProperty("thought", out var isThought) && isThought.GetBoolean())
                {
                    continue;
                }
                if (part.TryGetProperty("text", out var textProp))
                {
                    text = textProp.GetString() ?? string.Empty;
                }
            }

            if (string.IsNullOrWhiteSpace(text))
            {
                text = parts[0].GetProperty("text").GetString() ?? string.Empty;
            }

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
            _logger.LogWarning(ex, "Failed to parse AI response for review {ReviewId}. Body: {Body}",
                reviewId, responseBody.Length > 500 ? responseBody[..500] : responseBody);
            return (false, "Unknown");
        }
    }
}
