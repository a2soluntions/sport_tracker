import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    // Listar chaves que contenham palavras-chave comuns para depurar
    const keys = Object.keys(process.env).filter(k => 
      k.toUpperCase().includes('SUPABASE') || 
      k.toUpperCase().includes('SERVICE') || 
      k.toUpperCase().includes('ROLE') || 
      k.toUpperCase().includes('KEY')
    );
    
    const envInfo = {};
    keys.forEach(k => {
      // Ocultar valores confidenciais por segurança, mas expor metadados para depuração
      const val = process.env[k];
      envInfo[k] = {
        exists: !!val,
        length: val ? val.length : 0,
        firstChars: val ? val.substring(0, 8) + '...' : 'none',
        lastChars: val ? '...' + val.substring(val.length - 8) : 'none'
      };
    });

    return NextResponse.json({
      success: true,
      env_keys: envInfo,
      vercel_env: process.env.VERCEL_ENV || 'não detectado',
      node_env: process.env.NODE_ENV || 'não detectado'
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
