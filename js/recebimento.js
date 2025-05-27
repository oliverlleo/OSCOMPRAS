/**
 * recebimento.js
 * 
 * Lógica principal da tela de Recebimento
 * Este arquivo contém a lógica JavaScript principal para a tela de Recebimento
 * do Sistema de Controle de Compras e Recebimento
 */

// Variáveis globais do módulo
let itensSelecionados = [];
let colunasOcultas = true;
let tabelaItens = null;
let calendarioInstance = null;
let calendarioCompletoInstance = null;
let todosItens = [];
let fornecedores = new Set();
let clientes = new Set();
let filtroAtual = {
    fornecedor: '',
    cliente: '',
    codigo: '',
    status: ''
};

// Inicialização quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM carregado na página de recebimento');
    
    // Inicializar componentes básicos
    inicializarComponentesBasicos();
    
    // Verificar se o Firebase está disponível
    if (typeof firebase !== 'undefined') {
        console.log('Firebase disponível, iniciando carregamento de dados...');
        
        // Inicializar componentes que dependem do Firebase
        inicializarCalendario();
        carregarItensComprados();
        
        // Configurar event listeners
        configurarEventListeners();
    } else {
        console.error('Firebase não está disponível!');
        alert('Erro ao conectar ao banco de dados. Por favor, recarregue a página.');
    }
});

/**
 * Inicializa os componentes básicos da página
 * Configura elementos que não dependem do carregamento de dados
 */
function inicializarComponentesBasicos() {
    console.log('Inicializando componentes básicos...');
    
    // Inicializar Select2 para os filtros
    if ($.fn.select2) {
        $('.select2').select2({
            theme: 'bootstrap-5',
            width: '100%'
        });
    }
    
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
    
    // Inicializar a data de recebimento com a data atual
    const inputDataRecebimento = document.getElementById('inputDataRecebimento');
    if (inputDataRecebimento) {
        const hoje = new Date();
        const dataFormatada = hoje.toISOString().split('T')[0];
        inputDataRecebimento.value = dataFormatada;
    }
}

/**
 * Configura os event listeners da página
 */
function configurarEventListeners() {
    console.log('Configurando event listeners...');
    
    // Event listener para o botão de toggle de colunas
    const btnToggleColunas = document.getElementById('btnToggleColunas');
    if (btnToggleColunas) {
        btnToggleColunas.addEventListener('click', function() {
            toggleColunas();
        });
    }
    
    // Event listener para o checkbox "Todos"
    const checkTodos = document.getElementById('checkTodos');
    if (checkTodos) {
        checkTodos.addEventListener('change', function() {
            selecionarTodos(this.checked);
        });
    }
    
    // Event listener para o botão de receber selecionados
    const btnReceberSelecionados = document.getElementById('btnReceberSelecionados');
    if (btnReceberSelecionados) {
        btnReceberSelecionados.addEventListener('click', function() {
            abrirModalRecebimento();
        });
    }
    
    // Event listener para o botão de confirmar recebimento
    const btnConfirmarRecebimento = document.getElementById('btnConfirmarRecebimento');
    if (btnConfirmarRecebimento) {
        btnConfirmarRecebimento.addEventListener('click', function() {
            confirmarRecebimento();
        });
    }
    
    // Event listener para o checkbox de quantidade personalizada
    const checkQuantidadePersonalizada = document.getElementById('checkQuantidadePersonalizada');
    if (checkQuantidadePersonalizada) {
        checkQuantidadePersonalizada.addEventListener('change', function() {
            toggleQuantidadePersonalizada(this.checked);
        });
    }
    
    // Event listeners para os botões de seleção
    const btnTodos = document.getElementById('btnTodos');
    if (btnTodos) {
        btnTodos.addEventListener('click', function() {
            selecionarTodos(true);
        });
    }
    
    const btnNenhum = document.getElementById('btnNenhum');
    if (btnNenhum) {
        btnNenhum.addEventListener('click', function() {
            selecionarTodos(false);
        });
    }
    
    const btnFiltrados = document.getElementById('btnFiltrados');
    if (btnFiltrados) {
        btnFiltrados.addEventListener('click', function() {
            selecionarFiltrados();
        });
    }
    
    // Event listeners para os filtros
    const filtroFornecedor = document.getElementById('filtroFornecedor');
    if (filtroFornecedor) {
        filtroFornecedor.addEventListener('change', function() {
            filtroAtual.fornecedor = this.value;
            aplicarFiltros();
        });
    }
    
    const filtroCliente = document.getElementById('filtroCliente');
    if (filtroCliente) {
        filtroCliente.addEventListener('change', function() {
            filtroAtual.cliente = this.value;
            aplicarFiltros();
        });
    }
    
    const filtroCodigo = document.getElementById('filtroCodigo');
    if (filtroCodigo) {
        filtroCodigo.addEventListener('input', function() {
            filtroAtual.codigo = this.value;
            aplicarFiltros();
        });
    }
    
    const filtroStatus = document.getElementById('filtroStatus');
    if (filtroStatus) {
        filtroStatus.addEventListener('change', function() {
            filtroAtual.status = this.value;
            aplicarFiltros();
        });
    }
    
    // Event listener para limpar filtros
    const btnLimparFiltros = document.getElementById('btnLimparFiltros');
    if (btnLimparFiltros) {
        btnLimparFiltros.addEventListener('click', function() {
            limparFiltros();
        });
    }
    
    // Event listeners para visualização do calendário
    const btnVisualizacaoSemanal = document.getElementById('btnVisualizacaoSemanal');
    if (btnVisualizacaoSemanal) {
        btnVisualizacaoSemanal.addEventListener('click', function() {
            alterarVisualizacaoCalendario('timeGridWeek');
            toggleBotaoVisualizacao('btnVisualizacaoSemanal');
        });
    }
    
    const btnVisualizacaoMensal = document.getElementById('btnVisualizacaoMensal');
    if (btnVisualizacaoMensal) {
        btnVisualizacaoMensal.addEventListener('click', function() {
            alterarVisualizacaoCalendario('dayGridMonth');
            toggleBotaoVisualizacao('btnVisualizacaoMensal');
        });
    }
    
    // Event listeners para visualização do calendário completo
    const btnCalendarioMes = document.getElementById('btnCalendarioMes');
    if (btnCalendarioMes) {
        btnCalendarioMes.addEventListener('click', function() {
            alterarVisualizacaoCalendarioCompleto('dayGridMonth');
            toggleBotaoCalendarioCompleto('btnCalendarioMes');
        });
    }
    
    const btnCalendarioSemana = document.getElementById('btnCalendarioSemana');
    if (btnCalendarioSemana) {
        btnCalendarioSemana.addEventListener('click', function() {
            alterarVisualizacaoCalendarioCompleto('timeGridWeek');
            toggleBotaoCalendarioCompleto('btnCalendarioSemana');
        });
    }
    
    const btnCalendarioDia = document.getElementById('btnCalendarioDia');
    if (btnCalendarioDia) {
        btnCalendarioDia.addEventListener('click', function() {
            alterarVisualizacaoCalendarioCompleto('timeGridDay');
            toggleBotaoCalendarioCompleto('btnCalendarioDia');
        });
    }
    
    // Event listener para filtro de fornecedor no calendário completo
    const filtroFornecedorCalendario = document.getElementById('filtroFornecedorCalendario');
    if (filtroFornecedorCalendario) {
        filtroFornecedorCalendario.addEventListener('change', function() {
            atualizarEventosCalendarioCompleto(this.value);
        });
    }
    
    // Event listeners para exportação
    const btnCopy = document.getElementById('btnCopy');
    if (btnCopy) {
        btnCopy.addEventListener('click', function() {
            exportarDados('copy');
        });
    }
    
    const btnExcel = document.getElementById('btnExcel');
    if (btnExcel) {
        btnExcel.addEventListener('click', function() {
            exportarDados('excel');
        });
    }
    
    const btnPDF = document.getElementById('btnPDF');
    if (btnPDF) {
        btnPDF.addEventListener('click', function() {
            exportarDados('pdf');
        });
    }
    
    const btnPrint = document.getElementById('btnPrint');
    if (btnPrint) {
        btnPrint.addEventListener('click', function() {
            exportarDados('print');
        });
    }
    
    console.log('Event listeners configurados com sucesso');
}

/**
 * Inicializa o calendário de recebimentos
 */
function inicializarCalendario() {
    console.log('Inicializando calendário...');
    
    const calendarEl = document.getElementById('calendarioRecebimento');
    if (!calendarEl) {
        console.error('Elemento do calendário não encontrado!');
        return;
    }
    
    // Verificar se o FullCalendar está disponível
    if (typeof FullCalendar === 'undefined') {
        console.error('FullCalendar não está disponível!');
        return;
    }
    
    // Inicializar o calendário com FullCalendar
    calendarioInstance = new FullCalendar.Calendar(calendarEl, {
        initialView: 'timeGridWeek',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: ''
        },
        locale: 'pt-br',
        height: 'auto',
        allDaySlot: false,
        slotMinTime: '08:00:00',
        slotMaxTime: '18:00:00',
        businessHours: {
            daysOfWeek: [1, 2, 3, 4, 5], // Segunda a sexta
            startTime: '08:00',
            endTime: '18:00',
        },
        eventClick: function(info) {
            mostrarDetalhesEvento(info.event);
        },
        eventDidMount: function(info) {
            // Adicionar tooltip
            if (typeof $ !== 'undefined' && $.fn.tooltip) {
                $(info.el).tooltip({
                    title: info.event.title,
                    placement: 'top',
                    trigger: 'hover',
                    container: 'body'
                });
            }
        }
    });
    
    calendarioInstance.render();
    
    // Inicializar o calendário completo (modal)
    const calendarCompletoEl = document.getElementById('calendarioCompleto');
    if (calendarCompletoEl) {
        calendarioCompletoInstance = new FullCalendar.Calendar(calendarCompletoEl, {
            initialView: 'dayGridMonth',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: ''
            },
            locale: 'pt-br',
            height: 'auto',
            eventClick: function(info) {
                mostrarDetalhesEvento(info.event);
            },
            eventDidMount: function(info) {
                // Adicionar tooltip
                if (typeof $ !== 'undefined' && $.fn.tooltip) {
                    $(info.el).tooltip({
                        title: info.event.title,
                        placement: 'top',
                        trigger: 'hover',
                        container: 'body'
                    });
                }
            }
        });
        
        calendarioCompletoInstance.render();
    }
    
    // Carregar eventos do calendário
    carregarEventosCalendario();
}

/**
 * Carrega os eventos do calendário a partir dos itens comprados
 */
function carregarEventosCalendario() {
    console.log('Carregando eventos do calendário...');
    
    // Limpar eventos existentes
    if (calendarioInstance) {
        calendarioInstance.removeAllEvents();
    }
    
    if (calendarioCompletoInstance) {
        calendarioCompletoInstance.removeAllEvents();
    }
    
    // Primeiro, buscar todos os clientes para obter seus IDs e nomes
    firebase.database().ref('clientes').once('value')
        .then((snapshotClientes) => {
            console.log('Dados de clientes recebidos do Firebase');
            const clientes = snapshotClientes.val();
            
            if (!clientes) {
                console.warn('Nenhum cliente encontrado no Firebase');
                return;
            }
            
            console.log('Número de clientes encontrados:', Object.keys(clientes).length);
            
            // Agrupar itens por fornecedor e data
            const eventosPorFornecedorData = {};
            
            // Agora, buscar todos os projetos
            firebase.database().ref('projetos').once('value')
                .then((snapshotProjetos) => {
                    console.log('Dados de projetos recebidos do Firebase');
                    const projetos = snapshotProjetos.val();
                    
                    if (!projetos) {
                        console.warn('Nenhum projeto encontrado no Firebase');
                        return;
                    }
                    
                    console.log('Número de projetos encontrados:', Object.keys(projetos).length);
                    
                    // Para cada cliente, buscar seus projetos pelo ID
                    Object.keys(clientes).forEach(clienteId => {
                        const cliente = clientes[clienteId];
                        console.log(`Processando cliente: ${cliente.nome || clienteId}`);
                        
                        // Verificar se existe um projeto com o mesmo ID do cliente
                        if (projetos[clienteId]) {
                            console.log(`Encontrado projeto para cliente ${clienteId}`);
                            const projetosDoCliente = projetos[clienteId];
                            
                            // Para cada projeto do cliente
                            Object.keys(projetosDoCliente).forEach(projetoNome => {
                                console.log(`Processando projeto: ${projetoNome}`);
                                const projeto = projetosDoCliente[projetoNome];
                                
                                // Verificar se o projeto tem listas
                                if (projeto.listas) {
                                    console.log(`Projeto ${projetoNome} tem listas`);
                                    
                                    // Para cada lista, buscar itens (exceto lista de tratamento)
                                    Object.keys(projeto.listas).forEach(listaId => {
                                        // Pular lista de tratamento
                                        if (listaId.toLowerCase() === 'tratamento') {
                                            console.log(`Pulando lista de tratamento em ${projetoNome}`);
                                            return;
                                        }
                                        
                                        console.log(`Processando lista: ${listaId}`);
                                        const lista = projeto.listas[listaId];
                                        
                                        // Verificar se a lista é um array
                                        if (Array.isArray(lista)) {
                                            console.log(`Lista ${listaId} é um array com ${lista.length} itens`);
                                            
                                            // Filtrar itens comprados com necessidade maior que zero
                                            lista.forEach((item, index) => {
                                                if (!item) {
                                                    console.log(`Item ${index} é nulo ou indefinido`);
                                                    return;
                                                }
                                                
                                                console.log(`Verificando item ${index}:`, item.codigo, 'Status:', item.status, 'Necessidade:', item.necessidade);
                                                
                                                // Verificar se o item atende aos critérios
                                                if (
                                                    item.status && 
                                                    item.status.includes('Comprado') && 
                                                    item.prazoEntrega &&
                                                    item.fornecedor &&
                                                    item.necessidade && 
                                                    item.necessidade > 0
                                                ) {
                                                    console.log(`Item ${item.codigo} atende aos critérios para o calendário`);
                                                    
                                                    // Converter prazo de entrega para data
                                                    let dataEntrega;
                                                    try {
                                                        // Verificar formato da data (DD/MM/YYYY ou timestamp)
                                                        if (typeof item.prazoEntrega === 'string' && item.prazoEntrega.includes('/')) {
                                                            const partes = item.prazoEntrega.split('/');
                                                            dataEntrega = new Date(partes[2], partes[1] - 1, partes[0]);
                                                        } else {
                                                            dataEntrega = new Date(item.prazoEntrega);
                                                        }
                                                        
                                                        // Verificar se a data é válida
                                                        if (isNaN(dataEntrega.getTime())) {
                                                            console.warn('Data inválida para item:', item);
                                                            return;
                                                        }
                                                        
                                                        // Formatar a data como string YYYY-MM-DD
                                                        const dataFormatada = dataEntrega.toISOString().split('T')[0];
                                                        
                                                        // Criar chave para agrupar por fornecedor e data
                                                        const chave = `${item.fornecedor}_${dataFormatada}`;
                                                        
                                                        // Inicializar o grupo se não existir
                                                        if (!eventosPorFornecedorData[chave]) {
                                                            eventosPorFornecedorData[chave] = {
                                                                fornecedor: item.fornecedor,
                                                                data: dataFormatada,
                                                                itens: [],
                                                                quantidade: 0
                                                            };
                                                        }
                                                        
                                                        // Adicionar informações do cliente e projeto ao item
                                                        const itemComReferencias = {
                                                            ...item,
                                                            clienteId: clienteId,
                                                            clienteNome: cliente.nome,
                                                            projetoId: projetoNome,
                                                            projetoNome: projetoNome,
                                                            listaId: listaId
                                                        };
                                                        
                                                        // Adicionar item ao grupo
                                                        eventosPorFornecedorData[chave].itens.push(itemComReferencias);
                                                        eventosPorFornecedorData[chave].quantidade += item.necessidade || 1;
                                                        
                                                        console.log(`Item adicionado ao evento ${chave}`);
                                                    } catch (error) {
                                                        console.error('Erro ao processar data de entrega:', error, item);
                                                    }
                                                } else {
                                                    console.log(`Item ${item.codigo || index} não atende aos critérios para o calendário`);
                                                }
                                            });
                                        } else {
                                            console.log(`Lista ${listaId} não é um array`);
                                        }
                                    });
                                } else {
                                    console.log(`Projeto ${projetoNome} não tem listas`);
                                }
                            });
                        } else {
                            console.log(`Não foi encontrado projeto para cliente ${clienteId}`);
                        }
                    });
                    
                    console.log(`Total de eventos agrupados: ${Object.keys(eventosPorFornecedorData).length}`);
                    
                    // Criar eventos para o calendário
                    Object.values(eventosPorFornecedorData).forEach(evento => {
                        // Criar evento para o calendário principal
                        const eventoCalendario = {
                            title: `${evento.fornecedor} (${evento.quantidade})`,
                            start: `${evento.data}T10:00:00`, // Horário arbitrário para visualização
                            end: `${evento.data}T11:00:00`,
                            backgroundColor: gerarCorParaFornecedor(evento.fornecedor),
                            borderColor: gerarCorParaFornecedor(evento.fornecedor),
                            extendedProps: {
                                fornecedor: evento.fornecedor,
                                quantidade: evento.quantidade,
                                itens: evento.itens,
                                data: evento.data
                            }
                        };
                        
                        // Adicionar ao calendário principal
                        if (calendarioInstance) {
                            calendarioInstance.addEvent(eventoCalendario);
                        }
                        
                        // Adicionar ao calendário completo
                        if (calendarioCompletoInstance) {
                            calendarioCompletoInstance.addEvent(eventoCalendario);
                        }
                        
                        console.log(`Evento adicionado ao calendário: ${evento.fornecedor} em ${evento.data}`);
                    });
                    
                    console.log('Eventos do calendário carregados com sucesso');
                })
                .catch((error) => {
                    console.error('Erro ao carregar projetos:', error);
                });
        })
        .catch((error) => {
            console.error('Erro ao carregar eventos do calendário:', error);
        });
}

/**
 * Carrega os itens comprados para a tabela
 */
function carregarItensComprados() {
    console.log('Carregando itens comprados...');
    
    // Limpar array de todos os itens
    todosItens = [];
    fornecedores.clear();
    clientes.clear();
    
    // Primeiro, buscar todos os clientes para obter seus IDs e nomes
    firebase.database().ref('clientes').once('value')
        .then((snapshotClientes) => {
            console.log('Dados de clientes recebidos do Firebase');
            const clientesData = snapshotClientes.val();
            
            if (!clientesData) {
                console.warn('Nenhum cliente encontrado no Firebase');
                inicializarTabelaItens([]);
                return;
            }
            
            console.log('Número de clientes encontrados:', Object.keys(clientesData).length);
            
            // Agora, buscar todos os projetos
            firebase.database().ref('projetos').once('value')
                .then((snapshotProjetos) => {
                    console.log('Dados de projetos recebidos do Firebase');
                    const projetosData = snapshotProjetos.val();
                    
                    if (!projetosData) {
                        console.warn('Nenhum projeto encontrado no Firebase');
                        inicializarTabelaItens([]);
                        return;
                    }
                    
                    console.log('Número de projetos encontrados:', Object.keys(projetosData).length);
                    
                    // Para cada cliente, buscar seus projetos pelo ID
                    Object.keys(clientesData).forEach(clienteId => {
                        const cliente = clientesData[clienteId];
                        console.log(`Processando cliente: ${cliente.nome || clienteId}`);
                        
                        // Verificar se existe um projeto com o mesmo ID do cliente
                        if (projetosData[clienteId]) {
                            console.log(`Encontrado projeto para cliente ${clienteId}`);
                            const projetosDoCliente = projetosData[clienteId];
                            
                            // Para cada projeto do cliente
                            Object.keys(projetosDoCliente).forEach(projetoNome => {
                                console.log(`Processando projeto: ${projetoNome}`);
                                const projeto = projetosDoCliente[projetoNome];
                                
                                // Verificar se o projeto tem listas
                                if (projeto.listas) {
                                    console.log(`Projeto ${projetoNome} tem listas`);
                                    
                                    // Para cada lista, buscar itens (exceto lista de tratamento)
                                    Object.keys(projeto.listas).forEach(listaId => {
                                        // Pular lista de tratamento
                                        if (listaId.toLowerCase() === 'tratamento') {
                                            console.log(`Pulando lista de tratamento em ${projetoNome}`);
                                            return;
                                        }
                                        
                                        console.log(`Processando lista: ${listaId}`);
                                        const lista = projeto.listas[listaId];
                                        
                                        // Verificar se a lista é um array
                                        if (Array.isArray(lista)) {
                                            console.log(`Lista ${listaId} é um array com ${lista.length} itens`);
                                            
                                            // Filtrar itens comprados com necessidade maior que zero
                                            lista.forEach((item, index) => {
                                                if (!item) {
                                                    console.log(`Item ${index} é nulo ou indefinido`);
                                                    return;
                                                }
                                                
                                                console.log(`Verificando item ${index}:`, item.codigo, 'Status:', item.status, 'Necessidade:', item.necessidade);
                                                
                                                // Verificar se o item atende aos critérios
                                                if (
                                                    item.status && 
                                                    item.status.includes('Comprado') &&
                                                    item.necessidade && 
                                                    item.necessidade > 0
                                                ) {
                                                    console.log(`Item ${item.codigo} atende aos critérios para a tabela`);
                                                    
                                                    // Adicionar informações do cliente e projeto ao item
                                                    const itemComReferencias = {
                                                        ...item,
                                                        clienteId: clienteId,
                                                        clienteNome: cliente.nome,
                                                        projetoId: projetoNome,
                                                        projetoNome: projetoNome,
                                                        listaId: listaId
                                                    };
                                                    
                                                    // Adicionar ao array de todos os itens
                                                    todosItens.push(itemComReferencias);
                                                    
                                                    // Adicionar fornecedor à lista de fornecedores
                                                    if (item.fornecedor) {
                                                        fornecedores.add(item.fornecedor);
                                                    }
                                                    
                                                    // Adicionar cliente à lista de clientes
                                                    clientes.add(cliente.nome);
                                                    
                                                    console.log(`Item adicionado à lista de itens para a tabela`);
                                                } else {
                                                    console.log(`Item ${item.codigo || index} não atende aos critérios para a tabela`);
                                                }
                                            });
                                        } else {
                                            console.log(`Lista ${listaId} não é um array`);
                                        }
                                    });
                                } else {
                                    console.log(`Projeto ${projetoNome} não tem listas`);
                                }
                            });
                        } else {
                            console.log(`Não foi encontrado projeto para cliente ${clienteId}`);
                        }
                    });
                    
                    console.log(`Total de itens encontrados: ${todosItens.length}`);
                    
                    // Inicializar a tabela com os itens
                    inicializarTabelaItens(todosItens);
                    
                    // Preencher selects de fornecedores
                    preencherSelectFornecedores();
                    
                    // Preencher select de clientes
                    preencherSelectClientes();
                    
                    console.log('Itens comprados carregados com sucesso:', todosItens.length);
                })
                .catch((error) => {
                    console.error('Erro ao carregar projetos:', error);
                    inicializarTabelaItens([]);
                });
        })
        .catch((error) => {
            console.error('Erro ao carregar itens comprados:', error);
            inicializarTabelaItens([]);
        });
}

/**
 * Inicializa a tabela de itens com DataTables
 * @param {Array} itens - Array de itens para exibir na tabela
 */
function inicializarTabelaItens(itens) {
    console.log('Inicializando tabela de itens com', itens.length, 'itens');
    
    const tabelaItensElement = document.getElementById('tabelaItens');
    const nenhumItem = document.getElementById('nenhumItem');
    
    if (!tabelaItensElement) {
        console.error('Elemento da tabela de itens não encontrado!');
        return;
    }
    
    if (!nenhumItem) {
        console.error('Elemento nenhumItem não encontrado!');
        return;
    }
    
    // Verificar se há itens
    if (itens.length === 0) {
        console.log('Nenhum item para exibir na tabela');
        nenhumItem.classList.remove('d-none');
        
        // Destruir a tabela se já existir
        if ($.fn.DataTable && $.fn.DataTable.isDataTable('#tabelaItens')) {
            $('#tabelaItens').DataTable().destroy();
        }
        
        return;
    }
    
    nenhumItem.classList.add('d-none');
    
    // Preparar dados para DataTables
    const dataSet = itens.map(item => {
        // Checkbox para seleção
        const checkbox = `<div class="form-check">
            <input class="form-check-input item-checkbox" type="checkbox" data-item-id="${item.codigo}">
        </div>`;
        
        // Formatar prazo de entrega
        let prazoEntrega = 'Não definido';
        if (item.prazoEntrega) {
            // Verificar se já está no formato brasileiro
            if (typeof item.prazoEntrega === 'string' && item.prazoEntrega.includes('/')) {
                prazoEntrega = item.prazoEntrega;
            } else {
                const dataObj = new Date(item.prazoEntrega);
                prazoEntrega = dataObj.toLocaleDateString('pt-BR');
            }
        }
        
        // Formatar status com badge
        let statusHtml = '';
        if (item.status) {
            let badgeClass = 'bg-secondary';
            
            if (item.status.includes('Comprado')) {
                badgeClass = 'bg-primary';
            } else if (item.status === 'Pendente') {
                badgeClass = 'bg-warning text-dark';
            } else if (item.status === 'Concluído') {
                badgeClass = 'bg-success';
            } else if (item.status === 'Incorreto') {
                badgeClass = 'bg-danger';
            }
            
            statusHtml = `<span class="badge ${badgeClass}">${item.status}</span>`;
        }
        
        // Retornar array com os dados da linha
        return [
            checkbox,
            item.codigo || '',
            item.descricao || '',
            '', // Coluna para o botão de toggle
            item.altura || '',
            item.largura || '',
            item.medida || '',
            item.cor || '',
            item.necessidade || '', // Usar necessidade em vez de quantidade
            item.clienteNome || '',
            prazoEntrega,
            item.fornecedor || '',
            item.listaId || '',
            item.projetoNome || '',
            statusHtml
        ];
    });
    
    // Verificar se o DataTables está disponível
    if (!$.fn.DataTable) {
        console.error('DataTables não está disponível!');
        return;
    }
    
    // Destruir a tabela existente se já estiver inicializada
    if ($.fn.DataTable.isDataTable('#tabelaItens')) {
        $('#tabelaItens').DataTable().destroy();
    }
    
    // Inicializar o DataTable com os novos dados
    tabelaItens = $('#tabelaItens').DataTable({
        data: dataSet,
        columns: [
            { title: '<div class="form-check"><input class="form-check-input" type="checkbox" id="checkTodos"></div>' },
            { title: "Código" },
            { title: "Descrição" },
            { title: '<button id="btnToggleColunas" class="btn btn-sm btn-primary rounded-circle">+</button>', className: 'text-center toggle-column' },
            { title: "Altura", className: 'coluna-oculta' },
            { title: "Largura", className: 'coluna-oculta' },
            { title: "Medida", className: 'coluna-oculta' },
            { title: "Cor", className: 'coluna-oculta' },
            { title: "Qtd" },
            { title: "Cliente" },
            { title: "Prazo de Entrega" },
            { title: "Fornecedor" },
            { title: "Lista" },
            { title: "Projeto" },
            { title: "Status" }
        ],
        language: {
            url: "https://cdn.datatables.net/plug-ins/1.11.5/i18n/pt-BR.json"
        },
        responsive: true,
        columnDefs: [
            { className: "align-middle", targets: "_all" },
            { orderable: false, targets: [0, 3] },
            { visible: !colunasOcultas, targets: [4, 5, 6, 7] }
        ],
        order: [[10, 'asc']], // Ordenar por prazo de entrega (crescente)
        drawCallback: function() {
            // Adiciona animações aos elementos da tabela
            $('.dataTable tbody tr').addClass('animate__animated animate__fadeIn');
            
            // Verifica se há dados na tabela
            if (dataSet.length > 0) {
                nenhumItem.classList.add('d-none');
            } else {
                nenhumItem.classList.remove('d-none');
            }
            
            // Atualizar contadores de itens selecionados
            atualizarContadoresSelecao();
            
            // Configurar event listeners para checkboxes de itens
            $('.item-checkbox').on('change', function() {
                const itemId = $(this).data('item-id');
                if (this.checked) {
                    adicionarItemSelecionado(itemId);
                } else {
                    removerItemSelecionado(itemId);
                }
                atualizarContadoresSelecao();
            });
            
            // Reconfigurar o botão de toggle de colunas
            const btnToggleColunas = document.getElementById('btnToggleColunas');
            if (btnToggleColunas) {
                btnToggleColunas.textContent = colunasOcultas ? '+' : '-';
                btnToggleColunas.addEventListener('click', toggleColunas);
            }
            
            console.log('DataTable inicializado e renderizado com sucesso');
        }
    });
    
    // Configurar a pesquisa para funcionar com os filtros personalizados
    $('#tabelaItens_filter input').on('keyup', function() {
        tabelaItens.search(this.value).draw();
    });
}

/**
 * Preenche o select de fornecedores com os fornecedores disponíveis
 */
function preencherSelectFornecedores() {
    console.log('Preenchendo select de fornecedores...');
    
    const selectFornecedor = document.getElementById('filtroFornecedor');
    const selectFornecedorCalendario = document.getElementById('filtroFornecedorCalendario');
    
    if (!selectFornecedor || !selectFornecedorCalendario) {
        console.error('Elementos de select de fornecedores não encontrados!');
        return;
    }
    
    // Limpar os selects
    selectFornecedor.innerHTML = '<option value="">Todos os fornecedores</option>';
    selectFornecedorCalendario.innerHTML = '<option value="">Todos os fornecedores</option>';
    
    // Adicionar os fornecedores aos selects
    fornecedores.forEach(fornecedor => {
        const option = document.createElement('option');
        option.value = fornecedor;
        option.textContent = fornecedor;
        
        const optionCalendario = option.cloneNode(true);
        
        selectFornecedor.appendChild(option);
        selectFornecedorCalendario.appendChild(optionCalendario);
    });
    
    console.log('Select de fornecedores preenchido com', fornecedores.size, 'fornecedores');
}

/**
 * Preenche o select de clientes com os clientes disponíveis
 */
function preencherSelectClientes() {
    console.log('Preenchendo select de clientes...');
    
    const selectCliente = document.getElementById('filtroCliente');
    
    if (!selectCliente) {
        console.error('Elemento de select de clientes não encontrado!');
        return;
    }
    
    // Limpar o select
    selectCliente.innerHTML = '<option value="">Todos os clientes</option>';
    
    // Adicionar os clientes ao select
    clientes.forEach(cliente => {
        const option = document.createElement('option');
        option.value = cliente;
        option.textContent = cliente;
        
        selectCliente.appendChild(option);
    });
    
    console.log('Select de clientes preenchido com', clientes.size, 'clientes');
}

/**
 * Alterna a exibição das colunas ocultas
 */
function toggleColunas() {
    console.log('Alternando exibição de colunas ocultas...');
    
    colunasOcultas = !colunasOcultas;
    
    // Atualizar o texto do botão
    const btnToggleColunas = document.getElementById('btnToggleColunas');
    if (btnToggleColunas) {
        btnToggleColunas.textContent = colunasOcultas ? '+' : '-';
    }
    
    // Atualizar a visibilidade das colunas na tabela
    if (tabelaItens) {
        for (let i = 4; i <= 7; i++) {
            tabelaItens.column(i).visible(!colunasOcultas);
        }
    }
}

/**
 * Seleciona ou desmarca todos os itens da tabela
 * @param {boolean} checked - Se true, seleciona todos; se false, desmarca todos
 */
function selecionarTodos(checked) {
    console.log('Selecionando todos os itens:', checked);
    
    // Atualizar todos os checkboxes
    $('.item-checkbox').prop('checked', checked);
    
    // Atualizar a lista de itens selecionados
    itensSelecionados = [];
    
    if (checked) {
        // Adicionar todos os itens visíveis à lista de selecionados
        $('.item-checkbox:visible').each(function() {
            const itemId = $(this).data('item-id');
            adicionarItemSelecionado(itemId);
        });
    }
    
    // Atualizar contadores
    atualizarContadoresSelecao();
}

/**
 * Seleciona todos os itens filtrados atualmente
 */
function selecionarFiltrados() {
    console.log('Selecionando itens filtrados...');
    
    // Desmarcar todos primeiro
    $('.item-checkbox').prop('checked', false);
    
    // Selecionar apenas os itens visíveis
    $('.item-checkbox:visible').prop('checked', true);
    
    // Atualizar a lista de itens selecionados
    itensSelecionados = [];
    
    // Adicionar todos os itens visíveis à lista de selecionados
    $('.item-checkbox:visible').each(function() {
        const itemId = $(this).data('item-id');
        adicionarItemSelecionado(itemId);
    });
    
    // Atualizar contadores
    atualizarContadoresSelecao();
}

/**
 * Adiciona um item à lista de itens selecionados
 * @param {string} itemId - ID do item a ser adicionado
 */
function adicionarItemSelecionado(itemId) {
    if (!itensSelecionados.includes(itemId)) {
        itensSelecionados.push(itemId);
    }
}

/**
 * Remove um item da lista de itens selecionados
 * @param {string} itemId - ID do item a ser removido
 */
function removerItemSelecionado(itemId) {
    const index = itensSelecionados.indexOf(itemId);
    if (index !== -1) {
        itensSelecionados.splice(index, 1);
    }
}

/**
 * Atualiza os contadores de itens selecionados na interface
 */
function atualizarContadoresSelecao() {
    const contadores = document.querySelectorAll('.contador-selecionados');
    
    contadores.forEach(contador => {
        contador.textContent = itensSelecionados.length + ' selecionados';
    });
    
    // Habilitar ou desabilitar o botão de receber selecionados
    const btnReceberSelecionados = document.getElementById('btnReceberSelecionados');
    if (btnReceberSelecionados) {
        btnReceberSelecionados.disabled = itensSelecionados.length === 0;
    }
}

/**
 * Abre o modal de recebimento para os itens selecionados
 */
function abrirModalRecebimento() {
    console.log('Abrindo modal de recebimento para', itensSelecionados.length, 'itens');
    
    if (itensSelecionados.length === 0) {
        alert('Selecione pelo menos um item para receber.');
        return;
    }
    
    // Atualizar a quantidade de itens selecionados no modal
    const quantidadeItensSelecionados = document.getElementById('quantidadeItensSelecionados');
    if (quantidadeItensSelecionados) {
        quantidadeItensSelecionados.textContent = itensSelecionados.length;
    }
    
    // Resetar o formulário
    const formRecebimento = document.getElementById('formRecebimento');
    if (formRecebimento) {
        formRecebimento.reset();
    }
    
    // Ocultar a área de quantidade personalizada
    const areaQuantidadePersonalizada = document.getElementById('areaQuantidadePersonalizada');
    if (areaQuantidadePersonalizada) {
        areaQuantidadePersonalizada.classList.add('d-none');
    }
    
    // Definir a data atual como padrão
    const inputDataRecebimento = document.getElementById('inputDataRecebimento');
    if (inputDataRecebimento) {
        const hoje = new Date();
        const dataFormatada = hoje.toISOString().split('T')[0];
        inputDataRecebimento.value = dataFormatada;
    }
    
    // Exibir o modal
    const modalRecebimento = document.getElementById('modalRecebimento');
    if (modalRecebimento) {
        const modal = new bootstrap.Modal(modalRecebimento);
        modal.show();
    }
}

/**
 * Alterna a exibição da área de quantidade personalizada
 * @param {boolean} mostrar - Se true, mostra a área; se false, oculta
 */
function toggleQuantidadePersonalizada(mostrar) {
    console.log('Alternando exibição da área de quantidade personalizada:', mostrar);
    
    const areaQuantidadePersonalizada = document.getElementById('areaQuantidadePersonalizada');
    if (areaQuantidadePersonalizada) {
        if (mostrar) {
            areaQuantidadePersonalizada.classList.remove('d-none');
        } else {
            areaQuantidadePersonalizada.classList.add('d-none');
        }
    }
}

/**
 * Confirma o recebimento dos itens selecionados
 */
function confirmarRecebimento() {
    console.log('Confirmando recebimento de', itensSelecionados.length, 'itens');
    
    // Validar o formulário
    const inputDataRecebimento = document.getElementById('inputDataRecebimento');
    if (!inputDataRecebimento || !inputDataRecebimento.value) {
        alert('Por favor, informe a data de recebimento.');
        return;
    }
    
    const dataRecebimento = inputDataRecebimento.value;
    
    // Verificar se a quantidade personalizada está habilitada
    const checkQuantidadePersonalizada = document.getElementById('checkQuantidadePersonalizada');
    let quantidade = null;
    
    if (checkQuantidadePersonalizada && checkQuantidadePersonalizada.checked) {
        const inputQuantidade = document.getElementById('inputQuantidade');
        if (inputQuantidade) {
            quantidade = parseInt(inputQuantidade.value);
            if (isNaN(quantidade) || quantidade <= 0) {
                alert('Por favor, informe uma quantidade válida.');
                return;
            }
        }
    }
    
    // Converter a data para o formato brasileiro
    const dataObj = new Date(dataRecebimento);
    const dataFormatada = dataObj.toLocaleDateString('pt-BR');
    
    // Processar cada item selecionado
    const promessas = [];
    
    itensSelecionados.forEach(itemId => {
        // Encontrar o item no array de todos os itens
        const item = todosItens.find(i => i.codigo === itemId);
        
        if (item) {
            // Determinar a quantidade recebida
            const quantidadeRecebida = quantidade !== null ? quantidade : item.necessidade;
            
            // Determinar o status com base na quantidade recebida vs. necessidade
            let novoStatus;
            if (quantidadeRecebida === item.necessidade) {
                novoStatus = 'Concluído';
            } else if (quantidadeRecebida < item.necessidade) {
                novoStatus = 'Pendente';
            } else {
                novoStatus = 'Incorreto';
            }
            
            // Atualizar o item no Firebase
            const promessa = firebase.database().ref(`projetos/${item.clienteId}/${item.projetoId}/listas/${item.listaId}`).once('value')
                .then((snapshot) => {
                    const lista = snapshot.val();
                    
                    if (Array.isArray(lista)) {
                        // Encontrar o índice do item na lista
                        const indiceItem = lista.findIndex(i => i && i.codigo === itemId);
                        
                        if (indiceItem !== -1) {
                            // Atualizar o item
                            const itemAtualizado = {
                                ...lista[indiceItem],
                                dataRecebimento: dataFormatada,
                                quantidadeRecebida: quantidadeRecebida,
                                status: novoStatus,
                                statusRecebimento: 'Finalizado'
                            };
                            
                            // Atualizar o item na lista
                            lista[indiceItem] = itemAtualizado;
                            
                            // Salvar a lista atualizada no Firebase
                            return firebase.database().ref(`projetos/${item.clienteId}/${item.projetoId}/listas/${item.listaId}`).set(lista);
                        }
                    }
                    
                    return Promise.resolve();
                });
            
            promessas.push(promessa);
        }
    });
    
    // Aguardar todas as promessas serem resolvidas
    Promise.all(promessas)
        .then(() => {
            console.log('Recebimento confirmado com sucesso!');
            
            // Fechar o modal
            const modalRecebimento = document.getElementById('modalRecebimento');
            if (modalRecebimento) {
                const modal = bootstrap.Modal.getInstance(modalRecebimento);
                if (modal) {
                    modal.hide();
                }
            }
            
            // Limpar a lista de itens selecionados
            itensSelecionados = [];
            
            // Recarregar os itens
            carregarItensComprados();
            
            // Recarregar os eventos do calendário
            carregarEventosCalendario();
            
            // Exibir mensagem de sucesso
            alert('Recebimento confirmado com sucesso!');
        })
        .catch((error) => {
            console.error('Erro ao confirmar recebimento:', error);
            alert('Erro ao confirmar recebimento: ' + error.message);
        });
}

function aplicarFiltros() {
    console.log('Aplicando filtros (versão corrigida e unificada):', filtroAtual);

    // Verificar se DataTables e sua API de extensão de busca estão disponíveis
    if (!$.fn.dataTable || !$.fn.dataTable.ext || !$.fn.dataTable.ext.search) {
        console.error('DataTables ou $.fn.dataTable.ext.search não está disponível para aplicar filtros!');
        return;
    }

    // Remover qualquer filtro customizado anterior para evitar acúmulo
    // É importante que esta chamada remova apenas o último filtro adicionado por esta função.
    // Se outros filtros customizados são usados, esta lógica pode precisar de ajuste.
    // No contexto atual, assumimos que este é o único filtro customizado sendo adicionado e removido.
    $.fn.dataTable.ext.search.pop();

    $.fn.dataTable.ext.search.push(function(settings, data, dataIndex) {
        // Assegurar que o filtro seja aplicado apenas à tabela correta ('tabelaItens')
        if (settings.nTable.id !== 'tabelaItens') {
            return true; // Não aplicar a outras tabelas
        }

        // Obter e normalizar dados da tabela
        const codigoTabela = (data[1] || '').toLowerCase();      // Coluna "Código"
        const clienteTabela = (data[9] || '').toLowerCase();    // Coluna "Cliente"
        const fornecedorTabela = (data[11] || '').toLowerCase(); // Coluna "Fornecedor"
        const statusHtml = data[14] || '';                     // Coluna "Status" (pode conter HTML)
        const statusTabela = statusHtml.replace(/<[^>]*>/g, '').toLowerCase().trim(); // Limpar HTML e normalizar

        // Obter e normalizar valores dos filtros
        const filtroCodigo = (filtroAtual.codigo || '').toLowerCase();
        const filtroCliente = (filtroAtual.cliente || '').toLowerCase();
        const filtroFornecedor = (filtroAtual.fornecedor || '').toLowerCase();
        const filtroStatus = (filtroAtual.status || '').toLowerCase();

        // Aplicar filtros
        if (filtroCodigo && !codigoTabela.includes(filtroCodigo)) {
            return false;
        }
        if (filtroCliente && clienteTabela !== filtroCliente) {
            return false;
        }
        if (filtroFornecedor && fornecedorTabela !== filtroFornecedor) {
            return false;
        }
        if (filtroStatus && !statusTabela.includes(filtroStatus)) {
            // Se o filtro de status for "Empenho/Comprado", precisamos de uma lógica mais específica
            // para corresponder se o status da tabela contiver "empenho" OU "comprado".
            // A lógica original com `includes` já cobre parcialmente isso.
            // Para uma correspondência exata, a condição seria: statusTabela !== filtroStatus
            // Se o status da tabela é "Empenho/Comprado", e o filtro é "Comprado", `statusTabela.includes(filtroStatus)` será true.
            // Se o status da tabela é "Comprado", e o filtro é "Empenho/Comprado", `statusTabela.includes(filtroStatus)` será false.
            // Para o caso de "Empenho/Comprado", pode ser necessário dividir o valor do filtro e verificar ambas as partes.
            // No entanto, para manter a simplicidade e consistência com a lógica original, `includes` é usado.
             return false;
        }

        return true; // Mostrar linha se passar por todos os filtros
    });

    // Redesenhar a tabela para aplicar os filtros
    if (tabelaItens) {
        tabelaItens.draw();
        console.log('Tabela de recebimento redesenhada com filtros aplicados.');
    } else {
        console.warn('Variável tabelaItens (DataTable) não está inicializada ao tentar aplicar filtros.');
    }

    // Atualizar contadores de seleção (se a função existir e for relevante)
    if (typeof atualizarContadoresSelecao === 'function') {
        atualizarContadoresSelecao();
    }
}

/**
 * Limpa todos os filtros aplicados
 */
function limparFiltros() {
    console.log('Limpando todos os filtros...');
    
    // Resetar os valores dos filtros
    const filtroFornecedor = document.getElementById('filtroFornecedor');
    if (filtroFornecedor) {
        filtroFornecedor.value = '';
    }
    
    const filtroCliente = document.getElementById('filtroCliente');
    if (filtroCliente) {
        filtroCliente.value = '';
    }
    
    const filtroCodigo = document.getElementById('filtroCodigo');
    if (filtroCodigo) {
        filtroCodigo.value = '';
    }
    
    const filtroStatus = document.getElementById('filtroStatus');
    if (filtroStatus) {
        filtroStatus.value = '';
    }
    
    // Resetar o objeto de filtro atual
    filtroAtual = {
        fornecedor: '',
        cliente: '',
        codigo: '',
        status: ''
    };
    
    // Aplicar os filtros (agora vazios)
    aplicarFiltros();
}

/**
 * Altera a visualização do calendário principal
 * @param {string} view - Nome da visualização a ser aplicada
 */
function alterarVisualizacaoCalendario(view) {
    console.log('Alterando visualização do calendário para:', view);
    
    if (calendarioInstance) {
        calendarioInstance.changeView(view);
    }
}

/**
 * Altera a visualização do calendário completo
 * @param {string} view - Nome da visualização a ser aplicada
 */
function alterarVisualizacaoCalendarioCompleto(view) {
    console.log('Alterando visualização do calendário completo para:', view);
    
    if (calendarioCompletoInstance) {
        calendarioCompletoInstance.changeView(view);
    }
}

/**
 * Alterna a classe ativa do botão de visualização do calendário
 * @param {string} botaoId - ID do botão a ser ativado
 */
function toggleBotaoVisualizacao(botaoId) {
    console.log('Alternando botão de visualização do calendário:', botaoId);
    
    // Remover a classe ativa de todos os botões
    document.querySelectorAll('.btn-visualizacao').forEach(botao => {
        botao.classList.remove('active');
    });
    
    // Adicionar a classe ativa ao botão selecionado
    const botaoSelecionado = document.getElementById(botaoId);
    if (botaoSelecionado) {
        botaoSelecionado.classList.add('active');
    }
}

/**
 * Alterna a classe ativa do botão de visualização do calendário completo
 * @param {string} botaoId - ID do botão a ser ativado
 */
function toggleBotaoCalendarioCompleto(botaoId) {
    console.log('Alternando botão de visualização do calendário completo:', botaoId);
    
    // Remover a classe ativa de todos os botões
    document.querySelectorAll('.btn-calendario-completo').forEach(botao => {
        botao.classList.remove('active');
    });
    
    // Adicionar a classe ativa ao botão selecionado
    const botaoSelecionado = document.getElementById(botaoId);
    if (botaoSelecionado) {
        botaoSelecionado.classList.add('active');
    }
}

/**
 * Atualiza os eventos do calendário completo com base no fornecedor selecionado
 * @param {string} fornecedor - Nome do fornecedor para filtrar
 */
function atualizarEventosCalendarioCompleto(fornecedor) {
    console.log('Atualizando eventos do calendário completo para fornecedor:', fornecedor);
    
    if (!calendarioCompletoInstance) return;
    
    // Obter todos os eventos
    const eventos = calendarioCompletoInstance.getEvents();
    
    // Remover todos os eventos
    calendarioCompletoInstance.removeAllEvents();
    
    // Filtrar eventos pelo fornecedor
    const eventosFiltrados = eventos.filter(evento => {
        // Se não houver fornecedor selecionado, mostrar todos
        if (!fornecedor) return true;
        
        // Verificar se o fornecedor do evento corresponde ao selecionado
        return evento.extendedProps.fornecedor === fornecedor;
    });
    
    // Adicionar os eventos filtrados de volta ao calendário
    eventosFiltrados.forEach(evento => {
        calendarioCompletoInstance.addEvent({
            title: evento.title,
            start: evento.start,
            end: evento.end,
            backgroundColor: evento.backgroundColor,
            borderColor: evento.borderColor,
            extendedProps: evento.extendedProps
        });
    });
}

/**
 * Mostra os detalhes de um evento do calendário
 * @param {Object} evento - Evento do calendário
 */
function mostrarDetalhesEvento(evento) {
    console.log('Mostrando detalhes do evento:', evento.title);
    
    // Obter os dados do evento
    const fornecedor = evento.extendedProps.fornecedor;
    const quantidade = evento.extendedProps.quantidade;
    const itens = evento.extendedProps.itens;
    const data = evento.extendedProps.data;
    
    // Formatar a data
    const dataObj = new Date(data);
    const dataFormatada = dataObj.toLocaleDateString('pt-BR');
    
    // Atualizar o título do modal
    const detalhesEntregaFornecedor = document.getElementById('detalhesEntregaFornecedor');
    if (detalhesEntregaFornecedor) {
        detalhesEntregaFornecedor.textContent = `${fornecedor} - ${dataFormatada}`;
    }
    
    // Limpar a tabela de itens
    const tabelaItensDetalhes = document.getElementById('tabelaItensDetalhes');
    if (tabelaItensDetalhes) {
        tabelaItensDetalhes.innerHTML = '';
        
        // Adicionar os itens à tabela
        itens.forEach(item => {
            const tr = document.createElement('tr');
            
            // Código
            const tdCodigo = document.createElement('td');
            tdCodigo.textContent = item.codigo || '';
            tr.appendChild(tdCodigo);
            
            // Descrição
            const tdDescricao = document.createElement('td');
            tdDescricao.textContent = item.descricao || '';
            tr.appendChild(tdDescricao);
            
            // Quantidade (necessidade)
            const tdQuantidade = document.createElement('td');
            tdQuantidade.textContent = item.necessidade || '';
            tr.appendChild(tdQuantidade);
            
            // Cliente
            const tdCliente = document.createElement('td');
            tdCliente.textContent = item.clienteNome || '';
            tr.appendChild(tdCliente);
            
            // Adicionar a linha à tabela
            tabelaItensDetalhes.appendChild(tr);
        });
    }
    
    // Exibir o modal
    const modalDetalhesEvento = document.getElementById('modalDetalhesEvento');
    if (modalDetalhesEvento) {
        const modal = new bootstrap.Modal(modalDetalhesEvento);
        modal.show();
    }
}

/**
 * Exporta os dados da tabela em diferentes formatos
 * @param {string} tipo - Tipo de exportação (copy, excel, pdf, print)
 */
function exportarDados(tipo) {
    console.log('Exportando dados da tabela como:', tipo);
    
    if (!tabelaItens) {
        alert('Tabela não inicializada.');
        return;
    }
    
    // Verificar se os botões de exportação estão disponíveis
    if (!$.fn.dataTable.ext.buttons) {
        console.error('Botões de exportação do DataTables não estão disponíveis!');
        return;
    }
    
    // Configurar botões de exportação
    const botoes = {
        copy: {
            extend: 'copy',
            text: 'Copiar',
            className: 'btn btn-primary',
            exportOptions: {
                columns: [1, 2, 8, 9, 10, 11, 12, 13, 14]
            }
        },
        excel: {
            extend: 'excel',
            text: 'Excel',
            className: 'btn btn-success',
            exportOptions: {
                columns: [1, 2, 8, 9, 10, 11, 12, 13, 14]
            }
        },
        pdf: {
            extend: 'pdf',
            text: 'PDF',
            className: 'btn btn-danger',
            exportOptions: {
                columns: [1, 2, 8, 9, 10, 11, 12, 13, 14]
            }
        },
        print: {
            extend: 'print',
            text: 'Imprimir',
            className: 'btn btn-info',
            exportOptions: {
                columns: [1, 2, 8, 9, 10, 11, 12, 13, 14]
            }
        }
    };
    
    // Executar a exportação
    if (botoes[tipo] && $.fn.dataTable.ext.buttons[botoes[tipo].extend]) {
        $.fn.dataTable.ext.buttons[botoes[tipo].extend].action.call(
            null,
            null,
            {
                exportOptions: botoes[tipo].exportOptions
            },
            tabelaItens
        );
    }
}

/**
 * Gera uma cor consistente para um fornecedor
 * @param {string} fornecedor - Nome do fornecedor
 * @returns {string} Cor em formato hexadecimal
 */
function gerarCorParaFornecedor(fornecedor) {
    // Lista de cores predefinidas
    const cores = [
        '#4285F4', // Azul
        '#EA4335', // Vermelho
        '#FBBC05', // Amarelo
        '#34A853', // Verde
        '#FF6D01', // Laranja
        '#46BDC6', // Azul claro
        '#7B1FA2', // Roxo
        '#0097A7', // Ciano
        '#689F38', // Verde limão
        '#F57C00', // Laranja escuro
        '#D81B60', // Rosa
        '#5D4037', // Marrom
        '#455A64', // Azul acinzentado
        '#616161', // Cinza
        '#795548', // Marrom claro
    ];
    
    // Calcular um hash simples para o nome do fornecedor
    let hash = 0;
    for (let i = 0; i < fornecedor.length; i++) {
        hash = fornecedor.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Usar o hash para selecionar uma cor da lista
    const indice = Math.abs(hash) % cores.length;
    return cores[indice];
}
