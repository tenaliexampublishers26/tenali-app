import React, { useMemo, useState } from 'react';
import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { AppColors, AppStyles } from '../../core/theme';
import {
  buildYouTubeEmbedHtml,
  extractYouTubeVideoId,
  getYouTubeEmbedUrl,
  getYouTubeThumbnailUrl,
} from '../../core/utils/youtubeUtils';
import { VideoLesson } from '../../models';
import { TenaliTopAppBar } from '../../shared/TenaliTopAppBar';

export const VideoPlayerScreen: React.FC = () => {
  const route = useRoute<any>();
  const initialVideo: VideoLesson | undefined = route.params?.video;
  const folderVideos: VideoLesson[] = useMemo(
    () =>
      Array.isArray(route.params?.folderVideos) && route.params.folderVideos.length > 0
        ? route.params.folderVideos
        : initialVideo
          ? [initialVideo]
          : [],
    [route.params?.folderVideos, initialVideo]
  );
  const folderName: string = route.params?.folderName || 'Topic Lessons';

  const [currentVideo, setCurrentVideo] = useState<VideoLesson | undefined>(initialVideo);

  const currentIndex = useMemo(
    () => folderVideos.findIndex((v) => v.id === currentVideo?.id),
    [folderVideos, currentVideo?.id]
  );

  const videoId = useMemo(
    () => extractYouTubeVideoId(currentVideo?.videoUrl),
    [currentVideo?.videoUrl]
  );

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentVideo(folderVideos[currentIndex - 1]);
  };

  const handleNext = () => {
    if (currentIndex >= 0 && currentIndex < folderVideos.length - 1) {
      setCurrentVideo(folderVideos[currentIndex + 1]);
    }
  };

  const renderPlayer = () => {
    if (!currentVideo) {
      return (
        <View style={styles.playerFallback}>
          <Ionicons name="videocam-off-outline" size={40} color={AppColors.surfaceWhite} />
          <Text style={styles.fallbackText}>No video selected</Text>
        </View>
      );
    }

    if (!videoId) {
      if (Platform.OS === 'web') {
        return React.createElement('video', {
          src: currentVideo.videoUrl,
          controls: true,
          style: { width: '100%', height: '100%', backgroundColor: '#000' },
        });
      }
      return (
        <WebView
          source={{ uri: currentVideo.videoUrl }}
          style={styles.webview}
          allowsInlineMediaPlayback
          allowsFullscreenVideo
          mediaPlaybackRequiresUserAction={false}
          setSupportMultipleWindows={false}
        />
      );
    }

    if (Platform.OS === 'web') {
      return React.createElement('iframe', {
        key: videoId,
        src: getYouTubeEmbedUrl(videoId),
        title: currentVideo.title,
        allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen',
        allowFullScreen: true,
        style: { width: '100%', height: '100%', border: 'none', backgroundColor: '#000' },
      });
    }

    return (
      <WebView
        key={videoId}
        source={{
          html: buildYouTubeEmbedHtml(videoId),
          baseUrl: 'https://www.youtube-nocookie.com',
        }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        allowsFullscreenVideo
        mediaPlaybackRequiresUserAction={false}
        setSupportMultipleWindows={false}
        onShouldStartLoadWithRequest={(req) => {
          const url = req.url || '';
          if (
            url === 'about:blank' ||
            url.startsWith('https://www.youtube-nocookie.com/embed/') ||
            url.startsWith('https://www.youtube.com/embed/') ||
            url.startsWith('https://www.youtube-nocookie.com')
          ) {
            return true;
          }
          // Block redirects out to YouTube app / external browser
          return false;
        }}
      />
    );
  };

  return (
    <View style={AppStyles.screenContainer}>
      <TenaliTopAppBar title={folderName} showBack />

      <View style={styles.playerBox}>{renderPlayer()}</View>

      <ScrollView contentContainerStyle={styles.body}>
        {currentVideo && (
          <View style={[AppStyles.card, styles.infoCard]}>
            <View style={styles.badgeRow}>
              <View style={styles.folderBadge}>
                <Ionicons name="folder-open" size={12} color={AppColors.primaryNavy} />
                <Text style={styles.folderBadgeText}>{folderName}</Text>
              </View>
              <View style={styles.langBadge}>
                <Text style={styles.langBadgeText}>
                  {currentVideo.languageCode.toUpperCase()} • {currentVideo.duration}
                </Text>
              </View>
            </View>

            <Text style={styles.videoTitle}>{currentVideo.title}</Text>
            {!!currentVideo.description && (
              <Text style={styles.videoDesc}>{currentVideo.description}</Text>
            )}

            {folderVideos.length > 1 && (
              <View style={styles.navRow}>
                <TouchableOpacity
                  style={[styles.navBtn, currentIndex <= 0 && styles.navBtnDisabled]}
                  disabled={currentIndex <= 0}
                  onPress={handlePrev}
                >
                  <Ionicons name="play-skip-back" size={16} color={AppColors.primaryNavy} />
                  <Text style={styles.navBtnText}>Previous</Text>
                </TouchableOpacity>
                <Text style={styles.counterText}>
                  {currentIndex + 1} / {folderVideos.length}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.navBtn,
                    currentIndex >= folderVideos.length - 1 && styles.navBtnDisabled,
                  ]}
                  disabled={currentIndex >= folderVideos.length - 1}
                  onPress={handleNext}
                >
                  <Text style={styles.navBtnText}>Next</Text>
                  <Ionicons name="play-skip-forward" size={16} color={AppColors.primaryNavy} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        <Text style={styles.playlistHeader}>
          Lessons in {folderName} ({folderVideos.length})
        </Text>

        <View style={{ gap: 10 }}>
          {folderVideos.map((item, idx) => {
            const active = item.id === currentVideo?.id;
            const thumbId = extractYouTubeVideoId(item.videoUrl);
            const thumb = item.thumbnailUrl || (thumbId ? getYouTubeThumbnailUrl(thumbId) : null);

            return (
              <TouchableOpacity
                key={item.id}
                style={[AppStyles.card, styles.playlistCard, active && styles.playlistCardActive]}
                onPress={() => setCurrentVideo(item)}
              >
                <View style={styles.thumbWrap}>
                  {thumb ? (
                    <Image source={{ uri: thumb }} style={styles.thumb} />
                  ) : (
                    <View style={[styles.thumb, styles.thumbPlaceholder]}>
                      <Ionicons name="videocam" size={20} color={AppColors.surfaceWhite} />
                    </View>
                  )}
                  <View style={styles.thumbOverlay}>
                    <Ionicons
                      name={active ? 'volume-high' : 'play'}
                      size={16}
                      color={AppColors.surfaceWhite}
                    />
                  </View>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.lessonIndex}>
                    Lesson {idx + 1} {active ? '• Now Playing' : ''}
                  </Text>
                  <Text style={styles.lessonTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={styles.lessonMeta}>
                    {item.duration} • {item.languageCode.toUpperCase()}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  playerBox: {
    width: '100%',
    aspectRatio: 16 / 9,
    maxHeight: 360,
    backgroundColor: '#000000',
  },
  webview: { flex: 1, backgroundColor: '#000000' },
  playerFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  fallbackText: { color: AppColors.surfaceWhite, fontSize: 13, fontWeight: '600' },
  body: { padding: 16, gap: 14, paddingBottom: 32 },
  infoCard: { padding: 14, gap: 8 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  folderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: AppColors.surfaceCream,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  folderBadgeText: { fontSize: 11, fontWeight: '800', color: AppColors.primaryNavy },
  langBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  langBadgeText: { fontSize: 11, fontWeight: '700', color: AppColors.infoBlue },
  videoTitle: { fontSize: 16, fontWeight: '800', color: AppColors.primaryNavy },
  videoDesc: { fontSize: 13, color: AppColors.textSecondary, lineHeight: 19 },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: AppColors.borderSubtle,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: AppColors.surfaceCream,
  },
  navBtnDisabled: { opacity: 0.4 },
  navBtnText: { fontSize: 12, fontWeight: '800', color: AppColors.primaryNavy },
  counterText: { fontSize: 12, fontWeight: '700', color: AppColors.textSecondary },
  playlistHeader: { fontSize: 15, fontWeight: '800', color: AppColors.primaryNavy, marginTop: 2 },
  playlistCard: { padding: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  playlistCardActive: {
    borderColor: AppColors.secondaryMaroon,
    borderWidth: 1.5,
    backgroundColor: '#FFFBF5',
  },
  thumbWrap: { width: 104, height: 60, borderRadius: 8, overflow: 'hidden', position: 'relative' },
  thumb: { width: '100%', height: '100%' },
  thumbPlaceholder: {
    backgroundColor: AppColors.primaryNavy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbOverlay: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(142, 27, 27, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lessonIndex: { fontSize: 10, fontWeight: '800', color: AppColors.secondaryMaroon },
  lessonTitle: { fontSize: 13, fontWeight: '800', color: AppColors.primaryNavy, marginTop: 2 },
  lessonMeta: { fontSize: 11, fontWeight: '600', color: AppColors.textSecondary, marginTop: 2 },
});
