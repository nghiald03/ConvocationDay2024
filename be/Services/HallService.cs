using FA23_Convocation2023_API.DTO;
using FA23_Convocation2023_API.Models;
using Microsoft.EntityFrameworkCore;

namespace FA23_Convocation2023_API.Services
{
    public class HallService
    {
        private readonly Convo24Context _context;

        public HallService(Convo24Context context)
        {
            _context = context;
        }

        //check if hall is existed
        public Task<bool> HallExist(string HallName)
        {
            return _context.Halls.AnyAsync(h => h.HallName == HallName);
        }

        //create new hall
        public async Task<Hall> CreateHall(string HallName) 
        {
            var hall = new Hall
            {
                HallName = HallName
            };
            await _context.Halls.AddAsync(hall);
            await _context.SaveChangesAsync();
            return hall;
        }

        //get list hall
        public async Task<List<ListHall>> GetAllHallAsync()
        {
            var halls = await _context.Halls.ToListAsync();
            var listHall = new List<ListHall>();
            foreach (var hall in halls) {
                listHall.Add(new ListHall
                {
                    HallId = hall.HallId,
                    HallName = hall.HallName
                });
            }
            return listHall;
        }
    
        public async Task<bool> UpdateHallAsync(int hallId, string hallName) {
            try {
                var existingHall = await _context.Halls.FirstOrDefaultAsync(h => h.HallId == hallId);
                if (existingHall == null) {
                    return false;
                }
                existingHall.HallName = hallName;
                _context.Halls.Update(existingHall);
                await _context.SaveChangesAsync();
                return true;
            } catch (Exception ex) {
                Console.WriteLine(ex.Message);
                return false;
            }
        }

        public async Task<bool> DeleteHallAsync(int hallId) {
            try {
                var existingHall = await _context.Halls.FirstOrDefaultAsync(h => h.HallId == hallId);
                if (existingHall == null) {
                    return false;
                }
                _context.Halls.Remove(existingHall);
                await _context.SaveChangesAsync();
                return true;
            } catch (Exception ex) {
                Console.WriteLine(ex.Message);
                return false;
            }
        }
    }

}
