/**
 * Função para garantir que todas as colunas estejam visíveis na tabela
 * Esta função é chamada após a inicialização da tabela para garantir
 * que todas as colunas necessárias estejam presentes e visíveis
 */
function garantirColunasVisiveis() {
    console.log('Verificando e garantindo visibilidade de todas as colunas necessárias...');
    
    // Verificar se a tabela foi inicializada
    if (!tabelaItens) {
        console.log('Tabela de itens ainda não inicializada. Aguardando...');
        return;
    }
    
    // Garantir que as colunas de necessidade e comprado estejam visíveis
    const colunaNecessidade = tabelaItens.column(10);
    const colunaComprado = tabelaItens.column(11);
    
    if (colunaNecessidade && !colunaNecessidade.visible()) {
        console.log('Tornando coluna de necessidade visível');
        colunaNecessidade.visible(true);
    }
    
    if (colunaComprado && !colunaComprado.visible()) {
        console.log('Tornando coluna de comprado visível');
        colunaComprado.visible(true);
    }
    
    // Verificar se as colunas ocultas estão configuradas corretamente
    const colunasOcultasIndices = [4, 5, 6, 7]; // Medida, Altura, Largura, Cor
    
    colunasOcultasIndices.forEach(indice => {
        const coluna = tabelaItens.column(indice);
        if (coluna) {
            // Garantir que a coluna existe e está configurada como oculta inicialmente
            // mas pode ser mostrada com o toggle
            if (colunasOcultas) {
                if (coluna.visible()) {
                    console.log(`Ocultando coluna ${indice} conforme configuração inicial`);
                    coluna.visible(false);
                }
            } else {
                if (!coluna.visible()) {
                    console.log(`Mostrando coluna ${indice} conforme configuração atual`);
                    coluna.visible(true);
                }
            }
        }
    });
    
    console.log('Verificação e ajuste de colunas concluídos');
}

// Adicionar a função ao carregamento de itens
const carregarItensClienteOriginal = carregarItensCliente;
window.carregarItensCliente = function(clienteId) {
    console.log('Função carregarItensCliente sobrescrita para garantir colunas visíveis');
    
    // Chamar a função original
    carregarItensClienteOriginal(clienteId);
    
    // Aguardar um momento para garantir que a tabela foi inicializada
    setTimeout(function() {
        garantirColunasVisiveis();
    }, 1000);
};

// Adicionar a função ao toggle de colunas
const toggleColunasOriginal = toggleColunas;
window.toggleColunas = function() {
    console.log('Função toggleColunas sobrescrita para garantir funcionamento correto');
    
    // Chamar a função original
    if (typeof toggleColunasOriginal === 'function') {
        toggleColunasOriginal();
    } else {
        // Implementação alternativa caso a função original não esteja disponível
        colunasOcultas = !colunasOcultas;
        
        // Atualiza o texto do botão
        const btnToggle = document.getElementById('btnToggleColunas');
        if (btnToggle) {
            btnToggle.textContent = colunasOcultas ? '+' : '-';
        }
    }
    
    // Garantir que as colunas ocultas sejam alternadas corretamente
    const colunasOcultasIndices = [4, 5, 6, 7]; // Medida, Altura, Largura, Cor
    
    if (tabelaItens) {
        colunasOcultasIndices.forEach(indice => {
            const coluna = tabelaItens.column(indice);
            if (coluna) {
                coluna.visible(!colunasOcultas);
            }
        });
    }
    
    console.log(`Toggle de colunas concluído. Colunas ocultas: ${colunasOcultas}`);
};
