const ContentPost = require('../models/ContentPost');
const AdsManagerFactory = require('./adsManagerFactory');

class ContentPublisher {
    /**
     * Finds pending posts that need to be published and dispatches them
     * to the appropriate platform managers.
     */
    static async syncScheduledPosts() {
        try {
            console.log('[ContentPublisher] Checking for scheduled posts to publish...');

            // Assuming ContentPost model has a method to get pending scheduled posts
            // This is a naive query format based on standard MySQL implementations
            const [pendingPosts] = await ContentPost.query(
                `SELECT * FROM content_posts 
                 WHERE status = 'scheduled' 
                 AND scheduled_for <= NOW()`
            );

            if (!pendingPosts || pendingPosts.length === 0) {
                return;
            }

            console.log(`[ContentPublisher] Found ${pendingPosts.length} post(s) to publish.`);

            for (const post of pendingPosts) {
                await this.publishPost(post);
            }

        } catch (error) {
            console.error('[ContentPublisher] Error syncing scheduled posts:', error);
        }
    }

    /**
     * Orchestrates the actual publishing of a single post across its target platforms.
     */
    static async publishPost(post) {
        const platforms = typeof post.platforms === 'string' ? JSON.parse(post.platforms) : post.platforms;
        const platformResults = [];
        let allSuccess = true;

        for (const platform of platforms) {
            try {
                const manager = AdsManagerFactory.createManager(platform);
                let result;

                // Call the appropriate organic publishing method based on platform
                switch (platform.toLowerCase()) {
                    case 'facebook':
                    case 'meta':
                        // Fallback to post.content if platformSpecific format not available
                        result = await manager.publishPagePost(post.author_id, null, post.content || post.title, null);
                        break;
                    case 'instagram':
                        result = await manager.publishInstagramReel(post.author_id, null, post.content || post.title, null);
                        break;
                    case 'youtube':
                        result = await manager.publishYouTubeShort(post.author_id, null, post.title, post.content, null);
                        break;
                    case 'linkedin':
                        // Assuming linkedinAdsManager will eventually have this method
                        result = { success: false, error: 'LinkedIn organic publishing not yet implemented in manager' };
                        break;
                    default:
                        result = { success: false, error: 'Unsupported organic platform' };
                }

                platformResults.push({ platform, success: result.success, error: result.error });
                if (!result.success) allSuccess = false;

            } catch (error) {
                console.error(`[ContentPublisher] Failed to publish post ${post.id} to ${platform}:`, error);
                platformResults.push({ platform, success: false, error: error.message });
                allSuccess = false;
            }
        }

        // Update post status in DB
        const finalStatus = allSuccess ? 'published' : 'failed';
        await ContentPost.query(
            `UPDATE content_posts 
             SET status = ?, published_at = IF(? = 'published', NOW(), published_at) 
             WHERE id = ?`,
            [finalStatus, finalStatus, post.id]
        );

        console.log(`[ContentPublisher] Post ${post.id} completed with status: ${finalStatus}`);
    }
}

module.exports = ContentPublisher;
