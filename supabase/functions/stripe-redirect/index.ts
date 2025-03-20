import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

console.log("Stripe-Redirect-Funktion gestartet");

serve(async (req) => {
  try {
    // URL-Parameter auslesen
    const url = new URL(req.url);
    const redirectUrl = url.searchParams.get('redirect') || 'korbklick://subscription';
    const sessionId = url.searchParams.get('session_id');
    const isSuccessRedirect = url.searchParams.has('session_id') && url.searchParams.has('success');
    const isCancelRedirect = url.searchParams.has('canceled');
    
    console.log(`Received redirect request with URL: ${req.url}`);
    console.log(`Is success: ${isSuccessRedirect}, Is cancel: ${isCancelRedirect}`);
    console.log(`Redirect URL: ${redirectUrl}, Session ID: ${sessionId || 'none'}`);
    
    // Alle Parameter für die mobile App speziell aufbereiten
    const params = new URLSearchParams();
    
    // Wichtige Parameter hinzufügen
    if (sessionId) {
      params.append('session_id', sessionId);
    }
    
    if (isSuccessRedirect) {
      params.append('success', 'true');
    }
    
    if (isCancelRedirect) {
      params.append('canceled', 'true');
    }
    
    // Vollständige Redirect-URL erstellen
    const queryString = params.toString();
    const finalRedirectUrl = queryString 
      ? `${redirectUrl}?${queryString}`
      : redirectUrl;

    console.log(`Final redirect URL: ${finalRedirectUrl}`);
    
    // HTTP-Redirect zur App durchführen (302 ist für mobile Apps besser)
    return new Response(null, {
      status: 302,
      headers: {
        'Location': finalRedirectUrl,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    });
  } catch (error) {
    console.error("Error in stripe-redirect function:", error);
    // Im Fehlerfall trotzdem zur App zurückkehren mit einem Error-Parameter
    return new Response(null, {
      status: 302,
      headers: {
        'Location': 'korbklick://subscription?error=true',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    });
  }
}); 