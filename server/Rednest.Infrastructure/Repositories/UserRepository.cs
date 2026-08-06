using Microsoft.EntityFrameworkCore;
using Rednest.Application.Interfaces;
using Rednest.Core.Entities;
using Rednest.Infrastructure.Data;

namespace Rednest.Infrastructure.Repositories;

public class UserRepository : IUserRepository
{
    private readonly AppDbContext _context;

    public UserRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<User?> GetByEmailAsync(string email)
    {
        return await _context.Users
            .Include(u => u.Session)
            .FirstOrDefaultAsync(u => u.Email == email);
    }

    public async Task<User?> GetByIdAsync(Guid id)
    {
        return await _context.Users
            .Include(u => u.Session)
            .FirstOrDefaultAsync(u => u.Id == id);
    }

    public async Task<(User User, UserSession Session, SessionEntry Entry)?> GetByRefreshTokenAsync(string refreshToken)
    {
        var sessions = await _context.UserSessions
            .Include(s => s.User)
            .Where(s => s.Sessions != null && s.Sessions.Count > 0)
            .ToListAsync();

        foreach (var session in sessions)
        {
            var entry = session.Sessions.FirstOrDefault(e => e.RefreshToken == refreshToken);
            if (entry != null)
            {
                return (session.User, session, entry);
            }
        }

        return null;
    }

    public async Task<UserSession?> GetSessionByUserIdAsync(Guid userId)
    {
        return await _context.UserSessions
            .FirstOrDefaultAsync(s => s.UserId == userId);
    }

    public async Task AddAsync(User user)
    {
        await _context.Users.AddAsync(user);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(User user)
    {
        _context.Users.Update(user);
        await _context.SaveChangesAsync();
    }

    public async Task AddSessionAsync(UserSession session)
    {
        await _context.UserSessions.AddAsync(session);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateSessionAsync(UserSession session)
    {
        _context.UserSessions.Update(session);
        await _context.SaveChangesAsync();
    }

    public async Task<UserPromo?> GetUserPromoAsync(Guid userId)
    {
        return await _context.UserPromos
            .FirstOrDefaultAsync(p => p.UserId == userId);
    }

    public async Task AddUserPromoAsync(UserPromo promo)
    {
        await _context.UserPromos.AddAsync(promo);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateUserPromoAsync(UserPromo promo)
    {
        _context.UserPromos.Update(promo);
        await _context.SaveChangesAsync();
    }
}
