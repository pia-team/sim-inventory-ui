// Status color helpers for consistent Tag colors across the app
// Ant Design Tag accepts preset colors like 'green', 'gold', 'blue', 'red', etc.

export function getResourceStatusColor(status?: string): string {
  const s = String(status || '').toLowerCase();
  switch (s) {
    case 'available': return 'green';
    case 'reserved': return 'gold';
    case 'inuse':
    case 'in use': return 'blue';
    case 'disposed': return 'default';
    case 'standby': return 'cyan';
    case 'suspended': return 'orange';
    case 'alarm': return 'red';
    case 'completed': return 'green';
    case 'cancelled': return 'default';
    case 'unknown': return 'default';
    // Legacy values
    case 'allocated': return 'blue';
    case 'active': return 'cyan';
    case 'terminated': return 'red';
    case 'retired': return 'default';
    default: return 'default';
  }
}

export function getOrderStatusColor(status?: string): string {
  const s = String(status || '').toLowerCase();
  const map: Record<string, string> = {
    pending: 'blue',
    inprogress: 'orange',
    'in progress': 'orange',
    acknowledged: 'gold',
    completed: 'green',
    failed: 'red',
    cancelled: 'default',
    partial: 'purple',
    rejected: 'red',
    held: 'volcano',
  };
  return map[s] || 'default';
}
