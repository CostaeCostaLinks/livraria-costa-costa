import { createClient } from '@supabase/supabase-js';

// Tenta pegar as variáveis de ambiente
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Verifica se as chaves existem e não são vazias
const isConfigured = 
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'https://sua-url.supabase.co';

// Cria o cliente. Se não tiver configuração, cria um cliente dummy para não quebrar a tela.
export const supabase = isConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient('https://placeholder.supabase.co', 'placeholder');

// Helper para saber se estamos em modo demonstração
// Se não estiver configurado, ativa o modo demo (dados falsos)
export const isDemoMode = !isConfigured;