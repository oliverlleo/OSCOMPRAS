/**
 * compras.js
 * 
 * Lógica principal da tela de Compras
 * Este arquivo contém a lógica JavaScript principal para a tela de Compras
 * do Sistema de Controle de Compras e Recebimento
 */

// Variáveis globais do módulo
let clienteAtual = null;
let itensSelecionados = [];
let colunasOcultas = true;
let filtroListaAtual = 'todas';
let tabelaItens = null;
let itemIdParaEditarPrazo = null;
let todosItens = [];
let filtroListaPendente = null; // Armazena um filtro pendente para aplicar após inicialização da tabela
let inicializacaoEmProgresso = false; // Flag para evitar inicializações simultâneas

// Inicialização quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM carregado na página de compras');
    
    // Inicializar componentes básicos
    inicializarComponentesBasicos();
    
    // Verificar se o dbRef está disponível antes de carregar os clientes
    console.log('Verificando disponibilidade de dbRef...');
    
    // Função para tentar carregar clientes com retry
    function tentarCarregarClientes(tentativas = 0, maxTentativas = 5) {
        console.log(`Tentativa ${tentativas + 1} de ${maxTentativas} para carregar clientes`);
        
        if (typeof window.dbRef !== 'undefined' && window.dbRef.clientes) {
            console.log('dbRef disponível, carregando clientes...');
            // Carrega a lista de clientes cadastrados
            carregarClientes();
            
            // Configurar event listeners completos após garantir que dbRef está disponível
            configurarEventListeners();
        } else {
            console.log('dbRef não disponível ainda, aguardando...');
            
            if (tentativas < maxTentativas) {
                // Aguarda um momento para garantir que o Firebase esteja inicializado
                setTimeout(function() {
                    tentarCarregarClientes(tentativas + 1, maxTentativas);
                }, 1000);
            } else {
                console.error('dbRef ainda não disponível após várias tentativas');
                alert('Erro ao conectar ao banco de dados. Por favor, recarregue a página.');
                
                // Tenta criar manualmente a referência como último recurso
                try {
                    console.log('Tentando criar referência manualmente...');
                    if (firebase && firebase.database) {
                        window.dbRef = {
                            clientes: firebase.database().ref('clientes'),
                            projetos: firebase.database().ref('projetos')
                        };
                        console.log('Referência criada manualmente, tentando carregar clientes...');
                        carregarClientes();
                        
                        // Configurar event listeners completos após criar referência manualmente
                        configurarEventListeners();
                    }
                } catch (error) {
                    console.error('Erro ao criar referência manualmente:', error);
                }
            }
        }
    }
    
    // Inicia o processo de carregamento com retry
    tentarCarregarClientes();
});

/**
 * Inicializa os componentes básicos da página
 * Configura elementos que não dependem do carregamento de dados
 */
function inicializarComponentesBasicos() {
    console.log('Inicializando componentes básicos...');
    
    // Configurar o botão de toggle para mostrar/ocultar colunas
    const btnToggleColunas = document.getElementById('btnToggleColunas');
    if (btnToggleColunas) {
        btnToggleColunas.textContent = colunasOcultas ? '+' : '-';
    }
    
    // Ocultar colunas de detalhes por padrão
    const colunasOcultasElements = document.querySelectorAll('.coluna-oculta');
    colunasOcultasElements.forEach(coluna => {
        coluna.style.display = colunasOcultas ? 'none' : '';
    });
}

/**
 * Configura os event listeners da página
 */
function configurarEventListeners() {
    console.log('Configurando event listeners...');
    
    // Event listener para o botão de toggle de colunas
    document.getElementById('btnToggleColunas').addEventListener('click', function() {
        toggleColunas();
    });
    
    // Event listener para o checkbox "Todos"
    document.getElementById('checkTodos').addEventListener('change', function() {
        selecionarTodos(this.checked);
    });
    
    // Event listener para o botão de comprar selecionados
    document.getElementById('btnComprarSelecionados').addEventListener('click', function() {
        abrirModalCompra();
    });
    
    // Event listener para o botão de finalizar compras
    document.getElementById('btnFinalizar').addEventListener('click', function() {
        abrirModalConfirmacao();
    });
    
    // Event listener para o botão de confirmar compra
    document.getElementById('btnConfirmarCompra').addEventListener('click', function() {
        confirmarCompra();
    });
    
    // Event listener para o botão de confirmar finalização
    document.getElementById('btnConfirmarFinalizacao').addEventListener('click', function() {
        confirmarFinalizacao();
    });
    
    // Event listener para o botão de confirmar novo prazo
    document.getElementById('btnConfirmarNovoPrazo').addEventListener('click', function() {
        confirmarNovoPrazo();
    });
    
    // Event listener para o checkbox de quantidade personalizada
    document.getElementById('checkQuantidadePersonalizada').addEventListener('change', function() {
        toggleQuantidadePersonalizada(this.checked);
    });
    
    // Event listeners para os botões de filtro de lista
    const botoesFiltragem = document.querySelectorAll('.filtro-lista');
    botoesFiltragem.forEach(botao => {
        botao.addEventListener('click', function() {
            const lista = this.getAttribute('data-lista');
            aplicarFiltroLista(lista);
        });
    });
    
    console.log('Event listeners configurados com sucesso');
}

/**
 * Carrega a lista de clientes com itens para compra
 */
function carregarClientes() {
    console.log('Iniciando carregamento de clientes para compras...');
    
    // Referência à tabela de clientes
    const tabelaClientes = document.querySelector('#tabelaClientes tbody');
    const nenhumCliente = document.getElementById('nenhumCliente');
    
    if (!tabelaClientes) {
        console.error('Elemento tbody da tabela de clientes não encontrado!');
        return;
    }
    
    if (!nenhumCliente) {
        console.error('Elemento nenhumCliente não encontrado!');
        return;
    }
    
    // Limpa a tabela
    tabelaClientes.innerHTML = '';
    
    // Verificar se dbRef está disponível
    if (!window.dbRef || !window.dbRef.clientes) {
        console.error('dbRef ou dbRef.clientes não está definido!');
        alert('Erro ao acessar o banco de dados. Por favor, recarregue a página.');
        return;
    }
    
    console.log('Buscando clientes no Firebase...');
    
    // Buscar todos os clientes
    window.dbRef.clientes.once('value')
        .then((snapshot) => {
            console.log('Resposta do Firebase recebida:', snapshot.exists());
            
            const clientes = snapshot.val();
            console.log('Dados de clientes:', clientes);
            
            // Verifica se existem clientes cadastrados
            if (objetoVazio(clientes)) {
                console.log('Nenhum cliente encontrado');
                nenhumCliente.classList.remove('d-none');
                
                // Destrói a instância do DataTable se existir
                if ($.fn.DataTable.isDataTable('#tabelaClientes')) {
                    $('#tabelaClientes').DataTable().destroy();
                }
                
                return;
            }
            
            console.log('Clientes encontrados:', Object.keys(clientes).length);
            nenhumCliente.classList.add('d-none');
            
            // Preparar dados para DataTables
            console.log('Preparando dados para DataTables...');
            let dataSet = [];
            
            // Iterando sobre as chaves do objeto clientes
            console.log('Iterando sobre clientes para renderização na tabela...');
            Object.keys(clientes).forEach(clienteId => {
                console.log('Processando cliente com chave:', clienteId);
                
                // Verifica se o valor é um objeto que contém as propriedades esperadas
                const clienteObj = clientes[clienteId];
                if (clienteObj && typeof clienteObj === 'object' && clienteObj.nome) {
                    console.log('Cliente válido encontrado:', clienteObj.nome);
                    const cliente = clienteObj;
                    
                    // Formatar a data de criação
                    let dataCriacao = 'Não definida';
                    if (cliente.dataCriacao) {
                        const dataObj = new Date(cliente.dataCriacao);
                        dataCriacao = dataObj.toLocaleDateString('pt-BR');
                    }
                    
                    // Formatar o prazo de entrega
                    let prazoEntrega = 'Não definido';
                    if (cliente.prazoEntrega) {
                        // CORREÇÃO: Verificar se já está no formato brasileiro
                        if (typeof cliente.prazoEntrega === 'string' && cliente.prazoEntrega.includes('/')) {
                            prazoEntrega = cliente.prazoEntrega;
                        } else {
                            const dataObj = new Date(cliente.prazoEntrega);
                            prazoEntrega = dataObj.toLocaleDateString('pt-BR');
                        }
                    }
                    
                    // Prepara os botões de ação
                    const botoes = `
                        <div class="btn-group" role="group">
                            <button type="button" class="btn btn-sm btn-primary" onclick="iniciarCompras('${clienteId}')">
                                <i class="fas fa-shopping-cart"></i> Compras
                            </button>
                            <button type="button" class="btn btn-sm btn-info" onclick="visualizarCliente('${clienteId}')">
                                <i class="fas fa-eye"></i> Visualizar
                            </button>
                        </div>
                    `;
                    
                    // Adiciona ao conjunto de dados
                    dataSet.push([
                        cliente.nome || 'Sem nome',
                        cliente.StatusCompras || 'Não iniciado', // Usa StatusCompras
                        dataCriacao,
                        prazoEntrega,
                        botoes
                    ]);
                    
                    console.log('Cliente adicionado ao dataset para DataTables:', cliente.nome);
                }
            });
            
            // Inicializa ou atualiza o DataTable
            console.log('Inicializando DataTable com', dataSet.length, 'clientes');
            
            // Destrói a tabela existente se já estiver inicializada
            if ($.fn.DataTable.isDataTable('#tabelaClientes')) {
                $('#tabelaClientes').DataTable().destroy();
            }
            
            // Inicializa o DataTable com os novos dados
            $('#tabelaClientes').DataTable({
                data: dataSet,
                columns: [
                    { title: "Cliente" },
                    { title: "Status" },
                    { title: "Data Criação" },
                    { title: "Prazo de Entrega" },
                    { title: "Ações" }
                ],
                language: {
                    url: "https://cdn.datatables.net/plug-ins/1.11.5/i18n/pt-BR.json"
                },
                responsive: true,
                columnDefs: [
                    { className: "align-middle", targets: "_all" }
                ],
                order: [[2, 'desc']], // Ordenar por data de criação (decrescente)
                drawCallback: function() {
                    // Adiciona animações aos elementos da tabela
                    $('.dataTable tbody tr').addClass('animate__animated animate__fadeIn');
                    
                    // Verifica se há dados na tabela
                    if (dataSet.length > 0) {
                        nenhumCliente.classList.add('d-none');
                    } else {
                        nenhumCliente.classList.remove('d-none');
                    }
                    
                    console.log('DataTable inicializado e renderizado com sucesso');
                }
            });
        })
        .catch((error) => {
            console.error('Erro ao carregar clientes:', error);
            alert('Erro ao carregar clientes: ' + error.message);
        });
}

/**
 * Inicia o processo de compras para um cliente
 * @param {string} clienteId - ID do cliente
 */
function iniciarCompras(clienteId) {
    console.log(`Iniciando compras para cliente ${clienteId}`);
    
    // Armazenar o cliente atual
    clienteAtual = clienteId;
    
    // Verificar se dbRef está disponível
    if (!window.dbRef || !window.dbRef.clientes) {
        console.error('dbRef ou dbRef.clientes não está definido!');
        alert('Erro ao acessar o banco de dados. Por favor, recarregue a página.');
        return;
    }
    
    // Atualizar o status do cliente para "Em andamento"
    window.dbRef.clientes.child(clienteId).update({
        StatusCompras: 'Em andamento'
    }).then(() => {
        console.log(`Status do cliente ${clienteId} atualizado para "Em andamento"`);
        
        // Recarregar a lista de clientes para refletir a mudança de status
        carregarClientes();
    }).catch((error) => {
        console.error('Erro ao atualizar status do cliente:', error);
    });
    
    // Buscar os dados do cliente
    window.dbRef.clientes.child(clienteId).once('value')
        .then((snapshot) => {
            const cliente = snapshot.val();
            
            if (!cliente) {
                alert('Cliente não encontrado');
                return;
            }
            
            console.log(`Dados do cliente ${cliente.nome} carregados`);
            
            // Atualizar o título
            document.querySelector('#tituloCliente span').textContent = cliente.nome;
            
            // Mostrar a área de compras
            document.getElementById('areaCompras').classList.remove('d-none');
            
            // CORREÇÃO: Armazenar o filtro para aplicar após a inicialização da tabela
            // em vez de chamar diretamente
            filtroListaPendente = 'todas';
            
            // Rolar para a área de compras
            document.getElementById('areaCompras').scrollIntoView({ behavior: 'smooth' });
            
            // Carregar os itens do cliente
            carregarItensCliente(clienteId);
        })
        .catch((error) => {
            console.error('Erro ao iniciar compras:', error);
            alert('Erro ao iniciar compras: ' + error.message);
        });
}

/**
 * Carrega os itens de um cliente para a tabela
 * @param {string} clienteId - ID do cliente
 */
function carregarItensCliente(clienteId) {
    console.log(`Carregando itens para cliente ${clienteId}`);
    
    // CORREÇÃO: Verificar se já existe uma inicialização em progresso
    if (inicializacaoEmProgresso) {
        console.log('Inicialização já em progresso. Ignorando chamada duplicada.');
        return;
    }
    
    // Marcar que a inicialização está em progresso
    inicializacaoEmProgresso = true;
    
    // Referência à tabela de itens
    const tabelaItensElement = document.querySelector('#tabelaItens tbody');
    const nenhumItem = document.getElementById('nenhumItem');
    
    if (!tabelaItensElement) {
        console.error('Elemento tbody da tabela de itens não encontrado!');
        inicializacaoEmProgresso = false;
        return;
    }
    
    if (!nenhumItem) {
        console.error('Elemento nenhumItem não encontrado!');
        inicializacaoEmProgresso = false;
        return;
    }
    
    // Limpar a tabela
    tabelaItensElement.innerHTML = '';
    
    // Adicionar indicador de carregamento
    const loadingRow = document.createElement('tr');
    loadingRow.id = 'loadingIndicator';
    loadingRow.innerHTML = `
        <td colspan="12" class="text-center">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Carregando...</span>
            </div>
            <p class="mt-2">Carregando itens...</p>
        </td>
    `;
    tabelaItensElement.appendChild(loadingRow);
    
    // Limpar a seleção
    itensSelecionados = [];
    
    // CORREÇÃO: Verificar se os elementos existem antes de manipulá-los
    const checkTodos = document.getElementById('checkTodos');
    if (checkTodos) {
        checkTodos.checked = false;
    }
    
    const btnComprarSelecionados = document.getElementById('btnComprarSelecionados');
    if (btnComprarSelecionados) {
        btnComprarSelecionados.disabled = true;
    }
    
    // Verificar se dbRef está disponível
    if (!window.dbRef || !window.dbRef.projetos) {
        console.error('dbRef ou dbRef.projetos não está definido!');
        alert('Erro ao acessar o banco de dados. Por favor, recarregue a página.');
        inicializacaoEmProgresso = false;
        return;
    }
    
    // Busca os projetos do cliente - EXATAMENTE como na tela de tratamento de dados
    window.dbRef.projetos.child(clienteId).once('value')
        .then(snapshot => {
            // Remove o indicador de carregamento
            const loadingIndicator = document.getElementById('loadingIndicator');
            if (loadingIndicator) {
                loadingIndicator.remove();
            }
            
            const projetos = snapshot.val();
            
            // Verifica se existem projetos cadastrados
            if (objetoVazio(projetos)) {
                nenhumItem.classList.remove('d-none');
                console.log(`Cliente ${clienteId} não tem projetos`);
                
                // Destrói a instância do DataTable se existir
                if ($.fn.DataTable.isDataTable('#tabelaItens')) {
                    $('#tabelaItens').DataTable().destroy();
                }
                
                // Resetar a variável global tabelaItens
                tabelaItens = null;
                
                // Marcar que a inicialização foi concluída
                inicializacaoEmProgresso = false;
                return;
            }
            
            console.log(`Cliente ${clienteId} tem projetos:`, Object.keys(projetos));
            
            // Array para armazenar todos os itens
            todosItens = [];
            
            // Para cada tipo de projeto
            Object.keys(projetos).forEach(tipo => {
                // Pula o tipo "Tratamento" para evitar duplicação
                if (tipo === 'Tratamento') {
                    return;
                }
                
                const projeto = projetos[tipo];
                
                // Pula projetos terceirizados
                if (projeto.terceirizado) {
                    return;
                }
                
                console.log(`Processando tipo de projeto: ${tipo}`);
                
                // Verifica se há listas
                if (projeto.listas && !objetoVazio(projeto.listas)) {
                    // Para cada lista
                    Object.keys(projeto.listas).forEach(nomeLista => {
                        const itens = projeto.listas[nomeLista];
                        console.log(`Processando lista: ${nomeLista}, itens:`, itens);
                        
                        // Verifica se itens é um array
                        if (Array.isArray(itens) && itens.length > 0) {
                            // Adiciona cada item ao array com informações adicionais
                            itens.forEach((item, index) => {
                                todosItens.push({
                                    ...item,
                                    tipo: tipo,
                                    lista: nomeLista,
                                    caminho: `${tipo}/listas/${nomeLista}/${index}`,
                                    id: index
                                });
                            });
                        } 
                        // Verifica se itens é um objeto (não-array)
                        else if (itens && typeof itens === 'object') {
                            // Para cada item no objeto
                            Object.keys(itens).forEach(itemKey => {
                                const item = itens[itemKey];
                                if (item && typeof item === 'object') {
                                    todosItens.push({
                                        ...item,
                                        tipo: tipo,
                                        lista: nomeLista,
                                        caminho: `${tipo}/listas/${nomeLista}/${itemKey}`,
                                        id: itemKey
                                    });
                                }
                            });
                        }
                    });
                }
            });
            
            console.log(`Total de itens encontrados em todos os projetos: ${todosItens.length}`);
            
            // Verifica se há itens após processar
            if (todosItens.length === 0) {
                nenhumItem.classList.remove('d-none');
                console.log(`Cliente ${clienteId} não tem itens para compra`);
                
                // Destrói a instância do DataTable se existir
                if ($.fn.DataTable.isDataTable('#tabelaItens')) {
                    $('#tabelaItens').DataTable().destroy();
                }
                
                // Resetar a variável global tabelaItens
                tabelaItens = null;
                
                // Marcar que a inicialização foi concluída
                inicializacaoEmProgresso = false;
                return;
            }
            
            nenhumItem.classList.add('d-none');
            
            // Preparar dados para DataTables
            console.log('Preparando dados para DataTables...');
            let dataSet = [];
            
            // Debug: Verificar se há itens com status de compra
            let statusEncontrados = new Set();
            todosItens.forEach(item => {
                if (item && item.status) {
                    statusEncontrados.add(item.status.toLowerCase());
                }
            });
            console.log('Status encontrados nos itens:', Array.from(statusEncontrados));
            
            // Para cada item
            todosItens.forEach((item, itemIndex) => {
                console.log(`Processando item ${itemIndex}: ${item.codigo || 'sem código'} - Status: ${item.status || 'sem status'}`);
                
                // Formatar o prazo de entrega
                let prazoFormatado = '';
                if (item.prazoEntrega) {
                    // CORREÇÃO: Verificar se já está no formato brasileiro
                    if (typeof item.prazoEntrega === 'string' && item.prazoEntrega.includes('/')) {
                        prazoFormatado = item.prazoEntrega;
                    } else {
                        const prazoEntrega = new Date(item.prazoEntrega);
                        prazoFormatado = prazoEntrega.toLocaleDateString('pt-BR');
                    }
                }
                
                // Preparar a coluna de checkbox
                const checkbox = `
                    <div class="form-check">
                        <input class="form-check-input checkbox-item" type="checkbox" data-id="${itemIndex}" onchange="atualizarSelecao()">
                    </div>
                `;
                
                // Preparar a coluna de quantidade comprada com botão de prazo
                const quantidadeComprada = `
                    <div class="d-flex align-items-center">
                        ${item.quantidadeComprada || '0'}
                        ${item.prazoEntrega ? 
                            `<button class="btn btn-sm btn-outline-warning ms-2 btn-editar-prazo" onclick="editarPrazoEntrega('${itemIndex}')">
                                <i class="fas fa-calendar-alt"></i> ${prazoFormatado}
                            </button>` : 
                            ''}
                    </div>
                `;
                
                // CORREÇÃO: Usar o campo necessidade diretamente do Firebase em vez de calcular
                const necessidade = item.necessidade || '0';
                
                // CORREÇÃO: Verificar se a necessidade é maior que zero antes de adicionar o item
                if (parseInt(necessidade) > 0) {
                    // CORREÇÃO: Armazenar o índice real do item no array todosItens para referência correta
                    const itemRealIndex = itemIndex;
                    
                    // Adicionar o item ao dataset
                    dataSet.push([
                        `<div class="form-check">
                            <input class="form-check-input checkbox-item" type="checkbox" data-id="${itemRealIndex}" data-real-id="${item.id || ''}" onchange="atualizarSelecao()">
                        </div>`,
                        item.codigo || '-',
                        item.descricao || '-',
                        '', // Coluna para o botão de toggle
                        item.medida || '-',
                        item.altura || '-',
                        item.largura || '-',
                        item.cor || '-',
                        item.quantidade || '0',
                        item.lista || '-',
                        necessidade,
                        quantidadeComprada,
                        item.status || 'Não definido'
                    ]);
                }
                
                console.log(`Item ${itemIndex} adicionado ao dataset para DataTables`);
            });
            
            console.log(`Total de itens para compra: ${dataSet.length}`);
            
            // Inicializa ou atualiza o DataTable
            console.log('Inicializando DataTable com', dataSet.length, 'itens');
            
            // Destrói a tabela existente se já estiver inicializada
            if ($.fn.DataTable.isDataTable('#tabelaItens')) {
                if (tabelaItens) {
                    tabelaItens.destroy();
                    tabelaItens = null;
                } else {
                    $('#tabelaItens').DataTable().destroy();
                }
            }
            
            // Inicializa o DataTable com os novos dados
            tabelaItens = $('#tabelaItens').DataTable({
                data: dataSet,
                columns: [
                    { title: "" }, // Checkbox
                    { title: "Código" },
                    { title: "Descrição" },
                    { title: "" }, // Botão toggle
                    { title: "Medida", className: "coluna-oculta" },
                    { title: "Altura", className: "coluna-oculta" },
                    { title: "Largura", className: "coluna-oculta" },
                    { title: "Cor", className: "coluna-oculta" },
                    { title: "Quantidade" },
                    { title: "Lista" },
                    { title: "Necessidade" },
                    { title: "Comprado" },
                    { title: "Status" }
                ],
                language: {
                    url: "https://cdn.datatables.net/plug-ins/1.11.5/i18n/pt-BR.json"
                },
                responsive: true,
                columnDefs: [
                    { orderable: false, targets: [0, 3] }, // Colunas não ordenáveis
                    { className: "align-middle", targets: "_all" }
                ],
                drawCallback: function() {
                    // Adiciona animações aos elementos da tabela
                    $('.dataTable tbody tr').addClass('animate__animated animate__fadeIn');
                    
                    // Verifica se há dados na tabela
                    if (dataSet.length > 0) {
                        nenhumItem.classList.add('d-none');
                    } else {
                        nenhumItem.classList.remove('d-none');
                    }
                    
                    // Ocultar colunas de detalhes por padrão
                    if (colunasOcultas) {
                        const colunasOcultasElements = document.querySelectorAll('.coluna-oculta');
                        colunasOcultasElements.forEach(coluna => {
                            coluna.style.display = 'none';
                        });
                    }
                    
                    console.log('DataTable de itens inicializado e renderizado com sucesso');
                    
                    // CORREÇÃO: Aplicar filtro pendente após inicialização da tabela, apenas uma vez
                    if (filtroListaPendente) {
                        console.log(`Aplicando filtro pendente: ${filtroListaPendente}`);
                        // Armazenar o valor atual e limpar para evitar chamadas repetidas
                        const filtroAtual = filtroListaPendente;
                        filtroListaPendente = null;
                        // Chamar a função com o valor armazenado
                        aplicarFiltroLista(filtroAtual);
                    }
                    
                    // Marcar que a inicialização foi concluída
                    inicializacaoEmProgresso = false;
                }
            });
        })
        .catch((error) => {
            console.error('Erro ao carregar itens:', error);
            alert('Erro ao carregar itens: ' + error.message);
            inicializacaoEmProgresso = false;
        });
}

/**
 * Aplica um filtro de lista aos itens
 * @param {string} lista - Nome da lista para filtrar
 */
function aplicarFiltroLista(lista) {
    console.log(`Aplicando filtro de lista: ${lista}`);
    
    // CORREÇÃO: Verificar se a tabela de itens está inicializada
    if (!tabelaItens) {
        console.log('Tabela de itens não inicializada! Armazenando filtro para aplicação posterior.');
        filtroListaPendente = lista;
        return;
    }
    
    // CORREÇÃO: Verificar se o filtro já está aplicado para evitar reprocessamento
    if (filtroListaAtual === lista) {
        console.log(`Filtro ${lista} já está aplicado. Ignorando.`);
        return;
    }
    
    // Atualizar o filtro atual
    filtroListaAtual = lista;
    
    // Atualizar a classe dos botões
    const botoesFiltragem = document.querySelectorAll('.filtro-lista');
    botoesFiltragem.forEach(botao => {
        if (botao.getAttribute('data-lista') === lista) {
            botao.classList.add('active');
        } else {
            botao.classList.remove('active');
        }
    });
    
    // Aplicar o filtro na tabela
    if (lista === 'todas') {
        tabelaItens.search('').columns(9).search('').draw(); // Limpa todos os filtros
        console.log('Filtro removido, mostrando todos os itens');
    } else {
        tabelaItens.search('').columns(9).search(lista).draw(); // Filtra apenas pela coluna da lista
        console.log(`Filtro aplicado: mostrando apenas itens da lista ${lista}`);
    }
    
    // Limpar a seleção
    document.getElementById('checkTodos').checked = false;
    itensSelecionados = [];
    document.getElementById('btnComprarSelecionados').disabled = true;
    
    // Atualizar a seleção de checkboxes
    const checkboxes = document.querySelectorAll('.checkbox-item');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
}

/**
 * Alterna a visibilidade das colunas ocultas
 */
function toggleColunas() {
    console.log('Alternando visibilidade das colunas ocultas');
    
    // Alterna o estado
    colunasOcultas = !colunasOcultas;
    
    // Atualiza o texto do botão
    const btnToggle = document.getElementById('btnToggleColunas');
    if (btnToggle) {
        btnToggle.textContent = colunasOcultas ? '+' : '-';
    }
    
    // Atualiza a visibilidade das colunas
    const colunasOcultasElements = document.querySelectorAll('.coluna-oculta');
    colunasOcultasElements.forEach(coluna => {
        coluna.style.display = colunasOcultas ? 'none' : '';
    });
    
    // Redesenha a tabela para ajustar o layout
    if (tabelaItens) {
        tabelaItens.columns.adjust().responsive.recalc();
    }
    
    console.log(`Visibilidade das colunas alternada. Colunas ocultas: ${colunasOcultas}`);
}

/**
 * Seleciona ou deseleciona todos os itens visíveis
 * @param {boolean} checked - Se deve selecionar ou deselecionar
 */
function selecionarTodos(checked) {
    console.log(`Selecionando todos os itens visíveis: ${checked}`);
    
    // Obter todos os checkboxes visíveis
    const checkboxes = document.querySelectorAll('.checkbox-item');
    
    // Para cada checkbox
    checkboxes.forEach(checkbox => {
        // Verificar se a linha está visível
        const row = checkbox.closest('tr');
        if (row && window.getComputedStyle(row).display !== 'none') {
            checkbox.checked = checked;
            
            // Atualizar a seleção
            if (checked) {
                const itemId = checkbox.getAttribute('data-id');
                const realId = checkbox.getAttribute('data-real-id');
                
                if (itemId && !itensSelecionados.some(item => item.index === itemId)) {
                    itensSelecionados.push({
                        index: itemId,
                        realId: realId || itemId
                    });
                }
            }
        }
    });
    
    // Atualizar o botão de comprar
    document.getElementById('btnComprarSelecionados').disabled = itensSelecionados.length === 0;
    
    console.log(`Total de itens selecionados: ${itensSelecionados.length}`);
}

/**
 * Atualiza a seleção de itens
 * Chamada quando um checkbox individual é alterado
 */
function atualizarSelecao() {
    console.log('Atualizando seleção de itens');
    
    // Limpar a seleção atual
    itensSelecionados = [];
    
    // Obter todos os checkboxes
    const checkboxes = document.querySelectorAll('.checkbox-item');
    
    // Para cada checkbox
    checkboxes.forEach(checkbox => {
        // Se estiver marcado, adicionar à seleção
        if (checkbox.checked) {
            const itemId = checkbox.getAttribute('data-id');
            const realId = checkbox.getAttribute('data-real-id'); // CORREÇÃO: Obter o ID real do item
            
            if (itemId && !itensSelecionados.some(item => item.index === itemId)) { // Evitar duplicatas
                // CORREÇÃO: Armazenar tanto o ID do array quanto o ID real do item
                itensSelecionados.push({
                    index: itemId,
                    realId: realId || itemId // Usar o ID do array como fallback se não houver ID real
                });
            }
        }
    });
    
    // Atualizar o botão de comprar
    document.getElementById('btnComprarSelecionados').disabled = itensSelecionados.length === 0;
    
    // Atualizar o checkbox "Todos"
    const checkTodos = document.getElementById('checkTodos');
    if (checkTodos) { // CORREÇÃO: Verificar se o elemento existe antes de acessá-lo
        const checkboxesVisiveis = Array.from(checkboxes).filter(checkbox => {
            const row = checkbox.closest('tr');
            return row && window.getComputedStyle(row).display !== 'none';
        });
        
        if (checkboxesVisiveis.length > 0) {
            const todosMarcados = checkboxesVisiveis.every(checkbox => checkbox.checked);
            checkTodos.checked = todosMarcados;
            checkTodos.indeterminate = !todosMarcados && checkboxesVisiveis.some(checkbox => checkbox.checked);
        } else {
            checkTodos.checked = false;
            checkTodos.indeterminate = false;
        }
    }
    
    console.log(`Total de itens selecionados: ${itensSelecionados.length}`);
}

/**
 * Abre o modal de compra
 */
function abrirModalCompra() {
    console.log('Abrindo modal de compra');
    
    // Verificar se há itens selecionados
    if (itensSelecionados.length === 0) {
        alert('Selecione pelo menos um item para compra');
        return;
    }
    
    // Atualizar a contagem de itens selecionados
    document.getElementById('quantidadeItensSelecionados').textContent = itensSelecionados.length;
    
    // Limpar os campos do modal
    document.getElementById('inputFornecedor').value = '';
    document.getElementById('inputPrazoEntrega').value = '';
    document.getElementById('checkQuantidadePersonalizada').checked = false;
    document.getElementById('inputQuantidade').value = '';
    document.getElementById('areaQuantidadePersonalizada').classList.add('d-none');
    
    // Exibir o modal
    const modalCompra = new bootstrap.Modal(document.getElementById('modalCompra'));
    modalCompra.show();
}

/**
 * Alterna a visibilidade do campo de quantidade personalizada
 * @param {boolean} mostrar - Se deve mostrar o campo
 */
function toggleQuantidadePersonalizada(mostrar) {
    console.log(`Alternando visibilidade do campo de quantidade personalizada: ${mostrar}`);
    
    const areaQuantidadePersonalizada = document.getElementById('areaQuantidadePersonalizada');
    
    if (mostrar) {
        areaQuantidadePersonalizada.classList.remove('d-none');
        
        // Calcular a quantidade total necessária dos itens selecionados
        let quantidadeTotal = 0;
        itensSelecionados.forEach(itemSelecionado => {
            const item = todosItens[itemSelecionado.index];
            if (item) {
                const necessidade = parseInt(item.necessidade || 0);
                quantidadeTotal += necessidade > 0 ? necessidade : 0;
            }
        });
        
        // Definir a quantidade total como valor padrão
        document.getElementById('inputQuantidade').value = quantidadeTotal;
    } else {
        areaQuantidadePersonalizada.classList.add('d-none');
    }
}

/**
 * Confirma a compra dos itens selecionados
 */
function confirmarCompra() {
    console.log('Confirmando compra dos itens selecionados');
    
    // Verificar se há itens selecionados
    if (itensSelecionados.length === 0) {
        alert('Selecione pelo menos um item para compra');
        return;
    }
    
    // Obter os dados do formulário
    const fornecedor = document.getElementById('inputFornecedor').value.trim();
    const prazoEntrega = document.getElementById('inputPrazoEntrega').value;
    
    // Validar os campos obrigatórios
    if (!fornecedor) {
        alert('Informe o fornecedor');
        return;
    }
    
    if (!prazoEntrega) {
        alert('Informe o prazo de entrega');
        return;
    }
    
    // Verificar se a quantidade personalizada está ativada
    const quantidadePersonalizada = document.getElementById('checkQuantidadePersonalizada').checked;
    let quantidade = null;
    
    if (quantidadePersonalizada) {
        quantidade = parseInt(document.getElementById('inputQuantidade').value);
        
        if (isNaN(quantidade) || quantidade <= 0) {
            alert('Informe uma quantidade válida');
            return;
        }
    }
    
    // Mostrar indicador de carregamento
    document.getElementById('btnConfirmarCompra').innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processando...';
    document.getElementById('btnConfirmarCompra').disabled = true;
    
    // Processar a compra
    processarCompra(itensSelecionados, clienteAtual, fornecedor, prazoEntrega, quantidade)
        .then((mensagem) => {
            console.log('Compra processada com sucesso:', mensagem);
            
            // Fechar o modal
            const modalCompra = bootstrap.Modal.getInstance(document.getElementById('modalCompra'));
            modalCompra.hide();
            
            // Mostrar mensagem de sucesso
            alert('Compra registrada com sucesso!');
            
            // Recarregar os itens
            carregarItensCliente(clienteAtual);
        })
        .catch((erro) => {
            console.error('Erro ao processar compra:', erro);
            alert('Erro ao processar compra: ' + erro);
        })
        .finally(() => {
            // Restaurar o botão
            document.getElementById('btnConfirmarCompra').innerHTML = 'Confirmar Compra';
            document.getElementById('btnConfirmarCompra').disabled = false;
        });
}

/**
 * Abre o modal de edição de prazo de entrega
 * @param {string} itemId - ID do item
 */
function editarPrazoEntrega(itemId) {
    console.log(`Editando prazo de entrega do item ${itemId}`);
    
    // Armazenar o ID do item para uso posterior
    itemIdParaEditarPrazo = itemId;
    
    // Obter o item
    const item = todosItens[itemId];
    
    if (!item) {
        alert('Item não encontrado');
        return;
    }
    
    // Definir o valor atual do prazo
    let prazoAtual = '';
    if (item.prazoEntrega) {
        // CORREÇÃO: Verificar se já está no formato brasileiro e converter para YYYY-MM-DD para o input date
        if (typeof item.prazoEntrega === 'string' && item.prazoEntrega.includes('/')) {
            const partes = item.prazoEntrega.split('/');
            if (partes.length === 3) {
                prazoAtual = `${partes[2]}-${partes[1]}-${partes[0]}`;
            }
        } else {
            // Formatar a data para o formato YYYY-MM-DD
            const prazoEntrega = new Date(item.prazoEntrega);
            prazoAtual = prazoEntrega.toISOString().split('T')[0];
        }
    }
    
    document.getElementById('inputNovoPrazo').value = prazoAtual;
    
    // Exibir o modal
    const modalEditarPrazo = new bootstrap.Modal(document.getElementById('modalEditarPrazo'));
    modalEditarPrazo.show();
}

/**
 * Confirma a atualização do prazo de entrega
 */
function confirmarNovoPrazo() {
    console.log('Confirmando novo prazo de entrega');
    
    // Verificar se há um item selecionado
    if (!itemIdParaEditarPrazo) {
        alert('Nenhum item selecionado');
        return;
    }
    
    // Obter o novo prazo
    const novoPrazo = document.getElementById('inputNovoPrazo').value;
    
    // Validar o campo
    if (!novoPrazo) {
        alert('Informe o novo prazo de entrega');
        return;
    }
    
    // Mostrar indicador de carregamento
    document.getElementById('btnConfirmarNovoPrazo').innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processando...';
    document.getElementById('btnConfirmarNovoPrazo').disabled = true;
    
    // Obter o item
    const item = todosItens[itemIdParaEditarPrazo];
    
    if (!item) {
        alert('Item não encontrado');
        return;
    }
    
    // Atualizar o prazo de entrega
    atualizarPrazoEntrega(item.caminho, clienteAtual, novoPrazo) // CORREÇÃO: Usar o caminho completo do item
        .then((mensagem) => {
            console.log('Prazo atualizado com sucesso:', mensagem);
            
            // Fechar o modal
            const modalEditarPrazo = bootstrap.Modal.getInstance(document.getElementById('modalEditarPrazo'));
            modalEditarPrazo.hide();
            
            // Mostrar mensagem de sucesso
            alert('Prazo de entrega atualizado com sucesso!');
            
            // Recarregar os itens
            carregarItensCliente(clienteAtual);
        })
        .catch((erro) => {
            console.error('Erro ao atualizar prazo:', erro);
            alert('Erro ao atualizar prazo: ' + erro);
        })
        .finally(() => {
            // Restaurar o botão
            document.getElementById('btnConfirmarNovoPrazo').innerHTML = 'Atualizar Prazo';
            document.getElementById('btnConfirmarNovoPrazo').disabled = false;
            
            // Limpar o ID do item
            itemIdParaEditarPrazo = null;
        });
}

/**
 * Abre o modal de confirmação para finalizar compras
 */
function abrirModalConfirmacao() {
    console.log('Abrindo modal de confirmação para finalizar compras');
    
    // Exibir o modal
    const modalConfirmacao = new bootstrap.Modal(document.getElementById('modalConfirmacao'));
    modalConfirmacao.show();
}

/**
 * Confirma a finalização das compras
 */
function confirmarFinalizacao() {
    console.log('Confirmando finalização das compras');
    
    // Mostrar indicador de carregamento
    document.getElementById('btnConfirmarFinalizacao').innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processando...';
    document.getElementById('btnConfirmarFinalizacao').disabled = true;
    
    // Finalizar as compras
    finalizarCompras(clienteAtual)
        .then((mensagem) => {
            console.log('Compras finalizadas com sucesso:', mensagem);
            
            // Fechar o modal
            const modalConfirmacao = bootstrap.Modal.getInstance(document.getElementById('modalConfirmacao'));
            modalConfirmacao.hide();
            
            // Mostrar mensagem de sucesso
            alert('Compras finalizadas com sucesso!');
            
            // Ocultar a área de compras
            document.getElementById('areaCompras').classList.add('d-none');
            
            // Recarregar os clientes
            carregarClientes();
            
            // Limpar o cliente atual
            clienteAtual = null;
        })
        .catch((erro) => {
            console.error('Erro ao finalizar compras:', erro);
            alert('Erro ao finalizar compras: ' + erro);
        })
        .finally(() => {
            // Restaurar o botão
            document.getElementById('btnConfirmarFinalizacao').innerHTML = 'Confirmar';
            document.getElementById('btnConfirmarFinalizacao').disabled = false;
        });
}

/**
 * Visualiza os detalhes de um cliente
 * @param {string} clienteId - ID do cliente
 */
function visualizarCliente(clienteId) {
    console.log(`Visualizando cliente ${clienteId}`);
    
    // Implementação futura
    alert('Funcionalidade em desenvolvimento');
}

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
                    
                    // Definir o novo StatusCOMPRA como "Comprado"
                    const novoStatusCompra = "Comprado";
                    
                    // Registrar a compra
                    updates[`${itemPath}/quantidadeComprada`] = novaQuantidadeComprada;
                    updates[`${itemPath}/fornecedor`] = fornecedor;
                    // CORREÇÃO: Salvar a data como string formatada em vez de timestamp
                    updates[`${itemPath}/prazoEntrega`] = prazoFormatado;
                    updates[`${itemPath}/dataCompra`] = new Date().toLocaleDateString('pt-BR');
                    updates[`${itemPath}/StatusCOMPRA`] = novoStatusCompra; // ATUALIZA O NOVO CAMPO StatusCOMPRA para "Comprado"
                    
                    console.log(`Item ${itemIndex}: Comprado ${quantidadeComprar} unidades (total: ${novaQuantidadeComprada}), caminho: ${itemPath}, StatusCOMPRA: ${novoStatusCompra}`);
                    atualizacoesRealizadas = true;               });
                
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

/**
 * Finaliza as compras de um cliente
 * @param {string} clienteId - ID do cliente
 * @returns {Promise} - Promise com o resultado da operação
 */
function finalizarCompras(clienteId) {
    console.log(`Finalizando compras para cliente ${clienteId}`);
    
    return new Promise((resolve, reject) => {
        // Verificar parâmetros
        if (!clienteId) {
            reject('Cliente não especificado');
            return;
        }
        
        // Verificar se dbRef está disponível
        if (!window.dbRef || !window.dbRef.clientes) {
            reject('Referência ao banco de dados não disponível');
            return;
        }
        
        // Referência ao cliente
        const clienteRef = window.dbRef.clientes.child(clienteId);
        
        // Atualizar o status do cliente
        clienteRef.update({
            status: 'Compras Finalizadas',
            dataFinalizacaoCompras: new Date().toLocaleDateString('pt-BR')
        })
            .then(() => {
                console.log('Compras finalizadas com sucesso');
                resolve('Compras finalizadas com sucesso');
            })
            .catch((error) => {
                console.error('Erro ao finalizar compras:', error);
                reject(error.message);
            });
    });
}

/**
 * Verifica se um objeto está vazio
 * @param {Object} obj - Objeto a ser verificado
 * @returns {boolean} - true se o objeto estiver vazio, false caso contrário
 */
function objetoVazio(obj) {
    return obj === null || obj === undefined || (Object.keys(obj).length === 0 && obj.constructor === Object);
}
