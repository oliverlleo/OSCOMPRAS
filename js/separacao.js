// INÍCIO DO ARQUIVO js/separacao.js

let tabelaCorrecao = null; // Variável global para a DataTable

document.addEventListener("DOMContentLoaded", () => {
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

    // Inicializa DataTable
    if (typeof $ !== "undefined" && $.fn && $.fn.DataTable) {
        if (!$.fn.DataTable.isDataTable("#tabelaCorrecao")) {
            tabelaCorrecao = $("#tabelaCorrecao").DataTable({
                responsive: true,
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
    const listaSepProdItensRaw = snapSep.exists() ? snapSep.val() : [];
    const mapListaSeparacao = new Map();
    const listaSepProdItens = Array.isArray(listaSepProdItensRaw)
        ? listaSepProdItensRaw
        : typeof listaSepProdItensRaw === "object" && listaSepProdItensRaw !== null
        ? Object.values(listaSepProdItensRaw)
        : [];

    listaSepProdItens.forEach((item) => {
        if (item && item.codigo) {
            const codigo = String(item.codigo).trim();
            if (mapListaSeparacao.has(codigo)) {
                const existente = mapListaSeparacao.get(codigo);
                existente.quantidade += parseFloat(item.quantidade) || 0;
            } else {
                mapListaSeparacao.set(codigo, { ...item, quantidade: parseFloat(item.quantidade) || 0 });
            }
        }
    });

    // 3. Comparar e Gerar Correção Final
    const itensProcessados = [];
    const codigosProcessados = new Set();

    for (const [codigoSep, itemSep] of mapListaSeparacao.entries()) {
        codigosProcessados.add(codigoSep);
        const itemOriginal = mapListaOriginal.get(codigoSep);
        const quantidadeDesejadaSeparacao = itemSep.quantidade;
        let itemProcessado = {
            codigo: codigoSep,
            descricao: itemSep.descricao || (itemOriginal ? itemOriginal.descricao : "Sem descrição"),
            quantidadeDesejadaSeparacao: quantidadeDesejadaSeparacao,
            quantidadeDisponivelOriginal: 0,
            quantidadeParaSepararReal: 0,
            quantidadeCompraAdicional: 0,
            quantidadeDevolucaoEstoque: 0,
            statusComparacao: "",
            altura: itemSep.altura || (itemOriginal ? itemOriginal.altura : ""),
            largura: itemSep.largura || (itemOriginal ? itemOriginal.largura : ""),
            medida: itemSep.medida || (itemOriginal ? itemOriginal.medida : ""),
            cor: itemSep.cor || (itemOriginal ? itemOriginal.cor : ""),
            observacao: itemSep.observacao || (itemOriginal ? itemOriginal.observacao : ""),
        };

        if (itemOriginal) {
            itemProcessado.quantidadeDisponivelOriginal = itemOriginal.quantidadeDisponivelOriginal;
            if (quantidadeDesejadaSeparacao === itemOriginal.quantidadeDisponivelOriginal) {
                itemProcessado.statusComparacao = "Liberar para Separação";
                itemProcessado.quantidadeParaSepararReal = quantidadeDesejadaSeparacao;
            } else if (quantidadeDesejadaSeparacao < itemOriginal.quantidadeDisponivelOriginal) {
                itemProcessado.statusComparacao = "Liberar e Devolver ao Estoque";
                itemProcessado.quantidadeParaSepararReal = quantidadeDesejadaSeparacao;
                itemProcessado.quantidadeDevolucaoEstoque = itemOriginal.quantidadeDisponivelOriginal - quantidadeDesejadaSeparacao;
            } else {
                itemProcessado.statusComparacao = "Liberar Parcial e Comprar Adicional";
                itemProcessado.quantidadeParaSepararReal = itemOriginal.quantidadeDisponivelOriginal;
                itemProcessado.quantidadeCompraAdicional = quantidadeDesejadaSeparacao - itemOriginal.quantidadeDisponivelOriginal;
            }
        } else {
            itemProcessado.statusComparacao = "Item Novo - Necessidade de Compra";
            itemProcessado.quantidadeCompraAdicional = quantidadeDesejadaSeparacao;
        }
        itensProcessados.push(itemProcessado);
    }

    for (const [codigoOrig, itemOriginal] of mapListaOriginal.entries()) {
        if (!codigosProcessados.has(codigoOrig) && itemOriginal.quantidadeDisponivelOriginal > 0) {
            itensProcessados.push({
                codigo: codigoOrig,
                descricao: itemOriginal.descricao || "Sem descrição",
                quantidadeDesejadaSeparacao: 0,
                quantidadeDisponivelOriginal: itemOriginal.quantidadeDisponivelOriginal,
                quantidadeParaSepararReal: 0,
                quantidadeCompraAdicional: 0,
                quantidadeDevolucaoEstoque: itemOriginal.quantidadeDisponivelOriginal,
                statusComparacao: "Devolver Estoque Integral (Não Solicitado na Separação)",
                altura: itemOriginal.altura || "",
                largura: itemOriginal.largura || "",
                medida: itemOriginal.medida || "",
                cor: itemOriginal.cor || "",
                observacao: itemOriginal.observacao || "",
            });
        }
    }

    // 4. Salvar Correção Final
    const refCorrecao = firebase.database().ref(`CorrecaoFinal/${clienteId}/${tipoProjeto}/${nomeListaOriginal}/itensProcessados`);
    await refCorrecao.set(itensProcessados);
    if (typeof mostrarNotificacao === "function")
        mostrarNotificacao(`Comparação concluída. ${itensProcessados.length} itens processados e salvos em Correção Final.`, "success");
    return itensProcessados;
}

// Preenche a tabela com os dados fornecidos
function preencherTabelaCorrecao(itensProcessados) {
    if (!tabelaCorrecao) {
        console.error("DataTable não inicializada.");
        if (typeof mostrarNotificacao === "function") mostrarNotificacao("Erro ao exibir resultados: Tabela não encontrada.", "danger");
        return;
    }

    // Garante que itensProcessados seja um array
    const dadosParaTabela = Array.isArray(itensProcessados)
        ? itensProcessados
        : typeof itensProcessados === "object" && itensProcessados !== null
        ? Object.values(itensProcessados)
        : [];

    if (dadosParaTabela.length === 0) {
        if (typeof mostrarNotificacao === "function") mostrarNotificacao("Nenhum item processado para exibir.", "info");
        tabelaCorrecao.clear().draw();
        return;
    }

    try {
        tabelaCorrecao.clear();
        tabelaCorrecao.rows.add(dadosParaTabela);
        tabelaCorrecao.draw();
        if (typeof mostrarNotificacao === "function") mostrarNotificacao("Tabela de correção atualizada.", "success");
    } catch (error) {
        console.error("Erro ao preencher a DataTable:", error);
        if (typeof mostrarNotificacao === "function") mostrarNotificacao("Erro ao exibir os resultados na tabela.", "danger");
    }
}

// NOVA FUNÇÃO: Busca e carrega CorrecaoFinal existente
async function buscarECarregarCorrecaoFinal(clienteId, tipoProjeto, nomeListaOriginal) {
    if (!clienteId || !tipoProjeto || !nomeListaOriginal) {
        return; // Não faz nada se a seleção estiver incompleta
    }

    const refCorrecao = firebase.database().ref(`CorrecaoFinal/${clienteId}/${tipoProjeto}/${nomeListaOriginal}/itensProcessados`);
    
    if (typeof mostrarNotificacao === "function") mostrarNotificacao("Verificando resultados anteriores...", "info");

    try {
        const snapshot = await refCorrecao.once("value");
        if (snapshot.exists()) {
            const dadosSalvos = snapshot.val();
            preencherTabelaCorrecao(dadosSalvos);
            if (typeof mostrarNotificacao === "function") mostrarNotificacao("Resultados anteriores carregados.", "success");
        } else {
            if (typeof mostrarNotificacao === "function") mostrarNotificacao("Nenhum resultado anterior encontrado para esta seleção. Processe um arquivo.", "info");
            if (tabelaCorrecao) tabelaCorrecao.clear().draw(); // Garante que a tabela esteja limpa
        }
    } catch (error) {
        console.error("Erro ao buscar CorrecaoFinal existente:", error);
        if (typeof mostrarNotificacao === "function") mostrarNotificacao("Erro ao buscar dados anteriores.", "danger");
        if (tabelaCorrecao) tabelaCorrecao.clear().draw(); // Limpa em caso de erro
    }
}

// Função principal acionada pelo botão "Gerar Separação"
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
    if (!arquivo) {
        if (typeof mostrarNotificacao === "function") mostrarNotificacao("Por favor, selecione um arquivo com a nova lista de separação.", "warning");
        return;
    }

    const btnGerar = document.getElementById("btnGerar");
    btnGerar.disabled = true;
    btnGerar.textContent = "Processando...";

    try {
        // 1. Processar arquivo e salvar em SeparacaoProd
        if (typeof mostrarNotificacao === "function") mostrarNotificacao("Processando arquivo...", "info");
        const itensSeparacaoSalvos = await processarArquivoInputSeparacao(arquivo, clienteId, tipoProjeto, nomeListaOriginal);
        if (typeof mostrarNotificacao === "function") mostrarNotificacao(`Arquivo processado, ${itensSeparacaoSalvos.length} itens salvos em SeparacaoProd.`, "success");

        // 2. Comparar listas e salvar em CorrecaoFinal
        const itensCorrecaoFinal = await compararListas(clienteId, tipoProjeto, nomeListaOriginal);

        // 3. Preencher a tabela com os novos resultados
        preencherTabelaCorrecao(itensCorrecaoFinal);

    } catch (error) {
        console.error("Erro no processo de gerar separação:", error);
        if (typeof mostrarNotificacao === "function") mostrarNotificacao(`Erro: ${error.message}`, "danger");
        if (tabelaCorrecao) tabelaCorrecao.clear().draw();
    } finally {
        btnGerar.disabled = false;
        btnGerar.textContent = "Gerar Separação";
        inputArquivo.value = "";
    }
}

// FIM DO ARQUIVO js/separacao.js

