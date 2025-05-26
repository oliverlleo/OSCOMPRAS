/**
 * filtros-fix.js
 * 
 * Correção para os filtros de cliente e lista na página de recebimento
 * Este script corrige o problema de filtragem considerando a diferença entre
 * o que aparece na interface (ex: "PVC") e o que está no Firebase (ex: "LPVC")
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('Inicializando correção dos filtros...');
    
    // Função para corrigir a filtragem de clientes e listas
    function corrigirFiltros() {
        // Verifica se a tabela DataTable está inicializada
        if (!window.tabelaItens) {
            console.error('Tabela de itens não inicializada, não é possível corrigir filtros');
            return;
        }
        
        // Sobrescreve a função de aplicação de filtros
        const aplicarFiltrosOriginal = window.aplicarFiltros;
        
        window.aplicarFiltros = function() {
            console.log('Aplicando filtros com correção...');
            
            try {
                // Obtém os valores dos filtros
                const filtroFornecedor = document.getElementById('filtroFornecedor')?.value || '';
                const filtroCliente = document.getElementById('filtroCliente')?.value || '';
                const filtroLista = document.getElementById('filtroLista')?.value || '';
                const filtroStatus = document.getElementById('filtroStatus')?.value || '';
                
                console.log('Filtros selecionados:', {
                    fornecedor: filtroFornecedor,
                    cliente: filtroCliente,
                    lista: filtroLista,
                    status: filtroStatus
                });
                
                // Aplica filtro personalizado à tabela
                window.tabelaItens.search('').columns().search('').draw();
                
                // Cria uma função de filtro personalizada para o DataTable
                $.fn.dataTable.ext.search.push(function(settings, data, dataIndex) {
                    // Verifica se é a tabela correta
                    if (settings.nTable.id !== 'tabelaItensRecebimento') {
                        return true;
                    }
                    
                    // Índices das colunas (ajustar conforme a estrutura da tabela)
                    const idxFornecedor = 11; // Coluna do fornecedor
                    const idxCliente = 9;    // Coluna do cliente
                    const idxLista = 12;     // Coluna da lista
                    const idxStatus = 14;    // Coluna do status
                    
                    // Obtém os valores das colunas
                    const fornecedor = data[idxFornecedor] || '';
                    const cliente = data[idxCliente] || '';
                    const lista = data[idxLista] || '';
                    const status = data[idxStatus] || '';
                    
                    // Verifica filtro de fornecedor
                    if (filtroFornecedor && fornecedor.toLowerCase() !== filtroFornecedor.toLowerCase()) {
                        return false;
                    }
                    
                    // Verifica filtro de cliente - CORREÇÃO: Comparação case-insensitive
                    if (filtroCliente && cliente.toLowerCase() !== filtroCliente.toLowerCase()) {
                        return false;
                    }
                    
                    // Verifica filtro de lista - CORREÇÃO: Considera o prefixo "L" e comparação parcial
                    if (filtroLista) {
                        // Remove "listas/" do início se existir
                        const listaLimpa = lista.replace('listas/', '');
                        
                        // Verifica se a lista contém o filtro (sem o "L")
                        // ou se a lista com "L" contém o filtro
                        const filtroSemL = filtroLista.replace(/^L/, '');
                        const listaComL = 'L' + listaLimpa;
                        
                        if (listaLimpa.toLowerCase() !== filtroLista.toLowerCase() && 
                            listaComL.toLowerCase() !== filtroLista.toLowerCase() &&
                            listaLimpa.toLowerCase() !== filtroSemL.toLowerCase()) {
                            return false;
                        }
                    }
                    
                    // Verifica filtro de status
                    if (filtroStatus && status.toLowerCase() !== filtroStatus.toLowerCase()) {
                        return false;
                    }
                    
                    return true;
                });
                
                // Redesenha a tabela com os filtros aplicados
                window.tabelaItens.draw();
                
                // Remove a função de filtro personalizada para não acumular
                $.fn.dataTable.ext.search.pop();
                
                console.log('Filtros aplicados com sucesso');
                
                // Atualiza o contador de itens visíveis
                const totalItensVisiveis = window.tabelaItens.page.info().recordsDisplay;
                console.log(`Total de itens visíveis após filtragem: ${totalItensVisiveis}`);
                
                // Se houver uma função original, chama-a também para manter compatibilidade
                if (typeof aplicarFiltrosOriginal === 'function') {
                    console.log('Chamando função original de aplicação de filtros');
                    // Não chamamos diretamente para evitar duplicação de filtros
                    // aplicarFiltrosOriginal();
                }
            } catch (error) {
                console.error('Erro ao aplicar filtros corrigidos:', error);
                
                // Em caso de erro, tenta chamar a função original
                if (typeof aplicarFiltrosOriginal === 'function') {
                    console.log('Tentando usar função original após erro');
                    aplicarFiltrosOriginal();
                }
            }
        };
        
        // Adiciona event listeners para os filtros
        const filtroFornecedor = document.getElementById('filtroFornecedor');
        const filtroCliente = document.getElementById('filtroCliente');
        const filtroLista = document.getElementById('filtroLista');
        const filtroStatus = document.getElementById('filtroStatus');
        
        // Remove event listeners existentes e adiciona novos
        if (filtroFornecedor) {
            filtroFornecedor.removeEventListener('change', aplicarFiltrosOriginal);
            filtroFornecedor.addEventListener('change', window.aplicarFiltros);
        }
        
        if (filtroCliente) {
            filtroCliente.removeEventListener('change', aplicarFiltrosOriginal);
            filtroCliente.addEventListener('change', window.aplicarFiltros);
        }
        
        if (filtroLista) {
            filtroLista.removeEventListener('change', aplicarFiltrosOriginal);
            filtroLista.addEventListener('change', window.aplicarFiltros);
        }
        
        if (filtroStatus) {
            filtroStatus.removeEventListener('change', aplicarFiltrosOriginal);
            filtroStatus.addEventListener('change', window.aplicarFiltros);
        }
        
        console.log('Correção dos filtros inicializada com sucesso');
    }
    
    // Aguarda um momento para garantir que a tabela já foi inicializada
    // setTimeout(corrigirFiltros, 1000);
});
