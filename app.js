/**
 * AJ CAPITAL - APPLICATION CONTROLLER & REAL-TIME INVENTORY ENGINE
 * Handles JSON data fetching, dynamic card rendering, WhatsApp dispatch,
 * financial comparative calculations, and 3D mode coordination.
 */

// Global App State
const state = {
  cartas: [],
  filteredCartas: [],
  filters: {
    segmento: 'Todos', // 'Todos' | 'Imóvel' | 'Automóvel'
    maxCredito: 5000000,
    administradora: 'Todas',
    ordenacao: 'maior_credito',
    searchQuery: ''
  },
  whatsAppPhone: '5554981348292'
};

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Initialize 3D WebGL Scene
  if (window.AJCapital3DScene) {
    window.scene3D = new AJCapital3DScene('hero-canvas-container');
  }

  // 2. Setup Mode Switchers (Hero & Vitrine Sync)
  setupModeSwitchers();

  // 3. Load Cartas Contempladas Data
  await loadCartasData();

  // 4. Setup Filters & Events
  setupFilterListeners();

  // 5. Setup Financial Calculator
  setupCalculator();

  // 6. Setup FAQ Accordion
  setupFAQ();
});

/**
 * Loads cartas_ativas.json dynamically
 */
async function loadCartasData() {
  const grid = document.getElementById('cards-grid');
  try {
    const response = await fetch('cartas_ativas.json');
    if (!response.ok) throw new Error('Falha ao carregar dados');
    state.cartas = await response.json();
    applyFilters();
  } catch (err) {
    console.warn('Erro ao carregar via fetch, usando fallback embutido:', err);
    // Fallback data in case opened directly as file:// protocol
    state.cartas = getFallbackCartas();
    applyFilters();
  }
}

/**
 * Filter Engine
 */
function applyFilters() {
  let result = [...state.cartas];

  // 1. Segmento
  if (state.filters.segmento !== 'Todos') {
    result = result.filter(c => c.segmento.toLowerCase() === state.filters.segmento.toLowerCase());
  }

  // 2. Max Crédito
  result = result.filter(c => c.credito_valor <= state.filters.maxCredito);

  // 3. Administradora
  if (state.filters.administradora !== 'Todas') {
    result = result.filter(c => c.administradora === state.filters.administradora);
  }

  // 4. Search Query
  if (state.filters.searchQuery.trim() !== '') {
    const q = state.filters.searchQuery.toLowerCase();
    result = result.filter(c => 
      c.administradora.toLowerCase().includes(q) ||
      c.titulo.toLowerCase().includes(q) ||
      c.tag.toLowerCase().includes(q) ||
      c.credito_formatado.includes(q)
    );
  }

  // 5. Ordenação
  if (state.filters.ordenacao === 'maior_credito') {
    result.sort((a, b) => b.credito_valor - a.credito_valor);
  } else if (state.filters.ordenacao === 'menor_entrada') {
    result.sort((a, b) => a.entrada_valor - b.entrada_valor);
  } else if (state.filters.ordenacao === 'menor_parcela') {
    result.sort((a, b) => a.parcela_valor - b.parcela_valor);
  } else if (state.filters.ordenacao === 'menor_prazo') {
    result.sort((a, b) => a.prazo_meses - b.prazo_meses);
  }

  state.filteredCartas = result;
  renderCards(result);
}

/**
 * Renders opportunity cards into HTML
 */
function renderCards(cartas) {
  const grid = document.getElementById('cards-grid');
  const countBadge = document.getElementById('results-count');
  
  if (countBadge) {
    countBadge.textContent = `${cartas.length} cartas disponíveis`;
  }

  if (!grid) return;

  if (cartas.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--gold-border);">
        <div style="font-size: 40px; margin-bottom: 12px;">🔍</div>
        <h3 style="font-size: 20px; color: #FFF; margin-bottom: 8px;">Nenhuma carta encontrada com esses filtros</h3>
        <p style="color: var(--text-muted); font-size: 14px; margin-bottom: 20px;">Tente aumentar a faixa de crédito ou selecionar outra administradora.</p>
        <button onclick="resetFilters()" class="btn-outline">Limpar Filtros</button>
      </div>
    `;
    return;
  }

  grid.innerHTML = cartas.map(carta => {
    const isImovel = carta.segmento === 'Imóvel';
    const icon = isImovel ? '🏡' : '🏎️';
    const badgeClass = (carta.categoria === 'Exclusiva' || carta.categoria === 'Alto Padrão') ? 'badge-exclusiva' : 'badge-oferta';
    
    // Detailed WhatsApp pre-formatted URL with Administradora, Segment, Credit, Entry & Parcels
    const waText = encodeURIComponent(
      `Olá! Tenho interesse na Carta Contemplada da Administradora: ${carta.administradora} (${carta.segmento})\n` +
      `• Crédito: ${carta.credito_formatado}\n` +
      `• Entrada: ${carta.entrada_formatada}\n` +
      `• Saldo: ${carta.parcelas}\n` +
      `Gostaria de verificar a disponibilidade e receber a documentação para reserva!`
    );
    const waUrl = `https://wa.me/${state.whatsAppPhone}?text=${waText}`;

    return `
      <div class="opp-card">
        <div>
          <div class="card-top">
            <span class="admin-badge">🏛️ ${carta.administradora}</span>
            <span class="opp-badge ${badgeClass}">${carta.categoria}</span>
          </div>

          <h3 class="card-title">${icon} ${carta.titulo}</h3>
          <p class="card-tag">${carta.tag}</p>

          <div class="financial-box">
            <div class="fin-item">
              <span class="fin-label">Administradora:</span>
              <span class="fin-val-admin" style="font-weight: 700; color: #E2E8F0;">${carta.administradora}</span>
            </div>
            <div class="fin-item">
              <span class="fin-label">Valor do Crédito:</span>
              <span class="fin-val-credit">${carta.credito_formatado}</span>
            </div>
            <div class="fin-item">
              <span class="fin-label">Valor da Entrada:</span>
              <span class="fin-val-entry">${carta.entrada_formatada}</span>
            </div>
            <div class="fin-item">
              <span class="fin-label">Saldo Devedor:</span>
              <span class="fin-val-parcels">${carta.parcelas}</span>
            </div>
          </div>

          <div class="card-meta-tags">
            <span class="meta-pill">⚡ ${carta.transferencia}</span>
            <span class="meta-pill">📅 Venc: ${carta.vencimento}</span>
            <span class="meta-pill">🛡️ Auditada</span>
          </div>
        </div>

        <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="btn-card-reserve">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/></svg>
          Reservar com Administradora
        </a>
      </div>
    `;
  }).join('');
}

/**
 * Setup Interactive 3D Mode Switcher
 */
function setupModeSwitchers() {
  const modeImovelBtn = document.getElementById('mode-imovel-btn');
  const modeAutoBtn = document.getElementById('mode-auto-btn');
  const mansionSlide = document.getElementById('hero-img-mansion');
  const autoSlide = document.getElementById('hero-img-auto');

  if (modeImovelBtn && modeAutoBtn) {
    modeImovelBtn.addEventListener('click', () => {
      modeImovelBtn.classList.add('active');
      modeAutoBtn.classList.remove('active');
      if (mansionSlide && autoSlide) {
        mansionSlide.classList.add('active');
        autoSlide.classList.remove('active');
      }
      if (window.scene3D) window.scene3D.setMode('imovel');
      
      // Sync vitrine filter
      setSegmentFilter('Imóvel');
    });

    modeAutoBtn.addEventListener('click', () => {
      modeAutoBtn.classList.add('active');
      modeImovelBtn.classList.remove('active');
      if (mansionSlide && autoSlide) {
        autoSlide.classList.add('active');
        mansionSlide.classList.remove('active');
      }
      if (window.scene3D) window.scene3D.setMode('automovel');

      // Sync vitrine filter
      setSegmentFilter('Automóvel');
    });
  }
}

/**
 * Segment Filter Helper
 */
function setSegmentFilter(segmento) {
  state.filters.segmento = segmento;
  
  // Update Pills UI
  document.querySelectorAll('.pill-btn').forEach(btn => {
    if (btn.dataset.segment === segmento) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Sync Hero image slides
  const mansionSlide = document.getElementById('hero-img-mansion');
  const autoSlide = document.getElementById('hero-img-auto');
  if (segmento === 'Imóvel' && mansionSlide && autoSlide) {
    mansionSlide.classList.add('active');
    autoSlide.classList.remove('active');
  } else if (segmento === 'Automóvel' && mansionSlide && autoSlide) {
    autoSlide.classList.add('active');
    mansionSlide.classList.remove('active');
  }

  applyFilters();
}

/**
 * Filter Listeners
 */
function setupFilterListeners() {
  // Segment Pills
  document.querySelectorAll('.pill-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const seg = e.target.dataset.segment;
      setSegmentFilter(seg);
      
      // Also update 3D scene & Hero buttons
      if (seg === 'Imóvel') {
        document.getElementById('mode-imovel-btn')?.classList.add('active');
        document.getElementById('mode-auto-btn')?.classList.remove('active');
        if (window.scene3D) window.scene3D.setMode('imovel');
      } else if (seg === 'Automóvel') {
        document.getElementById('mode-auto-btn')?.classList.add('active');
        document.getElementById('mode-imovel-btn')?.classList.remove('active');
        if (window.scene3D) window.scene3D.setMode('automovel');
      }
    });
  });

  // Credit Range Slider
  const creditSlider = document.getElementById('credit-slider');
  const creditDisplay = document.getElementById('credit-slider-val');
  if (creditSlider && creditDisplay) {
    creditSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      state.filters.maxCredito = val;
      creditDisplay.textContent = `Até R$ ${val.toLocaleString('pt-BR')},00`;
      applyFilters();
    });
  }

  // Admin Select
  const adminSelect = document.getElementById('admin-select');
  if (adminSelect) {
    adminSelect.addEventListener('change', (e) => {
      state.filters.administradora = e.target.value;
      applyFilters();
    });
  }

  // Order Select
  const orderSelect = document.getElementById('order-select');
  if (orderSelect) {
    orderSelect.addEventListener('change', (e) => {
      state.filters.ordenacao = e.target.value;
      applyFilters();
    });
  }

  // Search Input
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.filters.searchQuery = e.target.value;
      applyFilters();
    });
  }
}

/**
 * Reset Filters
 */
window.resetFilters = function() {
  state.filters.segmento = 'Todos';
  state.filters.maxCredito = 5000000;
  state.filters.administradora = 'Todas';
  state.filters.ordenacao = 'maior_credito';
  state.filters.searchQuery = '';

  const creditSlider = document.getElementById('credit-slider');
  const creditDisplay = document.getElementById('credit-slider-val');
  const adminSelect = document.getElementById('admin-select');
  const orderSelect = document.getElementById('order-select');
  const searchInput = document.getElementById('search-input');

  if (creditSlider) creditSlider.value = 5000000;
  if (creditDisplay) creditDisplay.textContent = 'Até R$ 5.000.000,00';
  if (adminSelect) adminSelect.value = 'Todas';
  if (orderSelect) orderSelect.value = 'maior_credito';
  if (searchInput) searchInput.value = '';

  document.querySelectorAll('.pill-btn').forEach(btn => {
    if (btn.dataset.segment === 'Todos') btn.classList.add('active');
    else btn.classList.remove('active');
  });

  applyFilters();
};

/**
 * Financial Comparative Calculator Engine
 */
function setupCalculator() {
  const calcCredit = document.getElementById('calc-credit');
  const calcCreditVal = document.getElementById('calc-credit-display');
  const calcYears = document.getElementById('calc-years');

  const outFinancTotal = document.getElementById('calc-financ-total');
  const outFinancJuros = document.getElementById('calc-financ-juros');
  const outConsorcioTotal = document.getElementById('calc-consorcio-total');
  const outEconomia = document.getElementById('calc-savings-total');

  function calculate() {
    const credit = parseFloat(calcCredit.value);
    const years = parseInt(calcYears.value, 10);

    if (calcCreditVal) {
      calcCreditVal.textContent = `R$ ${credit.toLocaleString('pt-BR')},00`;
    }

    // Financiamento Bancário (Estimativa CET 10.8% a.a. SAC/Price)
    // Coeficiente multiplicador médio: 1.8x a 2.1x do valor financiado
    const jurosMultiplier = 1.0 + (years * 0.085);
    const totalFinanciamento = credit * jurosMultiplier;
    const jurosPagos = totalFinanciamento - credit;

    // Consórcio Contemplado AJ Capital (Entrada com ágio moderado + Saldo sem juros compostos)
    // Multiplicador médio real de consórcio: ~1.22x a 1.28x
    const totalConsorcio = credit * 1.24;
    const economia = totalFinanciamento - totalConsorcio;

    if (outFinancTotal) outFinancTotal.textContent = `R$ ${Math.round(totalFinanciamento).toLocaleString('pt-BR')},00`;
    if (outFinancJuros) outFinancJuros.textContent = `+ R$ ${Math.round(jurosPagos).toLocaleString('pt-BR')},00 em juros`;
    if (outConsorcioTotal) outConsorcioTotal.textContent = `R$ ${Math.round(totalConsorcio).toLocaleString('pt-BR')},00`;
    if (outEconomia) outEconomia.textContent = `R$ ${Math.round(economia).toLocaleString('pt-BR')},00`;
  }

  if (calcCredit) calcCredit.addEventListener('input', calculate);
  if (calcYears) calcYears.addEventListener('change', calculate);

  calculate();
}

/**
 * FAQ Accordion
 */
function setupFAQ() {
  document.querySelectorAll('.faq-item').forEach(item => {
    const question = item.querySelector('.faq-question');
    if (question) {
      question.addEventListener('click', () => {
        const isActive = item.classList.contains('active');
        document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active'));
        if (!isActive) {
          item.classList.add('active');
        }
      });
    }
  });
}

/**
 * Fallback Data
 */
function getFallbackCartas() {
  return [
    {
      "id": "AJ-IMOV-01",
      "administradora": "HS Consórcios",
      "segmento": "Imóvel",
      "titulo": "Crédito Imobiliário Mansão & Terreno",
      "credito_valor": 1250000,
      "credito_formatado": "R$ 1.250.000,00",
      "entrada_valor": 380000,
      "entrada_formatada": "R$ 380.000,00",
      "parcelas": "142x de R$ 8.920,00",
      "parcela_valor": 8920,
      "prazo_meses": 142,
      "transferencia": "Transferência Imediata",
      "vencimento": "Dia 15",
      "categoria": "Alto Padrão",
      "destaque": true,
      "tag": "Mansões & Lotes"
    },
    {
      "id": "AJ-IMOV-02",
      "administradora": "Porto Seguro",
      "segmento": "Imóvel",
      "titulo": "Crédito para Imóvel Comercial / Residencial",
      "credito_valor": 800000,
      "credito_formatado": "R$ 800.000,00",
      "entrada_valor": 265000,
      "entrada_formatada": "R$ 265.000,00",
      "parcelas": "118x de R$ 6.150,00",
      "parcela_valor": 6150,
      "prazo_meses": 118,
      "transferencia": "Transferência Imediata",
      "vencimento": "Dia 10",
      "categoria": "Oportunidade",
      "destaque": false,
      "tag": "Investimento Seguro"
    },
    {
      "id": "AJ-AUTO-01",
      "administradora": "Rodobens",
      "segmento": "Automóvel",
      "titulo": "Supercarro / SUV Premium Exclusivo",
      "credito_valor": 450000,
      "credito_formatado": "R$ 450.000,00",
      "entrada_valor": 155000,
      "entrada_formatada": "R$ 155.000,00",
      "parcelas": "68x de R$ 5.480,00",
      "parcela_valor": 5480,
      "prazo_meses": 68,
      "transferencia": "Transferência Imediata",
      "vencimento": "Dia 12",
      "categoria": "Super Oferta",
      "destaque": true,
      "tag": "Porsche / BMW / Land Rover"
    }
  ];
}
