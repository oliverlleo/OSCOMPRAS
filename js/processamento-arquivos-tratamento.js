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
 * Compara os itens de todas as listas de um cliente com a Lista Tratamento.
 * * @param {string} clienteId - ID do cliente.
 * @returns {Promise<void>}
 */
function compararComListaTratamento(clienteId) {
  return new Promise((resolve, reject) => {
    console.log("Iniciando comparação com Lista Tratamento...");

    if (!clienteId) {
      return reject(new Error("Nenhum cliente selecionado para comparação."));
    }
    // CORREÇÃO: Verificação restaurada para o formato original.
    if (!window.dbRef || !window.dbRef.projetos) {
      return reject(
        new Error(
          "Referência ao banco de dados (window.dbRef.projetos) não disponível ou inválida."
        )
      );
    }

    // CORREÇÃO: Referência base para as operações restaurada.
    const projetosRef = window.dbRef.projetos;
    const clienteRef = projetosRef.child(clienteId);

    clienteRef
      .child("Tratamento/listas/ListaTratamento")
      .once("value")
      .then((snapshotTratamento) => {
        const listaTratamentoData = snapshotTratamento.val();

        if (
          !listaTratamentoData ||
          !Array.isArray(listaTratamentoData.itens) ||
          listaTratamentoData.itens.length === 0
        ) {
          return reject(new Error("Lista Tratamento não encontrada ou vazia."));
        }

        console.log(
          `Lista Tratamento encontrada com ${listaTratamentoData.itens.length} itens.`
        );

        const itensTratamentoMap = new Map(
          listaTratamentoData.itens.map((item) => [item.codigo, item])
        );

        return clienteRef
          .once("value")
          .then((snapshotProjetos) => ({
            projetos: snapshotProjetos.val(),
            itensTratamentoMap,
          }));
      })
      .then(({ projetos, itensTratamentoMap }) => {
        if (!projetos) {
          return reject(
            new Error("Nenhum projeto encontrado para este cliente.")
          );
        }

        // CORREÇÃO: Usando a abordagem original com Promise.all para garantir a construção correta dos caminhos.
        const promessasAtualizacao = [];

        Object.entries(projetos).forEach(([tipoProjeto, projeto]) => {
          if (
            tipoProjeto === "Tratamento" ||
            !projeto.listas ||
            projeto.terceirizado
          ) {
            return;
          }

          Object.entries(projeto.listas).forEach(([nomeLista, itens]) => {
            if (!Array.isArray(itens)) return;

            itens.forEach((item, index) => {
              const itemTratado = itensTratamentoMap.get(item.codigo);
              const quantidadeNecessaria = parseInt(item.quantidade, 10) || 0;

              let empenho = 0;
              let necessidade = quantidadeNecessaria;
              let status = "Compras";

              if (itemTratado) {
                const quantidadeTratamento =
                  parseInt(itemTratado.quantidade, 10) || 0;
                if (quantidadeTratamento >= quantidadeNecessaria) {
                  empenho = quantidadeNecessaria;
                  necessidade = 0;
                  status = "Empenho";
                } else {
                  empenho = quantidadeTratamento;
                  necessidade = quantidadeNecessaria - quantidadeTratamento;
                  status = "Empenho/Compras";
                }
              }

              // CORREÇÃO: Construindo a referência do item corretamente.
              const itemRef = clienteRef
                .child(tipoProjeto)
                .child("listas")
                .child(nomeLista)
                .child(index);
              promessasAtualizacao.push(
                itemRef.update({
                  empenho: empenho,
                  necessidade: necessidade,
                  status: status,
                })
              );
            });
          });
        });

        if (promessasAtualizacao.length === 0) {
          console.log("Nenhuma atualização necessária.");
          return Promise.resolve();
        }

        console.log(
          `Aplicando ${promessasAtualizacao.length} atualizações de status...`
        );
        return Promise.all(promessasAtualizacao);
      })
      .then(() => {
        console.log("Comparação com Lista Tratamento concluída com sucesso.");
        resolve();
      })
      .catch((error) => {
        console.error(
          "Erro no processo de comparação com Lista Tratamento:",
          error
        );
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
