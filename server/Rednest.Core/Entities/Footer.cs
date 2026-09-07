namespace Rednest.Core.Entities;

public class FooterSocialMedia
{
    public string Instagram { get; set; } = string.Empty;
    public string TikTok { get; set; } = string.Empty;
    public string WhatsApp { get; set; } = string.Empty;
}

public class FooterQuickLink
{
    public string Title { get; set; } = string.Empty;
    public string Link { get; set; } = string.Empty;
}

public class FooterContactUs
{
    public string Address { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
}

public class FooterLanguageContent
{
    public string Description { get; set; } = string.Empty;
    public string QuickLinksTitle { get; set; } = "Quick Links";
    public string ContactUsTitle { get; set; } = "Contact Us";
    public string TermsOfUseTitle { get; set; } = "Terms of Use";
    public string CopyrightText { get; set; } = "All rights reserved.";
    public FooterSocialMedia SocialMedia { get; set; } = new();
    public List<FooterQuickLink> QuickLinks { get; set; } = new();
    public FooterContactUs ContactUs { get; set; } = new();
}

public class Footer
{
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow.AddHours(4);
    public FooterLanguageContent FooterEN { get; set; } = new();
    public FooterLanguageContent FooterRU { get; set; } = new();
    public FooterLanguageContent FooterAZ { get; set; } = new();
}
