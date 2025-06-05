/**
 * separacao.js
 * Lógica da tela de Gerar Separacão para Produção
 */

let tabelaCorrecao = null;

// Aguarda DOM
document.addEventListener('DOMContentLoaded', () => {
    carregarClientes();
    document.getElementById('selectCliente').addEventListener('change', () => {
        carregarTiposProjeto();
    });
    document.getElementById('selectTipoProjeto').addEventListener('change', () => {
        carregarListas();
    });
    document.getElementById('btnGerar').addEventListener('click', gerarSeparacao);

    // Inicializa DataTable vazia usando o plugin jQuery
    tabelaCorrecao = $('#tabelaCorrecao').DataTable({
        responsive: true,
        language: { url: 'https://cdn.datatables.net/plug-ins/1.11.5/i18n/pt-BR.json' },
        columns: [
            { data: 'codigo' },
            { data: 'descricao' },
            { data: 'quantidadeDesejadaSeparacao' },
            { data: 'quantidadeDisponivelOriginal' },
            { data: 'quantidadeParaSepararReal' },
            { data: 'quantidadeCompraAdicional' },
            { data: 'quantidadeDevolucaoEstoque' },
            { data: 'statusComparacao' }
        ]
    });
});

function carregarClientes() {
    const sel = document.getElementById('selectCliente');
    sel.innerHTML = '<option value="">Selecione</option>';
    if (!window.dbRef || !window.dbRef.clientes) return;
    window.dbRef.clientes.once('value').then(snap => {
        snap.forEach(child => {
            const opt = document.createElement('option');
            opt.value = child.key;
            opt.textContent = child.val().nome || child.key;
            sel.appendChild(opt);
        });
    });
}

function carregarTiposProjeto() {
    const clienteId = document.getElementById('selectCliente').value;
    const sel = document.getElementById('selectTipoProjeto');
    sel.innerHTML = '<option value="">Selecione</option>';
    document.getElementById('selectLista').innerHTML = '<option value="">Selecione</option>';
    if (!clienteId || !window.dbRef) return;
    firebase.database().ref(`projetos/${clienteId}`).once('value').then(snap => {
        const dados = snap.val() || {};
        Object.keys(dados).forEach(tipo => {
            if (tipo === 'processoEmpenho') return; // ignora
            const opt = document.createElement('option');
            opt.value = tipo;
            opt.textContent = tipo;
            sel.appendChild(opt);
        });
    });
}

function carregarListas() {
    const clienteId = document.getElementById('selectCliente').value;
    const tipo = document.getElementById('selectTipoProjeto').value;
    const sel = document.getElementById('selectLista');
    sel.innerHTML = '<option value="">Selecione</option>';
    if (!clienteId || !tipo) return;
    firebase.database().ref(`projetos/${clienteId}/${tipo}/listas`).once('value').then(snap => {
        snap.forEach(listSnap => {
            const itens = listSnap.val() || {};
            const elegivel = Object.values(itens).some(it =>
                (parseFloat(it.empenho || 0) > 0) || (parseFloat(it.quantidadeRecebida || 0) > 0)
            );
            if (elegivel) {
                const opt = document.createElement('option');
                opt.value = listSnap.key;
                opt.textContent = listSnap.key;
                sel.appendChild(opt);
            }
        });
    });
}

function gerarSeparacao() {
    const clienteId = document.getElementById('selectCliente').value;
    const tipo = document.getElementById('selectTipoProjeto').value;
    const lista = document.getElementById('selectLista').value;
    const arquivo = document.getElementById('inputArquivo').files[0];

    if (!clienteId || !tipo || !lista || !arquivo) {
        mostrarNotificacao('Selecione cliente, projeto, lista e arquivo.', 'warning');
        return;
    }

    processarArquivoSeparacao(arquivo, clienteId, tipo, lista)
        .then(() => compararListas(clienteId, tipo, lista))
        .then(res => {
            preencherTabela(res);
            mostrarNotificacao('Processamento concluído', 'success');
        })
        .catch(err => {
            console.error(err);
            mostrarNotificacao('Erro no processamento', 'danger');
        });
}

function processarArquivoSeparacao(arquivo, clienteId, tipoProjeto, nomeLista) {
    return new Promise((resolve, reject) => {
        const tipoArquivo = obterTipoArquivo(arquivo.name);
        if (!tipoArquivo) {
            reject(new Error('Formato de arquivo não suportado'));
            return;
        }
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                let itens = [];
                switch (tipoArquivo) {
                    case 'csv':
                        itens = processarCSV(e.target.result);
                        break;
                    case 'xlsx':
                        itens = processarXLSX(e.target.result);
                        break;
                    case 'xml':
                        itens = processarXML(e.target.result);
                        break;
                }
                firebase.database().ref(`SeparacaoProd/${clienteId}/${tipoProjeto}/${nomeLista}/itens`).set(itens)
                    .then(resolve)
                    .catch(reject);
            } catch (err) {
                reject(err);
            }
        };
        if (tipoArquivo === 'xlsx') {
            reader.readAsArrayBuffer(arquivo);
        } else {
            reader.readAsText(arquivo);
        }
    });
}

function compararListas(clienteId, tipoProjeto, nomeLista) {
    const refOrig = firebase.database().ref(`projetos/${clienteId}/${tipoProjeto}/listas/${nomeLista}`);
    const refSep = firebase.database().ref(`SeparacaoProd/${clienteId}/${tipoProjeto}/${nomeLista}/itens`);
    return Promise.all([refOrig.once('value'), refSep.once('value')])
        .then(([origSnap, sepSnap]) => {
            const listaOrig = origSnap.val() || {};
            const listaSep = sepSnap.val() || {};
            const usados = new Set();
            const resultado = [];

            Object.keys(listaSep).forEach(key => {
                const itemSep = listaSep[key];
                const itemOrig = Object.values(listaOrig).find(i => i.codigo === itemSep.codigo);
                if (itemOrig) usados.add(itemOrig.codigo);
                const disponivel = itemOrig ? (parseFloat(itemOrig.empenho || 0) + parseFloat(itemOrig.quantidadeRecebida || 0)) : 0;
                const desejado = parseFloat(itemSep.quantidade || 0);
                const res = {
                    codigo: itemSep.codigo,
                    descricao: itemSep.descricao || '',
                    quantidadeDesejadaSeparacao: desejado,
                    quantidadeDisponivelOriginal: disponivel,
                    quantidadeParaSepararReal: 0,
                    quantidadeCompraAdicional: 0,
                    quantidadeDevolucaoEstoque: 0,
                    statusComparacao: ''
                };
                if (itemOrig) {
                    if (desejado === disponivel) {
                        res.quantidadeParaSepararReal = desejado;
                        res.statusComparacao = 'Liberar para Separacao';
                    } else if (desejado < disponivel) {
                        res.quantidadeParaSepararReal = desejado;
                        res.quantidadeDevolucaoEstoque = disponivel - desejado;
                        res.statusComparacao = 'Liberar e Devolver';
                    } else if (desejado > disponivel) {
                        res.quantidadeParaSepararReal = disponivel;
                        res.quantidadeCompraAdicional = desejado - disponivel;
                        res.statusComparacao = 'Parcial - Comprar';
                    }
                } else {
                    res.quantidadeCompraAdicional = desejado;
                    res.statusComparacao = 'Item Novo';
                }
                resultado.push(res);
            });

            Object.values(listaOrig).forEach(itemOrig => {
                if (!usados.has(itemOrig.codigo)) {
                    const disponivel = (parseFloat(itemOrig.empenho || 0) + parseFloat(itemOrig.quantidadeRecebida || 0));
                    if (disponivel > 0) {
                        resultado.push({
                            codigo: itemOrig.codigo,
                            descricao: itemOrig.descricao || '',
                            quantidadeDesejadaSeparacao: 0,
                            quantidadeDisponivelOriginal: disponivel,
                            quantidadeParaSepararReal: 0,
                            quantidadeCompraAdicional: 0,
                            quantidadeDevolucaoEstoque: disponivel,
                            statusComparacao: 'Devolver Estoque Integral'
                        });
                    }
                }
            });

            return firebase.database().ref(`CorrecaoFinal/${clienteId}/${tipoProjeto}/${nomeLista}/itensProcessados`).set(resultado)
                .then(() => resultado);
        });
}

function preencherTabela(dados) {
    tabelaCorrecao.clear();
    tabelaCorrecao.rows.add(dados);
    tabelaCorrecao.draw();
}
