export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    const { url, platform } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    try {
        let apiUrl;
        const encodedUrl = encodeURIComponent(url);

        switch (platform) {
            case 'tiktok':
                apiUrl = `https://anabot.my.id/api/download/tiktok?url=${encodedUrl}&apikey=freeApikey`;
                break;
            case 'instagram':
                apiUrl = `https://anabot.my.id/api/download/instagram?url=${encodedUrl}&apikey=freeApikey`;
                break;
            case 'facebook':
                apiUrl = `https://anabot.my.id/api/download/facebook?url=${encodedUrl}&apikey=freeApikey`;
                break;
            case 'youtube':
                apiUrl = `https://kojaxd-api.vercel.app/downloader/ytmp4?apikey=Koja-5d5acdde3e2ab95585d4ebc888684266&url=${encodedUrl}&format=Mp4`;
                break;
            default:
                return res.status(400).json({ error: 'Invalid platform' });
        }

        const response = await fetch(apiUrl);
        const data = await response.json();

        // Normalize response
        let result = {
            title: '',
            thumbnail: '',
            videoUrl: '',
            format: 'MP4'
        };

        if (data.data) {
            result.title = data.data.title || data.data.description || 'Video';
            result.thumbnail = data.data.thumbnail || data.data.thumb || '';
            result.videoUrl = data.data.download || data.data.video || data.data.url || data.data.high || '';
            result.format = data.data.format || 'MP4';
        } else if (data.download) {
            result.videoUrl = data.download;
            result.title = data.title || 'Video';
            result.thumbnail = data.thumbnail || '';
        }

        if (!result.videoUrl) {
            return res.status(404).json({ error: 'No download link found' });
        }

        return res.status(200).json(result);
    } catch (error) {
        console.error('Download error:', error);
        return res.status(500).json({ error: 'Failed to fetch video. Server error.' });
    }
}
