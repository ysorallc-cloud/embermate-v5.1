// ============================================================================
// NOTIFICATION INTEGRATION TEST
// Quick test to verify notification scheduling works
// ============================================================================

import { 
  requestNotificationPermissions,
  scheduleMedicationNotifications,
  getScheduledNotifications,
  cancelAllNotifications,
} from '../utils/notificationService';
import { getMedications } from '../utils/medicationStorage';

/**
 * Test 1: Request permissions
 */
export async function testNotificationPermissions() {
  console.log('🔔 Testing notification permissions...');
  const granted = await requestNotificationPermissions();
  console.log(`✓ Permissions ${granted ? 'GRANTED' : 'DENIED'}`);
  return granted;
}

/**
 * Test 2: Schedule medication notifications
 */
export async function testScheduleMedicationNotifications() {
  console.log('📅 Testing medication notification scheduling...');
  
  const medications = await getMedications();
  const activeMeds = medications.filter(m => m.active);
  
  console.log(`Found ${activeMeds.length} active medications`);
  
  await scheduleMedicationNotifications(activeMeds);
  
  const scheduled = await getScheduledNotifications();
  console.log(`✓ Scheduled ${scheduled.length} notifications`);
  
  // Log details
  scheduled.forEach((notif, idx) => {
    console.log(`  ${idx + 1}. ${notif.content.title} - ${notif.content.body}`);
  });
  
  return scheduled;
}

/**
 * Test 3: Cancel all notifications
 */
export async function testCancelAllNotifications() {
  console.log('❌ Testing cancel all notifications...');
  await cancelAllNotifications();
  const remaining = await getScheduledNotifications();
  console.log(`✓ Remaining: ${remaining.length} (should be 0)`);
  return remaining.length === 0;
}

/**
 * Run full test suite
 */
export async function runNotificationTests() {
  console.log('🧪 Running notification test suite...\n');
  
  try {
    // Test 1: Permissions
    const hasPermission = await testNotificationPermissions();
    if (!hasPermission) {
      console.error('❌ Cannot proceed without notification permissions');
      return false;
    }
    
    console.log('');
    
    // Test 2: Schedule
    await testScheduleMedicationNotifications();
    
    console.log('');
    
    // Test 3: Cancel
    const cancelSuccess = await testCancelAllNotifications();
    
    console.log('\n✅ All tests completed');
    return true;
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    return false;
  }
}
