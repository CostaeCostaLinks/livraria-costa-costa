// update-sw-version.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Configuração para ES Modules (para poder usar import/export)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Caminho para o seu arquivo sw.js (assumindo que está na pasta public)
const swPath = path.join(__dirname, 'public', 'sw.js');

try {
  // 1. Lê o conteúdo atual do sw.js
  let swContent = fs.readFileSync(swPath, 'utf8');

  // 2. Gera uma versão baseada na data e hora atual (ex: v-17162938472)
  const newVersion = `v-${Date.now()}`;

  // 3. Substitui a linha do CACHE_NAME usando Regex
  // Procura por: const CACHE_NAME = '...';
  const updatedContent = swContent.replace(
    /const CACHE_NAME = ['"].*['"];/,
    `const CACHE_NAME = 'Costa&Costa Library-${newVersion}';`
  );

  // 4. Salva o arquivo atualizado
  fs.writeFileSync(swPath, updatedContent, 'utf8');

  console.log(`✅ Service Worker atualizado para a versão: Costa&Costa Library-${newVersion}`);
} catch (error) {
  console.error('❌ Erro ao atualizar a versão do Service Worker:', error);
  process.exit(1);
}