const request = require('supertest');
const knex = require('knex')(require('../../knexfile').test);

const app = require('../../app');

describe('Testy integracyjne - Plik główny (app.js)', () => {

    afterAll(async () => {
        await knex.destroy();
    });

    test('GET / powinno załadować stronę główną (status 200)', async () => {
        const response = await request(app).get('/');
        expect(response.statusCode).toBe(200);
    });

    test('GET /nieistniejaca-strona powinno zwrócić błąd 404', async () => {
        const response = await request(app).get('/ukryty-wymiar-404');
        expect(response.statusCode).toBe(404);
    });
});

describe('Zmienne środowiskowe i uruchamianie serwera (Fallbacks)', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        // Izolacja modułów na potrzeby weryfikacji wartości domyślnych (reset cache)
        jest.resetModules(); 
        process.env = { ...originalEnv };
    });

    afterAll(() => {
        process.env = originalEnv; 
    });

    test('powinno załadować wartości domyślne i zasymulować start serwera', () => {
        // Wyciszenie strumienia wejścia/wyjścia
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        
        // Wstrzyknięcie atrapy połączenia z bazą danych
        jest.doMock('knex', () => {
            return () => {
                const mockKnex = () => ({}); 
                return mockKnex;
            };
        });

        // Przechwycenie metody Express.js w celu uniknięcia nasłuchiwania na warstwie sieciowej
        const express = require('express');
        const listenSpy = jest.spyOn(express.application, 'listen').mockImplementation(function(port, cb) {
            if (cb) cb(); 
            return { close: jest.fn() };
        });

        // Wymuszenie pokrycia operatorów logicznych OR (||)
        delete process.env.NODE_ENV;      
        delete process.env.SESSION_SECRET;
        delete process.env.PORT;          

        const fallbackApp = require('../../app');

        expect(typeof fallbackApp).toBe('function');
        expect(listenSpy).toHaveBeenCalled();
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Serwer działa: http://localhost:3000'));

        listenSpy.mockRestore();
        consoleSpy.mockRestore();
    });
});