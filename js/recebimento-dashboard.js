/**
 * Funções adicionais para o popup de calendário completo e dashboard
 * Complemento ao arquivo recebimento.js
 */

// Variáveis para o dashboard
let chartEntregas;

/**
 * Inicializa o dashboard com gráficos e estatísticas
 */
function inicializarDashboard() {
    console.log('Inicializando dashboard...');
    
    try {
        // Verifica se o elemento dashboard-stats existe
        const dashboardStats = document.querySelector('.dashboard-stats');
        if (!dashboardStats) {
            console.error('Elemento .dashboard-stats não encontrado');
            return;
        }
        
        // Cria o gráfico de entregas por status
        const ctxEntregas = document.createElement('canvas');
        ctxEntregas.id = 'graficoEntregas';
        ctxEntregas.style.marginTop = '20px';
        ctxEntregas.height = 200;
        
        // Adiciona o canvas ao dashboard
        dashboardStats.appendChild(ctxEntregas);
        
        // Inicializa o gráfico
        chartEntregas = new Chart(ctxEntregas, {
            type: 'doughnut',
            data: {
                labels: ['Pendentes', 'Recebidos', 'Incorretos'],
                datasets: [{
                    data: [0, 0, 0],
                    backgroundColor: [
                        '#ffc107', // Amarelo para pendentes
                        '#28a745', // Verde para recebidos
                        '#dc3545'  // Vermelho para incorretos
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    title: {
                        display: true,
                        text: 'Status das Entregas',
                        font: {
                            size: 16
                        }
                    }
                }
            }
        });
        
        console.log('Dashboard inicializado com sucesso');
    } catch (error) {
        console.error('Erro ao inicializar dashboard:', error);
    }
}

/**
 * Atualiza o dashboard com estatísticas mais detalhadas
 */
function atualizarDashboardAvancado() {
    try {
        // Atualiza o gráfico de entregas por sta            const entregasPendentes = parseInt(document.getElementById(\'recebimentosPendentes\')?.textContent || \'0\');
            // const entregasRecebidas = parseInt(document.getElementById(\'recebimentosRecebidos\')?.textContent || \'0\'); // Removido
            // const entregasIncorretas = parseInt(document.getElementById(\'recebimentosIncorretos\')?.textContent || \'0\'); // Removido
            
            // Ajusta os dados do gráfico para refletir apenas os cards restantes
            chartEntregas.data.labels = [\'Pendentes\']; // Atualiza labels
            chartEntregas.data.datasets[0].data = [entregasPendentes]; // Atualiza dados
            chartEntregas.data.datasets[0].backgroundColor = [\'#ffc107\']; // Atualiza cores
            chartEntregas.update(); Verifica se todosItens existe e tem elementos
        if (!window.todosItens || !Array.isArray(window.todosItens) || window.todosItens.length === 0) {
            console.log('Nenhum item disponível para atualizar o dashboard avançado');
            return;
        }
        
        // Calcula estatísticas adicionais
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        
        let entregasAtrasadas = 0;
        let entregasProximaSemana = 0;
        let fornecedoresUnicos = new Set();
        
        window.todosItens.forEach(item => {
            // Verifica se prazoEntrega existe e é válido
            if (!item.prazoEntrega) return;
            
            // Converte para objeto Date se for string
            const dataPrazo = item.prazoEntrega instanceof Date ? 
                item.prazoEntrega : new Date(item.prazoEntrega);
            
            if (isNaN(dataPrazo.getTime())) return; // Pula se a data for inválida
            
            dataPrazo.setHours(0, 0, 0, 0);
            
            // Conta entregas atrasadas
            if (dataPrazo < hoje && (item.status?.includes('Pendente') || !item.status)) {
                entregasAtrasadas++;
            }
            
            // Conta entregas para a próxima semana
            const umaSemanaDepois = new Date(hoje);
            umaSemanaDepois.setDate(hoje.getDate() + 7);
            
            if (dataPrazo > hoje && dataPrazo <= umaSemanaDepois) {
                entregasProximaSemana++;
            }
            
            // Adiciona fornecedor ao conjunto se existir
            if (item.fornecedor) {
                fornecedoresUnicos.add(item.fornecedor);
            }
        });
        
        // Adiciona estatísticas adicionais ao dashboard
        const dashboardStats = document.querySelector('.dashboard-stats');
        if (!dashboardStats) {
            console.error('Elemento .dashboard-stats não encontrado');
            return;
        }
        
        // Verifica se já existem os cards adicionais
        if (!document.getElementById('cardAtrasadas')) {
            // Card de entregas atrasadas
            const cardAtrasadas = document.createElement('div');
            cardAtrasadas.id = 'cardAtrasadas';
            cardAtrasadas.className = 'stat-card bg-secondary text-white mb-3';
            cardAtrasadas.innerHTML = `
                <div class="stat-icon">
                    <i class="fas fa-calendar-times"></i>
                </div>
                <div class="stat-content">
                    <h4 class="stat-value" id="entregasAtrasadas">${entregasAtrasadas}</h4>
                    <p class="stat-label">Entregas Atrasadas</p>
                </div>
            `;
            
            const graficoEntregas = document.getElementById('graficoEntregas');
            if (graficoEntregas) {
                dashboardStats.insertBefore(cardAtrasadas, graficoEntregas);
            } else {
                dashboardStats.appendChild(cardAtrasadas);
            }
            
            // Card de entregas próxima semana
            const cardProximaSemana = document.createElement('div');
            cardProximaSemana.id = 'cardProximaSemana';
            cardProximaSemana.className = 'stat-card bg-info text-white mb-3';
            cardProximaSemana.innerHTML = `
                <div class="stat-icon">
                    <i class="fas fa-calendar-week"></i>
                </div>
                <div class="stat-content">
                    <h4 class="stat-value" id="entregasProximaSemana">${entregasProximaSemana}</h4>
                    <p class="stat-label">Próxima Semana</p>
                </div>
            `;
            
            if (graficoEntregas) {
                dashboardStats.insertBefore(cardProximaSemana, graficoEntregas);
            } else {
                dashboardStats.appendChild(cardProximaSemana);
            }
            
            // Card de fornecedores
            const cardFornecedores = document.createElement('div');
            cardFornecedores.id = 'cardFornecedores';
            cardFornecedores.className = 'stat-card bg-dark text-white mb-3';
            cardFornecedores.innerHTML = `
                <div class="stat-icon">
                    <i class="fas fa-truck"></i>
                </div>
                <div class="stat-content">
                    <h4 class="stat-value" id="fornecedoresUnicos">${fornecedoresUnicos.size}</h4>
                    <p class="stat-label">Fornecedores</p>
                </div>
            `;
            
            if (graficoEntregas) {
                dashboardStats.insertBefore(cardFornecedores, graficoEntregas);
            } else {
                dashboardStats.appendChild(cardFornecedores);
            }
        } else {
            // Atualiza os valores
            const entregasAtrasadasEl = document.getElementById('entregasAtrasadas');
            const entregasProximaSemanaEl = document.getElementById('entregasProximaSemana');
            const fornecedoresUnicosEl = document.getElementById('fornecedoresUnicos');
            
            if (entregasAtrasadasEl) entregasAtrasadasEl.textContent = entregasAtrasadas;
            if (entregasProximaSemanaEl) entregasProximaSemanaEl.textContent = entregasProximaSemana;
            if (fornecedoresUnicosEl) fornecedoresUnicosEl.textContent = fornecedoresUnicos.size;
        }
        
        console.log('Dashboard avançado atualizado com sucesso');
    } catch (error) {
        console.error('Erro ao atualizar dashboard avançado:', error);
    }
}

/**
 * Melhora a interatividade do calendário completo
 */
function melhorarCalendarioCompleto() {
    try {
        // Verifica se o modal footer existe
        const modalFooter = document.querySelector('#modalCalendarioCompleto .modal-footer');
        if (!modalFooter) {
            console.error('Modal footer do calendário completo não encontrado');
            return;
        }
        
        // Adiciona botões para exportar o calendário
        const botoesCalendario = document.createElement('div');
        botoesCalendario.className = 'btn-group mt-3';
        botoesCalendario.innerHTML = `
            <button type="button" class="btn btn-sm btn-outline-primary" id="btnExportarCalendario">
                <i class="fas fa-file-export"></i> Exportar Calendário
            </button>
            <button type="button" class="btn btn-sm btn-outline-secondary" id="btnImprimirCalendario">
                <i class="fas fa-print"></i> Imprimir
            </button>
        `;
        
        // Adiciona os botões ao modal
        modalFooter.prepend(botoesCalendario);
        
        // Adiciona event listeners
        document.getElementById('btnExportarCalendario')?.addEventListener('click', exportarCalendario);
        document.getElementById('btnImprimirCalendario')?.addEventListener('click', imprimirCalendario);
        
        // Verifica se fornecedores existe
        if (!window.fornecedores || !Array.isArray(window.fornecedores)) {
            window.fornecedores = [];
            
            // Tenta extrair fornecedores dos itens
            if (window.todosItens && Array.isArray(window.todosItens)) {
                const fornecedoresSet = new Set();
                window.todosItens.forEach(item => {
                    if (item.fornecedor) {
                        fornecedoresSet.add(item.fornecedor);
                    }
                });
                window.fornecedores = Array.from(fornecedoresSet);
            }
        }
        
        // Adiciona filtros ao calendário completo
        const filtrosCalendario = document.createElement('div');
        filtrosCalendario.className = 'row g-3 mb-3';
        filtrosCalendario.innerHTML = `
            <div class="col-md-4">
                <select id="filtroCalendarioFornecedor" class="form-select form-select-sm">
                    <option value="">Todos os fornecedores</option>
                    ${window.fornecedores.map(f => `<option value="${f}">${f}</option>`).join('')}
                </select>
            </div>
            <div class="col-md-4">
                <select id="filtroCalendarioStatus" class="form-select form-select-sm">
                    <option value="">Todos os status</option>
                    <option value="pendente">Pendentes</option>
                    <option value="recebido">Recebidos</option>
                    <option value="incorreto">Incorretos</option>
                </select>
            </div>
            <div class="col-md-4">
                <button id="btnAplicarFiltrosCalendario" class="btn btn-sm btn-primary w-100">
                    <i class="fas fa-filter"></i> Aplicar Filtros
                </button>
            </div>
        `;
        
        // Adiciona os filtros ao modal
        const modalBody = document.querySelector('#modalCalendarioCompleto .modal-body');
        if (!modalBody) {
            console.error('Modal body do calendário completo não encontrado');
            return;
        }
        
        const calendarCompleto = document.getElementById('calendarCompleto');
        if (calendarCompleto) {
            modalBody.insertBefore(filtrosCalendario, calendarCompleto);
        } else {
            modalBody.appendChild(filtrosCalendario);
            console.warn('Elemento #calendarCompleto não encontrado, filtros adicionados ao final');
        }
        
        // Adiciona event listener para o botão de aplicar filtros
        document.getElementById('btnAplicarFiltrosCalendario')?.addEventListener('click', filtrarCalendarioCompleto);
        
        console.log('Calendário completo melhorado com sucesso');
    } catch (error) {
        console.error('Erro ao melhorar calendário completo:', error);
    }
}

/**
 * Filtra os eventos do calendário completo
 */
function filtrarCalendarioCompleto() {
    try {
        // Verifica se calendarCompleto existe
        if (!window.calendarCompleto) {
            console.error('Calendário completo não inicializado');
            return;
        }
        
        const filtroFornecedor = document.getElementById('filtroCalendarioFornecedor')?.value || '';
        const filtroStatus = document.getElementById('filtroCalendarioStatus')?.value || '';
        
        // Verifica se todosItens existe
        if (!window.todosItens || !Array.isArray(window.todosItens) || window.todosItens.length === 0) {
            console.log('Nenhum item disponível para filtrar no calendário');
            return;
        }
        
        // Remove todos os eventos
        window.calendarCompleto.removeAllEvents();
        
        // Agrupa os itens por fornecedor e data de entrega
        const eventosPorFornecedor = {};
        
        window.todosItens.forEach(item => {
            // Verifica se prazoEntrega existe
            if (!item.prazoEntrega) return;
            
            // Converte para objeto Date se for string
            const dataPrazo = item.prazoEntrega instanceof Date ? 
                item.prazoEntrega : new Date(item.prazoEntrega);
            
            if (isNaN(dataPrazo.getTime())) return; // Pula se a data for inválida
            
            // Aplica filtros
            if (filtroFornecedor && item.fornecedor !== filtroFornecedor) {
                return;
            }
            
            if (filtroStatus) {
                if (filtroStatus === 'pendente' && !(item.status?.includes('Pendente') || !item.status)) {
                    return;
                }
                if (filtroStatus === 'recebido' && item.status !== 'Recebido') {
                    return;
                }
                if (filtroStatus === 'incorreto' && !(item.status?.includes('incorreta'))) {
                    return;
                }
            }
            
            const dataKey = dataPrazo.toISOString().split('T')[0];
            const fornecedorKey = item.fornecedor || 'Sem fornecedor';
            const key = `${dataKey}-${fornecedorKey}`;
            
            if (!eventosPorFornecedor[key]) {
                eventosPorFornecedor[key] = {
                    fornecedor: fornecedorKey,
                    data: dataPrazo,
                    itens: []
                };
            }
            
            eventosPorFornecedor[key].itens.push(item);
        });
        
        // Adiciona os eventos ao calendário
        Object.values(eventosPorFornecedor).forEach(evento => {
            // Determina a cor do evento com base no status dos itens
            let corEvento = '#ffc107'; // Amarelo para pendente (padrão)
            let todosRecebidos = true;
            let algumIncorreto = false;
            
            evento.itens.forEach(item => {
                if (!item.status || item.status.includes('Pendente')) {
                    todosRecebidos = false;
                }
                if (item.status?.includes('incorreta')) {
                    algumIncorreto = true;
                }
            });
            
            if (algumIncorreto) {
                corEvento = '#dc3545'; // Vermelho para entrega incorreta
            } else if (todosRecebidos) {
                corEvento = '#28a745'; // Verde para recebido
            }
            
            // Cria o evento para o calendário completo
            window.calendarCompleto.addEvent({
                title: `${evento.fornecedor} (${evento.itens.length} itens)`,
                start: evento.data,
                allDay: true,
                backgroundColor: corEvento,
                borderColor: corEvento,
                extendedProps: {
                    fornecedor: evento.fornecedor,
                    itens: evento.itens
                }
            });
        });
        
        console.log('Filtros aplicados ao calendário completo');
    } catch (error) {
        console.error('Erro ao filtrar calendário completo:', error);
    }
}

/**
 * Exporta o calendário para um arquivo CSV
 */
function exportarCalendario() {
    try {
        // Verifica se calendarCompleto existe
        if (!window.calendarCompleto) {
            console.error('Calendário completo não inicializado');
            return;
        }
        
        // Obtém todos os eventos do calendário
        const eventos = window.calendarCompleto.getEvents();
        
        // Cria o conteúdo CSV
        let csv = ['Data,Fornecedor,Quantidade de Itens,Status'];
        
        eventos.forEach(evento => {
            const data = evento.start.toLocaleDateString('pt-BR');
            const fornecedor = evento.extendedProps?.fornecedor || 'Sem fornecedor';
            const quantidadeItens = evento.extendedProps?.itens?.length || 0;
            
            // Determina o status geral
            let status = 'Pendente';
            let todosRecebidos = true;
            let algumIncorreto = false;
            
            if (evento.extendedProps?.itens) {
                evento.extendedProps.itens.forEach(item => {
                    if (!item.status || item.status.includes('Pendente')) {
                        todosRecebidos = false;
                    }
                    if (item.status?.includes('incorreta')) {
                        algumIncorreto = true;
                    }
                });
            }
            
            if (algumIncorreto) {
                status = 'Entrega incorreta';
            } else if (todosRecebidos) {
                status = 'Recebido';
            }
            
            csv.push(`${data},${fornecedor},${quantidadeItens},${status}`);
        });
        
        // Cria o arquivo CSV
        const csvContent = csv.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        // Cria um link para download
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'calendario_entregas.csv');
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log('Calendário exportado com sucesso');
    } catch (error) {
        console.error('Erro ao exportar calendário:', error);
    }
}

/**
 * Imprime o calendário
 */
function imprimirCalendario() {
    try {
        // Verifica se calendarCompleto existe
        if (!window.calendarCompleto) {
            console.error('Calendário completo não inicializado');
            return;
        }
        
        // Cria uma nova janela para impressão
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Por favor, permita popups para imprimir o calendário');
            return;
        }
        
        // Obtém todos os eventos do calendário
        const eventos = window.calendarCompleto.getEvents();
        
        // Cria o conteúdo HTML
        let html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Calendário de Entregas</title>
                <style>
                    body { font-family: Arial, sans-serif; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; }
                    .pendente { background-color: #fff3cd; }
                    .recebido { background-color: #d4edda; }
                    .incorreto { background-color: #f8d7da; }
                    h1 { text-align: center; }
                    @media print {
                        button { display: none; }
                    }
                </style>
            </head>
            <body>
                <h1>Calendário de Entregas</h1>
                <button onclick="window.print()">Imprimir</button>
                <table>
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Fornecedor</th>
                            <th>Quantidade de Itens</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        // Ordena os eventos por data
        const eventosOrdenados = eventos.sort((a, b) => a.start.getTime() - b.start.getTime());
        
        // Adiciona cada evento à tabela
        eventosOrdenados.forEach(evento => {
            const data = evento.start.toLocaleDateString('pt-BR');
            const fornecedor = evento.extendedProps?.fornecedor || 'Sem fornecedor';
            const quantidadeItens = evento.extendedProps?.itens?.length || 0;
            
            // Determina o status geral
            let status = 'Pendente';
            let classe = 'pendente';
            let todosRecebidos = true;
            let algumIncorreto = false;
            
            if (evento.extendedProps?.itens) {
                evento.extendedProps.itens.forEach(item => {
                    if (!item.status || item.status.includes('Pendente')) {
                        todosRecebidos = false;
                    }
                    if (item.status?.includes('incorreta')) {
                        algumIncorreto = true;
                    }
                });
            }
            
            if (algumIncorreto) {
                status = 'Entrega incorreta';
                classe = 'incorreto';
            } else if (todosRecebidos) {
                status = 'Recebido';
                classe = 'recebido';
            }
            
            html += `
                <tr class="${classe}">
                    <td>${data}</td>
                    <td>${fornecedor}</td>
                    <td>${quantidadeItens}</td>
                    <td>${status}</td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </body>
            </html>
        `;
        
        // Escreve o HTML na nova janela
        printWindow.document.write(html);
        printWindow.document.close();
        
        console.log('Calendário preparado para impressão');
    } catch (error) {
        console.error('Erro ao imprimir calendário:', error);
    }
}

// Adiciona as funções ao escopo global
window.inicializarDashboard = inicializarDashboard;
window.atualizarDashboardAvancado = atualizarDashboardAvancado;
window.melhorarCalendarioCompleto = melhorarCalendarioCompleto;
window.filtrarCalendarioCompleto = filtrarCalendarioCompleto;
window.exportarCalendario = exportarCalendario;
window.imprimirCalendario = imprimirCalendario;
