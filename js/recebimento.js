// --- Nova Lógica Proposta para o Botão "Mostrar Recebidos" ---

// Flag global já declarada no início do arquivo

/**
 * Adiciona ou remove o filtro customizado da DataTable para alternar
 * entre a visão de itens pendentes e recebidos (Concluído/Incorreto).
 */
function aplicarFiltroVisaoRecebimento() {
    console.log(`Aplicando filtro de visão: ${mostrandoRecebidos ? 'Recebidos' : 'Pendentes'}`);

    // Nome único para identificar nosso filtro customizado
    const nomeFiltro = 'filtroVisaoRecebimento';

    // Remove o filtro anterior com o mesmo nome, se existir
    const indiceFiltroExistente = $.fn.dataTable.ext.search.findIndex(f => f.name === nomeFiltro);
    if (indiceFiltroExistente > -1) {
        $.fn.dataTable.ext.search.splice(indiceFiltroExistente, 1);
        console.log('Filtro de visão anterior removido.');
    }

    // Cria a função de filtro
    const filtroFn = function(settings, data, dataIndex) {
        // Se a tabela não estiver pronta, não filtra
        if (!tabelaItens) return true;

        // Identifica o índice da coluna 'Status' dinamicamente pelo título
        const colunas = tabelaItens.settings()[0].aoColumns; // Acessa as configurações das colunas
        let statusColIndex = -1;
        for (let i = 0; i < colunas.length; i++) {
            // Verifica se o título da coluna corresponde a 'Status' (case-insensitive)
            if (colunas[i].sTitle && colunas[i].sTitle.toLowerCase() === 'status') {
                statusColIndex = i;
                break;
            }
        }

        // Se não encontrou pelo título, loga um aviso e usa um índice fixo como fallback
        // IMPORTANTE: Este índice (14) pode precisar ser ajustado se a estrutura da tabela mudar.
        if (statusColIndex === -1) {
            console.warn("Coluna 'Status' não encontrada pelo título. Usando índice fallback 14. Verifique a configuração da tabela.");
            statusColIndex = 14; // Índice fallback - AJUSTAR SE NECESSÁRIO
        }

        // Obtém o valor da célula de status para a linha atual
        const statusCellValue = data[statusColIndex] || "";

        // Extrai o texto puro do status, removendo tags HTML (ex: de badges)
        const statusTexto = statusCellValue.replace(/<[^>]*>/g, '').trim();

        // Aplica a lógica de filtragem com base na flag 'mostrandoRecebidos'
        if (mostrandoRecebidos) {
            // Se mostrandoRecebidos for true, exibir apenas 'Concluído' ou 'Incorreto'
            return statusTexto === 'Concluído' || statusTexto === 'Incorreto';
        } else {
            // Se mostrandoRecebidos for false, exibir todos EXCETO 'Concluído' e 'Incorreto'
            return statusTexto !== 'Concluído' && statusTexto !== 'Incorreto';
        }
    };

    // Atribui um nome à função de filtro para poder removê-la especificamente depois
    filtroFn.name = nomeFiltro;

    // Adiciona a função de filtro à lista de filtros da DataTable
    $.fn.dataTable.ext.search.push(filtroFn);
    console.log('Filtro de visão adicionado.');

    // Redesenha a tabela para que o filtro seja aplicado visualmente
    if (tabelaItens) {
        tabelaItens.draw();
        console.log('Tabela redesenhada com filtro de visão.');
    }
}

/**
 * Modifica o Event Listener do botão 'btnAlternarVisao' para usar a nova lógica de filtro.
 */
function configurarListenerBotaoAlternarVisao() {
    const btnAlternarVisao = document.getElementById("btnAlternarVisao");
    if (btnAlternarVisao) {
        // Remove listener antigo para evitar duplicação (se houver)
        // Idealmente, isso seria feito com uma referência à função antiga, mas por segurança:
        const btnClone = btnAlternarVisao.cloneNode(true);
        btnAlternarVisao.parentNode.replaceChild(btnClone, btnAlternarVisao);

        // Adiciona o novo listener
        btnClone.addEventListener("click", () => {
            mostrandoRecebidos = !mostrandoRecebidos; // Alterna a flag
            console.log(`Botão Alternar Visão clicado. Novo estado: ${mostrandoRecebidos ? "recebidos" : "pendentes"}`);

            // Atualiza a aparência do botão
            if (mostrandoRecebidos) {
                btnClone.innerHTML = `<i class="fas fa-tasks"></i> Mostrar Pendentes`;
                btnClone.classList.remove("btn-outline-secondary");
                btnClone.classList.add("btn-outline-info");
            } else {
                btnClone.innerHTML = `<i class="fas fa-history"></i> Mostrar Recebidos`;
                btnClone.classList.remove("btn-outline-info");
                btnClone.classList.add("btn-outline-secondary");
            }

            // Aplica/Remove o filtro customizado e redesenha a tabela
            aplicarFiltroVisaoRecebimento();
        });
        console.log('Novo listener para btnAlternarVisao configurado.');
    } else {
        console.warn('Botão #btnAlternarVisao não encontrado para configurar listener.');
    }
}

/**
 * Garante que o filtro de visão seja aplicado corretamente na inicialização da tabela.
 * Esta função deve ser chamada dentro de `inicializarTabelaItens` após a tabela ser criada.
 */
function aplicarFiltroVisaoInicial() {
    if (tabelaItens) {
        // Garante que o estado inicial (mostrando pendentes) seja aplicado
        mostrandoRecebidos = false; // Define o estado inicial explicitamente
        aplicarFiltroVisaoRecebimento(); // Aplica o filtro correspondente
        console.log('Filtro de visão inicial (pendentes) aplicado na tabela.');
    }
}

/**
 * Modifica a função de limpar filtros para também remover o filtro de visão.
 */
function limparFiltrosDaTabelaModificada() {
    // Limpa os filtros dos inputs e selects (exemplo)
    $('#filtroFornecedor').val(null).trigger('change');
    $('#filtroCliente').val(null).trigger('change');
    $('#filtroCodigo').val('');
    $('#filtroStatus').val(null).trigger('change');
    $('#filtroLista').val(null).trigger('change'); // Adicionado
    $('#filtroProjeto').val(null).trigger('change'); // Adicionado
    $('#filtroPrazoEntrega').val(''); // Adicionado

    filtroAtual = { fornecedor: '', cliente: '', codigo: '', status: '', lista: '', projeto: '', prazo: '' };

    // Remove o filtro de visão customizado
    const nomeFiltro = 'filtroVisaoRecebimento';
    const indiceFiltroExistente = $.fn.dataTable.ext.search.findIndex(f => f.name === nomeFiltro);
    if (indiceFiltroExistente > -1) {
        $.fn.dataTable.ext.search.splice(indiceFiltroExistente, 1);
        console.log('Filtro de visão removido ao limpar filtros.');
    }

    // Reseta a flag e a aparência do botão para o padrão (pendentes)
    mostrandoRecebidos = false;
    const btnAlternarVisao = document.getElementById("btnAlternarVisao");
    if (btnAlternarVisao) {
        btnAlternarVisao.innerHTML = `<i class="fas fa-history"></i> Mostrar Recebidos`;
        btnAlternarVisao.classList.remove("btn-outline-info");
        btnAlternarVisao.classList.add("btn-outline-secondary");
    }

    // Limpa os filtros internos da DataTable e redesenha
    if (tabelaItens) {
        tabelaItens.search('').columns().search('').draw();
    }
    console.log('Todos os filtros limpos e tabela redesenhada.');
}

/**
 * Modifica a função que aplica outros filtros para garantir que o filtro de visão seja mantido.
 */
function aplicarFiltrosNaTabelaModificada() {
    // Aplica os filtros dos inputs/selects usando a API da DataTable
    if (tabelaItens) {
        // Mapeia os filtros para os índices corretos das colunas
        // NOTA: Os índices das colunas podem precisar ser ajustados!
        const colIndexFornecedor = 11; // Exemplo, ajuste conforme necessário
        const colIndexCliente = 9;    // Exemplo, ajuste conforme necessário
        const colIndexCodigo = 1;     // Exemplo, ajuste conforme necessário
        const colIndexStatus = 14;    // Exemplo, ajuste conforme necessário
        const colIndexLista = 12;     // Exemplo, ajuste conforme necessário
        const colIndexProjeto = 13;   // Exemplo, ajuste conforme necessário
        const colIndexPrazo = 10;     // Exemplo, ajuste conforme necessário

        tabelaItens.column(colIndexFornecedor).search(filtroAtual.fornecedor || '', true, false);
        tabelaItens.column(colIndexCliente).search(filtroAtual.cliente || '', true, false);
        tabelaItens.column(colIndexCodigo).search(filtroAtual.codigo || '', true, false);
        tabelaItens.column(colIndexStatus).search(filtroAtual.status || '', true, false);
        tabelaItens.column(colIndexLista).search(filtroAtual.lista || '', true, false);
        tabelaItens.column(colIndexProjeto).search(filtroAtual.projeto || '', true, false);

        // Filtro de prazo (requer lógica customizada se for intervalo)
        // Por simplicidade, vamos assumir busca exata por enquanto
        tabelaItens.column(colIndexPrazo).search(filtroAtual.prazo ? formatarDataParaBusca(filtroAtual.prazo) : '', true, false);

        // A função aplicarFiltroVisaoRecebimento já garante que o filtro de visão está ativo.
        // Apenas precisamos redesenhar a tabela para aplicar TODOS os filtros.
        tabelaItens.draw();
        console.log('Filtros da tabela aplicados (incluindo visão).');
    }
}

// --- Integração no Código Existente ---

/**
 * recebimento.js
 * Lógica principal da tela de Recebimento
 */

// Variáveis globais
let todosItens = [];
let itensSelecionadosParaRecebimento = [];
let colunasOcultas = true;
let tabelaItens = null; // Instância da DataTable
let calendarioInstance = null;
let calendarioCompletoInstance = null;
let fornecedores = new Set();
let clientes = new Set();
let listas = new Set();
let projetos = new Set();
let filtroAtual = { fornecedor: '', cliente: '', codigo: '', status: '', lista: '', projeto: '', prazo: '' };
let mostrandoRecebidos = false; // Adicionado para a nova lógica

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM carregado: recebimento.js vComFiltroVisao');
    inicializarComponentesBasicos();

    if (typeof firebase !== 'undefined' && typeof firebase.database === 'function') {
        console.log('Firebase detectado. Iniciando config e carregamento...');
        if (!window.dbRef) {
            console.warn('dbRef não definido globalmente. Tentando inicializar.');
            try {
                const database = firebase.database();
                window.dbRef = {
                    clientes: database.ref('clientes'),
                    projetos: database.ref('projetos')
                };
                console.log('dbRef inicializado localmente em recebimento.js');
            } catch (e) {
                console.error('Falha ao inicializar dbRef localmente:', e);
                mostrarNotificacao('Erro crítico: Falha ao conectar com Firebase.', 'danger');
                return;
            }
        }
        inicializarCalendario();
        carregarItensComprados(); // Carrega inicialmente os pendentes
        configurarEventListeners();
        configurarListenerBotaoAlternarVisao(); // Chama a configuração do novo listener
    } else {
        console.error('Firebase não está disponível ou firebase.database não é uma função.');
        mostrarNotificacao('Erro crítico: Firebase não carregado.', 'danger');
    }
});

function inicializarComponentesBasicos() {
    console.log('Inicializando componentes básicos...');
    if ($.fn.select2) {
        $('.select2').select2({ theme: 'bootstrap-5', width: '100%' });
        $('.select2-modal').select2({
            theme: 'bootstrap-5',
            width: '100%',
            dropdownParent: $('#modalCalendarioCompleto')
        });
    }

    const btnToggleColunas = document.getElementById('btnToggleColunas');
    if (btnToggleColunas) {
        btnToggleColunas.textContent = colunasOcultas ? '+' : '-';
    }

    const inputDataRecebimento = document.getElementById('inputDataRecebimento');
    if (inputDataRecebimento) {
        inputDataRecebimento.value = new Date().toISOString().split('T')[0];
    }

    // Define o estado inicial do botão 'Mostrar Recebidos'
    const btnAlternarVisao = document.getElementById("btnAlternarVisao");
    if (btnAlternarVisao) {
        btnAlternarVisao.innerHTML = `<i class="fas fa-history"></i> Mostrar Recebidos`;
        btnAlternarVisao.classList.remove("btn-outline-info");
        btnAlternarVisao.classList.add("btn-outline-secondary");
    }
}

function configurarEventListeners() {
    console.log('Configurando event listeners...');

    const btnToggleColunasExt = document.getElementById('btnToggleColunas');
    if (btnToggleColunasExt) {
        btnToggleColunasExt.addEventListener('click', toggleColunasVisibilidadeManual);
    }

    const checkTodosPrincipal = document.getElementById('checkTodos');
    if (checkTodosPrincipal) {
        checkTodosPrincipal.addEventListener('click', function() {
            const isChecked = this.checked;
            selecionarTodosNaTabela(isChecked);
        });
    }

    const btnReceberSelecionados = document.getElementById('btnReceberSelecionados');
    if (btnReceberSelecionados) {
        btnReceberSelecionados.addEventListener('click', abrirModalRecebimento);
    }

    const btnConfirmarRecebimentoModal = document.getElementById('btnConfirmarRecebimento');
    if (btnConfirmarRecebimentoModal) {
        btnConfirmarRecebimentoModal.addEventListener('click', confirmarRecebimentoModal);
    } else {
        console.warn('Botão #btnConfirmarRecebimento (do modal) não encontrado no HTML.');
    }

    const checkQuantidadePersonalizada = document.getElementById('checkQuantidadePersonalizada');
    if (checkQuantidadePersonalizada) {
        checkQuantidadePersonalizada.addEventListener('change', function() {
            toggleQuantidadePersonalizada(this.checked);
        });
    }

    const btnTodos = document.getElementById('btnTodos');
    if (btnTodos) btnTodos.addEventListener('click', () => {selecionarTodosNaTabela(true); if(checkTodosPrincipal) checkTodosPrincipal.checked = true;});

    const btnNenhum = document.getElementById('btnNenhum');
    if (btnNenhum) btnNenhum.addEventListener('click', () => {selecionarTodosNaTabela(false); if(checkTodosPrincipal) checkTodosPrincipal.checked = false;});

    const btnFiltrados = document.getElementById("btnFiltrados");
    if (btnFiltrados) btnFiltrados.addEventListener("click", selecionarItensFiltradosNaTabela);

    // REMOVIDO O LISTENER ANTIGO PARA btnAlternarVisao DAQUI
    // Será configurado por configurarListenerBotaoAlternarVisao()

    // Listeners dos filtros - Usam a função modificada
    $("#filtroFornecedor").on("change", function() { filtroAtual.fornecedor = this.value; aplicarFiltrosNaTabelaModificada(); });
    $("#filtroCliente").on("change", function() { filtroAtual.cliente = this.value; aplicarFiltrosNaTabelaModificada(); });
    $("#filtroCodigo").on("input", function() { filtroAtual.codigo = this.value; aplicarFiltrosNaTabelaModificada(); });
    $("#filtroStatus").on("change", function() { filtroAtual.status = this.value; aplicarFiltrosNaTabelaModificada(); });
    $("#filtroLista").on("change", function() { filtroAtual.lista = this.value; aplicarFiltrosNaTabelaModificada(); }); // Adicionado
    $("#filtroProjeto").on("change", function() { filtroAtual.projeto = this.value; aplicarFiltrosNaTabelaModificada(); }); // Adicionado
    $("#filtroPrazoEntrega").on("change", function() { filtroAtual.prazo = this.value; aplicarFiltrosNaTabelaModificada(); }); // Adicionado
    $("#btnFiltroHoje").on("click", function() { // Adicionado
        const hoje = new Date().toISOString().split('T')[0];
        $('#filtroPrazoEntrega').val(hoje);
        filtroAtual.prazo = hoje;
        aplicarFiltrosNaTabelaModificada();
    });

    const btnLimparFiltros = document.getElementById('btnLimparFiltros');
    if (btnLimparFiltros) btnLimparFiltros.addEventListener('click', limparFiltrosDaTabelaModificada); // Usa a função modificada

    // Listeners do calendário (mantidos)
    const btnVisualizacaoSemanal = document.getElementById('btnVisualizacaoSemanal');
    if (btnVisualizacaoSemanal) btnVisualizacaoSemanal.addEventListener('click', function() { alterarVisualizacaoCalendario('timeGridWeek', calendarioInstance); toggleBotaoAtivo(this, '.btn-visualizacao'); });
    const btnVisualizacaoMensal = document.getElementById('btnVisualizacaoMensal');
    if (btnVisualizacaoMensal) btnVisualizacaoMensal.addEventListener('click', function() { alterarVisualizacaoCalendario('dayGridMonth', calendarioInstance); toggleBotaoAtivo(this, '.btn-visualizacao'); });
    const btnCalendarioMes = document.getElementById('btnCalendarioMes');
    if (btnCalendarioMes) btnCalendarioMes.addEventListener('click', function() { alterarVisualizacaoCalendario('dayGridMonth', calendarioCompletoInstance); toggleBotaoAtivo(this, '.btn-calendario-completo'); });
    const btnCalendarioSemana = document.getElementById('btnCalendarioSemana');
    if (btnCalendarioSemana) btnCalendarioSemana.addEventListener('click', function() { alterarVisualizacaoCalendario('timeGridWeek', calendarioCompletoInstance); toggleBotaoAtivo(this, '.btn-calendario-completo'); });
    const btnCalendarioDia = document.getElementById('btnCalendarioDia');
    if (btnCalendarioDia) btnCalendarioDia.addEventListener('click', function() { alterarVisualizacaoCalendario('timeGridDay', calendarioCompletoInstance); toggleBotaoAtivo(this, '.btn-calendario-completo'); });

    const filtroFornecedorCalendario = document.getElementById('filtroFornecedorCalendario');
    if (filtroFornecedorCalendario) filtroFornecedorCalendario.addEventListener('change', function() { atualizarEventosCalendarioFiltrados(this.value, calendarioCompletoInstance); });

    ['btnCopy', 'btnExcel', 'btnPDF', 'btnPrint'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.addEventListener('click', () => exportarDadosTabela(id.substring(3).toLowerCase()));
    });
    console.log('Event listeners configurados.');
}

function toggleBotaoAtivo(botaoClicado, seletorGrupo) {
    document.querySelectorAll(seletorGrupo).forEach(botao => botao.classList.remove('active'));
    if (botaoClicado) botaoClicado.classList.add('active');
}

function alterarVisualizacaoCalendario(view, instance) {
    if (instance && typeof instance.changeView === 'function') {
        instance.changeView(view);
    } else {
        console.warn('Instância do calendário inválida ou changeView não é uma função.');
    }
}

function atualizarEventosCalendarioFiltrados(fornecedor, instance) {
    if (!instance || typeof instance.getEvents !== 'function' || typeof instance.removeAllEvents !== 'function' || typeof instance.addEventSource !== 'function') {
        console.warn('Instância do calendário inválida para filtrar eventos.');
        return;
    }
    // Recarrega todos os eventos baseados em 'todosItens' (que agora contém todos os itens comprados)
    carregarEventosCalendario();

    // Filtra os eventos diretamente na instância do calendário
    const eventosAtuais = instance.getEvents();
    instance.removeAllEvents(); // Limpa antes de adicionar filtrados
    const eventosFiltrados = eventosAtuais.filter(evento => {
        return !fornecedor || evento.extendedProps.fornecedor === fornecedor;
    });
    instance.addEventSource(eventosFiltrados);
}

// Modificado: Remove o parâmetro 'visao' e a lógica de filtro baseada nele.
// A função agora carrega TODOS os itens comprados para popular 'todosItens'.
// O filtro de visão será aplicado pela DataTable.
function carregarItensComprados() {
    console.log("Iniciando: carregarItensComprados (Carrega TODOS os itens comprados)");
    todosItens = [];
    fornecedores.clear();
    clientes.clear();
    listas.clear();
    projetos.clear();

    if (!window.dbRef || !window.dbRef.clientes || !window.dbRef.projetos) {
        console.error("dbRef não está configurado para carregarItensComprados.");
        mostrarNotificacao("Erro de conexão com banco de dados (Cód: R01).", "danger");
        inicializarTabelaItens([]);
        return;
    }

    // Mostra um indicador de carregamento
    mostrarLoadingTabela(true);

    firebase.database().ref('clientes').once('value')
        .then(snapshotClientes => {
            const clientesData = snapshotClientes.val();
            if (!clientesData) {
                console.warn('Nenhum cliente encontrado no Firebase.');
                inicializarTabelaItens([]);
                carregarEventosCalendario();
                mostrarLoadingTabela(false);
                return Promise.resolve();
            }
            return firebase.database().ref('projetos').once('value')
                .then(snapshotProjetos => {
                    const projetosData = snapshotProjetos.val() || {};
                    Object.keys(clientesData).forEach(clienteId => {
                        const clienteAtualData = clientesData[clienteId];
                        if (projetosData[clienteId]) {
                            const projetosDoCliente = projetosData[clienteId];
                            Object.keys(projetosDoCliente).forEach(tipoProjeto => {
                                const projeto = projetosDoCliente[tipoProjeto];
                                if (projeto.terceirizado || tipoProjeto.toLowerCase() === 'tratamento') return;
                                if (projeto.listas && !objetoVazio(projeto.listas)) {
                                    Object.keys(projeto.listas).forEach(nomeLista => {
                                        const listaConcreta = projeto.listas[nomeLista];
                                        const processarItemDaLista = (itemOriginal, itemKey) => {
                                            // Condição: Item foi comprado (novo StatusCOMPRA ou status antigo)
                                            const foiComprado = (itemOriginal.StatusCOMPRA === 'Comprado') ||
                                                              (itemOriginal.status && typeof itemOriginal.status === 'string' && itemOriginal.status.includes('Comprado'));

                                            // Adiciona à lista 'todosItens' se foi comprado, independente do status de recebimento
                                            if (itemOriginal && foiComprado) {
                                                const itemParaTabela = {
                                                    ...itemOriginal,
                                                    _fb_clienteId: clienteId,
                                                    _fb_tipoProjeto: tipoProjeto,
                                                    _fb_nomeLista: nomeLista,
                                                    _fb_itemKey: itemKey.toString(),
                                                    clienteNome: clienteAtualData.nome,
                                                    prazoEntregaCliente: clienteAtualData.prazoEntrega
                                                };
                                                todosItens.push(itemParaTabela);
                                                if (itemOriginal.fornecedor) fornecedores.add(itemOriginal.fornecedor);
                                                clientes.add(clienteAtualData.nome);
                                                listas.add(itemParaTabela._fb_nomeLista);
                                                projetos.add(itemParaTabela._fb_tipoProjeto);
                                            }
                                        };
                                        if (listaConcreta) {
                                            if (Array.isArray(listaConcreta)) {
                                                listaConcreta.forEach((item, index) => { if (item) processarItemDaLista(item, index); });
                                            } else if (typeof listaConcreta === 'object' && listaConcreta !== null) {
                                                Object.keys(listaConcreta).forEach(key => { if (listaConcreta[key]) processarItemDaLista(listaConcreta[key], key); });
                                            }
                                        }
                                    });
                                }
                            });
                        }
                    });
                    console.log(`Total de itens comprados carregados: ${todosItens.length}`);
                    inicializarTabelaItens(todosItens); // Inicializa com TODOS os itens
                    preencherSelectFornecedores();
                    preencherSelectClientes();
                    preencherSelectLista();
                    preencherSelectProjeto();
                    atualizarDashboardResumo();
                    carregarEventosCalendario();
                    mostrarLoadingTabela(false);
                });
        })
        .catch(error => {
            console.error('Erro geral ao carregar dados para recebimento:', error);
            mostrarNotificacao("Erro ao carregar dados (Cód: R02).", "danger");
            mostrarLoadingTabela(false);
            inicializarTabelaItens([]);
        });
}

function mostrarLoadingTabela(mostrar) {
    const loadingElement = document.getElementById('loadingTabela'); // Certifique-se que este ID existe no HTML
    const tabelaElement = document.getElementById('tabelaItens');
    if (loadingElement && tabelaElement) {
        if (mostrar) {
            tabelaElement.style.display = 'none';
            loadingElement.style.display = 'block';
        } else {
            tabelaElement.style.display = ''; // Volta ao display padrão da tabela
            loadingElement.style.display = 'none';
        }
    }
}

function inicializarTabelaItens(dados) {
    console.log('Inicializando DataTable com', dados.length, 'itens.');
    const colunasVisiveis = [
        { // Checkbox
            data: null,
            orderable: false,
            className: 'text-center dt-body-center select-checkbox',
            render: function(data, type, row) {
                // Usar uma combinação de chaves para garantir unicidade
                const uniqueId = `${row._fb_clienteId || 'nocli'}_${row._fb_tipoProjeto || 'noproj'}_${row._fb_nomeLista || 'nolist'}_${row._fb_itemKey || 'nokey'}`;
                return `<input type="checkbox" class="form-check-input check-item" data-unique-id="${uniqueId}">`;
            }
        },
        { data: 'codigo', title: 'Código', defaultContent: '' },
        { data: 'descricao', title: 'Descrição', defaultContent: '' },
        { // Botão Detalhes (+/-)
            className: 'dt-control text-center',
            orderable: false,
            data: null,
            defaultContent: '',
            title: '<button id="btnToggleColunasGlobal" class="btn btn-sm btn-outline-primary rounded-circle">+</button>', // Botão global no header
            width: '3%'
        },
        // Colunas inicialmente ocultas (serão mostradas/ocultas pelo botão)
        { data: 'altura', title: 'Altura', defaultContent: '', className: 'coluna-adicional', visible: !colunasOcultas },
        { data: 'largura', title: 'Largura', defaultContent: '', className: 'coluna-adicional', visible: !colunasOcultas },
        { data: 'medida', title: 'Medida', defaultContent: '', className: 'coluna-adicional', visible: !colunasOcultas },
        { data: 'cor', title: 'Cor', defaultContent: '', className: 'coluna-adicional', visible: !colunasOcultas },
        // --- Fim colunas ocultas ---
        { // Qtd (Lógica Original Referência)
            title: 'Qtd',
            width: '5%',
            className: 'text-center align-middle',
            render: function(data, type, row) {
                const qtdRecebida = parseFloat(row.quantidadeRecebida) || 0;
                const qtdTotal = (parseFloat(row.quantidadeComprada) || 0) > 0 ? (parseFloat(row.quantidadeComprada) || 0) : (parseFloat(row.necessidade) || 0);
                const qtdDisplay = qtdTotal > 0 ? `${qtdRecebida}/${qtdTotal}` : (row.necessidade || '0');
                return qtdDisplay;
            }
        },
        { data: 'clienteNome', title: 'Cliente', defaultContent: '', width: '10%' },
        { // Prazo Entrega (Lógica Original Referência)
            data: 'prazoEntrega',
            title: 'Prazo Entrega',
            defaultContent: '',
            width: '10%',
            render: function(data, type, row) {
                if (!data) return 'Não definido';
                if (typeof data === 'string' && data.includes('/')) {
                    return data; // Já está no formato DD/MM/YYYY
                }
                // Tenta converter de timestamp ou YYYY-MM-DD
                const dataObj = new Date(typeof data === 'string' && data.includes('-') ? data + "T00:00:00" : parseInt(data));
                if (!isNaN(dataObj.getTime())) {
                    return dataObj.toLocaleDateString('pt-BR');
                }
                return 'Inválido'; // Fallback se a conversão falhar
            }
        },
        { data: 'fornecedor', title: 'Fornecedor', defaultContent: '', width: '10%' },
        { data: '_fb_nomeLista', title: 'Lista', defaultContent: '', width: '10%' },
        { data: '_fb_tipoProjeto', title: 'Projeto', defaultContent: '', width: '10%' },
        { // Status Recebimento (com badge)
            data: 'StatusRecebimento',
            title: 'Status',
            defaultContent: 'Não Iniciado',
            width: '10%',
            render: function(data, type, row) {
                const status = data || 'Não Iniciado';
                return `<span class="badge ${getBadgeClassRecebimento(status)}">${status}</span>`;
            }
        }
    ];

    // Verifica se a tabela existe e se o elemento ainda está no DOM antes de destruir
    if (tabelaItens && $.fn.DataTable.isDataTable("#tabelaItens") && $("#tabelaItens").closest("body").length) {
        console.log("Destruindo DataTable existente...");
        try {
            tabelaItens.destroy();
            $("#tabelaItens tbody").empty(); // Limpa o corpo da tabela explicitamente
        } catch (e) {
            console.error("Erro ao destruir DataTable:", e);
            // Tenta limpar o HTML como fallback
            $("#tabelaItens").html("<thead></thead><tbody></tbody>"); 
        }
    } else if (tabelaItens) {
        console.log("DataTable instance exists but element might be detached or not a DataTable anymore. Resetting variable.");
        tabelaItens = null; // Reseta a variável se a tabela não for mais válida
        $("#tabelaItens tbody").empty(); // Tenta limpar o corpo mesmo assim
    }

    tabelaItens = $("#tabelaItens").DataTable({
        data: dados,
        columns: colunasVisiveis,
        responsive: true,
        language: { url: "//cdn.datatables.net/plug-ins/1.11.5/i18n/pt-BR.json" },
        order: [[10, 'asc']], // Ordenar por Prazo de Entrega
        select: {
            style: 'multi',
            selector: 'td:first-child .check-item' // Selecionar pela checkbox
        },
        // Adiciona columnDefs para suprimir avisos e definir conteúdo padrão
        columnDefs: [
            {
                targets: '_all', // Aplica a todas as colunas
                defaultContent: 'N/A' // Conteúdo padrão se o dado for nulo/indefinido
            }
        ],
        dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>><"row"<"col-sm-12"tr>><"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
        createdRow: function(row, data, dataIndex) {
            // Adiciona classes ou atributos se necessário
            $(row).addClass('animate__animated animate__fadeIn animate__faster');
        },
        drawCallback: function(settings) {
            // Atualiza contador e estado do botão Receber
            atualizarContadorEBotaoReceber();
            // Garante que o listener do checkbox mestre esteja ok
            $('#checkTodos').prop('checked', false);
            // Atualiza informações de registros
            const api = this.api();
            $('#infoRegistrosTabela').text(`Mostrando ${api.page.info().start + 1} a ${api.page.info().end} de ${api.page.info().recordsDisplay} itens (filtrado de ${api.page.info().recordsTotal} itens totais)`);
        }
    });

    // Configura o listener para o botão de toggle global no header da tabela
    $('#tabelaItens thead').off('click', '#btnToggleColunasGlobal').on('click', '#btnToggleColunasGlobal', function() {
        toggleColunasVisibilidadeDataTable();
    });

    // Configura listener para checkboxes individuais
    $('#tabelaItens tbody').off('change', '.check-item').on('change', '.check-item', function() {
        atualizarContadorEBotaoReceber();
    });

    // Configura listener para o controle de detalhes (+) da linha
    $('#tabelaItens tbody').off('click', 'td.dt-control').on('click', 'td.dt-control', function() {
        var tr = $(this).closest('tr');
        var row = tabelaItens.row(tr);
        if (row.child.isShown()) {
            row.child.hide();
            tr.removeClass('shown');
        } else {
            const rowData = row.data(); // Get data once
            if (rowData) { // Check if data exists
                row.child(formatarDetalhesLinha(rowData)).show();
                tr.addClass('shown');
            } else {
                console.error("Não foi possível obter os dados da linha para mostrar detalhes.");
                // Optionally, notify the user or handle the error gracefully
            }
        }
    });

    // Aplica o filtro de visão inicial (pendentes)
    aplicarFiltroVisaoInicial();

    console.log('DataTable inicializada/atualizada.');
}

function toggleColunasVisibilidadeDataTable() {
    colunasOcultas = !colunasOcultas;
    const btnHeader = $('#btnToggleColunasGlobal');
    if(btnHeader) btnHeader.text(colunasOcultas ? '+' : '-');

    // Itera pelas colunas que devem ser ocultadas/mostradas
    [4, 5, 6, 7].forEach(index => { // Índices das colunas Altura, Largura, Medida, Cor
        const column = tabelaItens.column(index);
        if (column) {
            column.visible(!column.visible());
        }
    });
    console.log(`Visibilidade das colunas adicionais alterada para: ${!colunasOcultas}`);
}

function toggleColunasVisibilidadeManual() {
    // Esta função é chamada pelo botão fora da tabela (se ainda existir)
    // Agora a lógica está centralizada em toggleColunasVisibilidadeDataTable
    toggleColunasVisibilidadeDataTable();
    // Atualiza também o botão externo, se ele existir
    const btnExterno = document.getElementById('btnToggleColunas');
    if (btnExterno) {
        btnExterno.textContent = colunasOcultas ? '+' : '-';
    }
}

function formatarDetalhesLinha(data) {
    // Formata os detalhes para exibição na linha expandida
    let detailsHtml = '<div class="row gx-2 gy-1 ps-4">';
    detailsHtml += `<div class="col-md-6"><strong>Altura:</strong> ${data.altura || 'N/A'}</div>`;
    detailsHtml += `<div class="col-md-6"><strong>Largura:</strong> ${data.largura || 'N/A'}</div>`;
    detailsHtml += `<div class="col-md-6"><strong>Medida:</strong> ${data.medida || 'N/A'}</div>`;
    detailsHtml += `<div class="col-md-6"><strong>Cor:</strong> ${data.cor || 'N/A'}</div>`;
    detailsHtml += `<div class="col-md-6"><strong>Qtd. Recebida:</strong> ${data.qtdRecebida || '0'}</div>`;
    detailsHtml += `<div class="col-md-6"><strong>Data Receb.:</strong> ${formatarData(data.dataRecebimento) || 'N/A'}</div>`;
    detailsHtml += `<div class="col-md-6"><strong>Nota Fiscal:</strong> ${data.notaFiscal || 'N/A'}</div>`;
    detailsHtml += `<div class="col-md-12"><strong>Obs.:</strong> ${data.observacoesRecebimento || 'Nenhuma'}</div>`;
    detailsHtml += '</div>';
    return detailsHtml;
}

function getBadgeClassRecebimento(status) {
    switch (status) {
        case 'Comprado': return 'bg-primary';
        case 'Empenho/Comprado': return 'bg-info text-dark';
        case 'Pendente': return 'bg-warning text-dark';
        case 'Concluído': return 'bg-success';
        case 'Incorreto': return 'bg-danger';
        default: return 'bg-secondary'; // Inclui 'Não Iniciado'
    }
}

function selecionarTodosNaTabela(selecionar) {
    if (!tabelaItens) return;
    const checkboxes = $('#tabelaItens tbody .check-item');
    checkboxes.prop('checked', selecionar);
    atualizarContadorEBotaoReceber();
}

function selecionarItensFiltradosNaTabela() {
    if (!tabelaItens) return;
    // Desmarca todos primeiro
    $('#tabelaItens tbody .check-item').prop('checked', false);
    // Seleciona apenas os visíveis (filtrados)
    tabelaItens.rows({ search: 'applied' }).nodes().to$().find('.check-item').prop('checked', true);
    atualizarContadorEBotaoReceber();
}

function atualizarContadorEBotaoReceber() {
    if (!tabelaItens) return;
    const selecionados = $('#tabelaItens tbody .check-item:checked');
    const count = selecionados.length;
    itensSelecionadosParaRecebimento = selecionados.map(function() {
        // Coleta o ID único do atributo data-
        return $(this).data("unique-id"); 
    }).get().filter(id => id !== null);

    console.log("Itens selecionados (IDs únicos):", itensSelecionadosParaRecebimento); // Log para depuração

    $('#contadorSelecionados').text(`${count} selecionados`);
    $('#btnReceberSelecionados').prop('disabled', count === 0);
}

function abrirModalRecebimento() {
    if (itensSelecionadosParaRecebimento.length === 0) {
        mostrarNotificacao('Nenhum item selecionado para recebimento.', 'warning');
        return;
    }
    $('#quantidadeItensSelecionados').text(itensSelecionadosParaRecebimento.length);
    // Resetar campos do modal
    $('#formRecebimento')[0].reset();
    $('#inputDataRecebimento').val(new Date().toISOString().split('T')[0]); // Data atual
    $('#areaQuantidadePersonalizada').addClass('d-none');
    $('#checkQuantidadePersonalizada').prop('checked', false);

    const modal = new bootstrap.Modal(document.getElementById('modalRecebimento'));
    modal.show();
}

function toggleQuantidadePersonalizada(mostrar) {
    $('#areaQuantidadePersonalizada').toggleClass('d-none', !mostrar);
}

function confirmarRecebimentoModal() {
    const dataRecebimento = $('#inputDataRecebimento').val();
    const notaFiscal = $('#inputNotaFiscal').val().trim();
    const observacoes = $('#inputObservacoes').val().trim();
    const usarQtdPersonalizada = $('#checkQuantidadePersonalizada').is(':checked');
    const qtdPersonalizada = usarQtdPersonalizada ? parseInt($('#inputQuantidade').val()) : null;

    if (!dataRecebimento) {
        mostrarNotificacao('Por favor, informe a data de recebimento.', 'warning');
        return;
    }
    if (usarQtdPersonalizada && (isNaN(qtdPersonalizada) || qtdPersonalizada < 0)) {
        mostrarNotificacao('Quantidade personalizada inválida.', 'warning');
        return;
    }

    console.log(`Confirmando recebimento para ${itensSelecionadosParaRecebimento.length} itens.`);
    const promessas = [];

    itensSelecionadosParaRecebimento.forEach(uniqueId => {
        // Parse o ID único para obter as chaves individuais
        const parts = uniqueId.split('_');
        if (parts.length !== 4) {
            console.warn(`ID único inválido encontrado: ${uniqueId}`);
            return; // Pula ID inválido
        }
        // Recria as chaves, tratando possíveis valores padrão como undefined
        const clienteId = parts[0] === 'nocli' ? undefined : parts[0];
        const projetoId = parts[1] === 'noproj' ? undefined : parts[1];
        const listaId = parts[2] === 'nolist' ? undefined : parts[2];
        const itemKey = parts[3] === 'nokey' ? undefined : parts[3];

        // Encontra o item exato em todosItens usando todas as chaves para garantir unicidade
        const item = todosItens.find(i => 
            i._fb_clienteId === clienteId &&
            i._fb_tipoProjeto === projetoId &&
            i._fb_nomeLista === listaId &&
            i._fb_itemKey === itemKey
        );

        if (!item) {
            console.warn(`Item com ID único ${uniqueId} não encontrado em todosItens.`);
            return; // Pula este item se não for encontrado
        }

        // Usa as propriedades do item encontrado (que é garantido ser o correto) para montar a referência
        const itemRef = firebase.database().ref(`projetos/${item._fb_clienteId}/${item._fb_tipoProjeto}/listas/${item._fb_nomeLista}/${item._fb_itemKey}`);
        const caminhoItemNoFirebase = `projetos/${item._fb_clienteId}/${item._fb_tipoProjeto}/listas/${item._fb_nomeLista}/${item._fb_itemKey}`; // CORRIGIDO: Removido /itens/
        // Adiciona a lógica assíncrona para buscar o item atual e processar
        const processarItemPromise = itemRef.once("value").then(snapshot => {
            const itemAtualFirebase = snapshot.val();
            if (!itemAtualFirebase) {
                console.warn(`Item com ID único ${uniqueId} não encontrado no Firebase em ${caminhoItemNoFirebase}.`);
                return Promise.resolve(); // Resolve para não quebrar o Promise.all
            }

            // Lógica de cálculo de quantidade da referência
            const compradoOriginal = parseFloat(itemAtualFirebase.quantidadeComprada) || parseFloat(itemAtualFirebase.necessidade) || 0;
            const jaRecebidoAntes = parseFloat(itemAtualFirebase.quantidadeRecebida) || 0;
            let quantidadeRecebidaNestaEntrega;

            if (usarQtdPersonalizada && qtdPersonalizada !== null) {
                quantidadeRecebidaNestaEntrega = parseFloat(qtdPersonalizada);
            } else {
                quantidadeRecebidaNestaEntrega = compradoOriginal - jaRecebidoAntes;
                if (quantidadeRecebidaNestaEntrega < 0) quantidadeRecebidaNestaEntrega = 0;
            }
            if (isNaN(quantidadeRecebidaNestaEntrega) || quantidadeRecebidaNestaEntrega < 0) {
                quantidadeRecebidaNestaEntrega = 0;
            }

            const totalRecebidoAgora = jaRecebidoAntes + quantidadeRecebidaNestaEntrega;

            // Lógica de status refinada da referência
            let novoStatusDoItem = itemAtualFirebase.status; // Começa com o status atual como fallback
            if (compradoOriginal <= 0) {
                if (totalRecebidoAgora > 0) {
                    novoStatusDoItem = 'Incorreto';
                } else {
                    if (itemAtualFirebase.status && !['Comprado', 'Pendente', 'Incorreto', 'Empenho/Comprado'].includes(itemAtualFirebase.status)) {
                        novoStatusDoItem = itemAtualFirebase.status;
                    } else {
                        novoStatusDoItem = 'Concluído';
                    }
                }
            } else {
                if (totalRecebidoAgora > compradoOriginal) {
                    novoStatusDoItem = 'Incorreto';
                } else if (totalRecebidoAgora === compradoOriginal) {
                    novoStatusDoItem = 'Concluído';
                } else if (totalRecebidoAgora > 0 && totalRecebidoAgora < compradoOriginal) {
                    novoStatusDoItem = 'Pendente';
                } else if (totalRecebidoAgora === 0) {
                    if (itemAtualFirebase.status && (itemAtualFirebase.status.includes('Comprado') || itemAtualFirebase.status.includes('Empenho/Comprado'))) {
                        novoStatusDoItem = itemAtualFirebase.status;
                    } else {
                        novoStatusDoItem = 'Pendente';
                    }
                }
            }
            console.log(`Lógica de Status: compradoOriginal=${compradoOriginal}, jaRecebidoAntes=${jaRecebidoAntes}, qtdRecebidaNestaEntrega=${quantidadeRecebidaNestaEntrega}, totalRecebidoAgora=${totalRecebidoAgora}, statusAnterior=${itemAtualFirebase.status}, novoStatus=${novoStatusDoItem}`);

            // Prepara os dados para atualização principal
            const dataRecebimentoObj = new Date(dataRecebimento + "T00:00:00");
            const dataRecebimentoFormatada = dataRecebimentoObj.toLocaleDateString('pt-BR');

            const updates = {
                StatusRecebimento: novoStatusDoItem,
                quantidadeRecebida: totalRecebidoAgora,
                dataUltimoRecebimento: dataRecebimentoFormatada,
                notaFiscalUltimoRecebimento: notaFiscal || null,
                observacaoUltimoRecebimento: observacoes || null
            };

            // Prepara os dados para o histórico
            const caminhoHistorico = `${caminhoItemNoFirebase}/historicoRecebimentos`;
            const novoHistoricoKey = firebase.database().ref(caminhoHistorico).push().key;
            const historicoEntry = {
                dataRecebimento: dataRecebimentoFormatada,
                quantidadeNestaEntrega: quantidadeRecebidaNestaEntrega,
                notaFiscal: notaFiscal || null,
                observacoes: observacoes || null,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            };

            // Retorna as duas promessas (update principal e set do histórico) - Igual à referência
            return Promise.all([
                itemRef.update(updates),
                firebase.database().ref(caminhoHistorico).child(novoHistoricoKey).set(historicoEntry)
            ]);
        }).catch(error => {
            console.error(`Erro ao processar item ${uniqueId}:`, error);
            return Promise.resolve(); // Resolve para não quebrar o Promise.all em caso de erro individual
        });

        promessas.push(processarItemPromise);
    });

    Promise.all(promessas)
        .then(() => {
            mostrarNotificacao(`${itensSelecionadosParaRecebimento.length} itens atualizados com sucesso!`, 'success');
            bootstrap.Modal.getInstance(document.getElementById('modalRecebimento')).hide();
            carregarItensComprados(); // Recarrega a lista para refletir as mudanças
            itensSelecionadosParaRecebimento = []; // Limpa seleção
            atualizarContadorEBotaoReceber(); // Atualiza UI
        })
        .catch(error => {
            console.error('Erro ao atualizar itens no Firebase:', error);
            mostrarNotificacao('Erro ao registrar recebimento. Verifique o console.', 'danger');
        });
}

function preencherSelectFornecedores() {
    const select = $('#filtroFornecedor, #filtroFornecedorCalendario');
    select.empty().append('<option value="">Todos</option>');
    fornecedores.forEach(f => select.append(`<option value="${f}">${f}</option>`));
    select.trigger('change.select2');
}

function preencherSelectClientes() {
    const select = $('#filtroCliente');
    select.empty().append('<option value="">Todos</option>');
    clientes.forEach(c => select.append(`<option value="${c}">${c}</option>`));
    select.trigger('change.select2');
}

function preencherSelectLista() {
    const select = $('#filtroLista');
    select.empty().append('<option value="">Todas</option>');
    listas.forEach(l => select.append(`<option value="${l}">${l}</option>`));
    select.trigger('change.select2');
}

function preencherSelectProjeto() {
    const select = $('#filtroProjeto');
    select.empty().append('<option value="">Todos</option>');
    projetos.forEach(p => select.append(`<option value="${p}">${p}</option>`));
    select.trigger('change.select2');
}

function atualizarDashboardResumo() {
    let aReceber = 0;
    let pendentesParcial = 0;
    todosItens.forEach(item => {
        const status = item.StatusRecebimento || 'Não Iniciado';
        if (status !== 'Concluído' && status !== 'Incorreto') {
            aReceber++;
            if (status === 'Pendente') {
                pendentesParcial++;
            }
        }
    });
    $('#itensAReceber').text(aReceber);
    $('#itensPendentesParcial').text(pendentesParcial);
}

function inicializarCalendario() {
    const calendarioEl = document.getElementById('calendarioRecebimento');
    const calendarioCompletoEl = document.getElementById('calendarioCompleto');
    if (!calendarioEl || !calendarioCompletoEl || typeof FullCalendar === 'undefined') {
        console.error('Elemento do calendário ou FullCalendar não encontrado.');
        return;
    }

    const configBase = {
        locale: 'pt-br',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: '' // Removido botões de visualização daqui
        },
        initialView: 'dayGridWeek', // ALTERADO para não mostrar horários
        events: [],
        editable: false,
        eventClick: function(info) {
            mostrarDetalhesEvento(info.event);
        }
    };

    calendarioInstance = new FullCalendar.Calendar(calendarioEl, {
        ...configBase,
        height: 'auto' // Ajusta altura ao conteúdo
    });
    calendarioInstance.render();

    calendarioCompletoInstance = new FullCalendar.Calendar(calendarioCompletoEl, {
        ...configBase,
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: '' // Botões serão controlados externamente
        },
        initialView: 'dayGridMonth',
        height: 550 // Altura fixa para o modal
    });
    // Renderiza apenas quando o modal for mostrado para evitar problemas de layout
    const modalCalendario = document.getElementById('modalCalendarioCompleto');
    if (modalCalendario) {
        modalCalendario.addEventListener("shown.bs.modal", function () {
            console.log("Modal do calendário completo exibido. Carregando eventos...");
            const eventos = gerarEventosParaCalendario(); // Usa a função helper
            calendarioCompletoInstance.removeAllEvents(); // Limpa eventos antigos
            calendarioCompletoInstance.addEventSource(eventos); // Adiciona os novos eventos
            calendarioCompletoInstance.render(); // Renderiza o calendário
            // A função abaixo pode ser usada para aplicar filtros adicionais, se necessário
            // atualizarEventosCalendarioFiltrados($("#filtroFornecedorCalendario").val(), calendarioCompletoInstance);
            console.log(`Eventos carregados no calendário completo: ${eventos.length}`);
        });
    }
}

function carregarEventosCalendario() {
    console.log("Carregando eventos para calendários (Lógica Original Adaptada)...");
    if (!calendarioInstance || !calendarioCompletoInstance) {
        console.warn("Instâncias do calendário não encontradas.");
        return;
    }
    if (!todosItens || todosItens.length === 0) {
        if (calendarioInstance) calendarioInstance.removeAllEvents();
        if (calendarioCompletoInstance) calendarioCompletoInstance.removeAllEvents();
        console.log("Nenhum item em 'todosItens' para carregar eventos.");
        return;
    }

    const eventosAgrupados = {};
    todosItens.forEach(item => {
        const statusRecebimentoAtual = item.StatusRecebimento || "Não Iniciado";
        const recebimentoNaoFinalizado = (statusRecebimentoAtual !== 'Concluído' && statusRecebimentoAtual !== 'Incorreto');

        // Usa 'prazoEntrega' (campo original) e verifica se não está finalizado
        if (item.prazoEntrega && item.fornecedor && recebimentoNaoFinalizado &&
            (parseFloat(item.necessidade) > 0 || parseFloat(item.quantidadeComprada) > 0))
        {
            let dataEntrega;
            // Lógica de parsing de data da versão original
            if (typeof item.prazoEntrega === 'string' && item.prazoEntrega.includes('/')) {
                const partes = item.prazoEntrega.split('/');
                if (partes.length === 3) {
                    dataEntrega = new Date(partes[2], partes[1] - 1, partes[0]);
                } else {
                    console.warn(`Formato de data inválido (DD/MM/YYYY): ${item.prazoEntrega}`);
                    return; // Pula este item
                }
            } else {
                const dateValue = item.prazoEntrega.includes('-') ? item.prazoEntrega + "T00:00:00" : parseInt(item.prazoEntrega);
                dataEntrega = new Date(dateValue);
            }

            if (isNaN(dataEntrega.getTime())) {
                 console.warn(`Data de entrega inválida após parse: ${item.prazoEntrega}`);
                 return; // Pula este item se a data for inválida
            }
            
            // Formata para YYYY-MM-DD para ser compatível com FullCalendar
            const dataFormatada = dataEntrega.toISOString().split('T')[0]; 
            const chaveEvento = `${item.fornecedor}_${dataFormatada}`;

            if (!eventosAgrupados[chaveEvento]) {
                eventosAgrupados[chaveEvento] = { fornecedor: item.fornecedor, data: dataFormatada, itens: [], quantidadeTotal: 0 };
            }
            eventosAgrupados[chaveEvento].itens.push(item);
            // Lógica de quantidade total da versão original
            eventosAgrupados[chaveEvento].quantidadeTotal += parseFloat(item.necessidade) > 0 ? parseFloat(item.necessidade) : (parseFloat(item.quantidadeComprada) || 0);
        }
    });

    if (calendarioInstance) calendarioInstance.removeAllEvents();
    if (calendarioCompletoInstance) calendarioCompletoInstance.removeAllEvents();

    let countEventos = 0;
    Object.values(eventosAgrupados).forEach(agrupamento => {
        if (agrupamento.quantidadeTotal <= 0) return; // Não adiciona evento se a quantidade for zero

        const evento = {
            title: `${agrupamento.fornecedor} (${agrupamento.quantidadeTotal} und)`,
            start: agrupamento.data, // Usa a data formatada YYYY-MM-DD
            allDay: true, // Garante que seja evento de dia todo
            backgroundColor: gerarCorParaFornecedor(agrupamento.fornecedor),
            borderColor: gerarCorParaFornecedor(agrupamento.fornecedor),
            extendedProps: { 
                fornecedor: agrupamento.fornecedor, 
                quantidade: agrupamento.quantidadeTotal, 
                itens: agrupamento.itens, 
                data: agrupamento.data 
            }
        };
        if (calendarioInstance) calendarioInstance.addEvent(evento);
        if (calendarioCompletoInstance) calendarioCompletoInstance.addEvent(evento);
        countEventos++;
    });
    console.log(`Adicionados ${countEventos} eventos (dia todo) aos calendários.`);

    // Se o modal estiver visível, aplica o filtro (se houver)
    if ($('#modalCalendarioCompleto').hasClass('show')) {
        atualizarEventosCalendarioFiltrados($('#filtroFornecedorCalendario').val(), calendarioCompletoInstance);
    }
}

function getCorEventoCalendario(status) {
    switch (status) {
        case 'Pendente': return '#ffc107'; // Amarelo
        case 'Comprado':
        case 'Empenho/Comprado':
        default: return '#0d6efd'; // Azul (Padrão para A Receber)
    }
}

function mostrarDetalhesEvento(eventoFullCalendar) {
    console.log("Mostrando detalhes do evento:", eventoFullCalendar);
    const { fornecedor, data, itens } = eventoFullCalendar.extendedProps;
    if (!itens || itens.length === 0) {
        console.warn("Nenhum item encontrado nas propriedades estendidas do evento.");
        mostrarNotificacao("Não há itens detalhados para este evento.", "warning");
        return;
    }
    // Tenta formatar a data, tratando possíveis erros
    let dataFormatada = data; // Fallback para a data original (YYYY-MM-DD)
    try {
        const dataObj = new Date(data + "T00:00:00Z"); // Adiciona Z para indicar UTC e evitar problemas de fuso
        if (!isNaN(dataObj.getTime())) {
            dataFormatada = dataObj.toLocaleDateString("pt-BR", { timeZone: "UTC" }); // Usa UTC para consistência
        }
    } catch (e) {
        console.error("Erro ao formatar data do evento:", e);
    }

    $("#detalhesEntregaFornecedor").text(`${fornecedor || "Fornecedor não informado"} - ${dataFormatada}`);
    const tabelaBody = $("#tabelaItensDetalhes");
    tabelaBody.empty(); // Limpa a tabela antes de adicionar novas linhas
    itens.forEach(item => {
        // Adiciona verificação para garantir que 'item' é um objeto válido
        if (item && typeof item === "object") {
            const codigo = item.codigo || "-";
            const descricao = item.descricao || "-";
            // Usa necessidade ou quantidade comprada, tratando valores nulos/undefined
            const quantidade = item.necessidade ? parseFloat(item.necessidade) : (item.quantidadeComprada ? parseFloat(item.quantidadeComprada) : 0);
            const clienteNome = item.clienteNome || "-";
            tabelaBody.append(`<tr><td>${codigo}</td><td>${descricao}</td><td>${quantidade}</td><td>${clienteNome}</td></tr>`);
        } else {
            console.warn("Item inválido encontrado na lista de detalhes do evento:", item);
        }
    });
    const modalEl = document.getElementById("modalDetalhesEvento");
    if (modalEl) {
        const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        modal.show();
    } else {
        console.error("Elemento do modal #modalDetalhesEvento não encontrado.");
    }
}

function exportarDadosTabela(formato) {
    if (!tabelaItens) {
        mostrarNotificacao('Tabela não inicializada.', 'warning');
        return;
    }
    // Usa a API de botões do DataTables
    tabelaItens.buttons().trigger(formato);
}

function formatarData(dataString) {
    if (!dataString) return '';
    // Tenta converter para data, independentemente do formato inicial
    try {
        // Se já estiver no formato dd/mm/yyyy, retorna
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dataString)) {
            return dataString;
        }
        // Se for timestamp numérico
        if (!isNaN(dataString)) {
             const date = new Date(parseInt(dataString));
             if (!isNaN(date.getTime())) return date.toLocaleDateString('pt-BR');
        }
        // Tenta outros formatos comuns (ISO 8601 YYYY-MM-DD)
        const date = new Date(dataString);
        // Adiciona verificação se a data é válida após conversão
        if (!isNaN(date.getTime())) {
             // Corrige problema de fuso horário pegando UTC
             const year = date.getUTCFullYear();
             const month = String(date.getUTCMonth() + 1).padStart(2, '0');
             const day = String(date.getUTCDate()).padStart(2, '0');
             return `${day}/${month}/${year}`;
        }
    } catch (e) {
        console.warn("Erro ao formatar data:", dataString, e);
    }
    return dataString; // Retorna original se não conseguir formatar
}

function formatarDataParaBusca(dataInput) {
    // Converte dd/mm/yyyy para yyyy-mm-dd se necessário para busca
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dataInput)) {
        const partes = dataInput.split('/');
        return `${partes[2]}-${partes[1]}-${partes[0]}`;
    }
    return dataInput; // Assume que já está no formato correto ou é inválido
}

// Função utilitária (se não estiver em global.js)
function objetoVazio(obj) {
    return obj === null || typeof obj !== 'object' || Object.keys(obj).length === 0;
}

// Função de notificação (se não estiver em global.js)
function mostrarNotificacao(mensagem, tipo = 'info', duracao = 3000) {
    const container = document.getElementById('notificacao-container-recebimento'); // Container específico
    if (!container) {
        console.error('Container de notificação não encontrado.');
        alert(mensagem);
        return;
    }
    const idUnico = 'notificacao-' + Date.now();
    const alertHtml = `
        <div id="${idUnico}" class="toast align-items-center text-white bg-${tipo} border-0 show" role="alert" aria-live="assertive" aria-atomic="true" data-bs-delay="${duracao}">
            <div class="d-flex">
                <div class="toast-body">
                    ${mensagem}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>`;
    container.insertAdjacentHTML('beforeend', alertHtml);
    const toastElement = document.getElementById(idUnico);
    const toast = new bootstrap.Toast(toastElement);
    toast.show();
    // Remove o elemento após o toast ser escondido
    toastElement.addEventListener('hidden.bs.toast', () => {
        toastElement.remove();
    });
}

// --- Adiciona as novas funções aqui ---

/**
 * Adiciona ou remove o filtro customizado da DataTable para alternar
 * entre a visão de itens pendentes e recebidos (Concluído/Incorreto).
 */
function aplicarFiltroVisaoRecebimento() {
    console.log(`Aplicando filtro de visão: ${mostrandoRecebidos ? 'Recebidos' : 'Pendentes'}`);
    const nomeFiltro = 'filtroVisaoRecebimento';
    const indiceFiltroExistente = $.fn.dataTable.ext.search.findIndex(f => f.name === nomeFiltro);
    if (indiceFiltroExistente > -1) {
        $.fn.dataTable.ext.search.splice(indiceFiltroExistente, 1);
    }
    const filtroFn = function(settings, data, dataIndex) {
        if (!tabelaItens) return true;
        const colunas = tabelaItens.settings()[0].aoColumns;
        let statusColIndex = colunas.findIndex(col => col.sTitle && col.sTitle.toLowerCase() === 'status');
        if (statusColIndex === -1) {
            console.warn("Coluna 'Status' não encontrada pelo título. Usando índice fallback 14.");
            statusColIndex = 14; // AJUSTAR SE NECESSÁRIO
        }
        const statusCellValue = data[statusColIndex] || "";
        const statusTexto = statusCellValue.replace(/<[^>]*>/g, '').trim();
        if (mostrandoRecebidos) {
            return statusTexto === 'Concluído' || statusTexto === 'Incorreto';
        } else {
            return statusTexto !== 'Concluído' && statusTexto !== 'Incorreto';
        }
    };
    filtroFn.name = nomeFiltro;
    $.fn.dataTable.ext.search.push(filtroFn);
    if (tabelaItens) {
        tabelaItens.draw();
    }
}

/**
 * Modifica o Event Listener do botão 'btnAlternarVisao' para usar a nova lógica de filtro.
 */
function configurarListenerBotaoAlternarVisao() {
    const btnAlternarVisao = document.getElementById("btnAlternarVisao");
    if (btnAlternarVisao) {
        const btnClone = btnAlternarVisao.cloneNode(true);
        btnAlternarVisao.parentNode.replaceChild(btnClone, btnAlternarVisao);
        btnClone.addEventListener("click", () => {
            mostrandoRecebidos = !mostrandoRecebidos;
            if (mostrandoRecebidos) {
                btnClone.innerHTML = `<i class="fas fa-tasks"></i> Mostrar Pendentes`;
                btnClone.classList.remove("btn-outline-secondary");
                btnClone.classList.add("btn-outline-info");
            } else {
                btnClone.innerHTML = `<i class="fas fa-history"></i> Mostrar Recebidos`;
                btnClone.classList.remove("btn-outline-info");
                btnClone.classList.add("btn-outline-secondary");
            }
            aplicarFiltroVisaoRecebimento();
        });
        console.log('Novo listener para btnAlternarVisao configurado.');
    }
}

/**
 * Garante que o filtro de visão seja aplicado corretamente na inicialização da tabela.
 */
function aplicarFiltroVisaoInicial() {
    if (tabelaItens) {
        mostrandoRecebidos = false;
        aplicarFiltroVisaoRecebimento();
        console.log('Filtro de visão inicial (pendentes) aplicado na tabela.');
    }
}

/**
 * Modifica a função de limpar filtros para também remover o filtro de visão.
 */
function limparFiltrosDaTabelaModificada() {
    $('#filtroFornecedor').val(null).trigger('change');
    $('#filtroCliente').val(null).trigger('change');
    $('#filtroCodigo').val('');
    $('#filtroStatus').val(null).trigger('change');
    $('#filtroLista').val(null).trigger('change');
    $('#filtroProjeto').val(null).trigger('change');
    $('#filtroPrazoEntrega').val('');
    filtroAtual = { fornecedor: '', cliente: '', codigo: '', status: '', lista: '', projeto: '', prazo: '' };
    const nomeFiltro = 'filtroVisaoRecebimento';
    const indiceFiltroExistente = $.fn.dataTable.ext.search.findIndex(f => f.name === nomeFiltro);
    if (indiceFiltroExistente > -1) {
        $.fn.dataTable.ext.search.splice(indiceFiltroExistente, 1);
    }
    mostrandoRecebidos = false;
    const btnAlternarVisao = document.getElementById("btnAlternarVisao");
    if (btnAlternarVisao) {
        btnAlternarVisao.innerHTML = `<i class="fas fa-history"></i> Mostrar Recebidos`;
        btnAlternarVisao.classList.remove("btn-outline-info");
        btnAlternarVisao.classList.add("btn-outline-secondary");
    }
    if (tabelaItens) {
        tabelaItens.search('').columns().search('').draw();
    }
    console.log('Todos os filtros limpos e tabela redesenhada.');
}

/**
 * Modifica a função que aplica outros filtros para garantir que o filtro de visão seja mantido.
 */
function aplicarFiltrosNaTabelaModificada() {
    if (tabelaItens) {
        // Índices das colunas - AJUSTAR CONFORME NECESSÁRIO!
        const colMap = {
            fornecedor: 11,
            cliente: 9,
            codigo: 1,
            status: 14,
            lista: 12,
            projeto: 13,
            prazo: 10
        };

        tabelaItens.column(colMap.fornecedor).search(filtroAtual.fornecedor || '', true, false);
        tabelaItens.column(colMap.cliente).search(filtroAtual.cliente || '', true, false);
        tabelaItens.column(colMap.codigo).search(filtroAtual.codigo || '', true, false);
        tabelaItens.column(colMap.status).search(filtroAtual.status || '', true, false);
        tabelaItens.column(colMap.lista).search(filtroAtual.lista || '', true, false);
        tabelaItens.column(colMap.projeto).search(filtroAtual.projeto || '', true, false);
        tabelaItens.column(colMap.prazo).search(filtroAtual.prazo ? formatarDataParaBusca(filtroAtual.prazo) : '', true, false);

        // Redesenha para aplicar todos os filtros (incluindo o de visão que já está no $.fn.dataTable.ext.search)
        tabelaItens.draw();
        console.log('Filtros da tabela aplicados (incluindo visão).');
    }
}




// Função para gerar cores consistentes para fornecedores (exemplo simples)
const coresFornecedores = {};
let proximaCor = 0;
const paletaCores = [
    '#0d6efd', '#6f42c1', '#d63384', '#dc3545', '#fd7e14', '#ffc107',
    '#198754', '#20c997', '#0dcaf0', '#6c757d', '#343a40', '#adb5bd',
    '#495057', '#ced4da', '#dee2e6', '#e9ecef', '#f8f9fa'
];

function gerarCorParaFornecedor(fornecedor) {
    if (!fornecedor) return '#6c757d'; // Cor padrão para fornecedor indefinido
    if (!coresFornecedores[fornecedor]) {
        coresFornecedores[fornecedor] = paletaCores[proximaCor % paletaCores.length];
        proximaCor++;
    }
    return coresFornecedores[fornecedor];
}

