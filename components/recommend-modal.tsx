import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/lib/auth-context';
import { getFollowingUsers } from '@/lib/social';
import { sendRecommendations } from '@/lib/recommendations';
import { User } from '@/types';

type Friend = Pick<User, 'id' | 'username' | 'display_name' | 'profile_image_url'>;

interface RecommendModalProps {
  visible: boolean;
  onClose: () => void;
  contentId: number;
  contentType: string;
  contentTitle: string;
}

export function RecommendModal({
  visible,
  onClose,
  contentId,
  contentTitle,
}: RecommendModalProps) {
  const { user } = useAuth();

  const [step, setStep] = useState<'select' | 'message'>('select');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (visible && user) {
      setStep('select');
      setSelectedIds(new Set());
      setMessage('');
      setSent(false);
      loadFriends();
    }
  }, [visible]);

  const loadFriends = async () => {
    if (!user) return;
    setIsLoading(true);
    const data = await getFollowingUsers(user.id);
    setFriends(data);
    setIsLoading(false);
  };

  const toggleFriend = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSend = async () => {
    if (!user || selectedIds.size === 0 || isSending) return;

    setIsSending(true);
    await sendRecommendations(user.id, Array.from(selectedIds), contentId, message || undefined);
    setIsSending(false);
    setSent(true);

    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const renderFriend = ({ item }: { item: Friend }) => {
    const isSelected = selectedIds.has(item.id);
    const displayName = item.display_name || item.username;

    return (
      <Pressable
        style={({ pressed }) => [styles.friendRow, pressed && styles.friendRowPressed]}
        onPress={() => toggleFriend(item.id)}
      >
        <View style={styles.friendAvatar}>
          <Text style={styles.friendAvatarText}>
            {displayName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.friendInfo}>
          <Text style={styles.friendName}>{displayName}</Text>
          <Text style={styles.friendUsername}>@{item.username}</Text>
        </View>
        <View style={styles.checkboxContainer}>
          <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
            {isSelected && (
              <IconSymbol name="checkmark" size={14} color={Colors.white} />
            )}
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          {step === 'message' ? (
            <Pressable style={styles.backButton} onPress={() => setStep('select')}>
              <IconSymbol name="chevron.left" size={20} color={Colors.text} />
            </Pressable>
          ) : (
            <View style={styles.headerSpacer} />
          )}
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>
              {step === 'select' ? 'Recommend' : 'Add a message'}
            </Text>
            {step === 'message' && (
              <Text style={styles.headerSubtitle}>optional</Text>
            )}
          </View>
          <Pressable style={styles.closeButton} onPress={onClose}>
            <IconSymbol name="xmark" size={20} color={Colors.text} />
          </Pressable>
        </View>

        {/* Content Title */}
        <Text style={styles.contentTitle} numberOfLines={1}>
          {contentTitle}
        </Text>

        {step === 'select' ? (
          <>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.stamp} />
              </View>
            ) : (
              <FlatList
                data={friends}
                keyExtractor={(item) => item.id}
                renderItem={renderFriend}
                style={styles.list}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>
                      Follow some friends to send recommendations.
                    </Text>
                  </View>
                }
              />
            )}
            <View style={styles.footer}>
              <Pressable
                style={[styles.nextButton, selectedIds.size === 0 && styles.nextButtonDisabled]}
                onPress={() => setStep('message')}
                disabled={selectedIds.size === 0}
              >
                <Text style={[styles.nextButtonText, selectedIds.size === 0 && styles.nextButtonTextDisabled]}>
                  Next
                </Text>
              </Pressable>
            </View>
          </>
        ) : (
          <View style={styles.messageStep}>
            <TextInput
              style={styles.messageInput}
              placeholder="Say something about it..."
              placeholderTextColor={Colors.textMuted}
              value={message}
              onChangeText={setMessage}
              multiline
              maxLength={200}
              autoFocus
            />
            <Text style={styles.charCount}>{message.length}/200</Text>
            <View style={styles.footer}>
              <Pressable
                style={[styles.nextButton, (isSending || sent) && styles.nextButtonDisabled]}
                onPress={handleSend}
                disabled={isSending || sent}
              >
                {isSending ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text style={styles.nextButtonText}>
                    {sent ? 'Recommended!' : 'Send'}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  headerSpacer: {
    width: 36,
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: Fonts.serifBold,
    fontSize: FontSizes.lg,
    color: Colors.text,
  },
  headerSubtitle: {
    fontFamily: Fonts.sans,
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.dust,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.dust,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentTitle: {
    fontFamily: Fonts.serifSemiBold,
    fontSize: FontSizes.md,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  emptyState: {
    paddingVertical: Spacing['2xl'],
    alignItems: 'center',
  },
  emptyStateText: {
    fontFamily: Fonts.sans,
    fontSize: FontSizes.md,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  friendRowPressed: {
    opacity: 0.7,
  },
  friendAvatar: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.dust,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  friendAvatarText: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  friendUsername: {
    fontFamily: Fonts.sans,
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  checkboxContainer: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.stamp,
    borderColor: Colors.stamp,
  },
  messageStep: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
  },
  messageInput: {
    fontFamily: Fonts.sans,
    fontSize: FontSizes.md,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontFamily: Fonts.sans,
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    textAlign: 'right',
    marginTop: Spacing.xs,
  },
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  nextButton: {
    backgroundColor: Colors.stamp,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  nextButtonDisabled: {
    opacity: 0.4,
  },
  nextButtonText: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
  nextButtonTextDisabled: {
    color: Colors.white,
  },
});
