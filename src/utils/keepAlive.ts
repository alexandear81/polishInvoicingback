/**
 * Keep-Alive Service
 * Prevents Render free tier from spinning down by sending periodic health checks
 */

import axios from 'axios';

interface KeepAliveConfig {
  url: string;
  intervalMinutes: number;
  enabled: boolean;
}

class KeepAliveService {
  private config: KeepAliveConfig;
  private intervalId: NodeJS.Timeout | null = null;
  private lastPingTime: Date | null = null;
  private lastPingSuccess: boolean = false;
  private totalPings: number = 0;
  private successfulPings: number = 0;

  constructor() {
    this.config = {
      url: process.env.RENDER_EXTERNAL_URL || 'https://polishinvoicingback-1.onrender.com',
      intervalMinutes: parseInt(process.env.KEEP_ALIVE_INTERVAL || '10'), // Ping every 10 minutes
      enabled: process.env.NODE_ENV === 'production' && process.env.KEEP_ALIVE_ENABLED !== 'false'
    };
  }

  /**
   * Start the keep-alive service
   */
  start(): void {
    if (!this.config.enabled) {
      console.log('🚫 Keep-alive service disabled (not in production or explicitly disabled)');
      return;
    }

    if (this.intervalId) {
      console.log('⚠️ Keep-alive service already running');
      return;
    }

    const intervalMs = this.config.intervalMinutes * 60 * 1000;
    
    console.log('🔄 Starting keep-alive service');
    console.log(`   📍 Target URL: ${this.config.url}`);
    console.log(`   ⏰ Interval: ${this.config.intervalMinutes} minutes`);

    this.intervalId = setInterval(async () => {
      await this.ping();
    }, intervalMs);

    // Send initial ping after 1 minute to ensure service is ready
    setTimeout(async () => {
      await this.ping();
    }, 60000);
  }

  /**
   * Stop the keep-alive service
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('🛑 Keep-alive service stopped');
    }
  }

  /**
   * Send a health check ping
   */
  private async ping(): Promise<void> {
    try {
      this.totalPings++;
      const startTime = Date.now();
      const response = await axios.get(`${this.config.url}/health`, {
        timeout: 30000, // 30 second timeout
        headers: {
          'User-Agent': 'KeepAlive-Service/1.0'
        }
      });

      const duration = Date.now() - startTime;
      this.lastPingTime = new Date();

      if (response.status === 200) {
        this.lastPingSuccess = true;
        this.successfulPings++;
        console.log(`💚 Keep-alive ping successful [${this.lastPingTime.toISOString()}] - ${duration}ms`);
      } else {
        this.lastPingSuccess = false;
        console.log(`⚠️ Keep-alive ping returned ${response.status} [${this.lastPingTime.toISOString()}] - ${duration}ms`);
      }
    } catch (error: any) {
      this.totalPings++;
      this.lastPingTime = new Date();
      this.lastPingSuccess = false;
      console.error(`❌ Keep-alive ping failed [${this.lastPingTime.toISOString()}]:`, error.message);
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): KeepAliveConfig {
    return { ...this.config };
  }

  /**
   * Check if service is running
   */
  isRunning(): boolean {
    return this.intervalId !== null;
  }

  /**
   * Get comprehensive status information
   */
  getStatus() {
    return {
      enabled: this.config.enabled,
      running: this.isRunning(),
      config: {
        url: this.config.url,
        intervalMinutes: this.config.intervalMinutes
      },
      stats: {
        totalPings: this.totalPings,
        successfulPings: this.successfulPings,
        successRate: this.totalPings > 0 ? ((this.successfulPings / this.totalPings) * 100).toFixed(1) + '%' : 'N/A',
        lastPingTime: this.lastPingTime?.toISOString() || null,
        lastPingSuccess: this.lastPingSuccess,
        nextPingIn: this.intervalId ? `${this.config.intervalMinutes} minutes` : 'N/A'
      }
    };
  }
}

// Export singleton instance
export const keepAliveService = new KeepAliveService();
export default KeepAliveService;
