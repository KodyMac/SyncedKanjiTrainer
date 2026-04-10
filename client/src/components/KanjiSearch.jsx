import { useState } from 'react';
export default function KanjiSearch({ onSelect }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function search() {
        if(!query.trim()) return;
        setLoading(true);
        setError('');
        setResults([]);

        try {
            //direct kanji input
            if(query.match(/[\u4e00-\u9faf]/)) {
                onSelect(query[0]);
                setQuery('');
                return;
            }
            //search by english meaning
            const res = await fetch(`http://localhost:3001/api/kanji/search?q=${encodeURIComponent(query)}`);
            const data = await res.json();
            

            if(!data || data.length === 0) {
                setError('No kanji found');
            } else {
                setResults(data);
            }
            } catch (err) {
                setError('Search failed.');
            } finally {
                setLoading(false);
            }
        }
    

return (
    <div style={{ width: 600, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom:8}}>
            <input
                value={query}
                onChange={e=>setQuery(e.target.value)}
                onKeyDown={e=>e.key === 'Enter' && search()}
                placeholder='Search kanji - type 山 or "mountain"'
                style={{
                    flex:1, padding: '10px 14px', fontSize:15, borderRadius: 8, border: '1px solid #e5e7eb'
                }}
            />
            <button
                onClick={search}
                disabled={loading}
                style={{
                    padding:'10px 20px', borderRadius: 8, fontSize:15,
                    background: '#3b82f6', color: 'white', border: 'none',
                    cursor: loading ? 'wait' : 'pointer',
                    opacity: loading ? 0.7 : 1
                }}
                >
                    {loading ? 'Searching...' : 'Search'}
                </button>
         </div>

         {error && (
            <p style={{ color: '#ef4444', fontSize: 13, margin: '4px 0' }}>{error}</p>
         )}

         {results.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8}}>
                {results.map(({ char, meaning }) => (
                    <button
                        key={char || meaning}
                        onClick={() => { onSelect(char); setResults([]); setQuery(''); }}
                        style={{
                            display:'flex', flexDirection:'column', alignItems: 'center', padding: '8px 14px',
                            borderRadius: 8, border: '1px solid #e5e5eb', background: 'white', cursor: 'pointer', gap: 2
                        }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = '#3b82f6'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = '#e5e7eb'}
                    >
                        <span style={{ fontSize: 28, fontFamily: 'serif', lineHeight: 1, color: 'black' }}>{char}</span>
                        <span style={{ fontSize: 11, color: '#888', maxWidth: 80, textAlign: 'center' }}>
                            {meaning}
                        </span>
                    </button>
                ))}
            </div>
         )}
    </div>
);
}