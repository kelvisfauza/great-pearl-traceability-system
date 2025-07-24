interface CoffeePrices {
  iceArabica: number;
  robusta: number;
  exchangeRate: number;
  drugarLocal: number;
  wugarLocal: number;
  robustaFaqLocal: number;
}

export class RapidApiService {
  /**
   * Fetch coffee futures prices - now uses Firebase backend
   */
  async getCoffeePrices(): Promise<CoffeePrices> {
    // Import Firebase service dynamically to avoid circular imports
    const { firebasePriceService } = await import('./firebasePriceService');
    return firebasePriceService.getCoffeePrices();
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
}

export const rapidApiService = new RapidApiService();