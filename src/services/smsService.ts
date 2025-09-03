import { supabase } from '@/integrations/supabase/client';

interface SMSProvider {
  name: string;
  sendSMS: (phone: string, message: string) => Promise<boolean>;
}

class SupabaseSMSProvider implements SMSProvider {
  name = 'Supabase SMS';

  async sendSMS(phone: string, message: string): Promise<boolean> {
    try {
      console.log('Attempting to send SMS via Supabase Edge Function to:', phone);
      console.log('Message content:', message);
      
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: { 
          phone: phone, 
          message: message,
          userName: 'User' 
        }
      });

      if (error) {
        console.error('Supabase SMS error:', error);
        return false;
      }

      console.log('SMS sent successfully via Supabase:', data);
      return true;
    } catch (error) {
      console.error('Supabase SMS request failed:', error);
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
    new SupabaseSMSProvider(),
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
    
    console.log('Sending SMS to:', formattedPhone, 'Code:', code);

    for (const provider of this.providers) {
      try {
        console.log(`Trying ${provider.name}...`);
        
        // For Supabase provider, send the message as is
        if (provider.name === 'Supabase SMS') {
          const success = await provider.sendSMS(formattedPhone, code);
          
          if (success) {
            console.log(`SMS sent successfully via ${provider.name}`);
            return { 
              success: true 
            };
          } else {
            console.log(`${provider.name} returned false, trying next provider...`);
          }
        } else {
          // For other providers, send the formatted message
          const greeting = userName ? `Dear ${userName},` : 'Dear User,';
          const message = `Great Pearl Coffee Factory - ${greeting} Please use code ${code} for logging in. This code expires in 5 minutes.`;
          
          const success = await provider.sendSMS(formattedPhone, message);
          
          if (success) {
            console.log(`SMS sent successfully via ${provider.name}`);
            return { 
              success: true 
            };
          } else {
            console.log(`${provider.name} returned false, trying next provider...`);
          }
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

  // Method to send general SMS messages
  async sendSMS(phone: string, message: string): Promise<{ success: boolean; error?: string }> {
    const formattedPhone = this.formatPhoneNumber(phone);
    
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
      error: 'All SMS providers failed to send the message' 
    };
  }

  // Test method to send to specific number
  async testSMS(phone: string): Promise<{ success: boolean; error?: string }> {
    const testCode = Math.floor(1000 + Math.random() * 9000).toString();
    console.log('Testing SMS service with code:', testCode);
    return this.sendVerificationSMS(phone, testCode, 'Test User');
  }
}

export const smsService = new SMSService();