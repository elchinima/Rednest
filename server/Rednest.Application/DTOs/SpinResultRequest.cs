namespace Rednest.Application.DTOs;

public class SpinResultRequest { }

public class SpinResultResponse
{
    public int SegmentIndex { get; set; }
    public string PrizeType { get; set; } = string.Empty;
    public string PrizeName { get; set; } = string.Empty;
    public string PrizeDescription { get; set; } = string.Empty;
    public string PromoCode { get; set; } = string.Empty;
    public string BarCode { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public int CashbackPercent { get; set; }
}

public class ApplyPromoRequest
{
    public string PromoCode { get; set; } = string.Empty;
}

public class ApplyPromoResponse
{
    public bool Applied { get; set; }
    public string PrizeType { get; set; } = string.Empty;
    public string PrizeName { get; set; } = string.Empty;
    public decimal DiscountAmount { get; set; }
    public decimal OriginalTotal { get; set; }
    public decimal NewTotal { get; set; }
    public string? Message { get; set; }
}
