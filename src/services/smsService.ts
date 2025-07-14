
import axios from 'axios';

interface SMSProvider {
  name: string;
  sendSMS: (phone: string, message: string) => Promise<boolean>;
}

class YoolaSMSProvider implements SMSProvider {
  name = 'YoolaSMS';
  private apiKey = 'xgpYr222zWMD4w5VIzUaZc5KYO5L1w8N38qBj1qPflwguq9PdJ545NTCSLTS7H00';

  async sendSMS(phone: string, message: string): Promise<boolean> {
    if (!this.apiKey || this.apiKey === 'your api key') {
      console.log('YoolaSMS API key not configured, skipping...');
      return false;
    }

    try {
      console.log('Attempting to send SMS via YoolaSMS to:', phone);
      
      const data = {
        phone: phone,
        message: message,
        api_key: this.apiKey
      };

      const config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: 'https://yoolasms.com/api/v1/send',
        headers: { 
          'Content-Type': 'application/json'
        },
        data: data
      };

      console.log('YoolaSMS request config:', config);
      const response = await axios.request(config);
      console.log('YoolaSMS response:', response.data);
      return true;
    } catch (error) {
      console.error('YoolaSMS request failed:', error);
      return false;
    }
  }
}

class DevelopmentProvider implements SMSProvider {
  name = 'Development';

  async sendSMS(phone: string, message: string): Promise<boolean> {
    console.log('=== DEVELOPMENT SMS ===');
    console.log('Phone:', phone);
    console.log('Message:', message);
    console.log('======================');
    return true;
  }
}

export class SMSService {
  private providers: SMSProvider[] = [
    new YoolaSMSProvider(),
    new DevelopmentProvider() // Always works for testing
  ];

  private formatPhoneNumber(phone: string): string {
    let formattedPhone = phone.toString().trim();
    
    // If phone doesn't start with +, assume it's a Ugandan number
    if (!formattedPhone.startsWith('+')) {
      if (formattedPhone.startsWith('0')) {
        // Replace leading 0 with +256 for Uganda
        formattedPhone = '+256' + formattedPhone.substring(1);
      } else if (formattedPhone.startsWith('256')) {
        // Add + if missing
        formattedPhone = '+' + formattedPhone;
      } else {
        // Assume it's a Ugandan number without country code
        formattedPhone = '+256' + formattedPhone;
      }
    }
    
    return formattedPhone;
  }

  async sendVerificationSMS(phone: string, code: string, userName?: string): Promise<{ success: boolean; error?: string }> {
    const formattedPhone = this.formatPhoneNumber(phone);
    const greeting = userName ? `Dear ${userName},` : 'Dear User,';
    const message = `Great Pearl Coffee Factory - ${greeting} Please use code ${code} for logging in. This code expires in 5 minutes.`;

    console.log('Sending SMS to:', formattedPhone, 'Message:', message);

    for (const provider of this.providers) {
      try {
        console.log(`Trying ${provider.name}...`);
        const success = await provider.sendSMS(formattedPhone, message);
        
        if (success) {
          console.log(`SMS sent successfully via ${provider.name}`);
          return { 
            success: true 
          };
        } else {
          console.log(`${provider.name} returned false, trying next provider...`);
        }
      } catch (error) {
        console.error(`${provider.name} failed:`, error);
      }
    }

    return { 
      success: false, 
      error: 'All SMS providers failed to send the verification code' 
    };
  }
}

export const smsService = new SMSService();
