
# Painel de Iniciação Científica - PROPP / UFOP (Leitura Direta de CSV)

Painel interativo e responsivo desenvolvido para a seção de Iniciação Científica (IC) da **Pró-Reitoria de Pesquisa e Pós-Graduação (PROPP/UFOP)**, inspirado no layout analítico do Power BI da UFOP.

## 📊 Principais Novidades (Versão CSV)

- **Leitura Direta do Arquivo CSV**: Carrega e processa `dados-IC-propp.csv` em milissegundos via [PapaParse](https://www.papaparse.com/), sem dependência de backend em tempo de execução.
- **Detecção Inteligente de Metadados**:
  - **Setores / Departamentos UFOP**: Indicador e gráfico dos departamentos com maior engajamento em IC (ex: DEQUI, DECBI, DEFAR, DECOM, DELET, etc.).
  - **Situação Atual**: Métricas de bolsas *Concluídas* e *Ativas* (em andamento).
  - **Grandes Áreas CNPq & Modalidades**: PIBIC, PIBITI, PIP, PIVIC, PIBIC-AF, FAPEMIG.
  - **Compatibilidade Retroativa com Ano**: Se a base contiver coluna `ANO`, o seletor temporal é ativado automaticamente.
- **Filtros Dinâmicos Cruzados (Estilo Power BI)**:
  - Grande Área CNPq
  - Programa de Iniciação Científica
  - Setor / Departamento Acadêmico
  - Situação do Projeto
- **Tabela com Busca Instantânea**: Pesquise em tempo real por nome de curso, setor, área ou modalidade.

---

## 📁 Estrutura do Projeto

```text
painel-ic-ufop/
├── index.html                 # Página e seção HTML para o portal da PROPP
├── dados-IC-propp.csv         # Base de dados em CSV (8.333 registros)
├── css/
│   └── style.css              # Design System institucional PROPP/UFOP
├── js/
│   └── app.js                 # Leitura com PapaParse, filtros e gráficos Chart.js
├── data/
│   └── dados-IC-propp.csv     # Cópia de segurança na pasta de dados
├── atualizar_dados.py         # Utilitário Python auxiliar
├── .gitignore
└── README.md
```

---

## 🚀 Como Executar

Por usar requisições assíncronas no navegador (`fetch`/`PapaParse`), inicie um servidor local:

```bash
cd painel-ic-ufop
python -m http.server 8000
```
Acesse no navegador: [http://localhost:8000](http://localhost:8000)

---

## 🌐 Como Atualizar a Base de Dados no Futuro

Basta exportar a nova versão da planilha em formato `.csv` (separado por vírgulas e codificação UTF-8) com o nome `dados-IC-propp.csv` e substituí-la na pasta do projeto. O painel web refletirá automaticamente os novos dados a cada recarregamento da página.

# PIC_PROPP_UFOP
Programas de Iniciação Científica e Tecnológica - Panorama Institucional de Projetos, Departamentos e Bolsistas

