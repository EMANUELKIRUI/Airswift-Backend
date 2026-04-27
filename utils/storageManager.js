/**
 * ✅ STORAGE MANAGER - Local Storage with Error Fallback
 * Handles persistence of audit logs, settings, and other data
 * Survives logout/login cycles and page refreshes
 */

class StorageManager {
  constructor() {
    this.prefix = 'airswift_';
    this.maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
  }

  /**
   * Save data to localStorage with timestamp
   */
  save(key, data, options = {}) {
    try {
      const { expiresIn = this.maxAge } = options;
      const storageData = {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + expiresIn,
        version: '1.0',
      };
      
      localStorage.setItem(
        `${this.prefix}${key}`,
        JSON.stringify(storageData)
      );
      console.log(`✅ Data saved to localStorage: ${key}`);
      return true;
    } catch (err) {
      console.error(`❌ Failed to save to localStorage (${key}):`, err);
      return false;
    }
  }

  /**
   * Retrieve data from localStorage with expiration check
   */
  get(key) {
    try {
      const item = localStorage.getItem(`${this.prefix}${key}`);
      
      if (!item) {
        console.log(`⚠️ No data found in localStorage: ${key}`);
        return null;
      }

      const storageData = JSON.parse(item);
      
      // Check if data has expired
      if (storageData.expiresAt && Date.now() > storageData.expiresAt) {
        console.log(`⏰ Data expired in localStorage: ${key}`);
        this.remove(key);
        return null;
      }

      console.log(`✅ Data retrieved from localStorage: ${key}`);
      return storageData.data;
    } catch (err) {
      console.error(`❌ Failed to retrieve from localStorage (${key}):`, err);
      return null;
    }
  }

  /**
   * Remove data from localStorage
   */
  remove(key) {
    try {
      localStorage.removeItem(`${this.prefix}${key}`);
      console.log(`✅ Data removed from localStorage: ${key}`);
      return true;
    } catch (err) {
      console.error(`❌ Failed to remove from localStorage (${key}):`, err);
      return false;
    }
  }

  /**
   * Clear all data (optionally matching a pattern)
   */
  clear(pattern = null) {
    try {
      const keys = Object.keys(localStorage);
      const matchingKeys = keys.filter(key => 
        key.startsWith(this.prefix) && 
        (!pattern || key.includes(pattern))
      );
      
      matchingKeys.forEach(key => localStorage.removeItem(key));
      console.log(`✅ Cleared ${matchingKeys.length} items from localStorage`);
      return true;
    } catch (err) {
      console.error('❌ Failed to clear localStorage:', err);
      return false;
    }
  }

  /**
   * Get storage usage stats
   */
  getStats() {
    try {
      const keys = Object.keys(localStorage);
      const airswiftKeys = keys.filter(k => k.startsWith(this.prefix));
      
      let totalSize = 0;
      airswiftKeys.forEach(key => {
        totalSize += localStorage.getItem(key)?.length || 0;
      });

      return {
        count: airswiftKeys.length,
        keys: airswiftKeys,
        totalSizeKB: (totalSize / 1024).toFixed(2),
      };
    } catch (err) {
      console.error('❌ Failed to get storage stats:', err);
      return null;
    }
  }
}

export default new StorageManager();
