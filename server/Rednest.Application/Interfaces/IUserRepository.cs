using Rednest.Core.Entities;

namespace Rednest.Application.Interfaces;

public interface IUserRepository
{
    Task<User?> GetByEmailAsync(string email);
    Task<User?> GetByIdAsync(Guid id);
    Task<(User User, UserSession Session, SessionEntry Entry)?> GetByRefreshTokenAsync(string refreshToken);
    Task<UserSession?> GetSessionByUserIdAsync(Guid userId);
    Task AddAsync(User user);
    Task UpdateAsync(User user);
    Task AddSessionAsync(UserSession session);
    Task UpdateSessionAsync(UserSession session);
    Task<UserPromo?> GetUserPromoAsync(Guid userId);
    Task<UserPromo?> GetActiveUserPromoAsync(Guid userId);
    Task<List<UserPromo>> GetAllUserPromosAsync(Guid userId);
    Task AddUserPromoAsync(UserPromo promo);
    Task UpdateUserPromoAsync(UserPromo promo);
    Task<UserBasket?> GetBasketByUserIdAsync(Guid userId);
    Task AddBasketAsync(UserBasket basket);
    Task UpdateBasketAsync(UserBasket basket);
}
