# AGENTS.md — Ledger

## Projeto
- Aplicativo pessoal de finanças, mobile-only e sem publicação planejada.
- Backend: Java 21, Spring Boot, Maven e PostgreSQL.
- Frontend: React Native, Expo e TypeScript.
- Priorize as convenções e a arquitetura já existentes no repositório; não introduza padrões ou dependências sem justificar.

## Regras de trabalho
- Antes de agir, inspecione apenas os arquivos necessários para a tarefa.
- Faça uma tarefa por vez e mantenha as alterações estritamente dentro do escopo solicitado.
- Explique brevemente o diagnóstico e o plano antes de mudanças que afetem vários arquivos ou camadas.
- Não altere arquivos, banco de dados, migrations, dependências ou configuração fora do escopo autorizado.
- Nunca leia, exponha ou modifique segredos, tokens ou credenciais. Preserve arquivos `.env`.
- Preserve alterações preexistentes no working tree. Não descarte, sobrescreva ou reorganize trabalho não relacionado.
- Não execute `git add`, `commit`, `checkout`, `reset`, `clean`, rebase ou push sem autorização explícita.
- Não execute migrations nem comandos destrutivos no banco sem autorização explícita.
- Não invente resultados de testes. Informe exatamente quais comandos foram executados e quais testes passaram, falharam ou não foram executados.
- Ao concluir, apresente resumo, arquivos alterados, testes executados e limitações conhecidas.

## Regras de domínio financeiro
- Use `BigDecimal` para valores monetários; não use `float` ou `double` para cálculos financeiros.
- O saldo atual da conta é a referência autoritativa.
- Compras no cartão de crédito são despesas, mas não reduzem o saldo da conta no momento da compra; o saldo é reduzido no pagamento da fatura.
- Débito e Pix reduzem o saldo da conta.
- Transações importadas do Open Finance são bloqueadas para edição manual; transações manuais podem ser editadas.
- Transferências para terceiros são despesas.
- Exclusões e cancelamentos devem respeitar o histórico/audit trail e as regras existentes para transações relacionadas a contas excluídas.
- Não altere essas regras de negócio por inferência. Se houver ambiguidade, apresente a dúvida antes de implementar.

## Qualidade e validação
- Siga a separação de responsabilidades e os padrões já adotados entre domínio, aplicação, infraestrutura e apresentação.
- Prefira mudanças pequenas e reutilização coerente; evite duplicação e abstrações desnecessárias.
- Atualize ou crie testes para o comportamento alterado.
- Execute primeiro os testes mais específicos e, quando viável, a suíte relevante.
- Se a suíte completa estiver bloqueada por falhas preexistentes ou dependências externas, identifique o bloqueio e não o atribua às mudanças sem evidência.
- Não amplie o escopo para corrigir problemas preexistentes sem autorização.
