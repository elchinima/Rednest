namespace Rednest.Application.Interfaces;

public interface IPaymentEncryptionService
{
    string Encrypt(string plainText);
    string Decrypt(string cipherText);
}
