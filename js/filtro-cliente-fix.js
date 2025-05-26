/**
 * filtro-cliente-fix.js
 * 
 * Correção para o filtro de cliente na página de recebimento.
 * O problema ocorre porque o select de filtro usa o ID do cliente como valor,
 * enquanto a tabela exibe o nome do cliente, causando incompatibilidade na filtragem.
 * 
 * Esta solução mantém a estrutura original do sistema e adiciona um mapeamento
 * entre IDs e nomes de clientes para garantir que a filtragem funcione corretamente.
 */

// document.addEventListener('DOMContentLoaded', function() {
    // Mapeamento entre IDs e nomes de clientes
    const clientesMap = {};
    
    // Função para construir o mapeamento de clientes
    function construirMapeamentoClientes() {
        const filtroCliente = document.getElementById('filtroCliente');
        if (!filtroCliente) return;
        
        // Limpa o mapeamento existente
        Object.keys(clientesMap).forEach(key => delete clientesMap[key]);
        
        // Constrói o novo mapeamento
        Array.from(filtroCliente.options).forEach(option => {
            if (option.value && option.textContent && option.value !== 'todos') {
                clientesMap[option.value] = option.textContent.trim();
            }
        });
        
        console.log('Mapeamento de clientes construído:', clientesMap);
    }
    
    // Sobrescreve a função de aplicar filtros original
    const originalAplicarFiltros = window.aplicarFiltros;
    
    window.aplicarFiltros = function() {
        try {
            console.log('Aplicando filtros com correção para cliente...');
            
            const filtroFornecedor = document.getElementById('filtroFornecedor');
            const filtroCliente = document.getElementById('filtroCliente');
            const filtroLista = document.getElementById('filtroLista');
            const filtroStatus = document.getElementById('filtroStatus');
            
            const valorFornecedor = filtroFornecedor ? filtroFornecedor.value : '';
            const valorClienteId = filtroCliente ? filtroCliente.value : '';
            const valorLista = filtroLista ? filtroLista.value : '';
            const valorStatus = filtroStatus ? filtroStatus.value : '';
            
            // Obtém o nome do cliente a partir do ID selecionado
            const valorClienteNome = clientesMap[valorClienteId] || '';
            
            console.log('Filtro de cliente:', {
                id: valorClienteId,
                nome: valorClienteNome
            });
            
            // Aplica os filtros à tabela
            if (window.tabelaItens) {
                // Filtro personalizado para cada coluna
                $.fn.dataTable.ext.search.push(
                    function(settings, data, dataIndex) {
                        // Verifica o fornecedor (coluna 11)
                        if (valorFornecedor && valorFornecedor !== 'todos' && data[11] !== valorFornecedor) {
                            return false;
                        }
                        
                        // Verifica o cliente (coluna 9)
                        if (valorClienteId && valorClienteId !== 'todos') {
                            // Usa o nome do cliente para comparação, com verificação case-insensitive
                            const clienteNaTabela = data[9].trim();
                            if (valorClienteNome && !clienteNaTabela.toLowerCase().includes(valorClienteNome.toLowerCase())) {
                                return false;
                            }
                        }
                        
                        // Verifica a lista (coluna 12)
                        if (valorLista && valorLista !== 'todas' && data[12] !== valorLista) {
                            return false;
                        }
                        
                        // Verifica o status (coluna 14)
                        if (valorStatus && valorStatus !== 'todos') {
                            if (valorStatus === 'Pendente' && !data[14].includes('Pendente')) {
                                return false;
                            } else if (valorStatus === 'Recebido' && !data[14].includes('Recebido')) {
                                return false;
                            } else if (valorStatus === 'Incorreto' && !data[14].includes('incorreta')) {
                                return false;
                            }
                        }
                        
                        return true;
                    }
                );
                
                // Redesenha a tabela com os filtros aplicados
                window.tabelaItens.draw();
                
                // Remove o filtro personalizado para não acumular
                $.fn.dataTable.ext.search.pop();
            }
            
            console.log('Filtros aplicados com sucesso');
        } catch (error) {
            console.error('Erro ao aplicar filtros:', error);
            // Em caso de erro, tenta usar a função original
            if (originalAplicarFiltros) {
                originalAplicarFiltros();
            }
        }
    };
    
    // Observa mudanças no select de clientes para atualizar o mapeamento
    const filtroCliente = document.getElementById('filtroCliente');
    if (filtroCliente) {
        // Constrói o mapeamento inicial
        construirMapeamentoClientes();
        
        // Adiciona um listener para quando o select for modificado (por exemplo, quando novos clientes forem adicionados)
        const observer = new MutationObserver(function(mutations) {
            construirMapeamentoClientes();
        });
        
        observer.observe(filtroCliente, { childList: true, subtree: true });
    }
    
    console.log('Correção do filtro de cliente aplicada com sucesso');
});
