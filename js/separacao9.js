// INÍCIO DO ARQUIVO js/separacao9.js
// ESTE É O ARQUIVO SEPARACAO9.JS (CORREÇÃO FINAL DO FLUXO DE DADOS)

let tabelaCorrecao = null; // Variável global para a DataTable

document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM completamente carregado (separacao9.js).");

    if (typeof $ !== "undefined" && $.fn && $.fn.select2) {
        $("#selectCliente, #selectTipoProjeto, #selectLista").select2({
            placeholder: "Selecione uma opção",
            allowClear: true,
            width: "100%",
        });
    }

    carregarClientes();
    document.getElementById("selectCliente").addEventListener("change", () => {
        limparSelectHTML("selectTipoProjeto", "Selecione um Tipo de Projeto");
        limparSelectHTML("selectLista", "Selecione uma Lista");
        if (tabelaCorrecao) tabelaCorrecao.clear().draw();
        carregarTiposProjeto();
    });
    document.getElementById("selectTipoProjeto").addEventListener("change", () => {
        limparSelectHTML("selectLista", "Selecione uma Lista");
        if (tabelaCorrecao) tabelaCorrecao.clear().draw();
        carregarListas();
    });

    document.getElementById("selectLista").addEventListener("change", async () => {
        const clienteId = document.getElementById("selectCliente").value;
        const tipoProjeto = document.getElementById("selectTipoProjeto").value;
        const nomeListaOriginal = document.getElementById("selectLista").value;
        if (tabelaCorrecao) tabelaCorrecao.clear().draw();
        if (clienteId && tipoProjeto && nomeListaOriginal) {
            await carregarOuInicializarCorrecaoFinal(clienteId, tipoProjeto, nomeListaOriginal);
        }
    });

    document.getElementById("btnGerar").addEventListener("click", gerarSeparacaoComComparacao);

    const btnGerarNecessidade = document.getElementById("btnGerarNecessidade");
    if (btnGerarNecessidade) {
        btnGerarNecessidade.addEventListener("click", async () => {
            const clienteId = document.getElementById("selectCliente").value;
            const tipoProjeto = document.getElementById("selectTipoProjeto").value;
            const nomeListaOriginal = document.getElementById("selectLista").value;
            if (!clienteId || !tipoProjeto || !nomeListaOriginal) {
                if (typeof mostrarNotificacao === "function") mostrarNotificacao("Selecione Cliente, Tipo de Projeto e Lista.", "warning");
                return;
            }
            try {
                const refCorrecaoFinal = firebase.database().ref(`CorrecaoFinal/${clienteId}/${tipoProjeto}/${nomeListaOriginal}/itensProcessados`);
                const snapshot = await refCorrecaoFinal.once("value");
                const itensProcessados = snapshot.val() || [];

                const itensParaModal = itensProcessados.map((item, index) => ({
                    ...item,
                    originalIndexFirebase: typeof item.originalIndexFirebase !== 'undefined' ? item.originalIndexFirebase : index
                }));

                const itensParaCompra = itensParaModal.filter(item => parseFloat(item.quantidadeCompraAdicional || 0) > 0);
                const tbodyModal = document.querySelector("#tabelaNecessidadeCompra tbody");
                tbodyModal.innerHTML = "";

                if (itensParaCompra.length > 0) {
                    itensParaCompra.forEach((item) => {
                        const row = tbodyModal.insertRow();
                        const qtdCompraFinalValue = item.qtdCompraFinal || 0;
                        const qtdUsadaEstoqueValue = item.qtdUsadaEstoque || 0;
                        const fonteEstoqueValue = item.fonteEstoque || "";
                        const fornecedorValue = item.fornecedor || "";
                        row.innerHTML = `
                            <td><input type="checkbox" class="check-item-necessidade" data-codigo-item="${item.codigo}"></td>
                            <td>${item.codigo || ""}</td><td>${item.descricao || ""}</td>
                            <td>${item.quantidadeCompraAdicional || 0}</td>
                            <td><input type="number" class="form-control form-control-sm" value="${qtdCompraFinalValue}" min="0" data-field="qtdCompraFinal"></td>
                            <td><input type="number" class="form-control form-control-sm" value="${qtdUsadaEstoqueValue}" min="0" data-field="qtdUsadaEstoque"></td>
                            <td><input type="text" class="form-control form-control-sm" value="${fonteEstoqueValue}" data-field="fonteEstoque"></td>
                            <td><input type="text" class="form-control form-control-sm" value="${fornecedorValue}" data-field="fornecedor"></td>
                        `;
                    });
                    new bootstrap.Modal(document.getElementById("modalNecessidadeCompra")).show();
                } else {
                    if (typeof mostrarNotificacao === "function") mostrarNotificacao("Nenhum item com necessidade de compra adicional.", "info");
                }
            } catch (error) {
                console.error("Erro ao carregar itens para necessidade de compra (separacao9.js):", error);
                if (typeof mostrarNotificacao === "function") mostrarNotificacao("Erro ao carregar itens para necessidade.", "danger");
            }
        });
    }

    document.getElementById("btnConfirmarNecessidade").addEventListener("click", async () => {
        const clienteId = document.getElementById("selectCliente").value;
        const tipoProjeto = document.getElementById("selectTipoProjeto").value;
        const nomeListaOriginal = document.getElementById("selectLista").value;
        if (!clienteId || !tipoProjeto || !nomeListaOriginal) return;

        try {
            const refCorrecaoFinal = firebase.database().ref(`CorrecaoFinal/${clienteId}/${tipoProjeto}/${nomeListaOriginal}/itensProcessados`);
            const snapshot = await refCorrecaoFinal.once("value");
            let itensProcessados = snapshot.val() || [];

            const linhasModal = document.querySelectorAll("#tabelaNecessidadeCompra tbody tr");
            let atualizacoesFeitas = false;

            linhasModal.forEach(linha => {
                const checkbox = linha.querySelector(".check-item-necessidade");
                if (checkbox && checkbox.checked) {
                    const codigoItemModal = checkbox.dataset.codigoItem;
                    const itemParaAtualizar = itensProcessados.find(ip => ip.codigo === codigoItemModal);

                    if (itemParaAtualizar) {
                        itemParaAtualizar.qtdCompraFinal = parseFloat(linha.querySelector("[data-field=\'qtdCompraFinal\']").value) || 0;
                        itemParaAtualizar.qtdUsadaEstoque = parseFloat(linha.querySelector("[data-field=\'qtdUsadaEstoque\']").value) || 0;
                        itemParaAtualizar.fonteEstoque = linha.querySelector("[data-field=\'fonteEstoque\']").value.trim();
                        itemParaAtualizar.fornecedor = linha.querySelector("[data-field=\'fornecedor\']").value.trim();
                        atualizacoesFeitas = true;
                    }
                }
            });

            if(atualizacoesFeitas){
                await refCorrecaoFinal.set(itensProcessados);
                if (typeof mostrarNotificacao === "function") mostrarNotificacao("Dados salvos com sucesso!", "success");
                if (tabelaCorrecao) tabelaCorrecao.clear().rows.add(itensProcessados).draw();
            } else {
                if (typeof mostrarNotificacao === "function") mostrarNotificacao("Nenhum item selecionado para atualizar.", "info");
            }
        } catch (error) {
            console.error("Erro ao confirmar necessidade de compra (separacao9.js):", error);
            if (typeof mostrarNotificacao === "function") mostrarNotificacao("Erro ao salvar dados.", "danger");
        }
    });

    if (typeof $ !== "undefined" && $.fn && $.fn.DataTable) {
        if (!$.fn.DataTable.isDataTable("#tabelaCorrecao")) {
            tabelaCorrecao = $("#tabelaCorrecao").DataTable({
                language: { url: "https://cdn.datatables.net/plug-ins/1.11.5/i18n/pt-BR.json" },
                columns: [
                    { title: "Detalhes", className: "dt-control", orderable: false, data: null, defaultContent: '<i class="fas fa-plus-circle text-primary"></i>', width: "15px" },
                    { title: "Código", data: "codigo" },
                    { title: "Descrição", data: "descricao" },
                    { title: "Qtd. Desejada", data: "quantidadeDesejadaSeparacao" },
                    { title: "Qtd. Disponível", data: "quantidadeDisponivelOriginal" },
                    { title: "Qtd. a Separar", data: "quantidadeParaSepararReal" },
                    { title: "Qtd. Compra", data: "quantidadeCompraAdicional" },
                    { title: "Qtd. Devolução", data: "quantidadeDevolucaoEstoque" },
                    { title: "Qtd Compra Final", data: "qtdCompraFinal", defaultContent: "0" },
                    { title: "Qtd Usada Estoque", data: "qtdUsadaEstoque", defaultContent: "0" },
                    { title: "Local Retirada", data: "fonteEstoque", defaultContent: "" },
                    { title: "Status", data: "statusComparacao" },
                ],
                data: [],
                order: [[1, "asc"]],
            });
        } else {
            tabelaCorrecao = $("#tabelaCorrecao").DataTable();
        }
        $("#tabelaCorrecao tbody").on("click", "td.dt-control", function (event) {
            event.stopPropagation();
            var tr = $(this).closest("tr");
            var row = tabelaCorrecao.row(tr);
            if (row.child.isShown()) {
                row.child.hide(); tr.removeClass("shown"); $(this).html('<i class="fas fa-plus-circle text-primary"></i>');
            } else {
                const rowData = row.data();
                if (rowData) { row.child(formatarDetalhes(rowData)).show(); tr.addClass("shown"); $(this).html('<i class="fas fa-minus-circle text-danger"></i>'); }
            }
        });
    } else {
        console.error("jQuery ou DataTables não estão carregados (separacao9.js).");
    }
});

function limparSelectHTML(selectId, placeholderText = "Selecione") {
    const select = document.getElementById(selectId);
    if (select) {
        select.innerHTML = `<option value="">${placeholderText}</option>`;
        if (typeof $ !== "undefined" && $.fn && $.fn.select2 && $(select).data("select2")) $(select).val(null).trigger("change");
    }
}

function carregarClientes() {
    const sel = document.getElementById("selectCliente");
    sel.innerHTML = '<option value="">Selecione</option>';
    firebase.database().ref("clientes").once("value")
        .then((snap) => {
            snap.forEach((child) => {
                const opt = document.createElement("option");
                opt.value = child.key;
                const clienteData = child.val();
                opt.textContent = clienteData.nome_razao_social || clienteData.nome || child.key;
                sel.appendChild(opt);
            });
            if (typeof $ !== "undefined" && $.fn && $.fn.select2 && $(sel).data("select2")) $(sel).trigger("change");
        }).catch((err) => console.error("Erro ao carregar clientes (separacao9.js):", err));
}

function carregarTiposProjeto() {
    const clienteId = document.getElementById("selectCliente").value;
    const sel = document.getElementById("selectTipoProjeto");
    if (!clienteId) return;
    firebase.database().ref(`projetos/${clienteId}`).once("value")
        .then((snap) => {
            const dados = snap.val() || {};
            let tiposAdicionados = 0;
            Object.keys(dados).forEach((tipo) => {
                if (typeof dados[tipo] === "object" && dados[tipo] !== null && dados[tipo].hasOwnProperty("listas")) {
                    const opt = document.createElement("option");
                    opt.value = tipo; opt.textContent = tipo;
                    sel.appendChild(opt);
                    tiposAdicionados++;
                }
            });
            if (tiposAdicionados === 0 && typeof mostrarNotificacao === "function") mostrarNotificacao("Nenhum tipo de projeto com listas encontrado.", "info");
            if (typeof $ !== "undefined" && $.fn && $.fn.select2 && $(sel).data("select2")) $(sel).trigger("change");
        }).catch((err) => console.error("Erro ao carregar tipos de projeto (separacao9.js):", err));
}

async function carregarListas() {
    const clienteId = document.getElementById("selectCliente").value;
    const tipo = document.getElementById("selectTipoProjeto").value;
    const sel = document.getElementById("selectLista");
    sel.innerHTML = '<option value="">Selecione uma Lista</option>';
    if (!clienteId || !tipo) {
        if (typeof $ !== "undefined" && $.fn && $.fn.select2 && $(sel).data("select2")) $(sel).trigger("change");
        return;
    }
    try {
        const refListasRoot = firebase.database().ref(`projetos/${clienteId}/${tipo}/listas`);
        const snapshotListas = await refListasRoot.once("value");
        if (!snapshotListas.exists()) {
            if (typeof mostrarNotificacao === "function") mostrarNotificacao(`Nenhuma lista encontrada.`, "info");
            if (typeof $ !== "undefined" && $.fn && $.fn.select2 && $(sel).data("select2")) $(sel).trigger("change");
            return;
        }
        let algumaListaElegivelAdicionada = false;
        snapshotListas.forEach((listSnap) => {
            const nomeLista = listSnap.key;
            const itensDaListaOrigem = listSnap.val() || {};
            let arrayDeItens = [];
            if (Array.isArray(itensDaListaOrigem.itens)) arrayDeItens = itensDaListaOrigem.itens;
            else if (Array.isArray(itensDaListaOrigem)) arrayDeItens = itensDaListaOrigem;
            else if (typeof itensDaListaOrigem === 'object' && itensDaListaOrigem !== null) arrayDeItens = Object.values(itensDaListaOrigem);
            arrayDeItens = arrayDeItens.filter(it => it != null);

            const elegivel = arrayDeItens.some(it => {
                if (!it || typeof it.codigo === 'undefined') return false;
                const qItem = parseFloat(it.quantidade || 0);
                const empItem = parseFloat(it.empenho || 0);
                const necItem = parseFloat(it.necessidade || 0);
                const qRecebItem = parseFloat(it.quantidadeRecebida || 0);
                const condEmp = (qItem > 0 && empItem >= qItem);
                const condRec = (necItem > 0 && qRecebItem >= necItem);
                return condEmp || condRec;
            });
            if (elegivel) {
                const opt = document.createElement("option");
                opt.value = nomeLista; opt.textContent = nomeLista;
                sel.appendChild(opt);
                algumaListaElegivelAdicionada = true;
            }
        });
        if (!algumaListaElegivelAdicionada && typeof mostrarNotificacao === "function") mostrarNotificacao("Nenhuma lista elegível encontrada.", "info");
        if (typeof $ !== "undefined" && $.fn && $.fn.select2 && $(sel).data("select2")) $(sel).trigger("change");
    } catch (err) {
        console.error("Erro ao carregar listas (separacao9.js):", err);
        if (typeof mostrarNotificacao === "function") mostrarNotificacao("Falha ao carregar listas.", "danger");
    }
}

// Função chamada ao selecionar uma lista.
// Tenta carregar de CorrecaoFinal, se não existir, inicializa a partir da lista de projetos.
async function carregarOuInicializarCorrecaoFinal(clienteId, tipoProjeto, nomeListaOriginal) {
    if (!clienteId || !tipoProjeto || !nomeListaOriginal) {
        if (tabelaCorrecao) tabelaCorrecao.clear().draw();
        return;
    }
    console.log(`[carregarOuInicializarCorrecaoFinal] Para ${clienteId}/${tipoProjeto}/${nomeListaOriginal} (separacao9.js)`);
    const refCorrecaoFinal = firebase.database().ref(`CorrecaoFinal/${clienteId}/${tipoProjeto}/${nomeListaOriginal}/itensProcessados`);

    try {
        const snapshotCorrecao = await refCorrecaoFinal.once("value");
        let itensParaExibirNaTabela = [];

        if (snapshotCorrecao.exists() && snapshotCorrecao.val() !== null ) {
            const dadosCorrecao = snapshotCorrecao.val();
             itensParaExibirNaTabela = Array.isArray(dadosCorrecao) ? dadosCorrecao : (typeof dadosCorrecao === 'object' ? Object.values(dadosCorrecao) : []);
             itensParaExibirNaTabela = itensParaExibirNaTabela.filter(it => it != null && typeof it.codigo !== 'undefined');
            console.log(`[carregarOuInicializarCorrecaoFinal] Dados (${itensParaExibirNaTabela.length}) encontrados em CorrecaoFinal. Usando-os.`);
        } else {
            console.log("[carregarOuInicializarCorrecaoFinal] Nenhum dado em CorrecaoFinal. Inicializando de projetos/...");
            const refListaOriginal = firebase.database().ref(`projetos/${clienteId}/${tipoProjeto}/listas/${nomeListaOriginal}`);
            const snapshotLista = await refListaOriginal.once("value");

            if (!snapshotLista.exists()) {
                console.warn(`[carregarOuInicializarCorrecaoFinal] Lista original não encontrada: projetos/${clienteId}/${tipoProjeto}/listas/${nomeListaOriginal}`);
                if (typeof mostrarNotificacao === "function") mostrarNotificacao("Lista original não encontrada para inicialização.", "warning");
                await refCorrecaoFinal.set([]);
                if (tabelaCorrecao) tabelaCorrecao.clear().draw();
                return;
            }

            const dadosListaOriginal = snapshotLista.val() || {};
            let arrayDeItensOriginais = [];
            if (Array.isArray(dadosListaOriginal.itens)) arrayDeItensOriginais = dadosListaOriginal.itens;
            else if (Array.isArray(dadosListaOriginal)) arrayDeItensOriginais = dadosListaOriginal;
            else if (typeof dadosListaOriginal === 'object' && dadosListaOriginal !== null) {
                 if (Object.values(dadosListaOriginal).every(val => typeof val === 'object' && val !== null && typeof val.codigo !== 'undefined')) {
                    arrayDeItensOriginais = Object.values(dadosListaOriginal);
                }
            }
            arrayDeItensOriginais = arrayDeItensOriginais.filter(it => it != null && typeof it.codigo !== 'undefined');

            console.log(`[carregarOuInicializarCorrecaoFinal] Itens lidos de projetos/... (${arrayDeItensOriginais.length}):`, JSON.parse(JSON.stringify(arrayDeItensOriginais)));

            arrayDeItensOriginais.forEach((it, index) => {
                const quantidadeItem = parseFloat(it.quantidade || 0);
                const empenhoItem = parseFloat(it.empenho || 0);
                const necessidadeItem = parseFloat(it.necessidade || 0);
                const quantidadeRecebidaItem = parseFloat(it.quantidadeRecebida || 0);

                const condicaoEmpenho = (quantidadeItem > 0 && empenhoItem >= quantidadeItem);
                const condicaoRecebido = (necessidadeItem > 0 && quantidadeRecebidaItem >= necessidadeItem);

                console.log(`  [carregarOuInicializarCorrecaoFinal] Avaliando item ${it.codigo}: Qtd=${quantidadeItem}, Emp=${empenhoItem}, Nec=${necessidadeItem}, QtdRec=${quantidadeRecebidaItem}. CondEmp=${condicaoEmpenho}, CondRec=${condicaoRecebido}`);

                if (condicaoEmpenho || condicaoRecebido) {
                    const quantidadeDisponivel = empenhoItem + quantidadeRecebidaItem;
                    let status = "Aguardando Contagem";
                    if (quantidadeDisponivel >= quantidadeItem) status = "Pronto para Separar (Total)";
                    else if (quantidadeDisponivel > 0) status = "Pronto para Separar (Parcial)";
                    else status = "Verificar Disponibilidade";

                    const itemFormatado = {
                        ...it,
                        originalIndexFirebase: index,
                        quantidadeDesejadaSeparacao: 0,
                        quantidadeDisponivelOriginal: quantidadeDisponivel,
                        quantidadeParaSepararReal: 0,
                        quantidadeCompraAdicional: Math.max(0, quantidadeItem - quantidadeDisponivel),
                        quantidadeDevolucaoEstoque: 0,
                        statusComparacao: status,
                        qtdCompraFinal: it.qtdCompraFinal || 0,
                        qtdUsadaEstoque: it.qtdUsadaEstoque || 0,
                        fonteEstoque: it.fonteEstoque || "",
                        fornecedor: it.fornecedor || ""
                    };
                    itensParaExibirNaTabela.push(itemFormatado);
                    console.log(`    > Item ${it.codigo} ELEGÍVEL. Adicionado. Formatado:`, JSON.parse(JSON.stringify(itemFormatado)));
                } else {
                    console.log(`    > Item ${it.codigo} NÃO ELEGÍVEL para exibição inicial.`);
                }
            });
            await refCorrecaoFinal.set(itensParaExibirNaTabela);
            console.log(`[carregarOuInicializarCorrecaoFinal] ${itensParaExibirNaTabela.length} itens elegíveis inicializados e salvos em CorrecaoFinal.`);
        }

        if (tabelaCorrecao) {
            tabelaCorrecao.clear().rows.add(itensParaExibirNaTabela).draw();
            console.log(`[carregarOuInicializarCorrecaoFinal] Tabela atualizada com ${itensParaExibirNaTabela.length} itens de CorrecaoFinal.`);
        }

        if (itensParaExibirNaTabela.length === 0 && typeof mostrarNotificacao === "function") {
            mostrarNotificacao("Nenhum item elegível para separação nesta lista.", "info");
        }

    } catch (error) {
        console.error("Erro em carregarOuInicializarCorrecaoFinal (separacao9.js):", error);
        if (typeof mostrarNotificacao === "function") mostrarNotificacao("Erro ao carregar ou inicializar dados para separação.", "danger");
    }
}


function formatarDetalhes(d) {
    return `<div class="p-3 bg-light border rounded"><dl class="row mb-0">
            <dt class="col-sm-3">Altura:</dt><dd class="col-sm-9">${d.altura || "N/A"}</dd>
            <dt class="col-sm-3">Largura:</dt><dd class="col-sm-9">${d.largura || "N/A"}</dd>
            <dt class="col-sm-3">Medida:</dt><dd class="col-sm-9">${d.medida || "N/A"}</dd>
            <dt class="col-sm-3">Cor:</dt><dd class="col-sm-9">${d.cor || "N/A"}</dd>
            <dt class="col-sm-3">Obs:</dt><dd class="col-sm-9">${d.observacao || "N/A"}</dd></dl></div>`;
}

async function processarArquivoInputSeparacao(arquivo, clienteId, tipoProjeto, nomeListaOriginal) {
    return new Promise((resolve, reject) => {
        if (!arquivo) { resolve([]); return; }
        const tipoArquivo = obterTipoArquivo(arquivo.name);
        if (!tipoArquivo) return reject(new Error("Formato de arquivo não suportado."));
        const reader = new FileReader();
        reader.onload = async function (e) {
            try {
                let itensProcessados;
                switch (tipoArquivo) {
                    case "csv": itensProcessados = processarCSV(e.target.result); break;
                    case "xlsx": itensProcessados = await processarXLSX(e.target.result); break;
                    case "xml": itensProcessados = processarXML(e.target.result); break;
                    default: throw new Error("Tipo de arquivo inesperado.");
                }
                if (!itensProcessados || itensProcessados.length === 0) { resolve([]); return; }
                const itensFormatados = itensProcessados.map(item => ({
                    codigo: String(item.codigo || "N/A").trim(),
                    descricao: item.descricao || "Sem descrição",
                    quantidade: parseFloat(item.quantidade) || 0,
                    altura: item.altura || "", largura: item.largura || "",
                    medida: item.medida || "", cor: item.cor || "",
                    observacao: item.observacao || "",
                })).filter(item => item.quantidade > 0);
                if (itensFormatados.length === 0) { resolve([]); return; }
                const refSeparacaoProd = firebase.database().ref(`SeparacaoProd/${clienteId}/${tipoProjeto}/${nomeListaOriginal}/itens`);
                await refSeparacaoProd.set(itensFormatados);
                resolve(itensFormatados);
            } catch (err) { reject(err); }
        };
        reader.onerror = (e) => reject(new Error("Falha ao ler o arquivo."));
        if (tipoArquivo === "xlsx") reader.readAsArrayBuffer(arquivo);
        else reader.readAsText(arquivo);
    });
}

async function compararEProcessarListas(clienteId, tipoProjeto, nomeListaOriginal) {
    console.log(`[compararEProcessarListas] Iniciando para ${clienteId}/${tipoProjeto}/${nomeListaOriginal} (separacao9.js)`);

    const refBase = firebase.database().ref(`CorrecaoFinal/${clienteId}/${tipoProjeto}/${nomeListaOriginal}/itensProcessados`);
    const snapBase = await refBase.once("value");
    const itensBaseRaw = snapBase.exists() ? snapBase.val() : [];
    const itensBase = (Array.isArray(itensBaseRaw) ? itensBaseRaw : (typeof itensBaseRaw === 'object' && itensBaseRaw !== null ? Object.values(itensBaseRaw) : []))
                      .filter(it => it != null && typeof it.codigo !== 'undefined');

    if (itensBase.length === 0) {
        console.warn("[compararEProcessarListas] Lista base (CorrecaoFinal) está vazia ou inválida. (separacao9.js)");
    }

    const mapItensBase = new Map();
    itensBase.forEach(item => { // item aqui já é o objeto de CorrecaoFinal
        mapItensBase.set(String(item.codigo).trim(), {...item}); // Cria cópia para segurança
    });
    console.log("[compararEProcessarListas] mapItensBase (de CorrecaoFinal) construído. Tamanho:", mapItensBase.size);

    const refSep = firebase.database().ref(`SeparacaoProd/${clienteId}/${tipoProjeto}/${nomeListaOriginal}/itens`);
    const snapSep = await refSep.once("value");
    const listaSeparacaoItens = snapSep.exists() ? (snapSep.val() || []) : [];
    const mapListaSeparacao = new Map();
    listaSeparacaoItens.forEach(item => {
        if (item && typeof item.codigo !== 'undefined') mapListaSeparacao.set(String(item.codigo).trim(), item);
    });
    console.log("[compararEProcessarListas] mapListaSeparacao (de SeparacaoProd) construído. Tamanho:", mapListaSeparacao.size);

    const itensProcessados = [];

    mapItensBase.forEach((itemBaseOriginal, codigo) => {
        let itemProcessado = JSON.parse(JSON.stringify(itemBaseOriginal)); // Cópia profunda para modificação segura
        const itemSeparacao = mapListaSeparacao.get(codigo);

        let qtdDesejadaSeparacao = itemSeparacao ? (parseFloat(itemSeparacao.quantidade) || 0) : 0;
        const qtdDisponivel = parseFloat(itemProcessado.quantidadeDisponivelOriginal || 0);
        const quantidadeOriginalDoItemNaListaDeProjetos = parseFloat(itemProcessado.quantidade || 0);

        // Zera os campos que serão recalculados se houver contagem física
        if (itemSeparacao) {
            itemProcessado.quantidadeParaSepararReal = 0;
            itemProcessado.quantidadeCompraAdicional = 0;
            itemProcessado.quantidadeDevolucaoEstoque = 0;
            itemProcessado.statusComparacao = "";
        } // Se não houver itemSeparacao, os valores de itemBase (já formatados por processarListaSelecionada) são mantidos.

        if (itemSeparacao) {
            itemProcessado.quantidadeDesejadaSeparacao = qtdDesejadaSeparacao;
            if (qtdDesejadaSeparacao <= qtdDisponivel) {
                itemProcessado.statusComparacao = "Item OK";
                itemProcessado.quantidadeParaSepararReal = qtdDesejadaSeparacao;
                itemProcessado.quantidadeDevolucaoEstoque = qtdDisponivel - qtdDesejadaSeparacao;
                itemProcessado.quantidadeCompraAdicional = Math.max(0, quantidadeOriginalDoItemNaListaDeProjetos - itemProcessado.quantidadeParaSepararReal);
            } else {
                itemProcessado.statusComparacao = "Comprar Adicional";
                itemProcessado.quantidadeParaSepararReal = qtdDisponivel;
                itemProcessado.quantidadeCompraAdicional = qtdDesejadaSeparacao - qtdDisponivel;
                itemProcessado.quantidadeDevolucaoEstoque = 0;
            }
        } else {
            // Se o item não foi contado, mantém o status "Aguardando Contagem" e os cálculos iniciais
            // de quantidadeCompraAdicional e quantidadeDisponivelOriginal.
            // Qtd. Desejada, a Separar, Devolução são 0.
            itemProcessado.quantidadeDesejadaSeparacao = 0;
            itemProcessado.quantidadeParaSepararReal = 0;
            itemProcessado.quantidadeDevolucaoEstoque = qtdDisponivel; // Devolve tudo o que estava disponível se não foi contado
            itemProcessado.statusComparacao = "Não Contado na Separação";
            // quantidadeCompraAdicional já foi definida em processarListaSelecionadaParaTabela
        }
        itensProcessados.push(itemProcessado);
    });

    mapListaSeparacao.forEach((itemSeparacao, codigo) => {
        if (!mapItensBase.has(codigo)) {
            let qtdDesejadaSeparacaoInterna = parseFloat(itemSeparacao.quantidade) || 0;
            itensProcessados.push({
                codigo: itemSeparacao.codigo,
                descricao: itemSeparacao.descricao,
                altura: itemSeparacao.altura || "",
                largura: itemSeparacao.largura || "",
                medida: itemSeparacao.medida || "",
                cor: itemSeparacao.cor || "",
                observacao: itemSeparacao.observacao || "",
                quantidadeDesejadaSeparacao: qtdDesejadaSeparacaoInterna,
                quantidadeDisponivelOriginal: 0,
                quantidadeParaSepararReal: 0,
                quantidadeCompraAdicional: qtdDesejadaSeparacaoInterna,
                quantidadeDevolucaoEstoque: 0,
                statusComparacao: "Item Novo - Comprar",
                itemCompraTotal: true,
                qtdCompraFinal: 0,
                qtdUsadaEstoque: 0,
                fonteEstoque: "",
                fornecedor: ""
            });
        }
    });

    console.log("[compararEProcessarListas] Itens processados FINAIS (antes de salvar):", itensProcessados);
    if (itensProcessados.length === 0 && mapItensBase.size === 0 && mapListaSeparacao.size === 0 ) {
    } else if (itensProcessados.length === 0) {
        console.warn("[compararEProcessarListas] NENHUM item processado para CorrecaoFinal (separacao9.js).");
    }

    const refCorrecaoFinal = firebase.database().ref(`CorrecaoFinal/${clienteId}/${tipoProjeto}/${nomeListaOriginal}/itensProcessados`);
    await refCorrecaoFinal.set(itensProcessados);
    return itensProcessados;
}

async function gerarSeparacaoComComparacao() {
    const clienteId = document.getElementById("selectCliente").value;
    const tipoProjeto = document.getElementById("selectTipoProjeto").value;
    const nomeListaOriginal = document.getElementById("selectLista").value;
    const inputArquivo = document.getElementById("inputArquivo");
    const arquivo = inputArquivo.files[0];

    if (!clienteId || !tipoProjeto || !nomeListaOriginal) {
        if (typeof mostrarNotificacao === "function") mostrarNotificacao("Selecione Cliente, Tipo de Projeto e Lista.", "warning");
        return;
    }

    if (typeof mostrarNotificacao === "function") mostrarNotificacao("Processando...", "info", 3000);
    const btnGerarElem = document.getElementById("btnGerar");
    if(btnGerarElem) btnGerarElem.disabled = true;

    try {
        if (arquivo) {
            await processarArquivoInputSeparacao(arquivo, clienteId, tipoProjeto, nomeListaOriginal);
        } else {
            const refSeparacaoProd = firebase.database().ref(`SeparacaoProd/${clienteId}/${tipoProjeto}/${nomeListaOriginal}/itens`);
            await refSeparacaoProd.set([]);
        }

        const itensCorrecaoFinal = await compararEProcessarListas(clienteId, tipoProjeto, nomeListaOriginal);

        if (tabelaCorrecao) {
            tabelaCorrecao.clear().rows.add(itensCorrecaoFinal).draw();
        }

        if (itensCorrecaoFinal.length > 0) {
            if (typeof mostrarNotificacao === "function") mostrarNotificacao("Processamento de separação concluído!", "success");
        } else {
            if (typeof mostrarNotificacao === "function") mostrarNotificacao("Nenhum item resultante após processamento.", "warning", 5000);
        }

    } catch (error) {
        console.error("Erro em gerarSeparacaoComComparacao (separacao9.js):", error);
        if (typeof mostrarNotificacao === "function") mostrarNotificacao(`Erro: ${error.message}`, "danger");
    } finally {
        if(btnGerarElem) btnGerarElem.disabled = false;
        if(inputArquivo) inputArquivo.value = "";
    }
}


function obterTipoArquivo(nomeArquivo) {
    if (!nomeArquivo) return null;
    const ext = nomeArquivo.split(".").pop().toLowerCase();
    if (["csv"].includes(ext)) return "csv";
    if (["xlsx", "xls"].includes(ext)) return "xlsx";
    if (["xml"].includes(ext)) return "xml";
    return null;
}

function processarCSV(conteudo) {
    const linhas = conteudo.split(/\r\n|\n/).filter(line => line.trim() !== "");
    if (linhas.length < 1) return [];
    const cabecalho = linhas[0].split(";").map(h => h.trim());
    const dados = [];
    for (let i = 1; i < linhas.length; i++) {
        const valores = linhas[i].split(";");
        let item = {};
        cabecalho.forEach((col, index) => {
            item[col] = valores[index] ? valores[index].trim() : "";
        });
        dados.push(item);
    }
    return dados;
}

async function processarXLSX(data) {
    if (typeof XLSX === 'undefined') {
        console.error("A biblioteca XLSX (SheetJS) não está carregada (separacao9.js).");
        throw new Error("Biblioteca de processamento de Excel não encontrada.");
    }
    const workbook = XLSX.read(data, { type: "array" });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) return [];
    const worksheet = workbook.Sheets[firstSheetName];
    const json = XLSX.utils.sheet_to_json(worksheet);
    return json.map(row => ({
        codigo: String(row["Código"] || row["CODIGO"] || row["codigo"] || "").trim(),
        descricao: String(row["Descrição"] || row["DESCRICAO"] || row["descricao"] || "").trim(),
        quantidade: parseFloat(row["Quantidade"]) || parseFloat(row["QUANTIDADE"]) || parseFloat(row["quantidade"]) || 0,
        altura: String(row["Altura"] || row["ALTURA"] || row["altura"] || "").trim(),
        largura: String(row["Largura"] || row["LARGURA"] || row["largura"] || "").trim(),
        medida: String(row["Medida"] || row["MEDIDA"] || row["medida"] || "").trim(),
        cor: String(row["Cor"] || row["COR"] || row["cor"] || "").trim(),
        observacao: String(row["Observação"] || row["OBSERVACAO"] || row["observacao"] || "").trim()
    }));
}

function processarXML(conteudo) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(conteudo, "text/xml");
    const itens = [];
    const itemNodes = xmlDoc.querySelectorAll("item");
    itemNodes.forEach(node => {
        const item = {};
        item.codigo = node.querySelector("codigo")?.textContent.trim() || "";
        item.descricao = node.querySelector("descricao")?.textContent.trim() || "";
        item.quantidade = parseFloat(node.querySelector("quantidade")?.textContent) || 0;
        item.altura = node.querySelector("altura")?.textContent.trim() || "";
        item.largura = node.querySelector("largura")?.textContent.trim() || "";
        item.medida = node.querySelector("medida")?.textContent.trim() || "";
        item.cor = node.querySelector("cor")?.textContent.trim() || "";
        item.observacao = node.querySelector("observacao")?.textContent.trim() || "";
        itens.push(item);
    });
    return itens;
}

// FIM DO ARQUIVO js/separacao9.js
// ESTE É O ARQUIVO SEPARACAO9.JS
