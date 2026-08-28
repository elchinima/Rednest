namespace Rednest.Infrastructure.Services;

public class PaymentEncryptionService : IPaymentEncryptionService
{
    private readonly byte[] _key;
    private const string EncryptedPrefix = "enc:v1:";

    public PaymentEncryptionService()
    {
        var keyStr = Environment.GetEnvironmentVariable("PAYMENT_ENCRYPTION_KEY");
        if (string.IsNullOrWhiteSpace(keyStr))
        {
            throw new InvalidOperationException("PAYMENT_ENCRYPTION_KEY environment variable is not configured.");
        }

        _key = SHA256.HashData(Encoding.UTF8.GetBytes(keyStr.Trim()));
    }

    public string Encrypt(string plainText)
    {
        if (string.IsNullOrEmpty(plainText))
            return string.Empty;

        var plainBytes = Encoding.UTF8.GetBytes(plainText);
        var nonce = new byte[AesGcm.NonceByteSizes.MaxSize];
        RandomNumberGenerator.Fill(nonce);

        var cipherBytes = new byte[plainBytes.Length];
        var tag = new byte[AesGcm.TagByteSizes.MaxSize];

        using var aesGcm = new AesGcm(_key, AesGcm.TagByteSizes.MaxSize);
        aesGcm.Encrypt(nonce, plainBytes, cipherBytes, tag);

        var combined = new byte[nonce.Length + tag.Length + cipherBytes.Length];
        Buffer.BlockCopy(nonce, 0, combined, 0, nonce.Length);
        Buffer.BlockCopy(tag, 0, combined, nonce.Length, tag.Length);
        Buffer.BlockCopy(cipherBytes, 0, combined, nonce.Length + tag.Length, cipherBytes.Length);

        return EncryptedPrefix + Convert.ToBase64String(combined);
    }

    public string Decrypt(string cipherText)
    {
        if (string.IsNullOrEmpty(cipherText))
            return string.Empty;

        if (!cipherText.StartsWith(EncryptedPrefix, StringComparison.Ordinal))
        {
            return cipherText;
        }

        try
        {
            var rawBase64 = cipherText[EncryptedPrefix.Length..];
            var combined = Convert.FromBase64String(rawBase64);

            int nonceSize = AesGcm.NonceByteSizes.MaxSize;
            int tagSize = AesGcm.TagByteSizes.MaxSize;

            if (combined.Length < nonceSize + tagSize)
                return string.Empty;

            var nonce = new byte[nonceSize];
            var tag = new byte[tagSize];
            int cipherSize = combined.Length - nonceSize - tagSize;
            var cipherBytes = new byte[cipherSize];

            Buffer.BlockCopy(combined, 0, nonce, 0, nonceSize);
            Buffer.BlockCopy(combined, nonceSize, tag, 0, tagSize);
            Buffer.BlockCopy(combined, nonceSize + tagSize, cipherBytes, 0, cipherSize);

            var plainBytes = new byte[cipherSize];
            using var aesGcm = new AesGcm(_key, tagSize);
            aesGcm.Decrypt(nonce, cipherBytes, tag, plainBytes);

            return Encoding.UTF8.GetString(plainBytes);
        }
        catch
        {
            return string.Empty;
        }
    }
}
