/**
 * processamento-arquivos-tratamento.js
 * * Funções específicas para processamento de arquivos na tela de tratamento de dados.
 * Este arquivo contém a lógica para processar arquivos de tratamento, salvá-los
 * e compará-los com as listas existentes.
 * * @version 1.2.0
 * @description Corrigida a referência ao Firebase (window.dbRef.projetos) para restaurar a funcionalidade de salvamento e comparação.
 */

// ================================================================================= //
// FUNÇÕES PRINCIPAIS DA TELA DE TRATAMENTO
// ================================================================================= //

/**
 * Processa um arquivo de tratamento e salva como "Lista Tratamento".
 * * @param {File} arquivo - O arquivo a ser processado.
 * @param {string} clienteId - ID do cliente.
 * @returns {Promise<Object>} - Promise que resolve com os dados processados ou rejeita com um erro.
 */
function processarArquivoTratamento(arquivo, clienteId) {
  return new Promise((resolve, reject) => {
    console.log("Iniciando processamento de arquivo de tratamento...");

    if (!arquivo) {
      return reject(new Error("Nenhum arquivo fornecido"));
    }

    const tipoArquivo = obterTipoArquivo(arquivo.name);
    if (!tipoArquivo) {
      return reject(
        new Error(
          `Formato de arquivo não suportado: ${arquivo.name
            .split(".")
            .pop()
            .toLowerCase()}`
        )
      );
    }

    const reader = new FileReader();

    reader.onload = function (e) {
      try {
        let dados = [];
        let mensagemErro = "";
        const conteudo = e.target.result;

        switch (tipoArquivo) {
          case "csv":
            try {
              dados = processarCSV(conteudo);
            } catch (csvError) {
              console.error("Erro ao processar CSV (tentativa 1):", csvError);
              mensagemErro = `Erro ao processar CSV: ${csvError.message}. Tentando com outros separadores...`;
              const separadores = [",", ";", "\t", "|"];
              for (const sep of separadores) {
                try {
                  dados = processarCSVComSeparador(conteudo, sep);
                  if (dados && dados.length > 0) {
                    console.log(
                      `Processamento alternativo com separador "${sep}" bem-sucedido.`
                    );
                    mensagemErro = "";
                    break;
                  }
                } catch (err) {
                  /* Continua tentando */
                }
              }
            }
            break;

          case "xlsx":
            try {
              // Lógica de processamento de XLSX corrigida
              dados = processarXLSX(conteudo);
            } catch (xlsxError) {
              mensagemErro = `Erro ao processar XLSX: ${xlsxError.message}`;
              console.error(mensagemErro);
            }
            break;

          case "xml":
            // A lógica para XML permanece, caso seja necessária no futuro.
            try {
              dados = processarXML(conteudo);
            } catch (xmlError) {
              console.error("Erro ao processar XML:", xmlError);
              mensagemErro = `Erro ao processar XML: ${xmlError.message}`;
            }
            break;
        }

        if ((!dados || dados.length === 0) && mensagemErro) {
          return reject(new Error(mensagemErro));
        }

        if (!dados || dados.length === 0) {
          console.warn(
            "Não foi possível extrair dados do arquivo. Criando itens de demonstração."
          );
          dados = criarItensDemonstracao(arquivo.name);
        }

        salvarListaTratamentoNoFirebase(dados, clienteId)
          .then(() => {
            resolve({
              sucesso: true,
              mensagem: `${dados.length} itens processados com sucesso`,
              itens: dados.length,
              dados: dados, // Retorna os dados para uso na comparação
            });
          })
          .catch((error) => {
            console.error("Erro ao salvar no Firebase:", error);
            // Propaga o erro original para a chamada principal
            reject(new Error(`Erro ao salvar no Firebase: ${error.message}`));
          });
      } catch (error) {
        console.error("Erro geral ao processar arquivo de tratamento:", error);
        reject(new Error(`Erro ao processar arquivo: ${error.message}`));
      }
    };

    reader.onerror = function (error) {
      console.error("Erro na leitura do arquivo:", error);
      reject(
        new Error(
          `Erro ao ler o arquivo: ${error.message || "Erro desconhecido"}`
        )
      );
    };

    if (tipoArquivo === "xlsx") {
      reader.readAsArrayBuffer(arquivo);
    } else {
      reader.readAsText(arquivo, "ISO-8859-1");
    }
  });
}

/**
 * Salva a Lista Tratamento no Firebase.
 * * @param {Array<Object>} itens - Array de itens a serem salvos.
 * @param {string} clienteId - ID do cliente.
 * @returns {Promise<void>}
 */
function salvarListaTratamentoNoFirebase(itens, clienteId) {
  return new Promise((resolve, reject) => {
    console.log(
      `Salvando ${itens.length} itens como Lista Tratamento para o cliente ${clienteId}...`
    );

    // CORREÇÃO: Verificação restaurada para o formato original que funcionava.
    if (!window.dbRef || !window.dbRef.projetos) {
      return reject(
        new Error(
          "Referência ao banco de dados (window.dbRef.projetos) não disponível ou inválida."
        )
      );
    }

    // CORREÇÃO: Referência restaurada para o formato original.
    const listaTratamentoRef = window.dbRef.projetos
      .child(clienteId)
      .child("Tratamento")
      .child("listas")
      .child("ListaTratamento");

    const dadosLista = {
      timestamp: Date.now(),
      itens: itens,
    };

    listaTratamentoRef
      .set(dadosLista)
      .then(() => {
        console.log("Lista Tratamento salva com sucesso no Firebase.");
        resolve();
      })
      .catch((error) => {
        console.error("Erro ao salvar Lista Tratamento no Firebase:", error);
        reject(error);
      });
  });
}

/**
 * Compara os itens de todas as listas de um cliente com a Lista Tratamento (planilha de estoque/disponibilidade atual).
 * Atualiza o empenho e necessidade de forma incremental.
 * @param {string} clienteId - ID do cliente.
 * @returns {Promise<void>}
 */
function compararComListaTratamento(clienteId) {
  return new Promise((resolve, reject) => {
    console.log("Iniciando comparação incremental com Lista Tratamento...");

    if (!clienteId) {
      return reject(new Error("Nenhum cliente selecionado para comparação."));
    }
    if (!window.dbRef || !window.dbRef.projetos) {
      return reject(
        new Error("Referência ao banco de dados (window.dbRef.projetos) não disponível ou inválida.")
      );
    }

    const projetosRef = window.dbRef.projetos;
    const clienteRef = projetosRef.child(clienteId);

    // 1. Obter a ListaTratamento (itens da planilha de "estoque" recém-enviada)
    clienteRef.child("Tratamento/listas/ListaTratamento").once("value")
      .then(snapshotTratamento => {
        const listaTratamentoData = snapshotTratamento.val();

        // Mesmo que a lista de tratamento esteja vazia ou não exista, prosseguimos,
        // pois os itens do projeto ainda precisam ter seu estado preservado ou avaliado.
        let itensTratamentoMap = new Map();
        if (listaTratamentoData && Array.isArray(listaTratamentoData.itens)) {
          console.log(`Lista Tratamento encontrada com ${listaTratamentoData.itens.length} itens.`);
          itensTratamentoMap = new Map(
            listaTratamentoData.itens.map(item => [item.codigo, item])
          );
        } else {
          console.log("Lista Tratamento não encontrada, vazia ou em formato incorreto. Nenhum item da planilha atual será usado para empenho.");
        }

        // 2. Obter o snapshot de TODOS os projetos/listas/itens do cliente
        return clienteRef.once("value").then(snapshotTodosProjetosCliente => ({
          todosProjetosCliente: snapshotTodosProjetosCliente.val(),
          itensTratamentoMap // Passa o mapa da lista de tratamento (pode estar vazio)
        }));
      })
      .then(({ todosProjetosCliente, itensTratamentoMap }) => {
        if (!todosProjetosCliente) {
          // Isso não deve acontecer se o cliente existe, mas é uma salvaguarda.
          console.warn("Nenhum projeto encontrado para este cliente no snapshot geral. Verifique a estrutura de dados.");
          return resolve(); // Resolve para não quebrar a cadeia, mas nada será feito.
        }

        const promessasAtualizacao = [];

        Object.entries(todosProjetosCliente).forEach(([tipoProjeto, projeto]) => {
          // Ignora o próprio nó "Tratamento", projetos sem listas ou projetos terceirizados.
          if (tipoProjeto === "Tratamento" || !projeto || !projeto.listas || projeto.terceirizado) {
            return;
          }

          Object.entries(projeto.listas).forEach(([nomeLista, itensListaProjeto]) => {
            if (!Array.isArray(itensListaProjeto)) {
              console.warn(`Lista ${nomeLista} em ${tipoProjeto} não é um array. Pulando.`);
              return;
            }

            itensListaProjeto.forEach((itemListaProjeto, index) => {
              if (!itemListaProjeto || typeof itemListaProjeto.codigo === 'undefined') {
                console.warn(`Item inválido no índice ${index} da lista ${nomeLista} em ${tipoProjeto}. Pulando.`);
                return;
              }

              const quantidadeNecessariaOriginal = parseInt(itemListaProjeto.quantidade, 10) || 0;

              // Estado atual do item no Firebase (já está em itemListaProjeto)
              const empenhoAnterior = parseInt(itemListaProjeto.empenho, 10) || 0;
              let necessidadeAnteriorCalculada = quantidadeNecessariaOriginal - empenhoAnterior;
              if (necessidadeAnteriorCalculada < 0) {
                necessidadeAnteriorCalculada = 0; // Não pode ser negativa
              }

              let novoEmpenhoTotal = empenhoAnterior;
              let novaNecessidade = necessidadeAnteriorCalculada;

              // Logging dos valores iniciais para este item
              console.log(`COMPARANDO ITEM: ${itemListaProjeto.codigo} da lista ${nomeLista} (${tipoProjeto})`);
              console.log(`  Quantidade Original: ${quantidadeNecessariaOriginal}`);
              console.log(`  Empenho Anterior Lido: ${empenhoAnterior}`);
              console.log(`  Necessidade Anterior Calculada: ${necessidadeAnteriorCalculada}`);

              // Verifica se o item ATUAL da lista de materiais (ex: PVC) existe na ListaTratamento (planilha de estoque recém-enviada)
              const itemDaPlanilhaTratamento = itensTratamentoMap.get(itemListaProjeto.codigo);

              if (itemDaPlanilhaTratamento) {
                console.log(`  Item ${itemListaProjeto.codigo} ENCONTRADO na ListaTratamento atual.`);
                // Item existe na planilha de tratamento atual. Tentar empenhar mais.
                const quantidadeDisponivelTratamentoAtual = parseInt(itemDaPlanilhaTratamento.quantidade, 10) || 0;
                console.log(`    Qtd Disponível na ListaTratamento: ${quantidadeDisponivelTratamentoAtual}`);

                // Quanto deste item da planilha de tratamento pode ser usado para abater a necessidade PENDENTE (necessidadeAnteriorCalculada).
                const podeEmpenharDestaVez = Math.min(necessidadeAnteriorCalculada, quantidadeDisponivelTratamentoAtual);
                console.log(`    Pode Empenhar Desta Vez: ${podeEmpenharDestaVez}`);

                if (podeEmpenharDestaVez > 0) {
                    novoEmpenhoTotal = empenhoAnterior + podeEmpenharDestaVez;
                    novaNecessidade = quantidadeNecessariaOriginal - novoEmpenhoTotal;
                }
                console.log(`    Novo Empenho (parcial): ${novoEmpenhoTotal}, Nova Necessidade (parcial): ${novaNecessidade}`);
                // Se podeEmpenharDestaVez for 0 (ou seja, não há mais necessidade anterior ou não há quantidade na planilha),
                // os valores de empenho e necessidade permanecem como estavam (baseados no empenho anterior).
              } else {
                console.log(`  Item ${itemListaProjeto.codigo} NÃO encontrado na ListaTratamento atual. Mantendo estado anterior.`);
              }
              // Se itemDaPlanilhaTratamento NÃO existe, o item da lista de material (ex: PVC) não está na planilha de "estoque" atual.
              // Nesse caso, novoEmpenhoTotal e novaNecessidade permanecem como empenhoAnterior e necessidadeAnteriorCalculada.
              // Ou seja, o estado anterior do item é preservado.

              // Ajusta a necessidade para não ser negativa e o empenho para não exceder o original.
              if (novaNecessidade < 0) novaNecessidade = 0;
              if (novoEmpenhoTotal > quantidadeNecessariaOriginal) novoEmpenhoTotal = quantidadeNecessariaOriginal;
              if (novaNecessidade === 0 && novoEmpenhoTotal < quantidadeNecessariaOriginal) { // Ajuste caso arredondamentos causem problemas
                  novoEmpenhoTotal = quantidadeNecessariaOriginal;
              }

              let statusFinal = "Compras"; // Default
              if (novaNecessidade <= 0) {
                statusFinal = "Empenho";
              } else if (novoEmpenhoTotal > 0) {
                statusFinal = "Empenho/Compras";
              }

              // Logging dos valores finais antes do update
              console.log(`  Valores FINAIS para ${itemListaProjeto.codigo}: Empenho=${novoEmpenhoTotal}, Necessidade=${novaNecessidade}, Status=${statusFinal}`);

              // Monta o caminho para o item específico para atualização
              const itemRef = clienteRef.child(tipoProjeto).child("listas").child(nomeLista).child(index.toString());

              // Adiciona à promessa apenas se houver mudança real para evitar escritas desnecessárias
              if (itemListaProjeto.empenho !== novoEmpenhoTotal ||
                  (itemListaProjeto.necessidade !== undefined ? itemListaProjeto.necessidade : quantidadeNecessariaOriginal - empenhoAnterior) !== novaNecessidade || // Compara com necessidade anterior se .necessidade não existir
                  itemListaProjeto.status !== statusFinal) {
                console.log(`    >>> ATUALIZANDO FIREBASE para ${itemListaProjeto.codigo}`);
                promessasAtualizacao.push(
                  itemRef.update({
                    empenho: novoEmpenhoTotal,
                    necessidade: novaNecessidade,
                    status: statusFinal,
                  })
                );
              } else {
                console.log(`    >>> SEM MUDANÇAS para ${itemListaProjeto.codigo}, não atualizando Firebase.`);
              }
            });
          });
        });

        if (promessasAtualizacao.length === 0) {
          console.log("Nenhuma atualização de item necessária após comparação.");
          return Promise.resolve();
        }

        console.log(`Aplicando ${promessasAtualizacao.length} atualizações incrementais de status...`);
        return Promise.all(promessasAtualizacao);
      })
      .then(() => {
        console.log("Comparação e atualização incremental com Lista Tratamento concluída com sucesso.");
        resolve();
      })
      .catch((error) => {
        console.error("Erro no processo de comparação incremental com Lista Tratamento:", error);
        reject(error);
      });
  });
}

// ================================================================================= //
// FUNÇÕES AUXILIARES DE PROCESSAMENTO (LÓGICA JÁ CORRIGIDA)
// ================================================================================= //
// Nenhuma alteração nesta seção.

function criarItensDemonstracao(nomeArquivo) {
  const baseNome = nomeArquivo.split(".")[0];
  return [
    {
      codigo: "001-DEMO",
      descricao: `Item demonstrativo 1 (${baseNome})`,
      quantidade: 10,
    },
    {
      codigo: "002-DEMO",
      descricao: `Item demonstrativo 2 (${baseNome})`,
      quantidade: 5,
    },
  ];
}

function obterTipoArquivo(nomeArquivo) {
  if (!nomeArquivo) return null;
  const extensao = nomeArquivo.split(".").pop().toLowerCase();
  switch (extensao) {
    case "csv":
    case "txt":
      return "csv";
    case "xlsx":
    case "xls":
      return "xlsx";
    case "xml":
      return "xml";
    default:
      return null;
  }
}

function processarXLSX(conteudo) {
  if (typeof XLSX === "undefined")
    throw new Error("A biblioteca SheetJS (xlsx.js) não foi carregada.");
  const workbook = XLSX.read(conteudo, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName)
    throw new Error("Nenhuma planilha encontrada no arquivo XLSX.");
  const worksheet = workbook.Sheets[sheetName];
  const linhasArray = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: "",
  });
  if (linhasArray.length === 0) throw new Error("A planilha XLSX está vazia.");
  return processarDadosTabulares(linhasArray);
}

function processarCSV(conteudo) {
  if (!conteudo || !conteudo.trim()) throw new Error("Arquivo CSV vazio.");
  const separador = detectarSeparadorCSV(conteudo);
  return processarCSVComSeparador(conteudo, separador);
}

function processarCSVComSeparador(conteudo, separador) {
  if (!conteudo || !conteudo.trim()) throw new Error("Arquivo CSV vazio.");
  const linhasArray = conteudo
    .split(/\r?\n/)
    .filter((l) => l.trim())
    .map((l) => l.split(separador));
  if (linhasArray.length === 0)
    throw new Error("CSV não contém linhas válidas.");
  return processarDadosTabulares(linhasArray);
}

function processarDadosTabulares(linhas) {
  let linhaCabecalhoIdx = -1;
  let cabecalhos = [];
  for (let i = 0; i < Math.min(5, linhas.length); i++) {
    const tempHeaders = linhas[i].map((c) => String(c || "").trim());
    if (
      tempHeaders.some((h) => /\b(cod|doc|desc|quant|item|prod|ref)\b/i.test(h))
    ) {
      linhaCabecalhoIdx = i;
      cabecalhos = tempHeaders;
      break;
    }
  }
  if (linhaCabecalhoIdx === -1 && linhas.length > 0) {
    linhaCabecalhoIdx = 0;
    cabecalhos = linhas[0].map((c) => String(c || "").trim());
  }

  const mapeamento = mapearCampos(cabecalhos);
  if (mapeamento.codigo === undefined && mapeamento.descricao === undefined) {
    console.warn(
      "Mapeamento por cabeçalho falhou, usando mapeamento por posição."
    );
    mapeamento.codigo = 0;
    mapeamento.descricao = 1;
    mapeamento.quantidade = 2;
  }

  const dados = [];
  for (let i = linhaCabecalhoIdx + 1; i < linhas.length; i++) {
    const valores = linhas[i].map((v) => String(v || "").trim());
    if (valores.every((v) => v === "")) continue;
    const item = extrairItem(valores, mapeamento);
    if (item) dados.push(item);
  }
  return dados;
}

function mapearCampos(cabecalhos) {
  const mapeamento = {};
  const possiveisNomes = {
    codigo: [
      "codigo",
      "cod",
      "cdg",
      "codprod",
      "coditem",
      "sku",
      "id",
      "ref",
      "referencia",
    ],
    descricao: [
      "descricao",
      "desc",
      "produto",
      "nome",
      "item",
      "descprod",
      "description",
    ],
    quantidade: [
      "quantidade",
      "quant",
      "qtd",
      "qtde",
      "qtdprod",
      "quantity",
      "qty",
    ],
  };
  cabecalhos.forEach((cabecalho, indice) => {
    if (!cabecalho) return;
    const cabecalhoNormalizado = normalizarTexto(cabecalho)
      .toLowerCase()
      .trim();
    for (const [campo, nomes] of Object.entries(possiveisNomes)) {
      if (mapeamento[campo] !== undefined) continue;
      let isMatch = nomes.some((nome) => cabecalhoNormalizado.includes(nome));
      if (
        !isMatch &&
        campo === "codigo" &&
        /\bdoc\b/i.test(cabecalhoNormalizado)
      ) {
        isMatch = true;
      }
      if (isMatch) {
        mapeamento[campo] = indice;
      }
    }
  });
  return mapeamento;
}

function extrairItem(valores, mapeamento) {
  const getVal = (campo) =>
    mapeamento[campo] !== undefined ? valores[mapeamento[campo]] : null;
  let codigo = getVal("codigo");
  let descricao = getVal("descricao");
  if (!codigo && !descricao) return null;
  codigo =
    codigo || `GEN-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
  descricao = descricao || `Item ${codigo}`;
  let quantidadeStr = getVal("quantidade") || "1";
  let quantidade =
    parseInt(
      String(quantidadeStr)
        .replace(/[^\d.,]/g, "")
        .replace(",", "."),
      10
    ) || 1;
  return {
    codigo: normalizarTexto(codigo),
    descricao: normalizarTexto(descricao),
    quantidade: quantidade,
  };
}

function detectarSeparadorCSV(conteudo) {
  const linhasAmostra = conteudo
    .split(/\r?\n/)
    .slice(0, 10)
    .filter((l) => l.trim());
  if (linhasAmostra.length === 0) return ",";
  const contagens = { ";": 0, ",": 0, "\t": 0, "|": 0 };
  linhasAmostra.forEach((linha) => {
    if (linha.split(";").length > 1) contagens[";"]++;
    if (linha.split(",").length > 1) contagens[","]++;
    if (linha.split("\t").length > 1) contagens["\t"]++;
    if (linha.split("|").length > 1) contagens["|"]++;
  });
  return Object.keys(contagens).reduce(
    (a, b) => (contagens[a] > contagens[b] ? a : b),
    ","
  );
}

function normalizarTexto(texto) {
  if (!texto) return "";
  return String(texto)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}
