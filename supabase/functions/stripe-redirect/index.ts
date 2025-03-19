import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

console.log("Stripe-Redirect-Funktion gestartet");

serve(async (req) => {
  // URL-Parameter auslesen
  const url = new URL(req.url);
  const redirectUrl = url.searchParams.get('redirect');
  
  // Alle ursprünglichen Parameter behalten
  const originalParams = Array.from(url.searchParams.entries())
    .filter(([key]) => key !== 'redirect')
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  
  // Vollständige Redirect-URL erstellen
  const finalRedirectUrl = redirectUrl ? 
    (originalParams ? `${redirectUrl}?${originalParams}` : redirectUrl) : 
    'korbklick://subscription';

  console.log(`Redirecting to: ${finalRedirectUrl}`);
  
  // HTTP-Redirect zur App durchführen
  return new Response(null, {
    status: 302,
    headers: {
      'Location': finalRedirectUrl,
      'Access-Control-Allow-Origin': '*',
    }
  });
}); 