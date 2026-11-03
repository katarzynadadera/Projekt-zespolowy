const request = require('supertest');
const app = require('../../app');
const knex = require('knex')(require('../../knexfile').test);

describe('Testy integracyjne - Panel Administratora (admin.js)', () => {
    
    const adminAgent = request.agent(app);
    let adminId;
    let normalUserId;
    let userToDeleteId; 
    let testCategoryId;
    let testBookId;
    let testOrderId;
    let tempBookId; 

    beforeAll(async () => {
        // Czyszczenie stanu bazy przed testami
        await knex('categories').where('name', 'Admin Kategoria').del();
        await knex('users').whereIn('email', ['admin_test@ksiegarnia.pl', 'zwykly@ksiegarnia.pl', 'delete@ksiegarnia.pl']).del();
        
        const bcrypt = require('bcryptjs');
        const hash = await bcrypt.hash('AdminHaslo123!', 10);
        
        // Inicjalizacja konta administratora
        const [admin] = await knex('users').insert({
            username: 'SzefAdmin', email: 'admin_test@ksiegarnia.pl', password_hash: hash, role: 'admin'
        }).returning('id');
        adminId = typeof admin === 'object' ? admin.id : admin;

        // Inicjalizacja konta użytkownika 
        const [normalUser] = await knex('users').insert({
            username: 'ZwyklyUser', email: 'zwykly@ksiegarnia.pl', password_hash: hash, role: 'user'
        }).returning('id');
        normalUserId = typeof normalUser === 'object' ? normalUser.id : normalUser;

        // Inicjalizacja użytkownika do testów funkcjonalności usuwania
        const [userToDelete] = await knex('users').insert({
            username: 'DoUsuniecia', email: 'delete@ksiegarnia.pl', password_hash: hash, role: 'user'
        }).returning('id');
        userToDeleteId = typeof userToDelete === 'object' ? userToDelete.id : userToDelete;

        // Autoryzacja sesji administratora
        await adminAgent.post('/login').send({
            email: 'admin_test@ksiegarnia.pl', password: 'AdminHaslo123!'
        });

        // Inicjalizacja testowej kategorii
        const [cat] = await knex('categories').insert({ name: 'Admin Kategoria' }).returning('id');
        testCategoryId = typeof cat === 'object' ? cat.id : cat;

        // Inicjalizacja książki pomocniczej
        const [tBook] = await knex('books').insert({ 
            title: 'Do Zamowienia', 
            is_physical_available: true,
            isbn: '1111111111' 
        }).returning('id');
        tempBookId = typeof tBook === 'object' ? tBook.id : tBook;

        // Wstrzyknięcie testowego zamówienia
        const [order] = await knex('orders').insert({
            user_id: normalUserId, 
            book_id: tempBookId, 
            status: 'new', 
            total_price: '50.00',
            email: 'zwykly@ksiegarnia.pl',
            first_name: 'Jan',
            last_name: 'Zwykly',
            street: 'Polna',
            house_number: '12',
            city: 'Warszawa',
            postal_code: '00-000'
        }).returning('id');
        testOrderId = typeof order === 'object' ? order.id : order;
    });

    afterAll(async () => {
        // Sprzątanie po teście
        if (testOrderId) await knex('orders').where('id', testOrderId).del();
        if (testBookId) await knex('books').where('id', testBookId).del();
        if (tempBookId) await knex('books').where('id', tempBookId).del();
        if (testCategoryId) await knex('categories').where('id', testCategoryId).del();
        
        const usersIds = [adminId, normalUserId, userToDeleteId].filter(id => id);
        if (usersIds.length > 0) await knex('users').whereIn('id', usersIds).del();
        
        await knex.destroy();
    });

    describe('Widoki i Listy (GET)', () => {
        test('powinno wyświetlić dashboard admina', async () => {
            const res = await adminAgent.get('/admin/');
            expect(res.statusCode).toBe(200);
        });

        test('powinno wyświetlić listę książek', async () => {
            const res = await adminAgent.get('/admin/books');
            expect(res.statusCode).toBe(200);
        });

        test('powinno wyświetlić formularz dodawania książki', async () => {
            const res = await adminAgent.get('/admin/books/add');
            expect(res.statusCode).toBe(200);
        });

        test('powinno wyświetlić listę zamówień', async () => {
            const res = await adminAgent.get('/admin/orders');
            expect(res.statusCode).toBe(200);
        });

        test('powinno wyświetlić listę użytkowników', async () => {
            const res = await adminAgent.get('/admin/users');
            expect(res.statusCode).toBe(200);
        });
    });

    describe('Zarządzanie Książkami (POST / GET)', () => {
        
        test('powinno wywołać błąd (catch) przy dodawaniu książki (brak wymaganych pól)', async () => {
            const res = await adminAgent.post('/admin/books/add').send({}); 
            expect(res.statusCode).toBe(200);
            expect(res.text).toContain('Błąd dodawania książki');
        });

        test('powinno dodać nową książkę i stworzyć nowego autora', async () => {
            const res = await adminAgent.post('/admin/books/add').send({
                title: 'Książka Admina',
                author_name: 'Nowy Pisarz',
                category_id: testCategoryId,
                isbn: '1234567890',
                is_physical_available: 'on',
                physical_price: '40.00',
                physical_stock: '10'
            });

            expect(res.statusCode).toBe(302);
            const book = await knex('books').where('isbn', '1234567890').first(); 
            testBookId = book.id; 
        });

        test('powinno dodać nową książkę dla ISTNIEJĄCEGO autora (pokrycie bloku if (author))', async () => {
            const res = await adminAgent.post('/admin/books/add').send({
                title: 'Kolejna Książka Znajomego',
                author_name: 'Nowy Pisarz', 
                category_id: testCategoryId,
                isbn: '0987654321'
            });
            expect(res.statusCode).toBe(302);
            await knex('books').where('isbn', '0987654321').del(); 
        });

        test('powinno przekierować przy próbie edycji NIEISTNIEJĄCEJ książki', async () => {
            const res = await adminAgent.get('/admin/books/edit/999999');
            expect(res.statusCode).toBe(302);
            expect(res.header.location).toBe('/admin/books');
        });

        test('powinno złapać błąd bazy (catch) przy GET edycji książki (złe ID)', async () => {
            const res = await adminAgent.get('/admin/books/edit/złe-id');
            expect(res.statusCode).toBe(302);
        });

        test('powinno wyświetlić formularz edycji dodanej książki', async () => {
            const res = await adminAgent.get(`/admin/books/edit/${testBookId}`);
            expect(res.statusCode).toBe(200);
        });

        test('powinno wywołać błąd (catch) przy edycji książki (złe ID do bazy)', async () => {
            const res = await adminAgent.post('/admin/books/edit/złe-id').send({ title: 'Test' });
            expect(res.statusCode).toBe(302);
            expect(res.header.location).toContain('error=true'); 
        });

        test('powinno pomyślnie zedytować książkę', async () => {
            const res = await adminAgent.post(`/admin/books/edit/${testBookId}`).send({
                title: 'Zmieniony Tytuł',
                author_name: 'Inny Pisarz', 
                category_id: testCategoryId,
                is_physical_available: 'on',
                physical_price: '55.00'
            });

            expect(res.statusCode).toBe(302);
        });

        test('powinno ukryć książkę (hide) i obsłużyć błąd', async () => {
            await adminAgent.post('/admin/books/hide/złe-id'); 
            const res = await adminAgent.post(`/admin/books/hide/${testBookId}`); 
            expect(res.statusCode).toBe(302);
        });

        test('powinno zignorować przywrócenie nieistniejącej książki', async () => {
            const res = await adminAgent.post('/admin/books/restore/999999');
            expect(res.statusCode).toBe(302);
        });

        test('powinno przywrócić ukrytą książkę (restore) i obsłużyć błąd', async () => {
            await adminAgent.post('/admin/books/restore/złe-id'); 
            const res = await adminAgent.post(`/admin/books/restore/${testBookId}`); 
            expect(res.statusCode).toBe(302);
        });

        test('powinno usunąć książkę (delete) i obsłużyć błąd', async () => {
            await adminAgent.post('/admin/books/delete/złe-id'); 
            const res = await adminAgent.post(`/admin/books/delete/${testBookId}`); 
            expect(res.statusCode).toBe(302);
            testBookId = null; 
        });
    });

    describe('Zarządzanie Zamówieniami', () => {
        test('powinno zmienić status zamówienia i obsłużyć błąd bazy', async () => {
            await adminAgent.post('/admin/orders/status/złe-id').send({ status: 'shipped' }); 
            
            const res = await adminAgent.post(`/admin/orders/status/${testOrderId}`).send({
                status: 'shipped'
            });
            expect(res.statusCode).toBe(302);
        });
    });

    describe('Zarządzanie Użytkownikami', () => {
        
        test('powinno przekierować przy edycji nieistniejącego użytkownika i obsłużyć błąd GET', async () => {
            await adminAgent.get('/admin/users/edit/złe-id'); 
            const res = await adminAgent.get('/admin/users/edit/999999'); 
            expect(res.statusCode).toBe(302);
            expect(res.header.location).toBe('/admin/users');
        });

        test('powinno wyświetlić formularz edycji użytkownika', async () => {
            const res = await adminAgent.get(`/admin/users/edit/${normalUserId}`);
            expect(res.statusCode).toBe(200);
        });

        test('powinno zedytować dane zwykłego użytkownika', async () => {
            const res = await adminAgent.post(`/admin/users/edit/${normalUserId}`).send({
                username: 'ZwyklyUserEdytowany', email: 'zwykly@ksiegarnia.pl', first_name: 'Jan', last_name: 'Kowalski'
            });
            expect(res.statusCode).toBe(302);
        });

        test('powinno złapać błąd (catch) przy zapisie edycji (np. złe ID)', async () => {
            const res = await adminAgent.post('/admin/users/edit/złe-id').send({ username: 'Test' });
            expect(res.statusCode).toBe(200);
            expect(res.text).toContain('Błąd podczas edycji użytkownika.');
        });

        test('powinno zmienić rolę użytkownika i obsłużyć błąd', async () => {
            await adminAgent.post('/admin/users/change-role').send({ user_id: 'złe-id', role: 'admin' }); 

            const res = await adminAgent.post('/admin/users/change-role').send({
                user_id: normalUserId, role: 'admin'
            });
            expect(res.statusCode).toBe(302);
        });

        test('NIE powinno pozwolić adminowi zdjąć uprawnień samemu sobie', async () => {
            const res = await adminAgent.post('/admin/users/change-role').send({
                user_id: adminId, role: 'user'
            });
            expect(res.statusCode).toBe(302);
        });

        test('NIE powinno pozwolić adminowi usunąć samego siebie', async () => {
            const res = await adminAgent.post(`/admin/users/delete/${adminId}`);
            expect(res.statusCode).toBe(302);
        });

        test('powinno usunąć innego użytkownika i obsłużyć błąd', async () => {
            await adminAgent.post('/admin/users/delete/złe-id'); 

            const res = await adminAgent.post(`/admin/users/delete/${userToDeleteId}`);
            expect(res.statusCode).toBe(302);
        });
    });
});