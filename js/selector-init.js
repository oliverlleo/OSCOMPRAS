/**
 * Inicialização do selector moderno para filtros
 * Este arquivo contém a lógica para inicializar e configurar o selector moderno
 * que substitui os botões de filtro na tela de Compras
 */

// Inicializar o Select2 e configurar o event listener para o filtro selector
document.addEventListener('DOMContentLoaded', function() {
    console.log('Inicializando selector moderno para filtros...');
    
    // Inicializar o Select2 quando o DOM estiver carregado
    if (typeof $ !== 'undefined' && typeof $.fn.select2 !== 'undefined') {
        try {
            // Inicializar o Select2 com tema bootstrap
            $('#filtroSelector').select2({
                theme: 'bootstrap-5',
                width: '100%',
                placeholder: 'Selecione uma lista para filtrar',
                allowClear: false
            });
            
            console.log('Select2 inicializado com sucesso');
            
            // Adicionar event listener para o selector
            $('#filtroSelector').on('change', function() {
                const listaFiltro = $(this).val();
                console.log(`Filtro selector alterado para: ${listaFiltro}`);
                
                // Chamar diretamente a função de filtro em vez de simular clique
                if (typeof aplicarFiltroLista === 'function') {
                    aplicarFiltroLista(listaFiltro);
                    console.log(`Função aplicarFiltroLista chamada com valor: ${listaFiltro}`);
                } else {
                    console.error('Função aplicarFiltroLista não encontrada!');
                    
                    // Fallback: tentar acionar o botão correspondente
                    const botaoFiltro = $(`.filtro-lista[data-lista="${listaFiltro}"]`);
                    if (botaoFiltro.length > 0) {
                        console.log('Usando fallback: clicando no botão correspondente');
                        botaoFiltro.click();
                    } else {
                        console.error(`Botão para lista ${listaFiltro} não encontrado!`);
                    }
                }
            });
            
            console.log('Event listener para selector configurado com sucesso');
        } catch (error) {
            console.error('Erro ao inicializar Select2:', error);
        }
    } else {
        console.error('jQuery ou Select2 não estão disponíveis!');
    }
});

// Função para sincronizar o selector com o filtro atual
function sincronizarSelectorComFiltro(lista) {
    console.log(`Sincronizando selector com filtro: ${lista}`);
    
    if ($('#filtroSelector').val() !== lista) {
        $('#filtroSelector').val(lista).trigger('change.select2');
        console.log(`Selector atualizado para: ${lista}`);
    }
}

// Sobrescrever a função aplicarFiltroLista para sincronizar o selector
const aplicarFiltroListaOriginal = window.aplicarFiltroLista;
window.aplicarFiltroLista = function(lista) {
    console.log(`Função aplicarFiltroLista sobrescrita chamada com: ${lista}`);
    
    // Chamar a função original
    if (typeof aplicarFiltroListaOriginal === 'function') {
        aplicarFiltroListaOriginal(lista);
    }
    
    // Sincronizar o selector
    sincronizarSelectorComFiltro(lista);
};
