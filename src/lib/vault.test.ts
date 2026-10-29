import { describe, expect, it } from 'vitest';
import { deriveVaultKey, seal, unseal } from './vault';

describe('vault', () => {
  it('cifra y descifra con la misma contraseña', async () => {
    const key = await deriveVaultKey('abc', 'secreta1');
    const box = await seal({ tasks: [{ id: '1', title: 'Conciliación' }] }, key);
    expect(box.data).not.toContain('Conciliación');
    expect(await unseal(box, key)).toEqual({ tasks: [{ id: '1', title: 'Conciliación' }] });
  });
  it('con otra contraseña u otra persona no se puede leer', async () => {
    const key = await deriveVaultKey('abc', 'secreta1');
    const box = await seal({ a: 1 }, key);
    expect(await unseal(box, await deriveVaultKey('abc', 'otra'))).toBeNull();
    expect(await unseal(box, await deriveVaultKey('xyz', 'secreta1'))).toBeNull();
  });
});
