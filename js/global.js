/**
 * global.js
 * Funções compartilhadas entre múltiplas telas do Sistema de Controle de Compras e Recebimento
 */

/**
 * Formata uma data para o padrão brasileiro (DD/MM/AAAA)
 * @param {Date|string|number} dataInput - A data a ser formatada
 * @returns {string} - A data formatada ou '-' se inválida
 */
function formatarData(dataInput) {
    if (!dataInput) return '-';
    try {
        let dataObj;
        if (dataInput instanceof Date) {
            dataObj = dataInput;
        } else if (typeof dataInput === 'string' && dataInput.includes('/') && dataInput.length === 10) {
            const partes = dataInput.split('/'); // DD/MM/YYYY
            dataObj = new Date(parseInt(partes[2]), parseInt(partes[1]) - 1, parseInt(partes[0]));
            if (isNaN(dataObj.getTime())) return '-';
            // Se já está no formato correto e é uma data válida, retorna como está.
            // Validação extra: verifica se o dia, mês e ano correspondem após a conversão.
            if (dataObj.getDate() === parseInt(partes[0]) && (dataObj.getMonth() + 1) === parseInt(partes[1]) && dataObj.getFullYear() === parseInt(partes[2])) {
                return dataInput;
            } else { // Se a data for inválida (ex: 31/02/2023), retorna '-'
                return '-';
            }
        } else if (typeof dataInput === 'string' && dataInput.includes('-') && dataInput.length === 10) {
            const partes = dataInput.split('-'); // YYYY-MM-DD
            dataObj = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]));
        } else if (typeof dataInput === 'number' || (typeof dataInput === 'string' && !isNaN(dataInput))) {
            dataObj = new Date(parseInt(dataInput)); // Assume timestamp
        } else {
            return '-'; // Formato não reconhecido
        }

        if (isNaN(dataObj.getTime())) {
            return '-';
        }
        const dia = String(dataObj.getDate()).padStart(2, '0');
        const mes = String(dataObj.getMonth() + 1).padStart(2, '0'); 
        const ano = dataObj.getFullYear();
        return `${dia}/${mes}/${ano}`;
    } catch (error) {
        console.error('Erro ao formatar data:', error, dataInput);
        return '-';
    }
}

/**
 * Gera um ID único.
 * @returns {string} ID único.
 */
function gerarIdUnico() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

/**
 * Exibe uma mensagem de notificação ao usuário usando Bootstrap Toasts.
 * @param {string} mensagem - Texto da mensagem a ser exibida.
 * @param {string} [tipo='info'] - Tipo da notificação (success, danger, warning, info), controla a cor do toast.
 * @param {number} [duracao=5000] - Duração em milissegundos que a notificação ficará visível.
 */
function mostrarNotificacao(mensagem, tipo = 'info', duracao = 5000) {
    // Tenta encontrar o container específico da página de recebimento, senão usa/cria um global.
    const containerId = document.getElementById('notificacao-container-recebimento') ? 'notificacao-container-recebimento' : 'notificacao-container-global';
    let container = document.getElementById(containerId);

    if (!container) {
        console.log(`Container de notificação '${containerId}' não encontrado, criando um novo.`);
        container = document.createElement('div');
        container.id = 'notificacao-container-global'; // Usa ID genérico se o específico não existir
        container.className = 'position-fixed top-0 end-0 p-3';
        // Z-index alto para sobrepor outros elementos, incluindo modais do Bootstrap (geralmente 1050-1060)
        // e DataTables (pode chegar a 1100 com plugins).
        container.style.zIndex = "1151"; 
        document.body.appendChild(container);
    }
    
    // Limita o número de toasts visíveis para não sobrecarregar a tela
    while (container.children.length >= 5) { // Mantém no máximo 5 notificações
        container.removeChild(container.firstChild);
    }

    const toastId = `toast-${gerarIdUnico()}`;
    // Define o HTML do toast
    const toastHtml = `
        <div id="${toastId}" class="toast align-items-center text-white bg-${tipo} border-0" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">
                    ${mensagem}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Fechar"></button>
            </div>
        </div>
    `;
    
    // Insere o HTML do toast no final do container
    container.insertAdjacentHTML('beforeend', toastHtml);
    // Obtém a referência ao elemento toast recém-criado pelo seu ID
    const toastElement = document.getElementById(toastId);

    if (toastElement && typeof bootstrap !== 'undefined' && bootstrap.Toast) {
        try {
            // Inicializa o componente Toast do Bootstrap com o elemento e a duração
            const toast = new bootstrap.Toast(toastElement, { delay: duracao, autohide: true });
            toast.show(); // Exibe o toast

            // Adiciona um listener para remover o elemento do DOM após o toast ser ocultado
            toastElement.addEventListener('hidden.bs.toast', function () {
                if (toastElement.parentElement) { // Verifica se ainda tem um pai antes de remover
                    toastElement.remove();
                }
            });
        } catch (e) {
            console.error("Erro ao inicializar ou mostrar Bootstrap Toast:", e);
            console.error("Elemento Toast que causou o erro:", toastElement);
            // Fallback para alert em caso de erro na inicialização do Toast
            alert(`${tipo.toUpperCase()}: ${mensagem}`);
            if (toastElement.parentElement) {
                 toastElement.remove();
            }
        }
    } else {
        // Condições de fallback ou log de erro
        if (!toastElement) {
            console.error("Elemento Toast não foi encontrado no DOM após a inserção. HTML:", toastHtml);
        }
        if (typeof bootstrap === 'undefined' || !bootstrap.Toast) {
            console.warn('Bootstrap Toast API não encontrada. Usando alert() como fallback.');
        }
        alert(`${tipo.toUpperCase()}: ${mensagem}`);
        // Tenta remover o elemento se ele foi adicionado mas o toast não pôde ser mostrado
        if (toastElement && toastElement.parentElement) {
            toastElement.remove();
        }
    }
}


/**
 * Valida um formulário genérico verificando campos com o atributo `required`.
 * Adiciona classes de feedback do Bootstrap para campos inválidos.
 * @param {HTMLFormElement | string} formElementOrSelector - O elemento do formulário HTML ou um seletor CSS para o formulário.
 * @returns {boolean} - True se todos os campos obrigatórios estiverem preenchidos, false caso contrário.
 */
function validarFormulario(formElementOrSelector) {
    const form = (typeof formElementOrSelector === 'string') ? document.querySelector(formElementOrSelector) : formElementOrSelector;
    if (!form) {
        console.error("Formulário não encontrado para validação:", formElementOrSelector);
        return false;
    }
    let valido = true;
    form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
    form.querySelectorAll('.invalid-feedback').forEach(el => el.remove());

    const camposObrigatorios = form.querySelectorAll('[required]');
    camposObrigatorios.forEach(campo => {
        if (!campo.value.trim()) {
            campo.classList.add('is-invalid');
            const feedback = document.createElement('div');
            feedback.className = 'invalid-feedback';
            feedback.textContent = 'Este campo é obrigatório.';
            if (campo.parentNode) {
                 campo.parentNode.insertBefore(feedback, campo.nextSibling);
            }
            valido = false;
        }
    });
    return valido;
}

/**
 * Normaliza um texto removendo acentos, convertendo para minúsculas,
 * removendo caracteres especiais (exceto hífens e espaços) e normalizando espaços.
 * @param {string} texto - O texto a ser normalizado.
 * @returns {string} - O texto normalizado. Retorna string vazia se a entrada não for uma string.
 */
function normalizarTexto(texto) {
    if (typeof texto !== 'string') return '';
    return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Gera um slug a partir de um texto, normalizando-o e substituindo espaços por hífens.
 * @param {string} texto - O texto a ser convertido em slug.
 * @returns {string} - O slug gerado. Retorna string vazia se a entrada não for uma string.
 */
function gerarSlug(texto) {
    if (typeof texto !== 'string') return '';
    return normalizarTexto(texto).replace(/\s+/g, '-').replace(/-+/g, '-');
}

/**
 * Verifica se um objeto é nulo, indefinido ou não possui chaves próprias.
 * @param {Object} obj - O objeto a ser verificado.
 * @returns {boolean} - True se o objeto for considerado vazio, false caso contrário.
 */
function objetoVazio(obj) {
    return obj === null || typeof obj === 'undefined' || (typeof obj === 'object' && Object.keys(obj).length === 0);
}
