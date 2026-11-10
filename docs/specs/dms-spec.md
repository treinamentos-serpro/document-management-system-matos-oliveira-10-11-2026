# Especificação - Document Management System

## 1. Objetivo

Entregar uma aplicação web que permita a um usuário enviar, listar e baixar documentos armazenados no filesystem local, mantendo seus metadados em memória nesta fase inicial.

## 2. Escopo

### Dentro do escopo

- Upload de um documento por requisição.
- Listagem dos documentos associados à identidade configurada para a instância.
- Download de um documento pelo identificador.
- Armazenamento de arquivos em `backend/storage`, usando Multer com `diskStorage`.
- Armazenamento em memória dos metadados necessários para localizar e descrever os arquivos.
- Interface React para upload, listagem e download, consumindo a API do backend.

### Fora do escopo

- Armazenamento externo, em nuvem ou em banco de dados.
- Persistência durável dos metadados ou recuperação do índice após reinício.
- Autenticação, cadastro de usuários, gestão de sessões ou isolamento multiusuário seguro.
- Versionamento, edição, exclusão, pastas, busca avançada ou compartilhamento de documentos.
- Pré-visualização, conversão ou processamento de conteúdo.
- Antivírus ou análise avançada de conteúdo.

### Estado atual do repositório

Esta especificação descreve o comportamento pretendido, não funcionalidades já disponíveis. O seed do backend contém `GET /health`; os endpoints de documentos ainda precisam ser implementados. O frontend também permanece como seed.

## 3. Requisitos funcionais

| ID | Requisito |
| --- | --- |
| RF-01 | O sistema deve aceitar um arquivo por requisição em `multipart/form-data`, no campo `file`. |
| RF-02 | O sistema deve rejeitar requisições sem arquivo, com mais de um arquivo ou com campos obrigatórios inválidos, retornando erro legível e sem manter arquivo parcial. |
| RF-03 | O sistema deve aceitar somente os tipos permitidos pela configuração. A configuração inicial recomendada é PDF (`.pdf`, `application/pdf`), JPEG (`.jpg`/`.jpeg`, `image/jpeg`), PNG (`.png`, `image/png`) e texto simples UTF-8 (`.txt`, `text/plain`). Extensão e tipo declarado devem ser compatíveis; para formatos binários, a implementação deve validar a assinatura do conteúdo quando viável. |
| RF-04 | O sistema deve gerar um identificador UUID e um nome de armazenamento interno que não derive de caminhos fornecidos pelo cliente. O nome original deve ser preservado apenas como metadado para exibição e download seguro. |
| RF-05 | Após gravar o arquivo e registrar os metadados, o sistema deve responder com `201 Created` e os metadados públicos do documento. Se a gravação ou o registro falhar, deve remover o arquivo criado quando possível e retornar erro, sem informar sucesso. |
| RF-06 | O sistema deve listar somente documentos associados ao owner configurado para a instância, em ordem decrescente de `uploadedAt`. A listagem inicial não terá paginação. |
| RF-07 | O sistema deve permitir baixar um documento existente associado ao owner configurado. Documento inexistente ou não associado deve produzir a mesma resposta `404`, sem revelar a existência de documentos de outra identidade. |
| RF-08 | O download deve transmitir o conteúdo como anexo, com `Content-Type` registrado e `Content-Disposition` construído de forma segura a partir do nome original. |
| RF-09 | Os endpoints de documento devem retornar erros em um formato JSON consistente, exceto quando o download já estiver transmitindo o conteúdo. |

### Identidade e owner nesta fase

Para o primeiro estágio, cada instância representa um único usuário lógico identificado por uma variável de ambiente obrigatória, recomendada como `DMS_OWNER_ID`. Uploads recebem essa identidade como `owner`; listagem e download aplicam o mesmo escopo. Isso não autentica quem envia a requisição e não oferece isolamento seguro entre usuários. A instância deve ser exposta somente a um ambiente controlado. Autenticação e multiusuário real exigem uma especificação posterior.

## 4. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF-01 | Os arquivos devem ser gravados exclusivamente no filesystem local da aplicação, em `backend/storage`, por meio de Multer com `diskStorage`. Não usar armazenamento remoto ou serviço de terceiros. |
| RNF-02 | Os metadados devem permanecer em memória nesta fase. Após reinício, o índice de documentos fica indisponível, mesmo que os arquivos continuem no disco; não prometer recuperação automática. |
| RNF-03 | O limite inicial recomendado é `10 MiB` por arquivo, configurável por variável de ambiente, por exemplo `MAX_FILE_SIZE_BYTES`. Requisições acima do limite devem ser interrompidas com `413 Payload Too Large`. |
| RNF-04 | A lista inicial de tipos permitidos deve ser configurável por ambiente. A configuração deve validar extensões e tipos MIME; o MIME enviado pelo cliente, isoladamente, não deve ser considerado prova do conteúdo. |
| RNF-05 | Configurações operacionais, como `PORT`, `DMS_OWNER_ID`, limite e tipos permitidos, devem vir de variáveis de ambiente, com validação na inicialização. Segredos não devem ser incluídos no código-fonte. |
| RNF-06 | Nomes de arquivo e caminhos no disco devem ser gerados/normalizados pelo servidor. Nenhum caminho enviado pelo cliente pode ser usado diretamente para leitura ou escrita. |
| RNF-07 | A API deve usar respostas previsíveis e códigos HTTP adequados. Erros internos não devem expor caminhos locais, stack traces ou detalhes sensíveis. |
| RNF-08 | A solução inicial pressupõe uma única instância de backend: metadados em memória não são compartilhados entre processos ou réplicas. |
| RNF-09 | Timestamps devem ser emitidos em UTC no formato ISO 8601. O tamanho deve ser expresso em bytes. |

## 5. Modelo de dados (metadados do documento)

Os metadados são mantidos em memória pelo processo do backend. Campos públicos são retornados pela API; `storedName` é interno e nunca deve ser retornado ao cliente.

| Campo | Tipo | Visibilidade | Descrição |
| --- | --- | --- | --- |
| `id` | string | Público | UUID único do documento. |
| `originalName` | string | Público | Nome original sanitizado para apresentação; não é caminho de filesystem. |
| `size` | number | Público | Tamanho do arquivo em bytes. |
| `uploadedAt` | string | Público | Data e hora do upload em ISO 8601 UTC. |
| `owner` | string | Público | Identificador do usuário lógico configurado para a instância. |
| `contentType` | string | Público | Tipo MIME validado e permitido, usado no download. |
| `storedName` | string | Interno | Nome gerado pelo servidor para localizar o arquivo dentro de `backend/storage`. |

O arquivo em disco e a entrada em memória devem ser tratados como um único resultado lógico do upload. Falhas após a gravação devem acionar limpeza compensatória quando possível. Arquivos órfãos encontrados após reinício não devem ser removidos automaticamente nesta fase, pois não há metadados duráveis que permitam identificá-los com segurança.

## 6. Contratos de API

Os caminhos abaixo são os endpoints do backend. No ambiente de desenvolvimento, o frontend pode chamá-los através do prefixo `/api` do proxy do Vite, que o remove antes de encaminhar a requisição.

### Formato de erro

```json
{
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "O arquivo excede o limite permitido."
  }
}
```

`code` é estável para uso pelo cliente; `message` é apropriada para exibição. Erros inesperados devem usar mensagem genérica.

### POST /upload

- Entrada: `multipart/form-data`, com exatamente um arquivo no campo `file`.
- Sucesso: `201 Created`.
- Resposta:

```json
{
  "document": {
    "id": "uuid",
    "originalName": "relatorio.pdf",
    "size": 12345,
    "uploadedAt": "2026-11-10T12:00:00.000Z",
    "owner": "usuario-local",
    "contentType": "application/pdf"
  }
}
```

- Erros: `400 Bad Request` para arquivo ausente ou requisição inválida; `413 Payload Too Large` para limite excedido; `415 Unsupported Media Type` para tipo não permitido ou incompatível; `500 Internal Server Error` para falha de armazenamento ou registro.
- Códigos sugeridos: `FILE_REQUIRED`, `INVALID_UPLOAD`, `FILE_TOO_LARGE`, `UNSUPPORTED_FILE_TYPE`, `UPLOAD_FAILED`.

### GET /documents

- Entrada: sem corpo.
- Sucesso: `200 OK`, com documentos do owner configurado, do mais recente para o mais antigo.
- Resposta:

```json
{
  "documents": []
}
```

- Campos `storedName` e caminhos locais nunca devem aparecer na resposta.

### GET /documents/:id/download

- Entrada: UUID do documento no parâmetro `id`.
- Sucesso: `200 OK`, com o conteúdo binário como anexo; incluir `Content-Type` e `Content-Disposition` seguros. Desabilitar cache compartilhado, por exemplo com `Cache-Control: no-store`.
- Erros: `404 Not Found` para UUID inválido, documento ausente, arquivo ausente no disco ou owner não correspondente; `500 Internal Server Error` para falha de leitura não recuperável.
- Códigos sugeridos: `DOCUMENT_NOT_FOUND`, `DOWNLOAD_FAILED`.

### Compatibilidade dos erros

Erros JSON devem usar o formato comum acima e os status indicados. Se ocorrer erro depois que o stream do download começar, a conexão pode ser encerrada; não tentar substituir a resposta binária por JSON.

## 7. Decisões arquiteturais

- Backend em JavaScript/CommonJS, com dependências direcionadas por `routes -> controllers -> services -> repositories`.
- `routes` registram endpoints e middlewares; `controllers` traduzem HTTP para chamadas de serviço e formatam respostas; `services` aplicam regras de negócio; `repositories` encapsulam metadados em memória e acesso ao filesystem local.
- Multer com `diskStorage` recebe o multipart e grava no diretório local fixo. Sua configuração deve impor o limite e restringir os tipos; a validação de negócio e a consistência entre arquivo e metadados devem ser coordenadas pelo serviço.
- O repositório de metadados em memória não deve depender de Express ou Multer. O acesso aos arquivos deve ficar encapsulado e limitado ao diretório configurado para o DMS.
- Frontend React organizado por componentes, páginas e serviços; chamadas HTTP via `fetch`, usando `/api` no ambiente com proxy do Vite.
- Armazenamento estritamente local. Banco de dados, armazenamento em nuvem e outros provedores estão fora do escopo.
- A identidade configurada identifica o owner lógico, mas não substitui autenticação. Para disponibilização fora de um ambiente local/controlado, autenticação e autorização devem ser especificadas antes da exposição.
- O estado atual do seed (incluindo `GET /health`) deve ser preservado; esta especificação não afirma que os endpoints acima já existem.

## 8. Plano de execução

Etapas futuras de implementação, em alto nível. Este documento não executa essas etapas nem especifica alterações em arquivos concretos de backend ou frontend.

1. Confirmar configurações, política de tipos, limite de upload e identidade lógica do owner.
2. Implementar os contratos da API e as camadas de rota, controller, serviço e repositórios para metadados em memória e arquivos locais.
3. Implementar validação do multipart, tratamento de falhas de disco, limpeza compensatória e respostas de erro consistentes.
4. Cobrir os casos de sucesso e erro do backend com testes automatizados, incluindo limite, tipos, owner, reinício conceitual e arquivo ausente.
5. Implementar no frontend os fluxos de upload, listagem, estados de carregamento/erro e download.
6. Validar o fluxo integrado via proxy `/api`, testar os limites operacionais e documentar as limitações de identidade e perda de metadados após reinício.