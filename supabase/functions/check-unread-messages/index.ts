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

    console.log('🔍 Checking for unread messages older than 5 minutes...');

    // Calculate timestamp for 5 minutes ago
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    // Find messages that are:
    // 1. Not read (read_at is null)
    // 2. Older than 5 minutes
    // 3. Reminder notification not sent yet
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
      .lt('created_at', fiveMinutesAgo);

    if (messagesError) {
      console.error('Error fetching unread messages:', messagesError);
      throw messagesError;
    }

    if (!unreadMessages || unreadMessages.length === 0) {
      console.log('✅ No unread messages older than 5 minutes found');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No unread messages found',
          count: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📨 Found ${unreadMessages.length} unread messages older than 5 minutes`);

    let notifiedCount = 0;
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
          // Get recipient's employee details (skip disabled accounts)
          const { data: recipientEmployee } = await supabase
            .from('employees')
            .select('name, email, disabled')
            .eq('auth_user_id', participant.user_id)
            .single();

          if (!recipientEmployee?.email || recipientEmployee.disabled) {
            console.log(`⚠️ Skipping user ${participant.user_id} (no email or disabled)`);
            continue;
          }

          const senderName = message.sender_name || 'a colleague';
          const preview =
            message.type === 'text' && typeof message.content === 'string'
              ? message.content.slice(0, 200)
              : `[${message.type || 'message'}]`;

          console.log(`📧 Sending 5-minute unread-chat email to: ${recipientEmployee.email}`);

          // Send email reminder (primary channel)
          const { error: emailError } = await supabase.functions.invoke('send-transactional-email', {
            body: {
              templateName: 'general-notification',
              recipientEmail: recipientEmployee.email,
              idempotencyKey: `unread-chat-${message.id}-${participant.user_id}`,
              templateData: {
                subject: `New unread chat from ${senderName}`,
                title: `You have an unread chat from ${senderName}`,
                recipientName: recipientEmployee.name,
                message:
                  `You received a new message from ${senderName} that you haven't read yet:\n\n` +
                  `"${preview}"\n\n` +
                  `Open the Great Pearl Coffee app to reply.`,
              },
            },
          });

          if (emailError) {
            console.error(`Failed to email ${recipientEmployee.name}:`, emailError);
            errors.push({
              messageId: message.id,
              recipient: recipientEmployee.name,
              error: emailError.message,
            });
          } else {
            notifiedCount++;
          }
        }

        // Mark message as reminder sent (re-uses legacy sms_notification_sent flag)
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
          error: (error as Error).message
        });
      }
    }

    console.log(`✅ Sent ${notifiedCount} email notifications`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${unreadMessages.length} unread messages`,
        notified: notifiedCount,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in check-unread-messages function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
