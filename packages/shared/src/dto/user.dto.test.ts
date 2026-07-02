import { describe, expect, it } from 'vitest';
import {
  AssignRolesToUserDto,
  CreateUserDto,
  ListUsersQuery,
  UpdateUserDto,
} from './user.dto';

describe('CreateUserDto', () => {
  it('lowercases email', () => {
    // Chain order is `.email().max(200).trim().toLowerCase()` — `.email()`
    // runs BEFORE `.trim()`, so leading/trailing whitespace in the raw input
    // would fail validation. Callers must send an already-clean email string.
    const r = CreateUserDto.parse({
      email: 'Admin@Example.COM',
      password: 'password123',
    });
    expect(r.email).toBe('admin@example.com');
  });

  it('rejects invalid email format', () => {
    expect(() =>
      CreateUserDto.parse({ email: 'not-an-email', password: 'password123' }),
    ).toThrow();
  });

  it('enforces password min length', () => {
    expect(() =>
      CreateUserDto.parse({ email: 'a@b.co', password: 'short' }),
    ).toThrow();
  });

  it('defaults status to ACTIVE', () => {
    const r = CreateUserDto.parse({ email: 'a@b.co', password: 'password123' });
    expect(r.status).toBe('ACTIVE');
  });

  it('rejects unknown status', () => {
    expect(() =>
      CreateUserDto.parse({
        email: 'a@b.co',
        password: 'password123',
        status: 'DELETED',
      }),
    ).toThrow();
  });

  it('coerces empty optional fields to undefined', () => {
    const r = CreateUserDto.parse({
      email: 'a@b.co',
      password: 'password123',
      firstName: '',
      lastName: '',
      phone: '',
      avatarUrl: '',
    });
    expect(r.firstName).toBeUndefined();
    expect(r.lastName).toBeUndefined();
    expect(r.phone).toBeUndefined();
    expect(r.avatarUrl).toBeUndefined();
  });

  it('rejects avatarUrl that is not a URL', () => {
    expect(() =>
      CreateUserDto.parse({
        email: 'a@b.co',
        password: 'password123',
        avatarUrl: 'not-a-url',
      }),
    ).toThrow();
  });

  it('accepts optional roleIds array', () => {
    const r = CreateUserDto.parse({
      email: 'a@b.co',
      password: 'password123',
      roleIds: [validCuid('a'), validCuid('b')],
    });
    expect(r.roleIds).toHaveLength(2);
  });

  it('rejects >50 roleIds', () => {
    expect(() =>
      CreateUserDto.parse({
        email: 'a@b.co',
        password: 'password123',
        roleIds: Array.from({ length: 51 }, (_, i) => validCuid(String(i).padStart(24, '0'))),
      }),
    ).toThrow();
  });
});

describe('UpdateUserDto', () => {
  it('accepts empty object', () => {
    expect(UpdateUserDto.parse({})).toEqual({});
  });

  it('supports status-only update', () => {
    expect(UpdateUserDto.parse({ status: 'SUSPENDED' })).toEqual({ status: 'SUSPENDED' });
  });
});

describe('AssignRolesToUserDto', () => {
  it('accepts an empty array (clears roles)', () => {
    expect(AssignRolesToUserDto.parse({ roleIds: [] })).toEqual({ roleIds: [] });
  });

  it('caps at 50 role ids', () => {
    expect(() =>
      AssignRolesToUserDto.parse({
        roleIds: Array.from({ length: 51 }, (_, i) => validCuid(String(i).padStart(24, '0'))),
      }),
    ).toThrow();
  });
});

/**
 * Zod's .cuid() expects `c` + 24 lowercase alphanumerics = 25 chars. We
 * hand-roll IDs here rather than importing a cuid lib for test-only use.
 */
function validCuid(suffix: string): string {
  const padded = suffix.padStart(24, '0').slice(-24);
  return 'c' + padded.replace(/[^a-z0-9]/gi, '0').toLowerCase();
}

describe('ListUsersQuery', () => {
  it('coerces empty status/roleId to undefined', () => {
    const r = ListUsersQuery.parse({ status: '', roleId: '', search: '' });
    expect(r.status).toBeUndefined();
    expect(r.roleId).toBeUndefined();
    expect(r.search).toBeUndefined();
  });

  it('coerces string page from querystring', () => {
    expect(ListUsersQuery.parse({ page: '5' }).page).toBe(5);
  });
});
