import { useState, useCallback } from 'react';
import { searchSuppliers, searchBrands, scoutSearch, parseResults, synthesizeResults } from './api';
import './styles.css';

const EXAMPLES = [
  { cat: 'Sourcing', text: '"Knitwear mills in Portugal, GOTS certified, MOQ under 300"', img: 'https://images.unsplash.com/photo-1715176531842-7ffda4acdfa9?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' },
  { cat: 'Brands', text: '"Emerging womenswear, indie stockists, under €400 retail"', img: 'https://plus.unsplash.com/premium_photo-1673125287084-e90996bad505?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' },
  { cat: 'Materials', text: '"Deadstock silk twill, Europe, no minimum order"', img: 'https://images.unsplash.com/photo-1620763050148-af058ab2fff0?q=80&w=735&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' },
  { cat: 'Sourcing', text: '"Denim laundry, Turkey, ozone wash, EIM scoring"', img: 'https://images.unsplash.com/photo-1675176785803-bffbbb0cd2f4?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' },
  { cat: 'Materials', text: '"Organic cotton jersey 180gsm, GOTS, India"', img: 'https://plus.unsplash.com/premium_photo-1674747086512-5f73de8f7350?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' },
  { cat: 'Scout', text: '"CMT factories, Morocco, full-package, EU proximity"', img: 'https://images.unsplash.com/photo-1595798896730-9fdf2e709649?q=80&w=761&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' },
];

function SingleChipRow({ options, selected, onToggle, defaultLabel }) {
  const handleClick = (opt) => {
    if (opt === defaultLabel) {
      onToggle([defaultLabel]);
    } else {
      onToggle([opt]);
    }
  };
  return (
    <div className="chip-row">
      {options.map(opt => (
        <button key={opt} className={`chip ${selected.includes(opt) ? 'on' : ''}`} onClick={() => handleClick(opt)}>{opt}</button>
      ))}
    </div>
  );
}

function ChipRow({ options, selected, onToggle, defaultLabel }) {
  const handleClick = (opt) => {
    if (opt === defaultLabel) {
      onToggle([defaultLabel]);
    } else {
      let next = selected.filter(s => s !== defaultLabel);
      next = next.includes(opt) ? next.filter(s => s !== opt) : [...next, opt];
      if (next.length === 0) next = [defaultLabel];
      onToggle(next);
    }
  };
  return (
    <div className="chip-row">
      {options.map(opt => (
        <button key={opt} className={`chip ${selected.includes(opt) ? 'on' : ''}`} onClick={() => handleClick(opt)}>{opt}</button>
      ))}
    </div>
  );
}

function MultiChipRow({ options, selected, onToggle }) {
  const handleClick = (opt) => {
    onToggle(selected.includes(opt) ? selected.filter(s => s !== opt) : [...selected, opt]);
  };
  return (
    <div className="chip-row">
      {options.map(opt => (
        <button key={opt} className={`chip ${selected.includes(opt) ? 'on' : ''}`} onClick={() => handleClick(opt)}>{opt}</button>
      ))}
    </div>
  );
}

function ResultCard({ item, index }) {
  return (
    <div className="card" style={{ animationDelay: `${index * 0.05}s` }}>
      <div className="card-cat">{item.domain}</div>
      <div className="card-name">{item.title}</div>
      <div className="card-desc">{item.description}</div>
      <div className="card-bottom">
        <a href={item.url} target="_blank" rel="noopener noreferrer" className="card-url">{item.domain} ↗</a>
      </div>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState('supplier');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const [resultContext, setResultContext] = useState('');

  const [synthLoading, setSynthLoading] = useState(false);
  const [synthesis, setSynthesis] = useState(null);

  const [sGarment, setSGarment] = useState(['Any']);
  const [sGarmentFree, setSGarmentFree] = useState('');
  const [sRegion, setSRegion] = useState(['Any']);
  const [sMaterial, setSMaterial] = useState('');
  const [sPriceMoq, setSPriceMoq] = useState('');
  const [sCerts, setSCerts] = useState(['None required']);
  const [sRegionFree, setSRegionFree] = useState('');

  const [bCategory, setBCategory] = useState(['Womenswear']);
  const [bMarketFree, setBMarketFree] = useState('');
  const [bCategoryFree, setBCategoryFree] = useState('');
  const [bAesthetic, setBAesthetic] = useState(['Any']);
  const [bDist, setBDist] = useState(['Any']);
  const [bPrice, setBPrice] = useState(['Any']);
  const [bMarket, setBMarket] = useState(['Any']);

  const [scoutQuery, setScoutQuery] = useState('');

  const handleSearch = useCallback(async () => {
    setSynthesis(null);
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      let exaResults;

      if (tab === 'supplier') {
        exaResults = await searchSuppliers({
            garmentType: sGarment, garmentFreetext: sGarmentFree,
            regions: sRegion, regionFreetext: sRegionFree, material: sMaterial,
            priceMoq: sPriceMoq, certifications: sCerts,
          });
          setResultContext(
            [...sGarment.filter(g => g !== 'Any'), ...sRegion.filter(r => r !== 'Any'), ...sCerts.filter(c => c !== 'None required')].join(' · ') || 'All suppliers'
          );
        
      } else if (tab === 'brand') {
        exaResults = await searchBrands({
            category: bCategory, categoryFreetext: bCategoryFree,
            aesthetic: bAesthetic, priceTier: bPrice, market: bMarket,
            marketFreetext: bMarketFree, distribution: bDist,
          });
          setResultContext(
            [...bCategory.filter(c => c !== 'Any'), ...bAesthetic.filter(a => a !== 'Any'), ...bPrice.filter(p => p !== 'Any'), ...bDist.filter(d => d !== 'Any')].join(' · ') || 'All brands'
          );

      } else {
        exaResults = await scoutSearch(scoutQuery);
        setResultContext(scoutQuery.slice(0, 60) + (scoutQuery.length > 60 ? '…' : ''));
      }

      const parsed = parseResults(exaResults);
      setResults(parsed);

      // Generate synthesis
      if (parsed.length > 0) {
        setSynthLoading(true);
        const queryText = tab === 'scout' ? scoutQuery :
          tab === 'supplier' ? [...sGarment.filter(g => g !== 'Any'), ...sRegion.filter(r => r !== 'Any'), ...sCerts.filter(c => c !== 'None required')].join(' ') || 'All suppliers' :
          [...bCategory.filter(c => c !== 'Any'), ...bAesthetic.filter(a => a !== 'Any'), ...bPrice.filter(p => p !== 'Any'), ...bDist.filter(d => d !== 'Any')].join(' ') || 'All brands';
        setTimeout(() => {
          synthesizeResults(queryText, parsed, tab)
            .then(s => { setSynthesis(s); setSynthLoading(false); })
            .catch(() => { setSynthesis(null); setSynthLoading(false); });
        }, 0);
      }
    } catch (err) {
      setError(err.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  }, [tab, sGarment, sGarmentFree, sRegion, sRegionFree, sMaterial, sPriceMoq, sCerts, bCategory, bCategoryFree, bAesthetic, bPrice, bMarket, bMarketFree, bDist, scoutQuery]);

  return (
    <>
      <div className="hero-banner">
        <div className="hero-bg" style={{ backgroundImage: `url(https://images.unsplash.com/photo-1606941060194-a3cd8afef7f8?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D)` }} />
        <div className="hero-content">
          <div className="hero-eyebrow">Powered by Exa API</div>
          <h1 className="hero-title">EXA <em>for</em> FASHION</h1>
          <p className="hero-sub">Supplier & brand intelligence with semantic search</p>
        </div>
      </div>

      <div className="examples-strip">
        <div className="ex-grid">
          {EXAMPLES.map((ex, i) => (
            <div key={i} className="ex-card">
              <div className="ex-bg" style={{ backgroundImage: `url(${ex.img})` }} />
              <div className="ex-overlay">
                <div className="ex-eyebrow">{ex.cat}</div>
                <div className="ex-text">{ex.text}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="light-zone">
        <div className="inner">

          <div className="tabs">
            {['supplier', 'brand', 'scout'].map(t => (
              <button key={t} className={`tab ${tab === t ? 'active' : ''}`}
                onClick={() => { setTab(t); setResults(null); setError(null); }}>
                {t === 'supplier' ? 'Find a Supplier' : t === 'brand' ? 'Find a Brand' : 'Scout'}
              </button>
            ))}
          </div>

          {tab === 'supplier' && (
            <div className="panel active">
              <div className="form-group">
                <span className="form-label">What are you making?</span>
                <SingleChipRow options={['Any', 'Knitwear', 'Woven', 'Denim', 'Outerwear', 'Activewear', 'Accessories']} selected={sGarmentFree.trim() ? [] : sGarment} onToggle={(val) => { setSGarment(val); setSGarmentFree(''); }} defaultLabel="Any" />
                <input className="text-field" placeholder="Or type freely — swimwear, hand-crocheted tops..." style={{ marginTop: 8 }} value={sGarmentFree} onChange={e => setSGarmentFree(e.target.value)} />
              </div>
              <div className="form-group">
                <span className="form-label">Region</span>
                <ChipRow options={['Any', 'China', 'Vietnam', 'Bangladesh', 'India', 'Turkey']} selected={sRegion} onToggle={setSRegion} defaultLabel="Any" />
                <input className="text-field" placeholder="Or type a region — Sri Lanka, Peru, Ethiopia..." style={{ marginTop: 8 }} value={sRegionFree} onChange={e => setSRegionFree(e.target.value)} />
              </div>
              <div className="form-group">
                <span className="form-label">Material</span>
                <input className="text-field" placeholder="e.g. organic cotton, merino wool blend, recycled polyester..." value={sMaterial} onChange={e => setSMaterial(e.target.value)} />
              </div>
              <div className="form-group">
                <span className="form-label">Price / MOQ</span>
                <input className="text-field" placeholder="e.g. MOQ under 300 units, wholesale under $15/unit..." value={sPriceMoq} onChange={e => setSPriceMoq(e.target.value)} />
              </div>
              <div className="form-group">
                <span className="form-label">Certifications</span>
                <ChipRow options={['None required', 'GOTS', 'OEKO-TEX', 'BSCI', 'Fair Trade', 'BCI']} selected={sCerts} onToggle={setSCerts} defaultLabel="None required" />
              </div>
              <button className="search-btn" onClick={handleSearch} disabled={loading}>{loading ? 'Searching...' : 'Search Suppliers'}</button>
            </div>
          )}

          {tab === 'brand' && (
            <div className="panel active">
              <div className="form-group">
                <span className="form-label">Category</span>
              <SingleChipRow options={['Any', 'Womenswear', 'Menswear', 'Denim', 'Accessories', 'Footwear', 'Jewelry']} selected={bCategoryFree.trim() ? [] : bCategory} onToggle={(val) => { setBCategory(val); setBCategoryFree(''); }} defaultLabel="Any" />                <input className="text-field" placeholder="Or type freely — gender-fluid, sustainable homeware..." style={{ marginTop: 8 }} value={bCategoryFree} onChange={e => setBCategoryFree(e.target.value)} />
              </div>
              <div className="form-group">
                <span className="form-label">Price tier</span>
                <SingleChipRow options={['Any', 'Value', 'Contemporary', 'Premium', 'Luxury']} selected={bPrice} onToggle={setBPrice} defaultLabel="Any" />
              </div>
              <div className="form-group">
                <span className="form-label">Aesthetic</span>
                <SingleChipRow options={['Any', 'Minimalist', 'Avant-garde', 'Streetwear', 'Classic', 'Artisan', 'Romantic']} selected={bAesthetic} onToggle={setBAesthetic} defaultLabel="Any" />
              </div>
              <div className="form-group">
                <span className="form-label">Market</span>
                <ChipRow options={['Any', 'US', 'UK', 'France', 'Italy', 'South Korea']} selected={bMarket} onToggle={setBMarket} defaultLabel="Any" />
                <input className="text-field" placeholder="Or type a market — Japan, Scandinavia, Australia, Brazil..." style={{ marginTop: 8 }} value={bMarketFree} onChange={e => setBMarketFree(e.target.value)} />
              </div>
              <div className="form-group">
                <span className="form-label">Distribution</span>
                <SingleChipRow options={['Any', 'Wholesale', 'DTC', 'Both']} selected={bDist} onToggle={setBDist} defaultLabel="Any" />
              </div>
              <button className="search-btn" onClick={handleSearch} disabled={loading}>{loading ? 'Searching...' : 'Search Brands'}</button>
            </div>
          )}

          {tab === 'scout' && (
            <div className="panel active">
              <div className="form-group">
                <span className="form-label">Describe what you're looking for</span>
                <textarea className="scout-area" rows={3}
                  placeholder='Write a scouting brief in plain language — e.g. "CMT factories in Turkey or Portugal, small-batch tailored outerwear, OEKO-TEX, MOQ under 500"'
                  value={scoutQuery} onChange={e => setScoutQuery(e.target.value)} />
              </div>
              <button className="search-btn" onClick={handleSearch} disabled={loading}>{loading ? 'Searching...' : 'Scout'}</button>
            </div>
          )}

          {error && <div className="error-msg">{error}</div>}

          {loading && (
            <div className="loading-state">
              <div className="loading-dot" />
              <span>Searching the open web...</span>
            </div>
          )}

          {results && results.length > 0 && !loading && (
            <>
              <div className="rule-line" />
              <div className="results-bar">
                <span className="results-count">{results.length} results</span>
                <span className="results-context">{resultContext}</span>
              </div>
              {synthLoading && !synthesis && (
                <div className="synthesis-box loading">
                  <p>Synthesizing results...</p>
                </div>
              )}
              {synthesis && (
                <div className="synthesis-box">
                  <p>{synthesis}</p>
                </div>
              )}
              <div className="results-grid">
                {results.map((item, i) => <ResultCard key={i} item={item} index={i} />)}
              </div>
            </>
          )}

          {results && results.length === 0 && !loading && (
            <div className="empty-state">No results found. Try broadening your search.</div>
          )}

          <div className="footer">
            <div className="footer-left">Exa for Fashion</div>
            <div className="footer-right"> <a href="https://exa.ai" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>exa.ai</a></div>
          </div>
        </div>
      </div>
    </>
  );
}
