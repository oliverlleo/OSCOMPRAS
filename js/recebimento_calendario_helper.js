// Função auxiliar para gerar a lista de eventos formatados para FullCalendar
function gerarEventosParaCalendario() {
    const eventosFormatados = [];
    if (!todosItens || todosItens.length === 0) {
        console.log("Nenhum item em 'todosItens' para gerar eventos.");
        return eventosFormatados;
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
                    // Mês é 0-indexado no construtor Date
                    dataEntrega = new Date(partes[2], partes[1] - 1, partes[0]);
                } else { 
                    console.warn(`Formato de data inválido (DD/MM/YYYY): ${item.prazoEntrega}`);
                    return; // Pula este item
                }
            } else {
                // Tenta converter de timestamp ou YYYY-MM-DD
                const dateValue = String(item.prazoEntrega).includes('-') ? item.prazoEntrega + "T00:00:00" : parseInt(item.prazoEntrega);
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
            const qtdItem = parseFloat(item.necessidade) > 0 ? parseFloat(item.necessidade) : (parseFloat(item.quantidadeComprada) || 0);
            eventosAgrupados[chaveEvento].quantidadeTotal += qtdItem;
        }
    });

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
                itens: agrupamento.itens, // Passa a lista completa de itens agrupados
                data: agrupamento.data 
            }
        };
        eventosFormatados.push(evento);
    });
    console.log(`Gerados ${eventosFormatados.length} eventos formatados.`);
    return eventosFormatados;
}


function carregarEventosCalendario() {
    console.log("Carregando eventos para calendário principal...");
    if (!calendarioInstance) {
        console.warn("Instância do calendário principal não encontrada.");
        return;
    }

    const eventos = gerarEventosParaCalendario();

    // Limpa e adiciona aos DOIS calendários
    if (calendarioInstance) {
        calendarioInstance.removeAllEvents();
        calendarioInstance.addEventSource(eventos);
        console.log(`Eventos adicionados ao calendário principal.`);
    }
    if (calendarioCompletoInstance) {
        calendarioCompletoInstance.removeAllEvents();
        calendarioCompletoInstance.addEventSource(eventos);
        console.log(`Eventos adicionados ao calendário completo (modal).`);
    }
}

