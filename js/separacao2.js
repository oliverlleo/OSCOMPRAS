// INÍCIO DO ARQUIVO js/separacao2.js
// ESTE É O ARQUIVO SEPARACAO2.JS (para verificação)

let tabelaCorrecao = null; // Variável global para a DataTable

document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM completamente carregado (separacao2.js).");

    // Verifica se Select2 está disponível antes de tentar usá-lo
    if (typeof $ !== "undefined" && $.fn && $.fn.select2) {
        $("#selectCliente, #selectTipoProjeto, #selectLista").select2({
            placeholder: "Selecione uma opção",
            allowClear: true,
            width: "100%",
        });
    }

    // --- INÍCIO: Lógica dos Selects ---
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
            await buscarECarregarCorrecaoFinal(clienteId, tipoProjeto, nomeListaOriginal);
        }
    });
    // --- FIM: Lógica dos Selects ---

    document.getElementById("btnGerar").addEventListener("click", gerarSeparacao);

    const btnGerarNecessidade = document.getElementById("btnGerarNecessidade");
    const modalNecessidadeCompra = new bootstrap.Modal(document.getElementById("modalNecessidadeCompra"));

    if (btnGerarNecessidade) {
        // console.log("Botão btnGerarNecessidade encontrado (separacao2.js).");
        btnGerarNecessidade.addEventListener("click", async () => {
            // console.log("Botão Gerar Necessidade de Compra clicado (separacao2.js).");
            const clienteId = document.getElementById("selectCliente").value;
            const tipoProjeto = document.getElementById("selectTipoProjeto").value;
            const nomeListaOriginal = document.getElementById("selectLista").value;

            if (!clienteId || !tipoProjeto || !nomeListaOriginal) {
                if (typeof mostrarNotificacao === "function") {
                    mostrarNotificacao("Por favor, selecione Cliente, Tipo de Projeto e Lista Original antes de gerar a necessidade de compra.", "warning");
                }
                console.warn("Seleções incompletas para gerar necessidade de compra (separacao2.js).");
                return;
            }

            try {
                const refCorrecaoFinal = firebase.database().ref(`CorrecaoFinal/${clienteId}/${tipoProjeto}/${nomeListaOriginal}/itensProcessados`);
                const snapshot = await refCorrecaoFinal.once("value");
                const itensProcessados = snapshot.val() || [];

                const itensParaCompra = itensProcessados.filter(item => parseFloat(item.quantidadeCompraAdicional || 0) > 0);

                const tbodyModal = document.querySelector("#tabelaNecessidadeCompra tbody");
                tbodyModal.innerHTML = "";

                let hasProcessedItems = false;

                if (itensParaCompra.length > 0) {
                    itensParaCompra.forEach((item, index) => {
                        const row = tbodyModal.insertRow();
                        const qtdCompraFinalValue = item.qtdCompraFinal || 0;
                        const qtdUsadaEstoqueValue = item.qtdUsadaEstoque || 0;
                        const fonteEstoqueValue = item.fonteEstoque || "";
                        const fornecedorValue = item.fornecedor || "";

                        const readonlyQtdCompraFinal = qtdCompraFinalValue > 0 ? "readonly" : "";
                        const readonlyQtdUsadaEstoque = qtdUsadaEstoqueValue > 0 ? "readonly" : "";
                        const readonlyFonteEstoque = fonteEstoqueValue !== "" ? "readonly" : "";
                        const readonlyFornecedor = fornecedorValue !== "" ? "readonly" : "";

                        row.innerHTML = `
                            <td><input type="checkbox" class="check-item-necessidade" data-index="${index}"></td>
                            <td>${item.codigo || ""}</td>
                            <td>${item.descricao || ""}</td>
                            <td>${item.quantidadeCompraAdicional || 0}</td>
                            <td><input type="number" class="form-control form-control-sm" value="${qtdCompraFinalValue}" min="0" data-field="qtdCompraFinal" ${readonlyQtdCompraFinal}></td>
                            <td><input type="number" class="form-control form-control-sm" value="${qtdUsadaEstoqueValue}" min="0" data-field="qtdUsadaEstoque" ${readonlyQtdUsadaEstoque}></td>
                            <td><input type="text" class="form-control form-control-sm" value="${fonteEstoqueValue}" data-field="fonteEstoque" ${readonlyFonteEstoque}></td>
                            <td><input type="text" class="form-control form-control-sm" value="${fornecedorValue}" data-field="fornecedor" ${readonlyFornecedor}></td>
                        `;
                        if (qtdCompraFinalValue > 0 || qtdUsadaEstoqueValue > 0 || fornecedorValue !== "") {
                            hasProcessedItems = true;
                        }
                    });
                    modalNecessidadeCompra.show();
                    // console.log("Modal de necessidade de compra exibido (separacao2.js).");

                    if (hasProcessedItems) {
                        document.getElementById("btnDownloadExcelModal").style.display = "block";
                    } else {
                        document.getElementById("btnDownloadExcelModal").style.display = "none";
                    }

                } else {
                    if (typeof mostrarNotificacao === "function") {
                        mostrarNotificacao("Nenhum item com necessidade de compra adicional encontrado.", "info");
                    }
                    // console.log("Nenhum item com quantidadeCompraAdicional > 0 (separacao2.js).");
                    document.getElementById("btnDownloadExcelModal").style.display = "none";
                }
            } catch (error) {
                console.error("Erro ao carregar itens para necessidade de compra (separacao2.js):", error);
                if (typeof mostrarNotificacao === "function") {
                    mostrarNotificacao("Erro ao carregar itens para necessidade de compra.", "danger");
                }
            }
        });
    } else {
        console.error("Botão btnGerarNecessidade não encontrado (separacao2.js).");
    }

    document.getElementById("btnConfirmarNecessidade").addEventListener("click", async () => {
        // console.log("Botão Confirmar Ação clicado (separacao2.js).");
        const clienteId = document.getElementById("selectCliente").value;
        const tipoProjeto = document.getElementById("selectTipoProjeto").value;
        const nomeListaOriginal = document.getElementById("selectLista").value;

        if (!clienteId || !tipoProjeto || !nomeListaOriginal) {
            if (typeof mostrarNotificacao === "function") {
                mostrarNotificacao("Erro: Seleções de Cliente, Tipo de Projeto ou Lista Original ausentes.", "danger");
            }
            console.error("Seleções incompletas para confirmar necessidade de compra (separacao2.js).");
            return;
        }

        try {
            const refCorrecaoFinal = firebase.database().ref(`CorrecaoFinal/${clienteId}/${tipoProjeto}/${nomeListaOriginal}/itensProcessados`);
            const snapshot = await refCorrecaoFinal.once("value");
            let itensProcessados = snapshot.val() || [];

            const linhasModal = document.querySelectorAll("#tabelaNecessidadeCompra tbody tr");

            linhasModal.forEach(linha => {
                const checkbox = linha.querySelector(".check-item-necessidade");
                if (checkbox && checkbox.checked) {
                    const index = parseInt(checkbox.dataset.index);
                    const itemOriginal = itensProcessados[index];

                    if (itemOriginal) {
                        itemOriginal.qtdCompraFinal = parseFloat(linha.querySelector("[data-field=\'qtdCompraFinal\']").value) || 0;
                        itemOriginal.qtdUsadaEstoque = parseFloat(linha.querySelector("[data-field=\'qtdUsadaEstoque\']").value) || 0;
                        itemOriginal.fonteEstoque = linha.querySelector("[data-field=\'fonteEstoque\']").value.trim();
                        itemOriginal.fornecedor = linha.querySelector("[data-field=\'fornecedor\']").value.trim();
                    }
                }
            });

            // console.log("Itens a serem salvos no Firebase (separacao2.js):", itensProcessados);
            await refCorrecaoFinal.set(itensProcessados);

            if (typeof mostrarNotificacao === "function") {
                mostrarNotificacao("Necessidade de compra e retirada de estoque salvas com sucesso!", "success");
            }
            // console.log("Dados de necessidade de compra salvos no Firebase (separacao2.js).");
            document.getElementById("btnDownloadExcelModal").style.display = "block";
            await buscarECarregarCorrecaoFinal(clienteId, tipoProjeto, nomeListaOriginal);

        } catch (error) {
            console.error("Erro ao confirmar necessidade de compra (separacao2.js):", error);
            if (typeof mostrarNotificacao === "function") {
                mostrarNotificacao("Erro ao salvar necessidade de compra.", "danger");
            }
        }
    });

    document.getElementById("btnDownloadExcelModal").addEventListener("click", async () => {
        // console.log("Botão Download Excel (Modal) clicado (separacao2.js).");
        const clienteId = document.getElementById("selectCliente").value;
        const tipoProjeto = document.getElementById("selectTipoProjeto").value;
        const nomeListaOriginal = document.getElementById("selectLista").value;

        if (!clienteId || !tipoProjeto || !nomeListaOriginal) {
            if (typeof mostrarNotificacao === "function") {
                mostrarNotificacao("Por favor, selecione Cliente, Tipo de Projeto e Lista Original antes de gerar o Excel.", "warning");
            }
            console.warn("Seleções incompletas para gerar Excel (separacao2.js).");
            return;
        }

        try {
            const refCorrecaoFinal = firebase.database().ref(`CorrecaoFinal/${clienteId}/${tipoProjeto}/${nomeListaOriginal}/itensProcessados`);
            const snapshot = await refCorrecaoFinal.once("value");
            const itensProcessados = snapshot.val() || [];

            const dadosExcel = itensProcessados.filter(item => item.qtdCompraFinal > 0 || item.qtdUsadaEstoque > 0).map(item => ({
                Código: item.codigo,
                Descrição: item.descricao,
                Qtd: item.qtdCompraFinal,
                EmpenhoEstoque: item.qtdUsadaEstoque,
                Local: item.fonteEstoque,
                Fornecedor: item.fornecedor || ""
            }));

            if (dadosExcel.length > 0) {
                const ws = XLSX.utils.json_to_sheet(dadosExcel);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "Necessidade de Compra");
                XLSX.writeFile(wb, "Necessidade_de_Compra.xlsx");
                if (typeof mostrarNotificacao === "function") {
                    mostrarNotificacao("Arquivo Excel gerado com sucesso!", "success");
                }
                // console.log("Arquivo Excel gerado (separacao2.js).");
            } else {
                if (typeof mostrarNotificacao === "function") {
                    mostrarNotificacao("Nenhum item com quantidade de compra ou retirada preenchida para gerar o Excel.", "info");
                }
                // console.log("Nenhum item com quantidade de compra ou retirada preenchida para gerar Excel (separacao2.js).");
            }
        } catch (error) {
            console.error("Erro ao gerar Excel (separacao2.js):", error);
            if (typeof mostrarNotificacao === "function") {
                mostrarNotificacao("Erro ao gerar o arquivo Excel.", "danger");
            }
        }
    });

    document.getElementById("checkTodosNecessidade").addEventListener("change", (event) => {
        const isChecked = event.target.checked;
        document.querySelectorAll(".check-item-necessidade").forEach(checkbox => {
            checkbox.checked = isChecked;
        });
        // console.log("Checkbox \'Selecionar Todos\' alterado (separacao2.js).");
    });

    if (typeof $ !== "undefined" && $.fn && $.fn.DataTable) {
        if (!$.fn.DataTable.isDataTable("#tabelaCorrecao")) {
            tabelaCorrecao = $("#tabelaCorrecao").DataTable({
                language: { url: "https://cdn.datatables.net/plug-ins/1.11.5/i18n/pt-BR.json" },
                columns: [
                    { title: "Detalhes", className: "dt-control", orderable: false, data: null, defaultContent:
'<i class="fas fa-plus-circle text-primary"></i>'
, width: "15px" },
                    { title: "Código", data: "codigo" },
                    { title: "Descrição", data: "descricao" },
                    { title: "Qtd. Desejada", data: "quantidadeDesejadaSeparacao" },
                    { title: "Qtd. Disponível", data: "quantidadeDisponivelOriginal" },
                    { title: "Qtd. a Separar", data: "quantidadeParaSepararReal" },
                    { title: "Qtd. Compra", data: "quantidadeCompraAdicional" },
                    { title: "Qtd. Devolução", data: "quantidadeDevolucaoEstoque" },
                    { title: "Qtd Compra", data: "qtdCompraFinal", defaultContent: "0" },
                    { title: "Qtd Estoque", data: "qtdUsadaEstoque", defaultContent: "0" },
                    { title: "Local", data: "fonteEstoque", defaultContent: "" },
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
                row.child.hide();
                tr.removeClass("shown");
                $(this).html(
'<i class="fas fa-plus-circle text-primary"></i>'
);
            } else {
                const rowData = row.data();
                if (rowData) {
                    row.child(formatarDetalhes(rowData)).show();
                    tr.addClass("shown");
                    $(this).html(
'<i class="fas fa-minus-circle text-danger"></i>'
);
                }
            }
        });
    } else {
        console.error("jQuery ou DataTables não estão carregados. A tabela não pode ser inicializada (separacao2.js).");
    }
});

function limparSelectHTML(selectId, placeholderText = "Selecione") {
    const select = document.getElementById(selectId);
    if (select) {
        select.innerHTML = `<option value="">${placeholderText}</option>`;
        if (typeof $ !== "undefined" && $.fn && $.fn.select2 && $(select).data("select2")) {
            $(select).val(null).trigger("change");
        }
    }
}

function carregarClientes() {
    const sel = document.getElementById("selectCliente");
    sel.innerHTML =
'<option value="">Selecione</option>'
;
    const clientesRef = firebase.database().ref("clientes");
    clientesRef.once("value")
        .then((snap) => {
            snap.forEach((child) => {
                const opt = document.createElement("option");
                opt.value = child.key;
                const clienteData = child.val();
                opt.textContent = clienteData.nome_razao_social || clienteData.nome || child.key;
                sel.appendChild(opt);
            });
            if (typeof $ !== "undefined" && $.fn && $.fn.select2 && $(sel).data("select2")) {
                $(sel).trigger("change");
            }
        })
        .catch((err) => {
            console.error("Erro ao carregar clientes (separacao2.js):", err);
            if (typeof mostrarNotificacao === "function") mostrarNotificacao("Falha ao carregar clientes.", "danger");
        });
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
                    opt.value = tipo;
                    opt.textContent = tipo;
                    sel.appendChild(opt);
                    tiposAdicionados++;
                }
            });
            if (tiposAdicionados === 0) {
                if (Object.keys(dados).length > 0) {
                    if (typeof mostrarNotificacao === "function")
                        mostrarNotificacao("Nenhum tipo de projeto com estrutura de \'listas\' encontrado para este cliente.", "info");
                } else {
                    if (typeof mostrarNotificacao === "function") mostrarNotificacao("Nenhum tipo de projeto encontrado para este cliente.", "info");
                }
            }
            if (typeof $ !== "undefined" && $.fn && $.fn.select2 && $(sel).data("select2")) {
                $(sel).trigger("change");
            }
        })
        .catch((err) => {
            console.error("Erro ao carregar tipos de projeto (separacao2.js):", err);
            if (typeof mostrarNotificacao === "function") mostrarNotificacao("Falha ao carregar tipos de projeto.", "danger");
        });
}

async function carregarListas() {
    const clienteId = document.getElementById("selectCliente").value;
    const tipo = document.getElementById("selectTipoProjeto").value;
    const sel = document.getElementById("selectLista");
    sel.innerHTML =
'<option value="">Selecione uma Lista</option>'
;
    if (!clienteId || !tipo) {
        if (typeof $ !== "undefined" && $.fn && $.fn.select2 && $(sel).data("select2")) {
            $(sel).trigger("change");
        }
        return;
    }
    try {
        const refListasRoot = firebase.database().ref(`projetos/${clienteId}/${tipo}/listas`);
        const snapshotListas = await refListasRoot.once("value");
        if (!snapshotListas.exists()) {
            if (typeof mostrarNotificacao === "function")
                mostrarNotificacao(`Nenhuma lista encontrada em \'projetos/${clienteId}/${tipo}/listas\'.`, "info");
            if (typeof $ !== "undefined" && $.fn && $.fn.select2 && $(sel).data("select2")) {
                $(sel).trigger("change");
            }
            return;
        }
        let algumaListaElegivelAdicionada = false;
        snapshotListas.forEach((listSnap) => {
            const nomeLista = listSnap.key;
            const itensDaListaOrigem = listSnap.val() || {};
            let arrayDeItens = [];
            if (Array.isArray(itensDaListaOrigem.itens)) {
                arrayDeItens = itensDaListaOrigem.itens;
            } else if (Array.isArray(itensDaListaOrigem)) {
                 arrayDeItens = itensDaListaOrigem;
            } else if (typeof itensDaListaOrigem === 'object' && itensDaListaOrigem !== null) {
                arrayDeItens = Object.values(itensDaListaOrigem);
            }
            arrayDeItens = arrayDeItens.filter(it => it != null);
            const elegivel = arrayDeItens.some(it => {
                if (!it || typeof it.codigo === 'undefined') {
                    return false;
                }
                const quantidadeItem = parseFloat(it.quantidade || 0);
                const empenhoItem = parseFloat(it.empenho || 0);
                const necessidadeItem = parseFloat(it.necessidade || 0);
                const quantidadeRecebidaItem = parseFloat(it.quantidadeRecebida || 0);
                const condicaoEmpenho = (quantidadeItem > 0 && empenhoItem >= quantidadeItem);
                const condicaoRecebido = (necessidadeItem > 0 && quantidadeRecebidaItem >= necessidadeItem);
                return condicaoEmpenho || condicaoRecebido;
            });
            if (elegivel) {
                const opt = document.createElement("option");
                opt.value = nomeLista;
                opt.textContent = nomeLista;
                sel.appendChild(opt);
                algumaListaElegivelAdicionada = true;
            }
        });
        if (!algumaListaElegivelAdicionada) {
            if (typeof mostrarNotificacao === "function")
                mostrarNotificacao("Nenhuma lista elegível encontrada com os critérios especificados.", "info");
        }
        if (typeof $ !== "undefined" && $.fn && $.fn.select2 && $(sel).data("select2")) {
            $(sel).trigger("change");
        }
    } catch (err) {
        console.error("Erro ao carregar listas (separacao2.js):", err);
        if (typeof mostrarNotificacao === "function") mostrarNotificacao("Falha ao carregar listas de material.", "danger");
        if (typeof $ !== "undefined" && $.fn && $.fn.select2 && $(sel).data("select2")) {
            $(sel).trigger("change");
        }
    }
}

function formatarDetalhes(d) {
    return `<div class="p-3 bg-light border rounded">
        <dl class="row mb-0">
            <dt class="col-sm-3">Altura:</dt>
            <dd class="col-sm-9">${d.altura || "N/A"}</dd>
            <dt class="col-sm-3">Largura:</dt>
            <dd class="col-sm-9">${d.largura || "N/A"}</dd>
            <dt class="col-sm-3">Medida:</dt>
            <dd class="col-sm-9">${d.medida || "N/A"}</dd>
            <dt class="col-sm-3">Cor:</dt>
            <dd class="col-sm-9">${d.cor || "N/A"}</dd>
            <dt class="col-sm-3">Observação:</dt>
            <dd class="col-sm-9">${d.observacao || "N/A"}</dd>
        </dl>
    </div>`;
}

async function processarArquivoInputSeparacao(arquivo, clienteId, tipoProjeto, nomeListaOriginal) {
    return new Promise((resolve, reject) => {
        if (!arquivo) {
            console.log("[processarArquivoInputSeparacao] Nenhum arquivo fornecido (separacao2.js).");
            resolve([]);
            return;
        }
        const tipoArquivo = obterTipoArquivo(arquivo.name);
        if (!tipoArquivo) {
            return reject(new Error("Formato de arquivo não suportado."));
        }
        const reader = new FileReader();
        reader.onload = async function (e) {
            try {
                let itensProcessados;
                switch (tipoArquivo) {
                    case "csv": itensProcessados = processarCSV(e.target.result); break;
                    case "xlsx": itensProcessados = await processarXLSX(e.target.result); break;
                    case "xml": itensProcessados = processarXML(e.target.result); break;
                    default: throw new Error("Tipo de arquivo inesperado após verificação inicial.");
                }
                if (!itensProcessados || itensProcessados.length === 0) {
                    console.warn("[processarArquivoInputSeparacao] Nenhum item válido encontrado no arquivo (separacao2.js).");
                    resolve([]); return;
                }
                const itensFormatados = itensProcessados
                    .map((item) => ({
                        codigo: String(item.codigo || "N/A").trim(),
                        descricao: item.descricao || "Sem descrição",
                        quantidade: parseFloat(item.quantidade) || 0,
                        altura: item.altura || "", largura: item.largura || "",
                        medida: item.medida || "", cor: item.cor || "",
                        observacao: item.observacao || "",
                    }))
                    .filter((item) => item.quantidade > 0);
                if (itensFormatados.length === 0) {
                    console.warn("[processarArquivoInputSeparacao] Nenhum item com quantidade válida encontrado após formatação (separacao2.js).");
                    resolve([]); return;
                }
                const refSeparacaoProd = firebase.database().ref(`SeparacaoProd/${clienteId}/${tipoProjeto}/${nomeListaOriginal}/itens`);
                await refSeparacaoProd.set(itensFormatados);
                console.log(`[processarArquivoInputSeparacao] ${itensFormatados.length} itens salvos em SeparacaoProd (separacao2.js).`);
                resolve(itensFormatados);
            } catch (err) {
                console.error("Erro dentro do reader.onload em processarArquivoInputSeparacao (separacao2.js):", err);
                reject(err);
            }
        };
        reader.onerror = function (e) {
            console.error("Erro ao ler o arquivo em processarArquivoInputSeparacao (separacao2.js):", e);
            reject(new Error("Falha ao ler o arquivo."));
        };
        if (tipoArquivo === "xlsx") {
            reader.readAsArrayBuffer(arquivo);
        } else {
            reader.readAsText(arquivo);
        }
    });
}

async function compararListas(clienteId, tipoProjeto, nomeListaOriginal) {
    if (!clienteId || !tipoProjeto || !nomeListaOriginal) {
        throw new Error("Seleções incompletas para comparação.");
    }
    console.log(`[compararListas] Iniciando para ${clienteId}/${tipoProjeto}/${nomeListaOriginal} (separacao2.js)`);

    const refOrig = firebase.database().ref(`projetos/${clienteId}/${tipoProjeto}/listas/${nomeListaOriginal}`);
    const snapOrig = await refOrig.once("value");
    const dadosListaOriginal = snapOrig.exists() ? snapOrig.val() : {};
    console.log("[compararListas] Dados brutos da lista original (projetos/...):", JSON.parse(JSON.stringify(dadosListaOriginal)));

    let listaOriginalItensRaw = [];
    if (Array.isArray(dadosListaOriginal.itens)) {
        listaOriginalItensRaw = dadosListaOriginal.itens;
    } else if (Array.isArray(dadosListaOriginal)) {
         listaOriginalItensRaw = dadosListaOriginal;
    } else if (typeof dadosListaOriginal === 'object' && dadosListaOriginal !== null) {
        if (Object.values(dadosListaOriginal).every(val => typeof val === 'object' && val !== null && 'codigo' in val)) {
            listaOriginalItensRaw = Object.values(dadosListaOriginal);
        }
    }
    console.log("[compararListas] Array de itens brutos da lista original (listaOriginalItensRaw):", JSON.parse(JSON.stringify(listaOriginalItensRaw)));

    const mapListaOriginal = new Map();
    const listaOriginalItens = Array.isArray(listaOriginalItensRaw)
        ? listaOriginalItensRaw.filter(it => it != null && typeof it.codigo !== 'undefined')
        : [];
    console.log("[compararListas] Itens válidos da lista original (listaOriginalItens):", JSON.parse(JSON.stringify(listaOriginalItens)));

    if (listaOriginalItens.length === 0) {
        console.warn("[compararListas] A lista original de PROJETOS está vazia ou não contém itens válidos (separacao2.js).");
    }

    listaOriginalItens.forEach((item, index) => {
        const codigo = String(item.codigo).trim();
        const empenho = parseFloat(item.empenho) || 0;
        const quantidadeRecebida = parseFloat(item.quantidadeRecebida) || 0;
        const quantidadeDisponivelOriginal = empenho + quantidadeRecebida;
        console.log(`[compararListas] Item Original ${index}: Cod=${codigo}, Emp=${empenho}, QtdRec=${quantidadeRecebida}, QtdDispOrig=${quantidadeDisponivelOriginal}`);
        mapListaOriginal.set(codigo, { ...item, empenho, quantidadeRecebida, quantidadeDisponivelOriginal });
    });
    console.log("[compararListas] mapListaOriginal construído. Tamanho:", mapListaOriginal.size);

    const refSep = firebase.database().ref(`SeparacaoProd/${clienteId}/${tipoProjeto}/${nomeListaOriginal}/itens`);
    const snapSep = await refSep.once("value");
    const listaSeparacaoItensRaw = snapSep.exists() ? snapSep.val() : [];
    const mapListaSeparacao = new Map();
    const listaSeparacaoItens = Array.isArray(listaSeparacaoItensRaw) ? listaSeparacaoItensRaw : [];
    console.log("[compararListas] Itens da lista de SEPARACAOPROD:", JSON.parse(JSON.stringify(listaSeparacaoItens)));

    listaSeparacaoItens.forEach((item) => {
        if (item && typeof item.codigo !== 'undefined') {
            mapListaSeparacao.set(String(item.codigo).trim(), item);
        }
    });
    console.log("[compararListas] mapListaSeparacao construído. Tamanho:", mapListaSeparacao.size);

    const itensProcessados = [];
    for (const [codigo, itemSeparacao] of mapListaSeparacao) {
        const itemOriginal = mapListaOriginal.get(codigo);
        let statusComparacao = "";
        let quantidadeParaSepararReal = 0;
        let quantidadeCompraAdicional = 0;
        const quantidadeDesejadaSeparacao = parseFloat(itemSeparacao.quantidade) || 0;
        const quantidadeDisponivelOriginal = itemOriginal ? (itemOriginal.quantidadeDisponivelOriginal || 0) : 0;
        console.log(`[compararListas] Processando item da SEPARACAOPROD: ${codigo}, QtdDesejada: ${quantidadeDesejadaSeparacao}. Encontrado na Original? ${!!itemOriginal}, QtdDispOrig: ${quantidadeDisponivelOriginal}`);

        if (itemOriginal) {
            if (quantidadeDesejadaSeparacao <= quantidadeDisponivelOriginal) {
                statusComparacao = "Item OK";
                quantidadeParaSepararReal = quantidadeDesejadaSeparacao;
            } else {
                statusComparacao = "Comprar Adicional";
                quantidadeParaSepararReal = quantidadeDisponivelOriginal;
                quantidadeCompraAdicional = quantidadeDesejadaSeparacao - quantidadeDisponivelOriginal;
            }
            itensProcessados.push({
                ...(itemOriginal || {}), ...(itemSeparacao || {}),
                quantidadeDesejadaSeparacao, quantidadeDisponivelOriginal,
                quantidadeParaSepararReal, quantidadeCompraAdicional,
                quantidadeDevolucaoEstoque: 0, statusComparacao,
                qtdCompraFinal: itemOriginal.qtdCompraFinal || (itemSeparacao.qtdCompraFinal || 0),
                qtdUsadaEstoque: itemOriginal.qtdUsadaEstoque || (itemSeparacao.qtdUsadaEstoque || 0),
                fonteEstoque: itemOriginal.fonteEstoque || (itemSeparacao.fonteEstoque || ""),
                fornecedor: itemOriginal.fornecedor || (itemSeparacao.fornecedor || "")
            });
        } else {
            statusComparacao = "Item Novo (não na lista original)";
            quantidadeCompraAdicional = quantidadeDesejadaSeparacao;
            itensProcessados.push({
                ...(itemSeparacao || {}), quantidadeDesejadaSeparacao,
                quantidadeDisponivelOriginal: 0, quantidadeParaSepararReal: 0,
                quantidadeCompraAdicional, quantidadeDevolucaoEstoque: 0, statusComparacao,
                qtdCompraFinal: itemSeparacao.qtdCompraFinal || 0,
                qtdUsadaEstoque: itemSeparacao.qtdUsadaEstoque || 0,
                fonteEstoque: itemSeparacao.fonteEstoque || "",
                fornecedor: itemSeparacao.fornecedor || ""
            });
        }
    }

    for (const [codigo, itemOriginal] of mapListaOriginal) {
        if (!mapListaSeparacao.has(codigo)) {
            const quantidadeDisponivelOriginal = itemOriginal.quantidadeDisponivelOriginal || 0;
            console.log(`[compararListas] Item da lista ORIGINAL não encontrado em SEPARACAOPROD: ${codigo}, QtdDispOrig: ${quantidadeDisponivelOriginal}`);
            itensProcessados.push({
                ...itemOriginal, quantidadeDesejadaSeparacao: 0,
                quantidadeDisponivelOriginal, quantidadeParaSepararReal: 0,
                quantidadeCompraAdicional: 0,
                quantidadeDevolucaoEstoque: quantidadeDisponivelOriginal,
                statusComparacao: quantidadeDisponivelOriginal > 0 ? "Não Separado (Devolver ao Estoque)" : "Não Disponível na Origem",
                qtdCompraFinal: itemOriginal.qtdCompraFinal || 0,
                qtdUsadaEstoque: itemOriginal.qtdUsadaEstoque || 0,
                fonteEstoque: itemOriginal.fonteEstoque || "",
                fornecedor: itemOriginal.fornecedor || ""
            });
        }
    }

    console.log("[compararListas] Itens processados FINAIS (antes de salvar):", JSON.parse(JSON.stringify(itensProcessados)));
    if (itensProcessados.length === 0) {
        console.warn("[compararListas] NENHUM item processado para CorrecaoFinal (separacao2.js).");
    }

    const refCorrecaoFinal = firebase.database().ref(`CorrecaoFinal/${clienteId}/${tipoProjeto}/${nomeListaOriginal}/itensProcessados`);
    await refCorrecaoFinal.set(itensProcessados);
    return itensProcessados;
}

async function buscarECarregarCorrecaoFinal(clienteId, tipoProjeto, nomeListaOriginal) {
    if (!clienteId || !tipoProjeto || !nomeListaOriginal) {
        console.warn("Seleções incompletas para buscar CorrecaoFinal (separacao2.js).");
        if (tabelaCorrecao) tabelaCorrecao.clear().draw();
        return;
    }
    try {
        const refCorrecaoFinal = firebase.database().ref(`CorrecaoFinal/${clienteId}/${tipoProjeto}/${nomeListaOriginal}/itensProcessados`);
        const snapshot = await refCorrecaoFinal.once("value");
        const itens = snapshot.val() || [];
        console.log("[buscarECarregarCorrecaoFinal] Dados recuperados de CorrecaoFinal:", itens, `(separacao2.js)`);
        if (tabelaCorrecao) {
            tabelaCorrecao.clear().rows.add(itens).draw();
        }
        const btnDownloadExcelMain = document.getElementById("btnDownloadExcel");
        if (btnDownloadExcelMain) btnDownloadExcelMain.style.display = "none";
        if (itens.length === 0) {
            const isInitialLoad = !document.getElementById("btnGerar").disabled;
            if (typeof mostrarNotificacao === "function") {
                if (!isInitialLoad) mostrarNotificacao("Nenhum dado processado para exibição na tabela de separação.", "info");
                // else mostrarNotificacao("Nenhum dado de separação previamente salvo encontrado para esta seleção.", "info"); // Removido para reduzir notificações iniciais
            }
        }
    } catch (error) {
        console.error("Erro ao buscar e carregar CorrecaoFinal (separacao2.js):", error);
        if (typeof mostrarNotificacao === "function") mostrarNotificacao("Erro ao carregar dados de CorrecaoFinal.", "danger");
    }
}

async function gerarSeparacao() {
    const clienteId = document.getElementById("selectCliente").value;
    const tipoProjeto = document.getElementById("selectTipoProjeto").value;
    const nomeListaOriginal = document.getElementById("selectLista").value;
    const inputArquivo = document.getElementById("inputArquivo");
    const arquivo = inputArquivo.files[0];
    if (!clienteId || !tipoProjeto || !nomeListaOriginal) {
        if (typeof mostrarNotificacao === "function") mostrarNotificacao("Por favor, selecione Cliente, Tipo de Projeto e Lista Original.", "warning");
        return;
    }
    if (typeof mostrarNotificacao === "function") mostrarNotificacao("Processando e comparando listas...", "info", 3000);
    const btnGerarElem = document.getElementById("btnGerar");
    if(btnGerarElem) btnGerarElem.disabled = true;
    try {
        if (arquivo) {
            // console.log("[gerarSeparacao] Arquivo selecionado, processando (separacao2.js)...");
            await processarArquivoInputSeparacao(arquivo, clienteId, tipoProjeto, nomeListaOriginal);
        } else {
            // console.log("[gerarSeparacao] Nenhum arquivo selecionado. Limpando SeparacaoProd (separacao2.js).");
            const refSeparacaoProd = firebase.database().ref(`SeparacaoProd/${clienteId}/${tipoProjeto}/${nomeListaOriginal}/itens`);
            await refSeparacaoProd.set([]);
            // console.log(`[gerarSeparacao] SeparacaoProd/${clienteId}/${tipoProjeto}/${nomeListaOriginal}/itens foi limpo (separacao2.js).`);
        }
        const itensCorrecaoFinal = await compararListas(clienteId, tipoProjeto, nomeListaOriginal);
        if (tabelaCorrecao) {
            tabelaCorrecao.clear().rows.add(itensCorrecaoFinal).draw();
            // console.log("[gerarSeparacao] Tabela atualizada com itensCorrecaoFinal (separacao2.js).");
        } else {
            console.error("[gerarSeparacao] Referência da tabela (tabelaCorrecao) não encontrada (separacao2.js).");
        }
        if (itensCorrecaoFinal.length > 0) {
            if (typeof mostrarNotificacao === "function") mostrarNotificacao("Separação processada com sucesso!", "success");
        } else {
            if (typeof mostrarNotificacao === "function") mostrarNotificacao("Processamento concluído, mas nenhum item resultante para a tabela de separação.", "warning", 5000);
        }
    } catch (error) {
        console.error("Erro ao gerar separação (separacao2.js):", error);
        if (typeof mostrarNotificacao === "function") mostrarNotificacao(`Erro ao gerar separação: ${error.message}`, "danger");
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
        console.error("A biblioteca XLSX (SheetJS) não está carregada (separacao2.js).");
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

// FIM DO ARQUIVO js/separacao2.js
// ATUALIZADO (este é o separacao2.js)
