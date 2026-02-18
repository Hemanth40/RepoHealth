export default function Heatmap({ data, onSelect, activeFile }) {
    if (!data || data.length === 0) return <p>No file data available.</p>;

    // Sort by complexity desc
    const sortedData = [...data].sort((a, b) => b.complexityScore - a.complexityScore);

    const getScoreColor = (score) => {
        if (score > 7) return 'var(--danger)';
        if (score > 4) return 'var(--warning)';
        return 'var(--success)';
    };

    return (
        <div className="heatmap-container" style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {sortedData.map((item, index) => {
                const isSelected = activeFile && activeFile.file === item.file;
                const color = getScoreColor(item.complexityScore);

                return (
                    <div
                        key={index}
                        onClick={() => onSelect(item)}
                        style={{
                            background: isSelected ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${isSelected ? 'var(--primary)' : 'rgba(255,255,255,0.05)'}`,
                            borderRadius: '8px',
                            padding: '0.8rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            transition: 'all 0.2s ease',
                            transform: isSelected ? 'translateX(5px)' : 'none'
                        }}
                    >
                        {/* Score Indicator */}
                        <div style={{
                            width: '40px', height: '40px',
                            borderRadius: '8px',
                            background: color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold',
                            color: 'white',
                            textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                            boxShadow: `0 4px 10px ${color}40`
                        }}>
                            {item.complexityScore}
                        </div>

                        {/* File details */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                                fontWeight: '500',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                marginBottom: '0.2rem',
                                color: isSelected ? 'white' : 'var(--foreground)'
                            }}>
                                {item.file}
                            </div>
                            {/* Visual Bar */}
                            <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                                <div style={{
                                    width: `${item.complexityScore * 10}%`,
                                    height: '100%',
                                    background: color,
                                    borderRadius: '2px'
                                }}></div>
                            </div>
                        </div>

                        {/* Issues Badge */}
                        {item.issues > 0 && (
                            <div style={{
                                fontSize: '0.75rem',
                                background: 'rgba(255,255,255,0.1)',
                                padding: '0.2rem 0.6rem',
                                borderRadius: '10px',
                                color: 'var(--text-secondary)'
                            }}>
                                {item.issues} Issues
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
