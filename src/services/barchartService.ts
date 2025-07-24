interface CoffeePrices {
  iceArabica: number;
  robusta: number;
  exchangeRate: number;
  drugarLocal: number;
  wugarLocal: number;
  robustaFaqLocal: number;
}

export class BarchartService {
  /**
   * Get manually set reference prices from localStorage
   */
  async getCoffeePrices(): Promise<CoffeePrices> {
    const storedPrices = localStorage.getItem('referencePrices');
    if (storedPrices) {
      return JSON.parse(storedPrices);
    }
    return this.getFallbackPrices();
  }

  /**
   * Save reference prices to localStorage
   */
  async saveReferencePrices(prices: CoffeePrices): Promise<void> {
    localStorage.setItem('referencePrices', JSON.stringify(prices));
  }

  private getFallbackPrices(): CoffeePrices {
    // Generate realistic price variations as fallback
    const now = new Date();
    const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    
    const arabicaBase = 185.50;
    const robustaBase = 2450;
    const exchangeRateBase = 3750;
    
    const timeVariation = Math.sin(dayOfYear * 0.1) * 5;
    const randomVariation = (Math.random() - 0.5) * 10;
    
    const arabicaPrice = arabicaBase + timeVariation + randomVariation;
    const robustaPrice = robustaBase + (timeVariation * 20) + (randomVariation * 30);
    const exchangeRate = exchangeRateBase + (timeVariation * 10) + (randomVariation * 20);
    
    const arabicaInfluence = (arabicaPrice - arabicaBase) * 50;
    const robustaInfluence = (robustaPrice - robustaBase) * 3;
    
    return {
      iceArabica: Math.round(arabicaPrice * 100) / 100,
      robusta: Math.round(robustaPrice),
      exchangeRate: Math.round(exchangeRate),
      drugarLocal: Math.round(8500 + arabicaInfluence),
      wugarLocal: Math.round(8200 + arabicaInfluence * 0.9),
      robustaFaqLocal: Math.round(7800 + robustaInfluence)
    };
  }

  /**
   * Get historical price data for charting
   */
  async getHistoricalPrices(symbol: string, days: number = 7): Promise<any[]> {
    // For demo purposes, generate historical data
    const data = [];
    const now = new Date();
    
    for (let i = days; i >= 0; i--) {
      const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
      const basePrice = symbol === 'KC' ? 185.50 : 2450;
      const variation = Math.sin(i * 0.3) * 5 + (Math.random() - 0.5) * 8;
      
      data.push({
        date: date.toISOString().split('T')[0],
        price: Math.round((basePrice + variation) * 100) / 100,
        volume: Math.floor(Math.random() * 10000) + 5000
      });
    }
    
    return data;
  }

  /**
   * Get market status (open/closed)
   */
  getMarketStatus(): { isOpen: boolean; nextOpen: string; timezone: string } {
    const now = new Date();
    const utcHour = now.getUTCHours();
    
    // ICE coffee futures trade approximately 14:30-19:00 UTC
    const isOpen = utcHour >= 14 && utcHour < 19;
    
    let nextOpen = '';
    if (!isOpen) {
      const tomorrow = new Date(now.getTime() + (24 * 60 * 60 * 1000));
      tomorrow.setUTCHours(14, 30, 0, 0);
      nextOpen = tomorrow.toISOString();
    }
    
    return {
      isOpen,
      nextOpen,
      timezone: 'UTC'
    };
  }
}

export const barchartService = new BarchartService();