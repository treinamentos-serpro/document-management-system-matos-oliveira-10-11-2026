---
description: "Revisa alterações do DMS com foco nos riscos de upload, armazenamento local e download."
name: dms-security-review
argument-hint: "Informe o diff, os arquivos ou a rota do DMS a revisar."
agent: code-reviewer
---

# Revisão de segurança do DMS

Faça uma revisão somente leitura das alterações ou do fluxo indicado. Antes de analisar, consulte as instruções do projeto e a especificação em `docs/specs/dms-spec.md`; depois leia a implementação e os testes relevantes. Não edite arquivos, não crie relatórios no workspace e não proponha mudanças fora do escopo revisado.

Selecione de três a cinco áreas de verificação conforme os arquivos e o risco do fluxo. Inclua somente áreas aplicáveis e registre brevemente qualquer área importante que ficou fora do escopo.

Priorize estes limites de confiança do DMS:

- Upload: campo multipart, contagem e tamanho de arquivos, tipos MIME e extensão, validação do conteúdo, nomes fornecidos pelo cliente, escrita local via Multer `diskStorage` e limpeza quando uma operação falha.
- Filesystem: resolução de caminhos, isolamento ao diretório `backend/storage`, nomes internos, traversal, colisões e arquivos parciais ou órfãos.
- Acesso a documentos: escopo por `owner`, diferença entre identidade configurada e autenticação real, enumeração de IDs e respostas para documentos ausentes ou não autorizados.
- Download: seleção do arquivo pelo identificador interno, `Content-Disposition`, headers, cache, erros durante leitura/stream e exposição de caminhos ou detalhes internos.
- Configuração e erros: limites e tipos permitidos por ambiente, falhas de configuração, respostas HTTP/JSON e vazamento de stack traces ou dados sensíveis.

Siga o fluxo de dados entre as camadas, em vez de avaliar cada arquivo isoladamente. Faça uma segunda leitura dos achados candidatos e só reporte problemas sustentados por caminho de execução e evidência no código. Distinga vulnerabilidade confirmada de pergunta ou risco dependente de configuração; não marque boas práticas ausentes como vulnerabilidade sem demonstrar impacto.

Apresente primeiro os achados, em ordem de severidade (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, `INFO`). Para cada achado, inclua:

- severidade e título curto;
- arquivo e linha exata;
- condição necessária e caminho que leva ao problema;
- impacto concreto;
- correção mínima recomendada e uma forma de verificar a correção.

Se não encontrar problemas confirmados, declare isso claramente e liste as áreas verificadas e eventuais limitações da revisão. Não afirme que testes, execução ou verificações dinâmicas foram feitos sem evidência.

Esta revisão adapta a abordagem de análise de risco, seleção de controles relevantes, validação de evidências e priorização do agente comunitário [SE: Security](https://github.com/github/awesome-copilot/blob/main/agents/se-security-reviewer.agent.md) ao fluxo local do DMS. Ela não importa os controles de IA/LLM do agente de origem, pois não se aplicam a este projeto.