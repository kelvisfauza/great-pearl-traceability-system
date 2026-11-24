import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { retiredMessageResponse } from '../_shared/retired-message.ts';

// No active app caller: alternate providers are retained in the central sender.
Deno.serve(async req => retiredMessageResponse(req, corsHeaders));
