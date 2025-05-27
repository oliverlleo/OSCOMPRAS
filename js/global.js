/**
 * global.js
 * 
 * Funções compartilhadas entre múltiplas telas do Sistema de Controle de Compras e Recebimento
 * Este arquivo contém funções utilitárias que são utilizadas em diferentes partes do sistema
 */

/**
 * Formata uma data para o padrão brasileiro (DD/MM/AAAA)
 * 
 * @param {Date|string|number} data - A data a ser formatada
 * @returns {string} - A data formatada
 * 
 * Utilizado por:
 * - cadastro.js: função exibirDetalhesCadastro(), carregarClientes()
 * - tratamento-dados.js: função atualizarListaClientes()
 */
function formatarData(data) {
    if (!data) return '-';
    
    try {
        let dataObj;
        
        // Se for número ou string numérica, assume que é timestamp
        if (typeof data === 'number' || (typeof data === 'string' && !isNaN(data))) {
            dataObj = new Date(parseInt(data));
        } 
        // Se for string não numérica, tenta converter para Date
        else if (typeof data === 'string') {
            dataObj = new Date(data);
        }
        // Se já for um objeto Date, usa diretamente
        else if (data instanceof Date) {
            dataObj = data;
        }
        // Outros casos, retorna string vazia
        else {
            return '-';
        }
        
        // Verifica se a data é válida
        if (isNaN(dataObj.getTime())) {
            return '-';
        }
        
        // Formata a data no padrão brasileiro
        return dataObj.toLocaleDateString('pt-BR');
    } catch (error) {
        console.error('Erro ao formatar data:', error, data);
        return '-';
    }
}

/**
 * Gera um ID único baseado em timestamp e caracteres aleatórios
 * 
 * @returns {string} - ID único gerado
 * 
 * Utilizado por:
 * - cadastro.js: função salvarCadastro()
 * - processamento-arquivos.js: função salvarItemProcessado()
 */
function gerarId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

/**
 * Exibe uma mensagem de notificação ao usuário
 * 
 * @param {string} mensagem - Texto da mensagem
 * @param {string} tipo - Tipo da mensagem (success, danger, warning, info)
 * @param {number} duracao - Duração em milissegundos (padrão: 3000ms)
 * 
 * Utilizado por:
 * - cadastro.js: função salvarCadastro(), excluirCadastro()
 * - tratamento-dados.js: função processarArquivoEstoque(), atualizarStatusEmLote()
 * - processamento-arquivos.js: função processarArquivo()
 */
function mostrarNotificacao(mensagem, tipo = 'info', duracao = 3000) {
    // Cria o elemento de notificação
    const notificacao = document.createElement('div');
    notificacao.className = `toast align-items-center text-white bg-${tipo} border-0 position-fixed top-0 end-0 m-3`;
    notificacao.setAttribute('role', 'alert');
    notificacao.setAttribute('aria-live', 'assertive');
    notificacao.setAttribute('aria-atomic', 'true');
    
    // Conteúdo da notificação
    notificacao.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${mensagem}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Fechar"></button>
        </div>
    `;
    
    // Adiciona ao corpo do documento
    document.body.appendChild(notificacao);
    
    // Inicializa o toast do Bootstrap
    const toast = new bootstrap.Toast(notificacao, {
        autohide: true,
        delay: duracao
    });
    
    // Exibe a notificação
    toast.show();
    
    // Remove o elemento após ser ocultado
    notificacao.addEventListener('hidden.bs.toast', function () {
        document.body.removeChild(notificacao);
    });
}

/**
 * Valida um formulário verificando campos obrigatórios
 * 
 * @param {HTMLFormElement} formulario - O formulário a ser validado
 * @returns {boolean} - Verdadeiro se o formulário for válido
 * 
 * Utilizado por:
 * - cadastro.js: função salvarCadastro()
 * - tratamento-dados.js: função processarArquivoEstoque()
 */
function validarFormulario(formulario) {
    let valido = true;
    
    // Verifica campos obrigatórios
    const camposObrigatorios = formulario.querySelectorAll('[required]');
    camposObrigatorios.forEach(campo => {
        if (!campo.value.trim()) {
            campo.classList.add('is-invalid');
            valido = false;
        } else {
            campo.classList.remove('is-invalid');
        }
    });
    
    return valido;
}

/**
 * Normaliza uma string removendo acentos e caracteres especiais
 * 
 * @param {string} texto - Texto a ser normalizado
 * @returns {string} - Texto normalizado
 * 
 * Utilizado por:
 * - processamento-arquivos.js: função normalizarTexto()
 * - cadastro.js: função gerarSlug()
 */
function normalizarTexto(texto) {
    if (!texto) return '';
    
    return texto.normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .replace(/[^\w\s]/g, ''); // Remove caracteres especiais
}

/**
 * Converte uma string para o formato slug (para URLs e IDs)
 * 
 * @param {string} texto - Texto a ser convertido
 * @returns {string} - Texto no formato slug
 * 
 * Utilizado por:
 * - cadastro.js: função gerarSlugCliente()
 */
function gerarSlug(texto) {
    if (!texto) return '';
    
    return normalizarTexto(texto)
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-'); // Substitui espaços por hífens
}

/**
 * Verifica se um objeto está vazio
 * 
 * @param {Object} obj - Objeto a ser verificado
 * @returns {boolean} - Verdadeiro se o objeto estiver vazio
 * 
 * Utilizado por:
 * - cadastro.js: função carregarClientes()
 * - tratamento-dados.js: função carregarItensCliente()
 */
function objetoVazio(obj) {
    return obj === null || obj === undefined || 
           (Object.keys(obj).length === 0 && obj.constructor === Object);
}
