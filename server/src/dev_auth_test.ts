import {
  generateAuthToken,
  hashPassword,
  verifyAuthToken,
  verifyPassword,
} from './auth_service.js';

const run = async (): Promise<void> => {
  const password = 'studio-test-password';

  // eslint-disable-next-line no-console
  console.log('[auth:test] Using password:', password);

  const hash = await hashPassword(password);
  // eslint-disable-next-line no-console
  console.log('[auth:test] Hash:', hash);

  const ok = await verifyPassword(password, hash);
  const bad = await verifyPassword('wrong-password', hash);

  // eslint-disable-next-line no-console
  console.log('[auth:test] verify(correct) ->', ok);
  // eslint-disable-next-line no-console
  console.log('[auth:test] verify(incorrect) ->', bad);

  const token = generateAuthToken({ id: 1, email: 'test@example.com' });
  // eslint-disable-next-line no-console
  console.log('[auth:test] token:', token);

  const payload = verifyAuthToken(token);
  // eslint-disable-next-line no-console
  console.log('[auth:test] decoded payload:', payload);
};

run().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('[auth:test] Error running auth test:', error);
  process.exitCode = 1;
});

