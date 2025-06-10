// INÍCIO DO ARQUIVO js/separacao.js

let tabelaCorrecao = null; // Variável global para a DataTable

document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM completamente carregado.");

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

    // MODIFICADO: Listener para selectLista agora tenta carregar dados salvos
    document.getElementById("selectLista").addEventListener("change", async () => {
        const clienteId = document.getElementById("selectCliente").value;
        const tipoProjeto = document.getElementById("selectTipoProjeto").value;
        const nomeListaOriginal = document.getElementById("selectLista").value;

        if (tabelaCorrecao) tabelaCorrecao.clear().draw(); // Limpa a tabela ao mudar a lista

        if (clienteId && tipoProjeto && nomeListaOriginal) {
            // Tenta carregar a CorrecaoFinal existente para esta seleção
            await buscarECarregarCorrecaoFinal(clienteId, tipoProjeto, nomeListaOriginal);
        } 
    });
    // --- FIM: Lógica dos Selects ---

    document.getElementById("btnGerar").addEventListener("click", gerarSeparacao);

    // --- Nova Funcionalidade: Gerar Necessidade de Compra ---
    const btnGerarNecessidade = document.getElementById("btnGerarNecessidade");
    const modalNecessidadeCompra = new bootstrap.Modal(document.getElementById("modalNecessidadeCompra"));

    if (btnGerarNecessidade) {
        console.log("Botão btnGerarNecessidade encontrado.");
        btnGerarNecessidade.addEventListener("click", async () => {
            console.log("Botão Gerar Necessidade de Compra clicado.");
            const clienteId = document.getElementById("selectCliente").value;
            const tipoProjeto = document.getElementById("selectTipoProjeto").value;
            const nomeListaOriginal = document.getElementById("selectLista").value;

            if (!clienteId || !tipoProjeto || !nomeListaOriginal) {
                if (typeof mostrarNotificacao === "function") {
                    mostrarNotificacao("Por favor, selecione Cliente, Tipo de Projeto e Lista Original antes de gerar a necessidade de compra.", "warning");
                }
                console.warn("Seleções incompletas para gerar necessidade de compra.");
                return;
            }

            try {
                const refCorrecaoFinal = firebase.database().ref(`CorrecaoFinal/${clienteId}/${tipoProjeto}/${nomeListaOriginal}/itensProcessados`);
                const snapshot = await refCorrecaoFinal.once("value");
                const itensProcessados = snapshot.val() || [];

                const itensParaCompra = itensProcessados.filter(item => item.quantidadeCompraAdicional > 0);

                const tbodyModal = document.querySelector("#tabelaNecessidadeCompra tbody");
                tbodyModal.innerHTML = ""; // Limpa a tabela do modal

                let hasProcessedItems = false; // Flag para verificar se há itens já processados

                if (itensParaCompra.length > 0) {
                    itensParaCompra.forEach((item, index) => {
                        const row = tbodyModal.insertRow();
                        // Preenche os campos com os valores existentes e os torna somente leitura se já tiverem valor
                        const qtdCompraFinalValue = item.qtdCompraFinal || 0;
                        const qtdUsadaEstoqueValue = item.qtdUsadaEstoque || 0;
                        const fonteEstoqueValue = item.fonteEstoque || "";
                        const fornecedorValue = item.fornecedor || ""; // Novo campo fornecedor

                        const readonlyQtdCompraFinal = qtdCompraFinalValue > 0 ? "readonly" : "";
                        const readonlyQtdUsadaEstoque = qtdUsadaEstoqueValue > 0 ? "readonly" : "";
                        const readonlyFonteEstoque = fonteEstoqueValue !== "" ? "readonly" : "";
                        const readonlyFornecedor = fornecedorValue !== "" ? "readonly" : ""; // Readonly para fornecedor

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
                        if (qtdCompraFinalValue > 0 || qtdUsadaEstoqueValue > 0 || fornecedorValue !== "") { // Atualiza a condição
                            hasProcessedItems = true;
                        }
                    });
                    modalNecessidadeCompra.show();
                    console.log("Modal de necessidade de compra exibido.");

                    // Exibe o botão de download do Excel se houver itens já processados
                    if (hasProcessedItems) {
                        document.getElementById("btnDownloadExcelModal").style.display = "block";
                    } else {
                        document.getElementById("btnDownloadExcelModal").style.display = "none";
                    }

                } else {
                    if (typeof mostrarNotificacao === "function") {
                        mostrarNotificacao("Nenhum item com necessidade de compra adicional encontrado.", "info");
                    }
                    console.log("Nenhum item com quantidadeCompraAdicional > 0.");
                    document.getElementById("btnDownloadExcelModal").style.display = "none"; // Garante que o botão esteja oculto
                }
            } catch (error) {
                console.error("Erro ao carregar itens para necessidade de compra:", error);
                if (typeof mostrarNotificacao === "function") {
                    mostrarNotificacao("Erro ao carregar itens para necessidade de compra.", "danger");
                }
            }
        });
    } else {
        console.error("Botão btnGerarNecessidade não encontrado.");
    }

    // Event listener para o botão de confirmar ação no modal
    document.getElementById("btnConfirmarNecessidade").addEventListener("click", async () => {
        console.log("Botão Confirmar Ação clicado.");
        const clienteId = document.getElementById("selectCliente").value;
        const tipoProjeto = document.getElementById("selectTipoProjeto").value;
        const nomeListaOriginal = document.getElementById("selectLista").value;

        if (!clienteId || !tipoProjeto || !nomeListaOriginal) {
            if (typeof mostrarNotificacao === "function") {
                mostrarNotificacao("Erro: Seleções de Cliente, Tipo de Projeto ou Lista Original ausentes.", "danger");
            }
            console.error("Seleções incompletas para confirmar necessidade de compra.");
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
                        const qtdCompraFinal = parseFloat(linha.querySelector("[data-field=\'qtdCompraFinal\']").value) || 0;
                        const qtdUsadaEstoque = parseFloat(linha.querySelector("[data-field=\'qtdUsadaEstoque\']").value) || 0;
                        const fonteEstoque = linha.querySelector("[data-field=\'fonteEstoque\']").value.trim();
                        const fornecedor = linha.querySelector("[data-field=\'fornecedor\']").value.trim(); // Novo campo fornecedor

                        itemOriginal.qtdCompraFinal = qtdCompraFinal;
                        itemOriginal.qtdUsadaEstoque = qtdUsadaEstoque;
                        itemOriginal.fonteEstoque = fonteEstoque;
                        itemOriginal.fornecedor = fornecedor; // Salva o fornecedor
                    }
                }
            });

            console.log("Itens a serem salvos no Firebase (com novos campos):", itensProcessados);
            await refCorrecaoFinal.set(itensProcessados); // Salva a lista completa de volta

            if (typeof mostrarNotificacao === "function") {
                mostrarNotificacao("Necessidade de compra e retirada de estoque salvas com sucesso!", "success");
            }
            console.log("Dados de necessidade de compra salvos no Firebase.");

            // Mostra o botão de download do Excel dentro do modal após a confirmação
            document.getElementById("btnDownloadExcelModal").style.display = "block";

            // Atualizar a tabela principal (tabelaCorrecao)
            await buscarECarregarCorrecaoFinal(clienteId, tipoProjeto, nomeListaOriginal); // Recarrega os dados para atualizar a tabela

        } catch (error) {
            console.error("Erro ao confirmar necessidade de compra:", error);
            if (typeof mostrarNotificacao === "function") {
                mostrarNotificacao("Erro ao salvar necessidade de compra.", "danger");
            }
        }
    });

    // Novo Event listener para o botão de download do Excel dentro do modal
    document.getElementById("btnDownloadExcelModal").addEventListener("click", async () => {
        console.log("Botão Download Excel (Modal) clicado.");
        const clienteId = document.getElementById("selectCliente").value;
        const tipoProjeto = document.getElementById("selectTipoProjeto").value;
        const nomeListaOriginal = document.getElementById("selectLista").value;

        if (!clienteId || !tipoProjeto || !nomeListaOriginal) {
            if (typeof mostrarNotificacao === "function") {
                mostrarNotificacao("Por favor, selecione Cliente, Tipo de Projeto e Lista Original antes de gerar o Excel.", "warning");
            }
            console.warn("Seleções incompletas para gerar Excel.");
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
                Fornecedor: item.fornecedor || "" // Inclui o fornecedor no Excel
            }));

            if (dadosExcel.length > 0) {
                const ws = XLSX.utils.json_to_sheet(dadosExcel);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "Necessidade de Compra");
                XLSX.writeFile(wb, "Necessidade_de_Compra.xlsx");
                if (typeof mostrarNotificacao === "function") {
                    mostrarNotificacao("Arquivo Excel gerado com sucesso!", "success");
                }
                console.log("Arquivo Excel gerado.");
            } else {
                if (typeof mostrarNotificacao === "function") {
                    mostrarNotificacao("Nenhum item com quantidade de compra ou retirada preenchida para gerar o Excel.", "info");
                }
                console.log("Nenhum item com quantidade de compra ou retirada preenchida para gerar Excel.");
            }
        } catch (error) {
            console.error("Erro ao gerar Excel:", error);
            if (typeof mostrarNotificacao === "function") {
                mostrarNotificacao("Erro ao gerar o arquivo Excel.", "danger");
            }
        }
    });

    // Listener para o checkbox "checkTodosNecessidade"
    document.getElementById("checkTodosNecessidade").addEventListener("change", (event) => {
        const isChecked = event.target.checked;
        document.querySelectorAll(".check-item-necessidade").forEach(checkbox => {
            checkbox.checked = isChecked;
        });
        console.log("Checkbox \'Selecionar Todos\' alterado.");
    });

    // Inicializa DataTable
    if (typeof $ !== "undefined" && $.fn && $.fn.DataTable) {
        if (!$.fn.DataTable.isDataTable("#tabelaCorrecao")) {
            tabelaCorrecao = $("#tabelaCorrecao").DataTable({
                // responsive: true, // Removido temporariamente para teste
                // nowrap: true, // Removido temporariamente para teste
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
        console.error("jQuery ou DataTables não estão carregados. A tabela não pode ser inicializada.");
    }
});

// Função auxiliar para limpar selects
function limparSelectHTML(selectId, placeholderText = "Selecione") {
    const select = document.getElementById(selectId);
    if (select) {
        select.innerHTML = `<option value="">${placeholderText}</option>`;
        if (typeof $ !== "undefined" && $.fn && $.fn.select2 && $(select).data("select2")) {
            $(select).val(null).trigger("change");
        }
    }
}

// --- Funções Originais para Carregar Selects (mantidas) ---
function carregarClientes() {
    const sel = document.getElementById("selectCliente");
    sel.innerHTML = 
'<option value="">Selecione</option>'
;

    const clientesRef = firebase.database().ref("clientes");

    clientesRef
        .once("value")
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
            console.error("Erro ao carregar clientes:", err);
            if (typeof mostrarNotificacao === "function") mostrarNotificacao("Falha ao carregar clientes.", "danger");
        });
}

function carregarTiposProjeto() {
    const clienteId = document.getElementById("selectCliente").value;
    const sel = document.getElementById("selectTipoProjeto");

    if (!clienteId) return;

    firebase
        .database()
        .ref(`projetos/${clienteId}`)
        .once("value")
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
            console.error("Erro ao carregar tipos de projeto:", err);
            if (typeof mostrarNotificacao === "function") mostrarNotificacao("Falha ao carregar tipos de projeto.", "danger");
        });
}

async function carregarListas() {
    const clienteId = document.getElementById("selectCliente").value;
    const tipo = document.getElementById("selectTipoProjeto").value;
    const sel = document.getElementById("selectLista");

    sel.innerHTML = 
'<option value="">Selecione uma Lista</option>'
; // Limpa sempre

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
            const itensDaLista = listSnap.val() || {};
            const arrayDeItens = Array.isArray(itensDaLista)
                ? itensDaLista
                : typeof itensDaLista === "object" && itensDaLista !== null
                ? Object.values(itensDaLista)
                : [];

            const elegivel = arrayDeItens.some(
                (it) => it && ((parseFloat(it.empenho || 0) > 0) || (parseFloat(it.quantidadeRecebida || 0) > 0))
            );

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
                mostrarNotificacao("Nenhuma lista elegível (com itens empenhados/recebidos) encontrada.", "info");
        }

        if (typeof $ !== "undefined" && $.fn && $.fn.select2 && $(sel).data("select2")) {
            $(sel).trigger("change");
        }
    } catch (err) {
        console.error("Erro ao carregar listas:", err);
        if (typeof mostrarNotificacao === "function") mostrarNotificacao("Falha ao carregar listas de material.", "danger");
        if (typeof $ !== "undefined" && $.fn && $.fn.select2 && $(sel).data("select2")) {
            $(sel).trigger("change");
        }
    }
}
// --- FIM DAS FUNÇÕES PARA CARREGAR SELECTS ---

// Função para formatar os detalhes (colunas ocultas)
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

// Processa o arquivo de separação e salva em SeparacaoProd
async function processarArquivoInputSeparacao(arquivo, clienteId, tipoProjeto, nomeListaOriginal) {
    return new Promise((resolve, reject) => {
        if (!arquivo) {
            return reject(new Error("Nenhum arquivo selecionado."));
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
                    case "csv":
                        itensProcessados = processarCSV(e.target.result);
                        break;
                    case "xlsx":
                        // Lembre-se que processarXLSX pode precisar de biblioteca externa (SheetJS)
                        itensProcessados = await processarXLSX(e.target.result);
                        break;
                    case "xml":
                        itensProcessados = processarXML(e.target.result);
                        break;
                    default:
                        throw new Error("Tipo de arquivo inesperado após verificação inicial.");
                }

                if (!itensProcessados || itensProcessados.length === 0) {
                    throw new Error("Nenhum item válido encontrado no arquivo.");
                }

                // Mapeia para garantir campos de detalhe e formata quantidade
                const itensFormatados = itensProcessados
                    .map((item) => ({
                        codigo: String(item.codigo || "N/A").trim(), // Garante string e remove espaços
                        descricao: item.descricao || "Sem descrição",
                        quantidade: parseFloat(item.quantidade) || 0,
                        altura: item.altura || "",
                        largura: item.largura || "",
                        medida: item.medida || "",
                        cor: item.cor || "",
                        observacao: item.observacao || "",
                    }))
                    .filter((item) => item.quantidade > 0); // Filtra itens com quantidade inválida ou zero

                if (itensFormatados.length === 0) {
                    throw new Error("Nenhum item com quantidade válida encontrado após formatação.");
                }

                // Salva no Firebase em SeparacaoProd
                const refSeparacaoProd = firebase.database().ref(`SeparacaoProd/${clienteId}/${tipoProjeto}/${nomeListaOriginal}/itens`);
                await refSeparacaoProd.set(itensFormatados);
                resolve(itensFormatados); // Retorna os itens salvos
            } catch (err) {
                console.error("Erro dentro do reader.onload:", err);
                reject(err);
            }
        };
        reader.onerror = function (e) {
            console.error("Erro ao ler o arquivo:", e);
            reject(new Error("Falha ao ler o arquivo."));
        };

        // Lê o arquivo conforme o tipo
        if (tipoArquivo === "xlsx") {
            reader.readAsArrayBuffer(arquivo);
        } else {
            reader.readAsText(arquivo);
        }
    });
}

// Compara as listas e salva em CorrecaoFinal
async function compararListas(clienteId, tipoProjeto, nomeListaOriginal) {
    if (!clienteId || !tipoProjeto || !nomeListaOriginal) {
        throw new Error("Seleções incompletas para comparação.");
    }

    if (typeof mostrarNotificacao === "function") mostrarNotificacao("Iniciando comparação de listas...", "info");

    // 1. Buscar Lista Original (com empenho/recebido)
    const refOrig = firebase.database().ref(`projetos/${clienteId}/${tipoProjeto}/listas/${nomeListaOriginal}/itens`);
    const snapOrig = await refOrig.once("value");
    const listaOriginalItensRaw = snapOrig.exists() ? snapOrig.val() : {};
    const mapListaOriginal = new Map();
    const listaOriginalItens = Array.isArray(listaOriginalItensRaw)
        ? listaOriginalItensRaw
        : typeof listaOriginalItensRaw === "object" && listaOriginalItensRaw !== null
        ? Object.values(listaOriginalItensRaw)
        : [];

    listaOriginalItens.forEach((item) => {
        if (item && item.codigo) {
            const codigo = String(item.codigo).trim();
            const quantidadeDisponivelOriginal = (parseFloat(item.empenho) || 0) + (parseFloat(item.quantidadeRecebida) || 0);
            mapListaOriginal.set(codigo, { ...item, quantidadeDisponivelOriginal });
        }
    });

    // 2. Buscar Nova Lista de Separação (recém salva)
    const refSep = firebase.database().ref(`SeparacaoProd/${clienteId}/${tipoProjeto}/${nomeListaOriginal}/itens`);
    const snapSep = await refSep.once("value");
    const listaSeparacaoItensRaw = snapSep.exists() ? snapSep.val() : {};
    const mapListaSeparacao = new Map();
    const listaSeparacaoItens = Array.isArray(listaSeparacaoItensRaw)
        ? listaSeparacaoItensRaw
        : typeof listaSeparacaoItensRaw === "object" && listaSeparacaoItensRaw !== null
        ? Object.values(listaSeparacaoItensRaw)
        : [];

    listaSeparacaoItens.forEach((item) => {
        if (item && item.codigo) {
            mapListaSeparacao.set(String(item.codigo).trim(), item);
        }
    });

    const itensProcessados = [];

    // Processar itens da lista de separação
    for (const [codigo, itemSeparacao] of mapListaSeparacao) {
        const itemOriginal = mapListaOriginal.get(codigo);
        let statusComparacao = "";
        let quantidadeParaSepararReal = 0;
        let quantidadeCompraAdicional = 0;
        let quantidadeDevolucaoEstoque = 0;
        const quantidadeDesejadaSeparacao = itemSeparacao.quantidade || 0;
        const quantidadeDisponivelOriginal = itemOriginal ? itemOriginal.quantidadeDisponivelOriginal : 0;

        if (itemOriginal) {
            // Item existe na lista original
            if (quantidadeDesejadaSeparacao <= quantidadeDisponivelOriginal) {
                statusComparacao = "Item OK";
                quantidadeParaSepararReal = quantidadeDesejadaSeparacao;
            } else {
                statusComparacao = "Comprar Adicional";
                quantidadeParaSepararReal = quantidadeDisponivelOriginal;
                quantidadeCompraAdicional = quantidadeDesejadaSeparacao - quantidadeDisponivelOriginal;
            }
        } else {
            // Item novo, não existe na lista original
            statusComparacao = "Item Novo";
            quantidadeCompraAdicional = quantidadeDesejadaSeparacao;
        }

        itensProcessados.push({
            ...itemSeparacao, // Mantém todos os campos do item de separação
            quantidadeDesejadaSeparacao: quantidadeDesejadaSeparacao,
            quantidadeDisponivelOriginal: quantidadeDisponivelOriginal,
            quantidadeParaSepararReal: quantidadeParaSepararReal,
            quantidadeCompraAdicional: quantidadeCompraAdicional,
            quantidadeDevolucaoEstoque: quantidadeDevolucaoEstoque, // Inicializa como 0
            statusComparacao: statusComparacao,
        });
    }

    // Processar itens da lista original que não estão na lista de separação
    for (const [codigo, itemOriginal] of mapListaOriginal) {
        if (!mapListaSeparacao.has(codigo)) {
            // Item existe na lista original mas não na de separação, deve ser devolvido ao estoque
            const quantidadeDevolucao = itemOriginal.quantidadeDisponivelOriginal;
            if (quantidadeDevolucao > 0) {
                itensProcessados.push({
                    ...itemOriginal,
                    quantidadeDesejadaSeparacao: 0,
                    quantidadeParaSepararReal: 0,
                    quantidadeCompraAdicional: 0,
                    quantidadeDevolucaoEstoque: quantidadeDevolucao,
                    statusComparacao: "Devolver ao Estoque",
                });
            }
        }
    }

    // Salvar o resultado da comparação em CorrecaoFinal
    const refCorrecaoFinal = firebase.database().ref(`CorrecaoFinal/${clienteId}/${tipoProjeto}/${nomeListaOriginal}/itensProcessados`);
    await refCorrecaoFinal.set(itensProcessados);

    if (typeof mostrarNotificacao === "function") mostrarNotificacao("Comparação de listas concluída e salva em CorrecaoFinal.", "success");
    return itensProcessados;
}

// Função para buscar e carregar dados de CorrecaoFinal na tabela
async function buscarECarregarCorrecaoFinal(clienteId, tipoProjeto, nomeListaOriginal) {
    if (!clienteId || !tipoProjeto || !nomeListaOriginal) {
        console.warn("Seleções incompletas para buscar CorrecaoFinal.");
        if (tabelaCorrecao) tabelaCorrecao.clear().draw();
        return;
    }

    try {
        const refCorrecaoFinal = firebase.database().ref(`CorrecaoFinal/${clienteId}/${tipoProjeto}/${nomeListaOriginal}/itensProcessados`);
        const snapshot = await refCorrecaoFinal.once("value");
        const itens = snapshot.val() || [];

        console.log("Dados recuperados do Firebase para tabelaCorrecao:", itens);
        // --- NOVO LOG DE DEBUG --- //
        itens.forEach((item, index) => {
            console.log(`Item ${index}: fonteEstoque = ${item.fonteEstoque}, qtdCompraFinal = ${item.qtdCompraFinal}, qtdUsadaEstoque = ${item.qtdUsadaEstoque}`);
        });
        // --- FIM DO NOVO LOG DE DEBUG --- //

        if (tabelaCorrecao) {
            tabelaCorrecao.clear().rows.add(itens).draw();
        }

        // Esconde o botão de download do Excel fora do modal, se ele existir
        const btnDownloadExcelMain = document.getElementById("btnDownloadExcel");
        if (btnDownloadExcelMain) {
            btnDownloadExcelMain.style.display = "none";
        }

        if (itens.length === 0) {
            if (typeof mostrarNotificacao === "function") mostrarNotificacao("Nenhum dado encontrado para CorrecaoFinal com as seleções atuais.", "info");
        }
    } catch (error) {
        console.error("Erro ao buscar e carregar CorrecaoFinal:", error);
        if (typeof mostrarNotificacao === "function") {
            mostrarNotificacao("Erro ao carregar dados de CorrecaoFinal.", "danger");
        }
    }
}

// Função principal para gerar a separação
async function gerarSeparacao() {
    const clienteId = document.getElementById("selectCliente").value;
    const tipoProjeto = document.getElementById("selectTipoProjeto").value;
    const nomeListaOriginal = document.getElementById("selectLista").value;
    const inputArquivo = document.getElementById("inputArquivo");
    const arquivo = inputArquivo.files[0];

    if (!clienteId || !tipoProjeto || !nomeListaOriginal || !arquivo) {
        if (typeof mostrarNotificacao === "function") {
            mostrarNotificacao("Por favor, preencha todos os campos e selecione um arquivo.", "warning");
        }
        return;
    }

    if (typeof mostrarNotificacao === "function") mostrarNotificacao("Processando arquivo e comparando listas...", "info");

    try {
        // 1. Processar o arquivo de separação e salvar em SeparacaoProd
        await processarArquivoInputSeparacao(arquivo, clienteId, tipoProjeto, nomeListaOriginal);

        // 2. Comparar as listas e salvar em CorrecaoFinal
        const itensCorrecaoFinal = await compararListas(clienteId, tipoProjeto, nomeListaOriginal);

        // 3. Carregar os dados na tabela
        if (tabelaCorrecao) {
            tabelaCorrecao.clear().rows.add(itensCorrecaoFinal).draw();
        }

        if (typeof mostrarNotificacao === "function") mostrarNotificacao("Separação gerada com sucesso!", "success");
    } catch (error) {
        console.error("Erro ao gerar separação:", error);
        if (typeof mostrarNotificacao === "function") mostrarNotificacao(`Erro ao gerar separação: ${error.message}`, "danger");
    }
}

// --- Funções Auxiliares para Processamento de Arquivos (mantidas) ---
function obterTipoArquivo(nomeArquivo) {
    const ext = nomeArquivo.split(".").pop().toLowerCase();
    if (["csv"].includes(ext)) return "csv";
    if (["xlsx", "xls"].includes(ext)) return "xlsx";
    if (["xml"].includes(ext)) return "xml";
    return null;
}

function processarCSV(conteudo) {
    const linhas = conteudo.split(/\r\n|\n/).filter(line => line.trim() !== "");
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
    const workbook = XLSX.read(data, { type: "array" });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const json = XLSX.utils.sheet_to_json(worksheet);

    // Mapear para garantir que os nomes das colunas correspondem ao esperado
    return json.map(row => ({
        codigo: row["Código"] || row["CODIGO"] || "",
        descricao: row["Descrição"] || row["DESCRICAO"] || "",
        quantidade: parseFloat(row["Quantidade"]) || parseFloat(row["QUANTIDADE"]) || 0,
        altura: row["Altura"] || row["ALTURA"] || "",
        largura: row["Largura"] || row["LARGURA"] || "",
        medida: row["Medida"] || row["MEDIDA"] || "",
        cor: row["Cor"] || row["COR"] || "",
        observacao: row["Observação"] || row["OBSERVACAO"] || ""
    }));
}

function processarXML(conteudo) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(conteudo, "text/xml");
    const itens = [];
    const itemNodes = xmlDoc.querySelectorAll("item"); // Supondo que cada item esteja em uma tag <item>

    itemNodes.forEach(node => {
        const item = {};
        // Exemplo: extrair dados de tags filhas
        item.codigo = node.querySelector("codigo")?.textContent || "";
        item.descricao = node.querySelector("descricao")?.textContent || "";
        item.quantidade = parseFloat(node.querySelector("quantidade")?.textContent) || 0;
        item.altura = node.querySelector("altura")?.textContent || "";
        item.largura = node.querySelector("largura")?.textContent || "";
        item.medida = node.querySelector("medida")?.textContent || "";
        item.cor = node.querySelector("cor")?.textContent || "";
        item.observacao = node.querySelector("observacao")?.textContent || "";
        itens.push(item);
    });
    return itens;
}

// FIM DO ARQUIVO js/separacao.js


