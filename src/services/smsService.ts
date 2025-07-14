
interface SMSProvider {
  name: string;
  sendSMS: (phone: string, message: string) => Promise<boolean>;
}

class SMS_NetProvider implements SMSProvider {
  name = 'SMS.net';
  private apiKey = 'xgpYr222zWMD4w5VIzUaZc5KYO5L1w8N38qBj1qPflwguq9PdJ545NTCSLTS7H00';

  async sendSMS(phone: string, message: string): Promise<boolean> {
    try {
      const response = await fetch('https://api.sms.net/sms/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          to: phone,
          message: message,
          from: 'GreatPearl'
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('SMS sent successfully via SMS.net:', result);
        return true;
      } else {
        const errorText = await response.text();
        console.error('SMS.net error:', errorText);
        return false;
      }
    } catch (error) {
      console.error('SMS.net request failed:', error);
      return false;
    }
  }
}

class TextLocalProvider implements SMSProvider {
  name = 'TextLocal';
  private apiKey = ''; // Add your TextLocal API key here if available

  async sendSMS(phone: string, message: string): Promise<boolean> {
    if (!this.apiKey) {
      console.log('TextLocal API key not configured, skipping...');
      return false;
    }

    try {
      const formData = new URLSearchParams({
        apikey: this.apiKey,
        numbers: phone,
        message: message,
        sender: 'GreatPearl'
      });

      const response = await fetch('https://api.textlocal.in/send/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData.toString()
      });

      if (response.ok) {
        const result = await response.json();
        console.log('SMS sent successfully via TextLocal:', result);
        return true;
      } else {
        const errorText = await response.text();
        console.error('TextLocal error:', errorText);
        return false;
      }
    } catch (error) {
      console.error('TextLocal request failed:', error);
      return false;
    }
  }
}

export class SMSService {
  private providers: SMSProvider[] = [
    new SMS_NetProvider(),
    new TextLocalProvider()
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
          return { 
            success: true 
          };
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
