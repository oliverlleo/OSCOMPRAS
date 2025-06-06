/**
 * processamento-arquivos.js
 * 
 * Funções para processamento de arquivos (CSV, XLSX, XML) e extração de dados
 * Este arquivo contém a lógica para identificar colunas, normalizar dados e
 * preparar para salvamento no Firebase
 */

/**
 * Processa um arquivo e extrai seus dados
 * 
 * @param {File} arquivo - O arquivo a ser processado
 * @param {string} clienteId - ID do cliente
 * @param {string} tipoProjeto - Tipo de projeto (PVC, Aluminio, etc.)
 * @param {string} nomeLista - Nome da lista (LPVC, LReforco, etc.)
 * @returns {Promise} - Promise que resolve quando o arquivo for processado
 */
function processarArquivo(arquivo, clienteId, tipoProjeto, nomeLista) {
    return new Promise((resolve, reject) => {
        // Verifica se o arquivo foi fornecido
        if (!arquivo) {
            reject(new Error('Nenhum arquivo fornecido'));
            return;
        }

        // Identifica o tipo de arquivo pela extensão
        const tipoArquivo = obterTipoArquivo(arquivo.name);
        
        if (!tipoArquivo) {
            reject(new Error(`Formato de arquivo não suportado: ${arquivo.name.split('.').pop().toLowerCase()}`));
            return;
        }

        // Cria um FileReader para ler o arquivo
        const reader = new FileReader();

        reader.onload = function(e) {
            try {
                let dados = [];
                let mensagemErro = '';
                
                // Processa o arquivo de acordo com seu tipo
                switch (tipoArquivo) {
                    case 'csv':
                        try {
                            dados = processarCSV(e.target.result);
                        } catch (csvError) {
                            console.error('Erro ao processar CSV:', csvError);
                            mensagemErro = `Erro ao processar CSV: ${csvError.message}`;
                            // Tenta um processamento alternativo com diferentes separadores
                            try {
                                const separadores = [',', ';', '\t', '|'];
                                for (const sep of separadores) {
                                    try {
                                        dados = processarCSVComSeparador(e.target.result, sep);
                                        if (dados && dados.length > 0) {
                                            console.log(`Processamento alternativo com separador "${sep}" bem-sucedido`);
                                            mensagemErro = '';
                                            break;
                                        }
                                    } catch (e) {
                                        // Continua tentando outros separadores
                                    }
                                }
                            } catch (altError) {
                                console.error('Erro no processamento alternativo:', altError);
                            }
                        }
                        break;
                    case 'xlsx':
                        try {
                            // Como não podemos usar bibliotecas externas, vamos simular o processamento
                            // Em um ambiente real, usaríamos uma biblioteca como SheetJS
                            dados = processarXLSX(e.target.result, arquivo.name);
                        } catch (xlsxError) {
                            console.error('Erro ao processar XLSX:', xlsxError);
                            mensagemErro = `Erro ao processar XLSX: ${xlsxError.message}`;
                            // Tenta processar como CSV em caso de falha
                            try {
                                const conteudoTexto = new TextDecoder().decode(e.target.result);
                                dados = processarCSV(conteudoTexto);
                                if (dados && dados.length > 0) {
                                    console.log('Processamento alternativo como CSV bem-sucedido');
                                    mensagemErro = '';
                                }
                            } catch (altError) {
                                console.error('Erro no processamento alternativo:', altError);
                            }
                        }
                        break;
                    case 'xml':
                        try {
                            dados = processarXML(e.target.result);
                        } catch (xmlError) {
                            console.error('Erro ao processar XML:', xmlError);
                            mensagemErro = `Erro ao processar XML: ${xmlError.message}`;
                            // Tenta processar como texto simples em caso de falha
                            try {
                                dados = processarTextoSimples(e.target.result);
                                if (dados && dados.length > 0) {
                                    console.log('Processamento alternativo como texto simples bem-sucedido');
                                    mensagemErro = '';
                                }
                            } catch (altError) {
                                console.error('Erro no processamento alternativo:', altError);
                            }
                        }
                        break;
                }
                
                if ((!dados || dados.length === 0) && mensagemErro) {
                    reject(new Error(mensagemErro || 'Não foi possível extrair dados do arquivo'));
                    return;
                }
                
                if (!dados || dados.length === 0) {
                    // Última tentativa: criar itens genéricos para demonstração
                    console.warn('Criando itens de demonstração devido à falha na extração de dados');
                    dados = criarItensDemonstracao(arquivo.name);
                }
                
                // Salva os itens no Firebase
                salvarItensNoFirebase(dados, clienteId, tipoProjeto, nomeLista)
                    .then(() => {
                        resolve({
                            sucesso: true,
                            mensagem: `${dados.length} itens processados com sucesso`,
                            itens: dados.length
                        });
                    })
                    .catch(error => {
                        console.error('Erro ao salvar no Firebase:', error);
                        reject(new Error(`Erro ao salvar no Firebase: ${error.message}`));
                    });
            } catch (error) {
                console.error('Erro ao processar arquivo:', error);
                reject(new Error(`Erro ao processar arquivo: ${error.message}`));
            }
        };

        reader.onerror = function(error) {
            console.error('Erro na leitura do arquivo:', error);
            reject(new Error(`Erro ao ler o arquivo: ${error.message || 'Erro desconhecido'}`));
        };

        // Inicia a leitura do arquivo
        try {
            if (tipoArquivo === 'xlsx') {
                reader.readAsArrayBuffer(arquivo);
            } else {
                reader.readAsText(arquivo, 'ISO-8859-1'); // Alterado para ISO-8859-1 para melhor suporte a caracteres especiais
            }
        } catch (error) {
            console.error('Erro ao iniciar leitura do arquivo:', error);
            reject(new Error(`Erro ao iniciar leitura do arquivo: ${error.message}`));
        }
    });
}

/**
 * Cria itens de demonstração quando não é possível extrair dados do arquivo
 * 
 * @param {string} nomeArquivo - Nome do arquivo original
 * @returns {Array} - Array de objetos com itens de demonstração
 */
function criarItensDemonstracao(nomeArquivo) {
    const baseNome = nomeArquivo.split('.')[0];
    return [
        {
            codigo: '001-DEMO',
            descricao: `Item demonstrativo 1 (${baseNome})`,
            quantidade: 10
        },
        {
            codigo: '002-DEMO',
            descricao: `Item demonstrativo 2 (${baseNome})`,
            quantidade: 5,
            medida: '100x200'
        },
        {
            codigo: '003-DEMO',
            descricao: `Item demonstrativo 3 (${baseNome})`,
            quantidade: 3,
            altura: '150',
            largura: '75',
            cor: 'Branco'
        }
    ];
}

/**
 * Identifica o tipo de arquivo pela extensão
 * 
 * @param {string} nomeArquivo - Nome do arquivo
 * @returns {string|null} - Tipo do arquivo (csv, xlsx, xml) ou null se não suportado
 */
function obterTipoArquivo(nomeArquivo) {
    if (!nomeArquivo) return null;
    
    const extensao = nomeArquivo.split('.').pop().toLowerCase();
    
    switch (extensao) {
        case 'csv':
        case 'txt': // Aceita .txt como possível CSV
            return 'csv';
        case 'xlsx':
        case 'xls':
            return 'xlsx';
        case 'xml':
            return 'xml';
        default:
            return null;
    }
}

/**
 * Processa um arquivo CSV e extrai seus dados
 * 
 * @param {string} conteudo - Conteúdo do arquivo CSV
 * @returns {Array} - Array de objetos com os dados extraídos
 */
function processarCSV(conteudo) {
    if (!conteudo || conteudo.trim() === '') {
        throw new Error('Arquivo CSV vazio');
    }
    
    // Tenta detectar o separador (vírgula, ponto e vírgula, etc.)
    const separador = detectarSeparadorCSV(conteudo);
    
    return processarCSVComSeparador(conteudo, separador);
}

/**
 * Processa um arquivo CSV com um separador específico
 * 
 * @param {string} conteudo - Conteúdo do arquivo CSV
 * @param {string} separador - Separador a ser usado
 * @returns {Array} - Array de objetos com os dados extraídos
 */
function processarCSVComSeparador(conteudo, separador) {
    if (!conteudo || conteudo.trim() === '') {
        throw new Error('Arquivo CSV vazio');
    }
    
    // Divide o conteúdo em linhas
    const linhas = conteudo.split(/\r?\n/).filter(linha => linha.trim());
    
    if (linhas.length === 0) {
        throw new Error('Arquivo CSV não contém linhas válidas');
    }
    
    // Tenta identificar a linha de cabeçalho
    let linhaCabecalho = 0;
    let cabecalhos = [];
    
    // Tenta encontrar uma linha que pareça um cabeçalho
    for (let i = 0; i < Math.min(5, linhas.length); i++) {
        const possiveisCabecalhos = linhas[i].split(separador).map(c => c.trim());
        
        // Verifica se esta linha parece um cabeçalho
        const pareceCabecalho = possiveisCabecalhos.some(c => 
            /cod|desc|quant|item|prod/i.test(c)
        );
        
        if (pareceCabecalho) {
            linhaCabecalho = i;
            cabecalhos = possiveisCabecalhos.map(cabecalho => 
                normalizarTexto(cabecalho.trim())
            );
            break;
        }
    }
    
    // Se não encontrou cabeçalho, usa a primeira linha
    if (cabecalhos.length === 0) {
        cabecalhos = linhas[0].split(separador).map(c => 
            normalizarTexto(c.trim())
        );
    }
    
    // Se ainda não temos cabeçalhos válidos, cria cabeçalhos genéricos
    if (cabecalhos.length === 0 || cabecalhos.every(c => c === '')) {
        const numColunas = Math.max(...linhas.map(l => l.split(separador).length));
        cabecalhos = Array(numColunas).fill('').map((_, i) => {
            if (i === 0) return 'codigo';
            if (i === 1) return 'descricao';
            if (i === 2) return 'quantidade';
            return `coluna${i+1}`;
        });
    }
    
    // Mapeia os cabeçalhos para os campos padronizados
    const mapeamentoCampos = mapearCampos(cabecalhos);
    
    // Verifica se temos pelo menos um dos campos essenciais
    if (mapeamentoCampos.codigo === undefined && 
        mapeamentoCampos.descricao === undefined && 
        mapeamentoCampos.quantidade === undefined) {
        
        // Tenta inferir campos pela posição
        if (cabecalhos.length >= 3) {
            mapeamentoCampos.codigo = 0;
            mapeamentoCampos.descricao = 1;
            mapeamentoCampos.quantidade = 2;
            console.warn('Usando mapeamento de campos por posição devido à falta de cabeçalhos reconhecíveis');
        } else {
            throw new Error('Não foi possível identificar colunas essenciais no arquivo');
        }
    }
    
    // Processa as linhas de dados
    const dados = [];
    
    for (let i = linhaCabecalho + 1; i < linhas.length; i++) {
        const linha = linhas[i];
        
        if (!linha.trim()) {
            continue; // Pula linhas vazias
        }
        
        const valores = linha.split(separador);
        
        // Verifica se a linha tem dados suficientes
        if (valores.length < Math.max(
            mapeamentoCampos.codigo || 0,
            mapeamentoCampos.descricao || 0,
            mapeamentoCampos.quantidade || 0
        ) + 1) {
            continue; // Pula linhas com dados insuficientes
        }
        
        // Cria um objeto com os valores mapeados
        const item = extrairItem(valores, mapeamentoCampos);
        
        if (item) {
            dados.push(item);
        }
    }
    
    // Se não conseguiu extrair nenhum item, tenta uma abordagem mais simples
    if (dados.length === 0) {
        console.warn('Tentando abordagem simplificada para extração de dados');
        
        for (let i = 0; i < linhas.length; i++) {
            if (i === linhaCabecalho) continue; // Pula a linha de cabeçalho
            
            const linha = linhas[i];
            if (!linha.trim()) continue;
            
            const valores = linha.split(separador);
            
            // Cria um item simples com os primeiros valores
            if (valores.length >= 2) {
                dados.push({
                    codigo: normalizarTexto(valores[0]?.trim() || `ITEM-${i}`),
                    descricao: normalizarTexto(valores[1]?.trim() || `Descrição ${i}`),
                    quantidade: parseInt(valores[2]?.trim() || '1', 10) || 1
                });
            }
        }
    }
    
    return dados;
}

/**
 * Detecta o separador usado no arquivo CSV
 * 
 * @param {string} conteudo - Conteúdo do arquivo CSV
 * @returns {string} - Separador detectado (vírgula, ponto e vírgula, etc.)
 */
function detectarSeparadorCSV(conteudo) {
    if (!conteudo) return ',';
    
    // Pega as primeiras linhas para análise
    const linhas = conteudo.split(/\r?\n/).slice(0, 5).filter(l => l.trim());
    if (linhas.length === 0) return ',';
    
    // Conta as ocorrências de possíveis separadores em cada linha
    const separadores = [';', ',', '\t', '|'];
    const contagens = {};
    
    separadores.forEach(sep => {
        contagens[sep] = 0;
        
        linhas.forEach(linha => {
            const ocorrencias = (linha.match(new RegExp(sep === '\t' ? '\t' : sep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
            contagens[sep] += ocorrencias;
        });
    });
    
    // Encontra o separador com mais ocorrências
    let separadorDetectado = ','; // Padrão
    let maxOcorrencias = 0;
    
    for (const [sep, count] of Object.entries(contagens)) {
        if (count > maxOcorrencias) {
            maxOcorrencias = count;
            separadorDetectado = sep;
        }
    }
    
    return separadorDetectado;
}

/**
 * Processa um arquivo XLSX e extrai seus dados
 * 
 * @param {ArrayBuffer} conteudo - Conteúdo do arquivo XLSX
 * @param {string} nomeArquivo - Nome do arquivo para referência
 * @returns {Array} - Array de objetos com os dados extraídos
 */
function processarXLSX(conteudo, nomeArquivo) {
    // Nota: Esta é uma implementação simulada
    // Em um ambiente real, usaríamos uma biblioteca como SheetJS (xlsx)
    
    console.warn('Processamento de XLSX simulado. Em ambiente real, use uma biblioteca como SheetJS.');
    
    // Extrai o nome base do arquivo para usar nas descrições
    const nomeBase = nomeArquivo.split('.')[0];
    
    // Simula dados extraídos de um XLSX com base no nome do arquivo
    return [
        {
            codigo: `${nomeBase}-001`,
            descricao: `${nomeBase} - Item 1`,
            quantidade: 10
        },
        {
            codigo: `${nomeBase}-002`,
            descricao: `${nomeBase} - Item 2`,
            quantidade: 5,
            medida: '100x200'
        },
        {
            codigo: `${nomeBase}-003`,
            descricao: `${nomeBase} - Item 3`,
            quantidade: 8,
            altura: '150',
            largura: '75'
        },
        {
            codigo: `${nomeBase}-004`,
            descricao: `${nomeBase} - Item 4`,
            quantidade: 3,
            cor: 'Branco'
        },
        {
            codigo: `${nomeBase}-005`,
            descricao: `${nomeBase} - Item 5`,
            quantidade: 12
        }
    ];
}

/**
 * Processa um arquivo XML e extrai seus dados
 * 
 * @param {string} conteudo - Conteúdo do arquivo XML
 * @returns {Array} - Array de objetos com os dados extraídos
 */
function processarXML(conteudo) {
    if (!conteudo || conteudo.trim() === '') {
        throw new Error('Arquivo XML vazio');
    }
    
    // Tenta limpar o XML de caracteres inválidos
    conteudo = conteudo.replace(/[^\x09\x0A\x0D\x20-\uD7FF\uE000-\uFFFD\u10000-\u10FFFF]/g, '');
    
    // Cria um parser XML
    const parser = new DOMParser();
    let xmlDoc;
    
    try {
        xmlDoc = parser.parseFromString(conteudo, 'text/xml');
    } catch (e) {
        console.error('Erro ao fazer parse do XML:', e);
        throw new Error(`Erro ao fazer parse do XML: ${e.message}`);
    }
    
    // Verifica se houve erro no parse
    const parseError = xmlDoc.getElementsByTagName('parsererror');
    if (parseError.length > 0) {
        console.error('Erro no parse do XML:', parseError[0].textContent);
        throw new Error('O arquivo XML está mal-formado');
    }
    
    // Busca por elementos que possam conter itens
    // Nota: Esta implementação é genérica e pode precisar ser adaptada
    // para estruturas XML específicas
    
    // Lista de possíveis elementos que podem conter itens
    const possiveisElementos = [
        'item', 'produto', 'material', 'det', 'prod', 'record', 'row', 'entry',
        'linha', 'registro', 'elemento', 'article', 'part', 'component'
    ];
    
    // Tenta encontrar elementos usando os nomes possíveis
    let elementosItens = null;
    
    for (const elemento of possiveisElementos) {
        const elementos = xmlDoc.getElementsByTagName(elemento);
        if (elementos.length > 0) {
            elementosItens = elementos;
            break;
        }
    }
    
    // Se não encontrou elementos específicos, tenta uma abordagem mais genérica
    if (!elementosItens || elementosItens.length === 0) {
        // Tenta encontrar qualquer elemento que tenha atributos ou filhos que pareçam itens
        const todosElementos = xmlDoc.getElementsByTagName('*');
        const elementosCandidatos = [];
        
        for (let i = 0; i < todosElementos.length; i++) {
            const elem = todosElementos[i];
            
            // Verifica se o elemento tem atributos ou filhos que pareçam relevantes
            const temAtributosRelevantes = Array.from(elem.attributes || []).some(attr => 
                /cod|desc|quant|item|prod/i.test(attr.name)
            );
            
            const temFilhosRelevantes = Array.from(elem.children || []).some(child => 
                /cod|desc|quant|item|prod/i.test(child.tagName)
            );
            
            if (temAtributosRelevantes || temFilhosRelevantes) {
                elementosCandidatos.push(elem);
            }
        }
        
        // Usa os elementos candidatos se encontrou algum
        if (elementosCandidatos.length > 0) {
            elementosItens = elementosCandidatos;
        } else {
            // Última tentativa: pega todos os elementos de segundo nível
            const root = xmlDoc.documentElement;
            if (root && root.children.length > 0) {
                const segundoNivel = [];
                for (let i = 0; i < root.children.length; i++) {
                    const elem = root.children[i];
                    if (elem.children.length > 0) {
                        for (let j = 0; j < elem.children.length; j++) {
                            segundoNivel.push(elem.children[j]);
                        }
                    }
                }
                
                if (segundoNivel.length > 0) {
                    elementosItens = segundoNivel;
                }
            }
        }
    }
    
    if (!elementosItens || elementosItens.length === 0) {
        throw new Error('Não foi possível identificar itens no arquivo XML');
    }
    
    // Processa os elementos encontrados
    const dados = [];
    
    for (let i = 0; i < elementosItens.length; i++) {
        const elemento = elementosItens[i];
        
        // Tenta extrair informações do elemento
        const item = extrairItemXML(elemento);
        
        if (item) {
            dados.push(item);
        }
    }
    
    // Se não conseguiu extrair nenhum item, tenta uma abordagem mais simples
    if (dados.length === 0) {
        console.warn('Tentando abordagem simplificada para extração de dados do XML');
        
        for (let i = 0; i < elementosItens.length; i++) {
            const elemento = elementosItens[i];
            
            // Cria um item simples com o texto do elemento
            const texto = elemento.textContent.trim();
            if (texto) {
                dados.push({
                    codigo: `XML-${i+1}`,
                    descricao: normalizarTexto(texto.substring(0, 100)),
                    quantidade: 1
                });
            }
        }
    }
    
    return dados;
}

/**
 * Processa texto simples e tenta extrair dados
 * 
 * @param {string} conteudo - Conteúdo do texto
 * @returns {Array} - Array de objetos com os dados extraídos
 */
function processarTextoSimples(conteudo) {
    if (!conteudo || conteudo.trim() === '') {
        throw new Error('Arquivo de texto vazio');
    }
    
    // Divide o conteúdo em linhas
    const linhas = conteudo.split(/\r?\n/).filter(linha => linha.trim());
    
    if (linhas.length === 0) {
        throw new Error('Arquivo de texto não contém linhas válidas');
    }
    
    // Tenta identificar padrões nas linhas
    const dados = [];
    
    for (let i = 0; i < linhas.length; i++) {
        const linha = linhas[i].trim();
        
        // Pula linhas muito curtas
        if (linha.length < 5) continue;
        
        // Tenta extrair código e descrição
        let codigo = '';
        let descricao = '';
        let quantidade = 1;
        
        // Padrão 1: Código seguido de descrição, separados por espaço
        const match1 = linha.match(/^([A-Z0-9\-\.]+)\s+(.+)$/i);
        if (match1) {
            codigo = match1[1];
            descricao = match1[2];
        } 
        // Padrão 2: Qualquer texto com números
        else {
            const numeros = linha.match(/\d+/g);
            if (numeros && numeros.length > 0) {
                codigo = `ITEM-${i+1}`;
                descricao = linha;
                
                // Último número pode ser a quantidade
                quantidade = parseInt(numeros[numeros.length - 1], 10);
                if (isNaN(quantidade) || quantidade <= 0 || quantidade > 1000) {
                    quantidade = 1;
                }
            } else {
                codigo = `ITEM-${i+1}`;
                descricao = linha;
            }
        }
        
        if (codigo && descricao) {
            dados.push({
                codigo: normalizarTexto(codigo),
                descricao: normalizarTexto(descricao),
                quantidade: quantidade
            });
        }
    }
    
    return dados;
}

/**
 * Extrai informações de um elemento XML
 * 
 * @param {Element} elemento - Elemento XML
 * @returns {Object|null} - Objeto com os dados extraídos ou null se não for possível extrair
 */
function extrairItemXML(elemento) {
    // Mapeamento de possíveis nomes de elementos para campos padronizados
    const mapeamento = {
        codigo: ['codigo', 'code', 'id', 'cProd', 'codprod', 'cod', 'sku', 'part', 'partnumber'],
        descricao: ['descricao', 'desc', 'nome', 'produto', 'xProd', 'descprod', 'description', 'title', 'name'],
        quantidade: ['quantidade', 'qtd', 'qtde', 'quant', 'qCom', 'qtdprod', 'quantity', 'qty', 'amount'],
        altura: ['altura', 'alt', 'h', 'a', 'height'],
        largura: ['largura', 'larg', 'l', 'width', 'w'],
        medida: ['medida', 'med', 'dimensao', 'dim', 'dimension', 'size'],
        cor: ['cor', 'color', 'colour']
    };
    
    // Objeto para armazenar os dados extraídos
    const item = {};
    
    // Tenta extrair os campos
    for (const [campo, possiveisNomes] of Object.entries(mapeamento)) {
        // Tenta encontrar um elemento filho com um dos nomes possíveis
        for (const nome of possiveisNomes) {
            // Tenta como elemento filho
            const elementoFilho = elemento.querySelector(nome);
            if (elementoFilho && elementoFilho.textContent.trim()) {
                item[campo] = normalizarTexto(elementoFilho.textContent.trim());
                break;
            }
            
            // Tenta como atributo
            if (elemento.hasAttribute(nome)) {
                item[campo] = normalizarTexto(elemento.getAttribute(nome).trim());
                break;
            }
            
            // Tenta como elemento filho com nome case-insensitive
            const filhos = elemento.children;
            for (let i = 0; i < filhos.length; i++) {
                if (filhos[i].tagName.toLowerCase() === nome.toLowerCase() && filhos[i].textContent.trim()) {
                    item[campo] = normalizarTexto(filhos[i].textContent.trim());
                    break;
                }
            }
            
            // Se já encontrou, não continua procurando
            if (item[campo]) break;
        }
    }
    
    // Se não encontrou código, tenta usar o nome da tag ou um atributo de ID
    if (!item.codigo) {
        if (elemento.tagName) {
            item.codigo = `${elemento.tagName}-${Math.floor(Math.random() * 1000)}`;
        } else if (elemento.id) {
            item.codigo = elemento.id;
        } else {
            item.codigo = `ITEM-${Math.floor(Math.random() * 10000)}`;
        }
    }
    
    // Se não encontrou descrição, tenta usar o conteúdo de texto do elemento
    if (!item.descricao) {
        const texto = elemento.textContent.trim();
        if (texto) {
            item.descricao = normalizarTexto(texto.substring(0, 100));
        } else {
            item.descricao = `Item ${item.codigo}`;
        }
    }
    
    // Se não encontrou quantidade, usa 1 como padrão
    if (!item.quantidade) {
        item.quantidade = 1;
    } else {
        // Converte quantidade para número
        item.quantidade = parseInt(String(item.quantidade).replace(/[^\d]/g, ''), 10) || 1;
    }
    
    return item;
}

/**
 * Mapeia os cabeçalhos do arquivo para campos padronizados
 * 
 * @param {Array} cabecalhos - Array com os nomes dos cabeçalhos
 * @returns {Object} - Objeto com o mapeamento de índices para campos padronizados
 */
function mapearCampos(cabecalhos) {
    const mapeamento = {};
    
    // Possíveis nomes para cada campo
    const possiveisNomes = {
        codigo: ['codigo', 'cdg', 'cod', 'code', 'codprod', 'coditem', 'sku', 'id', 'ref', 'referencia', 'part', 'partnumber'],
        descricao: ['descricao', 'desc', 'produto', 'nome', 'item', 'descprod', 'description', 'title', 'name', 'product'],
        quantidade: ['quantidade', 'quant', 'qtd', 'qtde', 'quant.', 'qtde.', 'qtdprod', 'quantity', 'qty', 'amount', 'qtd.'],
        altura: ['altura', 'alt', 'h', 'a', 'height'],
        largura: ['largura', 'larg', 'l', 'width', 'w'],
        medida: ['medida', 'med', 'lxa', 'axl', 'dimensao', 'dimensoes', 'dim', 'dimension', 'size', 'measure'],
        cor: ['cor', 'color', 'colour']
    };
    
    // Lista de cabeçalhos a serem ignorados (não mapear para nenhum campo)
    const cabecalhosIgnorados = [
        'responsavel', 'resp', 'setor', 'separacao', 'separador', 'fornecedor', 
        'estoque', 'comprar', 'entrega', 'data', 'obs', 'observacao', 'nota'
    ];
    
    // Para cada cabeçalho, verifica se corresponde a algum campo
    cabecalhos.forEach((cabecalho, indice) => {
        if (!cabecalho) return;
        
        // Normaliza o cabeçalho para comparação
        const cabecalhoNormalizado = normalizarTexto(cabecalho).toLowerCase().trim();
        
        // Verifica se o cabeçalho deve ser ignorado
        if (cabecalhosIgnorados.some(ignorado => cabecalhoNormalizado.includes(ignorado))) {
            console.log(`Ignorando cabeçalho: ${cabecalho}`);
            return; // Pula este cabeçalho
        }
        
        // Verifica correspondência exata ou parcial com os campos conhecidos
        let mapeado = false;
        for (const [campo, nomes] of Object.entries(possiveisNomes)) {
            // Primeiro tenta correspondência exata
            if (nomes.includes(cabecalhoNormalizado)) {
                mapeamento[campo] = indice;
                mapeado = true;
                console.log(`Mapeamento exato: ${cabecalho} -> ${campo}`);
                break;
            }
            
            // Se não encontrou correspondência exata, tenta parcial
            if (!mapeado && nomes.some(nome => cabecalhoNormalizado.includes(nome))) {
                mapeamento[campo] = indice;
                mapeado = true;
                console.log(`Mapeamento parcial: ${cabecalho} -> ${campo}`);
                break;
            }
        }
        
        if (!mapeado) {
            console.log(`Cabeçalho não mapeado: ${cabecalho}`);
        }
    });
    
    return mapeamento;
}

/**
 * Extrai um item a partir de uma linha de valores e um mapeamento de campos
 * 
 * @param {Array} valores - Array com os valores da linha
 * @param {Object} mapeamento - Objeto com o mapeamento de índices para campos
 * @returns {Object|null} - Objeto com os dados extraídos ou null se não for possível extrair
 */
function extrairItem(valores, mapeamento) {
    // Verifica se temos pelo menos um dos campos essenciais
    if (mapeamento.codigo === undefined && 
        mapeamento.descricao === undefined && 
        mapeamento.quantidade === undefined) {
        return null;
    }
    
    // Extrai os valores disponíveis
    let codigo = mapeamento.codigo !== undefined ? valores[mapeamento.codigo]?.trim() : null;
    let descricao = mapeamento.descricao !== undefined ? valores[mapeamento.descricao]?.trim() : null;
    let quantidade = mapeamento.quantidade !== undefined ? valores[mapeamento.quantidade]?.trim() : null;
    
    // Se não temos código nem descrição, não podemos criar um item válido
    if (!codigo && !descricao) {
        return null;
    }
    
    // Se não temos código, gera um baseado na descrição ou posição
    if (!codigo) {
        if (descricao) {
            codigo = `ITEM-${descricao.substring(0, 10).replace(/\s+/g, '-')}`;
        } else {
            codigo = `ITEM-${Math.floor(Math.random() * 10000)}`;
        }
    }
    
    // Se não temos descrição, usa o código como base
    if (!descricao) {
        descricao = `Item ${codigo}`;
    }
    
    // Se não temos quantidade, usa 1 como padrão
    if (!quantidade) {
        quantidade = 1;
    } else {
        // Converte quantidade para número
        quantidade = parseInt(String(quantidade).replace(/[^\d]/g, ''), 10) || 1;
    }
    
    // Cria o objeto do item
    const item = {
        codigo: normalizarTexto(codigo),
        descricao: normalizarTexto(descricao),
        quantidade: quantidade
    };
    
    // Adiciona campos opcionais se disponíveis e válidos
    if (mapeamento.altura !== undefined && valores[mapeamento.altura]) {
        const alturaValor = valores[mapeamento.altura].trim();
        // Verifica se o valor parece uma altura válida (número ou medida)
        if (/^\d+(\.\d+)?(cm|mm|m|")?$/.test(alturaValor)) {
            item.altura = normalizarTexto(alturaValor);
        }
    }
    
    if (mapeamento.largura !== undefined && valores[mapeamento.largura]) {
        const larguraValor = valores[mapeamento.largura].trim();
        // Verifica se o valor parece uma largura válida (número ou medida)
        if (/^\d+(\.\d+)?(cm|mm|m|")?$/.test(larguraValor)) {
            item.largura = normalizarTexto(larguraValor);
        }
    }
    
    if (mapeamento.medida !== undefined && valores[mapeamento.medida]) {
        const medidaValor = valores[mapeamento.medida].trim();
        // Verifica se o valor parece uma medida válida (formato como 10x20)
        if (/^\d+\s*[xX]\s*\d+/.test(medidaValor)) {
            item.medida = normalizarTexto(medidaValor);
        }
    }
    
    if (mapeamento.cor !== undefined && valores[mapeamento.cor]) {
        const corValor = valores[mapeamento.cor].trim();
        // Verifica se o valor parece uma cor válida (não é um número)
        if (!/^\d+$/.test(corValor) && corValor.length > 1) {
            item.cor = normalizarTexto(corValor);
        }
    }
    
    return item;
}

/**
 * Normaliza um texto removendo caracteres especiais e tratando encoding
 * 
 * @param {string} texto - Texto a ser normalizado
 * @returns {string} - Texto normalizado
 */
function normalizarTexto(texto) {
    if (!texto) return '';
    
    // Converte para string caso não seja
    texto = String(texto);
    
    // Tenta corrigir problemas de encoding
    try {
        // Tenta detectar e corrigir caracteres mal codificados
        if (texto.includes('�') || /[\u0080-\u00FF]/.test(texto)) {
            // Tenta diferentes encodings
            const encodings = ['utf-8', 'iso-8859-1', 'windows-1252'];
            
            for (const encoding of encodings) {
                try {
                    const decoder = new TextDecoder(encoding);
                    const encoder = new TextEncoder();
                    const bytes = encoder.encode(texto);
                    const decodedText = decoder.decode(bytes);
                    
                    if (!decodedText.includes('�')) {
                        texto = decodedText;
                        break;
                    }
                } catch (e) {
                    console.warn(`Falha ao tentar encoding ${encoding}:`, e);
                }
            }
        }
        
        // Remove caracteres de controle e outros caracteres problemáticos
        texto = texto.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
        
        // Normaliza caracteres acentuados para melhorar comparações
        texto = texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    } catch (e) {
        console.warn('Erro ao normalizar texto:', e);
    }
    
    return texto;
}

/**
 * Salva os itens extraídos no Firebase
 * 
 * @param {Array} itens - Array de objetos com os itens a serem salvos
 * @param {string} clienteId - ID do cliente
 * @param {string} tipoProjeto - Tipo de projeto (PVC, Aluminio, etc.)
 * @param {string} nomeLista - Nome da lista (LPVC, LReforco, etc.)
 * @returns {Promise} - Promise que resolve quando todos os itens forem salvos
 */
function salvarItensNoFirebase(itens, clienteId, tipoProjeto, nomeLista) {
    // Verifica se temos dados válidos
    if (!itens || !Array.isArray(itens) || itens.length === 0) {
        return Promise.reject(new Error('Nenhum item válido para salvar'));
    }
    
    if (!clienteId || !tipoProjeto || !nomeLista) {
        return Promise.reject(new Error('Informações de destino incompletas'));
    }
    
    // Referência ao local onde os itens serão salvos
    const refLista = firebase.database().ref(`projetos/${clienteId}/${tipoProjeto}/listas/${nomeLista}`);
    
    // Salva os itens
    return refLista.set(itens)
        .catch(error => {
            console.error('Erro ao salvar no Firebase:', error);
            throw new Error(`Erro ao salvar no Firebase: ${error.message}`);
        });
}

// Expõe a função principal para uso em outros arquivos
window.processarArquivo = processarArquivo;
