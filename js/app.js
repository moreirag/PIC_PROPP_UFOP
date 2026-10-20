// Script do Painel de IC - PROPP/UFOP com Leitura Direta de Arquivo CSV
document.addEventListener('DOMContentLoaded', () => {
  let rawData = [];
  let filteredData = [];
  let hasAnoColumn = false;
  let currentPage = 1;
  const pageSize = 100;

  // Instâncias dos gráficos Chart.js
  let chartSetorInstance = null;
  let chartAreasInstance = null;
  let chartProgramasInstance = null;
  let chartSituacaoInstance = null;

  // Elementos DOM
  const selectArea = document.getElementById('filter-area');
  const selectPrograma = document.getElementById('filter-programa');
  const selectSetor = document.getElementById('filter-setor');
  const selectSituacao = document.getElementById('filter-situacao');
  const selectAno = document.getElementById('filter-ano');
  const filterAnoGroup = document.getElementById('filter-ano-group');
  const btnReset = document.getElementById('btn-reset-filters');
  const searchInput = document.getElementById('table-search');
  const tableBody = document.getElementById('table-body');
  const tableInfo = document.getElementById('table-count-info');
  const dataSourceInfo = document.getElementById('data-source-info');
  const activeFilters = document.getElementById('active-filters');
  const pagePrev = document.getElementById('table-prev');
  const pageNext = document.getElementById('table-next');
  const pageInfo = document.getElementById('table-page-info');

  // KPIs
  const kpiTotal = document.getElementById('kpi-total');
  const kpiTotalSub = document.getElementById('kpi-total-sub');
  const kpiConcluidos = document.getElementById('kpi-concluidos');
  const kpiConcluidosTaxa = document.getElementById('kpi-concluidos-taxa');
  const kpiAtivos = document.getElementById('kpi-ativos');
  const kpiAtivosTaxa = document.getElementById('kpi-ativos-taxa');
  const kpiSetores = document.getElementById('kpi-setores');

  // Paleta Institucional UFOP
  const colors = {
    ufopPrimary: '#851c24',
    ufopSecondary: '#1a365d',
    teal: '#0d9488',
    amber: '#d97706',
    purple: '#7c3aed',
    green: '#16a34a',
    blue: '#2563eb',
    palette: [
      '#851c24', '#1a365d', '#0284c7', '#0d9488', 
      '#d97706', '#7c3aed', '#db2777', '#475569',
      '#ea580c', '#059669', '#4f46e5', '#ca8a04'
    ]
  };

  // Simplificador amigável de nomes de programas
  function padronizarPrograma(p) {
    if (!p) return 'OUTROS';
    const s = p.trim().toUpperCase();
    if (s.includes('FAPEMIG') && s.includes('INICIAÇÃO CIENTÍFICA') && !s.includes('JR')) return 'PIBIC FAPEMIG';
    if (s.includes('AÇÕES AFIRMATIVAS')) return 'PIBIC-AF (CNPq)';
    if (s.includes('DESENVOLVIMENTO TECNOLÓGICO') || s.includes('PIBITI')) return 'PIBITI (CNPq/UFOP)';
    if (s.includes('INSTITUCIONAL DE BOLSAS DE INICIAÇÃO CIENTÍFICA') && !s.includes('JUNIOR') && !s.includes('CPRM')) return 'PIBIC (CNPq/UFOP)';
    if (s.includes('INICIAÇÃO À PESQUISA')) return 'PIP (UFOP)';
    if (s.includes('VOLUNTÁRIOS DE INICIAÇÃO CIENTÍFICA') || s.includes('PIVIC')) return 'PIVIC (Voluntário)';
    if (s.includes('JUNIOR') || s.includes('JR.')) return 'ICJ / BIC-JR (Ensino Médio)';
    if (s.includes('CPRM')) return 'PIBIC CPRM/CNPq/UFOP';
    if (s.includes('ENGENHARIA')) return 'Especial Engenharia';
    return p.trim();
  }

  // Caminho do arquivo CSV (tenta caminho raiz ou data/)
  const csvFilePaths = ['dados-IC-propp.csv', 'data/dados-IC-propp.csv'];

  function carregarCSV(caminhoIdx = 0) {
    if (caminhoIdx >= csvFilePaths.length) {
      tableInfo.textContent = 'Erro: não foi possível carregar o arquivo dados-IC-propp.csv.';
      kpiTotalSub.textContent = 'Falha no arquivo CSV';
      return;
    }

    const path = csvFilePaths[caminhoIdx];
    Papa.parse(path, {
      download: true,
      header: true,
      skipEmptyLines: true,
      encoding: 'utf-8',
      complete: function(results) {
        if (results.data && results.data.length > 0) {
          processarDados(results.data, path);
        } else {
          carregarCSV(caminhoIdx + 1);
        }
      },
      error: function() {
        carregarCSV(caminhoIdx + 1);
      }
    });
  }

  // Processamento e Normalização dos Dados
  function processarDados(data, pathUsado) {
    dataSourceInfo.innerHTML = `<i class="fa-solid fa-file-csv"></i> Base: ${pathUsado} (${data.length.toLocaleString('pt-BR')} registros)`;

    // Detectar colunas
    const first = data[0];
    hasAnoColumn = 'ANO' in first || 'ano' in first;
    if (hasAnoColumn && filterAnoGroup) {
      filterAnoGroup.style.display = 'flex';
    }

    rawData = data.map(row => {
      const progOriginal = row['PROGRAMA'] || row['programa'] || '';
      return {
        programa: padronizarPrograma(progOriginal),
        programaOriginal: progOriginal.trim(),
        setor: (row['SETOR'] || row['setor'] || 'NÃO INFORMADO').trim(),
        grandeArea: (row['GRANDE ÁREA CNPQ'] || row['grande_area'] || 'NÃO INFORMADA').trim(),
        areaCnpq: (row['ÁREA CNPQ'] || row['area_cnpq'] || 'NÃO INFORMADA').trim(),
        situacao: (row['SITUAÇÃO ATUAL'] || row['situacao'] || 'OUTROS').trim(),
        curso: (row['CURSO BOLSISTA'] || row['curso'] || 'NÃO INFORMADO').trim(),
        ano: hasAnoColumn ? (row['ANO'] || row['ano'] || '').trim() : ''
      };
    }).filter(d => d.programaOriginal.length > 0);

    initFiltros(rawData);
    aplicarFiltros();
  }

  // Preenchimento dos Menus Suspensos de Filtro
  function initFiltros(data) {
    const areas = [...new Set(data.map(d => d.grandeArea))].filter(Boolean).sort();
    const programas = [...new Set(data.map(d => d.programa))].filter(Boolean).sort();
    const setores = [...new Set(data.map(d => d.setor))].filter(Boolean).sort();
    const situacoes = [...new Set(data.map(d => d.situacao))].filter(Boolean).sort();

    popularSelect(selectArea, areas);
    popularSelect(selectPrograma, programas);
    popularSelect(selectSetor, setores);
    popularSelect(selectSituacao, situacoes);

    if (hasAnoColumn) {
      const anos = [...new Set(data.map(d => d.ano))].filter(Boolean).sort((a,b) => b - a);
      popularSelect(selectAno, anos);
      selectAno.addEventListener('change', aplicarFiltros);
    }

    selectArea.addEventListener('change', aplicarFiltros);
    selectPrograma.addEventListener('change', aplicarFiltros);
    selectSetor.addEventListener('change', aplicarFiltros);
    selectSituacao.addEventListener('change', aplicarFiltros);
    searchInput.addEventListener('input', () => { currentPage = 1; renderTabela(filtrarTabelaPorBusca()); });
    pagePrev.addEventListener('click', () => { if (currentPage > 1) { currentPage--; renderTabela(filtrarTabelaPorBusca()); } });
    pageNext.addEventListener('click', () => { const pages = Math.max(1, Math.ceil(filtrarTabelaPorBusca().length / pageSize)); if (currentPage < pages) { currentPage++; renderTabela(filtrarTabelaPorBusca()); } });
    activeFilters.addEventListener('click', event => {
      const button = event.target.closest('button[data-filter-id]');
      if (!button) return;
      const select = document.getElementById(button.dataset.filterId);
      if (select) { select.value = 'ALL'; aplicarFiltros(); }
    });

    btnReset.addEventListener('click', () => {
      selectArea.value = 'ALL';
      selectPrograma.value = 'ALL';
      selectSetor.value = 'ALL';
      selectSituacao.value = 'ALL';
      if (hasAnoColumn && selectAno) selectAno.value = 'ALL';
      searchInput.value = '';
      aplicarFiltros();
    });
  }

  function popularSelect(selectElem, itens) {
    itens.forEach(item => {
      const opt = document.createElement('option');
      opt.value = item;
      opt.textContent = item;
      selectElem.appendChild(opt);
    });
  }

  // Filtragem Dinâmica
  function aplicarFiltros() {
    const areaSel = selectArea.value;
    const progSel = selectPrograma.value;
    const setorSel = selectSetor.value;
    const sitSel = selectSituacao.value;
    const anoSel = hasAnoColumn && selectAno ? selectAno.value : 'ALL';

    filteredData = rawData.filter(d => {
      const matchArea = (areaSel === 'ALL' || d.grandeArea === areaSel);
      const matchProg = (progSel === 'ALL' || d.programa === progSel);
      const matchSetor = (setorSel === 'ALL' || d.setor === setorSel);
      const matchSit = (sitSel === 'ALL' || d.situacao === sitSel);
      const matchAno = (!hasAnoColumn || anoSel === 'ALL' || d.ano === anoSel);
      return matchArea && matchProg && matchSetor && matchSit && matchAno;
    });

    currentPage = 1;
    atualizarFiltrosAtivos();
    atualizarKPIs(filteredData);
    atualizarGraficos(filteredData);
    renderTabela(filtrarTabelaPorBusca());
  }


  // Resumo interativo dos filtros e navegação por cliques nos gráficos.
  function atualizarFiltrosAtivos() {
    activeFilters.replaceChildren();
    const label = document.createElement('span');
    label.className = 'active-filters-label';
    label.textContent = 'Filtros ativos:';
    activeFilters.appendChild(label);
    const selections = [
      ['filter-area', selectArea, 'Área'],
      ['filter-programa', selectPrograma, 'Programa'],
      ['filter-setor', selectSetor, 'Setor'],
      ['filter-situacao', selectSituacao, 'Situação'],
      ['filter-ano', hasAnoColumn ? selectAno : null, 'Ano']
    ].filter(([,select]) => select && select.value !== 'ALL');
    if (!selections.length) {
      const empty = document.createElement('span');
      empty.className = 'no-active-filters';
      empty.textContent = 'Nenhum — exibindo todos os registros';
      activeFilters.appendChild(empty);
    }
    selections.forEach(([id, select, title]) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'filter-chip';
      chip.dataset.filterId = id;
      chip.textContent = title + ': ' + select.value + ' ×';
      chip.setAttribute('aria-label', 'Remover filtro ' + title + ': ' + select.value);
      activeFilters.appendChild(chip);
    });
    activeFilters.setAttribute('aria-label', selections.length + ' filtros ativos');
  }

  function ativarFiltroGrafico(chart, event, select, labels) {
    const points = chart.getElementsAtEventForMode(event, 'nearest', { intersect: true }, true);
    if (!points.length) return;
    const label = labels[points[0].index];
    if (!label || !Array.from(select.options).some(opt => opt.value === label)) return;
    select.value = select.value === label ? 'ALL' : label;
    aplicarFiltros();
  }

  function chartClick(select, labels) {
    return (event, _elements, chart) => ativarFiltroGrafico(chart, event, select, labels);
  }

  // Atualização dos Indicadores de Topo
  function atualizarKPIs(data) {
    const total = data.length;
    const concluidos = data.filter(d => d.situacao.toUpperCase() === 'CONCLUÍDO').length;
    const ativos = data.filter(d => d.situacao.toUpperCase() === 'ATIVO').length;
    const setoresUnicos = new Set(data.map(d => d.setor)).size;

    kpiTotal.textContent = total.toLocaleString('pt-BR');
    kpiTotalSub.textContent = `Registros no filtro ativo`;

    kpiConcluidos.textContent = concluidos.toLocaleString('pt-BR');
    const taxaConcluido = total > 0 ? ((concluidos / total) * 100).toFixed(1) : '0';
    kpiConcluidosTaxa.textContent = `${taxaConcluido}% do recorte`;

    kpiAtivos.textContent = ativos.toLocaleString('pt-BR');
    const taxaAtivo = total > 0 ? ((ativos / total) * 100).toFixed(1) : '0';
    kpiAtivosTaxa.textContent = `${taxaAtivo}% em andamento`;

    kpiSetores.textContent = setoresUnicos;
  }

  // Atualização dos Gráficos
  function atualizarGraficos(data) {
    renderChartSetor(data);
    renderChartAreas(data);
    renderChartProgramas(data);
    renderChartSituacao(data);
  }

  // 1. Gráfico por Setor / Departamento (Top 12)
  function renderChartSetor(data) {
    const setorMap = {};
    data.forEach(d => {
      setorMap[d.setor] = (setorMap[d.setor] || 0) + 1;
    });

    const topEntries = Object.entries(setorMap)
      .sort((a,b) => b[1] - a[1])
      .slice(0, 12);

    const labels = topEntries.map(e => e[0]);
    const values = topEntries.map(e => e[1]);

    if (chartSetorInstance) chartSetorInstance.destroy();

    const ctx = document.getElementById('chartSetor').getContext('2d');
    chartSetorInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Total de Bolsas/Projetos',
          data: values,
          backgroundColor: colors.ufopPrimary,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        onClick: chartClick(selectSetor, labels),
        onHover: (event, elements, chart) => { chart.canvas.style.cursor = elements.length ? 'pointer' : 'default'; },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` Projetos: ${ctx.parsed.y.toLocaleString('pt-BR')}`
            }
          }
        },
        scales: {
          y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
          x: { grid: { display: false } }
        }
      }
    });
  }

  // 2. Gráfico por Grande Área CNPq (Donut)
  function renderChartAreas(data) {
    const areaMap = {};
    data.forEach(d => {
      areaMap[d.grandeArea] = (areaMap[d.grandeArea] || 0) + 1;
    });

    const entries = Object.entries(areaMap).sort((a,b) => b[1] - a[1]);
    const labels = entries.map(e => e[0]);
    const values = entries.map(e => e[1]);

    if (chartAreasInstance) chartAreasInstance.destroy();

    const ctx = document.getElementById('chartAreas').getContext('2d');
    chartAreasInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: values,
          backgroundColor: colors.palette,
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        onClick: chartClick(selectArea, labels),
        onHover: (event, elements, chart) => { chart.canvas.style.cursor = elements.length ? 'pointer' : 'default'; },
        plugins: {
          legend: {
            position: 'right',
            labels: { boxWidth: 12, font: { size: 11 } }
          }
        },
        cutout: '62%'
      }
    });
  }

  // 3. Gráfico por Programa (Barra Horizontal)
  function renderChartProgramas(data) {
    const progMap = {};
    data.forEach(d => {
      progMap[d.programa] = (progMap[d.programa] || 0) + 1;
    });

    const entries = Object.entries(progMap).sort((a,b) => b[1] - a[1]);
    const labels = entries.map(e => e[0]);
    const values = entries.map(e => e[1]);

    if (chartProgramasInstance) chartProgramasInstance.destroy();

    const ctx = document.getElementById('chartProgramas').getContext('2d');
    chartProgramasInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Projetos',
          data: values,
          backgroundColor: colors.ufopSecondary,
          borderRadius: 4
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        onClick: chartClick(selectPrograma, labels),
        onHover: (event, elements, chart) => { chart.canvas.style.cursor = elements.length ? 'pointer' : 'default'; },
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { beginAtZero: true, grid: { color: '#f1f5f9' } },
          y: { 
            grid: { display: false },
            ticks: {
              callback: function(val) {
                const label = this.getLabelForValue(val);
                return label.length > 20 ? label.substring(0, 18) + '...' : label;
              },
              font: { size: 10 }
            }
          }
        }
      }
    });
  }

  // 4. Gráfico por Situação Atual
  function renderChartSituacao(data) {
    const sitMap = {};
    data.forEach(d => {
      sitMap[d.situacao] = (sitMap[d.situacao] || 0) + 1;
    });

    const entries = Object.entries(sitMap).sort((a,b) => b[1] - a[1]);
    const labels = entries.map(e => e[0]);
    const values = entries.map(e => e[1]);

    if (chartSituacaoInstance) chartSituacaoInstance.destroy();

    const ctx = document.getElementById('chartSituacao').getContext('2d');
    chartSituacaoInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Quantidade',
          data: values,
          backgroundColor: labels.map(s => {
            if (s === 'CONCLUÍDO') return '#16a34a';
            if (s === 'ATIVO') return '#2563eb';
            if (s === 'CANCELADO') return '#dc2626';
            return '#64748b';
          }),
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        onClick: chartClick(selectSituacao, labels),
        onHover: (event, elements, chart) => { chart.canvas.style.cursor = elements.length ? 'pointer' : 'default'; },
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
          x: { grid: { display: false } }
        }
      }
    });
  }

  // Busca Textual na Tabela
  function filtrarTabelaPorBusca() {
    const q = searchInput.value.trim().toLowerCase();
    if (!q) return filteredData;
    return filteredData.filter(d => 
      d.programa.toLowerCase().includes(q) ||
      d.setor.toLowerCase().includes(q) ||
      d.grandeArea.toLowerCase().includes(q) ||
      d.areaCnpq.toLowerCase().includes(q) ||
      d.curso.toLowerCase().includes(q) ||
      d.situacao.toLowerCase().includes(q)
    );
  }

  // Renderização da Tabela
  function renderTabela(data) {
    tableBody.innerHTML = '';
    const pages = Math.max(1, Math.ceil(data.length / pageSize));
    currentPage = Math.min(currentPage, pages);
    const start = (currentPage - 1) * pageSize;
    const slice = data.slice(start, start + pageSize);
    pagePrev.disabled = currentPage <= 1;
    pageNext.disabled = currentPage >= pages;
    pageInfo.textContent = `Página ${currentPage} de ${pages}`;

    slice.forEach(row => {
      const tr = document.createElement('tr');

      let badgeClass = 'status-outro';
      if (row.situacao === 'CONCLUÍDO') badgeClass = 'status-concluido';
      else if (row.situacao === 'ATIVO') badgeClass = 'status-ativo';
      else if (row.situacao === 'CANCELADO') badgeClass = 'status-cancelado';

      [row.programa, row.setor, row.grandeArea, row.areaCnpq, row.situacao, row.curso].forEach((value, index) => {
        const td = document.createElement('td');
        if (index === 0 || index === 1 || index === 4) {
          const span = document.createElement(index === 0 ? 'strong' : 'span');
          if (index === 1) span.className = 'badge-dept';
          if (index === 4) span.className = 'badge-status ' + badgeClass;
          span.textContent = value;
          td.appendChild(span);
        } else {
          td.textContent = value;
        }
        if (index === 5) { td.className = 'text-curso'; td.title = value; }
        tr.appendChild(td);
      });
      tableBody.appendChild(tr);
    });

    tableInfo.textContent = `Exibindo ${data.length ? start + 1 : 0}–${start + slice.length} de ${data.length.toLocaleString('pt-BR')} registros filtrados (Total da base: ${rawData.length.toLocaleString('pt-BR')})`;
  }

  // Iniciar leitura do CSV
  carregarCSV(0);
});
