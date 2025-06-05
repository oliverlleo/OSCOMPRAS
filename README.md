# OSCOMPRAS

Este repositório contém uma aplicação Web para controle de compras, recebimento e separação de materiais. A tela **Gerar Separação para Produção** realiza a comparação entre uma lista original e uma nova lista enviada pelo usuário, calculando quais itens podem ser liberados, quais devem ser devolvidos ao estoque e quais requerem compra adicional.

Principais arquivos:

- `pages/separacao.html` – Interface da tela de separação com campos de seleção de cliente, tipo de projeto, lista original e upload de arquivo.
- `js/separacao.js` – Lógica de carregamento de listas, processamento do arquivo de separação, comparação de itens e geração da Correção Final.

Para executar localmente basta abrir `index.html` em um servidor estático (ex. `npx http-server`). Os dados são persistidos em Firebase Realtime Database.
