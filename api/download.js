const axios = require('axios');

// CORS headers
const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

module.exports = async (req, res) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(204, headers);
        res.end();
        return;
    }

    const { url } = req.query;

    if (!url) {
        res.status(400).json({ error: 'URL is required' });
        return;
    }

    try {
        const platform = detectPlatform(url);
        let result;

        switch (platform) {
            case 'facebook':
                result = await handleFacebook(url);
                break;
            case 'instagram':
                result = await handleInstagram(url);
                break;
            case 'tiktok':
                result = await handleTikTok(url);
                break;
            case 'youtube':
                result = await handleYouTube(url);
                break;
            default:
                res.status(400).json({ error: 'Unsupported platform' });
                return;
        }

        res.status(200).json({ success: true, platform, ...result });
    } catch (error) {
        console.error('Download error:', error.message);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Download failed. Please try again.' 
        });
    }
};

function detectPlatform(url) {
    const u = url.toLowerCase();
    if (u.includes('facebook.com') || u.includes('fb.watch')) return 'facebook';
    if (u.includes('instagram.com')) return 'instagram';
    if (u.includes('tiktok.com')) return 'tiktok';
    if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
    return 'unknown';
}

async function handleFacebook(url) {
    try {
        const apiUrl = `https://anabot.my.id/api/download/facebook?url=${encodeURIComponent(url)}&apikey=freeApikey`;
        const { data } = await axios.get(apiUrl, { timeout: 30000 });
        
        if (!data.success || !data.data?.result?.api) {
            throw new Error('Invalid Facebook URL or video not found');
        }

        const api = data.data.result.api;
        const mediaItems = api.mediaItems || [];
        const videos = mediaItems.filter(item => item.type === 'Video');
        const audios = mediaItems.filter(item => item.type === 'Audio');

        return {
            title: api.title || api.description || 'Facebook Video',
            thumbnail: api.imagePreviewUrl || api.previewUrl,
            author: api.userInfo?.name || 'Facebook User',
            duration: videos[0]?.mediaDuration || '00:00',
            videos: videos.map(v => ({
                quality: v.mediaQuality,
                resolution: v.mediaRes,
                size: v.mediaFileSize,
                format: v.mediaExtension,
                url: v.mediaUrl,
                directDownload: true
            })),
            audio: audios.length > 0 ? {
                url: audios[0].mediaUrl,
                size: audios[0].mediaFileSize,
                directDownload: true
            } : null
        };
    } catch (error) {
        throw new Error('Facebook download failed. Make sure the URL is public.');
    }
}

async function handleInstagram(url) {
    try {
        const apiUrl = `https://anabot.my.id/api/download/instagram?url=${encodeURIComponent(url)}&apikey=freeApikey`;
        const { data } = await axios.get(apiUrl, { timeout: 30000 });
        
        if (!data.success || !data.data?.result) {
            throw new Error('Invalid Instagram URL');
        }

        const results = Array.isArray(data.data.result) ? data.data.result : [data.data.result];
        
        return {
            title: 'Instagram Post',
            thumbnail: results[0]?.thumbnail,
            author: 'Instagram User',
            media: results.map((item, i) => ({
                index: i + 1,
                url: item.url,
                thumbnail: item.thumbnail,
                directDownload: true
            })),
            isCarousel: results.length > 1
        };
    } catch (error) {
        throw new Error('Instagram download failed. Check if the post is public.');
    }
}

async function handleTikTok(url) {
    try {
        const apiUrl = `https://anabot.my.id/api/download/tiktok?url=${encodeURIComponent(url)}&apikey=freeApikey`;
        const { data } = await axios.get(apiUrl, { timeout: 30000 });
        
        if (!data.success || !data.data?.result) {
            throw new Error('Invalid TikTok URL');
        }

        const result = data.data.result;
        
        return {
            title: result.description || 'TikTok Video',
            thumbnail: result.thumbnail,
            author: result.username,
            videos: [
                result.nowatermark ? {
                    quality: 'HD No Watermark',
                    url: result.nowatermark,
                    directDownload: true,
                    type: 'nowatermark'
                } : null,
                result.video ? {
                    quality: 'HD With Watermark',
                    url: result.video,
                    directDownload: true,
                    type: 'watermark'
                } : null
            ].filter(Boolean),
            audio: result.audio ? {
                url: result.audio,
                directDownload: true
            } : null
        };
    } catch (error) {
        throw new Error('TikTok download failed. Make sure the video is public.');
    }
}

async function handleYouTube(url) {
    try {
        const videoId = extractYouTubeID(url);
        if (!videoId) throw new Error('Invalid YouTube URL');

        const mp4Url = `https://anabot.my.id/api/download/youtube?url=${encodeURIComponent(url)}&apikey=freeApikey&format=mp4`;
        const { data: mp4Data } = await axios.get(mp4Url, { timeout: 30000 });

        let videos = [];
        if (mp4Data.success && mp4Data.data?.download) {
            videos.push({
                quality: '720p MP4',
                url: mp4Data.data.download,
                size: 'Variable',
                directDownload: true
            });
        }

        // Get thumbnail
        const thumbnail = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;

        return {
            title: mp4Data.data?.title || 'YouTube Video',
            thumbnail: thumbnail,
            author: 'YouTube',
            videoId: videoId,
            videos: videos,
            embedUrl: `https://www.youtube.com/embed/${videoId}`
        };
    } catch (error) {
        throw new Error('YouTube download failed. Check the URL and try again.');
    }
}

function extractYouTubeID(url) {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
        /youtube\.com\/shorts\/([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
    }
