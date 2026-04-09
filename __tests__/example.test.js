import { describe, it, expect } from 'vitest';

describe('Backend Application Tests', () => {
    it('should return a 200 status for the home route', async () => {
        const response = await fetch('http://localhost:3000/');
        expect(response.status).toBe(200);
    });

    it('should return user data for the /users route', async () => {
        const response = await fetch('http://localhost:3000/users');
        const data = await response.json();
        expect(response.status).toBe(200);
        expect(data).toHaveProperty('users');
    });

    it('should create a new user with a POST request to /users', async () => {
        const response = await fetch('http://localhost:3000/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: 'John Doe' }),
        });
        const data = await response.json();
        expect(response.status).toBe(201);
        expect(data).toHaveProperty('id');
        expect(data.name).toBe('John Doe');
    });
});