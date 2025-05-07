/**
 * SOCKET.IO FUNCTIONALITY REMOVED
 * 
 * This service now provides dummy implementations that do nothing.
 * All real-time functionality has been removed from the application.
 */

/**
 * Dummy implementation that does nothing
 */
export const initSocketConnection = () => {
  console.log('Socket.IO functionality has been removed from the application');
  return null;
};

/**
 * Dummy implementation that does nothing
 */
export const disconnectSocket = () => {
  return true;
};

/**
 * Dummy implementation that does nothing
 */
export const subscribeToEvent = () => {
  return () => {}; // Return empty unsubscribe function
};

/**
 * Dummy implementation that does nothing
 */
export const emitEvent = () => {
  console.log('Socket.IO events are no longer supported');
  return false;
};

/**
 * Always returns false - Socket.IO is no longer available
 */
export const isSocketAvailable = () => {
  return false;
}; 