import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

// Umgebungsvariablen laden
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    });
  }

  // Nur POST-Anfragen erlauben
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  // Auth-Header extrahieren
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'No authorization header' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  // Supabase Client mit Anon-Key (für auth) und Service-Key (für admin-Operationen) initialisieren
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Request Body parsen
    const bodyText = await req.text();
    const { userId } = JSON.parse(bodyText);

    if (!userId) {
      return new Response(JSON.stringify({ error: 'No user ID provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // JWT Token aus dem Authorization-Header extrahieren
    const token = authHeader.replace('Bearer ', '');
    
    // Benutzer über JWT authentifizieren
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(JSON.stringify({ error: 'Authentication failed' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
    
    // Sicherstellen, dass der Benutzer nur sein eigenes Konto löschen kann
    if (user.id !== userId) {
      return new Response(JSON.stringify({ error: 'Not authorized to delete this account' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // 1. Benutzerdaten in der Datenbank löschen
    try {
      // Wir sollten erst alle Benutzerdaten löschen, bevor wir den Auth-Eintrag löschen
      
      // Subscriptions löschen
      await adminSupabase.from('user_subscriptions').delete().eq('user_id', userId);
      
      // Shared Lists löschen (wo der Benutzer Empfänger oder Besitzer ist)
      const { data: userLists } = await adminSupabase
        .from('shopping_lists')
        .select('id')
        .eq('user_id', userId);
      
      if (userLists && userLists.length > 0) {
        const listIds = userLists.map(list => list.id);
        
        // Shared Lists löschen, wo der Benutzer Besitzer ist
        await adminSupabase
          .from('shared_lists')
          .delete()
          .in('list_id', listIds);
        
        // List Items löschen
        await adminSupabase
          .from('shopping_list_items')
          .delete()
          .in('list_id', listIds);
      }
      
      // Shared Lists löschen, wo Benutzer Empfänger ist
      await adminSupabase
        .from('shared_lists')
        .delete()
        .eq('shared_with_user_id', userId);
      
      // Shopping Lists löschen
      await adminSupabase
        .from('shopping_lists')
        .delete()
        .eq('user_id', userId);
      
      // Weitere Tabellen hier hinzufügen...
      
    } catch (dataError) {
      console.error('Error deleting user data:', dataError);
      // Wir versuchen trotzdem, den Benutzer zu löschen
    }

    // 2. Benutzer aus Auth-Tabelle löschen
    const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(userId);
    
    if (deleteError) {
      console.error('Error deleting user:', deleteError);
      return new Response(JSON.stringify({ error: 'Failed to delete user account' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
    
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
}); 