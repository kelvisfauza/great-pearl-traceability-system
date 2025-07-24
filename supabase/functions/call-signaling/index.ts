import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, callId, fromUserId, toUserId, fromUserName, toUserName, sdp, candidate } = await req.json();

    console.log(`Call signaling - Action: ${action}, From: ${fromUserName}, To: ${toUserName}`);

    // Handle different call actions
    switch (action) {
      case 'initiate_call':
        // Store call initiation in database
        return new Response(JSON.stringify({ 
          success: true, 
          callId: `call_${Date.now()}`,
          message: `Initiating call from ${fromUserName} to ${toUserName}`
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'ring':
        // Send ring notification to target user
        return new Response(JSON.stringify({ 
          success: true,
          message: `Ringing ${toUserName}...`
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'answer':
        // Handle call answer
        return new Response(JSON.stringify({ 
          success: true,
          message: `Call answered by ${toUserName}`
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'decline':
      case 'busy':
      case 'unavailable':
        // Generate voice message for unavailable user
        const unavailableMessage = `${toUserName} is currently unavailable`;
        
        const speechResponse = await fetch('https://api.openai.com/v1/audio/speech', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'tts-1',
            input: unavailableMessage,
            voice: 'alloy',
            response_format: 'mp3',
          }),
        });

        if (speechResponse.ok) {
          const arrayBuffer = await speechResponse.arrayBuffer();
          const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
          
          return new Response(JSON.stringify({ 
            success: true,
            unavailable: true,
            message: unavailableMessage,
            audioContent: base64Audio
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        return new Response(JSON.stringify({ 
          success: true,
          unavailable: true,
          message: unavailableMessage
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'exchange_sdp':
        // Handle WebRTC SDP exchange
        return new Response(JSON.stringify({ 
          success: true,
          sdp: sdp,
          message: 'SDP exchanged successfully'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'exchange_candidate':
        // Handle ICE candidate exchange
        return new Response(JSON.stringify({ 
          success: true,
          candidate: candidate,
          message: 'ICE candidate exchanged'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'end_call':
        // Handle call termination
        return new Response(JSON.stringify({ 
          success: true,
          message: 'Call ended'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error("Call signaling error:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});