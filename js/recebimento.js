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
let filtroAtual = { fornecedor: '', cliente: '', codigo: '', status: '' };

document.addEventListener('DOMContentLoaded', function() {
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
        carregarItensComprados();
        configurarEventListeners();
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

    const btnFiltrados = document.getElementById('btnFiltrados');
    if (btnFiltrados) btnFiltrados.addEventListener('click', selecionarItensFiltradosNaTabela);

    $("#filtroFornecedor").on("change", function() { filtroAtual.fornecedor = this.value; aplicarFiltrosNaTabela(); });
    $("#filtroCliente").on("change", function() { filtroAtual.cliente = this.value; aplicarFiltrosNaTabela(); });
    $("#filtroCodigo").on("input", function() { filtroAtual.codigo = this.value; aplicarFiltrosNaTabela(); });
    $("#filtroStatus").on("change", function() { filtroAtual.status = this.value; aplicarFiltrosNaTabela(); });

    const btnLimparFiltros = document.getElementById('btnLimparFiltros');
    if (btnLimparFiltros) btnLimparFiltros.addEventListener('click', limparFiltrosDaTabela);

    // Listeners do calendário
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
    carregarEventosCalendario(); // Recarrega todos os eventos baseados em 'todosItens'
    
    // Filtra os eventos diretamente na instância do calendário
    const eventosAtuais = instance.getEvents();
    eventosAtuais.forEach(evento => {
        if (fornecedor && evento.extendedProps.fornecedor !== fornecedor) {
            evento.remove();
        }
    });
}

function carregarItensComprados() {
    console.log('Iniciando: carregarItensComprados');
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
                                            // Condição para item aparecer na tabela de recebimento
                                            if (itemOriginal && itemOriginal.status && typeof itemOriginal.status === 'string' &&
                                                (itemOriginal.status.includes('Comprado') || itemOriginal.status.includes('Empenho/Comprado') || itemOriginal.status === 'Pendente' || itemOriginal.status === 'Incorreto') && // Inclui Pendente e Incorreto para permitir correção
                                                (parseFloat(itemOriginal.necessidade) > 0 || parseFloat(itemOriginal.quantidadeComprada) > 0) // Deve ter necessidade ou já ter sido comprado
                                            ) {
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
        return [
            checkboxHtml, item.codigo || '-', item.descricao || '-', '',
            item.altura || '-', item.largura || '-', item.medida || '-', item.cor || '-',
            item.necessidade || '0', item.clienteNome || '-', prazoEntregaFormatado,
            item.fornecedor || '-', item._fb_nomeLista || '-', item._fb_tipoProjeto || '-', statusHtml
        ];
    });

    tabelaItens = $('#tabelaItens').DataTable({
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
            { className: "align-middle text-center", targets: [0, 3] },
            { className: "align-middle", targets: '_all' }
        ],
        order: [[10, 'asc']],
        drawCallback: function() {
            const checkTodosDt = document.getElementById('checkTodosHeaderDt');
            if (checkTodosDt) {
                 $(checkTodosDt).off('click').on('click', function() {
                    selecionarTodosNaTabela(this.checked);
                 });
            }
            atualizarSelecaoDeItensParaRecebimento();
        },
        destroy: true
    });
    console.log('DataTables inicializada/atualizada.');
}

function toggleColunasVisibilidadeManual() {
    if (!tabelaItens) {
        console.warn("Tabela de itens não inicializada para toggleColunas.");
        return;
    }
    colunasOcultas = !colunasOcultas;
    const btnToggle = document.getElementById('btnToggleColunas');
    if (btnToggle) btnToggle.textContent = colunasOcultas ? '+' : '-';
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

    updates[`status`] = novoStatusDoItem;
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
        calendarioInstance = new FullCalendar.Calendar(calendarEl, {...commonOptions, initialView: 'timeGridWeek', headerToolbar: { left: 'prev,next today', center: 'title', right: '' }});
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
        if (item.prazoEntrega && item.fornecedor && item.status && 
            (item.status.includes('Comprado') || item.status === 'Pendente' || item.status.includes('Empenho/Comprado')) &&
            (parseFloat(item.necessidade) > 0 || parseFloat(item.quantidadeComprada) > 0) // Deve ter necessidade ou já ter sido comprado para aparecer no calendário
        ) {
            let dataEntrega;
            if (typeof item.prazoEntrega === 'string' && item.prazoEntrega.includes('/')) {
                const partes = item.prazoEntrega.split('/');
                dataEntrega = new Date(partes[2], partes[1] - 1, partes[0]);
            } else {
                const dateValue = item.prazoEntrega.includes('-') ? item.prazoEntrega + "T00:00:00" : parseInt(item.prazoEntrega);
                dataEntrega = new Date(dateValue);
            }
            if (isNaN(dataEntrega.getTime())) return;
            const dataFormatada = dataEntrega.toISOString().split('T')[0];
            const chaveEvento = `${item.fornecedor}_${dataFormatada}`;
            if (!eventosAgrupados[chaveEvento]) {
                eventosAgrupados[chaveEvento] = { fornecedor: item.fornecedor, data: dataFormatada, itens: [], quantidadeTotal: 0 };
            }
            eventosAgrupados[chaveEvento].itens.push(item);
            // Usa a necessidade ou a quantidade comprada para o total do evento, o que for maior se necessidade for 0 mas comprado > 0
            eventosAgrupados[chaveEvento].quantidadeTotal += parseFloat(item.necessidade) > 0 ? parseFloat(item.necessidade) : (parseFloat(item.quantidadeComprada) || 0) ;
        }
    });

    if (calendarioInstance) calendarioInstance.removeAllEvents();
    if (calendarioCompletoInstance) calendarioCompletoInstance.removeAllEvents();
    
    let countEventos = 0;
    Object.values(eventosAgrupados).forEach(agrupamento => {
        if(agrupamento.quantidadeTotal <= 0) return; // Não adiciona evento se a quantidade for zero

        const evento = {
            title: `${agrupamento.fornecedor} (${agrupamento.quantidadeTotal} und)`,
            start: `${agrupamento.data}T10:00:00`, end: `${agrupamento.data}T11:00:00`,
            backgroundColor: gerarCorParaFornecedor(agrupamento.fornecedor), borderColor: gerarCorParaFornecedor(agrupamento.fornecedor),
            extendedProps: { fornecedor: agrupamento.fornecedor, quantidade: agrupamento.quantidadeTotal, itens: agrupamento.itens, data: agrupamento.data }
        };
        if (calendarioInstance) calendarioInstance.addEvent(evento);
        if (calendarioCompletoInstance) calendarioCompletoInstance.addEvent(evento);
        countEventos++;
    });
    console.log(`Adicionados ${countEventos} eventos aos calendários.`);
}

function mostrarDetalhesEvento(eventoFullCalendar) {
    const { fornecedor, data, itens } = eventoFullCalendar.extendedProps;
    const dataObj = new Date(data + "T00:00:00Z");
    const dataFormatada = dataObj.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    $('#detalhesEntregaFornecedor').text(`${fornecedor} - ${dataFormatada}`);
    const tabelaBody = $('#tabelaItensDetalhes').empty();
    itens.forEach(item => {
        tabelaBody.append(`<tr><td>${item.codigo || '-'}</td><td>${item.descricao || '-'}</td><td>${item.necessidade || '0'}</td><td>${item.clienteNome || '-'}</td></tr>`);
    });
    const modalEl = document.getElementById('modalDetalhesEvento');
    const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
    modal.show();
}

function preencherSelectFornecedores() {
    const $selects = $('#filtroFornecedor, #filtroFornecedorCalendario');
    $selects.empty().append('<option value="">Todos os fornecedores</option>');
    Array.from(fornecedores).sort().forEach(f => $selects.append(`<option value="${f}">${f}</option>`));
    if ($.fn.select2) $selects.trigger('change.select2');
}

function preencherSelectClientes() {
    const $select = $('#filtroCliente');
    $select.empty().append('<option value="">Todos os clientes</option>');
    Array.from(clientes).sort().forEach(c => $select.append(`<option value="${c}">${c}</option>`));
    if ($.fn.select2) $select.trigger('change.select2');
}

function atualizarDashboardResumo() {
    let hoje = 0, pendentes = 0, recebidos = 0, incorretos = 0;
    const hojeDate = new Date();
    hojeDate.setHours(0,0,0,0);

    todosItens.forEach(item => {
        if (item.status) {
            if (item.status === 'Concluído') recebidos++;
            else if (item.status === 'Incorreto') incorretos++;
            else if (item.status.includes('Comprado') || item.status === 'Pendente' || item.status.includes('Empenho/Comprado')) {
                pendentes++;
                if (item.prazoEntrega) {
                    let prazoDate;
                    if (typeof item.prazoEntrega === 'string' && item.prazoEntrega.includes('/')) {
                        const p = item.prazoEntrega.split('/');
                        prazoDate = new Date(p[2], p[1]-1, p[0]);
                    } else {
                         const dateValue = item.prazoEntrega.includes('-') ? item.prazoEntrega + "T00:00:00" : parseInt(item.prazoEntrega);
                         prazoDate = new Date(dateValue);
                    }
                    if (!isNaN(prazoDate.getTime())) {
                        prazoDate.setHours(0,0,0,0);
                        if (prazoDate.getTime() === hojeDate.getTime()) hoje++;
                    }
                }
            }
        }
    });
    $('#recebimentosHoje').text(hoje);
    $('#recebimentosPendentes').text(pendentes);
    $('#recebimentosRecebidos').text(recebidos);
    $('#recebimentosIncorretos').text(incorretos);
}

function exportarDadosTabela(tipo) {
    console.warn(`Exportar para ${tipo} - requer DataTables Buttons.`);
    mostrarNotificacao(`Exportar para ${tipo} requer configuração adicional.`, 'info');
}

function gerarCorParaFornecedor(fornecedor) {
    if (!fornecedor) return '#808080';
    const cores = ['#4285F4', '#EA4335', '#FBBC05', '#34A853', '#FF6D01', '#46BDC6', '#7B1FA2'];
    let hash = 0;
    for (let i = 0; i < fornecedor.length; i++) hash = fornecedor.charCodeAt(i) + ((hash << 5) - hash);
    return cores[Math.abs(hash) % cores.length];
}

function objetoVazio(obj) {
    return !obj || (typeof obj === 'object' && Object.keys(obj).length === 0);
}

// A função mostrarNotificacao já está em global.js, então não precisa ser redeclarada aqui
// Se global.js não estiver sendo carregado ANTES deste script, você precisaria dela aqui ou garantir a ordem de carga.
// Assumindo que global.js é carregado primeiro.
