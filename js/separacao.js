// INÍCIO DO ARQUIVO js/separacao.js

let tabelaCorrecao = null; // Variável global para a DataTable

document.addEventListener('DOMContentLoaded', () => {
    // Verifica se Select2 está disponível antes de tentar usá-lo
    // Se você não usa Select2, pode remover esta parte.
    if (typeof $ !== 'undefined' && $.fn && $.fn.select2) {
        $('#selectCliente, #selectTipoProjeto, #selectLista').select2({
            placeholder: "Selecione uma opção",
            allowClear: true,
            width: '100%'
        });
    }

    // --- INÍCIO: Lógica dos Selects (baseada no seu original que funcionava) ---
    carregarClientes(); // Função do seu original [cite: oliverlleo/oscompras/OSCOMPRAS-5d758c4ad9f9ddfc434172e10f5a7f8adf8bae59/js/separacao.js]
    document.getElementById('selectCliente').addEventListener('change', () => { // ID do HTML [cite: oliverlleo/oscompras/OSCOMPRAS-5d758c4ad9f9ddfc434172e10f5a7f8adf8bae59/pages/separacao.html]
        limparSelectHTML('selectTipoProjeto', 'Selecione um Tipo de Projeto'); // ID do HTML [cite: oliverlleo/oscompras/OSCOMPRAS-5d758c4ad9f9ddfc434172e10f5a7f8adf8bae59/pages/separacao.html]
        limparSelectHTML('selectLista', 'Selecione uma Lista'); // ID do HTML [cite: oliverlleo/oscompras/OSCOMPRAS-5d758c4ad9f9ddfc434172e10f5a7f8adf8bae59/pages/separacao.html]
        if (tabelaCorrecao) tabelaCorrecao.clear().draw();
        carregarTiposProjeto(); // Função do seu original [cite: oliverlleo/oscompras/OSCOMPRAS-5d758c4ad9f9ddfc434172e10f5a7f8adf8bae59/js/separacao.js]
    });
    document.getElementById('selectTipoProjeto').addEventListener('change', () => { // ID do HTML [cite: oliverlleo/oscompras/OSCOMPRAS-5d758c4ad9f9ddfc434172e10f5a7f8adf8bae59/pages/separacao.html]
        limparSelectHTML('selectLista', 'Selecione uma Lista'); // ID do HTML [cite: oliverlleo/oscompras/OSCOMPRAS-5d758c4ad9f9ddfc434172e10f5a7f8adf8bae59/pages/separacao.html]
        if (tabelaCorrecao) tabelaCorrecao.clear().draw();
        carregarListas(); // Função do seu original [cite: oliverlleo/oscompras/OSCOMPRAS-5d758c4ad9f9ddfc434172e10f5a7f8adf8bae59/js/separacao.js]
    });
    document.getElementById('selectLista').addEventListener('change', () => { // ID do HTML [cite: oliverlleo/oscompras/OSCOMPRAS-5d758c4ad9f9ddfc434172e10f5a7f8adf8bae59/pages/separacao.html]
        if (tabelaCorrecao) tabelaCorrecao.clear().draw();
    });
    // --- FIM: Lógica dos Selects ---

    document.getElementById('btnGerar').addEventListener('click', gerarSeparacao); // ID do HTML [cite: oliverlleo/oscompras/OSCOMPRAS-5d758c4ad9f9ddfc434172e10f5a7f8adf8bae59/pages/separacao.html]

    // Inicializa DataTable
    if (typeof $ !== 'undefined' && $.fn && $.fn.DataTable) {
        if (!$.fn.DataTable.isDataTable('#tabelaCorrecao')) { // ID do HTML [cite: oliverlleo/oscompras/OSCOMPRAS-5d758c4ad9f9ddfc434172e10f5a7f8adf8bae59/pages/separacao.html]
            tabelaCorrecao = $('#tabelaCorrecao').DataTable({ // ID do HTML [cite: oliverlleo/oscompras/OSCOMPRAS-5d758c4ad9f9ddfc434172e10f5a7f8adf8bae59/pages/separacao.html]
                responsive: true,
                language: { url: 'https://cdn.datatables.net/plug-ins/1.11.5/i18n/pt-BR.json' },
                columns: [ // Garanta que o HTML tenha um <th> a mais para "Detalhes"
                    { title: "Detalhes", className: 'dt-control', orderable: false, data: null, defaultContent: '<i class="fas fa-plus-circle text-primary"></i>', width: "15px" },
                    { title: "Código", data: "codigo" },                         // Colunas conforme HTML [cite: oliverlleo/oscompras/OSCOMPRAS-5d758c4ad9f9ddfc434172e10f5a7f8adf8bae59/pages/separacao.html]
                    { title: "Descrição", data: "descricao" },                   // [cite: oliverlleo/oscompras/OSCOMPRAS-5d758c4ad9f9ddfc434172e10f5a7f8adf8bae59/pages/separacao.html]
                    { title: "Qtd. Desejada", data: "quantidadeDesejadaSeparacao" }, // [cite: oliverlleo/oscompras/OSCOMPRAS-5d758c4ad9f9ddfc434172e10f5a7f8adf8bae59/pages/separacao.html]
                    { title: "Qtd. Disponível", data: "quantidadeDisponivelOriginal" },// [cite: oliverlleo/oscompras/OSCOMPRAS-5d758c4ad9f9ddfc434172e10f5a7f8adf8bae59/pages/separacao.html]
                    { title: "Qtd. a Separar", data: "quantidadeParaSepararReal" },  // [cite: oliverlleo/oscompras/OSCOMPRAS-5d758c4ad9f9ddfc434172e10f5a7f8adf8bae59/pages/separacao.html]
                    { title: "Qtd. Compra", data: "quantidadeCompraAdicional" },    // [cite: oliverlleo/oscompras/OSCOMPRAS-5d758c4ad9f9ddfc434172e10f5a7f8adf8bae59/pages/separacao.html]
                    { title: "Qtd. Devolução", data: "quantidadeDevolucaoEstoque" },// [cite: oliverlleo/oscompras/OSCOMPRAS-5d758c4ad9f9ddfc434172e10f5a7f8adf8bae59/pages/separacao.html]
                    { title: "Status", data: "statusComparacao" }                // [cite: oliverlleo/oscompras/OSCOMPRAS-5d758c4ad9f9ddfc434172e10f5a7f8adf8bae59/pages/separacao.html]
                ],
                data: [],
                order: [[1, 'asc']] // Ordenar pela coluna "Código" (segunda coluna visualmente)
            });
        } else {
            tabelaCorrecao = $('#tabelaCorrecao').DataTable(); // ID do HTML [cite: oliverlleo/oscompras/OSCOMPRAS-5d758c4ad9f9ddfc434172e10f5a7f8adf8bae59/pages/separacao.html]
        }

        $('#tabelaCorrecao tbody').on('click', 'td.dt-control', function (event) { // ID do HTML [cite: oliverlleo/oscompras/OSCOMPRAS-5d758c4ad9f9ddfc434172e10f5a7f8adf8bae59/pages/separacao.html]
            event.stopPropagation();
            var tr = $(this).closest('tr');
            var row = tabelaCorrecao.row(tr);
            if (row.child.isShown()) {
                row.child.hide();
                tr.removeClass('shown');
                $(this).html('<i class="fas fa-plus-circle text-primary"></i>');
            } else {
                const rowData = row.data();
                if (rowData) {
                    row.child(formatarDetalhes(rowData)).show();
                    tr.addClass('shown');
                    $(this).html('<i class="fas fa-minus-circle text-danger"></i>');
                }
            }
        });
    } else {
        console.error("jQuery ou DataTables não estão carregados. A tabela não pode ser inicializada.");
    }
});

// Função auxiliar para limpar selects
function limparSelectHTML(selectId, placeholderText = "Selecione") {
    const select = document.getElementById(selectId);
    if (select) {
        select.innerHTML = `<option value="">${placeholderText}</option>`;
        // Se estiver usando Select2, precisa disparar o change
        if (typeof $ !== 'undefined' && $.fn && $.fn.select2 && $(select).data('select2')) {
            $(select).val(null).trigger('change');
        }
    }
}

// --- SUAS FUNÇÕES ORIGINAIS PARA CARREGAR SELECTS (com pequenos ajustes) ---
// [cite: oliverlleo/oscompras/OSCOMPRAS-5d758c4ad9f9ddfc434172e10f5a7f8adf8bae59/js/separacao.js]
function carregarClientes() {
    const sel = document.getElementById('selectCliente'); // ID do HTML [cite: oliverlleo/oscompras/OSCOMPRAS-5d758c4ad9f9ddfc434172e10f5a7f8adf8bae59/pages/separacao.html]
    sel.innerHTML = '<option value="">Selecione</option>';

    const clientesRef = firebase.database().ref('clientes');

    clientesRef.once('value').then(snap => {
        snap.forEach(child => {
            const opt = document.createElement('option');
            opt.value = child.key;
            const clienteData = child.val();
            opt.textContent = clienteData.nome_razao_social || clienteData.nome || child.key;
            sel.appendChild(opt);
        });
        if (typeof $ !== 'undefined' && $.fn && $.fn.select2 && $(sel).data('select2')) {
            $(sel).trigger('change');
        }
    }).catch(err => {
        console.error("Erro ao carregar clientes:", err);
        if (typeof mostrarNotificacao === "function") mostrarNotificacao("Falha ao carregar clientes.", "danger"); // [cite: oliverlleo/oscompras/OSCOMPRAS-5d758c4ad9f9ddfc434172e10f5a7f8adf8bae59/js/global.js]
    });
}

function carregarTiposProjeto() {
    const clienteId = document.getElementById('selectCliente').value; // ID do HTML [cite: oliverlleo/oscompras/OSCOMPRAS-5d758c4ad9f9ddfc434172e10f5a7f8adf8bae59/pages/separacao.html]
    const sel = document.getElementById('selectTipoProjeto'); // ID do HTML [cite: oliverlleo/oscompras/OSCOMPRAS-5d758c4ad9f9ddfc434172e10f5a7f8adf8bae59/pages/separacao.html]

    if (!clienteId) return;

    firebase.database().ref(`projetos/${clienteId}`).once('value').then(snap => {
        const dados = snap.val() || {};
        let tiposAdicionados = 0;
        Object.keys(dados).forEach(tipo => {
            // Verifica se o nó 'tipo' tem um subnó 'listas'
            if (typeof dados[tipo] === 'object' && dados[tipo] !== null && dados[tipo].hasOwnProperty('listas')) {
                const opt = document.createElement('option');
                opt.value = tipo;
                opt.textContent = tipo;
                sel.appendChild(opt);
                tiposAdicionados++;
            }
        });
        if (tiposAdicionados === 0) {
            if (Object.keys(dados).length > 0) { // Havia dados, mas nenhum com 'listas'
                 if (typeof mostrarNotificacao === "function") mostrarNotificacao("Nenhum tipo de projeto com estrutura de 'listas' encontrado para este cliente.", "info"); // [cite: oliverlleo/oscompras/OSCOMPRAS-5d758c4ad9f9ddfc434172e10f5a7f8adf8bae59/js/global.js]
            } else { // Nenhum dado sob projetos/clienteId
                 if (typeof mostrarNotificacao === "function") mostrarNotificacao("Nenhum tipo de projeto encontrado para este cliente.", "info"); // [cite: oliverlleo/oscompras/OSCOMPRAS-5d758c4ad9f9ddfc434172e10f5a7f8adf8bae59/js/global.js]
            }
        }
        if (typeof $ !== 'undefined' && $.fn && $.fn.select2 && $(sel).data('select2')) {
            $(sel).trigger('change');
        }
    }).catch(err => {
        console.error("Erro ao carregar tipos de projeto:", err);
        if (typeof mostrarNotificacao === "function") mostrarNotificacao("Falha ao carregar tipos de projeto.", "danger"); // [cite: oliverlleo/oscompras/OSCOMPRAS-5d758c4ad9f9ddfc434172e10f5a7f8adf8bae59/js/global.js]
    });
}

// Ajustado para corresponder à lógica original de acesso aos itens da lista
async function carregarListas() {
    const clienteId = document.getElementById('selectCliente').value; // ID do HTML [cite: oliverlleo/oscompras/OSCOMPRAS-5d758c4ad9f9ddfc434172e10f5a7f8adf8bae59/pages/separacao.html]
    const tipo = document.getElementById('selectTipoProjeto').value; // ID do HTML [cite: oliverlleo/oscompras/OSCOMPRAS-5d758c4ad9f9ddfc434172e10f5a7f8adf8bae59/pages/separacao.html]
    const sel = document.getElementById('selectLista'); // ID do HTML [cite: oliverlleo/oscompras/OSCOMPRAS-5d758c4ad9f9ddfc434172e10f5a7f8adf8bae59/pages/separacao.html]

    sel.innerHTML = '<option value="">Selecione uma Lista</option>'; // Limpa sempre

    if (!clienteId || !tipo) {
        if (typeof $ !== 'undefined' && $.fn && $.fn.select2 && $(sel).data('select2')) { $(sel).trigger('change'); }
        return;
    }

    try {
        const refListasRoot = firebase.database().ref(`projetos/${clienteId}/${tipo}/listas`);
        const snapshotListas = await refListasRoot.once('value');

        if (!snapshotListas.exists()) {
            if (typeof mostrarNotificacao === "function") mostrarNotificacao(`Nenhuma lista encontrada em 'projetos/${clienteId}/${tipo}/listas'.`, "info"); // [cite: oliverlleo/oscompras/OSCOMPRAS-5d758c4ad9f9ddfc434172e10f5a7f8adf8bae59/js/global.js]
            if (typeof $ !== 'undefined' && $.fn && $.fn.select2 && $(sel).data('select2')) { $(sel).trigger('change'); }
            return;
        }

        let algumaListaElegivelAdicionada = false;
        snapshotListas.forEach(listSnap => { // listSnap é cada nó de lista (ex: LPVC) [cite: oliverlleo/oscompras/OSCOMPRAS-5d758c4ad9f9ddfc434172e10f5a7f8adf8bae59/js/separacao.js]
            const nomeLista = listSnap.key;
            const itensDaLista = listSnap.val() || {}; // ITENS DIRETAMENTE SOB O NÓ DA LISTA [cite: oliverlleo/oscompras/OSCOMPRAS-5d758c4ad9f9ddfc434172e10f5a7f8adf8bae59/js/separacao.js]
            const arrayDeItens = Array.isArray(itensDaLista) ? itensDaLista : (typeof itensDaLista === 'object' && itensDaLista !== null ? Object.values(itensDaLista) : []);

            const elegivel = arrayDeItens.some(it =>
                it && ((parseFloat(it.empenho || 0) > 0) || (parseFloat(it.quantidadeRecebida || 0) > 0)) // [cite: oliverlleo/oscompras/OSCOMPRAS-5d758c4ad9f9ddfc434172e10f5a7f8adf8bae59/js/separacao.js]
            );

            if (elegivel) { // [cite: oliverlleo/oscompras/OSCOMPRAS-5d758c4ad9f9ddfc434172e10f5a7f8adf8bae59/js/separacao.js]
                const opt = document.createElement('option');
                opt.value = nomeLista;
                opt.textContent = nomeLista;
                sel.appendChild(opt);
                algumaListaElegivelAdicionada = true;
            }
        });

        if (!algumaListaElegivelAdicionada) {
            if (typeof mostrarNotificacao === "function") mostrarNotificacao("Nenhuma lista elegível (com itens empenhados/recebidos) encontrada.", "info"); // [cite: oliverlleo/oscompras/OSCOMPRAS-5d758c4ad9f9ddfc434172e10f5a7f8adf8bae59/js/global.js]
        }
        
        if (typeof $ !== 'undefined' && $.fn && $.fn.select2 && $(sel).data('select2')) {
            $(sel).trigger('change');
        }

    } catch (err) {
        console.error("Erro ao carregar listas:", err);
        if (typeof mostrarNotificacao === "function") mostrarNotificacao("Falha ao carregar listas de material.", "danger"); // [cite: oliverlleo/oscompras/OSCOMPRAS-5d758c4ad9f9ddfc434172e10f5a7f8adf8bae59/js/global.js]
        if (typeof $ !== 'undefined' && $.fn && $.fn.select2 && $(sel).data('select2')) { $(sel).trigger('change'); }
    }
}
// --- FIM DAS FUNÇÕES PARA CARREGAR SELECTS ---

// Função para formatar os detalhes (colunas ocultas)
function formatarDetalhes(d) {
    // 'd' é o objeto de dados original para a linha (item de CorrecaoFinal)
    return `<div class="p-3 bg-light border rounded">
        <dl class="row mb-0">
            <dt class="col-sm-3">Altura:</dt>
            <dd class="col-sm-9">${d.altura || 'N/A'}</dd>
            <dt class="col-sm-3">Largura:</dt>
            <dd class="col-sm-9">${d.largura || 'N/A'}</dd>
            <dt class="col-sm-3">Medida:</dt>
            <dd class="col-sm-9">${d.medida || 'N/A'}</dd>
            <dt class="col-sm-3">Cor:</dt>
            <dd class="col-sm-9">${d.cor || 'N/A'}</dd>
            <dt class="col-sm-3">Observação:</dt>
            <dd class="col-sm-9">${d.observacao || 'N/A'}</dd>
        </dl>
    </div>`;
}

// Processa o arquivo de separação e salva em SeparacaoProd
async function processarArquivoInputSeparacao(arquivo, clienteId, tipoProjeto, nomeListaOriginal) {
    return new Promise((resolve, reject) => {
        if (!arquivo) {
            return reject(new Error('Nenhum arquivo selecionado.'));
        }
        // As funções obterTipoArquivo, processarCSV, etc., vêm de processamento-arquivos.js
        const tipoArquivo = obterTipoArquivo(arquivo.name); // [cite: oliverlleo/oscompras/OSCOMPRAS-5d758c4ad9f9ddfc434172e10f5a7f8adf8bae59/js/processamento-arquivos.js]
        if (!tipoArquivo) {
            return reject(new Error('Formato de arquivo não suportado.'));
        }

        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                let itensProcessados;
                switch (tipoArquivo) {
                    case 'csv':
                        itensProcessados = processarCSV(e.target.result); // [cite: oliverlleo/oscompras/OSCOMPRAS-5d758c4ad9f9ddfc434172e10f5a7f8adf8bae59/js/processamento-arquivos.js]
                        break;
                    case 'xlsx':
                        // Lembre-se que processarXLSX em processamento-arquivos.js é SIMULADO.
                        itensProcessados = await processarXLSX(e.target.result, arquivo.name); // [cite: oliverlleo/oscompras/OSCOMPRAS-5d758c4ad9f9ddfc434172e10f5a7f8adf8bae59/js/processamento-arquivos.js]
                        break;
                    case 'xml':
                        itensProcessados = processarXML(e.target.result); // [cite: oliverlleo/oscompras/OSCOMPRAS-5d758c4ad9f9ddfc434172e10f5a7f8adf8bae59/js/processamento-arquivos.js]
                        break;
                    default:
                        return reject(new Error('Tipo de arquivo não pode ser processado.'));
                }

                if (!itensProcessados || itensProcessados.length === 0) {
                    return reject(new Error('Nenhum item encontrado no arquivo de separação. Verifique o conteúdo e o formato do arquivo.'));
                }
                
                // Garante que os campos de detalhe existam
                const itensCompletos = itensProcessados.map(item => ({
                    codigo: String(item.codigo || `GERADO-${Date.now()}`).trim(),
                    descricao: item.descricao || "Sem Descrição",
                    quantidade: parseFloat(item.quantidade) || 0,
                    altura: item.altura || "",
                    largura: item.largura || "",
                    medida: item.medida || "",
                    cor: item.cor || "",
                    observacao: item.observacao || ""
                }));

                const refSeparacaoProd = firebase.database().ref(`SeparacaoProd/${clienteId}/${tipoProjeto}/${nomeListaOriginal}/itens`);
                await refSeparacaoProd.set(itensCompletos);
                resolve(itensCompletos);
            } catch (error) {
                reject(new Error(`Falha no processamento do arquivo: ${error.message}`));
            }
        };
        reader.onerror = (error) => reject(new Error(`Erro ao ler o arquivo: ${error.message}`));

        if (tipoArquivo === 'xlsx') {
            reader.readAsArrayBuffer(arquivo);
        } else {
            reader.readAsText(arquivo, 'ISO-8859-1'); // Conforme processamento-arquivos.js [cite: oliverlleo/oscompras/OSCOMPRAS-5d758c4ad9f9ddfc434172e10f5a7f8adf8bae59/js/processamento-arquivos.js]
        }
    });
}

// Compara as listas, ajustada para ler a lista original conforme a estrutura que funcionava
async function compararListas(clienteId, tipoProjeto, nomeListaOriginal) {
    try {
        // Busca itens da LISTA ORIGINAL (sem /itens no final do path, pega o nó da lista diretamente)
        const refOriginal = firebase.database().ref(`projetos/${clienteId}/${tipoProjeto}/listas/${nomeListaOriginal}`); // [cite: oliverlleo/oscompras/OSCOMPRAS-5d758c4ad9f9ddfc434172e10f5a7f8adf8bae59/js/separacao.js]
        const snapshotOriginal = await refOriginal.once('value');
        let listaOriginalItens = {}; // Usar objeto para facilitar a busca por código se as chaves não forem sequenciais
        if (snapshotOriginal.exists()) {
            listaOriginalItens = snapshotOriginal.val() || {}; // Itens diretamente sob o nó da lista [cite: oliverlleo/oscompras/OSCOMPRAS-5d758c4ad9f9ddfc434172e10f5a7f8adf8bae59/js/separacao.js]
        }
        // Converte para array para o mapa, mas mantém o objeto para iteração se necessário
        const listaOriginalItensArray = Array.isArray(listaOriginalItens) ? listaOriginalItens : (typeof listaOriginalItens === 'object' && listaOriginalItens !== null ? Object.values(listaOriginalItens) : []);
        
        // Busca itens da LISTA DE SEPARAÇÃO (do upload, que tem /itens)
        const refSepProdItens = firebase.database().ref(`SeparacaoProd/${clienteId}/${tipoProjeto}/${nomeListaOriginal}/itens`);
        const snapshotSepProd = await refSepProdItens.once('value');
        let listaSepProdItensArray = [];
        if (snapshotSepProd.exists()) {
            const val = snapshotSepProd.val();
            listaSepProdItensArray = Array.isArray(val) ? val : (typeof val === 'object' && val !== null ? Object.values(val) : []);
            listaSepProdItensArray = listaSepProdItensArray.filter(item => item && item.codigo);
        } else {
             if (typeof mostrarNotificacao === "function") mostrarNotificacao("Nenhuma lista de separação (upload) encontrada para comparar.", "warning"); // [cite: oliverlleo/oscompras/OSCOMPRAS-5d758c4ad9f9ddfc434172e10f5a7f8adf8bae59/js/global.js]
        }
        
        const itensProcessadosParaCorrecao = [];
        const codigosSepProdProcessados = new Set();
        const mapaListaOriginal = new Map();

        listaOriginalItensArray.filter(item => item && item.codigo).forEach(item => {
            mapaListaOriginal.set(String(item.codigo).trim(), {
                ...item,
                quantidadeDisponivelOriginal: (parseFloat(item.empenho || 0) + parseFloat(item.quantidadeRecebida || 0)) // [cite: oliverlleo/oscompras/OSCOMPRAS-5d758c4ad9f9ddfc434172e10f5a7f8adf8bae59/js/separacao.js]
            });
        });

        for (const itemSep of listaSepProdItensArray) {
            if (!itemSep || !itemSep.codigo) continue;
            const codigoSep = String(itemSep.codigo).trim();
            codigosSepProdProcessados.add(codigoSep);
            const quantidadeDesejadaSeparacao = parseFloat(itemSep.quantidade || 0); // [cite: oliverlleo/oscompras/OSCOMPRAS-5d758c4ad9f9ddfc434172e10f5a7f8adf8bae59/js/separacao.js]
            const itemOriginal = mapaListaOriginal.get(codigoSep);

            let itemProcessado = {
                codigo: codigoSep,
                descricao: itemSep.descricao || (itemOriginal ? itemOriginal.descricao : "Sem Descrição"),
                quantidadeDesejadaSeparacao: quantidadeDesejadaSeparacao,
                quantidadeDisponivelOriginal: 0,
                quantidadeParaSepararReal: 0,
                quantidadeCompraAdicional: 0,
                quantidadeDevolucaoEstoque: 0,
                statusComparacao: "",
                altura: itemSep.altura || (itemOriginal ? itemOriginal.altura : "") || "",
                largura: itemSep.largura || (itemOriginal ? itemOriginal.largura : "") || "",
                medida: itemSep.medida || (itemOriginal ? itemOriginal.medida : "") || "",
                cor: itemSep.cor || (itemOriginal ? itemOriginal.cor : "") || "",
                observacao: itemSep.observacao || (itemOriginal ? itemOriginal.observacao : "") || ""
            };

            if (itemOriginal) {
                const quantidadeDisponivel = itemOriginal.quantidadeDisponivelOriginal;
                itemProcessado.quantidadeDisponivelOriginal = quantidadeDisponivel;

                if (quantidadeDesejadaSeparacao === quantidadeDisponivel) {
                    itemProcessado.statusComparacao = "Liberar para Separação"; // [cite: oliverlleo/oscompras/OSCOMPRAS-5d758c4ad9f9ddfc434172e10f5a7f8adf8bae59/js/separacao.js]
                    itemProcessado.quantidadeParaSepararReal = quantidadeDesejadaSeparacao;
                } else if (quantidadeDesejadaSeparacao < quantidadeDisponivel) {
                    itemProcessado.statusComparacao = "Liberar e Devolver"; // [cite: oliverlleo/oscompras/OSCOMPRAS-5d758c4ad9f9ddfc434172e10f5a7f8adf8bae59/js/separacao.js]
                    itemProcessado.quantidadeParaSepararReal = quantidadeDesejadaSeparacao;
                    itemProcessado.quantidadeDevolucaoEstoque = parseFloat((quantidadeDisponivel - quantidadeDesejadaSeparacao).toFixed(3));
                } else { 
                    itemProcessado.statusComparacao = "Parcial - Comprar"; // [cite: oliverlleo/oscompras/OSCOMPRAS-5d758c4ad9f9ddfc434172e10f5a7f8adf8bae59/js/separacao.js]
                    itemProcessado.quantidadeParaSepararReal = quantidadeDisponivel;
                    itemProcessado.quantidadeCompraAdicional = parseFloat((quantidadeDesejadaSeparacao - quantidadeDisponivel).toFixed(3));
                }
            } else { 
                itemProcessado.statusComparacao = "Item Novo"; // [cite: oliverlleo/oscompras/OSCOMPRAS-5d758c4ad9f9ddfc434172e10f5a7f8adf8bae59/js/separacao.js]
                itemProcessado.quantidadeCompraAdicional = quantidadeDesejadaSeparacao;
            }
            itensProcessadosParaCorrecao.push(itemProcessado);
        }

        for (const [codigoOriginal, itemOriginal] of mapaListaOriginal.entries()) {
            if (!codigosSepProdProcessados.has(codigoOriginal)) {
                const quantidadeDisponivel = itemOriginal.quantidadeDisponivelOriginal;
                if (quantidadeDisponivel > 0) {
                    itensProcessadosParaCorrecao.push({
                        codigo: codigoOriginal,
                        descricao: itemOriginal.descricao || "",
                        quantidadeDesejadaSeparacao: 0,
                        quantidadeDisponivelOriginal: quantidadeDisponivel,
                        quantidadeParaSepararReal: 0,
                        quantidadeCompraAdicional: 0,
                        quantidadeDevolucaoEstoque: quantidadeDisponivel,
                        statusComparacao: "Devolver Estoque Integral", // [cite: oliverlleo/oscompras/OSCOMPRAS-5d758c4ad9f9ddfc434172e10f5a7f8adf8bae59/js/separacao.js]
                        altura: itemOriginal.altura || "",
                        largura: itemOriginal.largura || "",
                        medida: itemOriginal.medida || "",
                        cor: itemOriginal.cor || "",
                        observacao: itemOriginal.observacao || ""
                    });
                }
            }
        }
        
        const refCorrecaoFinal = firebase.database().ref(`CorrecaoFinal/${clienteId}/${tipoProjeto}/${nomeListaOriginal}/itensProcessados`);
        await refCorrecaoFinal.set(itensProcessadosParaCorrecao);
        return itensProcessadosParaCorrecao; 
    } catch (error) {
        console.error("Erro ao comparar listas:", error);
        if (typeof mostrarNotificacao === "function") mostrarNotificacao(`Erro na comparação: ${error.message}`, "danger"); // [cite: oliverlleo/oscompras/OSCOMPRAS-5d758c4ad9f9ddfc434172e10f5a7f8adf8bae59/js/global.js]
        throw error;
    }
}

async function gerarSeparacao() { // [cite: oliverlleo/oscompras/OSCOMPRAS-5d758c4ad9f9ddfc434172e10f5a7f8adf8bae59/js/separacao.js]
    const clienteId = document.getElementById('selectCliente').value; // ID do HTML [cite: oliverlleo/oscompras/OSCOMPRAS-5d758c4ad9f9ddfc434172e10f5a7f8adf8bae59/pages/separacao.html]
    const tipo = document.getElementById('selectTipoProjeto').value; // ID do HTML [cite: oliverlleo/oscompras/OSCOMPRAS-5d758c4ad9f9ddfc434172e10f5a7f8adf8bae59/pages/separacao.html]
    const lista = document.getElementById('selectLista').value; // ID do HTML [cite: oliverlleo/oscompras/OSCOMPRAS-5d758c4ad9f9ddfc434172e10f5a7f8adf8bae59/pages/separacao.html]
    const arquivoInput = document.getElementById('inputArquivo'); // ID do HTML [cite: oliverlleo/oscompras/OSCOMPRAS-5d758c4ad9f9ddfc434172e10f5a7f8adf8bae59/pages/separacao.html]
    const arquivo = arquivoInput ? arquivoInput.files[0] : null;

    if (!clienteId || !tipo || !lista || !arquivo) {
        if (typeof mostrarNotificacao === "function") mostrarNotificacao('Selecione cliente, tipo de projeto, lista original e o arquivo de separação.', 'warning'); // [cite: oliverlleo/oscompras/OSCOMPRAS-5d758c4ad9f9ddfc434172e10f5a7f8adf8bae59/js/separacao.js]
        return;
    }

    const btnGerar = document.getElementById('btnGerar'); // ID do HTML [cite: oliverlleo/oscompras/OSCOMPRAS-5d758c4ad9f9ddfc434172e10f5a7f8adf8bae59/pages/separacao.html]
    if (btnGerar) {
        btnGerar.disabled = true;
        btnGerar.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Processando...';
    }
    if (tabelaCorrecao) tabelaCorrecao.clear().draw();

    try {
        if (typeof mostrarNotificacao === "function") mostrarNotificacao('Processando arquivo de separação...', 'info'); // [cite: oliverlleo/oscompras/OSCOMPRAS-5d758c4ad9f9ddfc434172e10f5a7f8adf8bae59/js/global.js]
        await processarArquivoInputSeparacao(arquivo, clienteId, tipo, lista);
        
        if (typeof mostrarNotificacao === "function") mostrarNotificacao('Comparando listas...', 'info'); // [cite: oliverlleo/oscompras/OSCOMPRAS-5d758c4ad9f9ddfc434172e10f5a7f8adf8bae59/js/global.js]
        const itensParaTabela = await compararListas(clienteId, tipo, lista);
        
        if (typeof mostrarNotificacao === "function") mostrarNotificacao('Preenchendo tabela de resultados...', 'info'); // [cite: oliverlleo/oscompras/OSCOMPRAS-5d758c4ad9f9ddfc434172e10f5a7f8adf8bae59/js/global.js]
        preencherTabelaCorrecao(itensParaTabela);

        if (typeof mostrarNotificacao === "function") mostrarNotificacao('Processamento concluído com sucesso!', 'success'); // [cite: oliverlleo/oscompras/OSCOMPRAS-5d758c4ad9f9ddfc434172e10f5a7f8adf8bae59/js/separacao.js]

    } catch (err) {
        console.error("Erro no processo de geração de separação:", err);
        if (typeof mostrarNotificacao === "function") mostrarNotificacao(`Erro no processamento: ${err.message || 'Erro desconhecido.'}`, 'danger'); // [cite: oliverlleo/oscompras/OSCOMPRAS-5d758c4ad9f9ddfc434172e10f5a7f8adf8bae59/js/separacao.js]
        if (tabelaCorrecao) tabelaCorrecao.clear().draw();
    } finally {
        if (btnGerar) {
            btnGerar.disabled = false;
            btnGerar.innerHTML = '<i class="fas fa-play me-2"></i>Processar'; // Ícone do seu HTML [cite: oliverlleo/oscompras/OSCOMPRAS-5d758c4ad9f9ddfc434172e10f5a7f8adf8bae59/pages/separacao.html]
        }
        if(arquivoInput) arquivoInput.value = ""; // Limpa o campo de arquivo
    }
}

// Função para preencher a tabela (usando o nome da sua função original: preencherTabela)
// mas a lógica é da função que preenche tabelaCorrecao
function preencherTabelaCorrecao(dados) { // Renomeei para evitar confusão com a `preencherTabela` do seu original que era mais simples.
    if (!tabelaCorrecao) {
        console.error("Instância da DataTable 'tabelaCorrecao' não encontrada.");
        if (typeof mostrarNotificacao === "function") mostrarNotificacao("Erro: Tabela de correção não inicializada.", "danger"); // [cite: oliverlleo/oscompras/OSCOMPRAS-5d758c4ad9f9ddfc434172e10f5a7f8adf8bae59/js/global.js]
        return;
    }
    tabelaCorrecao.clear(); // [cite: oliverlleo/oscompras/OSCOMPRAS-5d758c4ad9f9ddfc434172e10f5a7f8adf8bae59/js/separacao.js]
    if (Array.isArray(dados) && dados.length > 0) {
        tabelaCorrecao.rows.add(dados).draw(); // [cite: oliverlleo/oscompras/OSCOMPRAS-5d758c4ad9f9ddfc434172e10f5a7f8adf8bae59/js/separacao.js]
    } else {
        if (typeof mostrarNotificacao === "function") mostrarNotificacao("Nenhum dado para exibir na tabela de correção.", "info"); // [cite: oliverlleo/oscompras/OSCOMPRAS-5d758c4ad9f9ddfc434172e10f5a7f8adf8bae59/js/global.js]
        tabelaCorrecao.draw(); // Redesenha vazia
    }
}

// As funções obterTipoArquivo, processarCSV, processarXLSX, processarXML
// são esperadas de ../js/processamento-arquivos.js, que deve ser incluído no separacao.html
// A função mostrarNotificacao é esperada de ../js/global.js

// FIM DO ARQUIVO js/separacao.js
