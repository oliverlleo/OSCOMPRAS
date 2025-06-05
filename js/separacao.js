// INÍCIO DO ARQUIVO js/separacao.js

let tabelaCorrecao = null; // Variável global para a DataTable
let modalNecessidadeCompra = null; // Variável global para a instância do Modal Bootstrap

function atualizarTotais() {
    if (!tabelaCorrecao) return;
    const data = tabelaCorrecao.rows({ search: 'applied' }).data();
    let totalSeparar = 0, totalCompra = 0, totalDevolucao = 0;
    data.each(item => {
        totalSeparar += parseFloat(item.quantidadeParaSepararReal || 0);
        totalCompra += parseFloat(item.quantidadeCompraAdicional || 0);
        totalDevolucao += parseFloat(item.quantidadeDevolucaoEstoque || 0);
    });
    const elSeparar = document.getElementById('totalSeparar');
    const elCompra = document.getElementById('totalCompra');
    const elDevolucao = document.getElementById('totalDevolucao');
    if (elSeparar) elSeparar.textContent = totalSeparar.toFixed(3);
    if (elCompra) elCompra.textContent = totalCompra.toFixed(3);
    if (elDevolucao) elDevolucao.textContent = totalDevolucao.toFixed(3);
}

document.addEventListener('DOMContentLoaded', () => {
    // Verifica se Select2 está disponível antes de tentar usá-lo
    if (typeof $ !== 'undefined' && $.fn && $.fn.select2) {
        $('#selectCliente, #selectTipoProjeto, #selectLista').select2({
            placeholder: "Selecione uma opção",
            allowClear: true,
            width: '100%',
            theme: "bootstrap-5" // Adicionado para melhor integração com Bootstrap 5
        });
    }

    carregarClientes();
    document.getElementById('selectCliente').addEventListener('change', () => {
        limparSelectHTML('selectTipoProjeto', 'Selecione um Tipo de Projeto');
        limparSelectHTML('selectLista', 'Selecione uma Lista');
        if (tabelaCorrecao) { tabelaCorrecao.clear().draw(); atualizarTotais(); }
        const arquivoInput = document.getElementById('inputArquivo');
        if (arquivoInput) arquivoInput.value = "";
        document.getElementById('btnAbrirModalNecessidade').disabled = true;
        carregarTiposProjeto();
    });

    document.getElementById('selectTipoProjeto').addEventListener('change', () => {
        limparSelectHTML('selectLista', 'Selecione uma Lista');
        if (tabelaCorrecao) { tabelaCorrecao.clear().draw(); atualizarTotais(); }
        const arquivoInput = document.getElementById('inputArquivo');
        if (arquivoInput) arquivoInput.value = "";
        document.getElementById('btnAbrirModalNecessidade').disabled = true;
        carregarListas();
    });

    document.getElementById('selectLista').addEventListener('change', function() {
        if (tabelaCorrecao) { tabelaCorrecao.clear().draw(); atualizarTotais(); }
        const arquivoInput = document.getElementById('inputArquivo');
        if (arquivoInput) arquivoInput.value = "";
        document.getElementById('btnAbrirModalNecessidade').disabled = true;

        const clienteId = document.getElementById('selectCliente').value;
        const tipoProjeto = document.getElementById('selectTipoProjeto').value;
        const nomeListaOriginal = this.value;

        if (clienteId && tipoProjeto && nomeListaOriginal) {
            tentarCarregarCorrecaoExistente(clienteId, tipoProjeto, nomeListaOriginal);
        }
    });

    document.getElementById('btnGerar').addEventListener('click', gerarSeparacao);
    document.getElementById('btnAbrirModalNecessidade').addEventListener('click', abrirModalNecessidadeCompra);
    document.getElementById('btnTratarNecessidades').addEventListener('click', tratarNecessidadesDeCompra);
    
    if (document.getElementById('modalNecessidadeCompra')) {
        modalNecessidadeCompra = new bootstrap.Modal(document.getElementById('modalNecessidadeCompra'));
    }
    const selecionarTodosModalCheckbox = document.getElementById('selecionarTodosItensModal');
    if (selecionarTodosModalCheckbox) {
        selecionarTodosModalCheckbox.addEventListener('change', function() {
            const checkboxes = document.querySelectorAll('#tabelaItensNecessidade tbody tr input[type="checkbox"]');
            checkboxes.forEach(checkbox => {
                checkbox.checked = this.checked;
            });
        });
    }

    if (typeof $ !== 'undefined' && $.fn && $.fn.DataTable) {
        if (!$.fn.DataTable.isDataTable('#tabelaCorrecao')) {
            tabelaCorrecao = $('#tabelaCorrecao').DataTable({
                responsive: true,
                language: { url: 'https://cdn.datatables.net/plug-ins/1.11.5/i18n/pt-BR.json' },
                columns: [
                    { title: "Detalhes", className: 'dt-control', orderable: false, data: null, defaultContent: '<i class="fas fa-plus-circle text-primary"></i>', width: "15px" },
                    { title: "Código", data: "codigo" },
                    { title: "Descrição", data: "descricao" },
                    { title: "Qtd. Desejada", data: "quantidadeDesejadaSeparacao" },
                    { title: "Qtd. Disponível", data: "quantidadeDisponivelOriginal" },
                    { title: "Qtd. a Separar", data: "quantidadeParaSepararReal" },
                    { title: "Qtd. Compra Adic.", data: "quantidadeCompraAdicional" },
                    { title: "Qtd. Devolução", data: "quantidadeDevolucaoEstoque" },
                    { title: "Status", data: "statusComparacao" },
                    { title: "Compra Final", data: "qtdCompraFinal", defaultContent: "0" },
                    { title: "Uso Estoque", data: null, defaultContent: "", render: function(data, type, row) {
                        return `${row.qtdUsadaEstoque || 0} (Origem: ${row.fonteEstoque || 'N/A'})`;
                      }
                    }
                ],
                data: [],
                order: [[1, 'asc']]
            });
            $('#tabelaCorrecao').on('draw.dt', atualizarTotais);
        } else {
            tabelaCorrecao = $('#tabelaCorrecao').DataTable();
            $('#tabelaCorrecao').on('draw.dt', atualizarTotais);
        }

        $('#tabelaCorrecao tbody').on('click', 'td.dt-control', function (event) {
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
    document.getElementById('btnAbrirModalNecessidade').disabled = true;
});

function limparSelectHTML(selectId, placeholderText = "Selecione") {
    const select = document.getElementById(selectId);
    if (select) {
        select.innerHTML = `<option value="">${placeholderText}</option>`;
        if (typeof $ !== 'undefined' && $.fn && $.fn.select2 && $(select).data('select2')) {
            $(select).val(null).trigger('change');
        }
    }
}

function carregarClientes() {
    const sel = document.getElementById('selectCliente');
    sel.innerHTML = '<option value="">Selecione um Cliente</option>';
    const clientesRef = firebase.database().ref('clientes');
    clientesRef.once('value').then(snap => {
        if (snap.exists()) {
            snap.forEach(child => {
                const opt = document.createElement('option');
                opt.value = child.key;
                const clienteData = child.val();
                opt.textContent = clienteData.nome_razao_social || clienteData.nome || child.key;
                sel.appendChild(opt);
            });
        } else {
             if (typeof mostrarNotificacao === "function") mostrarNotificacao("Nenhum cliente encontrado.", "info");
        }
        if (typeof $ !== 'undefined' && $.fn && $.fn.select2 && $(sel).data('select2')) {
            $(sel).trigger('change');
        }
    }).catch(err => {
        console.error("Erro ao carregar clientes:", err);
        if (typeof mostrarNotificacao === "function") mostrarNotificacao("Falha ao carregar clientes.", "danger");
    });
}

// Função carregarTiposProjeto CORRIGIDA para verificar a subpasta 'listas'
function carregarTiposProjeto() {
    const clienteId = document.getElementById('selectCliente').value;
    const sel = document.getElementById('selectTipoProjeto');
    sel.innerHTML = '<option value="">Selecione um Tipo de Projeto</option>';

    if (!clienteId) {
        if (typeof $ !== 'undefined' && $.fn && $.fn.select2 && $(sel).data('select2')) { $(sel).trigger('change'); }
        return;
    }

    firebase.database().ref(`projetos/${clienteId}`).once('value').then(snap => {
        const dados = snap.val() || {}; // Ex: { PVC: {listas: {...}}, Aluminio: {listas: {...}} }
        let tiposAdicionados = 0;
        Object.keys(dados).forEach(tipo => { // tipo é "PVC", "Aluminio", etc.
            // Verifica se dados[tipo] é um objeto e se ele possui uma propriedade 'listas'
            if (typeof dados[tipo] === 'object' && dados[tipo] !== null && dados[tipo].hasOwnProperty('listas')) {
                const opt = document.createElement('option');
                opt.value = tipo;
                opt.textContent = tipo;
                sel.appendChild(opt);
                tiposAdicionados++;
            }
        });

        if (tiposAdicionados === 0) {
            if (typeof mostrarNotificacao === "function") {
                if (Object.keys(dados).length > 0) {
                    mostrarNotificacao("Nenhum tipo de projeto com uma subpasta 'listas' foi encontrado.", "info");
                } else {
                    mostrarNotificacao("Nenhum dado de projeto encontrado para este cliente.", "info");
                }
            }
        }
        if (typeof $ !== 'undefined' && $.fn && $.fn.select2 && $(sel).data('select2')) {
            $(sel).trigger('change');
        }
    }).catch(err => {
        console.error("Erro ao carregar tipos de projeto:", err);
        if (typeof mostrarNotificacao === "function") mostrarNotificacao("Falha ao carregar tipos de projeto.", "danger");
    });
}


async function carregarListas() {
    const clienteId = document.getElementById('selectCliente').value;
    const tipo = document.getElementById('selectTipoProjeto').value;
    const sel = document.getElementById('selectLista');
    sel.innerHTML = '<option value="">Selecione uma Lista</option>';

    if (!clienteId || !tipo) {
        if (typeof $ !== 'undefined' && $.fn && $.fn.select2 && $(sel).data('select2')) { $(sel).trigger('change'); }
        return;
    }
    try {
        // O caminho agora é para a pasta que contém as listas (ex: LPVC, LReforco)
        const refListasRoot = firebase.database().ref(`projetos/${clienteId}/${tipo}/listas`);
        const snapshotListas = await refListasRoot.once('value');
        if (!snapshotListas.exists()) {
            if (typeof mostrarNotificacao === "function") mostrarNotificacao(`Nenhuma lista encontrada em 'projetos/${clienteId}/${tipo}/listas'.`, "info");
            if (typeof $ !== 'undefined' && $.fn && $.fn.select2 && $(sel).data('select2')) { $(sel).trigger('change'); }
            return;
        }
        let algumaListaElegivelAdicionada = false;
        snapshotListas.forEach(listSnap => { // listSnap é cada nó de lista (ex: LPVC)
            const nomeLista = listSnap.key;
            // Assumimos que listSnap.val() contém os itens diretamente (como array ou objeto)
            const itensDaLista = listSnap.val() || {};
            const arrayDeItens = Array.isArray(itensDaLista) ? itensDaLista : (typeof itensDaLista === 'object' && itensDaLista !== null ? Object.values(itensDaLista) : []);

            const elegivel = arrayDeItens.some(it =>
                it && typeof it === 'object' && ((parseFloat(it.empenho || 0) > 0) || (parseFloat(it.quantidadeRecebida || 0) > 0))
            );

            if (elegivel) {
                const opt = document.createElement('option');
                opt.value = nomeLista;
                opt.textContent = nomeLista;
                sel.appendChild(opt);
                algumaListaElegivelAdicionada = true;
            }
        });
        if (!algumaListaElegivelAdicionada) {
            if (typeof mostrarNotificacao === "function") mostrarNotificacao("Nenhuma lista elegível (com itens empenhados/recebidos) encontrada.", "info");
        }
        if (typeof $ !== 'undefined' && $.fn && $.fn.select2 && $(sel).data('select2')) {
            $(sel).trigger('change');
        }
    } catch (err) {
        console.error("Erro ao carregar listas:", err);
        if (typeof mostrarNotificacao === "function") mostrarNotificacao("Falha ao carregar listas de material.", "danger");
        if (typeof $ !== 'undefined' && $.fn && $.fn.select2 && $(sel).data('select2')) { $(sel).trigger('change'); }
    }
}

function formatarDetalhes(d) {
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

async function processarArquivoInputSeparacao(arquivo, clienteId, tipoProjeto, nomeListaOriginal) {
    return new Promise((resolve, reject) => {
        if (!arquivo) {
            return reject(new Error('Nenhum arquivo selecionado.'));
        }
        const tipoArquivo = obterTipoArquivo(arquivo.name);
        if (!tipoArquivo) {
            return reject(new Error('Formato de arquivo não suportado.'));
        }
        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                let itensProcessados;
                switch (tipoArquivo) {
                    case 'csv': itensProcessados = processarCSV(e.target.result); break;
                    case 'xlsx': itensProcessados = await processarXLSX(e.target.result, arquivo.name); break;
                    case 'xml': itensProcessados = processarXML(e.target.result); break;
                    default: return reject(new Error('Tipo de arquivo não pode ser processado.'));
                }
                if (!itensProcessados || itensProcessados.length === 0) {
                    return reject(new Error('Nenhum item encontrado no arquivo de separação. Verifique o conteúdo e o formato do arquivo.'));
                }
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
            reader.readAsText(arquivo, 'ISO-8859-1');
        }
    });
}

async function compararListas(clienteId, tipoProjeto, nomeListaOriginal) {
    try {
        // Caminho para os ITENS da lista original.
        // A função carregarListas já assume que os itens estão diretamente sob nomeListaOriginal.
        const refOriginal = firebase.database().ref(`projetos/${clienteId}/${tipoProjeto}/listas/${nomeListaOriginal}`);
        const snapshotOriginal = await refOriginal.once('value');
        let listaOriginalItensData = {};
        if (snapshotOriginal.exists()) {
            listaOriginalItensData = snapshotOriginal.val() || {};
        }
        const listaOriginalItensArray = Array.isArray(listaOriginalItensData) ? listaOriginalItensData : (typeof listaOriginalItensData === 'object' && listaOriginalItensData !== null ? Object.values(listaOriginalItensData) : []);
        
        const refSepProdItens = firebase.database().ref(`SeparacaoProd/${clienteId}/${tipoProjeto}/${nomeListaOriginal}/itens`);
        const snapshotSepProd = await refSepProdItens.once('value');
        let listaSepProdItensArray = [];
        if (snapshotSepProd.exists()) {
            const val = snapshotSepProd.val();
            listaSepProdItensArray = Array.isArray(val) ? val : (typeof val === 'object' && val !== null ? Object.values(val) : []);
            listaSepProdItensArray = listaSepProdItensArray.filter(item => item && item.codigo);
        } else {
             if (typeof mostrarNotificacao === "function") mostrarNotificacao("Nenhuma lista de separação (upload) encontrada para comparar.", "warning");
        }
        
        const itensProcessadosParaCorrecao = [];
        const codigosSepProdProcessados = new Set();
        const mapaListaOriginal = new Map();

        listaOriginalItensArray.filter(item => item && item.codigo).forEach(item => {
            mapaListaOriginal.set(String(item.codigo).trim(), {
                ...item,
                quantidadeDisponivelOriginal: (parseFloat(item.empenho || 0) + parseFloat(item.quantidadeRecebida || 0))
            });
        });

        for (const itemSep of listaSepProdItensArray) {
            if (!itemSep || !itemSep.codigo) continue;
            const codigoSep = String(itemSep.codigo).trim();
            codigosSepProdProcessados.add(codigoSep);
            const quantidadeDesejadaSeparacao = parseFloat(itemSep.quantidade || 0);
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
                qtdCompraFinal: 0, 
                qtdUsadaEstoque: 0,
                fonteEstoque: "",
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
                    itemProcessado.statusComparacao = "Liberar para Separação";
                    itemProcessado.quantidadeParaSepararReal = quantidadeDesejadaSeparacao;
                } else if (quantidadeDesejadaSeparacao < quantidadeDisponivel) {
                    itemProcessado.statusComparacao = "Liberar e Devolver";
                    itemProcessado.quantidadeParaSepararReal = quantidadeDesejadaSeparacao;
                    itemProcessado.quantidadeDevolucaoEstoque = parseFloat((quantidadeDisponivel - quantidadeDesejadaSeparacao).toFixed(3));
                } else { 
                    itemProcessado.statusComparacao = "Parcial - Comprar";
                    itemProcessado.quantidadeParaSepararReal = quantidadeDisponivel;
                    itemProcessado.quantidadeCompraAdicional = parseFloat((quantidadeDesejadaSeparacao - quantidadeDisponivel).toFixed(3));
                }
            } else { 
                itemProcessado.statusComparacao = "Item Novo";
                itemProcessado.quantidadeCompraAdicional = quantidadeDesejadaSeparacao;
            }
            itemProcessado.qtdCompraFinal = itemProcessado.quantidadeCompraAdicional;
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
                        statusComparacao: "Devolver Estoque Integral",
                        qtdCompraFinal: 0,
                        qtdUsadaEstoque: 0,
                        fonteEstoque: "",
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
        if (typeof mostrarNotificacao === "function") mostrarNotificacao(`Erro na comparação: ${error.message}`, "danger");
        throw error;
    }
}

async function tentarCarregarCorrecaoExistente(clienteId, tipoProjeto, nomeListaOriginal) {
    if (!tabelaCorrecao) {
        console.warn("Tabela de correção não inicializada, não é possível carregar dados existentes.");
        return;
    }
    tabelaCorrecao.clear(); 
    const refCorrecao = firebase.database().ref(`CorrecaoFinal/${clienteId}/${tipoProjeto}/${nomeListaOriginal}/itensProcessados`);
    try {
        const snapshot = await refCorrecao.once('value');
        if (snapshot.exists()) {
            const itensProcessados = snapshot.val(); 
            if (Array.isArray(itensProcessados) && itensProcessados.length > 0) {
                preencherTabelaCorrecao(itensProcessados);
                if (typeof mostrarNotificacao === "function") mostrarNotificacao("Separação processada anteriormente carregada.", "info");
                document.getElementById('btnAbrirModalNecessidade').disabled = !itensProcessados.some(item => parseFloat(item.quantidadeCompraAdicional || 0) > 0);
            } else {
                if (typeof mostrarNotificacao === "function") mostrarNotificacao("Nenhuma separação processada anteriormente encontrada para esta lista.", "info");
                tabelaCorrecao.draw(); 
                document.getElementById('btnAbrirModalNecessidade').disabled = true;
            }
        } else {
            if (typeof mostrarNotificacao === "function") mostrarNotificacao("Nenhuma separação processada anteriormente encontrada para esta lista.", "info");
            tabelaCorrecao.draw();
            document.getElementById('btnAbrirModalNecessidade').disabled = true;
        }
    } catch (error) {
        console.error("Erro ao buscar dados de CorrecaoFinal existente:", error);
        if (typeof mostrarNotificacao === "function") mostrarNotificacao(`Erro ao buscar dados anteriores: ${error.message}`, "danger");
        tabelaCorrecao.draw();
        document.getElementById('btnAbrirModalNecessidade').disabled = true;
    }
}

async function gerarSeparacao() {
    const clienteId = document.getElementById('selectCliente').value;
    const tipo = document.getElementById('selectTipoProjeto').value;
    const lista = document.getElementById('selectLista').value;
    const arquivoInput = document.getElementById('inputArquivo');
    const arquivo = arquivoInput ? arquivoInput.files[0] : null;

    if (!clienteId || !tipo || !lista || !arquivo) {
        if (typeof mostrarNotificacao === "function") mostrarNotificacao('Selecione cliente, tipo de projeto, lista original e o arquivo de separação.', 'warning');
        return;
    }

    const btnGerar = document.getElementById('btnGerar');
    if (btnGerar) {
        btnGerar.disabled = true;
        btnGerar.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Processando...';
    }
    if (tabelaCorrecao) { tabelaCorrecao.clear().draw(); atualizarTotais(); }
    document.getElementById('btnAbrirModalNecessidade').disabled = true;

    try {
        if (typeof mostrarNotificacao === "function") mostrarNotificacao('Processando arquivo de separação...', 'info');
        await processarArquivoInputSeparacao(arquivo, clienteId, tipo, lista);
        if (typeof mostrarNotificacao === "function") mostrarNotificacao('Comparando listas...', 'info');
        const itensParaTabela = await compararListas(clienteId, tipo, lista);
        if (typeof mostrarNotificacao === "function") mostrarNotificacao('Preenchendo tabela de resultados...', 'info');
        preencherTabelaCorrecao(itensParaTabela);
        if (typeof mostrarNotificacao === "function") mostrarNotificacao('Processamento concluído com sucesso!', 'success');
    } catch (err) {
        console.error("Erro no processo de geração de separação:", err);
        if (typeof mostrarNotificacao === "function") mostrarNotificacao(`Erro no processamento: ${err.message || 'Erro desconhecido.'}`, 'danger');
        if (tabelaCorrecao) { tabelaCorrecao.clear().draw(); atualizarTotais(); }
        document.getElementById('btnAbrirModalNecessidade').disabled = true;
    } finally {
        if (btnGerar) {
            btnGerar.disabled = false;
            btnGerar.innerHTML = '<i class="fas fa-play me-2"></i>Processar';
        }
    }
}

function preencherTabelaCorrecao(dados) {
    if (!tabelaCorrecao) {
        console.error("Instância da DataTable 'tabelaCorrecao' não encontrada.");
        if (typeof mostrarNotificacao === "function") mostrarNotificacao("Erro: Tabela de correção não inicializada.", "danger");
        return;
    }
    tabelaCorrecao.clear(); 
    if (Array.isArray(dados) && dados.length > 0) {
        tabelaCorrecao.rows.add(dados).draw();
        const precisaCompra = dados.some(item => parseFloat(item.quantidadeCompraAdicional || 0) > 0);
        document.getElementById('btnAbrirModalNecessidade').disabled = !precisaCompra;
        atualizarTotais();
    } else {
        tabelaCorrecao.draw();
        document.getElementById('btnAbrirModalNecessidade').disabled = true;
        atualizarTotais();
    }
}

async function abrirModalNecessidadeCompra() {
    const clienteId = document.getElementById('selectCliente').value;
    const tipoProjeto = document.getElementById('selectTipoProjeto').value;
    const nomeListaOriginal = document.getElementById('selectLista').value;

    if (!clienteId || !tipoProjeto || !nomeListaOriginal) {
        if (typeof mostrarNotificacao === "function") mostrarNotificacao("Selecione cliente, tipo de projeto e lista para gerar necessidade.", "warning");
        return;
    }

    const refCorrecao = firebase.database().ref(`CorrecaoFinal/${clienteId}/${tipoProjeto}/${nomeListaOriginal}/itensProcessados`);
    try {
        const snapshot = await refCorrecao.once('value');
        if (!snapshot.exists()) {
            if (typeof mostrarNotificacao === "function") mostrarNotificacao("Nenhum item processado encontrado para esta lista.", "info");
            return;
        }

        const itensProcessados = snapshot.val();
        const itensParaModal = Array.isArray(itensProcessados) ? itensProcessados.filter(item => parseFloat(item.quantidadeCompraAdicional || 0) > 0) : [];

        const tbodyModal = document.querySelector('#tabelaItensNecessidade tbody');
        if (!tbodyModal) {
            console.error("Corpo da tabela do modal não encontrado: #tabelaItensNecessidade tbody");
            return;
        }
        tbodyModal.innerHTML = ''; 

        if (itensParaModal.length === 0) {
            if (typeof mostrarNotificacao === "function") mostrarNotificacao("Nenhum item com necessidade de compra adicional.", "info");
            return; 
        }
        
        const selecionarTodosModalCheckbox = document.getElementById('selecionarTodosItensModal');
        if (selecionarTodosModalCheckbox) selecionarTodosModalCheckbox.checked = false;

        itensParaModal.forEach((item) => {
            const tr = document.createElement('tr');
            const originalIndex = itensProcessados.findIndex(origItem => origItem.codigo === item.codigo && origItem.descricao === item.descricao); 
            tr.setAttribute('data-original-index', originalIndex);
            
            tr.innerHTML = `
                <td><input type="checkbox" class="form-check-input item-necessidade-checkbox"></td>
                <td>${item.codigo}</td>
                <td>${item.descricao}</td>
                <td>${item.quantidadeCompraAdicional}</td>
                <td><input type="number" class="form-control form-control-sm qtd-a-comprar" value="${item.qtdCompraFinal !== undefined ? item.qtdCompraFinal : (item.quantidadeCompraAdicional || 0)}" min="0"></td>
                <td><input type="number" class="form-control form-control-sm qtd-usar-estoque" value="${item.qtdUsadaEstoque || 0}" min="0"></td>
                <td><input type="text" class="form-control form-control-sm fonte-estoque" value="${item.fonteEstoque || ''}" placeholder="Ex: Estoque Local, Cliente X"></td>
            `;
            tbodyModal.appendChild(tr);
        });

        if (modalNecessidadeCompra) {
            modalNecessidadeCompra.show();
        } else {
            console.error("Instância do modal 'modalNecessidadeCompra' não encontrada.");
        }

    } catch (error) {
        console.error("Erro ao abrir modal de necessidade de compra:", error);
        if (typeof mostrarNotificacao === "function") mostrarNotificacao("Erro ao preparar dados para necessidade de compra.", "danger");
    }
}

async function tratarNecessidadesDeCompra() {
    const clienteId = document.getElementById('selectCliente').value;
    const tipoProjeto = document.getElementById('selectTipoProjeto').value;
    const nomeListaOriginal = document.getElementById('selectLista').value;

    const btnTratar = document.getElementById('btnTratarNecessidades');
    btnTratar.disabled = true;
    btnTratar.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Salvando...';

    const refCorrecaoItens = firebase.database().ref(`CorrecaoFinal/${clienteId}/${tipoProjeto}/${nomeListaOriginal}/itensProcessados`);
    
    try {
        const snapshot = await refCorrecaoItens.once('value');
        if (!snapshot.exists()) {
            if (typeof mostrarNotificacao === "function") mostrarNotificacao("Erro: Itens de Correção Final não encontrados para atualizar.", "danger");
            throw new Error("Itens de Correção Final não encontrados.");
        }
        let itensProcessados = snapshot.val(); 
        if (!Array.isArray(itensProcessados)) {
             itensProcessados = typeof itensProcessados === 'object' && itensProcessados !== null ? Object.values(itensProcessados) : [];
             if (!Array.isArray(itensProcessados)) { 
                if (typeof mostrarNotificacao === "function") mostrarNotificacao("Erro: Formato inesperado dos itens de Correção Final.", "danger");
                throw new Error("Formato inesperado dos itens de Correção Final.");
             }
        }

        const linhasModal = document.querySelectorAll('#tabelaItensNecessidade tbody tr');
        const itensParaCompraGlobal = []; 
        let algumaModificacaoFeita = false;

        linhasModal.forEach(tr => {
            const checkbox = tr.querySelector('.item-necessidade-checkbox');
            if (checkbox && checkbox.checked) {
                algumaModificacaoFeita = true;
                const originalIndex = parseInt(tr.getAttribute('data-original-index'), 10);

                const qtdAComprarInput = tr.querySelector('.qtd-a-comprar');
                const qtdUsarEstoqueInput = tr.querySelector('.qtd-usar-estoque');
                const fonteEstoqueInput = tr.querySelector('.fonte-estoque');

                const qtdCompraFinal = parseFloat(qtdAComprarInput.value) || 0;
                const qtdUsadaEstoque = parseFloat(qtdUsarEstoqueInput.value) || 0;
                const fonteEstoque = fonteEstoqueInput.value.trim();
                
                if (originalIndex >= 0 && originalIndex < itensProcessados.length) {
                    const itemParaAtualizar = itensProcessados[originalIndex];
                    itemParaAtualizar.qtdCompraFinal = qtdCompraFinal;
                    itemParaAtualizar.qtdUsadaEstoque = qtdUsadaEstoque;
                    itemParaAtualizar.fonteEstoque = fonteEstoque;
                    
                    if (qtdCompraFinal > 0) {
                        itensParaCompraGlobal.push({
                            ...itemParaAtualizar, 
                            quantidade: qtdCompraFinal, 
                            lista: `${nomeListaOriginal} FINAL`, 
                            status: "Pendente de Compra", 
                            dataSolicitacaoCompra: new Date().toISOString().split('T')[0] 
                        });
                    }
                } else {
                    console.warn("Índice original inválido ou item não encontrado para atualização no modal:", originalIndex, tr.querySelector('td:nth-child(2)').textContent);
                }
            }
        });

        if (!algumaModificacaoFeita) {
            if (typeof mostrarNotificacao === "function") mostrarNotificacao("Nenhum item selecionado para tratar.", "info");
            btnTratar.disabled = false;
            btnTratar.innerHTML = 'Tratar Dados e Gerar Compras';
            return;
        }

        await refCorrecaoItens.set(itensProcessados);
        if (typeof mostrarNotificacao === "function") mostrarNotificacao("Necessidades de compra atualizadas em Correção Final.", "success");

        if (itensParaCompraGlobal.length > 0) {
            await enviarItensParaCompras(clienteId, itensParaCompraGlobal);
        }

        if (modalNecessidadeCompra) modalNecessidadeCompra.hide();
        tentarCarregarCorrecaoExistente(clienteId, tipoProjeto, nomeListaOriginal);

    } catch (error) {
        console.error("Erro ao tratar necessidades de compra:", error);
        if (typeof mostrarNotificacao === "function") mostrarNotificacao("Erro ao salvar necessidades de compra.", "danger");
    } finally {
        btnTratar.disabled = false;
        btnTratar.innerHTML = 'Tratar Dados e Gerar Compras';
    }
}

async function enviarItensParaCompras(clienteId, itensParaEnviar) {
    if (!clienteId || !itensParaEnviar || itensParaEnviar.length === 0) {
        console.warn("Dados insuficientes para enviar para compras.");
        return;
    }
    const refComprasCliente = firebase.database().ref(`compras/${clienteId}/itens`);

    try {
        const promessas = itensParaEnviar.map(itemCompra => {
            const { 
                quantidadeDesejadaSeparacao, 
                quantidadeDisponivelOriginal, 
                quantidadeParaSepararReal, 
                quantidadeCompraAdicional, 
                quantidadeDevolucaoEstoque, 
                statusComparacao,
                qtdCompraFinal, 
                qtdUsadaEstoque,
                fonteEstoque,
                ...itemParaSalvarEmCompras 
            } = itemCompra;
            
            itemParaSalvarEmCompras.quantidade = itemCompra.quantidade; 
            itemParaSalvarEmCompras.status = itemCompra.status || "Pendente de Compra";
            itemParaSalvarEmCompras.lista = itemCompra.lista; 
            itemParaSalvarEmCompras.dataSolicitacao = itemCompra.dataSolicitacaoCompra || new Date().toISOString().split('T')[0];
            
            return refComprasCliente.push(itemParaSalvarEmCompras); 
        });

        await Promise.all(promessas);
        if (typeof mostrarNotificacao === "function") mostrarNotificacao(`${itensParaEnviar.length} item(ns) enviados para a lista de Compras.`, "success");

    } catch (error) {
        console.error("Erro ao enviar itens para Compras:", error);
        if (typeof mostrarNotificacao === "function") mostrarNotificacao("Falha ao enviar itens para Compras.", "danger");
    }
}

// FIM DO ARQUIVO js/separacao.js
