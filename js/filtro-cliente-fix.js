/**
 * filtro-cliente-fix.js
 * 
 * Correção para o filtro de cliente na página de recebimento.
 * O problema ocorria porque o select de filtro usava o ID do cliente como valor,
 * enquanto a tabela exibe o nome do cliente, causando incompatibilidade na filtragem.
 * 
 * A lógica conflitante (sobrescrita de aplicarFiltros, mapeamento de clientes)
 * foi removida para centralizar a função aplicarFiltros em recebimento.js
 */

document.addEventListener("DOMContentLoaded", function() {
    console.log("filtro-cliente-fix.js carregado, mas a lógica de sobrescrita de aplicarFiltros e mapeamento de clientes foi removida.");
    
    // A função construirMapeamentoClientes, a sobrescrita de window.aplicarFiltros e o MutationObserver foram removidos daqui.
    // A lógica de filtro agora está centralizada em js/recebimento.js e compara nomes de clientes diretamente.

});
