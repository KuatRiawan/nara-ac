const jwt = require('jsonwebtoken');
const { requireAuth, signToken } = require('../src/middleware/auth');
const config = require('../src/config');

describe('Auth Middleware & Token Tests', () => {
  const mockUser = {
    id: 10,
    role: 'customer',
    nama: 'Budi',
    customer_id: 5
  };

  test('signToken generates valid JWT with correct payload', () => {
    const token = signToken(mockUser);
    const decoded = jwt.verify(token, config.jwtSecret);
    expect(decoded.sub).toBe(10);
    expect(decoded.role).toBe('customer');
    expect(decoded.cid).toBe(5);
  });

  test('requireAuth populates req.user correctly with aliases', () => {
    const token = signToken(mockUser);
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = {};
    const next = jest.fn();

    requireAuth()(req, res, next);
    
    expect(next).toHaveBeenCalledWith();
    expect(req.user).toBeDefined();
    expect(req.user.id).toBe(10);
    expect(req.user.customer_id).toBe(5); // BUG-003 regression guard
    expect(req.user.customerId).toBe(5);
  });

  test('requireAuth blocks request without token', () => {
    const req = { headers: {} };
    const next = jest.fn();
    
    requireAuth()(req, {}, next);
    
    expect(next).toHaveBeenCalled();
    const error = next.mock.calls[0][0];
    expect(error).toBeDefined();
    expect(error.status).toBe(401);
  });

  test('requireAuth blocks request with invalid token', () => {
    const req = { headers: { authorization: 'Bearer invalidtoken' } };
    const next = jest.fn();
    
    requireAuth()(req, {}, next);
    
    expect(next).toHaveBeenCalled();
    const error = next.mock.calls[0][0];
    expect(error).toBeDefined();
    expect(error.status).toBe(401);
  });

  test('requireAuth blocks access for wrong role', () => {
    const token = signToken(mockUser);
    const req = { headers: { authorization: `Bearer ${token}` } };
    const next = jest.fn();
    
    requireAuth(['admin'])(req, {}, next);
    
    expect(next).toHaveBeenCalled();
    const error = next.mock.calls[0][0];
    expect(error).toBeDefined();
    expect(error.status).toBe(403);
  });
});
