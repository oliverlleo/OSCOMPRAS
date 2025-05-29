/**
 * empenho.js
 * 
 * Lógica específica da tela de empenho de material
 * Este arquivo contém todas as funções relacionadas à tela de empenho de material
 * do Sistema de Controle de Compras e Recebimento
 */

// Variáveis globais do módulo
let clienteAtual = null;
let tabelaClientes = null;
let tabelaItens = null;
let itensSelecionados = [];
let todosItens = {};

// Aguarda o carregamento completo do DOM
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM carregado na página de empenho de material');
    
    // Inicializa os componentes da página
    inicializarComponentes();
    
    // Função para tentar carregar clientes com retry
    function tentarCarregarClientes(tentativas = 0, maxTentativas = 5) {
        console.log(`Tentativa ${tentativas + 1} de ${maxTentativas} para carregar clientes elegíveis`);
        
        if (typeof window.dbRef !== 'undefined' && window.dbRef.clientes) {
            console.log('dbRef disponível, carregando clientes elegíveis...');
            // Carrega a lista de clientes elegíveis para empenho
            carregarClientesElegiveis();
        } else {
            console.log('dbRef não disponível ainda, aguardando...');
            
            if (tentativas < maxTentativas) {
                // Aguarda um momento para garantir que o Firebase esteja inicializado
                setTimeout(function() {
                    tentarCarregarClientes(tentativas + 1, maxTentativas);
                }, 1000);
            } else {
                console.error('dbRef ainda não disponível após várias tentativas');
                mostrarNotificacao('Erro ao conectar ao banco de dados. Por favor, recarregue a página.', 'danger');
                
                // Tenta criar manualmente a referência como último recurso
                try {
                    console.log('Tentando criar referência manualmente...');
                    if (firebase && firebase.database) {
                        window.dbRef = {
                            clientes: firebase.database().ref('clientes'),
                            projetos: firebase.database().ref('projetos')
                        };
                        console.log('Referência criada manualmente, tentando carregar clientes...');
                        carregarClientesElegiveis();
                    }
                } catch (error) {
                    console.error('Erro ao criar referência manualmente:', error);
                }
            }
        }
    }
    
    // Inicia o processo de carregamento com retry
    tentarCarregarClientes();
    
    // Configura os listeners de eventos
    configurarEventListeners();
});

/**
 * Inicializa os componentes da interface
 * Configura DataTables e outros elementos
 */
function inicializarComponentes() {
    // Inicializa a tabela de clientes com DataTables
    tabelaClientes = $('#clientesEmpenhoTable').DataTable({
        language: {
            url: 'https://cdn.datatables.net/plug-ins/1.11.5/i18n/pt-BR.json'
        },
        responsive: true,
        order: [[0, 'asc']], // Ordena por nome do cliente (ascendente)
        columnDefs: [
            { className: "align-middle", targets: "_all" }
        ],
        dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>><"row"<"col-sm-12"tr>><"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>'
    });
}

/**
 * Configura os listeners de eventos para os elementos da página
 */
function configurarEventListeners() {
    // Botão para voltar à lista de clientes
    document.getElementById('voltarParaSelecaoClienteEmpenho').addEventListener('click', function() {
        voltarParaListaClientes();
    });
    
    // Checkbox para selecionar/deselecionar todos os itens
    document.getElementById('selecionarTodosItensEmpenho').addEventListener('change', function() {
        const checkboxes = document.querySelectorAll('.check-item:not([disabled])'); // Apenas checkboxes habilitados
        checkboxes.forEach(checkbox => {
            checkbox.checked = this.checked;
        });
        
        atualizarSelecao();
    });
    
    // Botão para empenhar itens selecionados
    document.getElementById('empenharSelecionadosButton').addEventListener('click', function() {
        empenharItensSelecionados();
    });

    // Botões de filtro de origem
    document.querySelectorAll('.btn-group[aria-label="Filtro de Origem"] button').forEach(button => {
        button.addEventListener('click', function() {
            // Remove a classe 'active' de todos os botões do grupo
            document.querySelectorAll('.btn-group[aria-label="Filtro de Origem"] button').forEach(btn => btn.classList.remove('active'));
            // Adiciona a classe 'active' ao botão clicado
            this.classList.add('active');
            
            const filtro = this.getAttribute('data-filtro');
            aplicarFiltroOrigem(filtro);
        });
    });
}

/**
 * Carrega a lista de clientes elegíveis para empenho do Firebase
 * e atualiza a tabela na interface
 */
function carregarClientesElegiveis() {
    console.log('Iniciando carregamento de clientes elegíveis para empenho...');
    
    // Referência à tabela de clientes
    const clientesTableBody = document.getElementById('clientesEmpenhoTableBody');
    const nenhumCliente = document.getElementById('nenhumClienteEmpenho');
    const loadingSpinner = document.getElementById('loadingClientesEmpenho');
    
    if (!clientesTableBody) {
        console.error('Elemento tbody da tabela de clientes não encontrado!');
        return;
    }
    
    if (!nenhumCliente || !loadingSpinner) {
        console.error('Elementos de feedback não encontrados!');
        return;
    }
    
    // Limpa a tabela
    clientesTableBody.innerHTML = '';
    
    // Mostra o spinner de carregamento
    nenhumCliente.classList.add('d-none');
    loadingSpinner.classList.remove('d-none');
    
    // Verifica se dbRef está disponível
    if (!window.dbRef || !window.dbRef.clientes) {
        console.error('dbRef ou dbRef.clientes não está definido!');
        mostrarNotificacao('Erro ao acessar o banco de dados. Por favor, recarregue a página.', 'danger');
        loadingSpinner.classList.add('d-none');
        return;
    }
    
    console.log('Buscando clientes no Firebase...');
    
    // Busca os clientes no Firebase
    window.dbRef.clientes.once('value')
        .then(snapshot => {
            console.log('Resposta do Firebase recebida:', snapshot.exists());
            
            const clientes = snapshot.val();
            console.log('Dados de clientes:', clientes);
            
            // Verifica se existem clientes cadastrados
            if (objetoVazio(clientes)) {
                console.log('Nenhum cliente encontrado.');
                nenhumCliente.classList.remove('d-none');
                loadingSpinner.classList.add('d-none');
                
                // Destrói a instância do DataTable se existir
                if ($.fn.DataTable.isDataTable('#clientesEmpenhoTable')) {
                    $('#clientesEmpenhoTable').DataTable().destroy();
                }
                
                return;
            }
            
            // Array para armazenar clientes elegíveis
            let clientesElegiveis = [];
            
            // Promessas para verificar elegibilidade de cada cliente
            const promessasVerificacao = [];
            
            // Iterando sobre as chaves do objeto clientes
            Object.keys(clientes).forEach(clienteId => {
                const cliente = clientes[clienteId];
                
                // Não filtra por status de tratamento, apenas verifica se tem itens elegíveis
                // Cria uma promessa para verificar se o cliente tem itens elegíveis para empenho
                const promessa = verificarItensElegiveisParaEmpenho(clienteId)
                    .then(temItensElegiveis => {
                        if (temItensElegiveis) {
                            clientesElegiveis.push({
                                id: clienteId,
                                nome: cliente.nome || cliente.nomeCliente || cliente.razaoSocial || 'Nome não disponível',
                                statusEmpenho: cliente.StatusEmpenho || 'Não iniciado', // Pega o status ou define como 'Não iniciado'
                                dataFinalizado: cliente.DataFinalizadoEmpenho || '' // Pega a data ou deixa vazio
                            });
                        }
                    })
                    .catch(error => {
                        console.error(`Erro ao verificar itens para o cliente ${clienteId}:`, error);
                    });
                    
                promessasVerificacao.push(promessa);
            });
            
            // Aguarda todas as verificações serem concluídas
            Promise.all(promessasVerificacao)
                .then(() => {
                    console.log('Clientes elegíveis encontrados:', clientesElegiveis.length);
                    
                    // Oculta o spinner de carregamento
                    loadingSpinner.classList.add('d-none');
                    
                    if (clientesElegiveis.length === 0) {
                        nenhumCliente.classList.remove('d-none');
                        
                        // Destrói a instância do DataTable se existir
                        if ($.fn.DataTable.isDataTable('#clientesEmpenhoTable')) {
                            $('#clientesEmpenhoTable').DataTable().destroy();
                        }
                        
                        return;
                    }
                    
                    nenhumCliente.classList.add('d-none');
                    
                    // Destrói a tabela existente se já estiver inicializada
                    if ($.fn.DataTable.isDataTable('#clientesEmpenhoTable')) {
                        $('#clientesEmpenhoTable').DataTable().destroy();
                    }
                    
                    // Renderiza os clientes na tabela
                    clientesElegiveis.forEach(cliente => {
                        const tr = document.createElement("tr");
                        tr.classList.add("animate__animated", "animate__fadeIn");
                        tr.dataset.clienteId = cliente.id; // Adiciona ID do cliente para referência futura

                        // Célula com o nome do cliente
                        const tdNome = document.createElement("td");
                        tdNome.textContent = cliente.nome;
                        tr.appendChild(tdNome);

                        // Célula com o Status
                        const tdStatus = document.createElement("td");
                        tdStatus.textContent = cliente.statusEmpenho;
                        // Adiciona classe CSS baseada no status para estilização (opcional)
                        tdStatus.classList.add(`status-${cliente.statusEmpenho.toLowerCase().replace(/\s+/g, '-')}`); 
                        tr.appendChild(tdStatus);

                        // Célula com a Data Finalizado
                        const tdDataFinalizado = document.createElement("td");
                        // Formata a data se existir
                        tdDataFinalizado.textContent = cliente.dataFinalizado ? new Date(cliente.dataFinalizado).toLocaleString('pt-BR') : '--';
                        tr.appendChild(tdDataFinalizado);

                        // Célula com o botão de ação
                        const tdAcao = document.createElement("td");
                        const btnIniciar = document.createElement("button");
                        btnIniciar.classList.add("btn", "btn-sm", "btn-primary");
                        btnIniciar.innerHTML = '<i class="fas fa-play"></i> Iniciar Empenho';
                        // Desabilita o botão se o status for 'Finalizado'
                        if (cliente.statusEmpenho === 'Finalizado') {
                            btnIniciar.disabled = true;
                            btnIniciar.innerHTML = '<i class="fas fa-check"></i> Finalizado';
                            btnIniciar.classList.replace('btn-primary', 'btn-success');
                        } else {
                             btnIniciar.onclick = function() {
                                iniciarEmpenho(cliente.id);
                            };
                        }
                       
                        tdAcao.appendChild(btnIniciar);
                        tr.appendChild(tdAcao);

                        clientesTableBody.appendChild(tr);
                    });
                    
                    // Inicializa o DataTable com os novos dados
                    tabelaClientes = $('#clientesEmpenhoTable').DataTable({
                        language: {
                            url: "//cdn.datatables.net/plug-ins/1.11.5/i18n/pt-BR.json"
                        },
                        responsive: true,
                        columnDefs: [
                            { className: "align-middle", targets: "_all" }
                        ],
                        dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>><"row"<"col-sm-12"tr>><"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
                        order: [[0, 'asc']], // Ordena por nome do cliente (ascendente)
                        drawCallback: function() {
                            console.log('DataTable inicializado e renderizado com sucesso');
                        }
                    });
                })
                .catch(error => {
                    console.error('Erro ao verificar clientes elegíveis:', error);
                    mostrarNotificacao('Erro ao verificar clientes elegíveis. Tente novamente.', 'danger');
                    loadingSpinner.classList.add('d-none');
                });
        })
        .catch(error => {
            console.error('Erro ao carregar clientes:', error);
            mostrarNotificacao('Erro ao carregar clientes. Tente novamente.', 'danger');
            loadingSpinner.classList.add('d-none');
        });
}

/**
 * Verifica se um cliente possui itens elegíveis para empenho
 * Implementação seguindo a lógica correta do Firebase RTDB com logs detalhados:
 * 1. Buscar todos os dados do nó relevante
 * 2. Iterar sobre todos os itens em JavaScript
 * 3. Aplicar o filtro composto no lado do cliente
 * 
 * @param {string} clienteId - ID do cliente a ser verificado
 * @returns {Promise<boolean>} - Promise que resolve para true se o cliente tiver itens elegíveis
 */
function verificarItensElegiveisParaEmpenho(clienteId) {
    return new Promise((resolve, reject) => {
        console.log(`==========================================`);
        console.log(`VERIFICANDO ELEGIBILIDADE PARA CLIENTE: ${clienteId}`);
        console.log(`==========================================`);
        
        // Caminho exato no Firebase que está sendo acessado
        const caminhoFirebase = `projetos/${clienteId}`;
        console.log(`Acessando caminho no Firebase: ${caminhoFirebase}`);
        
        // Busca todos os dados do projeto do cliente
        window.dbRef.projetos.child(clienteId).once('value')
            .then(projetosSnapshot => {
                // Verifica se encontrou algum projeto
                if (!projetosSnapshot.exists()) {
                    console.log(`RESULTADO: Nenhum projeto encontrado para o cliente ${clienteId}.`);
                    resolve(false);
                    return;
                }
                
                // Dados brutos retornados do Firebase
                const projetos = projetosSnapshot.val();
                console.log(`DADOS BRUTOS RETORNADOS DO FIREBASE PARA ${clienteId}:`, JSON.stringify(projetos, null, 2));
                
                // Lista os tipos de projetos encontrados
                const tiposProjetos = Object.keys(projetos);
                console.log(`TIPOS DE PROJETOS ENCONTRADOS (${tiposProjetos.length}):`, tiposProjetos);
                
                // Array para armazenar os itens que atendem aos critérios
                const itensElegiveis = [];
                
                // Percorre todos os tipos de projeto (PVC, Alumínio, etc.)
                tiposProjetos.forEach(tipoProjeto => {
                    const projeto = projetos[tipoProjeto];
                    console.log(`\n>> ANALISANDO PROJETO: ${tipoProjeto}`);
                    console.log(`ESTRUTURA DO PROJETO ${tipoProjeto}:`, Object.keys(projeto));
                    
                    // Verifica se o projeto tem listas
                    if (!projeto.listas) {
                        console.log(`RESULTADO: Projeto ${tipoProjeto} não tem listas.`);
                        return; // Continua para o próximo projeto
                    }
                    
                    // Lista as listas encontradas no projeto
                    const nomesListas = Object.keys(projeto.listas);
                    console.log(`LISTAS ENCONTRADAS EM ${tipoProjeto} (${nomesListas.length}):`, nomesListas);
                    
                    // Percorre todas as listas do projeto
                    nomesListas.forEach(nomeLista => {
                        const lista = projeto.listas[nomeLista];
                        console.log(`\n>>> ANALISANDO LISTA: ${nomeLista}`);
                        
                        // Verifica o tipo da lista (array, objeto, etc.)
                        const tipoLista = Array.isArray(lista) ? 'array' : typeof lista;
                        console.log(`TIPO DA LISTA ${nomeLista}: ${tipoLista}`);
                        
                        if (tipoLista === 'object' && lista !== null) {
                            console.log(`ESTRUTURA DA LISTA ${nomeLista}:`, Object.keys(lista));
                        }
                        
                        // Verifica se a lista é um array
                        if (Array.isArray(lista)) {
                            console.log(`ITENS NA LISTA ${nomeLista} (ARRAY): ${lista.length}`);
                            
                            // Itera sobre os itens do array
                            lista.forEach((item, index) => {
                                if (verificarItemElegivel(item)) {
                                    console.log(`ITEM ELEGÍVEL ENCONTRADO EM ${tipoProjeto}/${nomeLista}[${index}]:`, item);
                                    itensElegiveis.push(item);
                                }
                            });
                        } else if (lista && typeof lista === 'object') {
                            // Verifica se a lista tem um subnó "itens" (como em ListaTratamento)
                            if (lista.itens && Array.isArray(lista.itens)) {
                                console.log(`ITENS NA LISTA ${nomeLista}.itens (ARRAY): ${lista.itens.length}`);
                                
                                // Itera sobre os itens do array
                                lista.itens.forEach((item, index) => {
                                    if (verificarItemElegivel(item)) {
                                        console.log(`ITEM ELEGÍVEL ENCONTRADO EM ${tipoProjeto}/${nomeLista}.itens[${index}]:`, item);
                                        itensElegiveis.push(item);
                                    }
                                });
                            } else {
                                // Caso contrário, itera sobre as chaves do objeto
                                const chavesItens = Object.keys(lista).filter(key => key !== '_nomeListaOriginal' && typeof lista[key] === 'object' && lista[key] !== null);
                                console.log(`ITENS NA LISTA ${nomeLista} (OBJETO): ${chavesItens.length}`);
                                
                                // Itera sobre as chaves dos itens
                                chavesItens.forEach(chaveItem => {
                                    const item = lista[chaveItem];
                                    if (verificarItemElegivel(item)) {
                                        console.log(`ITEM ELEGÍVEL ENCONTRADO EM ${tipoProjeto}/${nomeLista}.${chaveItem}:`, item);
                                        itensElegiveis.push(item);
                                    }
                                });
                            }
                        }
                    });
                });
                
                // Verifica se encontrou itens elegíveis
                const temItensElegiveis = itensElegiveis.length > 0;
                console.log(`RESULTADO FINAL PARA CLIENTE ${clienteId}: ${temItensElegiveis ? 'ELEGÍVEL' : 'NÃO ELEGÍVEL'} (${itensElegiveis.length} itens encontrados)`);
                
                resolve(temItensElegiveis);
            })
            .catch(error => {
                console.error(`Erro ao verificar itens elegíveis para o cliente ${clienteId}:`, error);
                reject(error);
            });
    });
}

/**
 * Verifica se um item é elegível para empenho
 * 
 * @param {Object} item - Item a ser verificado
 * @returns {boolean} - True se o item for elegível para empenho
 */
function verificarItemElegivel(item) {
    // Verifica se o item tem empenho ou quantidadeRecebida
    const temEmpenho = item.empenho && parseFloat(item.empenho) > 0;
    const temQuantidadeRecebida = item.quantidadeRecebida && parseFloat(item.quantidadeRecebida) > 0;
    
    // Retorna true se o item tiver empenho ou quantidadeRecebida
    return temEmpenho || temQuantidadeRecebida;
}

/**
 * Adiciona um item elegível à lista de itens para empenho, se ainda não estiver totalmente empenhado para a respectiva origem.
 * MODIFICADO: Cria duas entradas (Estoque/Compra) e aplica filtro INDEPENDENTE baseado em EmpenhadoEstoque/EmpenhadoCompra vs empenho/necessidade.
 * 
 * @param {Object} item - O objeto original do item vindo do Firebase.
 * @param {string} itemId - ID único original do item (sem sufixos).
 * @param {string} tipoProjeto - Tipo de projeto (PVC, Alumínio, etc.).
 * @param {string} nomeLista - Nome da lista (ListaCorte, ListaTratamento, etc.).
 * @param {Array} itensElegiveis - Array onde os itens elegíveis para a tabela serão adicionados.
 */
function adicionarItemElegivel(item, itemId, tipoProjeto, nomeLista, itensElegiveis) {
    // Obtém os valores relevantes do item original do Firebase
    const empenhoOriginal = parseFloat(item.empenho || 0);
    const quantidadeRecebidaOriginal = parseFloat(item.quantidadeRecebida || 0);
    const necessidadeOriginal = parseFloat(item.necessidade || 0);
    // Obtém os valores empenhados específicos de cada origem
    const quantidadeEmpenhadaEstoque = parseFloat(item.EmpenhadoEstoque || 0);
    const quantidadeEmpenhadaCompra = parseFloat(item.EmpenhadoCompra || 0);

    console.log(`Processando item ${itemId}: Empenho Orig=${empenhoOriginal}, Necessidade Orig=${necessidadeOriginal}, EmpenhadoEstoque=${quantidadeEmpenhadaEstoque}, EmpenhadoCompra=${quantidadeEmpenhadaCompra}`);

    // 1. Lógica para Origem "Estoque"
    // Verifica se há saldo de estoque (empenhoOriginal > 0) E se a quantidade empenhada DO ESTOQUE é menor que o saldo de estoque original.
    if (empenhoOriginal > 0 && quantidadeEmpenhadaEstoque < empenhoOriginal) {
        const qtdeEstoqueParaExibir = empenhoOriginal; // Exibe o valor original do estoque
        
        const itemEstoque = {
            id: `${itemId}_estoque`, // ID para a linha da tabela
            codigo: item.codigo || item.referencia || 'Sem código',
            descricao: item.descricao || item.nome || 'Sem descrição',
            empenho: empenhoOriginal, // Valor original para referência
            quantidadeRecebida: 0, // Zerado para esta linha de origem
            necessidade: necessidadeOriginal, // Valor original para referência
            tipoProjeto: tipoProjeto,
            nomeLista: nomeLista,
            origem: 'Estoque',
            qtdeExibir: qtdeEstoqueParaExibir, // Exibe o saldo original do estoque
            dadosOriginais: item // Mantém referência ao item original
        };
        itensElegiveis.push(itemEstoque);
        todosItens[`${itemId}_estoque`] = itemEstoque;
        console.log(` -> Adicionado item de Estoque: ${itemEstoque.codigo}, Qtde a exibir: ${qtdeEstoqueParaExibir}`);
    } else if (empenhoOriginal > 0) {
         console.log(` -> Item de Estoque ${item.codigo || itemId} já totalmente empenhado (EmpenhadoEstoque: ${quantidadeEmpenhadaEstoque} >= Empenho Original: ${empenhoOriginal}). Não adicionado.`);
    }

    // 2. Lógica para Origem "Compra" (baseado na necessidade)
    // Verifica se há necessidade (necessidadeOriginal > 0) E se a quantidade empenhada DA COMPRA é menor que a necessidade original.
    if (necessidadeOriginal > 0 && quantidadeEmpenhadaCompra < necessidadeOriginal) {
        const qtdeNecessidadeParaExibir = necessidadeOriginal; // Exibe o valor original da necessidade

        const itemCompra = {
            id: `${itemId}_compra`, // ID para a linha da tabela
            codigo: item.codigo || item.referencia || 'Sem código',
            descricao: item.descricao || item.nome || 'Sem descrição',
            empenho: 0, // Zerado para esta linha de origem
            quantidadeRecebida: quantidadeRecebidaOriginal, // Valor original para referência
            necessidade: necessidadeOriginal, // Valor original para referência
            tipoProjeto: tipoProjeto,
            nomeLista: nomeLista,
            origem: 'Compra',
            qtdeExibir: qtdeNecessidadeParaExibir, // Exibe a necessidade original
            dadosOriginais: item // Mantém referência ao item original
        };
        itensElegiveis.push(itemCompra);
        todosItens[`${itemId}_compra`] = itemCompra;
        console.log(` -> Adicionado item de Compra: ${itemCompra.codigo}, Qtde a exibir (necessidade original): ${qtdeNecessidadeParaExibir}`);

    } else if (necessidadeOriginal > 0) {
        console.log(` -> Item de Compra ${item.codigo || itemId} já totalmente empenhado (EmpenhadoCompra: ${quantidadeEmpenhadaCompra} >= Necessidade Original: ${necessidadeOriginal}). Não adicionado.`);
    }
}

/**
 * Inicia o processo de empenho para um cliente
 * 
 * @param {string} clienteId - ID do cliente selecionado
 */
function iniciarEmpenho(clienteId) {
    console.log('Iniciando empenho para o cliente:', clienteId);
    
    // Busca os dados do cliente
    window.dbRef.clientes.child(clienteId).once('value')
        .then(snapshot => {
            const cliente = snapshot.val();
            
            if (!cliente) {
                console.error('Cliente não encontrado:', clienteId);
                mostrarNotificacao('Cliente não encontrado.', 'danger');
                return;
            }
            
            // Registra a data e hora de início do empenho
            const dataHoraInicio = new Date().toISOString();
            // Atualiza o status para 'Em Andamento' e registra a data de início
            const updates = {};
            updates[`${clienteId}/processoEmpenho/dataHoraInicioSeparacao`] = dataHoraInicio;
            // Só atualiza para 'Em Andamento' se não estiver 'Finalizado'
            if (cliente.StatusEmpenho !== 'Finalizado') {
                 updates[`${clienteId}/StatusEmpenho`] = 'Em Andamento';
            }
           
            window.dbRef.clientes.update(updates)
                .then(() => {
                    console.log('Status do empenho atualizado para Em Andamento e data de início registrada.');
                    
                    // Armazena o cliente atual
                    clienteAtual = {
                        id: clienteId,
                        nome: cliente.nome || cliente.nomeCliente || cliente.razaoSocial || 'Nome não disponível'
                    };
                    
                    // Atualiza o título com o nome do cliente
                    document.querySelector('#empenhoItensTitle span').textContent = clienteAtual.nome;
                    
                    // Oculta a seção de seleção de cliente e exibe a seção de empenho de itens
                    document.getElementById('selecaoClienteEmpenhoSection').classList.add('d-none');
                    document.getElementById('empenhoItensSection').classList.remove('d-none');
                    
                    // Adiciona animação de fade-in
                    document.getElementById('empenhoItensSection').classList.add('animate__animated', 'animate__fadeIn');
                    
                    // Carrega os itens do cliente elegíveis para empenho
                    carregarItensParaEmpenho(clienteId);
                })
                .catch(error => {
                    console.error('Erro ao registrar data e hora de início do empenho:', error);
                    mostrarNotificacao('Erro ao iniciar o processo de empenho. Tente novamente.', 'danger');
                });
        })
        .catch(error => {
            console.error('Erro ao buscar dados do cliente:', error);
            mostrarNotificacao('Erro ao buscar dados do cliente. Tente novamente.', 'danger');
        });
}

/**
 * Carrega os itens do cliente elegíveis para empenho
 * 
 * @param {string} clienteId - ID do cliente selecionado
 */
function carregarItensParaEmpenho(clienteId) {
    console.log('Carregando itens para empenho do cliente:', clienteId);
    
    // Referência à tabela de itens
    const itensTableBody = document.getElementById('itensEmpenhoTableBody');
    const nenhumItem = document.getElementById('nenhumItemEmpenho');
    const loadingSpinner = document.getElementById('loadingItensEmpenho');
    
    if (!itensTableBody || !nenhumItem || !loadingSpinner) {
        console.error('Elementos da tabela de itens não encontrados!');
        return;
    }
    
    // Limpa a tabela e o objeto de itens
    itensTableBody.innerHTML = '';
    todosItens = {};
    itensSelecionados = [];
    
    // Mostra o spinner de carregamento
    nenhumItem.classList.add('d-none');
    loadingSpinner.classList.remove('d-none');
    
    // Desabilita o botão de empenhar selecionados
    document.getElementById('empenharSelecionadosButton').disabled = true;
    
    // Busca os projetos do cliente
    window.dbRef.projetos.child(clienteId).once('value')
        .then(snapshot => {
            const projetos = snapshot.val();
            
            // Oculta o spinner de carregamento
            loadingSpinner.classList.add('d-none');
            
            if (!projetos) {
                console.log('Nenhum projeto encontrado para o cliente:', clienteId);
                nenhumItem.classList.remove('d-none');
                return;
            }
            
            let itensElegiveis = [];
            let itemId = 0; // Contador para gerar IDs únicos para itens em arrays
            
            // Itera sobre os tipos de projeto (PVC, Alumínio, etc.)
            Object.keys(projetos).forEach(tipoProjeto => {
                const projeto = projetos[tipoProjeto];
                console.log(`Carregando itens do projeto ${tipoProjeto}...`);
                
                // Verifica se o projeto tem listas
                if (projeto.listas) {
                    // Itera sobre as listas do projeto
                    Object.keys(projeto.listas).forEach(nomeLista => {
                        const lista = projeto.listas[nomeLista];
                        console.log(`Carregando itens da lista ${nomeLista}...`);
                        
                        // Verifica se a lista é um array ou um objeto
                        if (Array.isArray(lista)) {
                            // Se for um array, itera sobre os elementos
                            lista.forEach((item, index) => {
                                if (verificarItemElegivel(item)) {
                                    const itemUniqueId = `array_${tipoProjeto}_${nomeLista}_${index}`;
                                    adicionarItemElegivel(item, itemUniqueId, tipoProjeto, nomeLista, itensElegiveis);
                                }
                            });
                        } else if (lista && typeof lista === 'object') {
                            // Se for um objeto, verifica se tem um subnó "itens" (como em ListaTratamento)
                            if (lista.itens && Array.isArray(lista.itens)) {
                                lista.itens.forEach((item, index) => {
                                    if (verificarItemElegivel(item)) {
                                        const itemUniqueId = `itens_${tipoProjeto}_${nomeLista}_${index}`;
                                        adicionarItemElegivel(item, itemUniqueId, tipoProjeto, nomeLista, itensElegiveis);
                                    }
                                });
                            } else {
                                // Caso contrário, itera sobre as chaves do objeto
                                Object.keys(lista).forEach(itemKey => {
                                    // Pular metadados como _nomeListaOriginal
                                    if (itemKey === '_nomeListaOriginal' || typeof lista[itemKey] !== 'object' || lista[itemKey] === null) return;
                                    
                                    const item = lista[itemKey];
                                    if (verificarItemElegivel(item)) {
                                        adicionarItemElegivel(item, itemKey, tipoProjeto, nomeLista, itensElegiveis);
                                    }
                                });
                            }
                        }
                    });
                }
            });
            
            // Verifica se há itens elegíveis
            if (itensElegiveis.length === 0) {
                console.log('Nenhum item elegível para empenho encontrado.');
                nenhumItem.classList.remove('d-none');
                return;
            }
            
            console.log(`Total de itens elegíveis encontrados: ${itensElegiveis.length}`);
            nenhumItem.classList.add('d-none');
            
            // Renderiza os itens na tabela
            itensElegiveis.forEach(item => {
                const tr = document.createElement('tr');
                tr.dataset.id = item.id;
                tr.classList.add('animate__animated', 'animate__fadeIn');
                
                // Exibe o valor da coluna Qtde. conforme a origem do item
                const qtdeExibir = item.qtdeExibir || 0;
                
                // Verifica se o item pode ser empenhado (para origem 'Compra', só se quantidadeRecebida não for igual a 0)
                const podeEmpenhar = item.origem === 'Estoque' || 
                                    (item.origem === 'Compra' && item.quantidadeRecebida !== 0);
                
                // Classe e texto do botão de empenhar
                const btnClass = podeEmpenhar ? 'btn-success' : 'btn-secondary';
                const btnText = podeEmpenhar ? 'Empenhar' : 'Indisponível';
                
                tr.innerHTML = `
                    <td>
                        <div class="form-check">
                            <input class="form-check-input check-item" type="checkbox" data-id="${item.id}" ${!podeEmpenhar ? 'disabled' : ''}>
                        </div>
                    </td>
                    <td>${item.codigo}</td>
                    <td>${item.descricao}</td>
                    <td>${item.origem}</td>
                    <td>${qtdeExibir}</td>
                    <td class="text-center">
                        <button class="btn btn-info btn-sm btn-detalhes" onclick="mostrarDetalhesItem('${item.id}')">
                            <i class="fas fa-plus"></i>
                        </button>
                    </td>
                    <td>
                        <button class="btn ${btnClass} btn-sm" onclick="empenharItem('${item.id}')" ${!podeEmpenhar ? 'disabled' : ''}>
                            ${btnText}
                        </button>
                    </td>
                `;
                
                itensTableBody.appendChild(tr);
            });
            
            // Inicializa o DataTable para a tabela de itens
            if ($.fn.DataTable.isDataTable('#itensEmpenhoTable')) {
                $('#itensEmpenhoTable').DataTable().destroy();
            }
            
            tabelaItens = $('#itensEmpenhoTable').DataTable({
                language: {
                    url: "//cdn.datatables.net/plug-ins/1.11.5/i18n/pt-BR.json"
                },
                responsive: true,
                columnDefs: [
                    { className: "align-middle", targets: "_all" },
                    { orderable: false, targets: [0, 4, 5, 6] } // Colunas não ordenáveis (ajustado para incluir a nova coluna)
                ],
                dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>><"row"<"col-sm-12"tr>><"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
                order: [[1, 'asc']] // Ordena por código (ascendente)
            });
            
            // Adiciona listeners para os checkboxes dos itens
            document.querySelectorAll('.check-item').forEach(checkbox => {
                checkbox.addEventListener('change', function() {
                    atualizarSelecao();
                });
            });
            
            // Adiciona listeners para os campos de quantidade
            document.querySelectorAll('.input-quantidade').forEach(input => {
                input.addEventListener('change', function() {
                    validarQuantidade(this);
                });
            });
            
            console.log('Itens para empenho carregados com sucesso.');
        })
        .catch(error => {
            console.error('Erro ao carregar itens para empenho:', error);
            mostrarNotificacao('Erro ao carregar itens para empenho. Tente novamente.', 'danger');
            loadingSpinner.classList.add('d-none');
            nenhumItem.classList.remove('d-none');
        });
}

/**
 * Valida a quantidade informada para um item
 * 
 * @param {HTMLInputElement} input - Elemento de input da quantidade
 */
function validarQuantidade(input) {
    const min = parseInt(input.min);
    const max = parseInt(input.max);
    let valor = parseInt(input.value);
    
    // Garante que o valor esteja dentro dos limites
    if (isNaN(valor) || valor < min) {
        valor = min;
    } else if (valor > max) {
        valor = max;
    }
    
    // Atualiza o valor do input
    input.value = valor;
}

/**
 * Atualiza a seleção de itens
 */
function atualizarSelecao() {
    // Limpa a lista de itens selecionados
    itensSelecionados = [];
    
    // Percorre todos os checkboxes marcados
    document.querySelectorAll('.check-item:checked').forEach(checkbox => {
        const itemId = checkbox.dataset.id;
        const item = todosItens[itemId];
        
        if (item) {
            // Obtém a quantidade informada
            const input = document.querySelector(`.input-quantidade[data-id="${itemId}"]`);
            const quantidade = parseInt(input?.value || 1);
            
            // Adiciona o item à lista de selecionados
            itensSelecionados.push({
                id: itemId,
                item: item,
                quantidade: quantidade
            });
        }
    });
    
    // Atualiza o estado do botão de empenhar selecionados
    document.getElementById('empenharSelecionadosButton').disabled = itensSelecionados.length === 0;
    
    console.log('Seleção atualizada:', itensSelecionados);
}

/**
 * Empenha um item específico
 * 
 * @param {string} itemId - ID do item a ser empenhado
 */
function empenharItem(itemId) {
    console.log('Empenhando item:', itemId);
    
    const item = todosItens[itemId];
    
    if (!item) {
        console.error('Item não encontrado:', itemId);
        mostrarNotificacao('Item não encontrado.', 'danger');
        return;
    }
    
    // Verifica se o item pode ser empenhado (para origem 'Compra', só se quantidadeRecebida não for igual a 0)
    if (item.origem === 'Compra' && item.quantidadeRecebida === 0) {
        console.error('Item de origem Compra não pode ser empenhado com quantidadeRecebida = 0:', itemId);
        mostrarNotificacao('Item de origem Compra não pode ser empenhado sem quantidade recebida.', 'danger');
        return;
    }
    
    // Obtém a quantidade a ser empenhada diretamente do item (qtdeExibir)
    const quantidade = item.qtdeExibir;

    // Valida a quantidade (simples verificação se é maior que 0)
    // A validação de saldoDisponivel não se aplica aqui, pois estamos empenhando o que está disponível.
    if (quantidade <= 0) {
         console.error('Quantidade inválida ou zero:', quantidade);
         mostrarNotificacao('Quantidade inválida ou zero para empenho.', 'danger');
         return;
    }

    // Empenha o item
    empenharItens([{
        id: itemId,
        item: item,
        quantidade: quantidade // Passa a quantidade correta
    }]);
}

/**
 * Empenha os itens selecionados
 */
function empenharItensSelecionados() {
    console.log('Empenhando itens selecionados:', itensSelecionados);
    
    if (itensSelecionados.length === 0) {
        console.error('Nenhum item selecionado.');
        mostrarNotificacao('Nenhum item selecionado.', 'danger');
        return;
    }
    
    // Verifica se todos os itens podem ser empenhados
    const itemInvalido = itensSelecionados.find(itemObj => 
        itemObj.item.origem === 'Compra' && itemObj.item.quantidadeRecebida === 0
    );
    
    if (itemInvalido) {
        console.error('Item de origem Compra não pode ser empenhado com quantidadeRecebida = 0:', itemInvalido.id);
        mostrarNotificacao('Um ou mais itens de origem Compra não podem ser empenhados sem quantidade recebida.', 'danger');
        return;
    }
    
    // Empenha os itens
    empenharItens(itensSelecionados);
}

/**
 * Empenha os itens informados
 * 
 * @param {Array} itens - Array de objetos com os itens a serem empenhados
 */
function empenharItens(itens) {
    console.log('Empenhando itens:', itens);
    
    if (!clienteAtual) {
        console.error('Cliente não selecionado.');
        mostrarNotificacao('Cliente não selecionado.', 'danger');
        return;
    }
    
    // Mostra um spinner de carregamento
    const loadingSpinner = document.createElement('div');
    loadingSpinner.classList.add('spinner-border', 'spinner-border-sm', 'me-2');
    loadingSpinner.setAttribute('role', 'status');
    loadingSpinner.innerHTML = '<span class="visually-hidden">Carregando...</span>';
    
    // Desabilita os botões de empenhar
    document.querySelectorAll('.btn-success').forEach(button => {
        button.disabled = true;
        button.prepend(loadingSpinner.cloneNode(true));
    });
    
    // Cria um array de promessas para empenhar cada item
    const promessasEmpenho = [];
    
    // Itera sobre os itens a serem empenhados
    itens.forEach(itemObj => {
        const { id, item, quantidade } = itemObj;
        
        // Cria uma promessa para empenhar o item
        const promessa = empenharItemNoFirebase(clienteAtual.id, item, quantidade)
            .then(() => {
                console.log(`Item ${id} empenhado com sucesso.`);
                
                // Remove o item da tabela
                const tr = document.querySelector(`tr[data-id="${id}"]`);
                if (tr) {
                    tr.classList.add('animate__animated', 'animate__fadeOut');
                    setTimeout(() => {
                        tr.remove();
                    }, 500);
                }
                
                // Remove o item da lista de todos os itens
                delete todosItens[id];
                
                // Atualiza a seleção
                atualizarSelecao();
            })
            .catch(error => {
                console.error(`Erro ao empenhar item ${id}:`, error);
                mostrarNotificacao(`Erro ao empenhar item ${item.codigo}: ${error.message}`, 'danger');
            });
            
        promessasEmpenho.push(promessa);
    });
    
    // Aguarda todas as promessas serem concluídas
    Promise.all(promessasEmpenho)
        .then(() => {
            console.log('Todos os itens foram empenhados com sucesso.');
            mostrarNotificacao('Itens empenhados com sucesso.', 'success');
            
            // Habilita os botões de empenhar
            document.querySelectorAll('.btn-success').forEach(button => {
                button.disabled = false;
                const spinner = button.querySelector('.spinner-border');
                if (spinner) {
                    spinner.remove();
                }
            });
            
            // Verifica se ainda há itens na tabela
            if (Object.keys(todosItens).length === 0) {
                console.log("Não há mais itens para empenhar para este cliente.");
                document.getElementById("nenhumItemEmpenho").classList.remove("d-none");

                // Atualiza o status do cliente para 'Finalizado' e salva a data
                const dataFinalizado = new Date().toISOString();
                const updates = {};
                updates[`${clienteAtual.id}/StatusEmpenho`] = "Finalizado";
                updates[`${clienteAtual.id}/DataFinalizadoEmpenho`] = dataFinalizado;

                window.dbRef.clientes.update(updates)
                    .then(() => {
                        console.log("Status do cliente atualizado para Finalizado e data registrada.");
                        mostrarNotificacao("Empenho finalizado para este cliente.", "success");
                        // Opcional: Atualizar a linha do cliente na tabela de clientes (se visível)
                        atualizarLinhaClienteNaTabela(clienteAtual.id, "Finalizado", dataFinalizado);
                        // Volta para a lista de clientes após finalizar
                        setTimeout(voltarParaListaClientes, 1500); 
                    })
                    .catch(error => {
                        console.error("Erro ao atualizar status do cliente para Finalizado:", error);
                        mostrarNotificacao("Erro ao finalizar o empenho do cliente.", "danger");
                    });
            }
        })
        .catch(error => {
            console.error('Erro ao empenhar itens:', error);
            mostrarNotificacao('Erro ao empenhar itens. Tente novamente.', 'danger');
            
            // Habilita os botões de empenhar
            document.querySelectorAll('.btn-success').forEach(button => {
                button.disabled = false;
                const spinner = button.querySelector('.spinner-border');
                if (spinner) {
                    spinner.remove();
                }
            });
        });
}

/**
 * Empenha um item no Firebase, atualizando os campos StatusEmpenho, DATAEMPENHO e o campo específico da origem (EmpenhadoEstoque ou EmpenhadoCompra).
 * Utiliza a referência específica do item para a atualização.
 * 
 * @param {string} clienteId - ID do cliente
 * @param {Object} item - Item a ser empenhado (objeto derivado com id, tipoProjeto, nomeLista, origem, etc.)
 * @param {number} quantidade - Quantidade a ser empenhada (qtdeExibir da linha específica)
 * @returns {Promise} - Promise que resolve quando o item for empenhado
 */
function empenharItemNoFirebase(clienteId, item, quantidade) {
    return new Promise((resolve, reject) => {
        console.log(`Iniciando empenho no Firebase para item: ${item.codigo}, Origem: ${item.origem}, Quantidade: ${quantidade}, ID derivado: ${item.id}`);
        
        const { tipoProjeto, nomeLista, id: itemIdDerivado, origem } = item;
        let itemPath = null;
        let originalItemId = itemIdDerivado;

        try {
            // Remove os sufixos _estoque ou _compra para obter o ID/chave original
            if (itemIdDerivado.endsWith("_estoque")) {
                originalItemId = itemIdDerivado.substring(0, itemIdDerivado.length - "_estoque".length);
            } else if (itemIdDerivado.endsWith("_compra")) {
                originalItemId = itemIdDerivado.substring(0, itemIdDerivado.length - "_compra".length);
            }
            console.log(`ID Derivado: ${itemIdDerivado}, ID Original para Path: ${originalItemId}`);

            // Determina o caminho original do item no Firebase usando o ID original
            // (Lógica de path mantida da versão anterior)
            if (originalItemId.startsWith("array_")) {
                const parts = originalItemId.split("_");
                const index = parts[parts.length - 1];
                itemPath = `projetos/${clienteId}/${tipoProjeto}/listas/${nomeLista}/${index}`;
            } else if (originalItemId.startsWith("itens_")) {
                const parts = originalItemId.split("_");
                const index = parts[parts.length - 1];
                itemPath = `projetos/${clienteId}/${tipoProjeto}/listas/${nomeLista}/itens/${index}`;
            } else {
                itemPath = `projetos/${clienteId}/${tipoProjeto}/listas/${nomeLista}/${originalItemId}`;
            }
            console.log(`Path Firebase determinado: ${itemPath}`);

            if (!itemPath) {
                throw new Error("Não foi possível determinar o caminho do item no Firebase.");
            }

            if (!firebase || !firebase.database) {
                 console.error("SDK do Firebase Database não está carregado!");
                 return reject(new Error("SDK do Firebase Database não está disponível."));
            }

            const itemRef = firebase.database().ref(itemPath);
            console.log(`Referência Firebase criada: ${itemRef.toString()}`);

            // Dados a serem atualizados
            const dataAtual = new Date().toISOString();
            const updateData = {
                StatusEmpenho: "Empenhado", // Status geral
                DATAEMPENHO: dataAtual      // Data do último empenho
            };

            // Adiciona o campo específico da origem
            if (origem === 'Estoque') {
                // Atualiza EmpenhadoEstoque. Se não existir, cria com o valor.
                // Usar update é mais simples que transação se não houver concorrência alta.
                // Para somar ao valor existente, precisaríamos ler primeiro ou usar transação/increment.
                // Como a lógica atual parece empenhar o valor total da linha, vamos apenas setar.
                updateData.EmpenhadoEstoque = quantidade; 
                console.log(`Atualizando EmpenhadoEstoque para: ${quantidade}`);
            } else if (origem === 'Compra') {
                updateData.EmpenhadoCompra = quantidade;
                console.log(`Atualizando EmpenhadoCompra para: ${quantidade}`);
            } else {
                console.warn(`Origem desconhecida para empenho: ${origem}. Não atualizando campo específico.`);
            }

            console.log(`Atualizando referência ${itemRef.toString()} com:`, updateData);

            // Executa a atualização
            itemRef.update(updateData)
                .then(() => {
                    console.log(`Firebase atualizado com sucesso para ${itemPath}`);
                    resolve();
                })
                .catch(error => {
                    console.error(`Erro ao atualizar Firebase para ${itemPath}:`, error);
                    reject(new Error(`Erro ao atualizar Firebase: ${error.message}`));
                });

        } catch (error) {
            console.error(`Erro ao processar empenho para item ${itemIdDerivado}:`, error);
            reject(error);
        }
    });
}

/**
 * Mostra os detalhes de um item
 * 
 * @param {string} itemId - ID do item
 */
function mostrarDetalhesItem(itemId) {
    console.log('Mostrando detalhes do item:', itemId);
    
    const item = todosItens[itemId];
    
    if (!item) {
        console.error('Item não encontrado:', itemId);
        mostrarNotificacao('Item não encontrado.', 'danger');
        return;
    }
    
    // Referência ao modal de detalhes
    const modal = new bootstrap.Modal(document.getElementById('modalDetalhesItem'));
    
    // Referência ao conteúdo do modal
    const conteudo = document.getElementById('detalhesItemConteudo');
    
    // Limpa o conteúdo do modal
    conteudo.innerHTML = '';
    
    // Cria uma tabela para exibir os detalhes do item
    const tabela = document.createElement('table');
    tabela.classList.add('table', 'table-striped', 'table-hover');
    
    // Verifica se o item pode ser empenhado (para origem 'Compra', só se quantidadeRecebida não for igual a 0)
    const podeEmpenhar = item.origem === 'Estoque' || 
                        (item.origem === 'Compra' && item.quantidadeRecebida !== 0);
    
    // Status de disponibilidade para empenho
    const statusEmpenho = podeEmpenhar ? 
                        '<span class="badge bg-success">Disponível para empenho</span>' : 
                        '<span class="badge bg-danger">Indisponível para empenho</span>';
    
    // Adiciona as linhas da tabela
    tabela.innerHTML = `
        <tr>
            <th>Código</th>
            <td>${item.codigo}</td>
        </tr>
        <tr>
            <th>Descrição</th>
            <td>${item.descricao}</td>
        </tr>
        <tr>
            <th>Tipo de Projeto</th>
            <td>${item.tipoProjeto}</td>
        </tr>
        <tr>
            <th>Lista</th>
            <td>${item.nomeLista}</td>
        </tr>
        <tr>
            <th>Origem</th>
            <td>${item.origem}</td>
        </tr>
        <tr>
            <th>Status</th>
            <td>${statusEmpenho}</td>
        </tr>
        <tr>
            <th>Empenho</th>
            <td>${item.empenho}</td>
        </tr>
        <tr>
            <th>Quantidade Recebida</th>
            <td>${item.quantidadeRecebida}</td>
        </tr>
        <tr>
            <th>Necessidade</th>
            <td>${item.necessidade || 0}</td>
        </tr>
        <tr>
            <th>Qtde. Exibida</th>
            <td>${item.qtdeExibir || 0}</td>
        </tr>
        <tr>
            <th>Saldo Disponível</th>
            <td>${item.saldoDisponivel}</td>
        </tr>
    `;
    
    // Adiciona a tabela ao conteúdo do modal
    conteudo.appendChild(tabela);
    
    // Exibe o modal
    modal.show();
}

/**
 * Volta para a lista de clientes
 */
function voltarParaListaClientes() {
    console.log('Voltando para a lista de clientes...');
    
    // Oculta a seção de empenho de itens e exibe a seção de seleção de cliente
    document.getElementById('empenhoItensSection').classList.add('d-none');
    document.getElementById('selecaoClienteEmpenhoSection').classList.remove('d-none');
    
    // Adiciona animação de fade-in
    document.getElementById('selecaoClienteEmpenhoSection').classList.add('animate__animated', 'animate__fadeIn');
    
    // Limpa o cliente atual
    clienteAtual = null;
}

/**
 * Verifica se um objeto está vazio
 * 
 * @param {Object} obj - Objeto a ser verificado
 * @returns {boolean} - True se o objeto estiver vazio
 */
function objetoVazio(obj) {
    return obj === null || obj === undefined || (Object.keys(obj).length === 0 && obj.constructor === Object);
}

/**
 * Mostra uma notificação na interface
 * 
 * @param {string} mensagem - Mensagem a ser exibida
 * @param {string} tipo - Tipo da notificação (success, danger, warning, info)
 */
function mostrarNotificacao(mensagem, tipo) {
    // Cria um elemento de alerta
    const alerta = document.createElement('div');
    alerta.classList.add('alert', `alert-${tipo}`, 'alert-dismissible', 'fade', 'show', 'position-fixed', 'top-0', 'end-0', 'm-3');
    alerta.setAttribute('role', 'alert');
    alerta.style.zIndex = '9999';
    
    // Adiciona o conteúdo do alerta
    alerta.innerHTML = `
        ${mensagem}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fechar"></button>
    `;
    
    // Adiciona o alerta ao corpo da página
    document.body.appendChild(alerta);
    
    // Remove o alerta após 5 segundos
    setTimeout(() => {
        alerta.classList.remove('show');
        setTimeout(() => {
            alerta.remove();
        }, 150);
    }, 5000);
}



/**
 * Aplica o filtro de origem na tabela de itens
 * 
 * @param {string} filtro - O tipo de filtro a ser aplicado ('Total', 'Compra', 'Estoque')
 */
function aplicarFiltroOrigem(filtro) {
    console.log(`Aplicando filtro de origem: ${filtro}`);
    const itensTableBody = document.getElementById('itensEmpenhoTableBody');
    const linhas = itensTableBody.querySelectorAll('tr');

    linhas.forEach(linha => {
        const origemCelula = linha.querySelector('td:nth-child(4)'); // A 4ª coluna é a Origem
        if (origemCelula) {
            const origemItem = origemCelula.textContent.trim();
            
            if (filtro === 'Total') {
                linha.style.display = ''; // Mostra todas as linhas
            } else if (filtro === 'Compra') {
                if (origemItem === 'Compra') {
                    linha.style.display = ''; // Mostra apenas linhas de Compra
                } else {
                    linha.style.display = 'none'; // Esconde outras linhas
                }
            } else if (filtro === 'Estoque') {
                if (origemItem === 'Estoque') {
                    linha.style.display = ''; // Mostra apenas linhas de Estoque
                } else {
                    linha.style.display = 'none'; // Esconde outras linhas
                }
            }
        }
    });

    // Atualiza a seleção e o estado do botão de empenhar após filtrar
    atualizarSelecao(); 
    // Desmarca o checkbox "Selecionar Todos" se nem todos os itens visíveis estiverem marcados
    const todosVisiveisMarcados = verificarTodosVisiveisMarcados();
    document.getElementById('selecionarTodosItensEmpenho').checked = todosVisiveisMarcados;
}

/**
 * Verifica se todos os checkboxes visíveis e habilitados estão marcados.
 * @returns {boolean} True se todos os checkboxes visíveis e habilitados estiverem marcados.
 */
function verificarTodosVisiveisMarcados() {
    const checkboxesVisiveisHabilitados = document.querySelectorAll('#itensEmpenhoTableBody tr:not([style*="display: none"]) .check-item:not([disabled])');
    if (checkboxesVisiveisHabilitados.length === 0) {
        return false; // Não há itens visíveis para marcar
    }
    for (let checkbox of checkboxesVisiveisHabilitados) {
        if (!checkbox.checked) {
            return false;
        }
    }
    return true;
}

