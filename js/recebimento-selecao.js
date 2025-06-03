/**
 * recebimento-selecao.js
 * 
 * Script para implementar o fluxo de recebimento com seleção em lote e atualização de status
 * Complemento ao arquivo recebimento.js
 */

// Aguarda o carregamento completo do DOM
document.addEventListener('DOMContentLoaded', function() {
    console.log('Inicializando componentes de seleção em lote...');
    
    // Verifica se os elementos necessários existem antes de tentar manipulá-los
    if (document.getElementById('btnReceberSelecionados')) {
        try {
            melhorarSelecaoEmLote();
        } catch (error) {
            console.error('Erro ao melhorar seleção em lote:', error);
        }
    }
});

/**
 * Melhora a funcionalidade de seleção em lote na tabela
 */
function melhorarSelecaoEmLote() {
    console.log('Melhorando funcionalidade de seleção em lote...');
    
    try {
        // Verifica se o elemento pai existe
        const btnReceberSelecionados = document.getElementById('btnReceberSelecionados');
        if (!btnReceberSelecionados || !btnReceberSelecionados.parentNode) {
            console.error('Botão de receber selecionados não encontrado ou sem elemento pai');
            return;
        }
        
        // Adiciona botões adicionais para seleção em lote
        const botoesSelecao = document.createElement('div');
        botoesSelecao.className = 'btn-group me-2';
        botoesSelecao.innerHTML = `
            <button id="btnSelecionarTodos" class="btn btn-sm btn-outline-primary">
                <i class="fas fa-check-square"></i> Todos
            </button>
            <button id="btnSelecionarNenhum" class="btn btn-sm btn-outline-secondary">
                <i class="fas fa-square"></i> Nenhum
            </button>
            <button id="btnSelecionarFiltrados" class="btn btn-sm btn-outline-info">
                <i class="fas fa-filter"></i> Filtrados
            </button>
        `;
        
        // Adiciona os botões antes do botão de receber de forma segura
        btnReceberSelecionados.parentNode.insertBefore(botoesSelecao, btnReceberSelecionados);
        
        // Adiciona event listeners se os elementos existirem
        const btnSelecionarTodos = document.getElementById('btnSelecionarTodos');
        const btnSelecionarNenhum = document.getElementById('btnSelecionarNenhum');
        const btnSelecionarFiltrados = document.getElementById('btnSelecionarFiltrados');
        
        if (btnSelecionarTodos) {
            btnSelecionarTodos.addEventListener('click', selecionarTodosItens);
        }
        
        if (btnSelecionarNenhum) {
            btnSelecionarNenhum.addEventListener('click', selecionarNenhumItem);
        }
        
        if (btnSelecionarFiltrados) {
            btnSelecionarFiltrados.addEventListener('click', selecionarItensFiltrados);
        }
        
        // Adiciona contador de itens selecionados
        const contadorSelecao = document.createElement('span');
        contadorSelecao.id = 'contadorSelecao';
        contadorSelecao.className = 'badge bg-primary ms-2 align-middle';
        contadorSelecao.textContent = '0 selecionados';
        
        btnReceberSelecionados.parentNode.insertBefore(contadorSelecao, btnReceberSelecionados);
        
        // Modifica o modal de recebimento para incluir mais opções
        const modalRecebimento = document.getElementById('modalRecebimento');
        if (modalRecebimento) {
            melhorarModalRecebimento();
        } else {
            console.warn('Modal de recebimento não encontrado, pulando melhorias');
        }
        
        console.log('Funcionalidade de seleção em lote melhorada com sucesso');
    } catch (error) {
        console.error('Erro ao melhorar seleção em lote:', error);
    }
}

/**
 * Melhora o modal de recebimento com opções adicionais
 */
function melhorarModalRecebimento() {
    try {
        // Verifica se o modal body existe
        const modalBody = document.querySelector('#modalRecebimento .modal-body');
        if (!modalBody) {
            console.error('Modal body não encontrado');
            return;
        }
        
        // Verifica se o botão de confirmar existe
        const btnConfirmarRecebimento = document.getElementById('btnConfirmarRecebimento');
        if (!btnConfirmarRecebimento || !btnConfirmarRecebimento.parentNode) {
            console.error('Botão de confirmar recebimento não encontrado ou sem elemento pai');
            return;
        }
        
        // Adiciona campo para observações
        const areaObservacoes = document.createElement('div');
        areaObservacoes.className = 'mb-3';
        areaObservacoes.innerHTML = `
            <label for="inputObservacoes" class="form-label">Observações:</label>
            <textarea class="form-control" id="inputObservacoes" rows="3" placeholder="Observações sobre o recebimento"></textarea>
        `;
        
        // Adiciona campo para número da nota fiscal
        const areaNotaFiscal = document.createElement('div');
        areaNotaFiscal.className = 'mb-3';
        areaNotaFiscal.innerHTML = `
            <label for="inputNotaFiscal" class="form-label">Nota Fiscal:</label>
            <input type="text" class="form-control" id="inputNotaFiscal" placeholder="Número da nota fiscal">
        `;
        
        // Adiciona os campos ao modal de forma segura
        modalBody.appendChild(areaNotaFiscal);
        modalBody.appendChild(areaObservacoes);
        
        // Adiciona preview dos itens selecionados
        const areaPreviewItens = document.createElement('div');
        areaPreviewItens.className = 'mt-3';
        areaPreviewItens.innerHTML = `
            <h6>Itens selecionados:</h6>
            <div id="previewItensSelecionados" class="border p-2 rounded bg-light" style="max-height: 150px; overflow-y: auto;">
                <p class="text-muted">Nenhum item selecionado</p>
            </div>
        `;
        
        modalBody.appendChild(areaPreviewItens);
        
        console.log('Modal de recebimento melhorado com sucesso');
    } catch (error) {
        console.error('Erro ao melhorar modal de recebimento:', error);
    }
}

/**
 * Seleciona todos os itens da tabela
 */
function selecionarTodosItens() {
    try {
        const checkboxes = document.querySelectorAll('#tabelaItensRecebimento tbody input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = true;
            
            // Atualiza a classe 'selected' na linha
            const tr = checkbox.closest('tr');
            if (tr) {
                tr.classList.add('selected');
            }
        });
        
        // Marca o checkbox "Todos"
        const checkTodos = document.getElementById('checkTodos');
        if (checkTodos) {
            checkTodos.checked = true;
        }
        
        // Atualiza o array de itens selecionados
        if (typeof window.atualizarItensSelecionados === 'function') {
            window.atualizarItensSelecionados();
        }
        
        // Atualiza o estado do botão de receber
        if (typeof window.atualizarBotaoReceber === 'function') {
            window.atualizarBotaoReceber();
        }
        
        // Atualiza o contador de seleção
        atualizarContadorSelecao();
        
        // Exibe notificação
        if (typeof window.mostrarNotificacao === 'function') {
            window.mostrarNotificacao(`${checkboxes.length} itens selecionados`, 'info');
        }
        
        console.log(`${checkboxes.length} itens selecionados`);
    } catch (error) {
        console.error('Erro ao selecionar todos os itens:', error);
    }
}

/**
 * Desmarca todos os itens da tabela
 */
function selecionarNenhumItem() {
    try {
        const checkboxes = document.querySelectorAll('#tabelaItensRecebimento tbody input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
            
            // Atualiza a classe 'selected' na linha
            const tr = checkbox.closest('tr');
            if (tr) {
                tr.classList.remove('selected');
            }
        });
        
        // Desmarca o checkbox "Todos"
        const checkTodos = document.getElementById('checkTodos');
        if (checkTodos) {
            checkTodos.checked = false;
        }
        
        // Atualiza o array de itens selecionados
        if (typeof window.atualizarItensSelecionados === 'function') {
            window.atualizarItensSelecionados();
        }
        
        // Atualiza o estado do botão de receber
        if (typeof window.atualizarBotaoReceber === 'function') {
            window.atualizarBotaoReceber();
        }
        
        // Atualiza o contador de seleção
        atualizarContadorSelecao();
        
        // Exibe notificação
        if (typeof window.mostrarNotificacao === 'function') {
            window.mostrarNotificacao('Nenhum item selecionado', 'info');
        }
        
        console.log('Nenhum item selecionado');
    } catch (error) {
        console.error('Erro ao desmarcar todos os itens:', error);
    }
}

/**
 * Seleciona apenas os itens filtrados na tabela
 */
function selecionarItensFiltrados() {
    try {
        // Primeiro, desmarca todos
        selecionarNenhumItem();
        
        // Verifica se a tabela está inicializada
        if (!window.tabelaItens) {
            console.error('Tabela de itens não inicializada');
            return;
        }
        
        // Seleciona apenas os itens visíveis após a filtragem
        const linhasVisiveis = window.tabelaItens.rows({ search: 'applied' }).nodes();
        
        linhasVisiveis.forEach(tr => {
            const checkbox = tr.querySelector('input[type="checkbox"]');
            if (checkbox) {
                checkbox.checked = true;
                tr.classList.add('selected');
            }
        });
        
        // Atualiza o array de itens selecionados
        if (typeof window.atualizarItensSelecionados === 'function') {
            window.atualizarItensSelecionados();
        }
        
        // Atualiza o estado do botão de receber
        if (typeof window.atualizarBotaoReceber === 'function') {
            window.atualizarBotaoReceber();
        }
        
        // Atualiza o contador de seleção
        atualizarContadorSelecao();
        
        // Exibe notificação
        if (typeof window.mostrarNotificacao === 'function') {
            window.mostrarNotificacao(`${linhasVisiveis.length} itens filtrados selecionados`, 'info');
        }
        
        console.log(`${linhasVisiveis.length} itens filtrados selecionados`);
    } catch (error) {
        console.error('Erro ao selecionar itens filtrados:', error);
    }
}

/**
 * Atualiza o contador de itens selecionados
 */
function atualizarContadorSelecao() {
    try {
        const contador = document.getElementById('contadorSelecao');
        if (contador && window.itensSelecionados) {
            contador.textContent = `${window.itensSelecionados.length} selecionados`;
        }
    } catch (error) {
        console.error('Erro ao atualizar contador de seleção:', error);
    }
}

/**
 * Atualiza o preview de itens selecionados no modal
 */
function atualizarPreviewItensSelecionados() {
    try {
        const previewContainer = document.getElementById('previewItensSelecionados');
        
        if (!previewContainer) {
            console.warn('Container de preview não encontrado');
            return;
        }
        
        if (!window.itensSelecionados || window.itensSelecionados.length === 0) {
            previewContainer.innerHTML = '<p class="text-muted">Nenhum item selecionado</p>';
            return;
        }
        
        // Limita a exibição a 5 itens para não sobrecarregar o modal
        const itensParaExibir = window.itensSelecionados.slice(0, 5);
        const itensRestantes = window.itensSelecionados.length - itensParaExibir.length;
        
        let html = '<ul class="list-group list-group-flush p-0">';
        
        itensParaExibir.forEach(item => {
            html += `
                <li class="list-group-item p-1 bg-light">
                    <small><strong>${item.codigo || 'N/A'}</strong> - ${(item.descricao || 'Sem descrição').substring(0, 30)}${(item.descricao || '').length > 30 ? '...' : ''}</small>
                </li>
            `;
        });
        
        if (itensRestantes > 0) {
            html += `
                <li class="list-group-item p-1 bg-light text-center">
                    <small>E mais ${itensRestantes} item(ns)...</small>
                </li>
            `;
        }
        
        html += '</ul>';
        
        previewContainer.innerHTML = html;
    } catch (error) {
        console.error('Erro ao atualizar preview de itens selecionados:', error);
    }
}

/**
 * Versão melhorada da função abrirModalRecebimento
 */
function abrirModalRecebimentoMelhorado() {
    try {
        // Verifica se há itens selecionados
        if (!window.itensSelecionados || window.itensSelecionados.length === 0) {
            if (typeof window.mostrarNotificacao === 'function') {
                window.mostrarNotificacao('Selecione pelo menos um item para receber.', 'warning');
            }
            return;
        }
        
        // Verifica se os elementos existem
        const inputDataRecebimento = document.getElementById('inputDataRecebimento');
        const checkQuantidadePersonalizada = document.getElementById('checkQuantidadePersonalizada');
        const inputQuantidade = document.getElementById('inputQuantidade');
        const areaQuantidadePersonalizada = document.getElementById('areaQuantidadePersonalizada');
        const inputObservacoes = document.getElementById('inputObservacoes');
        const inputNotaFiscal = document.getElementById('inputNotaFiscal');
        const quantidadeItensSelecionados = document.getElementById('quantidadeItensSelecionados');
        
        // Limpa os campos do modal
        if (inputDataRecebimento) {
            inputDataRecebimento.value = new Date().toLocaleDateString('pt-BR');
        }
        
        if (checkQuantidadePersonalizada) {
            checkQuantidadePersonalizada.checked = false;
        }
        
        if (inputQuantidade) {
            inputQuantidade.value = '';
        }
        
        if (areaQuantidadePersonalizada) {
            areaQuantidadePersonalizada.classList.add('d-none');
        }
        
        // Limpa os campos adicionais
        if (inputObservacoes) {
            inputObservacoes.value = '';
        }
        
        if (inputNotaFiscal) {
            inputNotaFiscal.value = '';
        }
        
        // Atualiza o contador de itens selecionados
        if (quantidadeItensSelecionados) {
            quantidadeItensSelecionados.textContent = window.itensSelecionados.length;
        }
        
        // Atualiza o preview de itens selecionados
        atualizarPreviewItensSelecionados();
        
        // Exibe o modal
        const modalRecebimento = document.getElementById('modalRecebimento');
        if (modalRecebimento && typeof bootstrap !== 'undefined') {
            const modal = new bootstrap.Modal(modalRecebimento);
            modal.show();
        }
    } catch (error) {
        console.error('Erro ao abrir modal de recebimento:', error);
    }
}

/**
 * Versão melhorada da função confirmarRecebimento
 */
function confirmarRecebimentoMelhorado() {
    try {
        // Verifica se há itens selecionados
        if (!window.itensSelecionados || window.itensSelecionados.length === 0) {
            if (typeof window.mostrarNotificacao === 'function') {
                window.mostrarNotificacao('Selecione pelo menos um item para receber.', 'warning');
            }
            return;
        }
        
        // Obtém os dados do formulário
        const inputDataRecebimento = document.getElementById('inputDataRecebimento');
        if (!inputDataRecebimento || !inputDataRecebimento.value) {
            if (typeof window.mostrarNotificacao === 'function') {
                window.mostrarNotificacao('Data de recebimento inválida.', 'warning');
            }
            return;
        }
        
        const dataRecebimentoStr = inputDataRecebimento.value;
        let dataRecebimento;
        
        // Tenta converter a data
        if (typeof flatpickr !== 'undefined' && typeof flatpickr.parseDate === 'function') {
            dataRecebimento = flatpickr.parseDate(dataRecebimentoStr, 'd/m/Y');
        } else {
            // Fallback para conversão manual
            const partes = dataRecebimentoStr.split('/');
            if (partes.length === 3) {
                dataRecebimento = new Date(partes[2], partes[1] - 1, partes[0]);
            } else {
                dataRecebimento = new Date(dataRecebimentoStr);
            }
        }
        
        if (isNaN(dataRecebimento)) {
            if (typeof window.mostrarNotificacao === 'function') {
                window.mostrarNotificacao('Data de recebimento inválida.', 'warning');
            }
            return;
        }
        
        // Verifica se a quantidade personalizada está ativada
        const checkQuantidadePersonalizada = document.getElementById('checkQuantidadePersonalizada');
        const inputQuantidade = document.getElementById('inputQuantidade');
        let quantidade = null;
        
        if (checkQuantidadePersonalizada && checkQuantidadePersonalizada.checked) {
            if (inputQuantidade) {
                quantidade = parseInt(inputQuantidade.value);
                if (isNaN(quantidade) || quantidade <= 0) {
                    if (typeof window.mostrarNotificacao === 'function') {
                        window.mostrarNotificacao('Quantidade inválida.', 'warning');
                    }
                    return;
                }
            }
        }
        
        // Obtém os dados adicionais
        const inputObservacoes = document.getElementById('inputObservacoes');
        const inputNotaFiscal = document.getElementById('inputNotaFiscal');
        const observacoes = inputObservacoes ? inputObservacoes.value : '';
        const notaFiscal = inputNotaFiscal ? inputNotaFiscal.value : '';
        
        // Cria um objeto com os dados do recebimento
        const recebimento = {
            data: dataRecebimento.getTime(),
            dataFormatada: dataRecebimentoStr,
            quantidade: quantidade,
            observacoes: observacoes,
            notaFiscal: notaFiscal,
            dataRegistro: Date.now()
        };
        
        // Exibe um indicador de carregamento
        const btnConfirmar = document.getElementById('btnConfirmarRecebimento');
        let textoOriginal = '';
        
        if (btnConfirmar) {
            textoOriginal = btnConfirmar.innerHTML;
            btnConfirmar.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processando...';
            btnConfirmar.disabled = true;
        }
        
        // Salva o recebimento para cada item selecionado
        const promessas = window.itensSelecionados.map(item => {
            return salvarRecebimentoMelhorado(item, recebimento);
        });
        
        // Aguarda todas as promessas serem resolvidas
        Promise.all(promessas)
            .then(resultados => {
                // Conta os resultados
                const sucessos = resultados.filter(r => r.sucesso).length;
                const falhas = resultados.filter(r => !r.sucesso).length;
                
                // Fecha o modal
                const modalRecebimento = document.getElementById('modalRecebimento');
                if (modalRecebimento && typeof bootstrap !== 'undefined') {
                    const modal = bootstrap.Modal.getInstance(modalRecebimento);
                    if (modal) {
                        modal.hide();
                    }
                }
                
                // Exibe mensagem de sucesso
                if (typeof window.mostrarNotificacao === 'function') {
                    if (falhas === 0) {
                        window.mostrarNotificacao(`${sucessos} itens recebidos com sucesso.`, 'success');
                    } else {
                        window.mostrarNotificacao(`${sucessos} itens recebidos com sucesso. ${falhas} falhas.`, 'warning');
                    }
                }
                
                // Recarrega os dados
                if (typeof window.carregarItensComprados === 'function') {
                    window.carregarItensComprados();
                }
                
                // Limpa a seleção
                window.itensSelecionados = [];
                
                if (typeof window.atualizarBotaoReceber === 'function') {
                    window.atualizarBotaoReceber();
                }
                
                atualizarContadorSelecao();
            })
            .catch(error => {
                console.error('Erro ao salvar recebimento:', error);
                if (typeof window.mostrarNotificacao === 'function') {
                    window.mostrarNotificacao('Erro ao salvar recebimento. Tente novamente.', 'danger');
                }
            })
            .finally(() => {
                // Restaura o botão
                if (btnConfirmar) {
                    btnConfirmar.innerHTML = textoOriginal;
                    btnConfirmar.disabled = false;
                }
            });
    } catch (error) {
        console.error('Erro ao confirmar recebimento:', error);
        if (typeof window.mostrarNotificacao === 'function') {
            window.mostrarNotificacao('Erro ao processar recebimento. Tente novamente.', 'danger');
        }
    }
}

/**
 * Versão melhorada da função salvarRecebimento
 */
function salvarRecebimentoMelhorado(item, recebimento) {
    return new Promise((resolve, reject) => {
        try {
            // Verifica se o Firebase está disponível
            if (!window.dbRef || !window.dbRef.projetos) {
                console.error('Referência ao Firebase não disponível');
                resolve({ sucesso: false, mensagem: 'Referência ao Firebase não disponível' });
                return;
            }

            // Verifica se o item tem todas as referências necessárias
            if (!item || !item.clienteId || !item.tipoProjeto || !item.nomeLista || typeof item.itemKey === 'undefined') {
                console.error('Item sem referências Firebase completas:', item);
                resolve({ sucesso: false, mensagem: 'Item sem referências Firebase completas' });
                return;
            }

            // Busca o item no Firebase
            const itemPathRef = window.dbRef.projetos
                .child(item.clienteId)
                .child(item.tipoProjeto)
                .child(item.nomeLista)
                .child(item.itemKey);

            itemPathRef.once('value')
                .then(snapshot => {
                    const itemData = snapshot.val();
                    if (!itemData) {
                        console.error('Item não encontrado no Firebase ao tentar salvar recebimento. Path:', itemPathRef.toString());
                        resolve({ sucesso: false, mensagem: 'Item não encontrado no Firebase ao tentar salvar recebimento' });
                        return;
                    }

                    // Se não foi especificada uma quantidade, usa a quantidade comprada
                    let quantidadeRecebidaFinal = (recebimento.quantidade === null) ? (itemData.quantidadeComprada || parseInt(itemData.quantidade) || 0) : recebimento.quantidade;

                    // Determina o status do recebimento
                    let status = 'Recebido'; // Default status
                    const quantidadeComprada = itemData.quantidadeComprada || parseInt(itemData.quantidade) || 0;

                    if (quantidadeRecebidaFinal < quantidadeComprada) {
                        status = 'Pendente'; // Ou 'Recebido Parcialmente'
                    } else if (quantidadeRecebidaFinal > quantidadeComprada) {
                        status = 'Entrega incorreta';
                    }
                    recebimento.status = status; // Add status to the recebimento object

                    // Salva o objeto 'recebimento' sob o nó do item
                    return itemPathRef.child('recebimento').set(recebimento)
                        .then(() => {
                            // Atualiza o status principal do item e a quantidade recebida
                            return itemPathRef.update({ status: recebimento.status, quantidadeRecebida: quantidadeRecebidaFinal });
                        });
                })
                .then(() => {
                    // Adiciona ao histórico de recebimentos
                    return adicionarHistoricoRecebimento(item, recebimento); // Passa o mesmo objeto item
                })
                .then(() => {
                    resolve({ sucesso: true });
                })
                .catch(error => {
                    console.error('Erro ao salvar recebimento no Firebase:', error);
                    resolve({ sucesso: false, mensagem: error.message });
                });
        } catch (error) {
            console.error('Erro ao processar salvamento de recebimento:', error);
            resolve({ sucesso: false, mensagem: error.message });
        }
    });
}

/**
 * Adiciona histórico de recebimentos para cada item
 */
function adicionarHistoricoRecebimento(item, recebimento) {
    return new Promise((resolve, reject) => {
        try {
            // Verifica se o Firebase está disponível
            if (!window.dbRef || !window.dbRef.projetos) {
                console.error('Referência ao Firebase não disponível para histórico');
                resolve(); // Resolve para não bloquear
                return;
            }

            // Verifica se o item tem todas as referências necessárias
            if (!item || !item.clienteId || !item.tipoProjeto || !item.nomeLista || typeof item.itemKey === 'undefined') {
                console.error('Item sem referências Firebase completas para histórico:', item);
                resolve(); // Resolve para não bloquear
                return;
            }

            // Cria uma entrada no histórico
            const entradaHistorico = {
                ...recebimento, // Inclui dados do recebimento (data, qtd, obs, nf, status)
                timestamp: Date.now() // Adiciona timestamp do registro do histórico
            };

            // Adiciona ao histórico do item
            window.dbRef.projetos
                .child(item.clienteId)
                .child(item.tipoProjeto)
                .child(item.nomeLista)
                .child(item.itemKey)
                .child('historicoRecebimento')
                .push(entradaHistorico)
                .then(() => {
                    console.log("Histórico de recebimento adicionado para item:", item.codigo);
                    resolve();
                })
                .catch(error => {
                    console.error('Erro ao adicionar histórico de recebimento:', error);
                    resolve(); // Resolve mesmo com erro para não bloquear o fluxo principal
                });
        } catch (error) {
            console.error('Erro ao processar adição de histórico:', error);
            resolve(); // Resolve mesmo com erro para não bloquear o fluxo principal
        }
    });
}

// Exporta as funções para o escopo global
window.melhorarSelecaoEmLote = melhorarSelecaoEmLote;
window.melhorarModalRecebimento = melhorarModalRecebimento;
window.selecionarTodosItens = selecionarTodosItens;
window.selecionarNenhumItem = selecionarNenhumItem;
window.selecionarItensFiltrados = selecionarItensFiltrados;
window.atualizarContadorSelecao = atualizarContadorSelecao;
window.atualizarPreviewItensSelecionados = atualizarPreviewItensSelecionados;
window.abrirModalRecebimentoMelhorado = abrirModalRecebimentoMelhorado;
window.confirmarRecebimentoMelhorado = confirmarRecebimentoMelhorado;
window.salvarRecebimentoMelhorado = salvarRecebimentoMelhorado;
window.adicionarHistoricoRecebimento = adicionarHistoricoRecebimento;
