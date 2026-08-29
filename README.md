# EliasTechMaster — Sistema de Gerenciamento de Ordens de Serviço

Sistema web completo para gestão técnica, financeira e operacional de assistências técnicas e prestadores de serviços de tecnologia. Desenvolvido com foco em produtividade, controle de caixa, geração automatizada de ordens de serviço e documentos auxiliares de prestação de serviços com integração PIX e envio por e-mail.

---

## 1. Visão Geral e Recursos

### Painel de Controle (Dashboard)
* **Indicadores em Tempo Real:** Totalizadores de ordens abertas, em andamento, concluídas e clientes cadastrados.
* **Valores Obtidos de Caixa:** Métricas financeiras consolidadas com faturamento do mês vigente, faturamento anual e receita total acumulada de ordens concluídas.
* **Feed Recente com Filtros:** Visualização ágil dos últimos chamados com filtragem dinâmica por status.
* **Ações Rápidas:** Acesso direto à abertura de ordens, cadastro de clientes, tabela de serviços e configurações.

### Gestão de Ordens de Serviço (OS)
* **Abertura Ágil:** Busca preditiva de clientes com preenchimento automático de dados cadastrais.
* **Controle de Entrada e Prazos:** Registro de data de serviço personalizada ou automática no momento da emissão.
* **Composição de Itens e Descontos:** Adição de serviços cadastrados ou itens avulsos com suporte a descontos fixos (R$) ou percentuais (%).
* **Fluxo de Status:** Acompanhamento dos estágios operacionais (Aberta, Em Andamento, Aguardando Peças, Concluída, Cancelada).
* **Histórico e Laudos:** Registro detalhado do problema informado pelo cliente e do laudo técnico do especialista.

### Documento de OS e Documento Auxiliar com PIX
* **Geração em PDF (Dompdf):** Layout profissional estruturado em duas seções principais:
  * **Página 1 (Ordem de Serviço):** Identificação completa da empresa, dados do cliente, equipamento, discriminação de serviços e valores.
  * **Página 2 (Documento Auxiliar de Prestação de Serviços):** Recibo detalhado contendo advertência explícita de ausência de validade fiscal, marca d'água protetiva e QR Code PIX padrão BR Code (EMVCo) para pagamento imediato.

### Clientes e Catálogo de Serviços
* **Gestão de Clientes:** Cadastro e edição com suporte a CPF/CNPJ, telefone/WhatsApp e e-mail.
* **Catálogo de Serviços e Peças:** Cadastro prévio de itens e tabela de preços com definição de tipo de operação (Serviço, Peça, Desconto Fixo, Desconto Percentual).

### Envio de E-mail e Fila Transacional (SMTP)
* **Configuração Dinâmica de SMTP:** Parâmetros de servidor (Host, Porta, Usuário, Senha, Criptografia) gerenciados via banco de dados sem dependência de arquivos fixos de código.
* **Fila de Disparos:** Envio de ordens finalizadas em anexo (PDF) diretamente para o e-mail do cliente com controle de status e histórico de tentativas.

### Configurações Globais
* **Dados da Empresa / NFS-e:** Cadastro de Razão Social, CNPJ, Inscrição Municipal, Código de Tributação Municipal e alíquota de ISS para composição do documento auxiliar.
* **Configurações PIX:** Definição da chave PIX, nome do titular e cidade do beneficiário.
* **Gestão de Usuários:** Controle de contas de acesso com autenticação e recuperação de credenciais.

---

## 2. Tecnologias Utilizadas

### Backend
* **PHP 8.2+:** Arquitetura orientada a serviços com APIs RESTful internas em formato JSON.
* **SQLite 3 (PDO):** Banco de dados relacional embutido (`sistema_os.db`), garantindo portabilidade sem necessidade de servidores de banco dedicados.
* **Dompdf:** Motor de renderização HTML/CSS para PDF.
* **PHPMailer:** Biblioteca para integração e envio seguro de mensagens via SMTP autenticado.
* **Endroid QR Code:** Gerador de QR Code vetorial para padrão EMVCo (PIX).

### Frontend
* **HTML5 e Vanilla JavaScript (ES6+):** Lógica desacoplada com consumo assíncrono via `fetch`.
* **CSS3 Customizado:** Design System moderno com tema sépia/café, elementos em vidro fosco (glassmorphism), tipografia Outfit e alto contraste de leitura.
* **Bootstrap 5.3 & Font Awesome 6:** Grid responsivo, modais e iconografia vetorial.

---

## 3. Estrutura do Projeto

```text
EliasTechMaster/
├── auth/
│   ├── login.html              # Interface de login e recuperação de senha
│   └── site/
│       ├── index.html          # Casca principal da aplicação com navegação lateral
│       ├── pages/              # Módulos do sistema (carregados via iframe)
│       │   ├── dashboard.html      # Painel financeiro e indicadores operacionais
│       │   ├── abrir_os.html       # Formulário de cadastro de nova OS
│       │   ├── gerenciar_os.html   # Listagem, edição e alteração de status
│       │   ├── clientes.html       # Gestão da base de clientes
│       │   ├── servicos.html       # Catálogo de serviços e peças
│       │   └── configuracoes.html  # Configurações de SMTP, PIX, Empresa e Usuários
│       ├── php/                # Endpoints e APIs do backend
│       │   ├── conexao.php         # Instância PDO SQLite
│       │   ├── os_api.php          # CRUD e cálculos de Ordens de Serviço
│       │   ├── dashboard_api.php   # Agregações financeiras e métricas
│       │   ├── clientes_api.php    # CRUD de Clientes
│       │   ├── servicos_api.php    # CRUD de Serviços/Peças
│       │   ├── gerar_pdf.php       # Renderização do PDF com Dompdf e PIX QR Code
│       │   ├── configs_api.php     # Gestão de configurações da empresa e SMTP
│       │   └── fila_email.php      # Processamento de fila de envio de e-mails
│       ├── script/             # Lógica JavaScript cliente de cada módulo
│       └── style/
│           └── css.css             # Estilização global e tokens do Design System
├── dataBase/
│   └── sistema_os.db           # Banco de dados relacional SQLite
├── vendor/                     # Dependências do Composer (Dompdf, PHPMailer, QR Code)
├── composer.json               # Declaração de dependências PHP
├── iniciar_sistema.bat         # Script automatizado de inicialização local
└── README.md                   # Documentação técnica do projeto
```

---

## 4. Requisitos e Instalação

### Pré-requisitos
* **PHP:** Versão 8.2 ou superior instalada e configurada no PATH do sistema.
* **Extensões PHP necessárias:**
  * `pdo_sqlite`
  * `sqlite3`
  * `gd`
  * `openssl`
  * `mbstring`
* **Composer:** Para gerenciamento e atualização das dependências.

### Instalação das Dependências
Na raiz do projeto, execute:
```bash
composer install
```

### Inicialização do Sistema
Para executar localmente utilizando o servidor embutido do PHP:

1. **Via arquivo em lote (Windows):**
   * Execute o arquivo `iniciar_sistema.bat` com um duplo clique. O script iniciará o servidor PHP na porta `8089` e abrirá a tela inicial no navegador padrão.

2. **Via terminal:**
   ```bash
   php -S 0.0.0.0:8089 -t .
   ```
   Em seguida, acesse no navegador:
   ```text
   http://localhost:8089/auth/login.html
   ```

---

## 5. Parâmetros de Configuração

Ao iniciar o sistema pela primeira vez, acesse o menu **Configurações** para parametrizar:
1. **Empresa & NFS-e:** Razão Social, CNPJ, Inscrição Municipal, Endereço e Código de Tributação para emissão correta do cabeçalho dos documentos.
2. **PIX:** Chave PIX, titular e cidade para geração automatizada dos QR Codes de cobrança nos recibos.
3. **E-mail / SMTP:** Servidor, porta (ex: 587 ou 465), usuário e senha de aplicativo para ativação do envio de ordens em PDF aos clientes.

---

## 6. Licença e Autoria

Projeto desenvolvido para automação técnica e controle financeiro por **Elias TechMaster**. Todos os direitos reservados.
