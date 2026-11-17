/**
 * Gera um UUID v4.
 *
 * Usa `crypto.randomUUID` quando disponível e cai para uma implementação
 * baseada em `Math.random` em ambientes que não a expõem (por exemplo,
 * alguns runtimes do React Native). Para chaves de idempotência o requisito
 * é apenas evitar colisões, não segurança criptográfica.
 */
export function createUuid(): string {
  const cryptoApi = globalThis.crypto;

  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return cryptoApi.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
      /[xy]/g,
      (character) => {
        const random = Math.floor(Math.random() * 16);
        const value = character === 'x' ? random : (random & 0x3) | 0x8;

        return value.toString(16);
      },
  );
}
