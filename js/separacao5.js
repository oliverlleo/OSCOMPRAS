// INÍCIO DO ARQUIVO js/separacao5.js
// ESTE É O ARQUIVO SEPARACAO5.JS (para verificação e teste final)

let tabelaCorrecao = null; // Variável global para a DataTable

document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM completamente carregado (separacao5.js).");

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

    // Listener para selectLista agora chama processarListaSelecionada
    document.getElementById("selectLista").addEventListener("change", async () => {
        const clienteId = document.getElementById("selectCliente").value;
        const tipoProjeto = document.getElementById("selectTipoProjeto").value;
        const nomeListaOriginal = document.getElementById("selectLista").value;

        if (tabelaCorrecao) tabelaCorrecao.clear().draw();

        if (clienteId && tipoProjeto && nomeListaOriginal) {
            await processarListaSelecionadaParaTabela(clienteId, tipoProjeto, nomeListaOriginal);
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
                console.error("Erro ao carregar itens para necessidade de compra (separacao5.js):", error);
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
            console.error("Erro ao confirmar necessidade de compra (separacao5.js):", error);
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
        console.error("jQuery ou DataTables não estão carregados (separacao5.js).");
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
        }).catch((err) => console.error("Erro ao carregar clientes (separacao5.js):", err));
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
        }).catch((err) => console.error("Erro ao carregar tipos de projeto (separacao5.js):", err));
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
        console.error("Erro ao carregar listas (separacao5.js):", err);
        if (typeof mostrarNotificacao === "function") mostrarNotificacao("Falha ao carregar listas.", "danger");
    }
}

// Função para carregar e PROCESSAR itens da lista original para a tabela e CorrecaoFinal ao selecionar
async function processarListaSelecionadaParaTabela(clienteId, tipoProjeto, nomeListaOriginal) {
    if (!clienteId || !tipoProjeto || !nomeListaOriginal) {
        if (tabelaCorrecao) tabelaCorrecao.clear().draw();
        return;
    }
    console.log(`[processarListaSelecionadaParaTabela] Para ${clienteId}/${tipoProjeto}/${nomeListaOriginal} (separacao5.js)`);
    try {
        const refListaOriginal = firebase.database().ref(`projetos/${clienteId}/${tipoProjeto}/listas/${nomeListaOriginal}`);
        const snapshotLista = await refListaOriginal.once("value");
        if (!snapshotLista.exists()) {
            if (tabelaCorrecao) tabelaCorrecao.clear().draw();
            if (typeof mostrarNotificacao === "function") mostrarNotificacao("Lista original não encontrada.", "warning");
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

        const itensParaCorrecaoFinal = [];
        arrayDeItensOriginais.forEach((it, index) => {
            const quantidadeItem = parseFloat(it.quantidade || 0);
            const empenhoItem = parseFloat(it.empenho || 0);
            const necessidadeItem = parseFloat(it.necessidade || 0);
            const quantidadeRecebidaItem = parseFloat(it.quantidadeRecebida || 0);

            const condicaoEmpenho = (quantidadeItem > 0 && empenhoItem >= quantidadeItem);
            const condicaoRecebido = (necessidadeItem > 0 && quantidadeRecebidaItem >= necessidadeItem);

            if (condicaoEmpenho || condicaoRecebido) {
                const quantidadeDisponivel = empenhoItem + quantidadeRecebidaItem;
                let status = "Aguardando Contagem";
                if (quantidadeDisponivel >= quantidadeItem) status = "Pronto para Separar (Total)";
                else if (quantidadeDisponivel > 0) status = "Pronto para Separar (Parcial)";
                else status = "Verificar Disponibilidade"; // Improvável se elegível

                itensParaCorrecaoFinal.push({
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
                });
            }
        });

        // Salva em CorrecaoFinal
        const refCorrecaoFinal = firebase.database().ref(`CorrecaoFinal/${clienteId}/${tipoProjeto}/${nomeListaOriginal}/itensProcessados`);
        await refCorrecaoFinal.set(itensParaCorrecaoFinal);
        console.log(`[processarListaSelecionadaParaTabela] ${itensParaCorrecaoFinal.length} itens elegíveis salvos em CorrecaoFinal.`);

        if (tabelaCorrecao) {
            tabelaCorrecao.clear().rows.add(itensParaCorrecaoFinal).draw();
        }

        if (itensParaCorrecaoFinal.length === 0 && typeof mostrarNotificacao === "function") {
            mostrarNotificacao("Nenhum item elegível para separação nesta lista.", "info");
        }
    } catch (error) {
        console.error("Erro em processarListaSelecionadaParaTabela (separacao5.js):", error);
        if (typeof mostrarNotificacao === "function") mostrarNotificacao("Erro ao processar lista selecionada.", "danger");
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

// Esta função é chamada pela `gerarSeparacaoComComparacao`
async function compararEProcessarListas(clienteId, tipoProjeto, nomeListaOriginal) {
    console.log(`[compararEProcessarListas] Iniciando para ${clienteId}/${tipoProjeto}/${nomeListaOriginal} (separacao5.js)`);

    // AGORA LÊ DE CorrecaoFinal como base (que foi populado por processarListaSelecionadaParaTabela)
    const refBase = firebase.database().ref(`CorrecaoFinal/${clienteId}/${tipoProjeto}/${nomeListaOriginal}/itensProcessados`);
    const snapBase = await refBase.once("value");
    const itensBase = snapBase.exists() ? (snapBase.val() || []) : [];

    if (itensBase.length === 0) {
        console.warn("[compararEProcessarListas] Lista base (CorrecaoFinal) está vazia. Nada para comparar.");
        // return []; // Retorna array vazio se não há base para comparar, ou podemos ler a original novamente como fallback?
                   // Por ora, vamos assumir que se CorrecaoFinal está vazio, a carga inicial falhou ou não havia itens.
    }

    const mapItensBase = new Map();
    itensBase.forEach(item => {
        if (item && typeof item.codigo !== 'undefined') {
            mapItensBase.set(String(item.codigo).trim(), item);
        }
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

    // Itera sobre os itens que estavam na tabela (vindos de CorrecaoFinal, que por sua vez vieram da lista original elegível)
    mapItensBase.forEach((itemBase, codigo) => {
        const itemSeparacao = mapListaSeparacao.get(codigo); // Item da contagem física

        let qtdDesejadaSeparacao = itemSeparacao ? (parseFloat(itemSeparacao.quantidade) || 0) : 0;
        // quantidadeDisponivelOriginal já está em itemBase
        const qtdDisponivel = parseFloat(itemBase.quantidadeDisponivelOriginal || 0);

        let qtdRealASeparar = 0;
        let qtdCompraAdicional = 0;
        let qtdDevolucaoEstoque = 0;
        let statusComparacao = itemBase.statusComparacao; // Mantém o status inicial se não for contado

        if (itemSeparacao) { // Item foi contado na separação física
            if (qtdDesejadaSeparacao <= qtdDisponivel) {
                statusComparacao = "Item OK";
                qtdRealASeparar = qtdDesejadaSeparacao;
                qtdDevolucaoEstoque = qtdDisponivel - qtdDesejadaSeparacao;
                 qtdCompraAdicional = 0; // Garante que não haja compra se o desejado for atendido
            } else { // qtdDesejadaSeparacao > qtdDisponivel
                statusComparacao = "Comprar Adicional";
                qtdRealASeparar = qtdDisponivel;
                qtdCompraAdicional = qtdDesejadaSeparacao - qtdDisponivel;
                qtdDevolucaoEstoque = 0;
            }
        } else { // Item da lista original (e elegível) NÃO foi contado na separação física
            statusComparacao = "Não Contado na Separação";
            qtdDesejadaSeparacao = 0;
            qtdRealASeparar = 0;
            qtdDevolucaoEstoque = qtdDisponivel;
            // A necessidade de compra adicional já foi calculada em carregarItensParaSeparacaoNaTabela
            // e está em itemBase.quantidadeCompraAdicional. Não recalculamos aqui a menos que a lógica mude.
            // Se não foi contado, a quantidadeCompraAdicional original (baseada na qtd total do item) permanece.
            qtdCompraAdicional = parseFloat(itemBase.quantidadeCompraAdicional || 0);
        }

        itensProcessados.push({
            ...itemBase, // Pega todos os campos de itemBase (que já tem os dados originais + formatação inicial)
            quantidadeDesejadaSeparacao: qtdDesejadaSeparacao,
            // quantidadeDisponivelOriginal já está em itemBase
            quantidadeParaSepararReal: qtdRealASeparar,
            quantidadeCompraAdicional: qtdCompraAdicional,
            quantidadeDevolucaoEstoque: qtdDevolucaoEstoque,
            statusComparacao: statusComparacao,
            itemCompraTotal: false, // Esta flag é para itens que são SÓ do arquivo de separação
        });
    });

    // Adiciona itens que estão APENAS na lista de separação física (novos)
    mapListaSeparacao.forEach((itemSeparacao, codigo) => {
        if (!mapItensBase.has(codigo)) {
            let qtdDesejadaSeparacaoInterna = parseFloat(itemSeparacao.quantidade) || 0;
            itensProcessados.push({
                // Campos básicos do itemSeparacao
                codigo: itemSeparacao.codigo,
                descricao: itemSeparacao.descricao,
                altura: itemSeparacao.altura || "",
                largura: itemSeparacao.largura || "",
                medida: itemSeparacao.medida || "",
                cor: itemSeparacao.cor || "",
                observacao: itemSeparacao.observacao || "",
                // Campos calculados para item novo
                quantidadeDesejadaSeparacao: qtdDesejadaSeparacaoInterna,
                quantidadeDisponivelOriginal: 0,
                quantidadeParaSepararReal: 0,
                quantidadeCompraAdicional: qtdDesejadaSeparacaoInterna,
                quantidadeDevolucaoEstoque: 0,
                statusComparacao: "Item Novo - Comprar",
                itemCompraTotal: true,
                // Campos do modal (inicializam como padrão)
                qtdCompraFinal: 0,
                qtdUsadaEstoque: 0,
                fonteEstoque: "",
                fornecedor: ""
            });
        }
    });

    console.log("[compararEProcessarListas] Itens processados FINAIS (antes de salvar):", itensProcessados);
    if (itensProcessados.length === 0) {
        console.warn("[compararEProcessarListas] NENHUM item processado para CorrecaoFinal (separacao5.js).");
    }

    const refCorrecaoFinal = firebase.database().ref(`CorrecaoFinal/${clienteId}/${tipoProjeto}/${nomeListaOriginal}/itensProcessados`);
    await refCorrecaoFinal.set(itensProcessados);
    return itensProcessados;
}

// Função principal para gerar a separação (acionada pelo botão "Gerar")
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
        // Processa o arquivo de input (se houver) e salva em SeparacaoProd
        if (arquivo) {
            await processarArquivoInputSeparacao(arquivo, clienteId, tipoProjeto, nomeListaOriginal);
        } else {
            // Se nenhum arquivo for fornecido, limpa SeparacaoProd para garantir que a comparação
            // reflita que nada foi contado fisicamente nesta rodada.
            const refSeparacaoProd = firebase.database().ref(`SeparacaoProd/${clienteId}/${tipoProjeto}/${nomeListaOriginal}/itens`);
            await refSeparacaoProd.set([]);
            console.log(`[gerarSeparacaoComComparacao] Nenhum arquivo fornecido. SeparacaoProd para ${nomeListaOriginal} foi limpo.`);
        }

        // compararEProcessarListas faz a lógica principal e salva em CorrecaoFinal
        const itensCorrecaoFinal = await compararEProcessarListas(clienteId, tipoProjeto, nomeListaOriginal);

        // Atualiza a tabela com os dados de CorrecaoFinal
        if (tabelaCorrecao) {
            tabelaCorrecao.clear().rows.add(itensCorrecaoFinal).draw();
        }

        if (itensCorrecaoFinal.length > 0) {
            if (typeof mostrarNotificacao === "function") mostrarNotificacao("Processamento de separação concluído!", "success");
        } else {
            if (typeof mostrarNotificacao === "function") mostrarNotificacao("Nenhum item resultante após processamento.", "warning", 5000);
        }

    } catch (error) {
        console.error("Erro em gerarSeparacaoComComparacao (separacao5.js):", error);
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
        console.error("A biblioteca XLSX (SheetJS) não está carregada (separacao5.js).");
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

// FIM DO ARQUIVO js/separacao5.js
// ATUALIZADO (este é o separacao5.js)
