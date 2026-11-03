const request = require('supertest');
const app = require('../../app');
const knex = require('knex')(require('../../knexfile').test);
const path = require('path');

describe('Testy integracyjne - Panel Użytkownika (user.js)', () => {
    
    // Konfiguracja agenta HTTP utrzymującego kontekst sesji
    const agent = request.agent(app);
    let testUserId;
    let digitalBookId;

    beforeAll(async () => {
        const bcrypt = require('bcryptjs');
        const hash = await bcrypt.hash('StareHaslo123!', 10);
        
        await knex('users').whereIn('email', ['test_profil@ksiegarnia.pl', 'zajety@ksiegarnia.pl']).del();
        
        const [user] = await knex('users').insert({
            username: 'test_profil',
            email: 'test_profil@ksiegarnia.pl',
            password_hash: hash,
            first_name: 'Jan',
            last_name: 'Kowalski'
        }).returning('id');
        testUserId = typeof user === 'object' ? user.id : user;

        // Inicjalizacja zasobu wymuszającego konflikt klucza unikalnego przy testowaniu edycji
        await knex('users').insert({
            username: 'inny_user',
            email: 'zajety@ksiegarnia.pl',
            password_hash: hash
        });

        // Wstrzyknięcie asortymentu cyfrowego do testów mechanizmu ochrony I/O
        const [book] = await knex('books').insert({
            title: 'Testowy Ebook',
            is_digital_available: true,
            pdf_file_url: '/files/test_ebook.pdf'
        }).returning('id');
        digitalBookId = typeof book === 'object' ? book.id : book;

        await knex('orders').insert({
            user_id: testUserId,
            book_id: digitalBookId,
            status: 'completed',
            total_price: '0.00',
            email: 'test_profil@ksiegarnia.pl',
            first_name: 'Jan',
            last_name: 'Kowalski',
            street: 'Polna',
            house_number: '1',
            city: 'Gdańsk',
            postal_code: '80-000'
        });

        await agent.post('/login').send({
            email: 'test_profil@ksiegarnia.pl',
            password: 'StareHaslo123!'
        });
    });

    afterAll(async () => {
        // Czyszczenie relacji podrzędnych dla stabilności środowiska
        await knex('addresses').where('user_id', testUserId).del();
        await knex('orders').where('user_id', testUserId).del();
        await knex('books').where('id', digitalBookId).del();
        await knex('users').whereIn('email', ['test_profil@ksiegarnia.pl', 'zajety@ksiegarnia.pl']).del();
        await knex.destroy();
    });

    describe('Trasy GET (Wyświetlanie widoków)', () => {
        test('GET /profile powinno zwrócić status 200', async () => {
            const res = await agent.get('/profile');
            expect(res.statusCode).toBe(200);
        });

        test('GET /settings powinno zwrócić status 200', async () => {
            const res = await agent.get('/settings');
            expect(res.statusCode).toBe(200);
        });

        test('GET /my-books powinno zwrócić status 200', async () => {
            const res = await agent.get('/my-books');
            expect(res.statusCode).toBe(200);
        });

        test('GET /order-history powinno zwrócić status 200', async () => {
            const res = await agent.get('/order-history?status=success');
            expect(res.statusCode).toBe(200);
        });
    });

    describe('POST /settings - Aktualizacja danych', () => {
        test('powinno odrzucić puste pola', async () => {
            const res = await agent.post('/settings').send({});
            expect(res.text).toContain('Wypełnij wszystkie wymagane pola.');
        });

        test('powinno odrzucić błędny format numeru domu', async () => {
            const res = await agent.post('/settings').send({
                username: 'nick', email: 'test@test.pl', first_name: 'A', last_name: 'B',
                street: 'Polna', house_number: 'BŁĘDNY_NUMER!@#', city: 'Gdańsk', postal_code: '80-000'
            });
            expect(res.text).toContain('Nieprawidłowy format numeru domu.');
        });

        test('powinno odrzucić błędny format kodu pocztowego', async () => {
            const res = await agent.post('/settings').send({
                username: 'nick', email: 'test@test.pl', first_name: 'A', last_name: 'B',
                street: 'Polna', house_number: '1', city: 'Gdańsk', postal_code: '80000'
            });
            expect(res.text).toContain('Nieprawidłowy format kodu pocztowego');
        });

        test('powinno obsłużyć błąd zajętego e-maila (błąd bazy 23505)', async () => {
            const res = await agent.post('/settings').send({
                username: 'nowy_nick', email: 'zajety@ksiegarnia.pl', first_name: 'Jan', last_name: 'Kowalski',
                street: 'Polna', house_number: '12', city: 'Warszawa', postal_code: '00-001'
            });
            expect(res.text).toContain('już istnieje');
        });

        test('powinno zaktualizować ISTNIEJĄCY adres (zamiast tworzyć nowy)', async () => {
            // Operacja wprowadzająca zasób z obsługą asercji w kolejnym żądaniu
            await agent.post('/settings').send({
                username: 'test_profil', email: 'test_profil@ksiegarnia.pl', first_name: 'J', last_name: 'K',
                street: 'Stara', house_number: '1', city: 'Gdańsk', postal_code: '80-000'
            });

            // Weryfikacja instrukcji warunkowej obsługującej obiekt existingAddress
            const res = await agent.post('/settings').send({
                username: 'test_profil', email: 'test_profil@ksiegarnia.pl', first_name: 'J', last_name: 'K',
                street: 'Nowa', house_number: '2', city: 'Gdynia', postal_code: '81-000'
            });
            
            expect(res.text).toContain('Dane zostały pomyślnie zaktualizowane.');
        });
    });

    describe('POST /change-password - Zmiana hasła', () => {
        test('powinno odrzucić zmianę przy braku pól', async () => {
            const res = await agent.post('/change-password').send({});
            expect(res.text).toContain('Wypełnij wszystkie pola.');
        });

        test('powinno odrzucić, jeśli obecne hasło jest złe', async () => {
            const res = await agent.post('/change-password').send({
                currentPassword: 'ZleStareHaslo!', newPassword: 'NoweSilneHaslo1!', confirmNewPassword: 'NoweSilneHaslo1!'
            });
            expect(res.text).toContain('Aktualne hasło jest nieprawidłowe.');
        });

        test('powinno pomyślnie zmienić hasło na nowe', async () => {
            const res = await agent.post('/change-password').send({
                currentPassword: 'StareHaslo123!', newPassword: 'SuperNoweHaslo1!', confirmNewPassword: 'SuperNoweHaslo1!'
            });
            expect(res.text).toContain('Hasło zostało pomyślnie zmienione.');
            
            // Przywrócenie pierwotnego stanu dla zachowania spójności kolejnych bloków
            await knex('users').where('id', testUserId).update({ password_hash: await require('bcryptjs').hash('StareHaslo123!', 10) });
        });
    });

    describe('GET /read/:bookId - Czytanie E-booka', () => {
        test('powinno zablokować dostęp do niekupionej książki (403)', async () => {
            const res = await agent.get('/read/999999'); 
            expect(res.statusCode).toBe(403);
            expect(res.text).toContain('Brak dostępu. Musisz zakupić e-booka');
        });

        test('powinno obsłużyć błąd 404, jeśli plik fizycznie nie istnieje na serwerze', async () => {
            // Weryfikacja błędu strumienia I/O (symulacja braku dokumentu .pdf)
            const res = await agent.get(`/read/${digitalBookId}`);
            expect(res.statusCode).toBe(404);
        });
    });
});