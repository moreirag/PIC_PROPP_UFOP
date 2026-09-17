// Script do Painel de IC - PROPP/UFOP com Leitura Direta de Arquivo CSV
document.addEventListener('DOMContentLoaded', () => {
  let rawData = [];
  let filteredData = [];
  let hasAnoColumn = false;

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
    searchInput.addEventListener('input', () => renderTabela(filtrarTabelaPorBusca()));

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

    atualizarKPIs(filteredData);
    atualizarGraficos(filteredData);
    renderTabela(filtrarTabelaPorBusca());
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
    const slice = data.slice(0, 100);

    slice.forEach(row => {
      const tr = document.createElement('tr');

      let badgeClass = 'status-outro';
      if (row.situacao === 'CONCLUÍDO') badgeClass = 'status-concluido';
      else if (row.situacao === 'ATIVO') badgeClass = 'status-ativo';
      else if (row.situacao === 'CANCELADO') badgeClass = 'status-cancelado';

      tr.innerHTML = `
        <td><strong>${row.programa}</strong></td>
        <td><span class="badge-dept">${row.setor}</span></td>
        <td>${row.grandeArea}</td>
        <td>${row.areaCnpq}</td>
        <td><span class="badge-status ${badgeClass}">${row.situacao}</span></td>
        <td class="text-curso" title="${row.curso}">${row.curso}</td>
      `;
      tableBody.appendChild(tr);
    });

    tableInfo.textContent = `Exibindo ${slice.length} de ${data.length.toLocaleString('pt-BR')} registros filtrados (Total da base: ${rawData.length.toLocaleString('pt-BR')})`;
  }

  // Iniciar leitura do CSV
  carregarCSV(0);
});
