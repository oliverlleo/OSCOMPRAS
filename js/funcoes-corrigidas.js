/**
 * Processa a compra dos itens selecionados
 * @param {Array} itensSelecionados - Array de objetos {index, realId} dos itens selecionados
 * @param {string} clienteId - ID do cliente
 * @param {string} fornecedor - Nome do fornecedor
 * @param {string} prazoEntrega - Prazo de entrega (formato YYYY-MM-DD)
 * @param {number|null} quantidadePersonalizada - Quantidade personalizada (opcional)
 * @returns {Promise} - Promise com o resultado da operação
 */
function processarCompra(itensSelecionados, clienteId, fornecedor, prazoEntrega, quantidadePersonalizada = null) {
    console.log('Processando compra:', {
        itensSelecionados,
        clienteId,
        fornecedor,
        prazoEntrega,
        quantidadePersonalizada
    });
    
    return new Promise((resolve, reject) => {
        // Verificar parâmetros
        if (!itensSelecionados || itensSelecionados.length === 0) {
            reject('Nenhum item selecionado');
            return;
        }
        
        if (!clienteId) {
            reject('Cliente não especificado');
            return;
        }
        
        if (!fornecedor) {
            reject('Fornecedor não especificado');
            return;
        }
        
        if (!prazoEntrega) {
            reject('Prazo de entrega não especificado');
            return;
        }
        
        // CORREÇÃO: Salvar a data como string no formato brasileiro (DD/MM/YYYY)
        const prazoPartes = prazoEntrega.split('-');
        if (prazoPartes.length !== 3) {
            reject('Formato de data inválido. Use YYYY-MM-DD');
            return;
        }
        const prazoFormatado = `${prazoPartes[2]}/${prazoPartes[1]}/${prazoPartes[0]}`;
        
        // Verificar se dbRef está disponível
        if (!window.dbRef || !window.dbRef.projetos) {
            reject('Referência ao banco de dados não disponível');
            return;
        }
        
        // Referência ao projeto do cliente
        const projetoRef = window.dbRef.projetos.child(clienteId);
        
        // Buscar os dados atuais do projeto
        projetoRef.once('value')
            .then((snapshot) => {
                const projeto = snapshot.val();
                
                if (!projeto) {
                    reject('Projeto não encontrado');
                    return;
                }
                
                // Preparar as atualizações
                const updates = {};
                let atualizacoesRealizadas = false;
                
                // Para cada item selecionado
                itensSelecionados.forEach(itemSelecionado => {
                    // CORREÇÃO: Usar o ID real do item ou o caminho completo
                    const itemIndex = itemSelecionado.index;
                    const itemRealId = itemSelecionado.realId;
                    
                    // Obter o item do array todosItens usando o índice
                    const item = todosItens[itemIndex];
                    
                    if (!item) {
                        console.warn(`Item ${itemIndex} não encontrado no array todosItens`);
                        return;
                    }
                    
                    console.log(`Processando item ${itemIndex} (ID real: ${itemRealId}), caminho: ${item.caminho}`);
                    
                    // Determinar o caminho correto para o item no Firebase
                    let itemPath;
                    if (item.caminho) {
                        // Se o item tem um caminho definido, usar esse caminho
                        itemPath = item.caminho;
                    } else if (itemRealId && itemRealId !== itemIndex) {
                        // Se o item tem um ID real diferente do índice, usar esse ID
                        itemPath = `itens/${itemRealId}`;
                    } else {
                        // Caso contrário, usar o ID do array como fallback
                        itemPath = `itens/${itemIndex}`;
                    }
                    
                    // Calcular a quantidade a comprar
                    let quantidadeComprar;
                    
                    if (quantidadePersonalizada !== null) {
                        // Se foi definida uma quantidade personalizada, distribuir proporcionalmente
                        const necessidadeTotal = itensSelecionados.reduce((total, itemSel) => {
                            const itemAtual = todosItens[itemSel.index];
                            if (itemAtual) {
                                const necessidadeItem = parseInt(itemAtual.necessidade || 0);
                                return total + (necessidadeItem > 0 ? necessidadeItem : 0);
                            }
                            return total;
                        }, 0);
                        
                        const necessidadeItem = parseInt(item.necessidade || 0);
                        
                        if (necessidadeTotal > 0 && necessidadeItem > 0) {
                            // Distribuir proporcionalmente
                            quantidadeComprar = Math.round((necessidadeItem / necessidadeTotal) * quantidadePersonalizada);
                        } else {
                            quantidadeComprar = 0;
                        }
                    } else {
                        // Se não foi definida uma quantidade personalizada, comprar a necessidade
                        // CORREÇÃO: Usar o campo necessidade diretamente em vez de calcular
                        const necessidade = parseInt(item.necessidade || 0);
                        quantidadeComprar = necessidade > 0 ? necessidade : 0;
                    }
                    
                    // Se não há quantidade a comprar, pular
                    if (quantidadeComprar <= 0) {
                        console.warn(`Item ${itemIndex} não tem quantidade a comprar`);
                        return;
                    }
                    
                    // Atualizar a quantidade comprada
                    const quantidadeCompradaAtual = parseInt(item.quantidadeComprada || 0);
                    const novaQuantidadeComprada = quantidadeCompradaAtual + quantidadeComprar;
                    
                    // CORREÇÃO: Forçar a atualização do status independentemente do status atual
                    // Determinar o novo status com base no status atual
                    let novoStatus;
                    if (item.status && item.status.toLowerCase().includes('empenho')) {
                        novoStatus = 'Empenho/Comprado';
                    } else {
                        novoStatus = 'Comprado';
                    }
                    
                    console.log(`Atualizando status de "${item.status}" para "${novoStatus}"`);
                    
                    // Registrar a compra
                    updates[`${itemPath}/quantidadeComprada`] = novaQuantidadeComprada;
                    updates[`${itemPath}/fornecedor`] = fornecedor;
                    // CORREÇÃO: Salvar a data como string formatada em vez de timestamp
                    updates[`${itemPath}/prazoEntrega`] = prazoFormatado;
                    updates[`${itemPath}/dataCompra`] = new Date().toLocaleDateString('pt-BR');
                    updates[`${itemPath}/status`] = novoStatus; // Atualizar o status
                    
                    console.log(`Item ${itemIndex}: Comprado ${quantidadeComprar} unidades (total: ${novaQuantidadeComprada}), caminho: ${itemPath}, novo status: ${novoStatus}`);
                    atualizacoesRealizadas = true;
                });
                
                // Se não há atualizações, retornar
                if (!atualizacoesRealizadas) {
                    reject('Nenhum item para atualizar');
                    return;
                }
                
                console.log('Atualizações a serem aplicadas:', updates);
                
                // Aplicar as atualizações
                return projetoRef.update(updates);
            })
            .then(() => {
                console.log('Compra registrada com sucesso');
                resolve('Compra registrada com sucesso');
            })
            .catch((error) => {
                console.error('Erro ao processar compra:', error);
                reject(error.message);
            });
    });
}

/**
 * Atualiza o prazo de entrega de um item
 * @param {string} itemPath - Caminho completo do item no Firebase
 * @param {string} clienteId - ID do cliente
 * @param {string} novoPrazo - Novo prazo de entrega (formato YYYY-MM-DD)
 * @returns {Promise} - Promise com o resultado da operação
 */
function atualizarPrazoEntrega(itemPath, clienteId, novoPrazo) {
    console.log('Atualizando prazo de entrega:', {
        itemPath,
        clienteId,
        novoPrazo
    });
    
    return new Promise((resolve, reject) => {
        // Verificar parâmetros
        if (!itemPath) {
            reject('Caminho do item não especificado');
            return;
        }
        
        if (!clienteId) {
            reject('Cliente não especificado');
            return;
        }
        
        if (!novoPrazo) {
            reject('Prazo não especificado');
            return;
        }
        
        // CORREÇÃO: Converter para formato brasileiro (DD/MM/YYYY)
        const prazoPartes = novoPrazo.split('-');
        if (prazoPartes.length !== 3) {
            reject('Formato de data inválido. Use YYYY-MM-DD');
            return;
        }
        const prazoFormatado = `${prazoPartes[2]}/${prazoPartes[1]}/${prazoPartes[0]}`;
        
        // Verificar se dbRef está disponível
        if (!window.dbRef || !window.dbRef.projetos) {
            reject('Referência ao banco de dados não disponível');
            return;
        }
        
        // Referência ao item usando o caminho completo
        const itemRef = window.dbRef.projetos.child(clienteId).child(itemPath);
        
        // Atualizar o prazo
        itemRef.update({
            prazoEntrega: prazoFormatado
        })
            .then(() => {
                console.log('Prazo atualizado com sucesso');
                resolve('Prazo atualizado com sucesso');
            })
            .catch((error) => {
                console.error('Erro ao atualizar prazo:', error);
                reject(error.message);
            });
    });
}
