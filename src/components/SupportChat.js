'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageCircle, X, Send, Bot, User, RefreshCw, 
  ExternalLink, Sparkles 
} from 'lucide-react';

export default function SupportChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const messagesEndRef = useRef(null);

  // Carregar histórico da sessão ao iniciar
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('support_chat_history');
      if (saved) {
        setMessages(JSON.parse(saved));
      } else {
        const welcomeMessage = {
          id: 'welcome',
          role: 'assistant',
          text: 'Olá! Sou o assistente virtual do **Sports EV Tracker**. Como posso te ajudar hoje? 🤖\n\nDigite sua dúvida abaixo ou clique em um dos tópicos rápidos para começarmos!'
        };
        setMessages([welcomeMessage]);
        sessionStorage.setItem('support_chat_history', JSON.stringify([welcomeMessage]));
      }
    }
  }, []);

  // Rolar para a última mensagem automaticamente
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const saveHistory = (newMessages) => {
    setMessages(newMessages);
    sessionStorage.setItem('support_chat_history', JSON.stringify(newMessages));
  };

  const sendMessage = async (textToSend) => {
    if (!textToSend.trim() || isTyping) return;

    const userMsg = {
      id: Date.now().toString(),
      role: 'user',
      text: textToSend.trim()
    };

    const updatedHistory = [...messages, userMsg];
    saveHistory(updatedHistory);
    setInputValue('');
    setIsTyping(true);

    try {
      const response = await fetch('/api/support/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedHistory })
      });

      if (response.ok) {
        const data = await response.json();
        const botMsg = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          text: data.response || 'Desculpe, não consegui processar a resposta.'
        };
        saveHistory([...updatedHistory, botMsg]);
      } else {
        throw new Error('Falha na resposta do servidor');
      }
    } catch (err) {
      console.error(err);
      const errorMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: 'Ocorreu um erro ao conectar com o servidor. Por favor, tente novamente ou fale com o nosso suporte humano! [SUPPORT_REDIRECT]'
      };
      saveHistory([...updatedHistory, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      sendMessage(inputValue);
    }
  };

  const handleQuickQuestion = (question) => {
    sendMessage(question);
  };

  const clearChat = () => {
    const welcome = {
      id: 'welcome',
      role: 'assistant',
      text: 'Histórico limpo! Como posso te ajudar hoje? 🤖'
    };
    saveHistory([welcome]);
  };

  // Formatar texto Markdown simples (negrito, links, quebra de linha)
  const formatMessageText = (text) => {
    // Limpar a tag de transbordo da exibição do texto
    let cleanText = text.replace(/\[SUPPORT_REDIRECT\]/g, '');
    
    // Substituir quebras de linha
    return cleanText.split('\n').map((paragraph, index) => {
      // Formatar negrito (**texto**)
      const boldRegex = /\*\*(.*?)\*\*/g;
      const parts = [];
      let lastIndex = 0;
      let match;

      while ((match = boldRegex.exec(paragraph)) !== null) {
        if (match.index > lastIndex) {
          parts.push(paragraph.substring(lastIndex, match.index));
        }
        parts.push(<strong key={match.index} style={{ color: '#fff', fontWeight: 'bold' }}>{match[1]}</strong>);
        lastIndex = boldRegex.lastIndex;
      }

      if (lastIndex < paragraph.length) {
        parts.push(paragraph.substring(lastIndex));
      }

      return (
        <p key={index} style={{ margin: '0 0 8px 0', lineHeight: 1.4 }}>
          {parts.length > 0 ? parts : paragraph}
        </p>
      );
    });
  };

  // Link para redirecionamento do suporte humano (aponta para o WhatsApp cadastrado)
  const supportLink = "https://wa.me/5534998408962";

  return (
    <>
      {/* Botão Flutuante (Minimizado) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="pulseGlow"
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #ff9800, #ff5722)',
            border: 'none',
            color: '#000',
            cursor: 'pointer',
            boxShadow: '0 6px 20px rgba(255, 152, 0, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.1) rotate(5deg)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1) rotate(0deg)'; }}
          title="Falar com Suporte"
        >
          <MessageCircle size={28} />
        </button>
      )}

      {/* Janela do Chat Aberto */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '360px',
          height: '500px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, rgba(14, 14, 18, 0.98), rgba(20, 20, 28, 0.98))',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 99999,
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          animation: 'chatSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          color: '#fff',
          overflow: 'hidden'
        }}>
          {/* Cabeçalho */}
          <div style={{
            padding: '14px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            background: 'rgba(255,255,255,0.02)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ position: 'relative' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'rgba(255, 152, 0, 0.1)',
                  border: '1px solid rgba(255, 152, 0, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ff9800'
                }}>
                  <Bot size={20} />
                </div>
                <span style={{
                  position: 'absolute',
                  bottom: '0',
                  right: '0',
                  width: '9px',
                  height: '9px',
                  borderRadius: '50%',
                  background: '#4caf50',
                  border: '2px solid #000'
                }} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  A2 Suporte <Sparkles size={12} color="#ff9800" />
                </h4>
                <span style={{ fontSize: '0.72rem', color: '#ff9800', fontWeight: 'bold' }}>Assistente de IA</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button 
                onClick={clearChat}
                style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', padding: '4px', transition: 'color 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#888'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#555'}
                title="Limpar Conversa"
              >
                <RefreshCw size={14} />
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', fontSize: '1.2rem', padding: '4px' }}
                title="Fechar"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Lista de Mensagens */}
          <div style={{
            flex: 1,
            padding: '16px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }} className="no-scrollbar">
            {messages.map((msg) => {
              const isBot = msg.role === 'assistant';
              const showSupportBtn = isBot && msg.text.includes('[SUPPORT_REDIRECT]');

              return (
                <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: isBot ? 'flex-start' : 'flex-end',
                    alignItems: 'flex-start',
                    gap: '8px'
                  }}>
                    {isBot && (
                      <div style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        background: 'rgba(255, 152, 0, 0.08)',
                        border: '1px solid rgba(255, 152, 0, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ff9800',
                        marginTop: '2px',
                        flexShrink: 0
                      }}>
                        <Bot size={14} />
                      </div>
                    )}
                    <div style={{
                      maxWidth: '80%',
                      background: isBot ? 'rgba(255, 255, 255, 0.04)' : 'linear-gradient(135deg, #ff9800, #ff5722)',
                      color: isBot ? '#ccc' : '#000',
                      border: isBot ? '1px solid rgba(255,255,255,0.06)' : 'none',
                      padding: '10px 12px',
                      borderRadius: isBot ? '0 12px 12px 12px' : '12px 0 12px 12px',
                      fontSize: '0.82rem',
                      fontWeight: isBot ? 'normal' : '500',
                      boxShadow: isBot ? 'none' : '0 4px 10px rgba(255, 87, 34, 0.15)'
                    }}>
                      {formatMessageText(msg.text)}
                    </div>
                  </div>

                  {/* Renderizar botão de suporte humano (Se a tag estiver presente na resposta do bot) */}
                  {showSupportBtn && (
                    <a
                      href={supportLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="pulseGreen"
                      style={{
                        marginLeft: '34px',
                        alignSelf: 'flex-start',
                        background: 'linear-gradient(135deg, #00e676, #00b0ff)',
                        color: '#000',
                        fontWeight: 'bold',
                        fontSize: '0.8rem',
                        textDecoration: 'none',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 12px rgba(0, 230, 118, 0.3)',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
                    >
                      <ExternalLink size={12} /> Falar com Suporte Humano
                    </a>
                  )}
                </div>
              );
            })}

            {/* Animação "Bot digitando..." */}
            {isTyping && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: 'rgba(255, 152, 0, 0.08)',
                  border: '1px solid rgba(255, 152, 0, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ff9800',
                  flexShrink: 0
                }}>
                  <Bot size={14} />
                </div>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  padding: '10px 14px',
                  borderRadius: '0 12px 12px 12px',
                  display: 'flex',
                  gap: '4px',
                  alignItems: 'center'
                }}>
                  <span className="chat-dot" />
                  <span className="chat-dot" />
                  <span className="chat-dot" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Atalhos Rápidos de FAQ */}
          {messages.length === 1 && (
            <div style={{
              padding: '8px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              borderTop: '1px solid rgba(255,255,255,0.03)',
              background: 'rgba(0,0,0,0.2)'
            }}>
              <span style={{ fontSize: '0.68rem', color: '#ff9800', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Dúvidas Frequentes:</span>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {[
                  'O que é expectativa +EV?',
                  'Como ativar o Telegram VIP?',
                  'Gestão de banca recomendada',
                  'Falar com um humano'
                ].map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleQuickQuestion(q)}
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: '#bbb',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 152, 0, 0.1)'; e.currentTarget.style.borderColor = 'rgba(255, 152, 0, 0.3)'; e.currentTarget.style.color = '#ff9800'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#bbb'; }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Rodapé - Caixa de Entrada */}
          <div style={{
            padding: '12px',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            background: 'rgba(0, 0, 0, 0.3)',
            display: 'flex',
            gap: '8px',
            alignItems: 'center'
          }}>
            <input
              type="text"
              placeholder="Digite sua dúvida..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={isTyping}
              style={{
                flex: 1,
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#fff',
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(255, 152, 0, 0.4)'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'}
            />
            <button
              onClick={() => sendMessage(inputValue)}
              disabled={isTyping || !inputValue.trim()}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: inputValue.trim() && !isTyping ? '#ff9800' : 'rgba(255,255,255,0.03)',
                border: 'none',
                color: inputValue.trim() && !isTyping ? '#000' : '#444',
                cursor: inputValue.trim() && !isTyping ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
