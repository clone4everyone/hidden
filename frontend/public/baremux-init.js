// baremux-init.js - Place this in your public folder
// This ensures Baremux is properly initialized and reinitialized

class ProxyManager {
  constructor() {
    this.connection = null;
    this.isInitialized = false;
    this.initPromise = null;
  }

  async initialize() {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._doInitialize();
    return this.initPromise;
  }

  async _doInitialize() {
    try {
      // Wait for BareMux to be available
      while (!window.BareMux) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Create new connection
      this.connection = new window.BareMux.BareMuxConnection("/baremux/worker.js");
      
      // Set transport with proper WebSocket URL
      const protocol = location.protocol === "https:" ? "wss:" : "ws:";
      const wispUrl = `${protocol}//${location.host}/wisp/`;
      
      await this.connection.setTransport("/epoxy/index.mjs", [{ wisp: wispUrl }]);
      
      // Store globally for access
      window.bareMux = this.connection;
      
      this.isInitialized = true;
      console.log('Baremux initialized successfully');
      
      return this.connection;
    } catch (error) {
      console.error('Baremux initialization failed:', error);
      this.initPromise = null;
      throw error;
    }
  }

  async reinitialize() {
    console.log('Reinitializing Baremux...');
    
    // Reset state
    this.isInitialized = false;
    this.initPromise = null;
    this.connection = null;
    
    // Wait a bit before reinitializing
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Initialize again
    return await this.initialize();
  }

  getConnection() {
    return this.connection;
  }

  isReady() {
    return this.isInitialized && this.connection;
  }
}

// Create global proxy manager
window.proxyManager = new ProxyManager();

// Auto-initialize when the script loads
window.addEventListener('DOMContentLoaded', () => {
  window.proxyManager.initialize().catch(console.error);
});

// Expose reinitialize function globally
window.reinitializeProxy = () => {
  return window.proxyManager.reinitialize();
};