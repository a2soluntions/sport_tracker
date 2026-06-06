// Rota gerada de forma estática no build para capturar o ID/Timestamp único da versão
export const dynamic = 'force-static';

const BUILD_ID = Date.now().toString();

export async function GET() {
  return Response.json({ version: BUILD_ID });
}
