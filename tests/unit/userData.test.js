const userDataMiddleware = require('../../middleware/userData');

describe('Testy jednostkowe - Middleware userData', () => {
    
    let req, res, next;

    beforeEach(() => {
        // Inicjalizacja środowiska testowego i mocków
        req = {
            session: {}
        };
        res = {
            locals: {}
        };
        next = jest.fn();
    });

    test('powinno ustawić domyślne wartości dla niezalogowanego gościa (bez pytania bazy)', async () => {
        // Inicjalizacja pustego mocka warstwy danych
        const mockKnex = jest.fn(); 
        
        const middleware = userDataMiddleware(mockKnex);
        await middleware(req, res, next);

        expect(res.locals.isAuthenticated).toBe(false);
        expect(res.locals.userRole).toBe('user');
        expect(res.locals.cartTotal).toBe('0.00');
        expect(res.locals.cartCount).toBe(0);
        
        expect(mockKnex).not.toHaveBeenCalled();
        expect(next).toHaveBeenCalledTimes(1);
    });

    test('powinno pobrać dane z bazy i policzyć koszyk dla zalogowanego', async () => {
        req.session.userId = 1;
        req.session.username = 'Jan';
        req.session.role = 'admin';

        // Definicja mockowanego zestawu danych
        const mockCartItems = [
            { format: 'digital', digital_price: '15.00', physical_price: '30.00', quantity: 2 },
            { format: 'physical', digital_price: '10.00', physical_price: '25.00', quantity: 1 } 
        ];

        // Implementacja łańcuchowego mocka zapytań do bazy
        const mockKnex = jest.fn().mockReturnValue({
            select: jest.fn().mockReturnThis(),
            join: jest.fn().mockReturnThis(),
            where: jest.fn().mockResolvedValue(mockCartItems) 
        });

        const middleware = userDataMiddleware(mockKnex);
        await middleware(req, res, next);

        expect(res.locals.isAuthenticated).toBe(true);
        expect(res.locals.isAdmin).toBe(true);
        expect(res.locals.username).toBe('Jan');
        
        expect(res.locals.cartCount).toBe(3);
        expect(res.locals.cartTotal).toBe('55.00'); 
        
        expect(mockKnex).toHaveBeenCalled();
        expect(next).toHaveBeenCalledTimes(1);
    });

    test('powinno złapać błąd bazy danych (catch) i mimo to przepuścić dalej', async () => {
        req.session.userId = 1;

        // Symulacja błędu warstwy danych (Database Exception)
        const mockKnex = jest.fn().mockReturnValue({
            select: jest.fn().mockReturnThis(),
            join: jest.fn().mockReturnThis(),
            where: jest.fn().mockRejectedValue(new Error('Awaria bazy danych!'))
        });

        // Izolacja strumienia błędów konsoli
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        const middleware = userDataMiddleware(mockKnex);
        await middleware(req, res, next);

        expect(res.locals.cartCount).toBe(0);
        expect(next).toHaveBeenCalledTimes(1);
        expect(consoleSpy).toHaveBeenCalled();

        // Przywrócenie oryginalnego strumienia konsoli
        consoleSpy.mockRestore(); 
    });
});