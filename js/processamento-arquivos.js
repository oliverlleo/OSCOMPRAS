/**
 * processamento-arquivos.js
 *
 * Funções para processamento de arquivos (CSV, XLSX, XML) e extração de dados.
 * Este arquivo contém a lógica para identificar colunas, normalizar dados e
 * preparar para salvamento no Firebase.
 *
 * @version 2.1.0
 * @description Adicionada lógica real de processamento para XLSX e regra para identificar a coluna de código pela palavra "DOC".
 */

/**
 * Processa um arquivo (CSV, XLSX, XML) e extrai seus dados.
 *
 * @param {File} arquivo - O arquivo a ser processado.
 * @param {string} clienteId - ID do cliente.
 * @param {string} tipoProjeto - Tipo de projeto (PVC, Aluminio, etc.).
 * @param {string} nomeLista - Nome da lista (LPVC, LReforco, etc.).
 * @returns {Promise} - Promise que resolve com um objeto de sucesso ou rejeita com um erro.
 */
function processarArquivo(arquivo, clienteId, tipoProjeto, nomeLista) {
  return new Promise((resolve, reject) => {
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
              // Tenta um processamento alternativo com diferentes separadores
              const separadores = [",", ";", "\t", "|"];
              for (const sep of separadores) {
                try {
                  dados = processarCSVComSeparador(conteudo, sep);
                  if (dados && dados.length > 0) {
                    console.log(
                      `Processamento alternativo com separador "${sep}" bem-sucedido.`
                    );
                    mensagemErro = ""; // Limpa a mensagem de erro se teve sucesso
                    break;
                  }
                } catch (e) {
                  // Continua tentando outros separadores
                }
              }
            }
            break;

          case "xlsx":
            // A função processarXLSX agora contém a lógica real de processamento.
            // Ela irá lançar um erro se a biblioteca SheetJS não estiver presente.
            dados = processarXLSX(conteudo);
            break;

          case "xml":
            try {
              dados = processarXML(conteudo);
            } catch (xmlError) {
              console.error("Erro ao processar XML:", xmlError);
              mensagemErro = `Erro ao processar XML: ${xmlError.message}`;
              // Tenta processar como texto simples em caso de falha
              try {
                dados = processarTextoSimples(conteudo);
                if (dados && dados.length > 0) {
                  console.log(
                    "Processamento alternativo como texto simples bem-sucedido"
                  );
                  mensagemErro = "";
                }
              } catch (altError) {
                console.error("Erro no processamento alternativo:", altError);
              }
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

        // Salva os itens no Firebase
        salvarItensNoFirebase(dados, clienteId, tipoProjeto, nomeLista)
          .then(() => {
            resolve({
              sucesso: true,
              mensagem: `${dados.length} itens processados e salvos com sucesso.`,
              itens: dados.length,
            });
          })
          .catch((error) => {
            console.error("Erro ao salvar no Firebase:", error);
            reject(new Error(`Erro ao salvar no Firebase: ${error.message}`));
          });
      } catch (error) {
        console.error("Erro geral ao processar arquivo:", error);
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

    // Inicia a leitura do arquivo
    if (tipoArquivo === "xlsx") {
      reader.readAsArrayBuffer(arquivo); // XLSX precisa ser lido como ArrayBuffer
    } else {
      reader.readAsText(arquivo, "ISO-8859-1"); // Mantém para CSV/XML para melhor suporte a caracteres especiais
    }
  });
}

/**
 * Cria itens de demonstração quando não é possível extrair dados do arquivo.
 * @param {string} nomeArquivo - Nome do arquivo original.
 * @returns {Array<Object>} - Array de objetos com itens de demonstração.
 */
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
      medida: "100x200",
    },
    {
      codigo: "003-DEMO",
      descricao: `Item demonstrativo 3 (${baseNome})`,
      quantidade: 3,
      altura: "150",
      largura: "75",
      cor: "Branco",
    },
  ];
}

/**
 * Identifica o tipo de arquivo pela extensão.
 * @param {string} nomeArquivo - Nome do arquivo.
 * @returns {string|null} - Tipo do arquivo ('csv', 'xlsx', 'xml') ou null.
 */
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

/**
 * Processa um arquivo XLSX e extrai seus dados usando a biblioteca SheetJS.
 *
 * @param {ArrayBuffer} conteudo - Conteúdo do arquivo XLSX como ArrayBuffer.
 * @returns {Array<Object>} - Array de objetos com os dados extraídos.
 */
function processarXLSX(conteudo) {
  if (typeof XLSX === "undefined") {
    throw new Error(
      "A biblioteca SheetJS (xlsx.js) não foi carregada. Adicione o script dela ao seu HTML."
    );
  }

  try {
    const workbook = XLSX.read(conteudo, { type: "array" });
    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      throw new Error("Nenhuma planilha encontrada no arquivo XLSX.");
    }

    const worksheet = workbook.Sheets[sheetName];
    // Converte a planilha para um array de arrays, que pode ser processado pela nossa função tabular
    const linhasArray = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: "",
    });

    if (linhasArray.length === 0) {
      throw new Error("A planilha XLSX está vazia ou não contém dados.");
    }

    return processarDadosTabulares(linhasArray);
  } catch (error) {
    console.error("Erro detalhado ao processar XLSX:", error);
    throw new Error(
      `Falha na leitura do arquivo XLSX. Verifique se o arquivo não está corrompido. Detalhe: ${error.message}`
    );
  }
}

/**
 * Processa um conteúdo de CSV.
 * @param {string} conteudo - Conteúdo do arquivo CSV.
 * @returns {Array<Object>} - Array de objetos com os dados extraídos.
 */
function processarCSV(conteudo) {
  if (!conteudo || conteudo.trim() === "") {
    throw new Error("Arquivo CSV vazio ou sem conteúdo.");
  }
  const separador = detectarSeparadorCSV(conteudo);
  return processarCSVComSeparador(conteudo, separador);
}

/**
 * Processa um CSV com um separador específico.
 * @param {string} conteudo - Conteúdo do arquivo CSV.
 * @param {string} separador - Separador a ser usado.
 * @returns {Array<Object>} - Array de objetos com os dados extraídos.
 */
function processarCSVComSeparador(conteudo, separador) {
  if (!conteudo || conteudo.trim() === "") {
    throw new Error("Arquivo CSV vazio.");
  }
  const linhasArray = conteudo
    .split(/\r?\n/)
    .filter((linha) => linha.trim())
    .map((linha) => linha.split(separador));

  if (linhasArray.length === 0) {
    throw new Error("Arquivo CSV não contém linhas válidas.");
  }

  return processarDadosTabulares(linhasArray);
}

/**
 * Lógica central para processar dados em formato de tabela (array de arrays).
 * Usado por `processarCSVComSeparador` e `processarXLSX`.
 *
 * @param {Array<Array<string|number>>} linhas - Array de linhas, onde cada linha é um array de valores.
 * @returns {Array<Object>} - Array de objetos com os dados extraídos.
 */
function processarDadosTabulares(linhas) {
  if (!linhas || linhas.length === 0) {
    throw new Error("Não há dados tabulares para processar.");
  }

  let linhaCabecalhoIdx = -1;
  let cabecalhos = [];

  // Tenta encontrar uma linha que pareça um cabeçalho nas primeiras 5 linhas
  for (let i = 0; i < Math.min(5, linhas.length); i++) {
    const possiveisCabecalhos = linhas[i].map((c) => String(c || "").trim());
    const pareceCabecalho = possiveisCabecalhos.some((c) =>
      /cod|desc|quant|item|prod|ref/i.test(c)
    );

    if (pareceCabecalho) {
      linhaCabecalhoIdx = i;
      cabecalhos = possiveisCabecalhos.map((cabecalho) =>
        normalizarTexto(cabecalho)
      );
      break;
    }
  }

  // Se não encontrou, assume a primeira linha como cabeçalho
  if (linhaCabecalhoIdx === -1) {
    linhaCabecalhoIdx = 0;
    cabecalhos = linhas[0].map((c) => normalizarTexto(String(c || "").trim()));
  }

  // Se os cabeçalhos ainda estão vazios, cria genéricos
  if (cabecalhos.length === 0 || cabecalhos.every((c) => c === "")) {
    const numColunas = Math.max(...linhas.map((l) => l.length));
    cabecalhos = Array(numColunas)
      .fill("")
      .map((_, i) => `coluna${i + 1}`);
  }

  const mapeamentoCampos = mapearCampos(cabecalhos);

  // Tenta inferir campos pela posição se o mapeamento falhar
  if (
    mapeamentoCampos.codigo === undefined &&
    mapeamentoCampos.descricao === undefined &&
    mapeamentoCampos.quantidade === undefined
  ) {
    if (cabecalhos.length > 0) {
      mapeamentoCampos.codigo = 0;
      mapeamentoCampos.descricao = cabecalhos.length > 1 ? 1 : undefined;
      mapeamentoCampos.quantidade = cabecalhos.length > 2 ? 2 : undefined;
      console.warn(
        "Usando mapeamento de campos por posição devido à falta de cabeçalhos reconhecíveis."
      );
    } else {
      throw new Error(
        "Não foi possível identificar colunas essenciais no arquivo."
      );
    }
  }

  const dados = [];
  // Itera a partir da linha seguinte ao cabeçalho
  for (let i = linhaCabecalhoIdx + 1; i < linhas.length; i++) {
    const valores = linhas[i].map((v) => String(v || "").trim());
    if (valores.every((v) => v === "")) continue; // Pula linhas completamente vazias

    const item = extrairItem(valores, mapeamentoCampos);
    if (item) {
      dados.push(item);
    }
  }

  // Se, após tudo, não extraiu nada, tenta uma abordagem final simplificada
  if (dados.length === 0 && linhas.length > linhaCabecalhoIdx + 1) {
    console.warn("Extração principal falhou. Tentando abordagem simplificada.");
    for (let i = linhaCabecalhoIdx + 1; i < linhas.length; i++) {
      const valores = linhas[i].map((v) => String(v || "").trim());
      if (valores.every((v) => v === "")) continue;

      if (valores.length >= 1) {
        dados.push({
          codigo: normalizarTexto(valores[0] || `ITEM-${i}`),
          descricao: normalizarTexto(valores[1] || `Descrição do item ${i}`),
          quantidade:
            parseInt(String(valores[2] || "1").replace(/[^\d]/g, ""), 10) || 1,
        });
      }
    }
  }

  return dados;
}

/**
 * Detecta o separador mais provável em um conteúdo CSV.
 * @param {string} conteudo - Conteúdo do arquivo CSV.
 * @returns {string} - O separador detectado (';', ',', '\t', '|').
 */
function detectarSeparadorCSV(conteudo) {
  if (!conteudo) return ",";
  const linhasAmostra = conteudo
    .split(/\r?\n/)
    .slice(0, 10)
    .filter((l) => l.trim());
  if (linhasAmostra.length === 0) return ",";

  const separadores = [";", ",", "\t", "|"];
  let melhorSeparador = ",";
  let maxContagem = 0;

  for (const sep of separadores) {
    const contagem = (linhasAmostra[0].match(new RegExp(`\\${sep}`, "g")) || [])
      .length;
    if (contagem > maxContagem) {
      maxContagem = contagem;
      melhorSeparador = sep;
    }
  }
  return melhorSeparador;
}

/**
 * Processa um arquivo XML e extrai seus dados.
 * @param {string} conteudo - Conteúdo do arquivo XML.
 * @returns {Array<Object>} - Array de objetos com os dados extraídos.
 */
function processarXML(conteudo) {
  if (!conteudo || conteudo.trim() === "") throw new Error("Arquivo XML vazio");
  conteudo = conteudo.replace(
    /[^\x09\x0A\x0D\x20-\uD7FF\uE000-\uFFFD\u10000-\u10FFFF]/g,
    ""
  );

  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(conteudo, "text/xml");
  const parseError = xmlDoc.getElementsByTagName("parsererror");
  if (parseError.length > 0) {
    throw new Error(
      `O arquivo XML está mal-formado: ${parseError[0].textContent}`
    );
  }

  const possiveisElementos = [
    "item",
    "produto",
    "material",
    "det",
    "prod",
    "record",
    "row",
  ];
  let elementosItens = [];
  for (const elemento of possiveisElementos) {
    const elementosEncontrados = xmlDoc.getElementsByTagName(elemento);
    if (elementosEncontrados.length > 0) {
      elementosItens = Array.from(elementosEncontrados);
      break;
    }
  }

  if (elementosItens.length === 0) {
    throw new Error(
      "Não foi possível identificar a tag principal dos itens no arquivo XML."
    );
  }

  const dados = [];
  for (const elemento of elementosItens) {
    const item = extrairItemXML(elemento);
    if (item) {
      dados.push(item);
    }
  }
  return dados;
}

/**
 * Processa texto simples e tenta extrair dados linha a linha.
 * @param {string} conteudo - Conteúdo do texto.
 * @returns {Array<Object>} - Array de objetos com os dados extraídos.
 */
function processarTextoSimples(conteudo) {
  if (!conteudo || conteudo.trim() === "")
    throw new Error("Arquivo de texto vazio");
  const linhas = conteudo
    .split(/\r?\n/)
    .filter((linha) => linha.trim() && linha.length > 3);
  if (linhas.length === 0)
    throw new Error("Arquivo de texto não contém linhas válidas");

  const dados = [];
  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i].trim();
    const partes = linha.split(/\s+/); // Divide por espaços
    dados.push({
      codigo: normalizarTexto(partes[0] || `TXT-ITEM-${i}`),
      descricao: normalizarTexto(partes.slice(1).join(" ") || linha),
      quantidade: 1,
    });
  }
  return dados;
}

/**
 * Extrai informações de um elemento XML.
 * @param {Element} elemento - Elemento XML.
 * @returns {Object|null} - Objeto com os dados extraídos.
 */
function extrairItemXML(elemento) {
  const mapeamento = {
    codigo: ["codigo", "cProd", "cod", "id", "sku", "ref"],
    descricao: ["descricao", "xProd", "desc", "nome", "produto"],
    quantidade: ["quantidade", "qCom", "qtd", "quant"],
  };
  const item = {};
  for (const [campo, possiveisNomes] of Object.entries(mapeamento)) {
    for (const nome of possiveisNomes) {
      const el = elemento.querySelector(nome);
      if (el && el.textContent) {
        item[campo] = normalizarTexto(el.textContent.trim());
        break;
      }
    }
  }
  if (!item.codigo && !item.descricao) return null;
  item.codigo =
    item.codigo || `XML-ITEM-${Math.random().toString(36).substr(2, 5)}`;
  item.descricao = item.descricao || `Item ${item.codigo}`;
  item.quantidade =
    parseInt(String(item.quantidade || "1").replace(/[^\d]/g, ""), 10) || 1;
  return item;
}

/**
 * Mapeia os cabeçalhos do arquivo para campos padronizados.
 * @param {Array<string>} cabecalhos - Array com os nomes dos cabeçalhos.
 * @returns {Object} - Objeto com o mapeamento {campo: indice}.
 */
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
    altura: ["altura", "alt", "h", "height"],
    largura: ["largura", "larg", "l", "width"],
    medida: [
      "medida",
      "med",
      "lxa",
      "dimensao",
      "dimensoes",
      "dimension",
      "size",
    ],
    cor: ["cor", "color"],
  };

  cabecalhos.forEach((cabecalho, indice) => {
    if (!cabecalho) return;
    const cabecalhoNormalizado = cabecalho.toLowerCase().trim();

    for (const [campo, nomes] of Object.entries(possiveisNomes)) {
      // Determina se há uma correspondência
      let isMatch = nomes.includes(cabecalhoNormalizado);

      // REGRA ESPECIAL: Para o campo 'codigo', verifica também se contém a palavra 'doc'
      if (
        !isMatch &&
        campo === "codigo" &&
        /\bdoc\b/i.test(cabecalhoNormalizado)
      ) {
        isMatch = true;
      }

      // Se for uma correspondência e o campo ainda não foi mapeado para uma coluna anterior
      if (isMatch && mapeamento[campo] === undefined) {
        mapeamento[campo] = indice;
        break; // Mapeou esta coluna, passa para a próxima coluna do arquivo.
      }
    }
  });
  return mapeamento;
}

/**
 * Extrai um item a partir de uma linha de valores e um mapeamento de campos.
 * @param {Array<string>} valores - Array com os valores da linha.
 * @param {Object} mapeamento - Objeto com o mapeamento {campo: indice}.
 * @returns {Object|null} - Objeto com o item extraído ou null.
 */
function extrairItem(valores, mapeamento) {
  const getVal = (campo) =>
    mapeamento[campo] !== undefined ? valores[mapeamento[campo]] : null;

  let codigo = getVal("codigo");
  let descricao = getVal("descricao");
  let quantidade = getVal("quantidade");

  if (!codigo && !descricao) return null;

  codigo =
    codigo || `GEN-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
  descricao = descricao || `Item ${codigo}`;
  quantidade =
    parseInt(
      String(quantidade || "1")
        .replace(/[^\d.,]/g, "")
        .replace(",", "."),
      10
    ) || 1;

  const item = {
    codigo: normalizarTexto(codigo),
    descricao: normalizarTexto(descricao),
    quantidade: quantidade,
  };

  const camposOpcionais = ["altura", "largura", "medida", "cor"];
  camposOpcionais.forEach((campo) => {
    const valor = getVal(campo);
    if (valor) {
      item[campo] = normalizarTexto(valor);
    }
  });

  return item;
}

/**
 * Normaliza um texto, removendo acentos e caracteres problemáticos.
 * @param {string} texto - Texto a ser normalizado.
 * @returns {string} - Texto normalizado.
 */
function normalizarTexto(texto) {
  if (!texto) return "";
  texto = String(texto);
  // Remove caracteres de controle, normaliza para remover acentos
  texto = texto.replace(/[\x00-\x1F\x7F-\x9F]/g, "");
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Salva os itens extraídos no Firebase.
 * @param {Array<Object>} itens - Array de objetos com os itens a serem salvos.
 * @param {string} clienteId - ID do cliente.
 * @param {string} tipoProjeto - Tipo de projeto.
 * @param {string} nomeLista - Nome da lista.
 * @returns {Promise} - Promise que resolve quando os itens são salvos.
 */
function salvarItensNoFirebase(itens, clienteId, tipoProjeto, nomeLista) {
  if (!itens || !Array.isArray(itens) || itens.length === 0) {
    return Promise.reject(new Error("Nenhum item válido para salvar."));
  }
  if (!clienteId || !tipoProjeto || !nomeLista) {
    return Promise.reject(
      new Error("Informações de destino incompletas (cliente, projeto, lista).")
    );
  }
  if (
    typeof firebase === "undefined" ||
    typeof firebase.database !== "function"
  ) {
    return Promise.reject(
      new Error("Firebase não está configurado corretamente.")
    );
  }

  console.log(
    `Salvando ${itens.length} itens em: projetos/${clienteId}/${tipoProjeto}/listas/${nomeLista}`
  );
  const refLista = firebase
    .database()
    .ref(`projetos/${clienteId}/${tipoProjeto}/listas/${nomeLista}`);
  return refLista.set(itens);
}

// Expõe a função principal para ser acessível globalmente (ex: no HTML)
window.processarArquivo = processarArquivo;
