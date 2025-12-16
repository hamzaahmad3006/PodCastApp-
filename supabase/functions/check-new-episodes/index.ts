

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

declare const Deno: {
    env: {
        get(key: string): string | undefined
    }
}

const RSS_URL = 'https://podcasts.files.bbci.co.uk/p01plr2p.rss'
const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID')!
const ONESIGNAL_REST_API_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY')!

type Episode = {
    title: string
    pubDate: string
    audioUrl: string
    description: string
    image: string
    duration?: string
}

// Parse RSS feed
async function fetchLatestEpisode(): Promise<Episode | null> {
    try {
        const response = await fetch(RSS_URL)
        const xmlText = await response.text()

        // Simple XML parsing for the first item
        const titleMatch = xmlText.match(/<item>[\s\S]*?<title>(.*?)<\/title>/)
        const pubDateMatch = xmlText.match(/<item>[\s\S]*?<pubDate>(.*?)<\/pubDate>/)
        const audioMatch = xmlText.match(/<item>[\s\S]*?<enclosure[^>]*url="([^"]*)"/)
        const descMatch = xmlText.match(/<item>[\s\S]*?<description>(.*?)<\/description>/)
        const imageMatch = xmlText.match(/<item>[\s\S]*?<itunes:image[^>]*href="([^"]*)"/) ||
            xmlText.match(/<item>[\s\S]*?<media:thumbnail[^>]*url="([^"]*)"/)
        const durationMatch = xmlText.match(/<item>[\s\S]*?<itunes:duration>(.*?)<\/itunes:duration>/)

        if (!titleMatch || !audioMatch) {
            console.error('Failed to parse RSS feed')
            return null
        }

        return {
            title: titleMatch[1].trim(),
            pubDate: pubDateMatch ? pubDateMatch[1].trim() : new Date().toISOString(),
            audioUrl: audioMatch[1].trim(),
            description: descMatch ? descMatch[1].replace(/<[^>]*>/g, '').trim() : '',
            image: imageMatch ? imageMatch[1].trim() : 'https://via.placeholder.com/150',
            duration: durationMatch ? durationMatch[1].trim() : '0:00'
        }
    } catch (error: unknown) {
        console.error('Error fetching RSS feed:', error)
        return null
    }
}


// Send OneSignal notification
async function sendPushNotification(episode: Episode): Promise<{ success: boolean; result: unknown }> {
    try {
        const notification = {
            app_id: ONESIGNAL_APP_ID,
            // Send to ALL users
            included_segments: ['All'],
            headings: { en: '🎙️ New Episode Available!' },
            contents: { en: episode.title },
            data: {
                type: 'new_episode',
                episode_title: episode.title,
                episode_url: episode.audioUrl,
                audioUrl: episode.audioUrl,
                description: episode.description,
                image: episode.image,
                duration: episode.duration || '0:00',
                pub_date: episode.pubDate
            },
            android_channel_id: 'e3da0068-498d-4763-8cc7-e2f0f5407ab2',
            // Add priority for immediate delivery
            priority: 10,
            ttl: 259200 // 3 days
        }

        console.log('📤 Sending notification:', JSON.stringify(notification, null, 2))

        const response = await fetch('https://onesignal.com/api/v1/notifications', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`
            },
            body: JSON.stringify(notification)
        })

        const result = await response.json()

        console.log('📥 OneSignal API Response:', JSON.stringify(result, null, 2))
        console.log('📊 Response status:', response.status)
        console.log('📊 Recipients:', result.recipients)

        if (response.ok) {
            console.log('✅ Notification sent successfully:', result)
            return { success: true, result }
        } else {
            console.error('❌ Failed to send notification:', result)
            return { success: false, result }
        }
    } catch (error: unknown) {
        console.error('Error sending notification:', error)
        return { success: false, result: (error as Error).message || 'Unknown error' }
    }
}

// Save notification to database for all users
async function saveNotificationForAllUsers(supabase: SupabaseClient, episode: Episode): Promise<{ success: boolean; count: number }> {
    try {
        console.log('💾 Saving notification to database for all users...')

        // Fetch all user IDs from profiles table
        const { data: users, error: usersError } = await supabase
            .from('profiles')
            .select('id')

        if (usersError) {
            console.error('❌ Error fetching users:', usersError)
            return { success: false, count: 0 }
        }

        if (!users || users.length === 0) {
            console.log('⚠️ No users found in database')
            return { success: true, count: 0 }
        }

        console.log(`👥 Found ${users.length} users`)

        // Create notification records for all users
        const notificationRecords = users.map((user: { id: string }) => ({
            user_id: user.id,
            title: '🎙️ New Episode Available!',
            body: episode.title,
            data: {
                type: 'new_episode',
                episode_title: episode.title,
                episode_url: episode.audioUrl,
                audioUrl: episode.audioUrl,
                description: episode.description,
                image: episode.image,
                duration: episode.duration || '0:00',
                pub_date: episode.pubDate
            },
            read: false,
            created_at: new Date().toISOString()
        }))

        // Insert all notification records
        const { error: insertError } = await supabase
            .from('user_notifications')
            .insert(notificationRecords)

        if (insertError) {
            console.error('❌ Error inserting notifications:', insertError)
            return { success: false, count: 0 }
        }

        console.log(`✅ Successfully saved ${users.length} notification records`)
        return { success: true, count: users.length }

    } catch (error: unknown) {
        console.error('❌ Error in saveNotificationForAllUsers:', error)
        return { success: false, count: 0 }
    }
}

// Main function
serve(async (_req: Request) => {
    try {
        console.log('🔍 Checking for new episodes...')

        // Initialize Supabase client
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseKey)

        // Fetch latest episode from RSS
        const latestEpisode = await fetchLatestEpisode()

        if (!latestEpisode) {
            return new Response(
                JSON.stringify({ error: 'Failed to fetch RSS feed' }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            )
        }

        console.log('📻 Latest episode:', latestEpisode.title)

        // Check if this episode was already processed
        const { data: lastChecked, error: fetchError } = await supabase
            .from('app_settings')
            .select('value')
            .eq('key', 'last_episode_url')
            .single()

        if (fetchError && fetchError.code !== 'PGRST116') {
            console.error('Error fetching last episode:', fetchError)
        }

        const lastEpisodeUrl = lastChecked?.value || null

        // If this is a new episode, send notification
        if (lastEpisodeUrl !== latestEpisode.audioUrl) {
            console.log('🆕 New episode detected! Sending notification...')

            const { success: notificationSent, result } = await sendPushNotification(latestEpisode)

            if (notificationSent) {
                // Save notification to database for all users
                const { success: dbSaved, count } = await saveNotificationForAllUsers(supabase, latestEpisode)

                if (dbSaved) {
                    console.log(`✅ Notification saved to database for ${count} users`)
                } else {
                    console.error('⚠️ Failed to save notification to database, but OneSignal notification was sent')
                }

                // Update last checked episode
                const { error: updateError } = await supabase
                    .from('app_settings')
                    .upsert({
                        key: 'last_episode_url',
                        value: latestEpisode.audioUrl,
                        updated_at: new Date().toISOString()
                    })

                if (updateError) {
                    console.error('Error updating last episode:', updateError)
                } else {
                    console.log('✅ Last episode updated in database')
                }

                return new Response(
                    JSON.stringify({
                        success: true,
                        message: 'New episode detected and notification sent',
                        episode: latestEpisode.title,
                        users_notified: count
                    }),
                    { status: 200, headers: { 'Content-Type': 'application/json' } }
                )
            } else {
                return new Response(
                    JSON.stringify({
                        success: false,
                        message: 'Failed to send notification',
                        version: '1.0.5', // Verify deployment
                        details: result
                    }),
                    { status: 500, headers: { 'Content-Type': 'application/json' } }
                )
            }
        } else {
            console.log('ℹ️ No new episodes')
            return new Response(
                JSON.stringify({
                    success: true,
                    message: 'No new episodes',
                    latest_episode: latestEpisode.title
                }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
            )
        }
    } catch (error: unknown) {
        console.error('❌ Error in edge function:', error)
        return new Response(
            JSON.stringify({ error: (error as Error).message || 'Unknown error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
    }
})
