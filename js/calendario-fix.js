/**
 * Correção simples para o bug visual do calendário
 * Este script apenas adiciona um pequeno ajuste CSS para corrigir o bug visual
 * quando o modal do calendário é aberto
 */

document.addEventListener('DOMContentLoaded', function() {
    // Adiciona um estilo CSS para garantir que o calendário seja exibido corretamente no modal
    const style = document.createElement('style');
    style.textContent = `
        /* Correção para o bug visual do calendário no modal */
        #modalCalendarioCompleto .modal-body {
            overflow: hidden;
        }
        
        #calendarioCompleto {
            height: 600px !important;
            width: 100% !important;
            overflow: visible !important;
        }
        
        /* Garante que o calendário seja renderizado corretamente após mudança de mês */
        .fc-view-harness {
            height: auto !important;
            min-height: 500px;
        }
    `;
    document.head.appendChild(style);
    
    // Adiciona um listener para o evento de abertura do modal
    const modalCalendarioCompleto = document.getElementById('modalCalendarioCompleto');
    if (modalCalendarioCompleto) {
        modalCalendarioCompleto.addEventListener('shown.bs.modal', function() {
            // Força um redimensionamento da janela para corrigir o bug visual
            setTimeout(function() {
                window.dispatchEvent(new Event('resize'));
            }, 100);
        });
    }
});
