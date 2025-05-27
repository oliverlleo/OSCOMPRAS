/**
 * empenho.js
 * 
 * Lógica específica da tela de Empenho de Material
 */

// Variáveis globais do módulo
let clienteAtualEmpenho = null;
let tabelaClientesEmpenho = null;
let tabelaItensEmpenho = null;
let itensEmpenhoSelecionados = [];
let todosItensClienteEmpenho = []; // Para armazenar os itens do cliente selecionado
let colunasOcultasEmpenho = true;

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM carregado na página de Empenho de Material');

    function tentarInicializar(tentativas = 0, maxTentativas = 5) {
        console.log(`Tentativa ${tentativas + 1} de ${maxTentativas} para inicializar Empenho`);
        if (typeof window.dbRef !== 'undefined' && window.dbRef.clientes && typeof $ !== 'undefined' && $.fn.DataTable) {
            console.log('dbRef e DataTables disponíveis, inicializando componentes de Empenho...');
            inicializarComponentesEmpenho();
            configurarEventListenersEmpenho();
            carregarClientesParaEmpenho();
        } else {
            console.log('dbRef ou DataTables não disponíveis ainda, aguardando...');
            if (tentativas < maxTentativas) {
                setTimeout(() => tentarInicializar(tentativas + 1, maxTentativas), 1000);
            } else {
                console.error('dbRef ou DataTables ainda não disponíveis após várias tentativas na tela de Empenho.');
                mostrarNotificacaoEmpenho('Erro ao conectar aos serviços. Por favor, recarregue a página.', 'danger');
            }
        }
    }
    tentarInicializar();
});

function mostrarNotificacaoEmpenho(mensagem, tipo, duracao = 5000) {
    const container = document.querySelector('main.container');
    if (!container) {
        console.error('Container principal não encontrado para exibir notificação.');
        alert(mensagem); // Fallback
        return;
    }
    const notificacaoId = 'notificacaoEmpenho-' + Date.now();
    const notificacao = document.createElement('div');
    notificacao.id = notificacaoId;
    notificacao.className = `alert alert-${tipo} alert-dismissible fade show animate__animated animate__fadeInDown`;
    notificacao.role = 'alert';
    notificacao.style.position = 'fixed';
    notificacao.style.top = '20px';
    notificacao.style.right = '20px';
    notificacao.style.zIndex = '1050'; // Para ficar acima de outros elementos
    notificacao.innerHTML = `
        ${mensagem}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fechar"></button>
    `;
    document.body.appendChild(notificacao); // Adiciona ao body para garantir visibilidade

    setTimeout(() => {
        const activeNotification = document.getElementById(notificacaoId);
        if (activeNotification) {
            activeNotification.classList.remove('show');
            activeNotification.classList.add('animate__fadeOutUp');
            setTimeout(() => {
                activeNotification.remove();
            }, 500); // Tempo para a animação de fadeOut
        }
    }, duracao);
}

function objetoVazio(obj) {
    return obj === null || obj === undefined || (typeof obj === 'object' && Object.keys(obj).length === 0);
}

function formatarDataHoraParaFirebase(data) {
    if (!data) data = new Date();
    return data.toISOString();
}

function inicializarComponentesEmpenho() {
    console.log('Inicializando componentes de Empenho...');
    // Inicializar DataTables para clientes
    if ($('#tabelaClientesEmpenho').length) {
        tabelaClientesEmpenho = $('#tabelaClientesEmpenho').DataTable({
            language: { url: 'https://cdn.datatables.net/plug-ins/1.11.5/i18n/pt-BR.json' },
            responsive: true,
            order: [[0, 'asc']] // Ordena por nome do cliente
        });
    } else {
        console.warn('#tabelaClientesEmpenho não encontrada.');
    }

    // Inicializar DataTables para itens (será reinicializada ao carregar itens)
    // Nota: O HTML tem <th><input type="checkbox" id="selecionarTodosItensEmpenho"></th>, <th>Código</th>, <th>Descrição</th>, <th id="toggleColunasEmpenho" class="toggle-details">(+)</th>, ... , <th>Ação</th>
    // Isso são 10 colunas no total no HTML.
    // Checkbox (0), Código (1), Descrição (2), Toggle (+) (3), Altura (4), Largura (5), Medida (6), Cor (7), Qtde (8), Ação (9)
    // Ocultáveis: 4, 5, 6, 7. Não ordenáveis: 0, 3, 9
    if ($('#tabelaItensEmpenho').length) {
         tabelaItensEmpenho = $('#tabelaItensEmpenho').DataTable({
            language: { url: 'https://cdn.datatables.net/plug-ins/1.11.5/i18n/pt-BR.json' },
            responsive: true,
            columnDefs: [
                { orderable: false, targets: [0, 3, 9] }, // Checkbox, Toggle (+), Ação
                { className: "coluna-oculta-empenho", targets: [4, 5, 6, 7] } // Altura, Largura, Medida, Cor
            ],
            searching: true,
            paging: true,
            info: true,
        });
        // Aplicar estado inicial das colunas ocultas
        toggleColunasEmpenhoVisual(colunasOcultasEmpenho); 
        
        // Atualizar o texto do botão/th de toggle
        const thToggleColunasEmpenho = document.getElementById('toggleColunasEmpenho');
        if (thToggleColunasEmpenho) {
            thToggleColunasEmpenho.textContent = colunasOcultasEmpenho ? '(+)' : '(-)';
        }

    } else {
        console.warn('#tabelaItensEmpenho não encontrada.');
    }
}

function configurarEventListenersEmpenho() {
    console.log('Configurando event listeners de Empenho...');
    
    // Event listener para o TH que controla a visibilidade das colunas
    const thToggleColunasEmpenho = document.getElementById('toggleColunasEmpenho');
    if (thToggleColunasEmpenho) {
        thToggleColunasEmpenho.addEventListener('click', toggleColunasEmpenho);
    }

    // Event listener para o checkbox "Selecionar Todos" na tabela de itens
    // O ID no HTML é 'selecionarTodosItensEmpenho'
    const checkTodosItensEmpenho = document.getElementById('selecionarTodosItensEmpenho'); 
    if(checkTodosItensEmpenho) {
        checkTodosItensEmpenho.addEventListener('change', function() {
            // Iterate only over visible rows if that's the desired behavior for "select all"
            document.querySelectorAll('#tabelaItensEmpenho .check-item-empenho').forEach(checkbox => {
                const row = checkbox.closest('tr');
                // Basic visibility check; for DataTables, you might need a more robust check if pagination/filtering affects this.
                if (row && row.offsetParent !== null) { 
                     checkbox.checked = this.checked;
                } else if (!this.checked && checkbox.checked) { 
                    // If unchecking all, and this checkbox (potentially invisible) was checked, uncheck it.
                    // This part needs more robust handling if full cross-page select all is needed.
                    // For now, this basic visibility check primarily affects visible items.
                    checkbox.checked = false;
                }
            });
            atualizarSelecaoItensEmpenho(); // Call after manually changing checkbox states
        });
    }
    
    // Event listener para checkboxes individuais na tabela de itens (usando delegação)
    // This will also trigger atualizarSelecaoItensEmpenho
    $('#tabelaItensEmpenho tbody').on('change', '.check-item-empenho', function() {
        atualizarSelecaoItensEmpenho();
    });

    // Event listener for quantity input changes
    $('#tabelaItensEmpenho tbody').on('input change', '.qtde-empenhar', function() {
        const input = $(this);
        let valor = parseFloat(input.val());
        const maxPermitido = parseFloat(input.attr('max'));

        if (isNaN(valor)) { // Handle non-numeric input
            valor = 0; // Default to 0 or current value if preferred
        }

        if (valor < 0) {
            input.val(0);
            mostrarNotificacaoEmpenho("Quantidade não pode ser negativa.", "warning", 3000);
        } else if (valor > maxPermitido) {
            input.val(maxPermitido);
            mostrarNotificacaoEmpenho("Quantidade excede o máximo permitido para empenho.", "warning", 3000);
        }
        // No need to call atualizarSelecaoItensEmpenho here unless selection depends on quantity directly.
        // It will be called if a checkbox is checked/unchecked.
        // If quantity change should affect selection state even without checkbox change, then call it.
    });

    // Event listener for individual item empenho button
    $('#tabelaItensEmpenho tbody').on('click', '.btn-empenhar-item', function() {
        const itemUniqueId = $(this).data('itemuniqueid');
        if (itemUniqueId) {
            processarEmpenhoItem(itemUniqueId);
        } else {
            mostrarNotificacaoEmpenho("ID do item não encontrado no botão.", "danger");
        }
    });

    const btnEmpenharSelecionados = document.getElementById('btnEmpenharSelecionados');
    if(btnEmpenharSelecionados) {
        btnEmpenharSelecionados.addEventListener('click', function() {
            processarEmpenhoLote();
        });
    }

    // Adicionar event listener para os botões "Iniciar Empenho" na tabela de clientes (usando delegação)
     $('#tabelaClientesEmpenho tbody').on('click', '.btn-iniciar-empenho', function() {
        const clienteId = $(this).data('clienteid');
        const nomeCliente = $(this).closest('tr').find('td:first').text(); 
        if (clienteId) {
            iniciarEmpenhoParaCliente(clienteId, nomeCliente);
        } else {
            mostrarNotificacaoEmpenho('ID do cliente não encontrado.', 'danger');
        }
    });
}

function toggleColunasEmpenhoVisual(ocultar) {
    // A classe 'coluna-oculta-empenho' já está nas colunas corretas via columnDefs
    // O DataTables controla a visibilidade das colunas marcadas com 'visible: false'
    // ou dinamicamente com column().visible().
    if (tabelaItensEmpenho) {
        [4, 5, 6, 7].forEach(colIndex => { // Índices das colunas: Altura, Largura, Medida, Cor
            tabelaItensEmpenho.column(colIndex).visible(!ocultar);
        });
        // Não precisa chamar recalc() aqui explicitamente se o DataTables já estiver ajustando
        // Mas se houver problemas de layout, pode ser necessário:
        // tabelaItensEmpenho.columns.adjust().responsive.recalc();
    }
}

function toggleColunasEmpenho() {
    colunasOcultasEmpenho = !colunasOcultasEmpenho;
    const thToggle = document.getElementById('toggleColunasEmpenho'); // ID do TH no HTML
    if (thToggle) {
        thToggle.textContent = colunasOcultasEmpenho ? '(+)' : '(-)';
    }
    toggleColunasEmpenhoVisual(colunasOcultasEmpenho);
}

// Helper function (ensure it's defined before or accessible to carregarClientesParaEmpenho)
async function verificarMaterialParaEmpenhar(clienteId) {
    if (!window.dbRef || !window.dbRef.projetos) {
        console.error('verificarMaterialParaEmpenhar: dbRef.projetos não disponível');
        mostrarNotificacaoEmpenho('Erro interno: Referência de projetos não encontrada.', 'danger');
        return false;
    }
    const projetosClienteRef = window.dbRef.projetos.child(clienteId);
    try {
        const snapshotProjetos = await projetosClienteRef.once('value');
        const projetos = snapshotProjetos.val();

        if (objetoVazio(projetos)) {
            return false;
        }

        for (const tipoProjeto in projetos) {
            if (!Object.prototype.hasOwnProperty.call(projetos, tipoProjeto)) continue;
            if (tipoProjeto === 'Tratamento') continue;

            const projeto = projetos[tipoProjeto];
            if (projeto && projeto.listas && !objetoVazio(projeto.listas)) {
                for (const nomeLista in projeto.listas) {
                    if (!Object.prototype.hasOwnProperty.call(projeto.listas, nomeLista)) continue;
                    const listaItens = projeto.listas[nomeLista];
                    if (listaItens) {
                        if (Array.isArray(listaItens)) {
                            for (const item of listaItens) {
                                if (item && parseFloat(item.empenho) > 0 && parseFloat(item.quantidadeRecebida) > 0) {
                                    return true;
                                }
                            }
                        } else if (typeof listaItens === 'object') {
                            for (const itemKey in listaItens) {
                                if (!Object.prototype.hasOwnProperty.call(listaItens, itemKey)) continue;
                                const item = listaItens[itemKey];
                                if (item && parseFloat(item.empenho) > 0 && parseFloat(item.quantidadeRecebida) > 0) {
                                    return true;
                                }
                            }
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.error(`Erro ao verificar material para empenhar para cliente ${clienteId}:`, error);
        mostrarNotificacaoEmpenho(`Erro ao verificar itens do cliente (${clienteId.substring(0,5)}...).`, 'danger');
        return false; // Consider as not eligible on error
    }
    return false;
}

// Main function
async function carregarClientesParaEmpenho() {
    if (!window.dbRef || !window.dbRef.clientes) {
        mostrarNotificacaoEmpenho('Banco de dados não acessível.', 'danger');
        console.error('carregarClientesParaEmpenho: dbRef.clientes não disponível');
        return;
    }
    const clientesRef = window.dbRef.clientes;
    const nenhumClienteDiv = document.getElementById('nenhumClienteEmpenho');
    
    if (!tabelaClientesEmpenho) {
        console.error("tabelaClientesEmpenho não está inicializada.");
        mostrarNotificacaoEmpenho("Erro na interface da tabela de clientes.", "danger");
        if (nenhumClienteDiv) {
             nenhumClienteDiv.textContent = 'Erro na interface. Recarregue a página.';
             nenhumClienteDiv.style.display = 'block';
        }
        return;
    }

    tabelaClientesEmpenho.clear().draw();
    if (nenhumClienteDiv) {
        nenhumClienteDiv.textContent = 'Carregando clientes elegíveis...';
        nenhumClienteDiv.style.display = 'block';
    }

    try {
        const snapshotClientes = await clientesRef.once('value');
        const clientes = snapshotClientes.val();

        if (objetoVazio(clientes)) {
            if (nenhumClienteDiv) nenhumClienteDiv.textContent = 'Nenhum cliente cadastrado.';
            return;
        }

        let eligibleClientsFound = 0;
        const promises = []; // Array to hold all promises

        for (const clienteId in clientes) {
            if (!Object.prototype.hasOwnProperty.call(clientes, clienteId)) continue;

            const cliente = clientes[clienteId];
            if (cliente && typeof cliente === 'object' && cliente.nome) {
                const isTratamentoConcluido = (cliente.statusTratamento === "Concluido" || (cliente.dataConclusaoTratamento && String(cliente.dataConclusaoTratamento).trim() !== ""));
                
                if (isTratamentoConcluido) {
                    // Add the promise to the array
                    promises.push(verificarMaterialParaEmpenhar(clienteId).then(hasMaterial => {
                        if (hasMaterial) {
                            // This part needs to be thread-safe if DataTables isn't, 
                            // but row.add should be fine.
                            tabelaClientesEmpenho.row.add([
                                cliente.nome,
                                `<button class="btn btn-sm btn-primary btn-iniciar-empenho" data-clienteid="${clienteId}" data-clientenome="${cliente.nome}">Iniciar Empenho de Material</button>`
                            ]); // Don't draw yet
                            eligibleClientsFound++;
                        }
                    }));
                }
            } else {
                console.warn('Cliente inválido ou sem nome:', clienteId, cliente);
            }
        }

        await Promise.all(promises); // Wait for all checks to complete

        tabelaClientesEmpenho.draw(false); // Draw the table once after all rows are added

        if (nenhumClienteDiv) {
            if (eligibleClientsFound === 0) {
                nenhumClienteDiv.textContent = 'Nenhum cliente elegível para empenho no momento.';
            } else {
                nenhumClienteDiv.style.display = 'none'; 
            }
        }

    } catch (error) {
        console.error("Erro ao carregar clientes para empenho:", error);
        mostrarNotificacaoEmpenho(`Erro ao carregar clientes: ${error.message}`, 'danger');
        if (nenhumClienteDiv) {
            nenhumClienteDiv.textContent = 'Erro ao carregar clientes.';
            nenhumClienteDiv.style.display = 'block'; // Ensure it's visible on error
        }
    }
}

async function iniciarEmpenhoParaCliente(clienteId, nomeCliente) {
    if (!clienteId || !nomeCliente) {
        mostrarNotificacaoEmpenho('Dados do cliente incompletos para iniciar empenho.', 'danger');
        console.error('iniciarEmpenhoParaCliente: clienteId ou nomeCliente faltando.');
        return;
    }

    clienteAtualEmpenho = { id: clienteId, nome: nomeCliente };
    console.log(`Iniciando empenho para cliente: ${nomeCliente} (ID: ${clienteId})`);

    const timestamp = formatarDataHoraParaFirebase(); // Assumes this returns ISO string

    if (!window.dbRef || !window.dbRef.clientes) {
        mostrarNotificacaoEmpenho('Conexão com banco de dados perdida.', 'danger');
        console.error('iniciarEmpenhoParaCliente: dbRef.clientes não disponível.');
        return;
    }
    
    try {
        // Use update() to avoid overwriting other data under processoEmpenho
        await window.dbRef.clientes.child(clienteId).child('processoEmpenho').update({
            dataHoraInicioSeparacao: timestamp
        });
        
        mostrarNotificacaoEmpenho(`Processo de empenho iniciado para ${nomeCliente}.`, 'info');

        // Update UI using the correct IDs from pages/empenho.html
        const listaClientesSection = document.getElementById('listaClientesEmpenhoSection');
        const areaEmpenhoItensDiv = document.getElementById('areaEmpenhoItens');
        const nomeClienteSpan = document.getElementById('nomeClienteEmpenhando'); 

        if (listaClientesSection) listaClientesSection.classList.add('d-none');
        if (areaEmpenhoItensDiv) areaEmpenhoItensDiv.classList.remove('d-none');
        if (nomeClienteSpan) nomeClienteSpan.textContent = nomeCliente;
        
        // Call to load items for this client
        // This will be implemented in a future step, for now it's a placeholder
        carregarItensParaEmpenho(clienteId);

        if (areaEmpenhoItensDiv) {
            areaEmpenhoItensDiv.scrollIntoView({ behavior: 'smooth' });
        }

    } catch (error) {
        console.error(`Erro ao registrar início de empenho para ${clienteId}:`, error);
        mostrarNotificacaoEmpenho(`Erro ao iniciar empenho: ${error.message}`, 'danger');
        // Optionally, revert UI changes if Firebase update fails
        // For now, just notify the user.
    }
}

async function carregarItensParaEmpenho(clienteId) {
    if (!window.dbRef || !window.dbRef.projetos) {
        mostrarNotificacaoEmpenho('Banco de dados não acessível (projetos).', 'danger');
        console.error('carregarItensParaEmpenho: dbRef.projetos não disponível');
        return;
    }
    const projetosRef = window.dbRef.projetos.child(clienteId);
    const nenhumItemDiv = document.getElementById('nenhumItemEmpenho');
    
    if (!tabelaItensEmpenho) {
        console.error("carregarItensParaEmpenho: tabelaItensEmpenho não está inicializada.");
        mostrarNotificacaoEmpenho("Erro na interface da tabela de itens.", "danger");
        if (nenhumItemDiv) {
             nenhumItemDiv.textContent = 'Erro na interface. Recarregue a página.';
             nenhumItemDiv.style.display = 'block';
        }
        return;
    }

    tabelaItensEmpenho.clear().draw();
    todosItensClienteEmpenho = []; // Reset global array
    if (nenhumItemDiv) {
        nenhumItemDiv.textContent = 'Carregando itens para empenho...';
        nenhumItemDiv.style.display = 'block';
    }

    let itemCounter = 0; // To generate unique data-itemuniqueid for DOM elements

    try {
        const snapshotProjetos = await projetosRef.once('value');
        const projetos = snapshotProjetos.val();

        if (objetoVazio(projetos)) {
            if (nenhumItemDiv) nenhumItemDiv.textContent = 'Nenhum projeto encontrado para este cliente.';
            tabelaItensEmpenho.draw(false); // Ensure table is redrawn even if empty
            return;
        }

        for (const tipoProjeto in projetos) {
            if (!Object.prototype.hasOwnProperty.call(projetos, tipoProjeto)) continue;
            if (tipoProjeto === 'Tratamento') continue; // Skip 'Tratamento'

            const projeto = projetos[tipoProjeto];
            if (projeto && projeto.listas && !objetoVazio(projeto.listas)) {
                for (const nomeLista in projeto.listas) {
                    if (!Object.prototype.hasOwnProperty.call(projeto.listas, nomeLista)) continue;
                    const listaItens = projeto.listas[nomeLista];

                    if (listaItens) {
                        const processItem = (itemData, itemKey) => {
                            if (!itemData || typeof itemData !== 'object') return;

                            const saldoEmpenho = parseFloat(itemData.empenho) || 0;
                            const qtdRecebida = parseFloat(itemData.quantidadeRecebida) || 0;
                            const qtdJaEmpenhadaAG = parseFloat(itemData.quantidadeTotalEmpenhadaAG) || 0;
                            
                            const disponivelParaEmpenhoEsteModulo = qtdRecebida - qtdJaEmpenhadaAG;

                            if (saldoEmpenho > 0 && disponivelParaEmpenhoEsteModulo > 0) {
                                const uniqueId = `item_${itemCounter++}`;
                                const itemComContexto = { 
                                    ...itemData, 
                                    firebaseKey: itemKey, 
                                    uniqueId: uniqueId, 
                                    caminho: `projetos/${clienteId}/${tipoProjeto}/listas/${nomeLista}/${itemKey}`,
                                    tipoProjeto: tipoProjeto,
                                    nomeLista: nomeLista,
                                    // Store calculated values for direct use
                                    saldoEmpenhoCalculado: saldoEmpenho,
                                    disponivelParaEmpenhoEsteModuloCalculado: disponivelParaEmpenhoEsteModulo
                                };
                                todosItensClienteEmpenho.push(itemComContexto);

                                const maxEmpenhoPermitido = Math.min(saldoEmpenho, disponivelParaEmpenhoEsteModulo);
                                // Ensure max is not negative if data is inconsistent
                                const maxInput = Math.max(0, maxEmpenhoPermitido);


                                tabelaItensEmpenho.row.add([
                                    `<input type="checkbox" class="check-item-empenho" data-itemuniqueid="${uniqueId}">`,
                                    itemData.codigo || '-',
                                    itemData.descricao || '-',
                                    // Added button as per task specification for toggling details per row
                                    `<button class="btn btn-sm btn-info btn-toggle-detalhes-empenho" data-itemuniqueid="${uniqueId}"><i class="fas fa-plus"></i></button>`,
                                    itemData.altura || '-',
                                    itemData.largura || '-',
                                    itemData.medida || '-',
                                    itemData.cor || '-',
                                    `<input type="number" class="form-control form-control-sm qtde-empenhar" style="width: 80px;" value="0" min="0" max="${maxInput}" data-itemuniqueid="${uniqueId}">`,
                                    // The button text "Empenhado" might be confusing. "Empenhar Item" or similar might be better.
                                    // Keeping "Empenhado" as per previous structure for now.
                                    `<button class="btn btn-sm btn-success btn-empenhar-item" data-itemuniqueid="${uniqueId}"><i class="fas fa-check"></i> Empenhado</button>`
                                ]).node().id = `item-row-${uniqueId}`; // Assign an ID to the row
                            }
                        };

                        if (Array.isArray(listaItens)) {
                            // Firebase often stores arrays as objects with 0-indexed keys if there are gaps or if modified.
                            // However, if it's a dense array from snapshot, this is fine.
                            listaItens.forEach((item, index) => processItem(item, String(index)));
                        } else if (typeof listaItens === 'object') {
                            for (const itemKey in listaItens) {
                                if (!Object.prototype.hasOwnProperty.call(listaItens, itemKey)) continue;
                                processItem(listaItens[itemKey], itemKey);
                            }
                        }
                    }
                }
            }
        }
        
        tabelaItensEmpenho.draw(false); // Draw all added rows

        if (tabelaItensEmpenho.rows().count() === 0) {
            if (nenhumItemDiv) nenhumItemDiv.textContent = 'Nenhum item elegível para empenho para este cliente.';
        } else {
            if (nenhumItemDiv) nenhumItemDiv.style.display = 'none';
        }
        
        toggleColunasEmpenhoVisual(colunasOcultasEmpenho); // Apply current visibility state for hidden columns
        atualizarSelecaoItensEmpenho(); // Reset "select all" checkbox and button states

    } catch (error) {
        console.error(`Erro ao carregar itens para empenho para cliente ${clienteId}:`, error);
        mostrarNotificacaoEmpenho(`Erro ao carregar itens: ${error.message}`, 'danger');
        if (nenhumItemDiv) {
            nenhumItemDiv.textContent = 'Erro ao carregar itens.';
            nenhumItemDiv.style.display = 'block';
        }
        tabelaItensEmpenho.draw(false); // Ensure table is redrawn even on error
    }
}

function atualizarSelecaoItensEmpenho() {
    itensEmpenhoSelecionados = [];
    const checkboxes = document.querySelectorAll('#tabelaItensEmpenho .check-item-empenho');
    let countChecked = 0;
    let countVisible = 0; // Count only rows currently visible (not filtered out by DataTables search)

    checkboxes.forEach(checkbox => {
        const row = checkbox.closest('tr');
        // Check if the row is part of the DataTables' current display context
        // row.offsetParent !== null is a basic check, might not be fully robust with complex DT setups
        if (row && row.offsetParent !== null) { 
            countVisible++;
            if (checkbox.checked) {
                countChecked++;
                const itemUniqueId = checkbox.dataset.itemuniqueid;
                const foundItem = todosItensClienteEmpenho.find(itm => itm.uniqueId === itemUniqueId);
                if (foundItem) {
                    // Retrieve quantity from the input field associated with this item
                    const qtdeInput = row.querySelector(`.qtde-empenhar[data-itemuniqueid="${itemUniqueId}"]`);
                    let quantidadeAEmpenhar = 0;
                    if (qtdeInput) {
                        quantidadeAEmpenhar = parseFloat(qtdeInput.value) || 0;
                        // Ensure the quantity doesn't exceed max, though the input listener should also handle this
                        const maxPermitido = parseFloat(qtdeInput.getAttribute('max')) || 0;
                        if (quantidadeAEmpenhar > maxPermitido) quantidadeAEmpenhar = maxPermitido;
                        if (quantidadeAEmpenhar < 0) quantidadeAEmpenhar = 0;
                    }
                    
                    itensEmpenhoSelecionados.push({ 
                        uniqueId: itemUniqueId, 
                        itemData: foundItem, // This is the full item object from todosItensClienteEmpenho
                        quantidade: quantidadeAEmpenhar 
                    });
                } else {
                    console.warn(`Item com uniqueId ${itemUniqueId} não encontrado em todosItensClienteEmpenho.`);
                }
            }
        }
    });

    const btnEmpenharLote = document.getElementById('btnEmpenharSelecionados');
    if (btnEmpenharLote) {
        btnEmpenharLote.disabled = itensEmpenhoSelecionados.length === 0;
    }

    // ID from HTML is 'selecionarTodosItensEmpenho'
    const checkTodos = document.getElementById('selecionarTodosItensEmpenho'); 
    if (checkTodos) {
        if (countVisible === 0) { // No visible items to check/uncheck
            checkTodos.checked = false;
            checkTodos.indeterminate = false;
        } else if (countChecked === countVisible) { // All visible items are checked
            checkTodos.checked = true;
            checkTodos.indeterminate = false;
        } else if (countChecked > 0) { // Some, but not all, visible items are checked
            checkTodos.checked = false;
            checkTodos.indeterminate = true;
        } else { // No visible items are checked
            checkTodos.checked = false;
            checkTodos.indeterminate = false;
        }
    }
    // console.log('Itens selecionados para empenho:', itensEmpenhoSelecionados.length, itensEmpenhoSelecionados);
}

function validarQuantidadeEmpenho(inputQtdeElement, item) {
    console.log('Placeholder: validarQuantidadeEmpenho');
    // Lógica de validação da quantidade a empenhar
    // const quantidadeDigitada = parseInt(inputQtdeElement.val(), 10);
    // const quantidadeMaxima = parseInt(inputQtdeElement.attr('max'), 10); 
    // if (isNaN(quantidadeDigitada) || quantidadeDigitada < 0) {
    //     mostrarNotificacaoEmpenho(`Quantidade inválida para ${item.codigo || item.descricao}.`, 'warning');
    //     return false;
    // }
    // if (quantidadeDigitada > quantidadeMaxima) {
    //     mostrarNotificacaoEmpenho(`Quantidade para ${item.codigo || item.descricao} excede o pendente (${quantidadeMaxima}).`, 'warning');
    //     return false;
    // }
    return true; 
}

async function processarEmpenhoItem(itemUniqueId) {
    if (!itemUniqueId) {
        mostrarNotificacaoEmpenho("ID do item não fornecido.", "danger");
        console.error("processarEmpenhoItem: ID do item não fornecido.");
        return;
    }

    // In `todosItensClienteEmpenho` we store wrappers: { uniqueId: ..., itemData: {...original item...}, ...other context... }
    // The `itemData` property within the wrapper is the actual item object from Firebase.
    const foundItemWrapper = todosItensClienteEmpenho.find(wrapper => wrapper.uniqueId === itemUniqueId);

    if (!foundItemWrapper || !foundItemWrapper.itemData) {
        mostrarNotificacaoEmpenho("Item não encontrado no cache local para processar.", "danger");
        console.error(`processarEmpenhoItem: Item com uniqueId ${itemUniqueId} não encontrado em todosItensClienteEmpenho.`);
        return;
    }
    
    // Direct reference to the original item data, which includes 'caminho', 'empenho', etc.
    const itemData = foundItemWrapper.itemData; 
    const itemPath = itemData.caminho; // Full path to the item in Firebase

    if (!itemPath) {
        mostrarNotificacaoEmpenho("Caminho do item no Firebase não definido.", "danger");
        console.error("processarEmpenhoItem: Item sem caminho Firebase:", itemData);
        return;
    }

    const inputQtdeElement = document.querySelector(`.qtde-empenhar[data-itemuniqueid="${itemUniqueId}"]`);
    if (!inputQtdeElement) {
        mostrarNotificacaoEmpenho("Campo de quantidade não encontrado para o item.", "danger");
        console.error(`processarEmpenhoItem: Campo de quantidade não encontrado para uniqueId ${itemUniqueId}.`);
        return;
    }
    const quantidadeAEmpenhar = parseFloat(inputQtdeElement.value);

    // Validation
    if (isNaN(quantidadeAEmpenhar) || quantidadeAEmpenhar <= 0) {
        mostrarNotificacaoEmpenho("Quantidade para empenho deve ser um número maior que zero.", "warning", 3000);
        return;
    }

    // Use the calculated values stored in foundItemWrapper for consistency with what was displayed
    // or recalculate if direct itemData is preferred (as in the snippet)
    const currentEmpenho = parseFloat(itemData.empenho) || 0; // Original 'empenho' value from item data
    const currentQtdRecebida = parseFloat(itemData.quantidadeRecebida) || 0;
    const currentQtdTotalEmpenhadaAG = parseFloat(itemData.quantidadeTotalEmpenhadaAG) || 0;
    
    // This is the maximum that could have been entered in the input field
    const maxPermitidoCalculado = Math.min(currentEmpenho, currentQtdRecebida - currentQtdTotalEmpenhadaAG);

    if (quantidadeAEmpenhar > maxPermitidoCalculado) {
        mostrarNotificacaoEmpenho(`Quantidade (${quantidadeAEmpenhar}) excede o máximo permitido (${maxPermitidoCalculado.toFixed(2)}). Ajuste o valor.`, "warning", 4000);
        // Optionally reset to max, but user should ideally correct it.
        // inputQtdeElement.value = maxPermitidoCalculado.toFixed(itemData.unidade === 'UN' ? 0 : 2); 
        return;
    }
    
    const colaborador = firebase.auth().currentUser;
    const colaboradorNome = colaborador ? (colaborador.displayName || colaborador.email) : "Sistema";
    const colaboradorId = colaborador ? colaborador.uid : "sistema";

    const updates = {
        dataUltimoEmpenhoOperacao: formatarDataHoraParaFirebase(),
        statusEmpenho: "Empenhado", // Could be "Parcialmente Empenhado" or "Totalmente Empenhado" based on remaining `empenho`
        quantidadeUltimoEmpenho: quantidadeAEmpenhar,
        empenho: currentEmpenho - quantidadeAEmpenhar, // Remaining empenho for this item
        quantidadeTotalEmpenhadaAG: currentQtdTotalEmpenhadaAG + quantidadeAEmpenhar,
        ultimoEmpenhoPorNome: colaboradorNome,
        ultimoEmpenhoPorId: colaboradorId
    };

    // Determine overall status after this operation
    if (updates.empenho <= 0) {
        updates.statusGeral = "Empenhado Total"; // Example general status
    } else {
        updates.statusGeral = "Empenhado Parcial"; // Example general status
    }
    // If there's a specific status field for production, update it too. e.g., item.status = 'Pronto para Produção'

    try {
        await window.dbRef.child(itemPath).update(updates);
        mostrarNotificacaoEmpenho(`Item ${itemData.codigo || itemUniqueId} empenhado com ${quantidadeAEmpenhar} unidade(s).`, "success");

        // Refresh table to reflect changes
        if (clienteAtualEmpenho && clienteAtualEmpenho.id) {
            // carregarItensParaEmpenho will implicitly call atualizarSelecaoItensEmpenho
            await carregarItensParaEmpenho(clienteAtualEmpenho.id); 
        } else {
            console.error("Cliente atual não definido, não é possível recarregar itens.");
            // As a fallback, try to update the local item in todosItensClienteEmpenho and redraw DataTables
            // This is more complex and error-prone than a full reload.
            const localItemIndex = todosItensClienteEmpenho.findIndex(wrapper => wrapper.uniqueId === itemUniqueId);
            if (localItemIndex !== -1) {
                // Update the local cache. This is tricky because carregarItensParaEmpenho rebuilds this.
                // For now, relying on carregarItensParaEmpenho is safer.
            }
            if(tabelaItensEmpenho) tabelaItensEmpenho.draw(false); // Redraw if table exists
            atualizarSelecaoItensEmpenho(); // Explicit call if not reloading fully
        }

    } catch (error) {
        console.error("Erro ao empenhar item:", error);
        mostrarNotificacaoEmpenho(`Erro ao empenhar item ${itemData.codigo || itemUniqueId}: ${error.message}`, "danger");
    }
}

async function processarEmpenhoLote() {
    if (itensEmpenhoSelecionados.length === 0) {
        mostrarNotificacaoEmpenho("Nenhum item selecionado para empenho em lote.", "info", 3000);
        return;
    }

    let multiPathUpdates = {};
    const itemsToProcessDetails = [];
    let errorMessages = [];
    let allValid = true; // Flag to track if all items pass validation

    // First pass: Validate all selected items
    for (const selectedWrapper of itensEmpenhoSelecionados) {
        const itemData = selectedWrapper.itemData; // This is the full item object
        const itemUniqueId = selectedWrapper.uniqueId;
        // Quantity is already part of selectedWrapper from atualizarSelecaoItensEmpenho
        const quantidadeAEmpenhar = selectedWrapper.quantidade; 

        if (isNaN(quantidadeAEmpenhar) || quantidadeAEmpenhar <= 0) {
            // Skipping items with 0 quantity, not treating as an error for batch
            // console.log(`Item ${itemData.codigo || itemUniqueId} tem quantidade 0 ou inválida, será ignorado no lote.`);
            continue; // Skip this item
        }

        const currentEmpenho = parseFloat(itemData.empenho) || 0;
        const currentQtdRecebida = parseFloat(itemData.quantidadeRecebida) || 0;
        const currentQtdTotalEmpenhadaAG = parseFloat(itemData.quantidadeTotalEmpenhadaAG) || 0;
        const maxPermitido = Math.min(currentEmpenho, currentQtdRecebida - currentQtdTotalEmpenhadaAG);

        if (quantidadeAEmpenhar > maxPermitido) {
            errorMessages.push(`Qtde para ${itemData.codigo || itemUniqueId} (${quantidadeAEmpenhar}) excede máx. (${maxPermitido.toFixed(2)}).`);
            allValid = false; // Mark as not all valid
            // No need to 'continue' here if we want to collect all errors first
        }
        
        if (!itemData.caminho) {
             errorMessages.push(`Caminho Firebase não definido para ${itemData.codigo || itemUniqueId}.`);
             allValid = false;
        }

        // If this item is valid so far (considering its own checks)
        // and we are collecting all errors before deciding, we can still add it to a temporary list.
        // However, the prompt implies "all must be valid" before any processing.
        // So, we only add to itemsToProcessDetails if it passes its own validation for now.
        // The final decision to proceed depends on `allValid` after checking all items.
        if (allValid) { // Only add if this specific item passed its own validation checks up to this point
             itemsToProcessDetails.push({ 
                itemData: itemData, 
                quantidadeAEmpenhar: quantidadeAEmpenhar, 
                itemPath: itemData.caminho,
                currentEmpenho: currentEmpenho,
                currentQtdTotalEmpenhadaAG: currentQtdTotalEmpenhadaAG
            });
        }
    }

    // If any item failed validation, show all errors and stop.
    if (!allValid || errorMessages.length > 0) {
        const fullErrorMessage = "Corrija os seguintes erros antes de empenhar em lote: " + errorMessages.join("; ");
        mostrarNotificacaoEmpenho(fullErrorMessage, "warning", 7000);
        return; 
    }

    // If all validations passed but itemsToProcessDetails is empty (e.g., all selected items had 0 quantity)
    if (itemsToProcessDetails.length === 0) {
         mostrarNotificacaoEmpenho("Nenhum item com quantidade válida para processar no lote.", "info", 3000);
         return;
    }

    const colaborador = firebase.auth().currentUser;
    const colaboradorNome = colaborador ? (colaborador.displayName || colaborador.email) : "Sistema";
    const colaboradorId = colaborador ? colaborador.uid : "sistema";
    const timestamp = formatarDataHoraParaFirebase();

    // Construct multiPathUpdates from validated items
    itemsToProcessDetails.forEach(detail => {
        const { itemData, quantidadeAEmpenhar, itemPath, currentEmpenho, currentQtdTotalEmpenhadaAG } = detail;
        
        multiPathUpdates[`${itemPath}/dataUltimoEmpenhoOperacao`] = timestamp;
        multiPathUpdates[`${itemPath}/statusEmpenho`] = "Empenhado Lote"; // Specific status for batch
        multiPathUpdates[`${itemPath}/quantidadeUltimoEmpenho`] = quantidadeAEmpenhar;
        multiPathUpdates[`${itemPath}/empenho`] = currentEmpenho - quantidadeAEmpenhar;
        multiPathUpdates[`${itemPath}/quantidadeTotalEmpenhadaAG`] = currentQtdTotalEmpenhadaAG + quantidadeAEmpenhar;
        multiPathUpdates[`${itemPath}/ultimoEmpenhoPorNome`] = colaboradorNome;
        multiPathUpdates[`${itemPath}/ultimoEmpenhoPorId`] = colaboradorId;

        if ((currentEmpenho - quantidadeAEmpenhar) <= 0) {
            multiPathUpdates[`${itemPath}/statusGeral`] = "Empenhado Total";
        } else {
            multiPathUpdates[`${itemPath}/statusGeral`] = "Empenhado Parcial";
        }
    });
    
    try {
        await window.dbRef.update(multiPathUpdates);
        mostrarNotificacaoEmpenho(`${itemsToProcessDetails.length} itens empenhados com sucesso em lote.`, "success");

        if (clienteAtualEmpenho && clienteAtualEmpenho.id) {
            // carregarItensParaEmpenho will also call atualizarSelecaoItensEmpenho
            await carregarItensParaEmpenho(clienteAtualEmpenho.id); 
        } else {
            console.error("Cliente atual não definido, não é possível recarregar itens.");
            // Fallback: might need to manually clear selections and update UI if full reload is not possible
            if(tabelaItensEmpenho) tabelaItensEmpenho.draw(false);
            atualizarSelecaoItensEmpenho();
        }
    } catch (error) {
        console.error("Erro ao empenhar itens em lote:", error);
        mostrarNotificacaoEmpenho(`Erro ao empenhar itens em lote: ${error.message}`, "danger");
    }
}

// --- FIM ---
