const userAuth = require('../../middleware/userAuth');
const adminAuth = require('../../middleware/adminAuth');

describe('Testy jednostkowe - Middleware (Ochrona tras)', () => {
    
    let req, res, next;

    beforeEach(() => {
        // Inicjalizacja środowiska testowego i mocków obiektów Express.js
        req = {
            session: {}
        };
        res = {
            redirect: jest.fn(),
            status: jest.fn().mockReturnThis(),
            send: jest.fn()
        };
        next = jest.fn();
    });

    describe('userAuth middleware', () => {
        
        test('powinno przepuścić zalogowanego użytkownika (wywołać next)', () => {
            req.session.userId = 1; 
            
            userAuth(req, res, next);
            
            expect(next).toHaveBeenCalledTimes(1);
            expect(res.redirect).not.toHaveBeenCalled();
        });

        test('powinno zablokować gościa i przekierować na /login', () => {
            userAuth(req, res, next);
            
            expect(next).not.toHaveBeenCalled();
            expect(res.redirect).toHaveBeenCalledWith('/login');
        });
    });

    describe('adminAuth middleware', () => {
        
        test('powinno przepuścić użytkownika z id i rolą "admin"', () => {
            req.session.userId = 99; 
            req.session.role = 'admin';
            
            adminAuth(req, res, next);
            
            expect(next).toHaveBeenCalledTimes(1);
            expect(res.redirect).not.toHaveBeenCalled();
        });

        test('powinno zablokować zwykłego użytkownika i przekierować na /', () => {
            req.session.userId = 1;
            req.session.role = 'user';
            
            adminAuth(req, res, next);
            
            expect(next).not.toHaveBeenCalled();
            expect(res.redirect).toHaveBeenCalledWith('/');
        });
        
        test('powinno zablokować niezalogowanego gościa i przekierować na /', () => {
            adminAuth(req, res, next);
            
            expect(next).not.toHaveBeenCalled();
            expect(res.redirect).toHaveBeenCalledWith('/');
        });
    });
});