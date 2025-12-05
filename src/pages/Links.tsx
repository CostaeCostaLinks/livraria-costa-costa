import { Button } from "@/components/ui/button";
import { 
  BookOpen, 
  Instagram, 
  Linkedin, 
  Facebook, 
  GraduationCap, 
  Library, 
  MessageCircle, 
  Share2,
  ExternalLink,
  Smartphone
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function LinksPage() {
  // Configuração da Imagem de Banner
  // Coloque uma imagem chamada 'banner.jpg' na sua pasta /public
  const bannerUrl = "/banner.jpg"; 

  const links = [
    {
      title: "Costa & Costa Library",
      subtitle: "Acesse nossa livraria digital exclusiva",
      url: "/library",
      icon: <Library className="h-7 w-7" />,
      featured: true, // Destaque Dourado
    },
    {
      title: "O Método VAP",
      subtitle: "Curso de Vendas de Alta Performance",
      url: "https://metodovap.fipei.com.br/",
      icon: <GraduationCap className="h-6 w-6" />,
    },
    {
      title: "Livro Impresso",
      subtitle: "O Mapa das Cicatrizes (UICLAP)",
      url: "https://loja.uiclap.com/titulo/ua132166/",
      icon: <BookOpen className="h-6 w-6" />,
    },
    {
      title: "Livro Digital (Kindle)",
      subtitle: "O Mapa das Cicatrizes (Amazon)",
      url: "https://www.amazon.com/dp/B0G2MG1569",
      icon: <Smartphone className="h-6 w-6" />,
    },
    {
      title: "Instagram",
      url: "https://www.instagram.com/cleverson.costaoficial",
      icon: <Instagram className="h-6 w-6" />,
    },
    {
      title: "WhatsApp Profissional",
      url: "https://wa.me/message/MO2XPDVODOQ7D1",
      icon: <MessageCircle className="h-6 w-6" />,
    },
    {
      title: "Canal no WhatsApp",
      url: "https://whatsapp.com/channel/0029VbBzfpfCnA81XPOYur2f",
      icon: <MessageCircle className="h-6 w-6" />,
    },
    {
      title: "LinkedIn",
      url: "https://www.linkedin.com/in/cl%C3%A9verson-costa-78a1b8211",
      icon: <Linkedin className="h-6 w-6" />,
    },
    {
      title: "Facebook",
      url: "https://www.facebook.com/share/1FwQ4y6uWV/",
      icon: <Facebook className="h-6 w-6" />,
    },
  ];

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Cleverson Costa - Links",
          text: "Conheça o trabalho de Cleverson Costa: Neurociência, Vendas e Comportamento.",
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert("Link copiado para a área de transferência!");
      }
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  return (
    // Fundo forçado para Dark Navy
    <div className="min-h-screen bg-slate-950 text-white relative overflow-x-hidden pb-20 selection:bg-yellow-500/30">
      
      {/* === BANNER (NOVO) === */}
      <div className="absolute top-0 left-0 w-full h-48 md:h-64 z-0">
        {/* Imagem do Banner */}
        <img 
          src={bannerUrl} 
          alt="Banner de Fundo" 
          className="w-full h-full object-cover opacity-60"
          onError={(e) => e.currentTarget.style.display = 'none'} // Se não tiver imagem, esconde
        />
        
        {/* Overlay Escuro para o texto aparecer melhor */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-950" />
        
        {/* Degradê na base para fundir com a página */}
        <div className="absolute bottom-0 w-full h-32 bg-gradient-to-t from-slate-950 to-transparent" />
      </div>

      {/* Background Glow (Efeito Dourado Premium) */}
      <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-blue-900/20 rounded-full blur-[120px] pointer-events-none z-0" />

      {/* Container Principal - Ajustado padding-top (pt-24) para compensar o banner */}
      <div className="container max-w-lg mx-auto px-6 pt-24 md:pt-32 pb-16 relative z-10 flex flex-col items-center">
        
        {/* === HEADER DO PERFIL === */}
        <div className="flex flex-col items-center text-center mb-10 w-full">
          
          {/* Foto de Perfil */}
          <div className="relative mb-7 group">
            <div className="absolute -inset-1 bg-gradient-to-br from-yellow-400 to-yellow-700 rounded-full blur opacity-40 group-hover:opacity-70 transition duration-1000"></div>
            
            <Avatar className="w-40 h-40 md:w-48 md:h-48 border-4 border-yellow-400 shadow-2xl relative z-10 bg-slate-950">
              <AvatarImage src="/cleverson-profile.jpg" alt="Cléverson Costa" className="object-cover" />
              <AvatarFallback className="bg-slate-800 text-yellow-400 text-3xl font-serif">CC</AvatarFallback>
            </Avatar>
          </div>
          
          {/* Nome e Título */}
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-white mb-3 tracking-tight drop-shadow-lg">
            Cleverson Costa
          </h1>
          <p className="text-base md:text-lg text-slate-300 font-medium max-w-xs leading-relaxed">
            Comportamento Humano • Neurociência • PNL • Vendas
          </p>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleShare}
            className="mt-4 text-yellow-500 hover:text-yellow-400 hover:bg-yellow-500/10 gap-2 rounded-full px-6 border border-yellow-500/20"
          >
            <Share2 className="h-4 w-4" /> Compartilhar
          </Button>
        </div>

        {/* === LISTA DE LINKS (BOTÕES ARREDONDADOS) === */}
        <div className="w-full max-w-sm mx-auto space-y-4">
          {links.map((link, index) => (
            <a
              key={index}
              href={link.url}
              target={link.url.startsWith('/') ? "_self" : "_blank"}
              rel="noopener noreferrer"
              className="block group"
            >
              <div 
                className={`
                  relative overflow-hidden rounded-full p-1 transition-all duration-300 transform hover:scale-[1.02]
                  ${link.featured 
                    ? 'bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 shadow-lg shadow-yellow-500/20' 
                    : 'bg-gradient-to-r from-slate-800 to-slate-800 hover:from-slate-700 hover:to-yellow-300 border border-yellow-500 hover:border-slate-500'}
                `}
              >
                <div className={`
                    flex items-center gap-4 px-5 py-4 rounded-full h-full
                    ${link.featured ? 'bg-transparent text-slate-950' : 'bg-slate-900/50 backdrop-blur-sm text-white'}
                `}>
                  
                  {/* Ícone */}
                  <div className={`shrink-0 ${link.featured ? 'text-slate-900' : 'text-yellow-500 group-hover:text-white transition-colors'}`}>
                    {link.icon}
                  </div>

                  {/* Textos */}
                  <div className="flex-1 min-w-0 text-center flex flex-col justify-center">
                    <h3 className={`font-bold truncate pr-2 ${link.featured ? 'text-lg md:text-xl' : 'text-lg md:text-lg text-slate-100'}`}>
                      {link.title}
                    </h3>
                    {link.subtitle && (
                      <p className={`text-xs truncate ${link.featured ? 'text-slate-800 font-medium' : 'text-slate-400 group-hover:text-slate-300'}`}>
                        {link.subtitle}
                      </p>
                    )}
                  </div>

                  {/* Seta */}
                  <ExternalLink className={`h-5 w-5 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all ${link.featured ? 'text-slate-900' : 'text-slate-500'}`} />
                </div>
              </div>
            </a>
          ))}
        </div>

        {/* Footer Discreto */}
        <div className="mt-16 text-center">
          <p className="text-sm font-serif text-slate-500 flex items-center justify-center gap-2">
            <span className="w-8 h-[1px] bg-slate-700"></span>
             Costa & Costa Library
            <span className="w-8 h-[1px] bg-slate-700"></span>
          </p>
        </div>
      </div>
    </div>
  );
}