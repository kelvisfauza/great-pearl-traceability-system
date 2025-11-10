import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://pudfybkyfedeggmokhco.supabase.co';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseKey) {
      throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🔍 Checking for unread messages older than 20 minutes...');

    // Calculate timestamp for 20 minutes ago
    const twentyMinutesAgo = new Date(Date.now() - 20 * 60 * 1000).toISOString();

    // Find messages that are:
    // 1. Not read (read_at is null)
    // 2. Older than 20 minutes
    // 3. SMS notification not sent yet
    const { data: unreadMessages, error: messagesError } = await supabase
      .from('messages')
      .select(`
        id,
        conversation_id,
        sender_id,
        sender_name,
        content,
        created_at,
        type
      `)
      .is('read_at', null)
      .is('sms_notification_sent', false)
      .lt('created_at', twentyMinutesAgo);

    if (messagesError) {
      console.error('Error fetching unread messages:', messagesError);
      throw messagesError;
    }

    if (!unreadMessages || unreadMessages.length === 0) {
      console.log('✅ No unread messages older than 20 minutes found');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No unread messages found',
          count: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📨 Found ${unreadMessages.length} unread messages older than 20 minutes`);

    let smsSentCount = 0;
    const errors = [];

    // Process each unread message
    for (const message of unreadMessages) {
      try {
        // Get recipients for this conversation (excluding the sender)
        const { data: participants } = await supabase
          .from('conversation_participants')
          .select('user_id')
          .eq('conversation_id', message.conversation_id)
          .neq('user_id', message.sender_id);

        if (!participants || participants.length === 0) {
          continue;
        }

        // Send SMS to each recipient
        for (const participant of participants) {
          // Get recipient's employee details
          const { data: recipientEmployee } = await supabase
            .from('employees')
            .select('name, phone')
            .eq('auth_user_id', participant.user_id)
            .single();

          if (!recipientEmployee?.phone) {
            console.log(`⚠️ No phone number found for user ${participant.user_id}`);
            continue;
          }

          console.log(`📱 Sending 20-minute reminder SMS to: ${recipientEmployee.name}`);

          // Send SMS notification
          const { error: smsError } = await supabase.functions.invoke('send-sms', {
            body: {
              phone: recipientEmployee.phone,
              message: `Dear ${recipientEmployee.name}, you have an unread chat from ${message.sender_name || 'a colleague'}. Open app to read.`,
              userName: recipientEmployee.name,
              messageType: 'unread_chat_reminder'
            }
          });

          if (smsError) {
            console.error(`Failed to send SMS to ${recipientEmployee.name}:`, smsError);
            errors.push({
              messageId: message.id,
              recipient: recipientEmployee.name,
              error: smsError.message
            });
          } else {
            smsSentCount++;
          }
        }

        // Mark message as SMS notification sent
        await supabase
          .from('messages')
          .update({
            sms_notification_sent: true,
            sms_notification_sent_at: new Date().toISOString()
          })
          .eq('id', message.id);

      } catch (error) {
        console.error(`Error processing message ${message.id}:`, error);
        errors.push({
          messageId: message.id,
          error: error.message
        });
      }
    }

    console.log(`✅ Sent ${smsSentCount} SMS notifications`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${unreadMessages.length} unread messages`,
        smsSent: smsSentCount,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in check-unread-messages function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
