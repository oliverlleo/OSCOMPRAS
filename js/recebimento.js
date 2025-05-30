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
const fornecedores = new Set();
const clientes = new Set();
const listas = new Set();
const projetos = new Set();
let filtroAtual = { fornecedor: '', cliente: '', codigo: '', status: '', lista: '', projeto: '', prazo: '' };
let mostrandoRecebidos = false; // Flag para controlar a visão da tabela

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM carregado: recebimento.js vFinal (Status Logic Corrected v2)');
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
        carregarItensComprados(); // Carrega pendentes por padrão
        configurarEventListeners();
    } else {
        console.error('Firebase não está disponível ou firebase.database não é uma função.');
        mostrarNotificacao('Erro crítico: Firebase não carregado.', 'danger');
    }
});

const inicializarComponentesBasicos = () => {
    console.log('Inicializando componentes básicos...');
    // jQuery ainda é usado para Select2 e DataTables. Não remover.
    if ($.fn.select2) {
        $('.select2').select2({ theme: 'bootstrap-5', width: '100%' });
        $('.select2-modal').select2({
            theme: 'bootstrap-5',
            width: '100%',
            dropdownParent: $('#modalCalendarioCompleto') // jQuery selector for dropdown parent
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
};

const configurarEventListeners = () => {
    console.log('Configurando event listeners...');

    const btnToggleColunasExt = document.getElementById('btnToggleColunas');
    if (btnToggleColunasExt) {
        btnToggleColunasExt.addEventListener('click', toggleColunasVisibilidadeManual);
    }

    const checkTodosPrincipal = document.getElementById('checkTodos');
    if (checkTodosPrincipal) {
        checkTodosPrincipal.addEventListener('click', (event) => {
            selecionarTodosNaTabela(event.target.checked);
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
        checkQuantidadePersonalizada.addEventListener('change', (event) => {
            toggleQuantidadePersonalizada(event.target.checked);
        });
    }

    const btnTodos = document.getElementById('btnTodos');
    if (btnTodos) {
        btnTodos.addEventListener('click', () => {
            selecionarTodosNaTabela(true);
            if(checkTodosPrincipal) checkTodosPrincipal.checked = true;
        });
    }

    const btnNenhum = document.getElementById('btnNenhum');
    if (btnNenhum) {
        btnNenhum.addEventListener('click', () => {
            selecionarTodosNaTabela(false);
            if(checkTodosPrincipal) checkTodosPrincipal.checked = false;
        });
    }

    const btnFiltrados = document.getElementById("btnFiltrados");
    if (btnFiltrados) {
        btnFiltrados.addEventListener("click", selecionarItensFiltradosNaTabela);
    }

    const btnAlternarVisao = document.getElementById("btnAlternarVisao");
    if (btnAlternarVisao) {
        btnAlternarVisao.addEventListener("click", () => {
            mostrandoRecebidos = !mostrandoRecebidos;
            const visaoAtual = mostrandoRecebidos ? "recebidos" : "pendentes";
            console.log(`Alternando visão para: ${visaoAtual}`);
            
            if (mostrandoRecebidos) {
                btnAlternarVisao.innerHTML = `<i class="fas fa-tasks"></i> Mostrar Pendentes`;
                btnAlternarVisao.classList.remove("btn-outline-secondary");
                btnAlternarVisao.classList.add("btn-outline-info");
            } else {
                btnAlternarVisao.innerHTML = `<i class="fas fa-history"></i> Mostrar Recebidos`;
                btnAlternarVisao.classList.remove("btn-outline-info");
                btnAlternarVisao.classList.add("btn-outline-secondary");
            }
            carregarItensComprados(visaoAtual);
        });
    }

    // jQuery ainda usado para Select2, não substituir estes:
    $("#filtroFornecedor").on("change", function() { filtroAtual.fornecedor = this.value; aplicarFiltrosNaTabela(); });
    $("#filtroCliente").on("change", function() { filtroAtual.cliente = this.value; aplicarFiltrosNaTabela(); });

    const filtroCodigoInput = document.getElementById('filtroCodigo');
    if (filtroCodigoInput) {
        filtroCodigoInput.addEventListener("input", (event) => { filtroAtual.codigo = event.target.value; aplicarFiltrosNaTabela(); });
    }
    // jQuery ainda usado para Select2
    $("#filtroStatus").on("change", function() { filtroAtual.status = this.value; aplicarFiltrosNaTabela(); });


    const btnLimparFiltros = document.getElementById('btnLimparFiltros');
    if (btnLimparFiltros) btnLimparFiltros.addEventListener('click', limparFiltrosDaTabela);

    // Listeners do calendário
    const btnVisualizacaoSemanal = document.getElementById('btnVisualizacaoSemanal');
    if (btnVisualizacaoSemanal) btnVisualizacaoSemanal.addEventListener('click', (event) => { alterarVisualizacaoCalendario('timeGridWeek', calendarioInstance); toggleBotaoAtivo(event.currentTarget, '.btn-visualizacao'); });

    const btnVisualizacaoMensal = document.getElementById('btnVisualizacaoMensal');
    if (btnVisualizacaoMensal) btnVisualizacaoMensal.addEventListener('click', (event) => { alterarVisualizacaoCalendario('dayGridMonth', calendarioInstance); toggleBotaoAtivo(event.currentTarget, '.btn-visualizacao'); });

    const btnCalendarioMes = document.getElementById('btnCalendarioMes');
    if (btnCalendarioMes) btnCalendarioMes.addEventListener('click', (event) => { alterarVisualizacaoCalendario('dayGridMonth', calendarioCompletoInstance); toggleBotaoAtivo(event.currentTarget, '.btn-calendario-completo'); });

    const btnCalendarioSemana = document.getElementById('btnCalendarioSemana');
    if (btnCalendarioSemana) btnCalendarioSemana.addEventListener('click', (event) => { alterarVisualizacaoCalendario('timeGridWeek', calendarioCompletoInstance); toggleBotaoAtivo(event.currentTarget, '.btn-calendario-completo'); });

    const btnCalendarioDia = document.getElementById('btnCalendarioDia');
    if (btnCalendarioDia) btnCalendarioDia.addEventListener('click', (event) => { alterarVisualizacaoCalendario('timeGridDay', calendarioCompletoInstance); toggleBotaoAtivo(event.currentTarget, '.btn-calendario-completo'); });

    const filtroFornecedorCalendario = document.getElementById('filtroFornecedorCalendario');
    // jQuery para Select2
    if (filtroFornecedorCalendario) $(filtroFornecedorCalendario).on('change', function() { atualizarEventosCalendarioFiltrados(this.value, calendarioCompletoInstance); });


    ['btnCopy', 'btnExcel', 'btnPDF', 'btnPrint'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.addEventListener('click', () => exportarDadosTabela(id.substring(3).toLowerCase()));
    });
    console.log('Event listeners configurados.');
};

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
    carregarEventosCalendario(); // Recarrega todos os eventos baseados em 'todosItens'
    
    // Filtra os eventos diretamente na instância do calendário
    const eventosAtuais = instance.getEvents();
    eventosAtuais.forEach(evento => {
        if (fornecedor && evento.extendedProps.fornecedor !== fornecedor) {
            evento.remove();
        }
    });
}

function carregarItensComprados(visao = 'pendentes') { // Adicionado parâmetro visao, default 'pendentes'
    console.log(`Iniciando: carregarItensComprados (Visão: ${visao})`);
    todosItens = [];
    fornecedores.clear();
    clientes.clear();

    if (!window.dbRef || !window.dbRef.clientes || !window.dbRef.projetos) {
        console.error("dbRef não está configurado para carregarItensComprados.");
        mostrarNotificacao("Erro de conexão com banco de dados (Cód: R01).", "danger");
        inicializarTabelaItens([]);
        return;
    }

    firebase.database().ref('clientes').once('value')
        .then(snapshotClientes => {
            const clientesData = snapshotClientes.val();
            if (!clientesData) {
                console.warn('Nenhum cliente encontrado no Firebase.');
                inicializarTabelaItens([]);
                carregarEventosCalendario();
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
                                            // Condição 1: Item foi comprado (novo StatusCOMPRA ou status antigo)
                                            const foiComprado = (itemOriginal.StatusCOMPRA === 'Comprado') || 
                                                              (itemOriginal.status && typeof itemOriginal.status === 'string' && itemOriginal.status.includes('Comprado'));
                                            
                                            // Condição 2: Status de Recebimento (depende da visão)
                                            const statusRecebimentoAtual = itemOriginal.StatusRecebimento || "Não Iniciado"; // Default to Não Iniciado if null/undefined
                                            let condicaoStatusRecebimento;
                                            if (visao === 'recebidos') {
                                                condicaoStatusRecebimento = (statusRecebimentoAtual === 'Concluído' || statusRecebimentoAtual === 'Incorreto');
                                            } else { // Visão padrão 'pendentes'
                                                condicaoStatusRecebimento = (statusRecebimentoAtual !== 'Concluído' && statusRecebimentoAtual !== 'Incorreto');
                                            }

                                            // Aplica o filtro principal
                                            if (itemOriginal && foiComprado && condicaoStatusRecebimento) {
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
                                                listas.add(itemParaTabela._fb_nomeLista); // Popular Set de Listas
                                                projetos.add(itemParaTabela._fb_tipoProjeto); // Popular Set de Projetos
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
                    console.log(`Total de itens carregados para recebimento: ${todosItens.length}`);
                    inicializarTabelaItens(todosItens);
                    preencherSelectFornecedores();
                    preencherSelectClientes();
                    preencherSelectLista(); // Adicionado
                    preencherSelectProjeto(); // Adicionado
                    atualizarDashboardResumo();
                    carregarEventosCalendario();
                });
        })
        .catch(error => {
            console.error('Erro geral ao carregar dados para recebimento:', error);
            mostrarNotificacao("Erro ao carregar dados (Cód: R02): " + error.message, "danger");
            inicializarTabelaItens([]);
            carregarEventosCalendario();
        });
}

function inicializarTabelaItens(itensParaExibir) {
    console.log('Inicializando DataTables com', itensParaExibir.length, 'itens.');
    const tabelaElement = document.getElementById('tabelaItens');
    const nenhumItemMsg = document.getElementById('nenhumItem');

    if (!tabelaElement) {
        console.error('Elemento #tabelaItens não encontrado!');
        return;
    }
    if ($.fn.DataTable.isDataTable('#tabelaItens')) {
        console.log('Destruindo instância DataTables existente.');
        $('#tabelaItens').DataTable().destroy();
        $(tabelaElement).find('tbody').empty();
    }

    if (itensParaExibir.length === 0) {
        if (nenhumItemMsg) nenhumItemMsg.classList.remove('d-none');
        $(tabelaElement).find('tbody').html(`<tr><td colspan="15" class="text-center">Nenhum item para recebimento.</td></tr>`);
        return;
    }
    if (nenhumItemMsg) nenhumItemMsg.classList.add('d-none');

    const dataSet = itensParaExibir.map(item => {
        const checkboxHtml = `<div class="form-check d-flex justify-content-center">
            <input class="form-check-input item-checkbox" type="checkbox" data-item-id="${item.codigo || item._fb_itemKey}" onchange="atualizarSelecaoDeItensParaRecebimento()">
        </div>`;
        let prazoEntregaFormatado = 'Não definido';
        if (item.prazoEntrega) {
            if (typeof item.prazoEntrega === 'string' && item.prazoEntrega.includes('/')) {
                prazoEntregaFormatado = item.prazoEntrega;
            } else {
                const dataObj = new Date(item.prazoEntrega.includes('-') ? item.prazoEntrega + "T00:00:00" : parseInt(item.prazoEntrega));
                if (!isNaN(dataObj.getTime())) prazoEntregaFormatado = dataObj.toLocaleDateString('pt-BR');
            }
        }
        let statusHtml = `<span class="badge bg-light text-dark">N/A</span>`;
        if (item.status) {
            let badgeClass = 'bg-secondary';
            if (item.status.includes('Comprado') && !item.status.includes('Empenho')) badgeClass = 'bg-primary'; // Apenas Comprado
            else if (item.status.includes('Empenho/Comprado')) badgeClass = 'bg-info text-dark'; // Empenho/Comprado
            else if (item.status === 'Pendente') badgeClass = 'bg-warning text-dark';
            else if (item.status === 'Concluído') badgeClass = 'bg-success';
            else if (item.status === 'Incorreto') badgeClass = 'bg-danger';
            statusHtml = `<span class="badge ${badgeClass}">${item.status}</span>`;
        }
        const qtdRecebida = parseFloat(item.quantidadeRecebida) || 0;
        const qtdTotal = (parseFloat(item.quantidadeComprada) || 0) > 0 ? (parseFloat(item.quantidadeComprada) || 0) : (parseFloat(item.necessidade) || 0);
        const qtdDisplay = qtdTotal > 0 ? `${qtdRecebida}/${qtdTotal}` : (item.necessidade || '0'); // Fallback if total is 0

        return [
            checkboxHtml, item.codigo || '-', item.descricao || '-', '',
            item.altura || '-', item.largura || '-', item.medida || '-', item.cor || '-',
            qtdDisplay, 
            item.clienteNome || '-', prazoEntregaFormatado,
            item.fornecedor || '-', item._fb_nomeLista || '-', item._fb_tipoProjeto || '-', statusHtml
        ];
    });
    
    tabelaItens = $("#tabelaItens").DataTable({
        data: dataSet,
        columns: [
            { title: `<div class="form-check d-flex justify-content-center"><input class="form-check-input" type="checkbox" id="checkTodosHeaderDt" title="Selecionar Todos na Tabela"></div>`, orderable: false, width: "5%" },
            { title: "Código", width: "10%" },
            { title: "Descrição", width: "auto" },
            { title: "", orderable: false, className: 'dt-control', defaultContent: '', width: "3%" },
            { title: "Altura", className: 'coluna-adicional', visible: !colunasOcultas },
            { title: "Largura", className: 'coluna-adicional', visible: !colunasOcultas },
            { title: "Medida", className: 'coluna-adicional', visible: !colunasOcultas },
            { title: "Cor", className: 'coluna-adicional', visible: !colunasOcultas },
            { title: "Qtd", width: "5%" },
            { title: "Cliente", width: "10%" },
            { title: "Prazo Entrega", width: "10%" },
            { title: "Fornecedor", width: "10%" },
            { title: "Lista", width: "10%" },
            { title: "Projeto", width: "10%" },
            { title: "Status", width: "10%" }
        ],
        language: { url: "https://cdn.datatables.net/plug-ins/1.11.5/i18n/pt-BR.json" },
        responsive: { details: { type: 'column', target: 3 } },
        columnDefs: [
            { className: "align-middle text-center", targets: [0, 3, 8] }, // Centraliza Qtd também
            { className: "align-middle", targets: '_all' }
        ],
        order: [[10, 'asc']], // Ordenar por Prazo Entrega
        dom: 'lBfrtip', // Adiciona 'B' para Buttons, 'l' para lengthMenu
        buttons: [
            {
                extend: 'copyHtml5',
                text: 'Copiar',
                className: 'd-none', // Botão interno oculto
                exportOptions: {
                    columns: ':visible:not(:first-child):not(.dt-control)' // Exclui checkbox e coluna de controle
                }
            },
            {
                extend: 'excelHtml5',
                text: 'Excel',
                className: 'd-none',
                title: 'Itens_Recebimento',
                exportOptions: {
                    columns: ':visible:not(:first-child):not(.dt-control)'
                }
            },
            {
                extend: 'pdfHtml5',
                text: 'PDF',
                className: 'd-none',
                orientation: 'landscape',
                pageSize: 'A4',
                title: 'Itens_Recebimento',
                exportOptions: {
                    columns: ':visible:not(:first-child):not(.dt-control)'
                }
            },
            {
                extend: 'print',
                text: 'Imprimir',
                className: 'd-none',
                title: 'Itens para Recebimento',
                exportOptions: {
                    columns: ':visible:not(:first-child):not(.dt-control)'
                }
            }
        ],
        pageLength: 10,
        lengthMenu: [10, 25, 50, 100],
        drawCallback: function() {
            const checkTodosDt = document.getElementById('checkTodosHeaderDt');
            if (checkTodosDt) {
                 $(checkTodosDt).off('click').on('click', function() {
                    selecionarTodosNaTabela(this.checked);
                 });
            }
            const infoContainer = document.getElementById('infoRegistrosTabela');
            if (infoContainer) {
                const info = this.api().page.info();
                infoContainer.textContent = `Mostrando ${info.start + 1} a ${info.end} de ${info.recordsDisplay} registros (filtrado de ${info.recordsTotal} total)`;
            }
            atualizarCheckboxesVisiveis();
            atualizarContadorSelecionados();
        },
        initComplete: function() {
            console.log("DataTable inicializado com botões.");
            // Adiciona listeners aos botões customizados para disparar os botões internos do DT
            $('#btnCopy').on('click', function() { tabelaItens.button(0).trigger(); });
            $('#btnExcel').on('click', function() { tabelaItens.button(1).trigger(); });
            $('#btnPDF').on('click', function() { tabelaItens.button(2).trigger(); });
            $('#btnPrint').on('click', function() { tabelaItens.button(3).trigger(); });
        }
    });
    
    // Atualiza o texto do botão de toggle e a visibilidade das colunas
    const btnToggleColunas = document.getElementById('btnToggleColunas');
    if (btnToggleColunas) {
        btnToggleColunas.textContent = colunasOcultas ? '+' : '-';
    }
    
    [4, 5, 6, 7].forEach(colIndex => {
        const column = tabelaItens.column(colIndex);
        if (column) column.visible(!colunasOcultas);
    });
    console.log(`Visibilidade colunas adicionais: ${!colunasOcultas}`);
}

function selecionarTodosNaTabela(checked) {
    if (!tabelaItens) return;
    tabelaItens.rows({ search: 'applied' }).nodes().to$().find('input.item-checkbox[type="checkbox"]').prop('checked', checked);
    atualizarSelecaoDeItensParaRecebimento();
    const checkTodosPrincipal = document.getElementById('checkTodos');
    if (checkTodosPrincipal) checkTodosPrincipal.checked = checked;
    const checkTodosHeaderDt = document.getElementById('checkTodosHeaderDt');
    if(checkTodosHeaderDt) checkTodosHeaderDt.checked = checked;
}

function selecionarItensFiltradosNaTabela() {
    if (!tabelaItens) return;
    tabelaItens.rows().nodes().to$().find('input.item-checkbox[type="checkbox"]').prop('checked', false);
    tabelaItens.rows({ search: 'applied' }).nodes().to$().find('input.item-checkbox[type="checkbox"]').prop('checked', true);
    atualizarSelecaoDeItensParaRecebimento();
}

function atualizarSelecaoDeItensParaRecebimento() {
    itensSelecionadosParaRecebimento = [];
    if (tabelaItens) {
        tabelaItens.rows({ search: 'applied' }).nodes().to$().find('input.item-checkbox:checked').each(function() {
            const itemIdAttr = $(this).data('item-id');
            if (itemIdAttr === undefined) return;
            const itemId = itemIdAttr.toString();
            const itemCompleto = todosItens.find(it => (it.codigo && it.codigo.toString() === itemId) || (it._fb_itemKey && it._fb_itemKey.toString() === itemId));
            if (itemCompleto) {
                itensSelecionadosParaRecebimento.push(itemCompleto);
            } else {
                console.warn("Item com ID/código não encontrado em todosItens:", itemId);
            }
        });
    }
    atualizarContadoresSelecao();
    const btnReceber = document.getElementById('btnReceberSelecionados');
    if (btnReceber) btnReceber.disabled = itensSelecionadosParaRecebimento.length === 0;

    const checkTodosHeaderDt = document.getElementById('checkTodosHeaderDt');
    if (checkTodosHeaderDt && tabelaItens) {
        const totalVisivel = tabelaItens.rows({ search: 'applied' }).nodes().length;
        checkTodosHeaderDt.checked = totalVisivel > 0 && itensSelecionadosParaRecebimento.length === totalVisivel;
        checkTodosHeaderDt.indeterminate = itensSelecionadosParaRecebimento.length > 0 && itensSelecionadosParaRecebimento.length < totalVisivel;
    }
}

function atualizarContadoresSelecao() {
    const contadorElement = document.getElementById('contadorSelecionados');
    if (contadorElement) contadorElement.textContent = `${itensSelecionadosParaRecebimento.length} selecionados`;
}

function abrirModalRecebimento() {
    if (itensSelecionadosParaRecebimento.length === 0) {
        mostrarNotificacao('Selecione pelo menos um item para receber.', 'warning'); return;
    }
    const qtdItensModal = document.getElementById('quantidadeItensSelecionados');
    if (qtdItensModal) qtdItensModal.textContent = itensSelecionadosParaRecebimento.length;

    document.getElementById('formRecebimento').reset();
    document.getElementById('inputDataRecebimento').value = new Date().toISOString().split('T')[0];
    toggleQuantidadePersonalizada(false);

    const modalEl = document.getElementById('modalRecebimento');
    const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
    modal.show();
}

function toggleQuantidadePersonalizada(mostrar) {
    const area = document.getElementById('areaQuantidadePersonalizada');
    if (area) area.classList.toggle('d-none', !mostrar);
}

function aplicarFiltrosNaTabela() {
    if (!tabelaItens) return;
    $.fn.dataTable.ext.search.pop();
    $.fn.dataTable.ext.search.push(
        function(settings, data, dataIndex) {
            if (settings.nTable.id !== 'tabelaItens') return true;
            const codigoTabela = (data[1] || '').toLowerCase();
            const clienteTabela = (data[9] || '').toLowerCase();
            const fornecedorTabela = (data[11] || '').toLowerCase();
            const statusHtml = data[14] || '';
            const statusTabela = statusHtml.replace(/<[^>]*>/g, '').toLowerCase().trim();
            const filtroCodigoLower = (filtroAtual.codigo || '').toLowerCase();
            const filtroClienteLower = (filtroAtual.cliente || '').toLowerCase();
            const filtroFornecedorLower = (filtroAtual.fornecedor || '').toLowerCase();
            const filtroStatusLower = (filtroAtual.status || '').toLowerCase();
            if (filtroCodigoLower && !codigoTabela.includes(filtroCodigoLower)) return false;
            if (filtroClienteLower && clienteTabela !== filtroClienteLower) return false;
            if (filtroFornecedorLower && fornecedorTabela !== filtroFornecedorLower) return false;
            if (filtroStatusLower && !statusTabela.includes(filtroStatusLower)) return false;
            return true;
        }
    );
    tabelaItens.draw();
    atualizarSelecaoDeItensParaRecebimento();
}

function limparFiltrosDaTabela() {
    filtroAtual = { fornecedor: '', cliente: '', codigo: '', status: '' };
    $('#filtroFornecedor').val('').trigger('change');
    $('#filtroCliente').val('').trigger('change');
    $('#filtroCodigo').val('');
    $('#filtroStatus').val('').trigger('change');
    if (tabelaItens) {
        $.fn.dataTable.ext.search.pop();
        tabelaItens.search('').columns().search('').draw();
    }
    atualizarSelecaoDeItensParaRecebimento();
}

async function confirmarRecebimentoModal() {
    console.log('Confirmando recebimento via modal (confirmarRecebimentoModal)...');
    const inputDataRecebimento = document.getElementById('inputDataRecebimento');
    const inputNotaFiscal = document.getElementById('inputNotaFiscal');
    const inputObservacoes = document.getElementById('inputObservacoes');
    const checkQuantidadePersonalizada = document.getElementById('checkQuantidadePersonalizada');
    const inputQuantidade = document.getElementById('inputQuantidade');

    if (!inputDataRecebimento || !inputDataRecebimento.value) {
        mostrarNotificacao('Informe a data de recebimento.', 'warning'); return;
    }
    const dadosRecebimentoForm = {
        dataRecebimento: inputDataRecebimento.value,
        notaFiscal: inputNotaFiscal ? inputNotaFiscal.value.trim() : '',
        observacoes: inputObservacoes ? inputObservacoes.value.trim() : '',
        quantidadePersonalizada: null
    };
    if (checkQuantidadePersonalizada && checkQuantidadePersonalizada.checked) {
        const qtd = parseInt(inputQuantidade.value);
        if (isNaN(qtd) || qtd < 0) {
            mostrarNotificacao('Informe uma quantidade personalizada válida (maior ou igual a 0).', 'warning'); return;
        }
        dadosRecebimentoForm.quantidadePersonalizada = qtd;
    }
    if (itensSelecionadosParaRecebimento.length === 0) {
        mostrarNotificacao('Nenhum item selecionado.', 'warning'); return;
    }

    const btnConfirmar = document.getElementById('btnConfirmarRecebimento');
    const textoOriginalBtn = btnConfirmar.innerHTML;
    btnConfirmar.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Processando...';
    btnConfirmar.disabled = true;

    try {
        await processarRecebimentoDeItens(itensSelecionadosParaRecebimento, dadosRecebimentoForm);
        mostrarNotificacao(`${itensSelecionadosParaRecebimento.length} item(ns) processado(s).`, 'success');
        itensSelecionadosParaRecebimento = [];
        const chkTodosHeaderDt = document.getElementById('checkTodosHeaderDt');
        if(chkTodosHeaderDt) chkTodosHeaderDt.checked = false;
        const chkTodosPrincipal = document.getElementById('checkTodos');
        if(chkTodosPrincipal) chkTodosPrincipal.checked = false;
        
        atualizarSelecaoDeItensParaRecebimento();
        carregarItensComprados();

        const modalEl = document.getElementById('modalRecebimento');
        const modalInst = bootstrap.Modal.getInstance(modalEl);
        if (modalInst) modalInst.hide();
    } catch (error) {
        console.error("Erro ao processar recebimento:", error);
        mostrarNotificacao(`Falha: ${error.message || 'Erro desconhecido'}.`, "danger");
    } finally {
        btnConfirmar.innerHTML = textoOriginalBtn;
        btnConfirmar.disabled = false;
    }
}

async function processarRecebimentoDeItens(itensParaReceber, dadosFormulario) {
    console.log(`Processando ${itensParaReceber.length} itens.`);
    let falhas = 0;
    for (const item of itensParaReceber) {
        try {
            await salvarItemRecebidoNoFirebase(item, dadosFormulario);
        } catch (error) {
            console.error(`Falha ao salvar item ${item.codigo || item._fb_itemKey}:`, error);
            falhas++;
        }
    }
    if (falhas > 0) throw new Error(`${falhas} item(ns) não processados.`);
}

async function salvarItemRecebidoNoFirebase(itemQueFoiRecebido, infoDoFormulario) {
    console.log(`Salvando item: ${itemQueFoiRecebido.codigo || itemQueFoiRecebido._fb_itemKey}`, JSON.stringify(itemQueFoiRecebido));
    if (!itemQueFoiRecebido._fb_clienteId || !itemQueFoiRecebido._fb_tipoProjeto || !itemQueFoiRecebido._fb_nomeLista || typeof itemQueFoiRecebido._fb_itemKey === 'undefined') {
        throw new Error(`Ref Firebase incompleta para ${itemQueFoiRecebido.codigo || itemQueFoiRecebido._fb_itemKey}`);
    }
    const caminhoItemNoFirebase = `projetos/${itemQueFoiRecebido._fb_clienteId}/${itemQueFoiRecebido._fb_tipoProjeto}/listas/${itemQueFoiRecebido._fb_nomeLista}/${itemQueFoiRecebido._fb_itemKey}`;
    const itemRef = firebase.database().ref(caminhoItemNoFirebase);
    const snapshot = await itemRef.once('value');
    const itemAtualFirebase = snapshot.val();
    if (!itemAtualFirebase) throw new Error(`Item ${itemQueFoiRecebido.codigo || itemQueFoiRecebido._fb_itemKey} não encontrado em ${caminhoItemNoFirebase}.`);

    const compradoOriginal = parseFloat(itemAtualFirebase.quantidadeComprada) || parseFloat(itemAtualFirebase.necessidade) || 0;
    const jaRecebidoAntes = parseFloat(itemAtualFirebase.quantidadeRecebida) || 0;
    let quantidadeRecebidaNestaEntrega;

    if (infoDoFormulario.quantidadePersonalizada !== null) {
        quantidadeRecebidaNestaEntrega = parseFloat(infoDoFormulario.quantidadePersonalizada);
    } else {
        quantidadeRecebidaNestaEntrega = compradoOriginal - jaRecebidoAntes;
        if (quantidadeRecebidaNestaEntrega < 0) quantidadeRecebidaNestaEntrega = 0;
    }
     if (isNaN(quantidadeRecebidaNestaEntrega) || quantidadeRecebidaNestaEntrega < 0) {
         quantidadeRecebidaNestaEntrega = 0;
    }

    const totalRecebidoAgora = jaRecebidoAntes + quantidadeRecebidaNestaEntrega;
    
    // LÓGICA DE STATUS CORRIGIDA E REFINADA
    let novoStatusDoItem = itemAtualFirebase.status; // Começa com o status atual como fallback

    if (compradoOriginal <= 0) { // Se não havia nada a ser comprado/necessário
        if (totalRecebidoAgora > 0) {
            novoStatusDoItem = 'Incorreto'; // Recebeu algo que não era esperado
        } else { // Nada a comprar, nada recebido
            // Mantém status se for algo específico (ex: Cancelado), senão Concluído
            if (itemAtualFirebase.status && !['Comprado', 'Pendente', 'Incorreto', 'Empenho/Comprado'].includes(itemAtualFirebase.status)) {
                 novoStatusDoItem = itemAtualFirebase.status;
            } else {
                 novoStatusDoItem = 'Concluído';
            }
        }
    } else { // Se havia algo a ser comprado/necessário (compradoOriginal > 0)
        if (totalRecebidoAgora > compradoOriginal) {
            novoStatusDoItem = 'Incorreto';
        } else if (totalRecebidoAgora === compradoOriginal) {
            novoStatusDoItem = 'Concluído';
        } else if (totalRecebidoAgora > 0 && totalRecebidoAgora < compradoOriginal) {
            novoStatusDoItem = 'Pendente'; 
        } else if (totalRecebidoAgora === 0) {
            // Nada recebido ainda, mas era esperado.
            if (itemAtualFirebase.status && (itemAtualFirebase.status.includes('Comprado') || itemAtualFirebase.status.includes('Empenho/Comprado'))) {
                 novoStatusDoItem = itemAtualFirebase.status; // Mantém o status de compra
            } else {
                 novoStatusDoItem = 'Pendente'; // Se não tinha status de compra, agora fica Pendente
            }
        }
        // Se totalRecebidoAgora < 0 (não deve acontecer), mantém o status atual (já definido no início)
    }
    console.log(`Lógica de Status: compradoOriginal=${compradoOriginal}, jaRecebidoAntes=${jaRecebidoAntes}, qtdRecebidaNestaEntrega=${quantidadeRecebidaNestaEntrega}, totalRecebidoAgora=${totalRecebidoAgora}, statusAnterior=${itemAtualFirebase.status}, novoStatus=${novoStatusDoItem}`);


    const updates = {};
    const dataRecebimentoObj = new Date(infoDoFormulario.dataRecebimento + "T00:00:00");
    const dataRecebimentoFormatada = dataRecebimentoObj.toLocaleDateString('pt-BR');

    updates[`StatusRecebimento`] = novoStatusDoItem; // Salva no novo campo StatusRecebimento
    updates[`quantidadeRecebida`] = totalRecebidoAgora;
    updates[`dataUltimoRecebimento`] = dataRecebimentoFormatada;
    if (infoDoFormulario.notaFiscal) updates[`notaFiscalUltimoRecebimento`] = infoDoFormulario.notaFiscal;
    if (infoDoFormulario.observacoes) updates[`observacaoUltimoRecebimento`] = infoDoFormulario.observacoes;

    const caminhoHistorico = `${caminhoItemNoFirebase}/historicoRecebimentos`;
    const novoHistoricoKey = firebase.database().ref(caminhoHistorico).push().key;
    
    const historicoEntry = {
        dataRecebimento: dataRecebimentoFormatada,
        quantidadeNestaEntrega: quantidadeRecebidaNestaEntrega,
        notaFiscal: infoDoFormulario.notaFiscal || null,
        observacoes: infoDoFormulario.observacoes || null,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };
    
    await itemRef.update(updates);
    await firebase.database().ref(caminhoHistorico).child(novoHistoricoKey).set(historicoEntry);
    console.log(`Item ${itemQueFoiRecebido.codigo || itemQueFoiRecebido._fb_itemKey} salvo. Status: ${novoStatusDoItem}. Updates:`, updates);
}

// --- Funções do Calendário e Dashboard ---
function inicializarCalendario() {
    console.log('Inicializando calendários...');
    const calendarEl = document.getElementById('calendarioRecebimento');
    const calendarCompletoEl = document.getElementById('calendarioCompleto');
    const commonOptions = { 
        locale: 'pt-br', height: 'auto', allDaySlot: false, slotMinTime: '08:00:00', slotMaxTime: '18:00:00',
        businessHours: { daysOfWeek: [1, 2, 3, 4, 5], startTime: '08:00', endTime: '18:00' },
        eventClick: (info) => mostrarDetalhesEvento(info.event),
        eventDidMount: (info) => { if ($.fn.tooltip) $(info.el).tooltip({ title: info.event.title, placement: 'top', trigger: 'hover', container: 'body' });}
    };
    if (calendarEl && typeof FullCalendar !== 'undefined') {
        calendarioInstance = new FullCalendar.Calendar(calendarEl, {...commonOptions, initialView: 'dayGridWeek', headerToolbar: { left: 'prev,next today', center: 'title', right: '' }}); // Alterado para dayGridWeek
        calendarioInstance.render();
    } else { console.error('Falha ao inicializar calendário principal.'); }
    if (calendarCompletoEl && typeof FullCalendar !== 'undefined') {
        calendarioCompletoInstance = new FullCalendar.Calendar(calendarCompletoEl, {...commonOptions, initialView: 'dayGridMonth', headerToolbar: { left: 'prev,next today', center: 'title', right: '' }});
        $('#modalCalendarioCompleto').on('shown.bs.modal', () => { if(calendarioCompletoInstance && typeof calendarioCompletoInstance.render === 'function') { calendarioCompletoInstance.render(); calendarioCompletoInstance.updateSize();} });
    } else { console.error('Falha ao inicializar calendário completo.'); }
}

function carregarEventosCalendario() {
    console.log('Carregando eventos para calendários...');
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

        if (item.prazoEntrega && item.fornecedor && recebimentoNaoFinalizado &&
            (parseFloat(item.necessidade) > 0 || parseFloat(item.quantidadeComprada) > 0)
        ) {
            let dataEntrega;
            if (typeof item.prazoEntrega === 'string' && item.prazoEntrega.includes('/')) {
                const partes = item.prazoEntrega.split('/');
                dataEntrega = new Date(partes[2], partes[1] - 1, partes[0]);
            } else {
                const dateValue = item.prazoEntrega.includes('-') ? `${item.prazoEntrega}T00:00:00` : parseInt(item.prazoEntrega);
                dataEntrega = new Date(dateValue);
            }
            if (isNaN(dataEntrega.getTime())) return;
            const dataFormatada = dataEntrega.toISOString().split('T')[0];
            const chaveEvento = `${item.fornecedor}_${dataFormatada}`;
            if (!eventosAgrupados[chaveEvento]) {
                eventosAgrupados[chaveEvento] = { fornecedor: item.fornecedor, data: dataFormatada, itens: [], quantidadeTotal: 0 };
            }
            eventosAgrupados[chaveEvento].itens.push(item);
            eventosAgrupados[chaveEvento].quantidadeTotal += parseFloat(item.necessidade) > 0 ? parseFloat(item.necessidade) : (parseFloat(item.quantidadeComprada) || 0) ;
        }
    });

    if (calendarioInstance) calendarioInstance.removeAllEvents();
    if (calendarioCompletoInstance) calendarioCompletoInstance.removeAllEvents();
    
    let countEventos = 0;
    Object.values(eventosAgrupados).forEach(agrupamento => {
        if(agrupamento.quantidadeTotal <= 0) return;

        const evento = {
            title: `${agrupamento.fornecedor} (${agrupamento.quantidadeTotal} und)`,
            start: agrupamento.data,
            allDay: true,
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
    console.log(`Adicionados ${countEventos} eventos aos calendários.`);
};

const mostrarDetalhesEvento = eventoFullCalendar => {
    const { fornecedor, data, itens } = eventoFullCalendar.extendedProps;
    const dataObj = new Date(`${data}T00:00:00Z`); // Assegurar que a data seja tratada como UTC
    const dataFormatada = dataObj.toLocaleDateString('pt-BR', { timeZone: 'UTC' }); // Usar UTC para evitar problemas de fuso

    const detalhesFornecedorEl = document.getElementById('detalhesEntregaFornecedor');
    if (detalhesFornecedorEl) detalhesFornecedorEl.textContent = `${fornecedor} - ${dataFormatada}`;

    const tabelaBody = document.getElementById('tabelaItensDetalhes');
    if (tabelaBody) {
        tabelaBody.innerHTML = ''; // Limpar antes de adicionar
        itens.forEach(item => {
            const row = tabelaBody.insertRow();
            row.insertCell().textContent = item.codigo || '-';
            row.insertCell().textContent = item.descricao || '-';
            row.insertCell().textContent = item.necessidade || '0';
            row.insertCell().textContent = item.clienteNome || '-';
        });
    }

    const modalEl = document.getElementById('modalDetalhesEvento');
    const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
    modal.show();
};

const preencherSelectFornecedores = () => {
    const selects = document.querySelectorAll('#filtroFornecedor, #filtroFornecedorCalendario');
    selects.forEach(select => {
        select.innerHTML = '<option value="">Todos os fornecedores</option>'; // Reset
        Array.from(fornecedores).sort().forEach(f => {
            const option = document.createElement('option');
            option.value = f;
            option.textContent = f;
            select.appendChild(option);
        });
        // jQuery para Select2
        if ($.fn.select2) $(select).trigger('change.select2');
    });
};

const preencherSelectClientes = () => {
    const select = document.getElementById('filtroCliente');
    if (!select) return;
    select.innerHTML = '<option value="">Todos os clientes</option>'; // Reset
    Array.from(clientes).sort().forEach(c => {
        const option = document.createElement('option');
        option.value = c;
        option.textContent = c;
        select.appendChild(option);
    });
    // jQuery para Select2
    if ($.fn.select2) $(select).trigger('change.select2');
};

const atualizarDashboardResumo = () => {
    console.log("Atualizando resumo do dashboard com novas definições...");
    let countAReceber = 0;
    let countPendentesParcial = 0;

    todosItens.forEach(item => {
        if (item.status) {
            if (item.status.includes("Comprado") || item.status.includes("Empenho/Comprado")) {
                countAReceber++;
            }
            if (item.status === "Pendente") {
                countPendentesParcial++;
            }
        }
    });

    const elAReceber = document.getElementById("itensAReceber");
    const elPendentesParcial = document.getElementById("itensPendentesParcial");

    if (elAReceber) elAReceber.textContent = countAReceber;
    else console.warn("Elemento #itensAReceber não encontrado no HTML.");
    
    if (elPendentesParcial) elPendentesParcial.textContent = countPendentesParcial;
    else console.warn("Elemento #itensPendentesParcial não encontrado no HTML.");

    console.log(`Dashboard Atualizado: A Receber=${countAReceber}, Pendentes (Parcial)=${countPendentesParcial}`);
    
    if (typeof atualizarDashboardAvancado === 'function') {
        atualizarDashboardAvancado(); 
    }
};

const exportarDadosTabela = (tipo) => {
    console.warn(`Exportar para ${tipo} - requer DataTables Buttons.`);
    mostrarNotificacao(`Exportar para ${tipo} requer configuração adicional.`, 'info');
};

const gerarCorParaFornecedor = (fornecedor) => {
    if (!fornecedor) return '#808080';
    const cores = ['#4285F4', '#EA4335', '#FBBC05', '#34A853', '#FF6D01', '#46BDC6', '#7B1FA2'];
    let hash = 0;
    for (let i = 0; i < fornecedor.length; i++) {
        hash = fornecedor.charCodeAt(i) + ((hash << 5) - hash);
    }
    return cores[Math.abs(hash) % cores.length];
};

const preencherSelectLista = () => {
    const selectLista = document.getElementById("filtroLista");
    if (!selectLista) return;
    selectLista.innerHTML = '<option value="">Todas</option>';
    const sortedListas = Array.from(listas).sort();
    sortedListas.forEach(lista => {
        const option = document.createElement("option");
        option.value = lista;
        option.textContent = lista;
        selectLista.appendChild(option);
    });
    if ($.fn.select2) $(selectLista).select2({ theme: 'bootstrap-5', width: '100%' });
};

const preencherSelectProjeto = () => {
    const selectProjeto = document.getElementById("filtroProjeto");
    if (!selectProjeto) return;
    selectProjeto.innerHTML = '<option value="">Todos</option>';
    const sortedProjetos = Array.from(projetos).sort();
    sortedProjetos.forEach(projeto => {
        const option = document.createElement("option");
        option.value = projeto;
        option.textContent = projeto;
        selectProjeto.appendChild(option);
    });
    if ($.fn.select2) $(selectProjeto).select2({ theme: 'bootstrap-5', width: '100%' });
};

const adicionarListenersNovosFiltros = () => {
    // jQuery para Select2
    $("#filtroLista").on("change", function() { 
        filtroAtual.lista = this.value; 
        aplicarFiltrosNaTabela(); 
    });
    $("#filtroProjeto").on("change", function() { 
        filtroAtual.projeto = this.value; 
        aplicarFiltrosNaTabela(); 
    });

    const filtroPrazoEntregaInput = document.getElementById('filtroPrazoEntrega');
    if (filtroPrazoEntregaInput) {
        filtroPrazoEntregaInput.addEventListener("change", (event) => {
            filtroAtual.prazo = event.target.value;
            aplicarFiltrosNaTabela();
        });
    }

    const btnFiltroHoje = document.getElementById('btnFiltroHoje');
    if (btnFiltroHoje) {
        btnFiltroHoje.addEventListener('click', () => {
            const hoje = new Date().toISOString().split('T')[0];
            const inputPrazo = document.getElementById('filtroPrazoEntrega');
            if (inputPrazo) {
                inputPrazo.value = hoje;
                filtroAtual.prazo = hoje;
                aplicarFiltrosNaTabela();
            }
        });
    }
};

const limparFiltrosDaTabela = () => {
    console.log('Limpando filtros...');
    filtroAtual = { fornecedor: '', cliente: '', codigo: '', status: '', lista: '', projeto: '', prazo: '' };
    
    // jQuery para Select2
    $('#filtroFornecedor').val('').trigger('change.select2');
    $('#filtroCliente').val('').trigger('change.select2');
    document.getElementById('filtroCodigo').value = '';
    $('#filtroStatus').val('').trigger('change.select2');
    $('#filtroLista').val('').trigger('change.select2');
    $('#filtroProjeto').val('').trigger('change.select2');
    document.getElementById('filtroPrazoEntrega').value = '';

    aplicarFiltrosNaTabela();
};

const aplicarFiltrosNaTabela = () => {
    console.log('Aplicando filtros:', filtroAtual);
    if (tabelaItens) {
        tabelaItens.draw();
    }
    atualizarContadorSelecionados();
};

// DataTables custom search
if ($.fn.dataTable) {
    $.fn.dataTable.ext.search.push(
        (settings, data, dataIndex) => {
            if (settings.nTable.id !== 'tabelaItens') {
                return true;
            }

            const item = todosItens[dataIndex];
            if (!item) return false;

            const fornecedorMatch = !filtroAtual.fornecedor || item.fornecedor === filtroAtual.fornecedor;
            const clienteMatch = !filtroAtual.cliente || item.clienteNome === filtroAtual.cliente;
            const codigoMatch = !filtroAtual.codigo || (item.codigo && item.codigo.toLowerCase().includes(filtroAtual.codigo.toLowerCase()));

            // Extract text from status HTML for matching
            const statusHtml = data[14] || ''; // Assuming status is the 15th column (index 14)
            const statusNode = document.createElement('div');
            statusNode.innerHTML = statusHtml;
            const statusTabela = (statusNode.textContent || statusNode.innerText || "").toLowerCase().trim();
            const statusMatch = !filtroAtual.status || (item.status && item.status.toLowerCase().includes(filtroAtual.status.toLowerCase())) || statusTabela.includes(filtroAtual.status.toLowerCase());


            const listaMatch = !filtroAtual.lista || item._fb_nomeLista === filtroAtual.lista;
            const projetoMatch = !filtroAtual.projeto || item._fb_tipoProjeto === filtroAtual.projeto;

            let prazoMatch = true;
            if (filtroAtual.prazo) {
                let prazoItemFormatado = '';
                if (item.prazoEntrega) {
                    if (typeof item.prazoEntrega === 'string' && item.prazoEntrega.includes('/')) {
                        const partes = item.prazoEntrega.split('/');
                        if (partes.length === 3) {
                            prazoItemFormatado = `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
                        }
                    } else {
                        try {
                             const dataObj = new Date(item.prazoEntrega.includes('-') ? `${item.prazoEntrega}T00:00:00` : parseInt(item.prazoEntrega));
                             if (!isNaN(dataObj.getTime())) {
                                prazoItemFormatado = dataObj.toISOString().split('T')[0];
                             }
                        } catch(e) { /* Ignora erro de conversão */ }
                    }
                }
                prazoMatch = prazoItemFormatado === filtroAtual.prazo;
            }

            return fornecedorMatch && clienteMatch && codigoMatch && statusMatch && listaMatch && projetoMatch && prazoMatch;
        }
    );
}


const atualizarCheckboxesVisiveis = () => {
    if (!tabelaItens) return;
    tabelaItens.rows({ page: 'current' }).nodes().to$().find('.item-checkbox').each(function() {
        const itemId = $(this).data('item-id');
        this.checked = itensSelecionadosParaRecebimento.some(item => String(item.codigo || item._fb_itemKey) === String(itemId));
    });

    const checkTodosHeader = document.getElementById('checkTodosHeaderDt');
    if (checkTodosHeader) {
        const totalRowsNaPagina = tabelaItens.rows({ page: 'current' }).count();
        let selecionadosNaPagina = 0;
        tabelaItens.rows({ page: 'current' }).nodes().to$().find('.item-checkbox:checked').each(() => selecionadosNaPagina++);

        if (totalRowsNaPagina === 0) {
            checkTodosHeader.checked = false;
            checkTodosHeader.indeterminate = false;
        } else {
            checkTodosHeader.checked = selecionadosNaPagina === totalRowsNaPagina;
            checkTodosHeader.indeterminate = selecionadosNaPagina > 0 && selecionadosNaPagina < totalRowsNaPagina;
        }
    }
    atualizarContadorSelecionados();
};

const atualizarContadorSelecionados = () => {
    const contadorElement = document.getElementById('contadorSelecionados');
    if (contadorElement) {
        contadorElement.textContent = itensSelecionadosParaRecebimento.length;
    }
    const btnReceber = document.getElementById('btnReceberSelecionados');
    if(btnReceber) {
        btnReceber.disabled = itensSelecionadosParaRecebimento.length === 0;
    }
};


const toggleColunasVisibilidadeManual = () => {
    colunasOcultas = !colunasOcultas;
    const btnToggleColunas = document.getElementById('btnToggleColunas');
    if (btnToggleColunas) {
        btnToggleColunas.textContent = colunasOcultas ? '+' : '-';
        btnToggleColunas.title = colunasOcultas ? 'Mostrar Detalhes' : 'Ocultar Detalhes';
    }
    
    if (tabelaItens) {
        [4, 5, 6, 7].forEach(colIndex => { // Indices das colunas adicionais
            const column = tabelaItens.column(colIndex);
            if (column) column.visible(!colunasOcultas);
        });
        console.log(`Visibilidade colunas adicionais alterada para: ${!colunasOcultas}`);
    }
};
