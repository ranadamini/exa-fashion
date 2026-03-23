const API_BASE = import.meta.env.DEV ? 'https://api.exa.ai' : '/api';

function getApiKey() {
  const key = import.meta.env.VITE_EXA_API_KEY;
  if (!key) throw new Error('Missing VITE_EXA_API_KEY in .env');
  return key;
}

function composeSupplierQuery({ garmentType, garmentFreetext, regions, regionFreetext, material, priceMoq, certifications }) {
  const parts = [];
  if (garmentFreetext?.trim()) {
    parts.push(garmentFreetext.trim());
    parts.push('manufacturer supplier factory');
  } else if (garmentType?.length) {
    parts.push(garmentType.join(' ') + ' manufacturer supplier factory');
  }
  if (regions?.length && !regions.includes('Any')) {
    parts.push(regions.join(' or '));
  }
  if (regionFreetext?.trim()) {
    parts.push(regionFreetext.trim());
  }
  if (material?.trim()) parts.push(material.trim());
  if (priceMoq?.trim()) parts.push(priceMoq.trim());
  if (certifications?.length && !certifications.includes('None required')) {
    parts.push(certifications.join(' ') + ' certified');
  }
  return parts.join(', ') || 'garment manufacturer';
}

function composeBrandQuery({ category, categoryFreetext, aesthetic, priceTier, market, marketFreetext, distribution }) {
  const parts = [];
  if (categoryFreetext?.trim()) {
    parts.push(categoryFreetext.trim());
    parts.push('fashion brand label');
  } else if (category?.length && !category.includes('Any')) {
    parts.push(category[0] + ' fashion brand');
  } else {
    parts.push('fashion brand');
  }
  if (aesthetic?.length && !aesthetic.includes('Any')) {
    parts.push(aesthetic[0] + ' aesthetic');
  }
  if (priceTier?.length && !priceTier.includes('Any')) {
    parts.push(priceTier[0] + ' price point');
  }
  if (market?.length && !market.includes('Any')) {
    parts.push('based in ' + market.join(' or '));
  }
  if (marketFreetext?.trim()) {
    parts.push('based in ' + marketFreetext.trim());
  }
  if (distribution?.length && !distribution.includes('Any')) {
    parts.push(distribution[0] === 'Both' ? 'wholesale and direct-to-consumer' : distribution[0].toLowerCase());
  }
  return parts.join(', ') || 'emerging fashion brand';
}

function getIncludeText(certifications) {
  if (!certifications?.length || certifications.includes('None required')) return undefined;
  return [certifications[0]];
}

async function exaFetch(endpoint, body) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(import.meta.env.DEV ? { 'x-api-key': getApiKey() } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `API error ${res.status}`);
  }
  return res.json();
}

export async function searchSuppliers(formData) {
  const query = composeSupplierQuery(formData);
  const body = {
    query,
    type: 'auto',
    numResults: 10,
    contents: {
      highlights: { maxCharacters: 3000 },
      summary: true,
    },
  };
 
  return exaFetch('/search', body);
}

export async function searchBrands(formData) {
  const query = composeBrandQuery(formData);
  return exaFetch('/search', {
    query,
    type: 'auto',
    numResults: 10,
    category: 'company',
    contents: {
      highlights: { maxCharacters: 3000 },
      summary: true,
    },
  });
}

export async function scoutSearch(query) {
  return exaFetch('/search', {
    query,
    type: 'auto',
    numResults: 10,
    contents: {
      highlights: { maxCharacters: 3000 },
      summary: true,
    },
  });
}

export async function findSimilar(url) {
  return exaFetch('/findSimilar', {
    url: url.startsWith('http') ? url : `https://${url}`,
    numResults: 10,
    contents: {
      highlights: { maxCharacters: 3000 },
      summary: true,
    },
  });
}

export function parseResults(exaResults) {
  if (!exaResults?.results) return [];
  const seen = new Set();
  return exaResults.results
    .map((r) => {
      const domain = r.url ? new URL(r.url).hostname.replace('www.', '') : '';
      const summary = r.summary || '';
      const highlight = r.highlights?.[0] || '';
      const description = summary || highlight || r.text?.slice(0, 200) || '';
      return {
        title: r.title || domain,
        url: r.url,
        domain,
        description,
        image: r.image || null,
        favicon: r.favicon || null,
      };
    })
    .filter((item) => {
      if (seen.has(item.domain)) return false;
      seen.add(item.domain);
      return true;
    });
}
export async function synthesizeResults(query, results, tab) {
  const resultsText = results.slice(0, 5).map(r => `${r.title} (${r.domain}): ${r.description.slice(0, 150)}`).join('\n');
  
  const systemPrompt = tab === 'supplier'
    ? 'You are a fashion sourcing analyst. Summarize ALL these supplier search results in 2-3 sentences. Highlight key patterns: regions represented, certifications, specializations, and any standout candidates. Be specific and concise.  Do not use markdown, headers, bold, or bullet points. Write plain text only.'
    : tab === 'brand'
    ? 'You are a fashion market analyst. Summarize ALL these brand search results in 2-3 sentences. Highlight key patterns: price positioning, aesthetics, markets, distribution, and any standout brands. Be specific and concise.  Do not use markdown, headers, bold, or bullet points. Write plain text only.'
    : 'You are a fashion industry analyst. Summarize ALL these search results in 2-3 sentences. Highlight key patterns and standout findings. Be specific and concise.  Do not use markdown, headers, bold, or bullet points. Write plain text only.';

  const synthesizeUrl = '/api/synthesize';

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  const response = await fetch(synthesizeUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    signal: controller.signal,
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: systemPrompt,
      messages: [
        { role: 'user', content: `Search query: "${query}"\n\nResults:\n${resultsText}` }
      ],
    }),
  });

  clearTimeout(timeout);
  const data = await response.json();
  return data.content?.[0]?.text || null;
}