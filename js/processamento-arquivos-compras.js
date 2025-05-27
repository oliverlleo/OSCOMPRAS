/**
 * processamento-arquivos-compras.js
 * 
 * Funções específicas para processamento de compras
 * Este arquivo contém as funções para processamento de compras
 * do Sistema de Controle de Compras e Recebimento
 */

/**
 * Processa a compra dos itens selecionados
 * @param {Array} itensIds - Array com os IDs dos itens selecionados
 * @param {string} clienteId - ID do cliente
 * @param {string} fornecedor - Nome do fornecedor
 * @param {string} prazoEntrega - Prazo de entrega (formato YYYY-MM-DD)
 * @param {number|null} quantidadePersonalizada - Quantidade personalizada (opcional)
 * @returns {Promise} - Promise que resolve quando a compra for processada
 */
function processarCompra(itensIds, clienteId, fornecedor, prazoEntrega, quantidadePersonalizada = null) {
    return new Promise((resolve, reject) => {
        // Referência para o cliente no Firebase
        const clienteRef = firebase.database().ref(`clientes/${clienteId}`);
        
        // Busca os dados do cliente
        clienteRef.once('value')
            .then((snapshot) => {
                const cliente = snapshot.val();
                if (!cliente) {
                    reject('Cliente não encontrado');
                    return;
                }
                
                // Atualiza cada item selecionado
                const atualizacoes = {};
                
                // Para cada item selecionado
                const promises = itensIds.map(itemId => {
                    return firebase.database().ref(`clientes/${clienteId}/itens/${itemId}`).once('value')
                        .then((itemSnapshot) => {
                            const item = itemSnapshot.val();
                            if (!item) return;
                            
                            // Define a quantidade comprada
                            const quantidadeComprada = quantidadePersonalizada || item.necessidade || item.quantidade;
                            
                            // Atualiza o item
                            atualizacoes[`clientes/${clienteId}/itens/${itemId}/status`] = 'Comprado';
                            atualizacoes[`clientes/${clienteId}/itens/${itemId}/fornecedor`] = fornecedor;
                            atualizacoes[`clientes/${clienteId}/itens/${itemId}/prazoEntrega`] = prazoEntrega;
                            atualizacoes[`clientes/${clienteId}/itens/${itemId}/quantidadeComprada`] = quantidadeComprada;
                            atualizacoes[`clientes/${clienteId}/itens/${itemId}/dataCompra`] = new Date().toISOString();
                        });
                });
                
                // Aguarda todas as consultas de itens
                return Promise.all(promises).then(() => {
                    // Atualiza todos os itens de uma vez
                    return firebase.database().ref().update(atualizacoes);
                });
            })
            .then(() => {
                resolve('Compra processada com sucesso');
            })
            .catch((error) => {
                console.error('Erro ao processar compra:', error);
                reject('Erro ao processar compra: ' + error.message);
            });
    });
}

/**
 * Atualiza o prazo de entrega de um item
 * @param {string} itemId - ID do item
 * @param {string} clienteId - ID do cliente
 * @param {string} novoPrazo - Novo prazo de entrega (formato YYYY-MM-DD)
 * @returns {Promise} - Promise que resolve quando o prazo for atualizado
 */
function atualizarPrazoEntrega(itemId, clienteId, novoPrazo) {
    return new Promise((resolve, reject) => {
        // Referência para o item no Firebase
        const itemRef = firebase.database().ref(`clientes/${clienteId}/itens/${itemId}`);
        
        // Atualiza o prazo de entrega
        itemRef.update({
            prazoEntrega: novoPrazo
        })
        .then(() => {
            resolve('Prazo de entrega atualizado com sucesso');
        })
        .catch((error) => {
            console.error('Erro ao atualizar prazo de entrega:', error);
            reject('Erro ao atualizar prazo de entrega: ' + error.message);
        });
    });
}

/**
 * Finaliza o processo de compras para um cliente
 * @param {string} clienteId - ID do cliente
 * @returns {Promise} - Promise que resolve quando o processo for finalizado
 */
function finalizarCompras(clienteId) {
    return new Promise((resolve, reject) => {
        // Referência para o cliente no Firebase
        const clienteRef = firebase.database().ref(`clientes/${clienteId}`);
        
        // Atualiza o status do cliente
        clienteRef.update({
            status: 'Compras Concluídas',
            dataFinalizacaoCompras: new Date().toISOString()
        })
        .then(() => {
            resolve('Processo de compras finalizado com sucesso');
        })
        .catch((error) => {
            console.error('Erro ao finalizar processo de compras:', error);
            reject('Erro ao finalizar processo de compras: ' + error.message);
        });
    });
}
