/**
 * cadastro.js
 * * Lógica específica da tela de cadastro de clientes e projetos
 * Este arquivo contém todas as funções relacionadas à tela de cadastro
 * do Sistema de Controle de Compras e Recebimento
 */

// Aguarda o carregamento completo do DOM
document.addEventListener("DOMContentLoaded", function () {
  // Inicializa os componentes da página
  inicializarComponentes();

  // Carrega a lista de clientes cadastrados
  carregarClientes();

  // Configura os listeners de eventos
  configurarEventListeners();
});

/**
 * Inicializa os componentes da interface
 * Configura datepickers, selects e outros elementos
 */
function inicializarComponentes() {
  // Inicializa os datepickers
  flatpickr(".datepicker", {
    locale: "pt",
    dateFormat: "d/m/Y",
    allowInput: true,
  });

  // Inicializa os selects com Select2
  $(document).ready(function () {
    $("#filtroCliente").select2({
      placeholder: "Selecione um cliente",
      allowClear: true,
    });

    $("#filtroStatus").select2({
      placeholder: "Selecione um status",
      allowClear: true,
    });
  });
}

/**
 * Configura os listeners de eventos para os elementos da página
 */
function configurarEventListeners() {
  // Botão Novo Cadastro
  document
    .getElementById("btnNovoCadastro")
    .addEventListener("click", function () {
      // Limpa o formulário antes de abrir o modal
      document.getElementById("formCadastro").reset();

      // Oculta todas as áreas de projeto
      document.querySelectorAll(".area-projeto").forEach((area) => {
        area.classList.add("d-none");
      });

      // Remove o ID do cliente do modal (para indicar que é um novo cadastro)
      document.getElementById("modalCadastro").dataset.clienteId = "";

      // Atualiza o título do modal
      document.getElementById("modalCadastroLabel").textContent =
        "Novo Cadastro";

      // Atualiza o texto do botão
      document.getElementById("btnSalvarCadastro").textContent = "Salvar";

      // Exibe o modal
      const modalCadastro = new bootstrap.Modal(
        document.getElementById("modalCadastro")
      );
      modalCadastro.show();
    });

  // Checkboxes de tipo de projeto
  document.querySelectorAll(".tipo-projeto").forEach((checkbox) => {
    checkbox.addEventListener("change", function () {
      const tipoId = this.id;
      const areaTipo = document.getElementById(
        "area" + tipoId.replace("tipo", "")
      );

      if (this.checked && areaTipo) {
        areaTipo.classList.remove("d-none");
      } else if (areaTipo) {
        areaTipo.classList.add("d-none");
      }
    });
  });

  // Checkbox de terceirização para Alumínio
  document
    .getElementById("aluminioTerceirizado")
    .addEventListener("change", function () {
      const areaTerceirizado = document.getElementById(
        "areaAluminioTerceirizado"
      );
      const areaProducao = document.getElementById("areaAluminioProducao");

      if (this.checked) {
        areaTerceirizado.classList.remove("d-none");
        areaProducao.classList.add("d-none");
      } else {
        areaTerceirizado.classList.add("d-none");
        areaProducao.classList.remove("d-none");
      }
    });

  // Checkbox de terceirização para Brise
  document
    .getElementById("briseTerceirizado")
    .addEventListener("change", function () {
      const areaTerceirizado = document.getElementById("areaBriseTerceirizado");
      const areaProducao = document.getElementById("areaBriseProducao");

      if (this.checked) {
        areaTerceirizado.classList.remove("d-none");
        areaProducao.classList.add("d-none");
      } else {
        areaTerceirizado.classList.add("d-none");
        areaProducao.classList.remove("d-none");
      }
    });

  // Checkbox de terceirização para ACM
  document
    .getElementById("acmTerceirizado")
    .addEventListener("change", function () {
      const areaTerceirizado = document.getElementById("areaACMTerceirizado");
      const areaProducao = document.getElementById("areaACMProducao");

      if (this.checked) {
        areaTerceirizado.classList.remove("d-none");
        areaProducao.classList.add("d-none");
      } else {
        areaTerceirizado.classList.add("d-none");
        areaProducao.classList.remove("d-none");
      }
    });

  // Checkbox de terceirização para Trilho
  document
    .getElementById("trilhoTerceirizado")
    .addEventListener("change", function () {
      const areaTerceirizado = document.getElementById(
        "areaTrilhoTerceirizado"
      );
      const areaProducao = document.getElementById("areaTrilhoProducao");

      if (this.checked) {
        areaTerceirizado.classList.remove("d-none");
        areaProducao.classList.add("d-none");
      } else {
        areaTerceirizado.classList.add("d-none");
        areaProducao.classList.remove("d-none");
      }
    });

  // Checkbox de terceirização para Outros
  document
    .getElementById("outrosTerceirizado")
    .addEventListener("change", function () {
      const areaTerceirizado = document.getElementById(
        "areaOutrosTerceirizado"
      );
      const areaProducao = document.getElementById("areaOutrosProducao");

      if (this.checked) {
        areaTerceirizado.classList.remove("d-none");
        areaProducao.classList.add("d-none");
      } else {
        areaTerceirizado.classList.add("d-none");
        areaProducao.classList.remove("d-none");
      }
    });

  // Botão para adicionar nova lista personalizada
  document
    .getElementById("btnAdicionarListaOutros")
    .addEventListener("click", function () {
      adicionarListaPersonalizada();
    });

  // Botão Salvar Cadastro
  document
    .getElementById("btnSalvarCadastro")
    .addEventListener("click", salvarCadastro);

  // Botão Filtrar
  document
    .getElementById("btnFiltrar")
    .addEventListener("click", aplicarFiltros);

  // Botão Limpar Filtros
  document
    .getElementById("btnLimparFiltros")
    .addEventListener("click", limparFiltros);
}

/**
 * Carrega a lista de clientes cadastrados do Firebase
 * e atualiza a tabela na interface
 */
function carregarClientes() {
  // Referência à tabela de clientes
  const tabelaClientes = document.getElementById("tabelaClientes");
  const nenhumCliente = document.getElementById("nenhumCliente");

  // Limpa a tabela
  tabelaClientes.innerHTML = "";

  // Busca os clientes no Firebase
  dbRef.clientes
    .once("value")
    .then((snapshot) => {
      const clientes = snapshot.val();

      // Verifica se existem clientes cadastrados
      if (objetoVazio(clientes)) {
        nenhumCliente.classList.remove("d-none");
        return;
      }

      nenhumCliente.classList.add("d-none");

      // Preenche o select de filtro de clientes
      const filtroCliente = document.getElementById("filtroCliente");
      filtroCliente.innerHTML = '<option value="">Todos os clientes</option>';

      // Adiciona cada cliente à tabela
      Object.keys(clientes).forEach((id) => {
        const cliente = clientes[id];

        // Adiciona ao filtro
        const option = document.createElement("option");
        option.value = id;
        option.textContent = cliente.nome;
        filtroCliente.appendChild(option);

        // Cria a linha da tabela
        const tr = document.createElement("tr");
        tr.dataset.id = id;

        // Define a classe de acordo com o status
        if (cliente.StatusCadastro === "Em andamento") {
          tr.classList.add("table-warning");
        } else if (cliente.StatusCadastro === "Concluído") {
          tr.classList.add("table-success");
        }

        // Formata a data de criação
        const dataCriacao = formatarData(cliente.dataCriacao);

        // Conteúdo da linha
        tr.innerHTML = `
                    <td>${cliente.nome}</td>
                    <td>${dataCriacao}</td>
                    <td>
                        <span class="badge ${getBadgeClass(
                          cliente.StatusCadastro
                        )}">${cliente.StatusCadastro || "Não iniciado"}</span>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-info me-1 btn-visualizar" onclick="visualizarCliente('${id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-primary" onclick="editarCliente('${id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                    </td>
                `;

        tabelaClientes.appendChild(tr);
      });

      // Adiciona os event listeners aos botões de visualização
      const botoesVisualizar = document.querySelectorAll(".btn-visualizar");
      console.log(
        "Botões de visualização encontrados:",
        botoesVisualizar.length
      );

      botoesVisualizar.forEach(function (botao) {
        botao.addEventListener("click", function (e) {
          console.log("Botão de visualização clicado");
          const clienteId = this.closest("tr").dataset.id;
          console.log("ID do cliente:", clienteId);

          try {
            console.log("Tentando chamar visualizarCliente...");
            visualizarCliente(clienteId);
          } catch (error) {
            console.error("Erro ao chamar visualizarCliente:", error);
            alert("Erro ao visualizar cliente: " + error.message);
          }
        });
      });
    })
    .catch((error) => {
      console.error("Erro ao carregar clientes:", error);
      mostrarNotificacao(
        "Erro ao carregar clientes. Tente novamente.",
        "danger"
      );
    });
}

/**
 * Retorna a classe do badge de acordo com o status
 * * @param {string} status - Status do cliente
 * @returns {string} - Classe CSS para o badge
 */
function getBadgeClass(status) {
  switch (status) {
    case "Em andamento":
      return "bg-warning";
    case "Concluído":
      return "bg-success";
    default:
      return "bg-secondary";
  }
}

/**
 * Abre o modal de edição de cliente com os dados carregados
 * * @param {string} clienteId - ID do cliente a ser editado
 */
function editarCliente(clienteId) {
  console.log("=== INÍCIO DA FUNÇÃO EDITAR CLIENTE ===");
  console.log("Editando cliente com ID:", clienteId);

  if (!dbRef) {
    console.error("ERRO CRÍTICO: dbRef não está definido!");
    mostrarNotificacao(
      "Erro de conexão com o banco de dados. Recarregue a página.",
      "danger"
    );
    return;
  }

  // Limpa o formulário antes de carregar os dados
  document.getElementById("formCadastro").reset();

  // Oculta todas as áreas de projeto
  document.querySelectorAll(".area-projeto").forEach((area) => {
    area.classList.add("d-none");
  });

  // Armazena o ID do cliente no modal para uso na função de salvar
  document.getElementById("modalCadastro").dataset.clienteId = clienteId;

  // Atualiza o título do modal
  document.getElementById("modalCadastroLabel").textContent = "Editar Cadastro";

  // Atualiza o texto do botão
  document.getElementById("btnSalvarCadastro").textContent = "Atualizar";

  // Busca os dados do cliente no Firebase
  dbRef.clientes
    .child(clienteId)
    .once("value")
    .then((snapshotCliente) => {
      console.log("Resposta recebida do Firebase para dados do cliente");

      const cliente = snapshotCliente.val();
      console.log("Dados do cliente:", cliente);

      if (!cliente) {
        console.error("Cliente não encontrado no Firebase");
        throw new Error("Cliente não encontrado");
      }

      // Preenche os campos do formulário com os dados do cliente
      document.getElementById("cliente").value = cliente.nome || "";

      // Formata a data de prazo de entrega
      if (cliente.prazoEntrega) {
        const data = new Date(cliente.prazoEntrega);
        const dia = String(data.getDate()).padStart(2, "0");
        const mes = String(data.getMonth() + 1).padStart(2, "0");
        const ano = data.getFullYear();
        document.getElementById(
          "dataPrazoEntrega"
        ).value = `${dia}/${mes}/${ano}`;
      }

      // Busca os projetos do cliente
      return dbRef.projetos.child(clienteId).once("value");
    })
    .then((snapshotProjetos) => {
      console.log("Resposta recebida do Firebase para projetos");

      const projetos = snapshotProjetos.val();
      console.log("Dados dos projetos:", projetos);

      // Se não há projetos, apenas exibe o modal
      if (!projetos || objetoVazio(projetos)) {
        console.log("Nenhum projeto encontrado para este cliente");

        // Exibe o modal
        const modalCadastro = new bootstrap.Modal(
          document.getElementById("modalCadastro")
        );
        modalCadastro.show();

        return;
      }

      // Marca os checkboxes de tipos de projeto e exibe as áreas correspondentes
      Object.keys(projetos).forEach((tipoProjeto) => {
        const checkbox = document.getElementById(`tipo${tipoProjeto}`);
        if (checkbox) {
          checkbox.checked = true;

          // Exibe a área do projeto
          const areaTipo = document.getElementById(`area${tipoProjeto}`);
          if (areaTipo) {
            areaTipo.classList.remove("d-none");
          }

          // Se for terceirizado, marca o checkbox e exibe a área correspondente
          if (projetos[tipoProjeto].terceirizado) {
            const checkboxTerceirizado = document.getElementById(
              `${tipoProjeto.toLowerCase()}Terceirizado`
            );
            if (checkboxTerceirizado) {
              checkboxTerceirizado.checked = true;

              // Exibe a área de terceirização
              const areaTerceirizado = document.getElementById(
                `area${tipoProjeto}Terceirizado`
              );
              const areaProducao = document.getElementById(
                `area${tipoProjeto}Producao`
              );

              if (areaTerceirizado) {
                areaTerceirizado.classList.remove("d-none");
              }

              if (areaProducao) {
                areaProducao.classList.add("d-none");
              }

              // Preenche os campos de terceirização
              const empresa = document.getElementById(`empresa${tipoProjeto}`);
              if (empresa) {
                empresa.value = projetos[tipoProjeto].empresa || "";
              }

              // Formata a data de solicitação
              if (projetos[tipoProjeto].dataSolicitacao) {
                const data = new Date(projetos[tipoProjeto].dataSolicitacao);
                const dia = String(data.getDate()).padStart(2, "0");
                const mes = String(data.getMonth() + 1).padStart(2, "0");
                const ano = data.getFullYear();

                const dataSolicitacao = document.getElementById(
                  `dataSolicitacao${tipoProjeto}`
                );
                if (dataSolicitacao) {
                  dataSolicitacao.value = `${dia}/${mes}/${ano}`;
                }
              }

              // Formata a data de prazo de entrega
              if (projetos[tipoProjeto].prazoEntrega) {
                const data = new Date(projetos[tipoProjeto].prazoEntrega);
                const dia = String(data.getDate()).padStart(2, "0");
                const mes = String(data.getMonth() + 1).padStart(2, "0");
                const ano = data.getFullYear();

                const prazoEntrega = document.getElementById(
                  `prazoEntrega${tipoProjeto}`
                );
                if (prazoEntrega) {
                  prazoEntrega.value = `${dia}/${mes}/${ano}`;
                }
              }
            }
          } else {
            // Exibe a área de produção própria
            const areaProducao = document.getElementById(
              `area${tipoProjeto}Producao`
            );
            if (areaProducao) {
              areaProducao.classList.remove("d-none");
            }
          }
        }
      });

      // Exibe o modal
      const modalCadastro = new bootstrap.Modal(
        document.getElementById("modalCadastro")
      );
      modalCadastro.show();
    })
    .catch((error) => {
      console.error("Erro ao editar cliente:", error);
      mostrarNotificacao("Erro ao editar cliente. Tente novamente.", "danger");
      console.log("=== FIM DA FUNÇÃO EDITAR CLIENTE - ERRO ===");
    });
}

/**
 * Salva um novo cadastro de cliente e seus projetos no Firebase
 * ou atualiza um cadastro existente
 */
async function salvarCadastro() {
  // Referência ao formulário
  const form = document.getElementById("formCadastro");

  // Valida o formulário
  if (!validarFormulario(form)) {
    mostrarNotificacao("Preencha todos os campos obrigatórios.", "warning");
    return;
  }

  // Validação específica para o tipo de projeto "Outros"
  if (document.getElementById("tipoOutros").checked) {
    const nomeProjetoOutros = document
      .getElementById("nomeProjetoOutros")
      .value.trim();
    if (!nomeProjetoOutros) {
      mostrarNotificacao("Informe o nome do projeto personalizado.", "warning");
      return;
    }
  }

  // Obtém os valores do formulário
  const nomeCliente = document.getElementById("cliente").value;
  const prazoEntrega = document.getElementById("dataPrazoEntrega").value;

  // Captura informações do projeto personalizado (Outros)
  let nomeProjetoOutros = "";
  let listasPersonalizadas = [];

  if (document.getElementById("tipoOutros").checked) {
    nomeProjetoOutros = document
      .getElementById("nomeProjetoOutros")
      .value.trim();

    // Se não for terceirizado, captura as listas personalizadas
    if (!document.getElementById("outrosTerceirizado").checked) {
      const listasContainer = document.getElementById(
        "listasPersonalizadasContainer"
      );
      const listasItems = listasContainer.querySelectorAll(
        ".lista-personalizada"
      );

      listasItems.forEach((item) => {
        const nomeLista = item
          .querySelector(".nome-lista-personalizada")
          .value.trim();
        const arquivoLista = item.querySelector(".arquivo-lista-personalizada")
          .files[0];

        if (nomeLista && arquivoLista) {
          listasPersonalizadas.push({
            nome: nomeLista,
            arquivo: arquivoLista,
          });
        }
      });
    }
  }

  // Converte a data para timestamp
  const dataParts = prazoEntrega.split("/");
  const prazoEntregaTimestamp = new Date(
    parseInt(dataParts[2]),
    parseInt(dataParts[1]) - 1,
    parseInt(dataParts[0])
  ).getTime();

  // Verifica se é uma edição ou um novo cadastro
  const clienteId =
    document.getElementById("modalCadastro").dataset.clienteId || gerarId();
  const isEditing =
    !!document.getElementById("modalCadastro").dataset.clienteId;

  // Prepara os dados do cliente
  const clienteData = {
    nome: nomeCliente,
    prazoEntrega: prazoEntregaTimestamp,
    ultimaAtualizacao: Date.now(),
  };

  if (!isEditing) {
    clienteData.dataCriacao = Date.now();
    clienteData.StatusCadastro = "Não iniciado";
  }

  if (document.getElementById("tipoOutros").checked && nomeProjetoOutros) {
    clienteData.projetoOutrosNome = nomeProjetoOutros;
  }

  const tiposProjetoSelecionados = [];
  document.querySelectorAll(".tipo-projeto:checked").forEach((checkbox) => {
    tiposProjetoSelecionados.push(checkbox.value);
  });

  if (tiposProjetoSelecionados.length === 0) {
    mostrarNotificacao("Selecione pelo menos um tipo de projeto.", "warning");
    return;
  }

  try {
    // *** INÍCIO DA CORREÇÃO LÓGICA ***

    // 1. Busca os projetos existentes se estiver em modo de edição
    let projetosExistentes = {};
    if (isEditing) {
      const snapshotProjetos = await dbRef.projetos
        .child(clienteId)
        .once("value");
      projetosExistentes = snapshotProjetos.val() || {};
    }

    // 2. Constrói o novo objeto de projetos, preservando as listas existentes
    const projetosParaSalvar = {};
    tiposProjetoSelecionados.forEach((tipo) => {
      const projetoExistente = projetosExistentes[tipo] || {}; // Pega dados do projeto específico

      // Inicia o objeto do projeto com as listas existentes para não apagá-las
      const tipoProjeto = {
        terceirizado: false, // Valor padrão
        listas: projetoExistente.listas || {}, // PRESERVA a estrutura de listas existente
      };

      // Atualiza os dados conforme o formulário
      const checkboxTerceirizado = document.getElementById(
        `${tipo.toLowerCase()}Terceirizado`
      );
      if (checkboxTerceirizado && checkboxTerceirizado.checked) {
        tipoProjeto.terceirizado = true;

        const empresa = document.getElementById(`empresa${tipo}`).value;
        const dataSolicitacao = document.getElementById(
          `dataSolicitacao${tipo}`
        ).value;
        const prazoEntregaTerceirizado = document.getElementById(
          `prazoEntrega${tipo}`
        ).value;

        tipoProjeto.empresa = empresa;

        if (dataSolicitacao) {
          const parts = dataSolicitacao.split("/");
          tipoProjeto.dataSolicitacao = new Date(
            parseInt(parts[2]),
            parseInt(parts[1]) - 1,
            parseInt(parts[0])
          ).getTime();
        }

        if (prazoEntregaTerceirizado) {
          const parts = prazoEntregaTerceirizado.split("/");
          tipoProjeto.prazoEntrega = new Date(
            parseInt(parts[2]),
            parseInt(parts[1]) - 1,
            parseInt(parts[0])
          ).getTime();
        }
      }

      projetosParaSalvar[tipo] = tipoProjeto;
    });

    // 3. Salva os dados do cliente e os projetos usando 'update'
    await dbRef.clientes.child(clienteId).update(clienteData);
    await dbRef.projetos.child(clienteId).update(projetosParaSalvar);

    // *** FIM DA CORREÇÃO LÓGICA ***

    // 4. Processa os arquivos de listas
    await processarArquivosListas(
      clienteId,
      tiposProjetoSelecionados,
      listasPersonalizadas
    );

    // Exibe mensagem de sucesso e finaliza o processo
    mostrarNotificacao("Cliente salvo com sucesso!", "success");
    const modalCadastro = bootstrap.Modal.getInstance(
      document.getElementById("modalCadastro")
    );
    modalCadastro.hide();
    carregarClientes();
  } catch (error) {
    console.error("Erro ao salvar cadastro:", error);
    mostrarNotificacao("Erro ao salvar cadastro. Tente novamente.", "danger");
  }
}

/**
 * Processa os arquivos de listas para cada tipo de projeto
 * * @param {string} clienteId - ID do cliente
 * @param {Array} tiposSelecionados - Tipos de projeto selecionados
 * @param {Array} listasPersonalizadas - Listas personalizadas para o tipo "Outros"
 * @returns {Promise} - Promise que resolve quando todos os arquivos forem processados
 */
function processarArquivosListas(
  clienteId,
  tiposSelecionados,
  listasPersonalizadas = []
) {
  // Array para armazenar todas as promessas de processamento
  const promessas = [];

  // Para cada tipo de projeto
  tiposSelecionados.forEach((tipo) => {
    // Verifica se o tipo é terceirizado
    const checkboxTerceirizado = document.getElementById(
      `${tipo.toLowerCase()}Terceirizado`
    );
    if (checkboxTerceirizado && checkboxTerceirizado.checked) {
      // Se for terceirizado, processa apenas a lista de chaves
      const inputChaves = document.getElementById(
        `listaChaves${tipo}Terceirizado`
      );
      if (inputChaves && inputChaves.files.length > 0) {
        const promessa = new Promise((resolve, reject) => {
          processarArquivo(inputChaves.files[0], clienteId, tipo, "LChaves")
            .then(resolve)
            .catch(reject);
        });
        promessas.push(promessa);
      }
      return;
    }

    // Define as listas para cada tipo de projeto
    let listas = [];

    switch (tipo) {
      case "PVC":
        listas = [
          { id: "listaChavesPVC", nome: "LChaves" },
          { id: "listaPVC", nome: "LPVC" },
          { id: "listaReforco", nome: "LReforco" },
          { id: "listaFerragens", nome: "LFerragens" },
          { id: "listaVidros", nome: "LVidros" },
          { id: "listaEsteira", nome: "LEsteira" },
          { id: "listaMotor", nome: "LMotor" },
          { id: "listaAcabamento", nome: "LAcabamento" },
          { id: "listaTelaRetratil", nome: "LTelaRetratil" },
          { id: "listaAco", nome: "LAco" },
          { id: "listaOutrosPVC", nome: "LOutros" },
        ];
        break;
      case "Aluminio":
        listas = [
          { id: "listaChavesAluminio", nome: "LChaves" },
          { id: "listaPerfil", nome: "LPerfil" },
          { id: "listaContraMarco", nome: "LContraMarco" },
          { id: "listaFerragensAluminio", nome: "LFerragens" },
          { id: "listaVidroAluminio", nome: "LVidro" },
          { id: "listaMotorAluminio", nome: "LMotor" },
          { id: "listaEsteiraAluminio", nome: "LEsteira" },
          { id: "listaAcabamentoAluminio", nome: "LAcabamento" },
          { id: "listaTelaRetratilAluminio", nome: "LTelaRetratil" },
          { id: "listaOutrosAluminio", nome: "LOutros" },
        ];
        break;
      case "Brise":
        listas = [
          { id: "listaChavesBrise", nome: "LChaves" },
          { id: "listaPerfilBrise", nome: "LPerfil" },
          { id: "listaFerragensBrise", nome: "LFerragens" },
          { id: "listaConexaoBrise", nome: "LConexao" },
          { id: "listaFechaduraEletronicaBrise", nome: "LFechaduraEletronica" },
          { id: "listaOutrosBrise", nome: "LOutros" },
        ];
        break;
      case "ACM":
        listas = [
          { id: "listaChavesACM", nome: "LChaves" },
          { id: "listaPerfilACM", nome: "LPerfil" },
          { id: "listaFerragensACM", nome: "LFerragens" },
          { id: "listaConexaoACM", nome: "LConexao" },
          { id: "listaChapaACM", nome: "LChapaACM" },
          { id: "listaFechaduraEletronicaACM", nome: "LFechaduraEletronica" },
          { id: "listaOutrosACM", nome: "LOutros" },
        ];
        break;
      case "Trilho":
        listas = [
          { id: "listaChavesTrilho", nome: "LChaves" },
          { id: "listaPerfilTrilho", nome: "LPerfil" },
          { id: "listaOutrosTrilho", nome: "LOutros" },
        ];
        break;
      case "Outros":
        listas = [{ id: "listaChavesOutros", nome: "LChaves" }];
        break;
    }

    // Para cada lista do tipo de projeto
    listas.forEach((lista) => {
      const inputFile = document.getElementById(lista.id);

      // Verifica se há arquivo selecionado
      if (inputFile && inputFile.files.length > 0) {
        // Cria uma promessa para processar o arquivo
        const promessa = new Promise((resolve, reject) => {
          // Chama a função de processamento de arquivo (implementada em processamento-arquivos.js)
          processarArquivo(inputFile.files[0], clienteId, tipo, lista.nome)
            .then(resolve)
            .catch(reject);
        });

        // Adiciona a promessa ao array
        promessas.push(promessa);
      }
    });

    // Processa listas personalizadas para o tipo "Outros"
    if (tipo === "Outros" && listasPersonalizadas.length > 0) {
      listasPersonalizadas.forEach((lista) => {
        // Cria uma promessa para processar o arquivo
        const promessa = new Promise((resolve, reject) => {
          // Chama a função de processamento de arquivo com o nome personalizado
          processarArquivo(lista.arquivo, clienteId, tipo, `L${lista.nome}`)
            .then(resolve)
            .catch(reject);
        });

        // Adiciona a promessa ao array
        promessas.push(promessa);
      });
    }
  });

  // Retorna uma promessa que resolve quando todas as promessas de processamento forem resolvidas
  return Promise.all(promessas);
}

/**
 * Adiciona uma nova lista personalizada para o tipo de projeto "Outros"
 */
function adicionarListaPersonalizada() {
  // Obtém o template da lista personalizada
  const template = document.getElementById("templateListaPersonalizada");
  const container = document.getElementById("listasPersonalizadasContainer");

  // Clona o template
  const clone = document.importNode(template.content, true);

  // Adiciona evento para remover a lista
  const btnRemover = clone.querySelector(".btn-remover-lista");
  btnRemover.addEventListener("click", function () {
    const listaItem = this.closest(".lista-personalizada");
    listaItem.remove();
  });

  // Adiciona ao container
  container.appendChild(clone);
}

/**
 * Aplica os filtros selecionados à tabela de clientes
 */
function aplicarFiltros() {
  // Implementação da função de aplicar filtros
  console.log("Aplicando filtros...");

  // Obter valores dos filtros
  const filtroCliente = document.getElementById("filtroCliente").value;
  const filtroStatus = document.getElementById("filtroStatus").value;

  // Aplicar filtros à tabela
  const linhas = document.querySelectorAll("#tabelaClientes tr");

  linhas.forEach((linha) => {
    const clienteId = linha.dataset.id;
    const statusElement = linha.querySelector(".badge");
    const status = statusElement ? statusElement.textContent : "";

    let mostrar = true;

    if (filtroCliente && clienteId !== filtroCliente) {
      mostrar = false;
    }

    if (filtroStatus && status !== filtroStatus) {
      mostrar = false;
    }

    linha.style.display = mostrar ? "" : "none";
  });
}

/**
 * Limpa os filtros aplicados à tabela de clientes
 */
function limparFiltros() {
  // Limpa os campos de filtro
  document.getElementById("filtroCliente").value = "";
  document.getElementById("filtroStatus").value = "";

  // Recarrega a lista de clientes
  carregarClientes();
}

/**
 * Valida o formulário de cadastro
 * * @param {HTMLFormElement} form - Formulário a ser validado
 * @returns {boolean} - Indica se o formulário é válido
 */
function validarFormulario(form) {
  // Verifica se o nome do cliente foi preenchido
  const nomeCliente = document.getElementById("cliente").value;
  if (!nomeCliente) {
    return false;
  }

  // Verifica se a data de prazo de entrega foi preenchida
  const prazoEntrega = document.getElementById("dataPrazoEntrega").value;
  if (!prazoEntrega) {
    return false;
  }

  return true;
}

/**
 * Gera um ID único para novos registros
 * * @returns {string} - ID único
 */
function gerarId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

/**
 * Formata uma data timestamp para o formato DD/MM/YYYY
 * * @param {number} timestamp - Timestamp da data
 * @returns {string} - Data formatada
 */
function formatarData(timestamp) {
  const data = new Date(timestamp);
  const dia = String(data.getDate()).padStart(2, "0");
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const ano = data.getFullYear();

  return `${dia}/${mes}/${ano}`;
}

/**
 * Verifica se um objeto está vazio
 * * @param {object} obj - Objeto a ser verificado
 * @returns {boolean} - Indica se o objeto está vazio
 */
function objetoVazio(obj) {
  return obj === null || obj === undefined || Object.keys(obj).length === 0;
}

/**
 * Exibe uma notificação na interface
 * * @param {string} mensagem - Mensagem a ser exibida
 * @param {string} tipo - Tipo da notificação (success, warning, danger)
 */
function mostrarNotificacao(mensagem, tipo) {
  const notificacao = document.createElement("div");
  notificacao.className = `alert alert-${tipo} alert-dismissible fade show`;
  notificacao.role = "alert";
  notificacao.innerHTML = `
        ${mensagem}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fechar"></button>
    `;

  const container = document.querySelector(".container");
  container.insertBefore(notificacao, container.firstChild);

  // Remove a notificação após 5 segundos
  setTimeout(() => {
    notificacao.classList.remove("show");
    setTimeout(() => {
      notificacao.remove();
    }, 150);
  }, 5000);
}
