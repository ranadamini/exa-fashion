const API_BASE = 'https://api.exa.ai';

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
      'x-api-key': getApiKey(),
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