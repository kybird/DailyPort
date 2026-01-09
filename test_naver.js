
const ticker = '475580';
const days = 300;
const endDate = new Date();
const startDate = new Date();
startDate.setDate(startDate.getDate() - days);
const formatDate = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');
const url = `https://fchart.stock.naver.com/siseJson.nhn?symbol=${ticker}&requestType=1&startTime=${formatDate(startDate)}&endTime=${formatDate(endDate)}&timeframe=day`;

console.log('URL:', url);

fetch(url, {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://finance.naver.com/'
    }
}).then(res => res.text()).then(text => {
    console.log('Response (first 500 chars):');
    console.log(text.slice(0, 500));
    const lines = text.trim().split('\n');
    console.log('Total lines:', lines.length);
    if (lines.length > 1) {
        console.log('Line 1:', lines[1]);
        const match = lines[1].match(/"(\d{8})"\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
        console.log('Match:', match);
    }
}).catch(err => console.error(err));
