const request = require('supertest');
const app = require('../../app');
const knex = require('knex')(require('../../knexfile').test);

describe('Testy integracyjne - Autoryzacja (auth.js)', () => {

    const agent = request.agent(app);
    let testUserId;

    beforeAll(async () => {
        // Inicjalizacja stanu środowiska
        await knex('users').where('email', 'login@ksiegarnia.pl').del();
        await knex('users').where('email', 'nowy@ksiegarnia.pl').del(); 
        
        const bcrypt = require('bcryptjs');
        const hash = await bcrypt.hash('PoprawneHaslo123!', 10);
        
        const [user] = await knex('users').insert({
            username: 'test_login',
            email: 'login@ksiegarnia.pl',
            password_hash: hash,
            role: 'user'
        }).returning('id');
        
        testUserId = typeof user === 'object' ? user.id : user;
    });

    afterAll(async () => {
        // Operacje porządkowe
        await knex('users').whereIn('email', ['login@ksiegarnia.pl', 'nowy@ksiegarnia.pl']).del();
        await knex.destroy();
    });

    describe('GET i POST /login (Logowanie)', () => {
        test('GET /login powinno zwrócić 200', async () => {
            const response = await request(app).get('/login');
            expect(response.statusCode).toBe(200);
            expect(response.text).toContain('Zaloguj');
        });

        test('POST /login powinno odrzucić próbę bez podania danych', async () => {
            const response = await request(app).post('/login').send({});
            expect(response.statusCode).toBe(200);
            expect(response.text).toContain('Wypełnij wszystkie pola.');
        });

        test('POST /login powinno odrzucić błędne hasło lub email', async () => {
            const response = await request(app).post('/login').send({
                email: 'login@ksiegarnia.pl',
                password: 'ZleHaslo123!'
            });
            expect(response.statusCode).toBe(200);
            expect(response.text).toContain('Nieprawidłowy email lub hasło.');
        });

        test('POST /login powinno zalogować i przekierować na stronę główną', async () => {
            const response = await agent.post('/login').send({
                email: 'login@ksiegarnia.pl',
                password: 'PoprawneHaslo123!'
            });
            expect(response.statusCode).toBe(302);
            expect(response.header.location).toBe('/');
        });
    });

    describe('POST /logout (Wylogowywanie)', () => {
        test('powinno zniszczyć sesję i przekierować na stronę główną', async () => {
            const response = await agent.post('/logout');
            expect(response.statusCode).toBe(302);
            expect(response.header.location).toBe('/');
        });
    });

    describe('GET i POST /signup (Rejestracja)', () => {
        test('GET /signup powinno zwrócić 200', async () => {
            const response = await request(app).get('/signup');
            expect(response.statusCode).toBe(200);
        });

        test('POST /signup powinno odrzucić rejestrację przy braku pól', async () => {
            const response = await request(app).post('/signup').send({
                username: 'nowy'
            });
            expect(response.text).toContain('Wypełnij wszystkie pola.');
        });

        test('POST /signup powinno odrzucić, gdy hasła się nie zgadzają', async () => {
            const response = await request(app).post('/signup').send({
                username: 'nowy', email: 'nowy@ksiegarnia.pl', password: 'Haslo123!', 'confirm-password': 'InneHaslo123!'
            });
            expect(response.text).toContain('Hasła nie są identyczne.');
        });

        test('POST /signup powinno odrzucić słabe hasło (walidator)', async () => {
            const response = await request(app).post('/signup').send({
                username: 'nowy', email: 'nowy@ksiegarnia.pl', password: 'slabe', 'confirm-password': 'slabe'
            });
            expect(response.text).toContain('Hasło musi mieć co najmniej 8 znaków');
        });

        test('POST /signup powinno odrzucić zajęty email', async () => {
            const response = await request(app).post('/signup').send({
                username: 'inny_nick', email: 'login@ksiegarnia.pl', password: 'DobreHaslo123!', 'confirm-password': 'DobreHaslo123!'
            });
            expect(response.text).toContain('już istnieje');
        });

        test('POST /signup powinno pomyślnie zarejestrować użytkownika', async () => {
            const response = await request(app).post('/signup').send({
                username: 'nowy_testowy', 
                email: 'nowy@ksiegarnia.pl', 
                password: 'DobreHaslo123!', 
                'confirm-password': 'DobreHaslo123!'
            });
            
            expect(response.statusCode).toBe(302);
            expect(response.header.location).toBe('/');

            // Weryfikacja pomyślnego zapisu w warstwie danych
            const createdUser = await knex('users').where('email', 'nowy@ksiegarnia.pl').first();
            expect(createdUser).toBeDefined();
            expect(createdUser.username).toBe('nowy_testowy');
        });
    });

    describe('GET i POST /forgot-password (Odzyskiwanie hasła)', () => {
        test('GET /forgot-password powinno zwrócić 200', async () => {
            const response = await request(app).get('/forgot-password');
            expect(response.statusCode).toBe(200);
        });

        test('POST /forgot-password powinno wymagać podania emaila', async () => {
            const response = await request(app).post('/forgot-password').send({});
            expect(response.text).toContain('Podaj adres email.');
        });

        test('POST /forgot-password powinno wyświetlić komunikat sukcesu', async () => {
            const response = await request(app).post('/forgot-password').send({ email: 'test@ksiegarnia.pl' });
            expect(response.text).toContain('wysłaliśmy na niego link');
        });
    });

    describe('Zabezpieczone trasy (Middleware userAuth)', () => {
        test('powinno przekierować niezalogowanego użytkownika z /settings do /login', async () => {
            const response = await request(app).get('/settings');
            expect(response.statusCode).toBe(302);
            expect(response.header.location).toBe('/login');
        });

        test('powinno przekierować niezalogowanego użytkownika z /profile do /login', async () => {
            const response = await request(app).get('/profile');
            expect(response.statusCode).toBe(302);
            expect(response.header.location).toBe('/login');
        });
    });
});