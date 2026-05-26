import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

export async function POST() {
  return new Promise((resolve) => {
    const rootDir = path.resolve(process.cwd(), '..');
    const venvPython = path.join(rootDir, 'venv', 'Scripts', 'python.exe');
    const scriptPath = path.join(rootDir, 'main.py');
    
    let command = `python "${scriptPath}"`;
    if (fs.existsSync(venvPython)) {
      command = `"${venvPython}" "${scriptPath}"`;
    }
    
    console.log(`[API Scraper] Executando comando: ${command}`);
    
    exec(command, { cwd: rootDir }, (error, stdout, stderr) => {
      if (error) {
        console.error(`[API Scraper] Erro de execução: ${error.message}`);
        console.error(`[API Scraper] stderr: ${stderr}`);
        resolve(NextResponse.json({ 
          error: 'Falha ao executar o Scraper.', 
          details: error.message,
          stderr: stderr 
        }, { status: 500 }));
        return;
      }
      
      console.log(`[API Scraper] stdout: ${stdout}`);
      
      resolve(NextResponse.json({
        success: true,
        message: 'Ciclo do Scraper e Análise +EV finalizado com sucesso!',
        stdout: stdout
      }));
    });
  });
}
