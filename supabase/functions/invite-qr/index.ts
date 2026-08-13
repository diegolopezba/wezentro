import QRCode from 'npm:qrcode@1.5.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Public QR image endpoint for frictionless invite tickets.
 * GET /invite-qr?token=<qr_code_token>  ->  image/png
 * The token is only meaningful to the event scanner, so it is safe to render.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const token = (url.searchParams.get('token') ?? '').trim()

  if (!token || token.length > 128 || !/^[A-Za-z0-9_-]+$/.test(token)) {
    return new Response(JSON.stringify({ error: 'invalid_token' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const buffer: Uint8Array = await QRCode.toBuffer(token, {
      type: 'png',
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 480,
      color: { dark: '#000000', light: '#FFFFFF' },
    })

    return new Response(buffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (e) {
    console.error('invite-qr error', e)
    return new Response(JSON.stringify({ error: 'qr_generation_failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
