// ============================================================================
// SECURE STORAGE ENCRYPTION TESTS
// Verify AES-256-GCM encryption before production deployment
// ============================================================================

import { testEncryption } from '../secureStorage';

describe('Secure Storage Encryption', () => {
  it('should encrypt and decrypt data successfully', async () => {
    const result = await testEncryption();
    expect(result).toBe(true);
  });
});

// Manual test runner for quick verification
export async function runEncryptionTests() {
  console.log('\n🔐 Running Encryption Tests...\n');

  const success = await testEncryption();

  if (success) {
    console.log('\n✅ ALL ENCRYPTION TESTS PASSED');
    console.log('✅ Safe to deploy to production\n');
  } else {
    console.log('\n❌ ENCRYPTION TESTS FAILED');
    console.log('❌ DO NOT DEPLOY TO PRODUCTION\n');
  }

  return success;
}
